import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Filter } from "lucide-react";
import type { FilterNodeData } from "../types";

export function FilterNode({ data, selected }: NodeProps) {
  const d = data as FilterNodeData;
  return (
    <div
      className={`bg-white rounded-xl shadow-md border-2 min-w-[180px] ${
        selected ? "border-blue-500 ring-2 ring-blue-200" : "border-blue-300"
      }`}
    >
      <Handle type="target" position={Position.Top} className="!bg-blue-500 !w-3 !h-3 !border-2 !border-white" />
      <div className="bg-blue-500 text-white px-3 py-1.5 rounded-t-[10px] flex items-center gap-2 text-xs font-bold uppercase tracking-wide">
        <Filter className="w-3.5 h-3.5" />
        Filtro
      </div>
      <div className="px-3 py-2 text-xs space-y-1">
        <p className="font-medium text-gray-900 truncate">{d.label || "Sin configurar"}</p>
        {d.conditions && d.conditions.length > 0 ? (
          <div className="space-y-0.5">
            {d.conditions.map((c, i) => (
              <p key={i} className="text-gray-500 truncate">
                {i > 0 && <span className="text-blue-500 font-bold">{d.logic} </span>}
                {c.column} {c.operator} {c.value}
              </p>
            ))}
          </div>
        ) : (
          <p className="text-gray-400 italic">Click para configurar</p>
        )}
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-blue-500 !w-3 !h-3 !border-2 !border-white" />
    </div>
  );
}
