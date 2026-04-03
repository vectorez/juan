import type { SavedPipeline, DataRow } from "../FlowBuilder/types";

export type WidgetType = "kpi_card" | "bar_chart" | "line_chart" | "pie_chart" | "data_table";
export type KpiColor = "blue" | "green" | "red" | "purple" | "orange" | "cyan" | "indigo";
export type KpiAggregation = "sum" | "count" | "avg" | "min" | "max" | "last";

export interface KpiConfig {
  column: string;
  aggregation: KpiAggregation;
  prefix: string;
  suffix: string;
  color: KpiColor;
  decimals: number;
}

export interface BarChartConfig {
  xColumn: string;
  yColumns: string[];
  colors: string[];
  stacked: boolean;
  horizontal: boolean;
}

export interface LineChartConfig {
  xColumn: string;
  yColumns: string[];
  colors: string[];
  area: boolean;
  smooth: boolean;
}

export interface PieChartConfig {
  nameColumn: string;
  valueColumn: string;
  donut: boolean;
  colors: string[];
}

export interface DataTableConfig {
  columns: string[];
  limit: number;
  striped: boolean;
}

export type WidgetConfig = KpiConfig | BarChartConfig | LineChartConfig | PieChartConfig | DataTableConfig;

export interface WidgetLayout {
  col: number;
  row: number;
  colSpan: number;
  rowSpan: number;
}

export interface ReportWidget {
  id: string;
  type: WidgetType;
  title: string;
  nodeId: string;
  config: WidgetConfig;
  layout: WidgetLayout;
}

export interface ReportConfig {
  widgets: ReportWidget[];
}

export interface SavedReport {
  id: number;
  nombre: string;
  descripcion: string;
  pipelineId: number | null;
  config: ReportConfig;
  createdAt: string;
  updatedAt: string;
}

export interface ReportExecutionResult {
  nodeResults: Record<string, DataRow[]>;
  pipeline: SavedPipeline | null;
}

export const WIDGET_COLORS = [
  "#6366f1", "#22c55e", "#f59e0b", "#ef4444",
  "#3b82f6", "#a855f7", "#ec4899", "#14b8a6",
  "#f97316", "#84cc16",
];

export const KPI_COLOR_MAP: Record<KpiColor, { bg: string; text: string; badge: string }> = {
  blue:   { bg: "bg-blue-50",   text: "text-blue-700",   badge: "bg-blue-500" },
  green:  { bg: "bg-green-50",  text: "text-green-700",  badge: "bg-green-500" },
  red:    { bg: "bg-red-50",    text: "text-red-700",    badge: "bg-red-500" },
  purple: { bg: "bg-purple-50", text: "text-purple-700", badge: "bg-purple-500" },
  orange: { bg: "bg-orange-50", text: "text-orange-700", badge: "bg-orange-500" },
  cyan:   { bg: "bg-cyan-50",   text: "text-cyan-700",   badge: "bg-cyan-500" },
  indigo: { bg: "bg-indigo-50", text: "text-indigo-700", badge: "bg-indigo-500" },
};

export function defaultConfig(type: WidgetType): WidgetConfig {
  switch (type) {
    case "kpi_card":
      return { column: "", aggregation: "count", prefix: "", suffix: "", color: "blue", decimals: 0 } as KpiConfig;
    case "bar_chart":
      return { xColumn: "", yColumns: [], colors: WIDGET_COLORS.slice(0, 3), stacked: false, horizontal: false } as BarChartConfig;
    case "line_chart":
      return { xColumn: "", yColumns: [], colors: WIDGET_COLORS.slice(0, 3), area: false, smooth: true } as LineChartConfig;
    case "pie_chart":
      return { nameColumn: "", valueColumn: "", donut: false, colors: WIDGET_COLORS } as PieChartConfig;
    case "data_table":
      return { columns: [], limit: 50, striped: true } as DataTableConfig;
  }
}

export function defaultLayout(type: WidgetType): WidgetLayout {
  switch (type) {
    case "kpi_card":   return { col: 0, row: 0, colSpan: 3, rowSpan: 1 };
    case "bar_chart":  return { col: 0, row: 0, colSpan: 6, rowSpan: 2 };
    case "line_chart": return { col: 0, row: 0, colSpan: 6, rowSpan: 2 };
    case "pie_chart":  return { col: 0, row: 0, colSpan: 4, rowSpan: 2 };
    case "data_table": return { col: 0, row: 0, colSpan: 12, rowSpan: 3 };
  }
}
