import { useEffect, useState, useCallback } from "react";
import axios from "axios";
import {
  ArrowLeft, Save, Eye, Plus, Trash2, Loader2, AlertCircle,
  BarChart2, TrendingUp, PieChart, Table2, Layers, GripVertical,
} from "lucide-react";
import { nanoid } from "nanoid";
import type { SavedReport, ReportWidget, WidgetType } from "./types";
import { defaultConfig, defaultLayout } from "./types";
import type { DataRow, SavedPipeline, PipelineNode, PipelineEdge } from "../FlowBuilder/types";
import { executePipeline } from "../FlowBuilder/engine";
import { WidgetConfigPanel } from "./WidgetConfigPanel";
import { KpiCard } from "./widgets/KpiCard";
import { BarChartWidget } from "./widgets/BarChartWidget";
import { LineChartWidget } from "./widgets/LineChartWidget";
import { PieChartWidget } from "./widgets/PieChartWidget";
import { DataTableWidget } from "./widgets/DataTableWidget";
import type { KpiConfig, BarChartConfig, LineChartConfig, PieChartConfig, DataTableConfig } from "./types";

interface Props {
  reportId?: number;
  onBack: () => void;
  onViewReport: (id: number) => void;
}

const WIDGET_PALETTE: { type: WidgetType; label: string; icon: React.ReactNode; desc: string }[] = [
  { type: "kpi_card",   label: "KPI",          icon: <Layers className="w-5 h-5" />,    desc: "Valor único agregado" },
  { type: "bar_chart",  label: "Barras",        icon: <BarChart2 className="w-5 h-5" />, desc: "Comparación por categoría" },
  { type: "line_chart", label: "Líneas/Área",   icon: <TrendingUp className="w-5 h-5" />,desc: "Tendencias en el tiempo" },
  { type: "pie_chart",  label: "Torta/Donut",   icon: <PieChart className="w-5 h-5" />,  desc: "Distribución porcentual" },
  { type: "data_table", label: "Tabla",         icon: <Table2 className="w-5 h-5" />,    desc: "Datos tabulares" },
];

const GRID_COLS = 12;
const ROW_HEIGHT = 150;

type NodeResults = Record<string, DataRow[]>;

function WidgetPreview({ widget, results }: { widget: ReportWidget; results: NodeResults }) {
  const data = results[widget.nodeId] ?? [];
  switch (widget.type) {
    case "kpi_card":   return <KpiCard title={widget.title} config={widget.config as KpiConfig} data={data} />;
    case "bar_chart":  return <BarChartWidget title={widget.title} config={widget.config as BarChartConfig} data={data} />;
    case "line_chart": return <LineChartWidget title={widget.title} config={widget.config as LineChartConfig} data={data} />;
    case "pie_chart":  return <PieChartWidget title={widget.title} config={widget.config as PieChartConfig} data={data} />;
    case "data_table": return <DataTableWidget title={widget.title} config={widget.config as DataTableConfig} data={data} />;
  }
}

export function ReportBuilder({ reportId, onBack, onViewReport }: Props) {
  const [name, setName] = useState("Nuevo reporte");
  const [description, setDescription] = useState("");
  const [selectedPipelineId, setSelectedPipelineId] = useState<number | null>(null);
  const [widgets, setWidgets] = useState<ReportWidget[]>([]);
  const [selectedWidgetId, setSelectedWidgetId] = useState<string | null>(null);
  const [pipelines, setPipelines] = useState<SavedPipeline[]>([]);
  const [nodeResults, setNodeResults] = useState<NodeResults>({});
  const [nodeLabels, setNodeLabels] = useState<{ id: string; label: string; rowCount: number }[]>([]);
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<number | undefined>(reportId);

  useEffect(() => {
    axios.get<{ data: SavedPipeline[] }>("/api/pipelines").then(r => setPipelines(Array.isArray(r.data?.data) ? r.data.data : [])).catch(() => {});
    if (reportId) {
      axios.get<SavedReport>(`/api/reportes/${reportId}`).then(({ data }) => {
        setName(data.nombre);
        setDescription(data.descripcion ?? "");
        setSelectedPipelineId(data.pipelineId);
        setWidgets(data.config?.widgets ?? []);
      }).catch(() => setError("No se pudo cargar el reporte"));
    }
  }, [reportId]);

  const runPipeline = useCallback(async (pipelineId: number) => {
    setRunning(true);
    try {
      const { data: plResp } = await axios.get<{ data: SavedPipeline }>(`/api/pipelines/${pipelineId}`);
      const pl = plResp.data ?? plResp;
      const fd = pl.flowData as { nodes: PipelineNode[]; edges: PipelineEdge[] };
      const results = await executePipeline(fd.nodes, fd.edges);
      const mapped: NodeResults = {};
      const labels: { id: string; label: string; rowCount: number }[] = [];
      results.forEach((v, k) => {
        mapped[k] = v.data ?? [];
        const node = fd.nodes.find(n => n.id === k);
        const label = (node?.data?.label as string) || node?.type || k;
        labels.push({ id: k, label: `${label}`, rowCount: (v.data ?? []).length });
      });
      setNodeResults(mapped);
      setNodeLabels(labels);
    } catch (e) {
      setError("Error ejecutando pipeline: " + (e as Error).message);
    } finally {
      setRunning(false);
    }
  }, []);

  useEffect(() => {
    if (selectedPipelineId) runPipeline(selectedPipelineId);
    else { setNodeResults({}); setNodeLabels([]); }
  }, [selectedPipelineId, runPipeline]);

  const addWidget = (type: WidgetType) => {
    const w: ReportWidget = {
      id: nanoid(),
      type,
      title: WIDGET_PALETTE.find(p => p.type === type)?.label ?? type,
      nodeId: nodeLabels[0]?.id ?? "",
      config: defaultConfig(type),
      layout: defaultLayout(type),
    };
    setWidgets(prev => [...prev, w]);
    setSelectedWidgetId(w.id);
  };

  const updateWidget = (updated: ReportWidget) => {
    setWidgets(prev => prev.map(w => w.id === updated.id ? updated : w));
  };

  const removeWidget = (id: string) => {
    setWidgets(prev => prev.filter(w => w.id !== id));
    if (selectedWidgetId === id) setSelectedWidgetId(null);
  };

  const selectedWidget = widgets.find(w => w.id === selectedWidgetId) ?? null;
  const selectedNodeColumns = selectedWidget ? Object.keys((nodeResults[selectedWidget.nodeId] ?? [])[0] ?? {}) : [];

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const payload = {
        nombre: name,
        descripcion: description,
        pipelineId: selectedPipelineId,
        config: { widgets },
      };
      if (savedId) {
        await axios.put(`/api/reportes/${savedId}`, payload);
      } else {
        const { data } = await axios.post<SavedReport>("/api/reportes", payload);
        setSavedId(data.id);
      }
    } catch {
      setError("Error al guardar el reporte");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      {/* Top bar */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3 shadow-sm flex-shrink-0">
        <button onClick={onBack} className="text-gray-400 hover:text-gray-700"><ArrowLeft className="w-5 h-5" /></button>
        <div className="flex-1 flex items-center gap-3">
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            className="text-lg font-semibold text-gray-900 border-none outline-none bg-transparent"
          />
          <input
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Descripción..."
            className="text-sm text-gray-500 border-none outline-none bg-transparent flex-1"
          />
        </div>
        <div className="flex items-center gap-2">
          <select
            value={selectedPipelineId ?? ""}
            onChange={e => setSelectedPipelineId(e.target.value ? +e.target.value : null)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
          >
            <option value="">Sin pipeline</option>
            {pipelines.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
          </select>
          {running && <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />}
          <button onClick={save} disabled={saving}
            className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Guardar
          </button>
          {savedId && (
            <button onClick={() => onViewReport(savedId)} className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700">
              <Eye className="w-4 h-4" />
              Ver reporte
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="mx-4 mt-3 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-sm text-red-700 flex-shrink-0">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        {/* Left sidebar: widget palette */}
        <div className="w-56 bg-white border-r border-gray-200 flex flex-col flex-shrink-0 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Agregar widget</p>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {WIDGET_PALETTE.map(p => (
              <button
                key={p.type}
                onClick={() => addWidget(p.type)}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border border-gray-200 hover:bg-indigo-50 hover:border-indigo-300 transition-colors text-left"
              >
                <span className="text-indigo-500">{p.icon}</span>
                <div>
                  <p className="text-sm font-medium text-gray-800">{p.label}</p>
                  <p className="text-xs text-gray-400">{p.desc}</p>
                </div>
              </button>
            ))}
          </div>
          {/* Node results summary */}
          {nodeLabels.length > 0 && (
            <div className="border-t border-gray-100 p-3">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Nodos del pipeline</p>
              <div className="space-y-1">
                {nodeLabels.map(n => (
                  <div key={n.id} className="flex justify-between items-center text-xs text-gray-600">
                    <span className="truncate">{n.label}</span>
                    <span className="text-gray-400 ml-1 flex-shrink-0">{n.rowCount}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Center: report canvas */}
        <div className="flex-1 overflow-auto p-4">
          {!selectedPipelineId && (
            <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              Selecciona un pipeline para que los widgets tengan datos.
            </div>
          )}
          {widgets.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-300 gap-2">
              <Plus className="w-12 h-12" />
              <p className="text-lg">Agrega widgets desde el panel izquierdo</p>
            </div>
          ) : (
            <div
              className="grid gap-3"
              style={{ gridTemplateColumns: `repeat(${GRID_COLS}, minmax(0, 1fr))`, gridAutoRows: `${ROW_HEIGHT}px` }}
            >
              {widgets.map(widget => (
                <div
                  key={widget.id}
                  onClick={() => setSelectedWidgetId(widget.id)}
                  style={{
                    gridColumn: `span ${Math.min(widget.layout.colSpan, GRID_COLS)}`,
                    gridRow: `span ${widget.layout.rowSpan}`,
                  }}
                  className={`bg-white rounded-xl border-2 overflow-hidden flex flex-col cursor-pointer transition-all ${
                    selectedWidgetId === widget.id ? "border-indigo-500 shadow-md" : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  {/* Widget header */}
                  <div className="flex items-center justify-between px-3 py-1.5 border-b border-gray-100 bg-gray-50 flex-shrink-0">
                    <div className="flex items-center gap-1.5">
                      <GripVertical className="w-3 h-3 text-gray-300" />
                      <span className="text-xs font-medium text-gray-600 truncate">{widget.title}</span>
                    </div>
                    <button
                      onClick={e => { e.stopPropagation(); removeWidget(widget.id); }}
                      className="text-gray-300 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                  <div className="flex-1 p-2 min-h-0">
                    {running ? (
                      <div className="flex items-center justify-center h-full">
                        <Loader2 className="w-5 h-5 animate-spin text-indigo-300" />
                      </div>
                    ) : (
                      <WidgetPreview widget={widget} results={nodeResults} />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right panel: widget config */}
        {selectedWidget && (
          <WidgetConfigPanel
            widget={selectedWidget}
            availableColumns={selectedNodeColumns}
            nodeOptions={nodeLabels}
            onChange={updateWidget}
            onClose={() => setSelectedWidgetId(null)}
          />
        )}
      </div>
    </div>
  );
}
