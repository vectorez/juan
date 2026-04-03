import { useEffect, useState } from "react";
import axios from "axios";
import { Plus, Pencil, Trash2, Eye, FileBarChart2, Loader2, Clock } from "lucide-react";
import type { SavedReport } from "./types";

interface Props {
  onEdit: (id?: number) => void;
  onView: (id: number) => void;
}

export function ReportsManager({ onEdit, onView }: Props) {
  const [reports, setReports] = useState<SavedReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<number | null>(null);

  const load = async () => {
    try {
      const { data } = await axios.get<SavedReport[]>("/api/reportes");
      setReports(data);
    } catch { /* ignore */ }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async (id: number) => {
    if (!confirm("¿Eliminar este reporte?")) return;
    setDeleting(id);
    try {
      await axios.delete(`/api/reportes/${id}`);
      setReports(prev => prev.filter(r => r.id !== id));
    } catch { /* ignore */ }
    setDeleting(null);
  };

  const formatDate = (s: string) => new Date(s).toLocaleDateString("es-CO", {
    day: "2-digit", month: "short", year: "numeric"
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Reportes</h2>
          <p className="text-sm text-gray-500 mt-1">Crea reportes visuales a partir de tus pipelines de datos</p>
        </div>
        <button
          onClick={() => onEdit()}
          className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-lg font-medium hover:bg-indigo-700 transition-colors text-sm"
        >
          <Plus className="w-4 h-4" />
          Nuevo reporte
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
        </div>
      ) : reports.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-300 gap-3">
          <FileBarChart2 className="w-16 h-16" />
          <p className="text-lg font-medium text-gray-400">No hay reportes creados</p>
          <p className="text-sm text-gray-400">Crea tu primer reporte para visualizar tus datos con gráficas</p>
          <button
            onClick={() => onEdit()}
            className="mt-2 flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-indigo-700"
          >
            <Plus className="w-4 h-4" />
            Crear primer reporte
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {reports.map(report => (
            <div key={report.id} className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
              {/* Color accent bar */}
              <div className="h-1.5 bg-gradient-to-r from-indigo-500 to-purple-500" />
              <div className="p-5">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 truncate">{report.nombre}</h3>
                    {report.descripcion && (
                      <p className="text-sm text-gray-500 mt-0.5 line-clamp-2">{report.descripcion}</p>
                    )}
                  </div>
                  <FileBarChart2 className="w-5 h-5 text-indigo-300 flex-shrink-0 mt-0.5" />
                </div>

                <div className="flex items-center gap-3 mt-3 text-xs text-gray-400">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatDate(report.updatedAt)}
                  </span>
                  <span className="bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full font-medium">
                    {report.config?.widgets?.length ?? 0} widgets
                  </span>
                  {report.pipelineId && (
                    <span className="bg-purple-50 text-purple-600 px-2 py-0.5 rounded-full font-medium">
                      Pipeline #{report.pipelineId}
                    </span>
                  )}
                </div>

                <div className="flex gap-2 mt-4">
                  <button
                    onClick={() => onView(report.id)}
                    className="flex-1 flex items-center justify-center gap-1.5 bg-indigo-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    Ver
                  </button>
                  <button
                    onClick={() => onEdit(report.id)}
                    className="flex items-center justify-center gap-1.5 border border-gray-200 text-gray-600 px-3 py-2 rounded-lg text-sm hover:bg-gray-50 transition-colors"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(report.id)}
                    disabled={deleting === report.id}
                    className="flex items-center justify-center gap-1.5 border border-gray-200 text-red-400 px-3 py-2 rounded-lg text-sm hover:bg-red-50 hover:border-red-200 transition-colors disabled:opacity-50"
                  >
                    {deleting === report.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
