import { useEffect, useState, useCallback, useRef } from "react";
import axios from "axios";
import * as XLSX from "xlsx";
import { DataViewer } from "./DataViewer";
import {
  Database,
  Loader2,
  MapPin,
  Trash2,
  AlertTriangle,
  Upload,
  X,
  CheckCircle,
  FileSpreadsheet,
  Eye,
  EyeOff,
  Pencil,
  ChevronLeft,
  ChevronRight,
  Download,
} from "lucide-react";

interface MunicipioTable {
  municipio: string;
  slug: string;
  facturacion: number;
  recaudos: number;
  encabezadosFacturacion: string[];
  encabezadosRecaudos: string[];
}

interface TablesResponse {
  tables: MunicipioTable[];
  totalMunicipios: number;
}

interface ConfirmState {
  slug: string;
  tableType: "facturacion" | "recaudos";
  municipio: string;
}

interface UploadModal {
  slug: string;
  municipio: string;
}

interface UploadResult {
  success: boolean;
  table: string;
  totalRows: number;
  inserted: number;
  errors: number;
}

export function TableStats() {
  const [tables, setTables] = useState<MunicipioTable[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirm, setConfirm] = useState<ConfirmState | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [uploadModal, setUploadModal] = useState<UploadModal | null>(null);
  const [uploadTableType, setUploadTableType] = useState<"" | "facturacion" | "recaudos">("")
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadHeaders, setUploadHeaders] = useState<string[]>([]);
  const [uploadRows, setUploadRows] = useState<string[][]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [previewPage, setPreviewPage] = useState(0);
  const [editCell, setEditCell] = useState<{ r: number; c: number } | null>(null);
  const [editValue, setEditValue] = useState("");
  const [viewModal, setViewModal] = useState<{ slug: string; municipio: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editInputRef = useRef<HTMLInputElement>(null);

  const PREVIEW_PAGE_SIZE = 50;

  const downloadTemplate = (headers: string[], municipio: string, tipo: string) => {
    if (!headers || headers.length === 0) return;
    const ws = XLSX.utils.aoa_to_sheet([headers]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, tipo);
    XLSX.writeFile(wb, `plantilla_${municipio}_${tipo}.xlsx`);
  };

  const fetchTables = useCallback(() => {
    axios
      .get<TablesResponse>("/api/tables")
      .then((res) => setTables(res.data.tables))
      .catch(() => setTables([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchTables();
  }, [fetchTables]);

  const handleTruncate = async () => {
    if (!confirm) return;
    setDeleting(true);
    try {
      await axios.delete(`/api/truncate/${confirm.slug}/${confirm.tableType}`);
      setConfirm(null);
      fetchTables();
    } catch {
      alert("Error al vaciar la tabla");
    } finally {
      setDeleting(false);
    }
  };

  useEffect(() => {
    if (editCell !== null && editInputRef.current) {
      editInputRef.current.focus();
    }
  }, [editCell]);

  const openUploadModal = (slug: string, municipio: string) => {
    setUploadModal({ slug, municipio });
    setUploadTableType("");
    setUploadFile(null);
    setUploadHeaders([]);
    setUploadRows([]);
    setUploadResult(null);
    setUploadError(null);
    setValidationError(null);
    setShowPreview(false);
    setPreviewPage(0);
    setEditCell(null);
  };

  const closeUploadModal = () => {
    setUploadModal(null);
    setUploadFile(null);
    setUploadHeaders([]);
    setUploadRows([]);
    setUploadResult(null);
    setUploadError(null);
    setValidationError(null);
    setShowPreview(false);
    setEditCell(null);
  };

  const startEdit = (r: number, c: number) => {
    setEditCell({ r, c });
    setEditValue(uploadRows[r][c]);
  };

  const commitEdit = () => {
    if (editCell === null) return;
    const updated = [...uploadRows];
    updated[editCell.r] = [...updated[editCell.r]];
    updated[editCell.r][editCell.c] = editValue;
    setUploadRows(updated);
    setEditCell(null);
  };

  const cancelEdit = () => setEditCell(null);

  const deleteRow = (rowIdx: number) => {
    setUploadRows((prev) => prev.filter((_, i) => i !== rowIdx));
  };

  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setUploadFile(f);
    setUploadResult(null);
    setUploadError(null);
    setValidationError(null);

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = new Uint8Array(ev.target?.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: "array", codepage: 28591 });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const json: string[][] = XLSX.utils.sheet_to_json(ws, {
          header: 1,
          raw: false,
          defval: "",
        });
        if (json.length < 2) {
          setUploadError("El archivo no tiene datos suficientes.");
          return;
        }
        const headers = json[0].map(String);
        const rows = json.slice(1).map((r) => r.map(String));
        setUploadHeaders(headers);
        setUploadRows(rows);

        const name = f.name.toLowerCase();
        let detectedType: "facturacion" | "recaudos" = "facturacion";
        if (name.includes("recaudo")) detectedType = "recaudos";
        setUploadTableType(detectedType);

        // Prevalidación de columnas
        if (uploadModal) {
          const municipio = tables.find(t => t.slug === uploadModal.slug);
          if (municipio) {
            const expectedHeaders = detectedType === "facturacion" 
              ? municipio.encabezadosFacturacion 
              : municipio.encabezadosRecaudos;
            const expectedCols = expectedHeaders?.length || 0;
            
            if (expectedCols > 0 && headers.length !== expectedCols) {
              setValidationError(
                `El archivo tiene ${headers.length} columnas pero se esperan ${expectedCols}. ` +
                `Descarga la plantilla correcta para este municipio.`
              );
            }
          }
        }
      } catch {
        setUploadError("No se pudo leer el archivo.");
      }
    };
    reader.readAsArrayBuffer(f);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleUpload = async () => {
    if (!uploadModal || uploadRows.length === 0) return;
    setUploading(true);
    setUploadError(null);
    try {
      const res = await axios.post<UploadResult>("/api/upload-data", {
        municipioSlug: uploadModal.slug,
        tableType: uploadTableType as "facturacion" | "recaudos",
        headers: uploadHeaders,
        rows: uploadRows,
      });
      setUploadResult(res.data);
      setUploadFile(null);
      setUploadHeaders([]);
      setUploadRows([]);
      fetchTables();
    } catch (err: any) {
      setUploadError(err.response?.data?.error || "Error al subir los datos.");
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-gray-500 mb-6">
        <Loader2 className="w-4 h-4 animate-spin" />
        Cargando estadísticas...
      </div>
    );
  }

  if (tables.length === 0) {
    return (
      <div className="bg-gray-50 rounded-xl border border-gray-200 p-6 mb-8 text-center text-gray-500">
        <MapPin className="w-8 h-8 mx-auto mb-2 text-gray-400" />
        No hay municipios creados. Crea uno en la pestaña "Municipios" para comenzar.
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {tables.map((t) => (
          <div
            key={t.slug}
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-5"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="bg-indigo-100 rounded-lg p-2">
                  <Database className="w-5 h-5 text-indigo-600" />
                </div>
                <p className="font-semibold text-gray-900">{t.municipio}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setViewModal({ slug: t.slug, municipio: t.municipio })}
                  className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-gray-600 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  title="Ver datos"
                >
                  <Eye className="w-3.5 h-3.5" />
                  Ver
                </button>
                <button
                  onClick={() => openUploadModal(t.slug, t.municipio)}
                  className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors"
                  title="Subir archivo"
                >
                  <Upload className="w-3.5 h-3.5" />
                  Subir
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-50 rounded-lg p-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-gray-500">Facturación</p>
                  <div className="flex items-center gap-1">
                    {t.encabezadosFacturacion?.length > 0 && (
                      <button
                        onClick={() => downloadTemplate(t.encabezadosFacturacion, t.slug, "facturacion")}
                        className="text-gray-400 hover:text-indigo-500 transition-colors"
                        title="Descargar plantilla facturación"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {t.facturacion > 0 && (
                      <button
                        onClick={() =>
                          setConfirm({ slug: t.slug, tableType: "facturacion", municipio: t.municipio })
                        }
                        className="text-gray-400 hover:text-red-500 transition-colors"
                        title="Vaciar tabla de facturación"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
                <p className="text-lg font-bold text-gray-900">
                  {t.facturacion.toLocaleString()}
                </p>
              </div>
              <div className="bg-gray-50 rounded-lg p-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-gray-500">Recaudos</p>
                  <div className="flex items-center gap-1">
                    {t.encabezadosRecaudos?.length > 0 && (
                      <button
                        onClick={() => downloadTemplate(t.encabezadosRecaudos, t.slug, "recaudos")}
                        className="text-gray-400 hover:text-indigo-500 transition-colors"
                        title="Descargar plantilla recaudos"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {t.recaudos > 0 && (
                      <button
                        onClick={() =>
                          setConfirm({ slug: t.slug, tableType: "recaudos", municipio: t.municipio })
                        }
                        className="text-gray-400 hover:text-red-500 transition-colors"
                        title="Vaciar tabla de recaudos"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
                <p className="text-lg font-bold text-gray-900">
                  {t.recaudos.toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Upload Modal */}
      {uploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className={`bg-white rounded-xl shadow-xl border border-gray-200 p-6 w-full mx-4 transition-all ${
            showPreview && uploadFile ? "max-w-6xl" : "max-w-lg"
          }`}>
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="bg-indigo-100 rounded-full p-2">
                  <Upload className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    Subir datos
                  </h3>
                  <p className="text-sm text-gray-500">{uploadModal.municipio}</p>
                </div>
              </div>
              <button
                onClick={closeUploadModal}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Step 1: Select type */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tipo de datos
              </label>
              <select
                value={uploadTableType}
                onChange={(e) => setUploadTableType(e.target.value as "" | "facturacion" | "recaudos")}
                disabled={uploading}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
              >
                <option value="" disabled>— Selecciona un tipo —</option>
                <option value="facturacion">Facturación</option>
                <option value="recaudos">Recaudos</option>
              </select>
            </div>

            {/* Step 2: File picker */}
            {!uploadFile && !uploadResult && uploadTableType && (
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={handleFileSelected}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full flex items-center justify-center gap-2 px-4 py-4 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-indigo-400 hover:bg-indigo-50/50 transition-colors"
                >
                  <FileSpreadsheet className="w-5 h-5" />
                  Seleccionar archivo CSV / Excel
                </button>
              </div>
            )}

            {/* File loaded info */}
            {uploadFile && uploadRows.length > 0 && (() => {
              const totalPages = Math.ceil(uploadRows.length / PREVIEW_PAGE_SIZE);
              const visibleRows = uploadRows.slice(
                previewPage * PREVIEW_PAGE_SIZE,
                (previewPage + 1) * PREVIEW_PAGE_SIZE
              );
              const offset = previewPage * PREVIEW_PAGE_SIZE;
              return (
                <div className="space-y-3">
                  <div className="bg-gray-50 rounded-lg p-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileSpreadsheet className="w-4 h-4 text-indigo-600" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">{uploadFile.name}</p>
                        <p className="text-xs text-gray-500">
                          {uploadRows.length.toLocaleString()} filas, {uploadHeaders.length} columnas
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => { setShowPreview(!showPreview); setEditCell(null); setPreviewPage(0); }}
                        className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-indigo-600 bg-indigo-50 rounded hover:bg-indigo-100 transition-colors"
                        title={showPreview ? "Ocultar preview" : "Ver preview"}
                      >
                        {showPreview ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        {showPreview ? "Ocultar" : "Preview"}
                      </button>
                      <button
                        onClick={() => {
                          setUploadFile(null);
                          setUploadHeaders([]);
                          setUploadRows([]);
                          setShowPreview(false);
                          setEditCell(null);
                        }}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Editable Preview Table */}
                  {showPreview && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <Pencil className="w-3 h-3" />
                        Haz clic en una celda para editar
                      </div>
                      <div className="overflow-x-auto border border-gray-200 rounded-lg max-h-[400px] overflow-y-auto">
                        <table className="w-full text-xs">
                          <thead className="sticky top-0 z-10">
                            <tr className="bg-indigo-50">
                              <th className="px-2 py-1.5 text-center text-gray-500 w-8">#</th>
                              {uploadHeaders.map((h, ci) => (
                                <th key={ci} className="px-2 py-1.5 text-left font-semibold text-indigo-700 whitespace-nowrap">
                                  {h}
                                </th>
                              ))}
                              <th className="px-1 py-1.5 w-6"></th>
                            </tr>
                          </thead>
                          <tbody>
                            {visibleRows.map((row, vi) => {
                              const ri = offset + vi;
                              return (
                                <tr key={ri} className="border-b border-gray-100 hover:bg-gray-50">
                                  <td className="px-2 py-1 text-center text-gray-400 font-mono">{ri + 1}</td>
                                  {row.map((cell, ci) => {
                                    const isEditing = editCell?.r === ri && editCell?.c === ci;
                                    return (
                                      <td
                                        key={ci}
                                        className={`px-2 py-1 max-w-[160px] cursor-pointer ${
                                          isEditing ? "bg-indigo-100 ring-2 ring-indigo-400 rounded" : "hover:bg-indigo-50/50"
                                        }`}
                                        onClick={() => { if (!isEditing) startEdit(ri, ci); }}
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
                                                const nextC = ci + 1 < uploadHeaders.length ? ci + 1 : 0;
                                                const nextR = nextC === 0 ? ri + 1 : ri;
                                                if (nextR < uploadRows.length) startEdit(nextR, nextC);
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
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                      {totalPages > 1 && (
                        <div className="flex items-center justify-between text-xs">
                          <button
                            onClick={() => setPreviewPage((p) => Math.max(0, p - 1))}
                            disabled={previewPage === 0}
                            className="flex items-center gap-1 px-2 py-1 rounded bg-gray-100 hover:bg-gray-200 disabled:opacity-40 text-gray-700"
                          >
                            <ChevronLeft className="w-3 h-3" /> Anterior
                          </button>
                          <span className="text-gray-500">
                            {previewPage + 1} / {totalPages}
                          </span>
                          <button
                            onClick={() => setPreviewPage((p) => Math.min(totalPages - 1, p + 1))}
                            disabled={previewPage >= totalPages - 1}
                            className="flex items-center gap-1 px-2 py-1 rounded bg-gray-100 hover:bg-gray-200 disabled:opacity-40 text-gray-700"
                          >
                            Siguiente <ChevronRight className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  <p className="text-xs text-gray-500">
                    Se subirá a <span className="font-mono font-bold">{uploadModal.slug}_{uploadTableType}</span>
                  </p>

                  {/* Validation error */}
                  {validationError && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-red-900 mb-2">{validationError}</p>
                          <button
                            onClick={() => {
                              const municipio = tables.find(t => t.slug === uploadModal.slug);
                              if (municipio) {
                                const headers = uploadTableType === "facturacion" 
                                  ? municipio.encabezadosFacturacion 
                                  : municipio.encabezadosRecaudos;
                                downloadTemplate(headers, uploadModal.slug, uploadTableType);
                              }
                            }}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 text-white text-xs font-medium rounded hover:bg-red-700 transition-colors"
                          >
                            <Download className="w-3.5 h-3.5" />
                            Descargar plantilla correcta
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  <button
                    onClick={handleUpload}
                    disabled={uploading || !!validationError}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 font-medium transition-colors"
                  >
                    {uploading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Upload className="w-4 h-4" />
                    )}
                    {uploading
                      ? "Subiendo..."
                      : `Subir ${uploadRows.length.toLocaleString()} filas`}
                  </button>
                </div>
              );
            })()}

            {/* Upload result */}
            {uploadResult && (
              <div className="space-y-3">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-green-900">Carga completada</p>
                    <p className="text-sm text-green-700">
                      Tabla: <span className="font-mono">{uploadResult.table}</span> |
                      Insertados: {uploadResult.inserted.toLocaleString()} |
                      Errores: {uploadResult.errors}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setUploadResult(null);
                      setUploadFile(null);
                    }}
                    className="flex-1 px-4 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors"
                  >
                    Subir otro archivo
                  </button>
                  <button
                    onClick={closeUploadModal}
                    className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Cerrar
                  </button>
                </div>
              </div>
            )}

            {/* Upload error */}
            {uploadError && (
              <div className="mt-3 bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
                {uploadError}
              </div>
            )}
          </div>
        </div>
      )}

      {/* View Data Modal */}
      {viewModal && (
        <div className="fixed inset-0 z-50 flex flex-col bg-white">
          <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-green-600 to-green-700 flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 rounded-lg p-2">
                <FileSpreadsheet className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">
                  Datos de {viewModal.municipio}
                </h3>
                <p className="text-green-100 text-xs">Visor de datos</p>
              </div>
            </div>
            <button
              onClick={() => setViewModal(null)}
              className="text-white/70 hover:text-white bg-white/10 hover:bg-white/20 rounded-lg p-1.5 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="flex-1 overflow-hidden p-4">
            <DataViewer initialSlug={viewModal.slug} />
          </div>
        </div>
      )}

      {/* Confirmation Dialog */}
      {confirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl border border-gray-200 p-6 max-w-md w-full mx-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-red-100 rounded-full p-2">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">
                Confirmar eliminación
              </h3>
            </div>
            <p className="text-sm text-gray-600 mb-1">
              ¿Estás seguro de que deseas <strong>eliminar todos los datos</strong> de la tabla:
            </p>
            <p className="font-mono text-sm bg-red-50 text-red-700 rounded-lg px-3 py-2 mb-4">
              {confirm.slug}_{confirm.tableType}
            </p>
            <p className="text-xs text-red-500 mb-5">
              Esta acción no se puede deshacer. Se eliminarán todos los registros de esta tabla.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setConfirm(null)}
                disabled={deleting}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleTruncate}
                disabled={deleting}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                {deleting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
                {deleting ? "Eliminando..." : "Sí, vaciar tabla"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
