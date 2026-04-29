import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer
} from "recharts";
import type { PieChartConfig } from "../types";
import type { DataRow } from "../../FlowBuilder/types";
import { WIDGET_COLORS } from "../types";

interface Props {
  title: string;
  config: PieChartConfig;
  data: DataRow[];
}

export function PieChartWidget({ config, data }: Props) {
  const { nameColumn, valueColumn, donut, colors } = config;

  if (!nameColumn || !valueColumn) {
    return <div className="flex items-center justify-center h-full text-gray-400 text-sm">Configure columnas de nombre y valor</div>;
  }

  const grouped: Record<string, number> = {};
  data.forEach(row => {
    const name = String(row[nameColumn] ?? "Sin nombre");
    const val = parseFloat(String(row[valueColumn] ?? "0")) || 0;
    grouped[name] = (grouped[name] ?? 0) + val;
  });

  const chartData = Object.entries(grouped)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([name, value]) => ({ name, value }));

  const effectiveColors = colors?.length ? colors : WIDGET_COLORS;

  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={chartData}
          cx="50%"
          cy="50%"
          innerRadius={donut ? "40%" : 0}
          outerRadius="70%"
          paddingAngle={2}
          dataKey="value"
          label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
          labelLine={false}
        >
          {chartData.map((_, i) => (
            <Cell key={i} fill={effectiveColors[i % effectiveColors.length]} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{ fontSize: 12 }}
          formatter={(v: number) => v.toLocaleString("es-CO")}
        />
        <Legend wrapperStyle={{ fontSize: 11 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}
