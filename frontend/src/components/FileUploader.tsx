import { useState, useCallback, useRef } from "react";
import axios from "axios";
import {
  Upload,
  FileSpreadsheet,
  CheckCircle,
  AlertCircle,
  Loader2,
  Eye,
} from "lucide-react";

interface ColumnInfo {
  name: string;
  sql_type: string;
  sample_values: string[];
  null_count: number;
}

interface AnalysisResult {
  filename: string;
  encoding: string;
  total_rows: number;
  total_columns: number;
  columns: ColumnInfo[];
  preview: Record<string, string>[];
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

export function FileUploader({ onSuccess }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [tableType, setTableType] = useState<"apartado" | "recaudos">(
    "apartado"
  );
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [showPreview, setShowPreview] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.name.endsWith(".csv")) {
      setFile(droppedFile);
      setResult(null);
      setError(null);
      setAnalysis(null);
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      setFile(selected);
      setResult(null);
      setError(null);
      setAnalysis(null);
    }
  };

  const analyzeFile = async () => {
    if (!file) return;
    setAnalyzing(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await axios.post<AnalysisResult>("/analyze", formData);
      setAnalysis(res.data);

      const name = file.name.toLowerCase();
      if (name.includes("recaudo")) {
        setTableType("recaudos");
      } else {
        setTableType("apartado");
      }
    } catch (err) {
      setError("Error al analizar el archivo. Verifica que el servicio Python esté corriendo.");
    } finally {
      setAnalyzing(false);
    }
  };

  const uploadFile = async () => {
    if (!file) return;
    setUploading(true);
    setError(null);
    setProgress(0);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("tableType", tableType);

      const res = await axios.post<UploadResult>("/api/upload", formData, {
        onUploadProgress: (e) => {
          if (e.total) {
            setProgress(Math.round((e.loaded * 100) / e.total));
          }
        },
      });
      setResult(res.data);
      onSuccess();
    } catch (err: any) {
      setError(
        err.response?.data?.error || "Error al subir el archivo al servidor."
      );
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Drop Zone */}
      <div
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        onClick={() => inputRef.current?.click()}
        className="border-2 border-dashed border-gray-300 rounded-xl p-12 text-center cursor-pointer hover:border-indigo-400 hover:bg-indigo-50/50 transition-colors"
      >
        <input
          ref={inputRef}
          type="file"
          accept=".csv"
          onChange={handleFileSelect}
          className="hidden"
        />
        <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <p className="text-lg font-medium text-gray-700">
          Arrastra un archivo CSV aquí o haz clic para seleccionar
        </p>
        <p className="text-sm text-gray-500 mt-2">
          Soporta AP_APARTADO y AP_APARTADO_Recaudos
        </p>
      </div>

      {/* File Selected */}
      {file && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
          <div className="flex items-center gap-3">
            <FileSpreadsheet className="w-6 h-6 text-indigo-600" />
            <div>
              <p className="font-medium text-gray-900">{file.name}</p>
              <p className="text-sm text-gray-500">
                {(file.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
          </div>

          {/* Analyze Button */}
          {!analysis && (
            <button
              onClick={analyzeFile}
              disabled={analyzing}
              className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:opacity-50 transition-colors"
            >
              {analyzing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
              {analyzing ? "Analizando..." : "Analizar CSV"}
            </button>
          )}

          {/* Analysis Results */}
          {analysis && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500 uppercase">Filas</p>
                  <p className="text-xl font-bold text-gray-900">
                    {analysis.total_rows.toLocaleString()}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500 uppercase">Columnas</p>
                  <p className="text-xl font-bold text-gray-900">
                    {analysis.total_columns}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500 uppercase">Codificación</p>
                  <p className="text-xl font-bold text-gray-900">
                    {analysis.encoding}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500 uppercase">Tabla destino</p>
                  <select
                    value={tableType}
                    onChange={(e) =>
                      setTableType(e.target.value as "apartado" | "recaudos")
                    }
                    className="mt-1 w-full rounded-md border-gray-300 bg-white px-2 py-1 text-sm font-bold text-gray-900"
                  >
                    <option value="apartado">ap_apartado</option>
                    <option value="recaudos">ap_apartado_recaudos</option>
                  </select>
                </div>
              </div>

              {/* Column Info */}
              <div>
                <button
                  onClick={() => setShowPreview(!showPreview)}
                  className="text-sm text-indigo-600 hover:underline mb-2"
                >
                  {showPreview ? "Ocultar" : "Mostrar"} vista previa de columnas
                </button>
                {showPreview && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-100">
                          <th className="px-3 py-2 text-left">Columna</th>
                          <th className="px-3 py-2 text-left">Tipo SQL</th>
                          <th className="px-3 py-2 text-left">Ejemplo</th>
                        </tr>
                      </thead>
                      <tbody>
                        {analysis.columns.map((col) => (
                          <tr key={col.name} className="border-b border-gray-100">
                            <td className="px-3 py-2 font-mono text-xs">
                              {col.name}
                            </td>
                            <td className="px-3 py-2 text-xs text-gray-600">
                              {col.sql_type}
                            </td>
                            <td className="px-3 py-2 text-xs text-gray-500">
                              {col.sample_values.slice(0, 2).join(", ")}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Upload Button */}
              <div className="flex items-center gap-4">
                <button
                  onClick={uploadFile}
                  disabled={uploading}
                  className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 font-medium transition-colors"
                >
                  {uploading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Upload className="w-5 h-5" />
                  )}
                  {uploading
                    ? `Subiendo... ${progress}%`
                    : "Subir a PostgreSQL"}
                </button>
              </div>

              {/* Progress Bar */}
              {uploading && (
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              )}
            </div>
          )}

          {/* Result */}
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

          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
