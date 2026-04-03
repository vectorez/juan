import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from "recharts";
import type { BarChartConfig } from "../types";
import type { DataRow } from "../../FlowBuilder/types";
import { WIDGET_COLORS } from "../types";

interface Props {
  title: string;
  config: BarChartConfig;
  data: DataRow[];
}

export function BarChartWidget({ config, data }: Props) {
  const { xColumn, yColumns, colors, stacked, horizontal } = config;

  if (!xColumn || yColumns.length === 0) {
    return <div className="flex items-center justify-center h-full text-gray-400 text-sm">Configure columnas de ejes</div>;
  }

  const chartData = data.slice(0, 200).map(row => {
    const entry: Record<string, unknown> = { name: String(row[xColumn] ?? "") };
    yColumns.forEach(col => {
      entry[col] = parseFloat(String(row[col] ?? "0")) || 0;
    });
    return entry;
  });

  const effectiveColors = colors?.length ? colors : WIDGET_COLORS;

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={chartData} layout={horizontal ? "vertical" : "horizontal"} margin={{ top: 5, right: 20, left: 10, bottom: 40 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        {horizontal ? (
          <>
            <XAxis type="number" tick={{ fontSize: 11 }} />
            <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={100} />
          </>
        ) : (
          <>
            <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-30} textAnchor="end" interval={0} height={50} />
            <YAxis tick={{ fontSize: 11 }} />
          </>
        )}
        <Tooltip contentStyle={{ fontSize: 12 }} />
        {yColumns.length > 1 && <Legend wrapperStyle={{ fontSize: 12 }} />}
        {yColumns.map((col, i) => (
          <Bar
            key={col}
            dataKey={col}
            fill={effectiveColors[i % effectiveColors.length]}
            stackId={stacked ? "stack" : undefined}
            radius={stacked ? [0, 0, 0, 0] : [4, 4, 0, 0]}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}
