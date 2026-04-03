import type { KpiConfig, KpiAggregation } from "../types";
import { KPI_COLOR_MAP } from "../types";
import type { DataRow } from "../../FlowBuilder/types";

interface Props {
  title: string;
  config: KpiConfig;
  data: DataRow[];
}

function aggregate(rows: DataRow[], column: string, op: KpiAggregation): number {
  if (!column) return rows.length;
  const values = rows.map(r => parseFloat(String(r[column] ?? "0"))).filter(v => !isNaN(v));
  if (values.length === 0) return 0;
  switch (op) {
    case "sum":   return values.reduce((a, b) => a + b, 0);
    case "count": return rows.length;
    case "avg":   return values.reduce((a, b) => a + b, 0) / values.length;
    case "min":   return Math.min(...values);
    case "max":   return Math.max(...values);
    case "last":  return values[values.length - 1];
  }
}

function formatValue(v: number, decimals: number, prefix: string, suffix: string): string {
  const formatted = v.toLocaleString("es-CO", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  return `${prefix}${formatted}${suffix ? " " + suffix : ""}`;
}

export function KpiCard({ title, config, data }: Props) {
  const { column, aggregation, prefix, suffix, color, decimals } = config;
  const value = aggregate(data, column, aggregation);
  const colors = KPI_COLOR_MAP[color] ?? KPI_COLOR_MAP.blue;

  return (
    <div className={`rounded-xl p-5 h-full flex flex-col justify-between ${colors.bg} border border-opacity-20`}>
      <div className="flex items-start justify-between">
        <p className="text-sm font-medium text-gray-500">{title}</p>
        <span className={`w-2 h-2 rounded-full ${colors.badge}`} />
      </div>
      <div>
        <p className={`text-3xl font-bold mt-2 ${colors.text}`}>
          {formatValue(value, decimals ?? 0, prefix ?? "", suffix ?? "")}
        </p>
        <p className="text-xs text-gray-400 mt-1">
          {column ? `${aggregation.toUpperCase()} de ${column}` : "Conteo de registros"} · {data.length} filas
        </p>
      </div>
    </div>
  );
}
