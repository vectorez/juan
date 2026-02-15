import { useEffect, useState, useCallback } from "react";
import axios from "axios";
import { Database, Loader2, MapPin, Trash2, AlertTriangle } from "lucide-react";

interface MunicipioTable {
  municipio: string;
  slug: string;
  facturacion: number;
  recaudos: number;
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

export function TableStats() {
  const [tables, setTables] = useState<MunicipioTable[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirm, setConfirm] = useState<ConfirmState | null>(null);
  const [deleting, setDeleting] = useState(false);

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
            <div className="flex items-center gap-3 mb-3">
              <div className="bg-indigo-100 rounded-lg p-2">
                <Database className="w-5 h-5 text-indigo-600" />
              </div>
              <p className="font-semibold text-gray-900">{t.municipio}</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-50 rounded-lg p-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-gray-500">Facturación</p>
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
                <p className="text-lg font-bold text-gray-900">
                  {t.facturacion.toLocaleString()}
                </p>
              </div>
              <div className="bg-gray-50 rounded-lg p-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-gray-500">Recaudos</p>
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
                <p className="text-lg font-bold text-gray-900">
                  {t.recaudos.toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

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
