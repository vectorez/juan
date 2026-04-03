import type { DataTableConfig } from "../types";
import type { DataRow } from "../../FlowBuilder/types";

interface Props {
  title: string;
  config: DataTableConfig;
  data: DataRow[];
}

export function DataTableWidget({ config, data }: Props) {
  const { columns, limit, striped } = config;

  if (data.length === 0) {
    return <div className="flex items-center justify-center h-full text-gray-400 text-sm">Sin datos</div>;
  }

  const allColumns = Object.keys(data[0] ?? {});
  const visibleCols = columns?.length ? columns : allColumns;
  const rows = data.slice(0, limit ?? 50);

  return (
    <div className="h-full overflow-auto">
      <table className="w-full text-xs border-collapse">
        <thead className="sticky top-0">
          <tr>
            {visibleCols.map(col => (
              <th
                key={col}
                className="px-3 py-2 text-left font-semibold bg-gray-700 text-white border-r border-gray-600 whitespace-nowrap"
              >
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={i}
              className={`${striped && i % 2 === 1 ? "bg-gray-50" : "bg-white"} hover:bg-indigo-50 transition-colors`}
            >
              {visibleCols.map(col => (
                <td key={col} className="px-3 py-1.5 border-b border-r border-gray-100 whitespace-nowrap font-mono">
                  {String(row[col] ?? "")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
