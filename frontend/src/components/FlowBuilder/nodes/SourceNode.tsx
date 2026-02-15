import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Database } from "lucide-react";
import type { SourceNodeData } from "../types";

export function SourceNode({ data, selected }: NodeProps) {
  const d = data as SourceNodeData;
  return (
    <div
      className={`bg-white rounded-xl shadow-md border-2 min-w-[180px] ${
        selected ? "border-emerald-500 ring-2 ring-emerald-200" : "border-emerald-300"
      }`}
    >
      <div className="bg-emerald-500 text-white px-3 py-1.5 rounded-t-[10px] flex items-center gap-2 text-xs font-bold uppercase tracking-wide">
        <Database className="w-3.5 h-3.5" />
        Fuente
      </div>
      <div className="px-3 py-2 text-xs space-y-1">
        <p className="font-medium text-gray-900 truncate">{d.label || "Sin configurar"}</p>
        {d.municipioSlug && (
          <p className="text-gray-500">
            {d.municipioSlug} / {d.tableType}
          </p>
        )}
        {!d.municipioSlug && <p className="text-gray-400 italic">Click para configurar</p>}
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-emerald-500 !w-3 !h-3 !border-2 !border-white" />
    </div>
  );
}
