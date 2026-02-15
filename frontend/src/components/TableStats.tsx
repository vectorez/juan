import { useEffect, useState } from "react";
import axios from "axios";
import { Database, Loader2 } from "lucide-react";

interface TableInfo {
  name: string;
  count: number;
}

export function TableStats() {
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios
      .get<{ tables: TableInfo[] }>("/api/tables")
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

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
      {tables.map((t) => (
        <div
          key={t.name}
          className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 flex items-center gap-4"
        >
          <div className="bg-indigo-100 rounded-lg p-3">
            <Database className="w-6 h-6 text-indigo-600" />
          </div>
          <div>
            <p className="font-mono text-sm text-gray-500">{t.name}</p>
            <p className="text-2xl font-bold text-gray-900">
              {t.count.toLocaleString()}{" "}
              <span className="text-sm font-normal text-gray-500">registros</span>
            </p>
          </div>
        </div>
      ))}
      {tables.length === 0 && (
        <p className="text-gray-500 col-span-2">
          No se pudo conectar con el backend. Verifica que esté corriendo en puerto 3001.
        </p>
      )}
    </div>
  );
}
