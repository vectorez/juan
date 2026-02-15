import type { Node, Edge } from "@xyflow/react";

// ─── Tipos de nodos ───
export type FlowNodeType =
  | "source"
  | "filter"
  | "aggregate"
  | "transform"
  | "conditional"
  | "output";

// ─── Datos de cada nodo ───
export interface SourceNodeData {
  label: string;
  municipioSlug: string;
  tableType: "facturacion" | "recaudos";
  [key: string]: unknown;
}

export interface FilterCondition {
  column: string;
  operator: "=" | "!=" | ">" | "<" | ">=" | "<=" | "contains" | "startsWith";
  value: string;
}

export interface FilterNodeData {
  label: string;
  conditions: FilterCondition[];
  logic: "AND" | "OR";
  [key: string]: unknown;
}

export interface AggregateNodeData {
  label: string;
  operation: "sum" | "avg" | "count" | "min" | "max";
  column: string;
  groupBy: string;
  [key: string]: unknown;
}

export interface TransformNodeData {
  label: string;
  transformType: "parseNumber" | "toUpperCase" | "toLowerCase" | "trim" | "concat" | "substring";
  column: string;
  params: string;
  [key: string]: unknown;
}

export interface ConditionalNodeData {
  label: string;
  condition: FilterCondition;
  [key: string]: unknown;
}

export interface OutputNodeData {
  label: string;
  format: "table" | "json" | "count";
  limit: number;
  [key: string]: unknown;
}

export type PipelineNodeData =
  | SourceNodeData
  | FilterNodeData
  | AggregateNodeData
  | TransformNodeData
  | ConditionalNodeData
  | OutputNodeData;

export type PipelineNode = Node<PipelineNodeData, FlowNodeType>;
export type PipelineEdge = Edge;

// ─── Resultados de ejecución ───
export type DataRow = Record<string, unknown>;

export interface NodeResult {
  nodeId: string;
  data: DataRow[];
  error?: string;
  executedAt: number;
}

export interface PipelineExecution {
  results: Map<string, NodeResult>;
  status: "idle" | "running" | "completed" | "error";
  error?: string;
}

// ─── Municipio (para selector) ───
export interface MunicipioOption {
  slug: string;
  nombre: string;
  columnasFacturacion: number;
  columnasRecaudos: number;
  encabezadosFacturacion: string[];
  encabezadosRecaudos: string[];
}

// ─── Pipeline guardado ───
export interface SavedPipeline {
  id: number;
  nombre: string;
  descripcion: string;
  flowData: {
    nodes: PipelineNode[];
    edges: PipelineEdge[];
  };
  createdAt: string;
  updatedAt: string;
}
