import { X, ChevronDown, ChevronRight, AlertCircle, CheckCircle } from "lucide-react";
import { useState } from "react";
import type { NodeResult, PipelineNode } from "../types";

interface Props {
  results: Map<string, NodeResult>;
  nodes: PipelineNode[];
  onClose: () => void;
}

const NODE_LABELS: Record<string, string> = {
  source: "Fuente",
  filter: "Filtro",
  aggregate: "Agregación",
  transform: "Transformación",
  conditional: "Condicional",
  output: "Salida",
};

export function ResultsPanel({ results, nodes, onClose }: Props) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const nodeMap = new Map(nodes.map((n) => [n.id, n]));

  // Solo mostrar resultados de nodos reales (no los internos de condicionales)
  const displayResults = Array.from(results.entries()).filter(
    ([key]) => !key.includes("__")
  );

  return (
    <div className="bg-white border-t border-gray-200 max-h-[40vh] flex flex-col">
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-100 bg-gray-50">
        <h3 className="text-sm font-bold text-gray-900">
          Resultados ({displayResults.length} nodos)
        </h3>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto">
        {displayResults.length === 0 && (
          <p className="p-4 text-sm text-gray-500 text-center">
            Ejecuta el pipeline para ver resultados
          </p>
        )}
        {displayResults.map(([nodeId, result]) => {
          const node = nodeMap.get(nodeId);
          const isExpanded = expanded.has(nodeId);
          const nodeLabel = String(
            (node?.data as Record<string, unknown>)?.label ||
            NODE_LABELS[node?.type || ""] ||
            nodeId
          );
          const nodeType = NODE_LABELS[node?.type || ""] || "";

          return (
            <div key={nodeId} className="border-b border-gray-100">
              <button
                onClick={() => toggleExpand(nodeId)}
                className="w-full flex items-center gap-2 px-4 py-2 hover:bg-gray-50 text-left"
              >
                {isExpanded ? (
                  <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
                )}
                {result.error ? (
                  <AlertCircle className="w-3.5 h-3.5 text-red-500" />
                ) : (
                  <CheckCircle className="w-3.5 h-3.5 text-green-500" />
                )}
                <span className="text-xs font-medium text-gray-900 flex-1 truncate">
                  {nodeLabel}
                </span>
                <span className="text-[10px] text-gray-400 uppercase">{nodeType}</span>
                <span className="text-xs text-gray-500 font-mono">
                  {result.error ? "Error" : String(result.data.length) + " filas"}
                </span>
              </button>

              {isExpanded && (
                <div className="px-4 pb-3">
                  {result.error ? (
                    <div className="bg-red-50 border border-red-200 rounded p-2 text-xs text-red-700">
                      {result.error}
                    </div>
                  ) : result.data.length === 0 ? (
                    <p className="text-xs text-gray-400 italic">Sin datos</p>
                  ) : (
                    <div className="overflow-x-auto max-h-48 border border-gray-200 rounded">
                      <table className="w-full text-[11px]">
                        <thead>
                          <tr className="bg-gray-50 sticky top-0">
                            {Object.keys(result.data[0]).map((key) => (
                              <th
                                key={key}
                                className="px-2 py-1 text-left font-medium text-gray-600 border-b border-gray-200 whitespace-nowrap"
                              >
                                {key}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {result.data.slice(0, 50).map((row, i) => (
                            <tr key={i} className="hover:bg-gray-50">
                              {Object.values(row).map((val, j) => (
                                <td
                                  key={j}
                                  className="px-2 py-0.5 border-b border-gray-100 whitespace-nowrap max-w-[200px] truncate"
                                >
                                  {String(val ?? "")}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {result.data.length > 50 && (
                        <p className="text-center text-[10px] text-gray-400 py-1">
                          Mostrando 50 de {result.data.length} filas
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
