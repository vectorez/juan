import { useState, useEffect } from "react";
import axios from "axios";
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertCircle,
} from "lucide-react";

interface DataResponse {
  data: Record<string, unknown>[];
  total: number;
}

export function DataViewer() {
  const [table, setTable] = useState("ap_apartado");
  const [data, setData] = useState<Record<string, unknown>[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pageSize = 25;

  useEffect(() => {
    setLoading(true);
    setError(null);
    axios
      .get<DataResponse>(`/api/data/${table}`, {
        params: { limit: pageSize, offset: page * pageSize },
      })
      .then((res) => {
        setData(res.data.data);
        setTotal(res.data.total);
      })
      .catch(() => setError("Error al cargar datos. Verifica el backend."))
      .finally(() => setLoading(false));
  }, [table, page]);

  const totalPages = Math.ceil(total / pageSize);
  const columns = data.length > 0 ? Object.keys(data[0]) : [];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        <select
          value={table}
          onChange={(e) => {
            setTable(e.target.value);
            setPage(0);
          }}
          className="rounded-lg border-gray-300 bg-gray-50 px-3 py-2 text-sm font-medium"
        >
          <option value="ap_apartado">ap_apartado</option>
          <option value="ap_apartado_recaudos">ap_apartado_recaudos</option>
        </select>
        <p className="text-sm text-gray-500">
          {total.toLocaleString()} registros totales
        </p>
      </div>

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
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50">
                {columns.map((col) => (
                  <th
                    key={col}
                    className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap"
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
                  className="border-b border-gray-100 hover:bg-gray-50"
                >
                  {columns.map((col) => (
                    <td
                      key={col}
                      className="px-3 py-2 whitespace-nowrap text-gray-700 max-w-[200px] truncate"
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

      {!loading && data.length === 0 && !error && (
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
