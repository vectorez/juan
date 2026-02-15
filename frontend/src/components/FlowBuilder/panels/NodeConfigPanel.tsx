import { useState, useEffect } from "react";
import { X, Plus, Trash2 } from "lucide-react";
import type {
  PipelineNode,
  PipelineEdge,
  MunicipioOption,
  SourceNodeData,
  FilterNodeData,
  FilterCondition,
  AggregateNodeData,
  TransformNodeData,
  ConditionalNodeData,
  OutputNodeData,
} from "../types";

interface Props {
  node: PipelineNode;
  nodes: PipelineNode[];
  edges: PipelineEdge[];
  municipios: MunicipioOption[];
  onUpdate: (nodeId: string, data: Record<string, unknown>) => void;
  onClose: () => void;
}

const OPERATORS = [
  { value: "=", label: "Igual (=)" },
  { value: "!=", label: "Diferente (!=)" },
  { value: ">", label: "Mayor (>)" },
  { value: "<", label: "Menor (<)" },
  { value: ">=", label: "Mayor o igual (>=)" },
  { value: "<=", label: "Menor o igual (<=)" },
  { value: "contains", label: "Contiene" },
  { value: "startsWith", label: "Empieza con" },
];

function sanitizeColumnName(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9_]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "")
    .substring(0, 63) || "col";
}

function findSourceNode(
  currentNodeId: string,
  nodes: PipelineNode[],
  edges: PipelineEdge[]
): PipelineNode | null {
  // Rastrear hacia atrás hasta encontrar un nodo Source
  const visited = new Set<string>();
  const queue = [currentNodeId];
  
  while (queue.length > 0) {
    const nodeId = queue.shift()!;
    if (visited.has(nodeId)) continue;
    visited.add(nodeId);
    
    const node = nodes.find((n) => n.id === nodeId);
    if (!node) continue;
    if (node.type === "source") return node;
    
    // Buscar nodos que conectan a este
    const incomingEdges = edges.filter((e) => e.target === nodeId);
    for (const edge of incomingEdges) {
      queue.push(edge.source);
    }
  }
  
  return null;
}

function getColumnsForNode(
  node: PipelineNode,
  nodes: PipelineNode[],
  edges: PipelineEdge[],
  municipios: MunicipioOption[]
): string[] {
  // Para source, retornar columnas del municipio seleccionado
  if (node.type === "source") {
    const d = node.data as SourceNodeData;
    const mun = municipios.find((m) => m.slug === d.municipioSlug);
    if (!mun) return [];
    const headers =
      d.tableType === "facturacion"
        ? mun.encabezadosFacturacion
        : mun.encabezadosRecaudos;
    return headers?.map((h) => sanitizeColumnName(h)) || [];
  }
  
  // Para otros nodos, buscar el nodo Source conectado
  const sourceNode = findSourceNode(node.id, nodes, edges);
  if (sourceNode) {
    const d = sourceNode.data as SourceNodeData;
    const mun = municipios.find((m) => m.slug === d.municipioSlug);
    if (!mun) return [];
    const headers =
      d.tableType === "facturacion"
        ? mun.encabezadosFacturacion
        : mun.encabezadosRecaudos;
    return headers?.map((h) => sanitizeColumnName(h)) || [];
  }
  
  // Fallback: columnas genéricas
  return Array.from({ length: 30 }, (_, i) => `col_${i + 1}`);
}

export function NodeConfigPanel({ node, nodes, edges, municipios, onUpdate, onClose }: Props) {
  const [localData, setLocalData] = useState<Record<string, unknown>>(
    { ...node.data } as Record<string, unknown>
  );

  useEffect(() => {
    setLocalData({ ...node.data } as Record<string, unknown>);
  }, [node.id, node.data]);

  const update = (key: string, value: unknown) => {
    const updated = { ...localData, [key]: value };
    setLocalData(updated);
    onUpdate(node.id, updated);
  };

  const columns = getColumnsForNode(node, nodes, edges, municipios);

  const renderSourceConfig = () => {
    const d = localData as unknown as SourceNodeData;
    return (
      <>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Etiqueta</label>
          <input
            className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm"
            value={d.label || ""}
            onChange={(e) => update("label", e.target.value)}
            placeholder="Nombre del nodo"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Municipio</label>
          <select
            className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm"
            value={d.municipioSlug || ""}
            onChange={(e) => update("municipioSlug", e.target.value)}
          >
            <option value="">— Selecciona —</option>
            {municipios.map((m) => (
              <option key={m.slug} value={m.slug}>
                {m.nombre}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Tipo de tabla</label>
          <select
            className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm"
            value={d.tableType || "facturacion"}
            onChange={(e) => update("tableType", e.target.value)}
          >
            <option value="facturacion">Facturación</option>
            <option value="recaudos">Recaudos</option>
          </select>
        </div>
      </>
    );
  };

  const renderFilterConfig = () => {
    const d = localData as unknown as FilterNodeData;
    const conditions: FilterCondition[] = d.conditions || [];

    const updateCondition = (idx: number, field: keyof FilterCondition, value: string) => {
      const updated = [...conditions];
      updated[idx] = { ...updated[idx], [field]: value };
      update("conditions", updated);
    };

    const addCondition = () => {
      update("conditions", [...conditions, { column: "", operator: "=", value: "" }]);
    };

    const removeCondition = (idx: number) => {
      update("conditions", conditions.filter((_, i) => i !== idx));
    };

    return (
      <>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Etiqueta</label>
          <input
            className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm"
            value={d.label || ""}
            onChange={(e) => update("label", e.target.value)}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Lógica</label>
          <select
            className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm"
            value={d.logic || "AND"}
            onChange={(e) => update("logic", e.target.value)}
          >
            <option value="AND">AND (todas)</option>
            <option value="OR">OR (alguna)</option>
          </select>
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-gray-600">Condiciones</label>
            <button
              onClick={addCondition}
              className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800"
            >
              <Plus className="w-3 h-3" /> Agregar
            </button>
          </div>
          {conditions.map((cond, idx) => (
            <div key={idx} className="flex gap-1 items-center">
              <select
                className="flex-1 rounded border border-gray-300 px-1 py-1 text-xs"
                value={cond.column}
                onChange={(e) => updateCondition(idx, "column", e.target.value)}
              >
                <option value="">Col...</option>
                {columns.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <select
                className="w-16 rounded border border-gray-300 px-1 py-1 text-xs"
                value={cond.operator}
                onChange={(e) => updateCondition(idx, "operator", e.target.value)}
              >
                {OPERATORS.map((op) => (
                  <option key={op.value} value={op.value}>{op.value}</option>
                ))}
              </select>
              <input
                className="flex-1 rounded border border-gray-300 px-1 py-1 text-xs"
                value={cond.value}
                onChange={(e) => updateCondition(idx, "value", e.target.value)}
                placeholder="Valor"
              />
              <button onClick={() => removeCondition(idx)} className="text-red-400 hover:text-red-600">
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      </>
    );
  };

  const renderAggregateConfig = () => {
    const d = localData as unknown as AggregateNodeData;
    return (
      <>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Etiqueta</label>
          <input
            className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm"
            value={d.label || ""}
            onChange={(e) => update("label", e.target.value)}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Operación</label>
          <select
            className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm"
            value={d.operation || "sum"}
            onChange={(e) => update("operation", e.target.value)}
          >
            <option value="sum">Suma</option>
            <option value="avg">Promedio</option>
            <option value="count">Contar</option>
            <option value="min">Mínimo</option>
            <option value="max">Máximo</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Columna</label>
          <select
            className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm"
            value={d.column || ""}
            onChange={(e) => update("column", e.target.value)}
          >
            <option value="">— Selecciona —</option>
            {columns.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Agrupar por (opcional)</label>
          <select
            className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm"
            value={d.groupBy || ""}
            onChange={(e) => update("groupBy", e.target.value)}
          >
            <option value="">Sin agrupación</option>
            {columns.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      </>
    );
  };

  const renderTransformConfig = () => {
    const d = localData as unknown as TransformNodeData;
    return (
      <>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Etiqueta</label>
          <input
            className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm"
            value={d.label || ""}
            onChange={(e) => update("label", e.target.value)}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Transformación</label>
          <select
            className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm"
            value={d.transformType || "parseNumber"}
            onChange={(e) => update("transformType", e.target.value)}
          >
            <option value="parseNumber">Convertir a número</option>
            <option value="toUpperCase">MAYÚSCULAS</option>
            <option value="toLowerCase">minúsculas</option>
            <option value="trim">Limpiar espacios</option>
            <option value="concat">Concatenar</option>
            <option value="substring">Subcadena</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Columna</label>
          <select
            className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm"
            value={d.column || ""}
            onChange={(e) => update("column", e.target.value)}
          >
            <option value="">— Selecciona —</option>
            {columns.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        {(d.transformType === "concat" || d.transformType === "substring") && (
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              {d.transformType === "concat" ? "Texto a agregar" : "Rango (inicio,fin)"}
            </label>
            <input
              className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm"
              value={d.params || ""}
              onChange={(e) => update("params", e.target.value)}
              placeholder={d.transformType === "concat" ? "texto" : "0,10"}
            />
          </div>
        )}
      </>
    );
  };

  const renderConditionalConfig = () => {
    const d = localData as unknown as ConditionalNodeData;
    const cond = d.condition || { column: "", operator: "=", value: "" };

    const updateCond = (field: string, value: string) => {
      update("condition", { ...cond, [field]: value });
    };

    return (
      <>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Etiqueta</label>
          <input
            className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm"
            value={d.label || ""}
            onChange={(e) => update("label", e.target.value)}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Columna</label>
          <select
            className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm"
            value={cond.column || ""}
            onChange={(e) => updateCond("column", e.target.value)}
          >
            <option value="">— Selecciona —</option>
            {columns.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Operador</label>
          <select
            className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm"
            value={cond.operator || "="}
            onChange={(e) => updateCond("operator", e.target.value)}
          >
            {OPERATORS.map((op) => (
              <option key={op.value} value={op.value}>{op.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Valor</label>
          <input
            className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm"
            value={cond.value || ""}
            onChange={(e) => updateCond("value", e.target.value)}
          />
        </div>
      </>
    );
  };

  const renderOutputConfig = () => {
    const d = localData as unknown as OutputNodeData;
    return (
      <>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Etiqueta</label>
          <input
            className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm"
            value={d.label || ""}
            onChange={(e) => update("label", e.target.value)}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Formato</label>
          <select
            className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm"
            value={d.format || "table"}
            onChange={(e) => update("format", e.target.value)}
          >
            <option value="table">Tabla</option>
            <option value="json">JSON</option>
            <option value="count">Solo conteo</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Límite de filas</label>
          <input
            type="number"
            className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm"
            value={d.limit || 100}
            onChange={(e) => update("limit", Number(e.target.value))}
            min={1}
            max={10000}
          />
        </div>
      </>
    );
  };

  const TITLES: Record<string, string> = {
    source: "Fuente de Datos",
    filter: "Filtro",
    aggregate: "Agregación",
    transform: "Transformación",
    conditional: "Condicional",
    output: "Salida",
  };

  return (
    <div className="bg-white border-l border-gray-200 w-72 flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
        <h3 className="text-sm font-bold text-gray-900">
          {TITLES[node.type || ""] || "Configuración"}
        </h3>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {node.type === "source" && renderSourceConfig()}
        {node.type === "filter" && renderFilterConfig()}
        {node.type === "aggregate" && renderAggregateConfig()}
        {node.type === "transform" && renderTransformConfig()}
        {node.type === "conditional" && renderConditionalConfig()}
        {node.type === "output" && renderOutputConfig()}
      </div>
    </div>
  );
}
