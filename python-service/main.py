import io
import pandas as pd
from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

app = FastAPI(title="CSV Analyzer Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


def detect_encoding(raw_bytes: bytes) -> str:
    for enc in ["utf-8", "latin-1", "cp1252", "iso-8859-1"]:
        try:
            raw_bytes.decode(enc)
            return enc
        except (UnicodeDecodeError, LookupError):
            continue
    return "latin-1"


def infer_sql_type(series: pd.Series) -> str:
    if series.dropna().empty:
        return "varchar(255)"
    sample = series.dropna().astype(str)
    try:
        nums = pd.to_numeric(sample)
        if (nums == nums.astype(int)).all():
            max_val = nums.abs().max()
            if max_val < 2_147_483_647:
                return "integer"
            return "bigint"
        return "numeric(18,4)"
    except (ValueError, TypeError):
        pass
    try:
        pd.to_datetime(sample)
        return "timestamp"
    except (ValueError, TypeError):
        pass
    max_len = sample.str.len().max()
    return f"varchar({max(int(max_len * 1.5), 50)})"


@app.post("/analyze")
async def analyze_csv(file: UploadFile = File(...)):
    raw = await file.read()
    encoding = detect_encoding(raw)
    text = raw.decode(encoding)
    df = pd.read_csv(io.StringIO(text), nrows=100)

    columns = []
    for col in df.columns:
        sql_type = infer_sql_type(df[col])
        columns.append({
            "name": col,
            "sql_type": sql_type,
            "sample_values": df[col].dropna().head(3).astype(str).tolist(),
            "null_count": int(df[col].isna().sum()),
        })

    total_df = pd.read_csv(io.StringIO(text))
    total_rows = len(total_df)

    preview = df.head(10).fillna("").to_dict(orient="records")

    return JSONResponse({
        "filename": file.filename,
        "encoding": encoding,
        "total_rows": total_rows,
        "total_columns": len(df.columns),
        "columns": columns,
        "preview": preview,
    })


@app.get("/health")
async def health():
    return {"status": "ok"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
