import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Shuffle } from "lucide-react";
import type { TransformNodeData } from "../types";

const TRANSFORM_LABELS: Record<string, string> = {
  parseNumber: "A número",
  toUpperCase: "MAYÚSCULAS",
  toLowerCase: "minúsculas",
  trim: "Limpiar espacios",
  concat: "Concatenar",
  substring: "Subcadena",
};

export function TransformNode({ data, selected }: NodeProps) {
  const d = data as TransformNodeData;
  return (
    <div
      className={`bg-white rounded-xl shadow-md border-2 min-w-[180px] ${
        selected ? "border-purple-500 ring-2 ring-purple-200" : "border-purple-300"
      }`}
    >
      <Handle type="target" position={Position.Top} className="!bg-purple-500 !w-3 !h-3 !border-2 !border-white" />
      <div className="bg-purple-500 text-white px-3 py-1.5 rounded-t-[10px] flex items-center gap-2 text-xs font-bold uppercase tracking-wide">
        <Shuffle className="w-3.5 h-3.5" />
        Transformar
      </div>
      <div className="px-3 py-2 text-xs space-y-1">
        <p className="font-medium text-gray-900 truncate">{d.label || "Sin configurar"}</p>
        {d.transformType && d.column ? (
          <p className="text-gray-500">
            {TRANSFORM_LABELS[d.transformType] || d.transformType} → {d.column}
          </p>
        ) : (
          <p className="text-gray-400 italic">Click para configurar</p>
        )}
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-purple-500 !w-3 !h-3 !border-2 !border-white" />
    </div>
  );
}
