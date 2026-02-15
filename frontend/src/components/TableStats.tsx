import { useEffect, useState } from "react";
import axios from "axios";
import { Database, Loader2, MapPin } from "lucide-react";

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

export function TableStats() {
  const [tables, setTables] = useState<MunicipioTable[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios
      .get<TablesResponse>("/api/tables")
      .then((res) => setTables(res.data.tables))
      .catch(() => setTables([]))
      .finally(() => setLoading(false));
  }, []);

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
              <p className="text-xs text-gray-500">Facturación</p>
              <p className="text-lg font-bold text-gray-900">{t.facturacion.toLocaleString()}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-2">
              <p className="text-xs text-gray-500">Recaudos</p>
              <p className="text-lg font-bold text-gray-900">{t.recaudos.toLocaleString()}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
