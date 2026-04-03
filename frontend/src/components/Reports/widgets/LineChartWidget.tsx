import {
  LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from "recharts";
import type { LineChartConfig } from "../types";
import type { DataRow } from "../../FlowBuilder/types";
import { WIDGET_COLORS } from "../types";

interface Props {
  title: string;
  config: LineChartConfig;
  data: DataRow[];
}

export function LineChartWidget({ config, data }: Props) {
  const { xColumn, yColumns, colors, area, smooth } = config;

  if (!xColumn || yColumns.length === 0) {
    return <div className="flex items-center justify-center h-full text-gray-400 text-sm">Configure columnas de ejes</div>;
  }

  const chartData = data.slice(0, 500).map(row => {
    const entry: Record<string, unknown> = { name: String(row[xColumn] ?? "") };
    yColumns.forEach(col => {
      entry[col] = parseFloat(String(row[col] ?? "0")) || 0;
    });
    return entry;
  });

  const effectiveColors = colors?.length ? colors : WIDGET_COLORS;
  const curveType = smooth ? "monotone" : "linear";

  if (area) {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 40 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-30} textAnchor="end" interval={0} height={50} />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip contentStyle={{ fontSize: 12 }} />
          {yColumns.length > 1 && <Legend wrapperStyle={{ fontSize: 12 }} />}
          {yColumns.map((col, i) => (
            <Area
              key={col}
              type={curveType}
              dataKey={col}
              stroke={effectiveColors[i % effectiveColors.length]}
              fill={effectiveColors[i % effectiveColors.length] + "33"}
              strokeWidth={2}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 40 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-30} textAnchor="end" interval={0} height={50} />
        <YAxis tick={{ fontSize: 11 }} />
        <Tooltip contentStyle={{ fontSize: 12 }} />
        {yColumns.length > 1 && <Legend wrapperStyle={{ fontSize: 12 }} />}
        {yColumns.map((col, i) => (
          <Line
            key={col}
            type={curveType}
            dataKey={col}
            stroke={effectiveColors[i % effectiveColors.length]}
            strokeWidth={2}
            dot={false}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
