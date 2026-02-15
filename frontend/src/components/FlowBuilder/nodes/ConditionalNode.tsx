import { Handle, Position, type NodeProps } from "@xyflow/react";
import { GitBranch } from "lucide-react";
import type { ConditionalNodeData } from "../types";

export function ConditionalNode({ data, selected }: NodeProps) {
  const d = data as ConditionalNodeData;
  return (
    <div
      className={`bg-white rounded-xl shadow-md border-2 min-w-[180px] ${
        selected ? "border-rose-500 ring-2 ring-rose-200" : "border-rose-300"
      }`}
    >
      <Handle type="target" position={Position.Top} className="!bg-rose-500 !w-3 !h-3 !border-2 !border-white" />
      <div className="bg-rose-500 text-white px-3 py-1.5 rounded-t-[10px] flex items-center gap-2 text-xs font-bold uppercase tracking-wide">
        <GitBranch className="w-3.5 h-3.5" />
        Condicional
      </div>
      <div className="px-3 py-2 text-xs space-y-1">
        <p className="font-medium text-gray-900 truncate">{d.label || "Sin configurar"}</p>
        {d.condition?.column ? (
          <p className="text-gray-500 truncate">
            {d.condition.column} {d.condition.operator} {d.condition.value}
          </p>
        ) : (
          <p className="text-gray-400 italic">Click para configurar</p>
        )}
      </div>
      <div className="flex justify-between px-3 pb-1.5">
        <span className="text-[10px] font-bold text-green-600">Sí</span>
        <span className="text-[10px] font-bold text-red-600">No</span>
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        id="true"
        className="!bg-green-500 !w-3 !h-3 !border-2 !border-white"
        style={{ left: "30%" }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="false"
        className="!bg-red-500 !w-3 !h-3 !border-2 !border-white"
        style={{ left: "70%" }}
      />
    </div>
  );
}
