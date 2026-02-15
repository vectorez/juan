import type {
  PipelineNode,
  PipelineEdge,
  DataRow,
  NodeResult,
  SourceNodeData,
  FilterNodeData,
  AggregateNodeData,
  TransformNodeData,
  ConditionalNodeData,
  OutputNodeData,
} from "./types";
import axios from "axios";

// ─── Ordenamiento topológico ───
function topologicalSort(nodes: PipelineNode[], edges: PipelineEdge[]): string[] {
  const inDegree = new Map<string, number>();
  const adj = new Map<string, string[]>();

  for (const n of nodes) {
    inDegree.set(n.id, 0);
    adj.set(n.id, []);
  }
  for (const e of edges) {
    adj.get(e.source)?.push(e.target);
    inDegree.set(e.target, (inDegree.get(e.target) || 0) + 1);
  }

  const queue: string[] = [];
  for (const [id, deg] of inDegree) {
    if (deg === 0) queue.push(id);
  }

  const order: string[] = [];
  while (queue.length > 0) {
    const curr = queue.shift()!;
    order.push(curr);
    for (const next of adj.get(curr) || []) {
      const newDeg = (inDegree.get(next) || 1) - 1;
      inDegree.set(next, newDeg);
      if (newDeg === 0) queue.push(next);
    }
  }

  return order;
}

// ─── Ejecutores por tipo de nodo ───
async function executeSource(data: SourceNodeData): Promise<DataRow[]> {
  if (!data.municipioSlug || !data.tableType) {
    throw new Error("Fuente no configurada: falta municipio o tipo de tabla");
  }
  const res = await axios.get(`/api/data/${data.municipioSlug}/${data.tableType}`, {
    params: { limit: 10000, offset: 0 },
  });
  return res.data.data || [];
}

function executeFilter(input: DataRow[], data: FilterNodeData): DataRow[] {
  if (!data.conditions || data.conditions.length === 0) return input;

  return input.filter((row) => {
    const results = data.conditions.map((cond) => {
      const val = String(row[cond.column] ?? "");
      const cmpVal = cond.value;
      const numVal = parseFloat(val);
      const numCmp = parseFloat(cmpVal);

      switch (cond.operator) {
        case "=": return val === cmpVal;
        case "!=": return val !== cmpVal;
        case ">": return !isNaN(numVal) && !isNaN(numCmp) && numVal > numCmp;
        case "<": return !isNaN(numVal) && !isNaN(numCmp) && numVal < numCmp;
        case ">=": return !isNaN(numVal) && !isNaN(numCmp) && numVal >= numCmp;
        case "<=": return !isNaN(numVal) && !isNaN(numCmp) && numVal <= numCmp;
        case "contains": return val.toLowerCase().includes(cmpVal.toLowerCase());
        case "startsWith": return val.toLowerCase().startsWith(cmpVal.toLowerCase());
        default: return true;
      }
    });

    return data.logic === "OR" ? results.some(Boolean) : results.every(Boolean);
  });
}

function executeAggregate(input: DataRow[], data: AggregateNodeData): DataRow[] {
  if (!data.column || !data.operation) return input;

  const groups = new Map<string, DataRow[]>();

  if (data.groupBy) {
    for (const row of input) {
      const key = String(row[data.groupBy] ?? "null");
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(row);
    }
  } else {
    groups.set("_all", input);
  }

  const results: DataRow[] = [];
  for (const [groupKey, rows] of groups) {
    const values = rows.map((r) => parseFloat(String(r[data.column] ?? "0"))).filter((v) => !isNaN(v));

    let result: number;
    switch (data.operation) {
      case "sum": result = values.reduce((a, b) => a + b, 0); break;
      case "avg": result = values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0; break;
      case "count": result = rows.length; break;
      case "min": result = values.length > 0 ? Math.min(...values) : 0; break;
      case "max": result = values.length > 0 ? Math.max(...values) : 0; break;
      default: result = 0;
    }

    const row: DataRow = {
      grupo: data.groupBy ? groupKey : "Total",
      operacion: data.operation,
      columna: data.column,
      resultado: result,
    };
    results.push(row);
  }

  return results;
}

function executeTransform(input: DataRow[], data: TransformNodeData): DataRow[] {
  if (!data.column || !data.transformType) return input;

  return input.map((row) => {
    const newRow = { ...row };
    const val = String(newRow[data.column] ?? "");

    switch (data.transformType) {
      case "parseNumber":
        newRow[data.column] = parseFloat(val) || 0;
        break;
      case "toUpperCase":
        newRow[data.column] = val.toUpperCase();
        break;
      case "toLowerCase":
        newRow[data.column] = val.toLowerCase();
        break;
      case "trim":
        newRow[data.column] = val.trim();
        break;
      case "concat":
        newRow[data.column] = val + (data.params || "");
        break;
      case "substring":
        const [start, end] = (data.params || "0,10").split(",").map(Number);
        newRow[data.column] = val.substring(start || 0, end || val.length);
        break;
    }
    return newRow;
  });
}

function executeConditional(
  input: DataRow[],
  data: ConditionalNodeData
): { trueRows: DataRow[]; falseRows: DataRow[] } {
  if (!data.condition?.column) {
    return { trueRows: input, falseRows: [] };
  }

  const trueRows: DataRow[] = [];
  const falseRows: DataRow[] = [];

  for (const row of input) {
    const val = String(row[data.condition.column] ?? "");
    const cmpVal = data.condition.value;
    const numVal = parseFloat(val);
    const numCmp = parseFloat(cmpVal);

    let passes = false;
    switch (data.condition.operator) {
      case "=": passes = val === cmpVal; break;
      case "!=": passes = val !== cmpVal; break;
      case ">": passes = !isNaN(numVal) && !isNaN(numCmp) && numVal > numCmp; break;
      case "<": passes = !isNaN(numVal) && !isNaN(numCmp) && numVal < numCmp; break;
      case ">=": passes = !isNaN(numVal) && !isNaN(numCmp) && numVal >= numCmp; break;
      case "<=": passes = !isNaN(numVal) && !isNaN(numCmp) && numVal <= numCmp; break;
      case "contains": passes = val.toLowerCase().includes(cmpVal.toLowerCase()); break;
      case "startsWith": passes = val.toLowerCase().startsWith(cmpVal.toLowerCase()); break;
    }

    if (passes) trueRows.push(row);
    else falseRows.push(row);
  }

  return { trueRows, falseRows };
}

function executeOutput(input: DataRow[], data: OutputNodeData): DataRow[] {
  const limit = data.limit > 0 ? data.limit : 100;
  return input.slice(0, limit);
}

// ─── Ejecutor principal ───
export async function executePipeline(
  nodes: PipelineNode[],
  edges: PipelineEdge[],
  onNodeStart?: (nodeId: string) => void,
  onNodeDone?: (nodeId: string, result: NodeResult) => void,
): Promise<Map<string, NodeResult>> {
  const results = new Map<string, NodeResult>();
  const order = topologicalSort(nodes, edges);
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));

  for (const nodeId of order) {
    const node = nodeMap.get(nodeId);
    if (!node) continue;

    onNodeStart?.(nodeId);

    try {
      let output: DataRow[] = [];
      const nodeType = node.type as string;
      const nodeData = node.data as Record<string, unknown>;

      // Obtener datos de entrada (de nodos conectados)
      const incomingEdges = edges.filter((e) => e.target === nodeId);
      let inputData: DataRow[] = [];

      for (const edge of incomingEdges) {
        const sourceResult = results.get(edge.source);
        if (sourceResult?.data) {
          // Para condicionales, filtrar por handle de salida
          const sourceNode = nodeMap.get(edge.source);
          if (sourceNode?.type === "conditional" && edge.sourceHandle) {
            const condResult = results.get(edge.source);
            if (condResult) {
              const condData = condResult.data;
              // Los datos ya están separados en la ejecución del condicional
              inputData = inputData.concat(condData);
            }
          } else {
            inputData = inputData.concat(sourceResult.data);
          }
        }
      }

      switch (nodeType) {
        case "source":
          output = await executeSource(nodeData as SourceNodeData);
          break;
        case "filter":
          output = executeFilter(inputData, nodeData as FilterNodeData);
          break;
        case "aggregate":
          output = executeAggregate(inputData, nodeData as AggregateNodeData);
          break;
        case "transform":
          output = executeTransform(inputData, nodeData as TransformNodeData);
          break;
        case "conditional": {
          const condData = nodeData as ConditionalNodeData;
          const { trueRows, falseRows } = executeConditional(inputData, condData);

          // Guardar resultado del nodo condicional
          // Los edges de salida con sourceHandle "true" o "false" determinan a dónde van
          const trueEdges = edges.filter((e) => e.source === nodeId && e.sourceHandle === "true");
          const falseEdges = edges.filter((e) => e.source === nodeId && e.sourceHandle === "false");

          // Guardar resultados separados para cada handle
          for (const te of trueEdges) {
            results.set(`${nodeId}__true__${te.target}`, {
              nodeId: `${nodeId}__true`,
              data: trueRows,
              executedAt: Date.now(),
            });
          }
          for (const fe of falseEdges) {
            results.set(`${nodeId}__false__${fe.target}`, {
              nodeId: `${nodeId}__false`,
              data: falseRows,
              executedAt: Date.now(),
            });
          }

          output = [...trueRows, ...falseRows];
          break;
        }
        case "output":
          output = executeOutput(inputData, nodeData as OutputNodeData);
          break;
        default:
          output = inputData;
      }

      // Para nodos que reciben de condicionales, combinar datos correctamente
      if (nodeType !== "source" && nodeType !== "conditional") {
        const condInputs: DataRow[] = [];
        for (const edge of incomingEdges) {
          const sourceNode = nodeMap.get(edge.source);
          if (sourceNode?.type === "conditional") {
            const handleKey = `${edge.source}__${edge.sourceHandle}__${nodeId}`;
            const condResult = results.get(handleKey);
            if (condResult) {
              condInputs.push(...condResult.data);
            }
          }
        }
        if (condInputs.length > 0 && incomingEdges.some(e => nodeMap.get(e.source)?.type === "conditional")) {
          // Re-ejecutar con los datos del condicional
          const allCondInputEdges = incomingEdges.every(e => nodeMap.get(e.source)?.type === "conditional");
          if (allCondInputEdges) {
            switch (nodeType) {
              case "filter": output = executeFilter(condInputs, nodeData as FilterNodeData); break;
              case "aggregate": output = executeAggregate(condInputs, nodeData as AggregateNodeData); break;
              case "transform": output = executeTransform(condInputs, nodeData as TransformNodeData); break;
              case "output": output = executeOutput(condInputs, nodeData as OutputNodeData); break;
            }
          }
        }
      }

      const result: NodeResult = {
        nodeId,
        data: output,
        executedAt: Date.now(),
      };

      results.set(nodeId, result);
      onNodeDone?.(nodeId, result);
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : "Error desconocido";
      const result: NodeResult = {
        nodeId,
        data: [],
        error: errMsg,
        executedAt: Date.now(),
      };
      results.set(nodeId, result);
      onNodeDone?.(nodeId, result);
    }
  }

  return results;
}
