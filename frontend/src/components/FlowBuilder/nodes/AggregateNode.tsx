import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Calculator } from "lucide-react";
import type { AggregateNodeData } from "../types";

const OP_LABELS: Record<string, string> = {
  sum: "SUMA",
  avg: "PROMEDIO",
  count: "CONTAR",
  min: "MÍNIMO",
  max: "MÁXIMO",
};

export function AggregateNode({ data, selected }: NodeProps) {
  const d = data as AggregateNodeData;
  return (
    <div
      className={`bg-white rounded-xl shadow-md border-2 min-w-[180px] ${
        selected ? "border-amber-500 ring-2 ring-amber-200" : "border-amber-300"
      }`}
    >
      <Handle type="target" position={Position.Top} className="!bg-amber-500 !w-3 !h-3 !border-2 !border-white" />
      <div className="bg-amber-500 text-white px-3 py-1.5 rounded-t-[10px] flex items-center gap-2 text-xs font-bold uppercase tracking-wide">
        <Calculator className="w-3.5 h-3.5" />
        Agregación
      </div>
      <div className="px-3 py-2 text-xs space-y-1">
        <p className="font-medium text-gray-900 truncate">{d.label || "Sin configurar"}</p>
        {d.operation && d.column ? (
          <>
            <p className="text-gray-500">{OP_LABELS[d.operation] || d.operation}({d.column})</p>
            {d.groupBy && <p className="text-gray-400">Agrupar: {d.groupBy}</p>}
          </>
        ) : (
          <p className="text-gray-400 italic">Click para configurar</p>
        )}
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-amber-500 !w-3 !h-3 !border-2 !border-white" />
    </div>
  );
}
