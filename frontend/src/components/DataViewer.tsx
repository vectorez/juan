import { useState, useEffect } from "react";
import axios from "axios";
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertCircle,
  Calendar,
  Trash2,
} from "lucide-react";

interface Municipio {
  id: number;
  slug: string;
  nombreMunicipio: string;
  nombreDepartamento: string;
}

interface DataResponse {
  data: Record<string, unknown>[];
  total: number;
}

interface ImportDate {
  fecha: string;
  registros: number;
}

interface DataViewerProps {
  initialSlug?: string;
}

export function DataViewer({ initialSlug }: DataViewerProps = {}) {
  const [municipiosList, setMunicipiosList] = useState<Municipio[]>([]);
  const [selectedSlug, setSelectedSlug] = useState("");
  const [tableType, setTableType] = useState<"facturacion" | "recaudos">("facturacion");
  const [data, setData] = useState<Record<string, unknown>[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [importDates, setImportDates] = useState<ImportDate[]>([]);
  const [selectedFecha, setSelectedFecha] = useState<string>("");
  const [deleting, setDeleting] = useState(false);
  const pageSize = 25;

  useEffect(() => {
    if (initialSlug) {
      setSelectedSlug(initialSlug);
    }
    axios
      .get<{ data: Municipio[] }>("/api/municipios")
      .then((res) => {
        setMunicipiosList(res.data.data);
        if (res.data.data.length > 0 && !selectedSlug && !initialSlug) {
          setSelectedSlug(res.data.data[0].slug);
        }
      })
      .catch(() => {});
  }, [initialSlug]);

  const fetchImportDates = () => {
    if (!selectedSlug) return;
    axios
      .get<{ dates: ImportDate[] }>(`/api/import-dates/${selectedSlug}/${tableType}`)
      .then((res) => setImportDates(res.data.dates))
      .catch(() => setImportDates([]));
  };

  useEffect(() => {
    fetchImportDates();
  }, [selectedSlug, tableType]);

  useEffect(() => {
    if (!selectedSlug) return;
    setLoading(true);
    setError(null);
    const params: Record<string, unknown> = { limit: pageSize, offset: page * pageSize };
    if (selectedFecha) params.fecha = selectedFecha;
    axios
      .get<DataResponse>(`/api/data/${selectedSlug}/${tableType}`, { params })
      .then((res) => {
        setData(res.data.data);
        setTotal(res.data.total);
      })
      .catch(() => setError("Error al cargar datos. Verifica el backend."))
      .finally(() => setLoading(false));
  }, [selectedSlug, tableType, page, selectedFecha]);

  const handleDeleteImport = async () => {
    if (!selectedFecha) return;
    
    const selectedDate = importDates.find(d => d.fecha === selectedFecha);
    const fecha = new Date(selectedFecha);
    const formatoLocal = fecha.toLocaleString('es-CO', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
    
    const confirmMsg = `¿Estás seguro de eliminar esta importación?\n\nFecha: ${formatoLocal}\nRegistros: ${selectedDate?.registros || 0}\n\nEsta acción no se puede deshacer.`;
    
    if (!window.confirm(confirmMsg)) return;
    
    setDeleting(true);
    try {
      await axios.delete(`/api/delete-import/${selectedSlug}/${tableType}`, {
        params: { fecha: selectedFecha }
      });
      setSelectedFecha("");
      setPage(0);
      fetchImportDates();
      // Recargar datos
      const params: Record<string, unknown> = { limit: pageSize, offset: 0 };
      const res = await axios.get<DataResponse>(`/api/data/${selectedSlug}/${tableType}`, { params });
      setData(res.data.data);
      setTotal(res.data.total);
    } catch (err) {
      setError("Error al eliminar importación");
    } finally {
      setDeleting(false);
    }
  };

  const totalPages = Math.ceil(total / pageSize);
  const columns = data.length > 0 ? Object.keys(data[0]).filter(col => col !== 'fecha_importacion' && col !== 'id') : [];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 flex flex-wrap items-center gap-3 justify-between">
        <div className="flex items-center gap-3">
          {!initialSlug && (
            <select
              value={selectedSlug}
              onChange={(e) => {
                setSelectedSlug(e.target.value);
                setPage(0);
                setSelectedFecha("");
              }}
              className="rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-sm font-medium"
            >
              {municipiosList.map((m) => (
                <option key={m.slug} value={m.slug}>
                  {m.nombreMunicipio}
                </option>
              ))}
            </select>
          )}
          <select
            value={tableType}
            onChange={(e) => {
              setTableType(e.target.value as "facturacion" | "recaudos");
              setPage(0);
              setSelectedFecha("");
            }}
            className="rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-sm font-medium"
          >
            <option value="facturacion">Facturación</option>
            <option value="recaudos">Recaudos</option>
          </select>
          <div className="flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-gray-400" />
            <select
              value={selectedFecha}
              onChange={(e) => {
                setSelectedFecha(e.target.value);
                setPage(0);
              }}
              className="rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-sm font-medium"
            >
              <option value="">Todas las importaciones</option>
              {importDates.map((d) => {
                const fecha = new Date(d.fecha);
                const formatoLocal = fecha.toLocaleString('es-CO', {
                  year: 'numeric',
                  month: '2-digit',
                  day: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit'
                });
                return (
                  <option key={d.fecha} value={d.fecha}>
                    {formatoLocal} ({d.registros.toLocaleString()} reg.)
                  </option>
                );
              })}
            </select>
            {selectedFecha && (
              <button
                onClick={handleDeleteImport}
                disabled={deleting}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500 text-white hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition-colors"
              >
                {deleting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Eliminando...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    Eliminar importación
                  </>
                )}
              </button>
            )}
          </div>
        </div>
        <p className="text-sm text-gray-500">
          <span className="font-mono">{selectedSlug}_{tableType}</span> — {total.toLocaleString()} registros
          {selectedFecha && (
            <span className="ml-1 text-indigo-600">
              (filtrado: {new Date(selectedFecha).toLocaleString('es-CO', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
              })})
            </span>
          )}
        </p>
      </div>

      {municipiosList.length === 0 && (
        <div className="p-8 text-center text-gray-500">
          No hay municipios creados. Crea uno primero en la pestaña "Municipios".
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="p-4 bg-red-50 flex items-center gap-2 text-red-700 text-sm">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="p-8 flex items-center justify-center text-gray-500">
          <Loader2 className="w-5 h-5 animate-spin mr-2" />
          Cargando...
        </div>
      )}

      {/* Table */}
      {!loading && data.length > 0 && (
        <div className="flex-1 overflow-auto border border-green-200 rounded-lg min-h-0">
          <table className="w-full text-sm border-collapse">
            <thead className="sticky top-0 z-10">
              <tr className="bg-gradient-to-b from-green-600 to-green-700">
                {columns.map((col) => (
                  <th
                    key={col}
                    className="px-3 py-2.5 text-left text-xs font-bold text-white uppercase whitespace-nowrap border-r border-green-500 last:border-r-0"
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((row, i) => (
                <tr
                  key={i}
                  className={`border-b border-gray-200 hover:bg-green-50 transition-colors ${
                    i % 2 === 0 ? "bg-white" : "bg-gray-50/50"
                  }`}
                >
                  {columns.map((col) => (
                    <td
                      key={col}
                      className="px-3 py-1.5 whitespace-nowrap text-gray-700 max-w-[250px] truncate border-r border-gray-100 last:border-r-0 font-mono text-xs"
                    >
                      {String(row[col] ?? "")}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!loading && data.length === 0 && !error && selectedSlug && (
        <div className="p-8 text-center text-gray-500">
          No hay datos en esta tabla. Sube un archivo CSV primero.
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="p-4 border-t border-gray-200 flex items-center justify-between">
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-50 text-sm"
          >
            <ChevronLeft className="w-4 h-4" />
            Anterior
          </button>
          <span className="text-sm text-gray-500">
            Página {page + 1} de {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-50 text-sm"
          >
            Siguiente
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
