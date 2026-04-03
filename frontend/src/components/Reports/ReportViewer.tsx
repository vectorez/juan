import { useEffect, useState, useCallback } from "react";
import axios from "axios";
import { ArrowLeft, RefreshCw, Loader2, AlertCircle } from "lucide-react";
import type { SavedReport, ReportWidget } from "./types";
import type { DataRow, SavedPipeline, PipelineNode, PipelineEdge } from "../FlowBuilder/types";
import { executePipeline } from "../FlowBuilder/engine";
import { KpiCard } from "./widgets/KpiCard";
import { BarChartWidget } from "./widgets/BarChartWidget";
import { LineChartWidget } from "./widgets/LineChartWidget";
import { PieChartWidget } from "./widgets/PieChartWidget";
import { DataTableWidget } from "./widgets/DataTableWidget";
import type { KpiConfig, BarChartConfig, LineChartConfig, PieChartConfig, DataTableConfig } from "./types";

interface Props {
  reportId: number;
  onBack: () => void;
}

type NodeResults = Record<string, DataRow[]>;

const GRID_COLS = 12;
const ROW_HEIGHT = 160;

function WidgetRenderer({ widget, results }: { widget: ReportWidget; results: NodeResults }) {
  const data = results[widget.nodeId] ?? [];
  switch (widget.type) {
    case "kpi_card":   return <KpiCard title={widget.title} config={widget.config as KpiConfig} data={data} />;
    case "bar_chart":  return <BarChartWidget title={widget.title} config={widget.config as BarChartConfig} data={data} />;
    case "line_chart": return <LineChartWidget title={widget.title} config={widget.config as LineChartConfig} data={data} />;
    case "pie_chart":  return <PieChartWidget title={widget.title} config={widget.config as PieChartConfig} data={data} />;
    case "data_table": return <DataTableWidget title={widget.title} config={widget.config as DataTableConfig} data={data} />;
  }
}

export function ReportViewer({ reportId, onBack }: Props) {
  const [report, setReport] = useState<SavedReport | null>(null);
  const [results, setResults] = useState<NodeResults>({});
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastRun, setLastRun] = useState<Date | null>(null);

  const runPipeline = useCallback(async (r: SavedReport) => {
    if (!r.pipelineId) { setResults({}); return; }
    setRunning(true);
    try {
      const { data: plResp } = await axios.get<{ data: SavedPipeline }>(`/api/pipelines/${r.pipelineId}`);
      const pl = plResp.data ?? plResp;
      const fd = pl.flowData as { nodes: PipelineNode[]; edges: PipelineEdge[] };
      const nodeResults = await executePipeline(fd.nodes, fd.edges);
      const mapped: NodeResults = {};
      nodeResults.forEach((v, k) => { mapped[k] = v.data ?? []; });
      setResults(mapped);
      setLastRun(new Date());
    } catch (e) {
      setError("Error al ejecutar el pipeline: " + (e as Error).message);
    } finally {
      setRunning(false);
    }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await axios.get<SavedReport>(`/api/reportes/${reportId}`);
        setReport(data);
        await runPipeline(data);
      } catch {
        setError("No se pudo cargar el reporte");
      } finally {
        setLoading(false);
      }
    })();
  }, [reportId, runPipeline]);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
    </div>
  );

  if (error && !report) return (
    <div className="flex flex-col items-center justify-center h-64 gap-3 text-red-500">
      <AlertCircle className="w-8 h-8" />
      <p>{error}</p>
      <button onClick={onBack} className="text-sm text-indigo-600 hover:underline">Volver</button>
    </div>
  );

  const widgets = report?.config?.widgets ?? [];

  return (
    <div className="flex flex-col h-full min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="text-gray-400 hover:text-gray-700">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">{report?.nombre}</h2>
            {report?.descripcion && <p className="text-xs text-gray-500">{report.descripcion}</p>}
          </div>
        </div>
        <div className="flex items-center gap-3">
          {lastRun && <span className="text-xs text-gray-400">Actualizado {lastRun.toLocaleTimeString("es-CO")}</span>}
          <button
            onClick={() => report && runPipeline(report)}
            disabled={running}
            className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
          >
            {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            Actualizar
          </button>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-sm text-red-700">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Grid canvas */}
      <div className="flex-1 p-6">
        {widgets.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-400 gap-2">
            <p className="text-lg">Este reporte no tiene widgets</p>
            <p className="text-sm">Edita el reporte para agregar visualizaciones</p>
          </div>
        ) : (
          <div
            className="grid gap-4"
            style={{
              gridTemplateColumns: `repeat(${GRID_COLS}, minmax(0, 1fr))`,
              gridAutoRows: `${ROW_HEIGHT}px`,
            }}
          >
            {widgets.map(widget => (
              <div
                key={widget.id}
                className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col"
                style={{
                  gridColumn: `span ${Math.min(widget.layout.colSpan, GRID_COLS)}`,
                  gridRow: `span ${widget.layout.rowSpan}`,
                }}
              >
                {widget.type !== "kpi_card" && (
                  <div className="px-4 py-2 border-b border-gray-100 flex-shrink-0">
                    <h3 className="text-sm font-semibold text-gray-700">{widget.title}</h3>
                  </div>
                )}
                <div className="flex-1 p-3 min-h-0">
                  {running ? (
                    <div className="flex items-center justify-center h-full">
                      <Loader2 className="w-5 h-5 animate-spin text-indigo-400" />
                    </div>
                  ) : (
                    <WidgetRenderer widget={widget} results={results} />
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
