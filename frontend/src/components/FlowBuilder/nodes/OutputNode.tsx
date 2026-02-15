import { Handle, Position, type NodeProps } from "@xyflow/react";
import { BarChart3 } from "lucide-react";
import type { OutputNodeData } from "../types";

export function OutputNode({ data, selected }: NodeProps) {
  const d = data as OutputNodeData;
  return (
    <div
      className={`bg-white rounded-xl shadow-md border-2 min-w-[180px] ${
        selected ? "border-gray-700 ring-2 ring-gray-300" : "border-gray-400"
      }`}
    >
      <Handle type="target" position={Position.Top} className="!bg-gray-700 !w-3 !h-3 !border-2 !border-white" />
      <div className="bg-gray-700 text-white px-3 py-1.5 rounded-t-[10px] flex items-center gap-2 text-xs font-bold uppercase tracking-wide">
        <BarChart3 className="w-3.5 h-3.5" />
        Salida
      </div>
      <div className="px-3 py-2 text-xs space-y-1">
        <p className="font-medium text-gray-900 truncate">{d.label || "Resultado"}</p>
        <p className="text-gray-500">
          {d.format === "table" ? "Tabla" : d.format === "json" ? "JSON" : "Conteo"}
          {d.limit > 0 ? ` (máx ${d.limit})` : ""}
        </p>
      </div>
    </div>
  );
}
