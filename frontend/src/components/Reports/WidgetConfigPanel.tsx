import type { ReportWidget, KpiConfig, BarChartConfig, LineChartConfig, PieChartConfig, DataTableConfig } from "./types";
import { KPI_COLOR_MAP } from "./types";
import { X } from "lucide-react";

interface Props {
  widget: ReportWidget;
  availableColumns: string[];
  nodeOptions: { id: string; label: string; rowCount: number }[];
  onChange: (updated: ReportWidget) => void;
  onClose: () => void;
}

function ColumnSelect({ label, value, columns, onChange }: { label: string; value: string; columns: string[]; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      <select value={value} onChange={e => onChange(e.target.value)} className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm">
        <option value="">— seleccionar —</option>
        {columns.map(c => <option key={c} value={c}>{c}</option>)}
      </select>
    </div>
  );
}

function MultiColumnSelect({ label, value, columns, onChange }: { label: string; value: string[]; columns: string[]; onChange: (v: string[]) => void }) {
  const toggle = (col: string) => {
    onChange(value.includes(col) ? value.filter(c => c !== col) : [...value, col]);
  };
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      <div className="border border-gray-200 rounded p-2 max-h-32 overflow-y-auto space-y-1">
        {columns.length === 0 && <p className="text-xs text-gray-400">Sin columnas disponibles</p>}
        {columns.map(col => (
          <label key={col} className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={value.includes(col)} onChange={() => toggle(col)} className="rounded" />
            <span className="text-xs">{col}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

export function WidgetConfigPanel({ widget, availableColumns, nodeOptions, onChange, onClose }: Props) {
  const updateConfig = (patch: Partial<typeof widget.config>) => {
    onChange({ ...widget, config: { ...widget.config, ...patch } });
  };

  const kpi = widget.config as KpiConfig;
  const bar = widget.config as BarChartConfig;
  const line = widget.config as LineChartConfig;
  const pie = widget.config as PieChartConfig;
  const table = widget.config as DataTableConfig;

  return (
    <div className="bg-white border-l border-gray-200 w-72 flex-shrink-0 flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50">
        <h3 className="text-sm font-semibold text-gray-800">Configurar widget</h3>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">

        {/* Common: title */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Título del widget</label>
          <input
            type="text"
            value={widget.title}
            onChange={e => onChange({ ...widget, title: e.target.value })}
            className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm"
          />
        </div>

        {/* Common: source node */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Nodo fuente</label>
          <select
            value={widget.nodeId}
            onChange={e => onChange({ ...widget, nodeId: e.target.value })}
            className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm"
          >
            <option value="">— seleccionar nodo —</option>
            {nodeOptions.map(n => (
              <option key={n.id} value={n.id}>{n.label} ({n.rowCount} filas)</option>
            ))}
          </select>
        </div>

        {/* Layout */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Columnas (1-12)</label>
            <input type="number" min={1} max={12} value={widget.layout.colSpan}
              onChange={e => onChange({ ...widget, layout: { ...widget.layout, colSpan: +e.target.value } })}
              className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Filas altas</label>
            <input type="number" min={1} max={6} value={widget.layout.rowSpan}
              onChange={e => onChange({ ...widget, layout: { ...widget.layout, rowSpan: +e.target.value } })}
              className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm" />
          </div>
        </div>

        <hr className="border-gray-100" />

        {/* KPI config */}
        {widget.type === "kpi_card" && (
          <>
            <ColumnSelect label="Columna a agregar" value={kpi.column} columns={availableColumns} onChange={v => updateConfig({ column: v })} />
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Operación</label>
              <select value={kpi.aggregation} onChange={e => updateConfig({ aggregation: e.target.value as KpiConfig["aggregation"] })}
                className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm">
                {["sum", "count", "avg", "min", "max", "last"].map(o => <option key={o} value={o}>{o.toUpperCase()}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Prefijo</label>
                <input type="text" value={kpi.prefix ?? ""} onChange={e => updateConfig({ prefix: e.target.value })}
                  className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm" placeholder="$" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Sufijo</label>
                <input type="text" value={kpi.suffix ?? ""} onChange={e => updateConfig({ suffix: e.target.value })}
                  className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm" placeholder="COP" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Decimales</label>
              <input type="number" min={0} max={6} value={kpi.decimals ?? 0}
                onChange={e => updateConfig({ decimals: +e.target.value })}
                className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-2">Color</label>
              <div className="flex flex-wrap gap-2">
                {(Object.keys(KPI_COLOR_MAP) as (keyof typeof KPI_COLOR_MAP)[]).map(c => (
                  <button key={c} onClick={() => updateConfig({ color: c })}
                    className={`w-7 h-7 rounded-full ${KPI_COLOR_MAP[c].badge} ${kpi.color === c ? "ring-2 ring-offset-1 ring-gray-400" : ""}`}
                    title={c} />
                ))}
              </div>
            </div>
          </>
        )}

        {/* Bar chart config */}
        {widget.type === "bar_chart" && (
          <>
            <ColumnSelect label="Eje X (categoría)" value={bar.xColumn} columns={availableColumns} onChange={v => updateConfig({ xColumn: v })} />
            <MultiColumnSelect label="Eje Y (valores)" value={bar.yColumns ?? []} columns={availableColumns} onChange={v => updateConfig({ yColumns: v })} />
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={bar.stacked ?? false} onChange={e => updateConfig({ stacked: e.target.checked })} />
              <span className="text-sm text-gray-700">Apilado</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={bar.horizontal ?? false} onChange={e => updateConfig({ horizontal: e.target.checked })} />
              <span className="text-sm text-gray-700">Horizontal</span>
            </label>
          </>
        )}

        {/* Line chart config */}
        {widget.type === "line_chart" && (
          <>
            <ColumnSelect label="Eje X (categoría)" value={line.xColumn} columns={availableColumns} onChange={v => updateConfig({ xColumn: v })} />
            <MultiColumnSelect label="Series (valores Y)" value={line.yColumns ?? []} columns={availableColumns} onChange={v => updateConfig({ yColumns: v })} />
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={line.area ?? false} onChange={e => updateConfig({ area: e.target.checked })} />
              <span className="text-sm text-gray-700">Área rellena</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={line.smooth ?? true} onChange={e => updateConfig({ smooth: e.target.checked })} />
              <span className="text-sm text-gray-700">Línea suavizada</span>
            </label>
          </>
        )}

        {/* Pie chart config */}
        {widget.type === "pie_chart" && (
          <>
            <ColumnSelect label="Columna de nombres" value={pie.nameColumn} columns={availableColumns} onChange={v => updateConfig({ nameColumn: v })} />
            <ColumnSelect label="Columna de valores" value={pie.valueColumn} columns={availableColumns} onChange={v => updateConfig({ valueColumn: v })} />
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={pie.donut ?? false} onChange={e => updateConfig({ donut: e.target.checked })} />
              <span className="text-sm text-gray-700">Donut</span>
            </label>
          </>
        )}

        {/* Data table config */}
        {widget.type === "data_table" && (
          <>
            <MultiColumnSelect label="Columnas a mostrar (vacío = todas)" value={table.columns ?? []} columns={availableColumns} onChange={v => updateConfig({ columns: v })} />
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Máximo de filas</label>
              <input type="number" min={5} max={500} value={table.limit ?? 50}
                onChange={e => updateConfig({ limit: +e.target.value })}
                className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm" />
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={table.striped ?? true} onChange={e => updateConfig({ striped: e.target.checked })} />
              <span className="text-sm text-gray-700">Filas alternadas</span>
            </label>
          </>
        )}
      </div>
    </div>
  );
}
