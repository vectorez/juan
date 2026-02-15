import { useState, useCallback, useRef, useEffect } from "react";
import axios from "axios";
import * as XLSX from "xlsx";
import {
  Upload,
  FileSpreadsheet,
  CheckCircle,
  AlertCircle,
  Loader2,
  Pencil,
  X,
  ChevronLeft,
  ChevronRight,
  Trash2,
} from "lucide-react";

interface Municipio {
  id: number;
  slug: string;
  nombreMunicipio: string;
  nombreDepartamento: string;
}

interface UploadResult {
  success: boolean;
  table: string;
  totalRows: number;
  inserted: number;
  errors: number;
}

interface Props {
  onSuccess: () => void;
}

const PREVIEW_PAGE_SIZE = 50;

export function FileUploader({ onSuccess }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [tableType, setTableType] = useState<"facturacion" | "recaudos">("facturacion");
  const [municipioSlug, setMunicipioSlug] = useState("");
  const [municipiosList, setMunicipiosList] = useState<Municipio[]>([]);

  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<string[][]>([]);
  const [previewPage, setPreviewPage] = useState(0);
  const [editCell, setEditCell] = useState<{ r: number; c: number } | null>(null);
  const [editValue, setEditValue] = useState("");

  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const editInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    axios
      .get<{ data: Municipio[] }>("/api/municipios")
      .then((res) => {
        setMunicipiosList(res.data.data);
        if (res.data.data.length > 0 && !municipioSlug) {
          setMunicipioSlug(res.data.data[0].slug);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (editCell !== null && editInputRef.current) {
      editInputRef.current.focus();
    }
  }, [editCell]);

  const parseFile = useCallback((f: File) => {
    setFile(f);
    setResult(null);
    setError(null);
    setHeaders([]);
    setRows([]);
    setPreviewPage(0);
    setEditCell(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: "array", codepage: 28591 });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const json: string[][] = XLSX.utils.sheet_to_json(ws, {
          header: 1,
          raw: false,
          defval: "",
        });

        if (json.length < 2) {
          setError("El archivo no tiene datos suficientes.");
          return;
        }

        setHeaders(json[0].map(String));
        setRows(json.slice(1).map((r) => r.map(String)));

        const name = f.name.toLowerCase();
        setTableType(name.includes("recaudo") ? "recaudos" : "facturacion");
      } catch {
        setError("No se pudo leer el archivo. Verifica que sea un CSV válido.");
      }
    };
    reader.readAsArrayBuffer(f);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile && (droppedFile.name.endsWith(".csv") || droppedFile.name.endsWith(".xlsx"))) {
        parseFile(droppedFile);
      }
    },
    [parseFile]
  );

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) parseFile(selected);
  };

  const startEdit = (r: number, c: number) => {
    setEditCell({ r, c });
    setEditValue(rows[r][c]);
  };

  const commitEdit = () => {
    if (editCell === null) return;
    const updated = [...rows];
    updated[editCell.r] = [...updated[editCell.r]];
    updated[editCell.r][editCell.c] = editValue;
    setRows(updated);
    setEditCell(null);
  };

  const cancelEdit = () => setEditCell(null);

  const deleteRow = (rowIdx: number) => {
    setRows((prev) => prev.filter((_, i) => i !== rowIdx));
  };

  const uploadData = async () => {
    if (!municipioSlug) {
      setError("Debes seleccionar un municipio antes de subir");
      return;
    }
    if (rows.length === 0) {
      setError("No hay datos para subir");
      return;
    }
    setUploading(true);
    setError(null);
    try {
      const res = await axios.post<UploadResult>("/api/upload-data", {
        municipioSlug,
        tableType,
        headers,
        rows,
      });
      setFile(null);
      setHeaders([]);
      setRows([]);
      setEditCell(null);
      setPreviewPage(0);
      setResult(res.data);
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.error || "Error al subir los datos.");
    } finally {
      setUploading(false);
    }
  };

  const totalPreviewPages = Math.ceil(rows.length / PREVIEW_PAGE_SIZE);
  const visibleRows = rows.slice(
    previewPage * PREVIEW_PAGE_SIZE,
    (previewPage + 1) * PREVIEW_PAGE_SIZE
  );
  const globalOffset = previewPage * PREVIEW_PAGE_SIZE;

  return (
    <div className="space-y-6">
      {/* Municipio Selector */}
      {municipiosList.length === 0 ? (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-amber-600" />
          <p className="text-sm text-amber-700">
            No hay municipios creados. Ve a la pestaña "Municipios" para crear uno primero.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Municipio destino
              </label>
              <select
                value={municipioSlug}
                onChange={(e) => setMunicipioSlug(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
              >
                {municipiosList.map((m) => (
                  <option key={m.slug} value={m.slug}>
                    {m.nombreMunicipio} ({m.nombreDepartamento})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tipo de datos
              </label>
              <select
                value={tableType}
                onChange={(e) => setTableType(e.target.value as "facturacion" | "recaudos")}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
              >
                <option value="facturacion">Facturación</option>
                <option value="recaudos">Recaudos</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Drop Zone */}
      {municipiosList.length > 0 && !file && (
        <div
          onDrop={(e) => { setResult(null); handleDrop(e); }}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => { setResult(null); inputRef.current?.click(); }}
          className="border-2 border-dashed border-gray-300 rounded-xl p-12 text-center cursor-pointer hover:border-indigo-400 hover:bg-indigo-50/50 transition-colors"
        >
          <input
            ref={inputRef}
            type="file"
            accept=".csv,.xlsx,.xls"
            onChange={handleFileSelect}
            className="hidden"
          />
          <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-lg font-medium text-gray-700">
            Arrastra un archivo CSV / Excel aquí o haz clic para seleccionar
          </p>
          <p className="text-sm text-gray-500 mt-2">
            Se cargará en{" "}
            <span className="font-mono font-bold">
              {municipioSlug}_{tableType}
            </span>
          </p>
        </div>
      )}

      {/* File info + Editable Preview */}
      {file && headers.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileSpreadsheet className="w-6 h-6 text-indigo-600" />
              <div>
                <p className="font-medium text-gray-900">{file.name}</p>
                <p className="text-sm text-gray-500">
                  {(file.size / 1024 / 1024).toFixed(2)} MB —{" "}
                  {rows.length.toLocaleString()} filas, {headers.length} columnas
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <Pencil className="w-3.5 h-3.5" />
              Haz clic en una celda para editar
            </div>
          </div>

          {/* Editable Table */}
          <div className="overflow-x-auto border border-gray-200 rounded-lg max-h-[500px] overflow-y-auto">
            <table className="w-full text-xs">
              <thead className="sticky top-0 z-10">
                <tr className="bg-indigo-50">
                  <th className="px-2 py-2 text-center text-gray-500 w-10">#</th>
                  {headers.map((h, ci) => (
                    <th
                      key={ci}
                      className="px-2 py-2 text-left font-semibold text-indigo-700 whitespace-nowrap"
                    >
                      {h}
                    </th>
                  ))}
                  <th className="px-2 py-2 w-8"></th>
                </tr>
              </thead>
              <tbody>
                {visibleRows.map((row, vi) => {
                  const ri = globalOffset + vi;
                  return (
                    <tr
                      key={ri}
                      className="border-b border-gray-100 hover:bg-gray-50"
                    >
                      <td className="px-2 py-1 text-center text-gray-400 font-mono">
                        {ri + 1}
                      </td>
                      {row.map((cell, ci) => {
                        const isEditing =
                          editCell?.r === ri && editCell?.c === ci;
                        return (
                          <td
                            key={ci}
                            className={`px-2 py-1 max-w-[180px] cursor-pointer ${
                              isEditing
                                ? "bg-indigo-100 ring-2 ring-indigo-400 rounded"
                                : "hover:bg-indigo-50/50"
                            }`}
                            onClick={() => {
                              if (!isEditing) startEdit(ri, ci);
                            }}
                          >
                            {isEditing ? (
                              <input
                                ref={editInputRef}
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                onBlur={commitEdit}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") commitEdit();
                                  if (e.key === "Escape") cancelEdit();
                                  if (e.key === "Tab") {
                                    e.preventDefault();
                                    commitEdit();
                                    const nextC = ci + 1 < headers.length ? ci + 1 : 0;
                                    const nextR = nextC === 0 ? ri + 1 : ri;
                                    if (nextR < rows.length) startEdit(nextR, nextC);
                                  }
                                }}
                                className="w-full bg-transparent border-none outline-none text-xs p-0 m-0"
                              />
                            ) : (
                              <span className="truncate block">
                                {cell || <span className="text-gray-300">—</span>}
                              </span>
                            )}
                          </td>
                        );
                      })}
                      <td className="px-1 py-1">
                        <button
                          onClick={() => deleteRow(ri)}
                          className="text-gray-400 hover:text-red-500 p-0.5"
                          title="Eliminar fila"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Preview Pagination */}
          {totalPreviewPages > 1 && (
            <div className="flex items-center justify-between text-sm">
              <button
                onClick={() => setPreviewPage((p) => Math.max(0, p - 1))}
                disabled={previewPage === 0}
                className="flex items-center gap-1 px-3 py-1 rounded bg-gray-100 hover:bg-gray-200 disabled:opacity-40 text-gray-700"
              >
                <ChevronLeft className="w-4 h-4" />
                Anterior
              </button>
              <span className="text-gray-500">
                Vista previa: {previewPage + 1} / {totalPreviewPages} ({rows.length.toLocaleString()} filas)
              </span>
              <button
                onClick={() =>
                  setPreviewPage((p) => Math.min(totalPreviewPages - 1, p + 1))
                }
                disabled={previewPage >= totalPreviewPages - 1}
                className="flex items-center gap-1 px-3 py-1 rounded bg-gray-100 hover:bg-gray-200 disabled:opacity-40 text-gray-700"
              >
                Siguiente
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Upload Button */}
          <div className="flex items-center gap-4 pt-2">
            <button
              onClick={uploadData}
              disabled={uploading || !municipioSlug || rows.length === 0}
              className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 font-medium transition-colors"
            >
              {uploading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Upload className="w-5 h-5" />
              )}
              {uploading
                ? "Subiendo..."
                : `Subir ${rows.length.toLocaleString()} filas a ${municipioSlug}_${tableType}`}
            </button>
            <button
              onClick={() => {
                setFile(null);
                setHeaders([]);
                setRows([]);
                setResult(null);
                setError(null);
              }}
              className="flex items-center gap-1 px-4 py-3 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <X className="w-4 h-4" />
              Limpiar
            </button>
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}
        </div>
      )}

      {/* Result (shown after upload clears the preview) */}
      {result && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3">
          <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
          <div>
            <p className="font-medium text-green-900">Carga completada</p>
            <p className="text-sm text-green-700">
              Tabla: <span className="font-mono">{result.table}</span> |
              Insertados: {result.inserted.toLocaleString()} |
              Errores: {result.errors}
            </p>
          </div>
        </div>
      )}

      {/* Error without file loaded */}
      {error && !file && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}
    </div>
  );
}
