import {
  Database,
  Filter,
  Calculator,
  Shuffle,
  GitBranch,
  BarChart3,
} from "lucide-react";
import type { FlowNodeType } from "./types";

interface SidebarItem {
  type: FlowNodeType;
  label: string;
  icon: React.ReactNode;
  color: string;
}

const ITEMS: SidebarItem[] = [
  { type: "source", label: "Fuente", icon: <Database className="w-4 h-4" />, color: "bg-emerald-500" },
  { type: "filter", label: "Filtro", icon: <Filter className="w-4 h-4" />, color: "bg-blue-500" },
  { type: "aggregate", label: "Agregación", icon: <Calculator className="w-4 h-4" />, color: "bg-amber-500" },
  { type: "transform", label: "Transformar", icon: <Shuffle className="w-4 h-4" />, color: "bg-purple-500" },
  { type: "conditional", label: "Condicional", icon: <GitBranch className="w-4 h-4" />, color: "bg-rose-500" },
  { type: "output", label: "Salida", icon: <BarChart3 className="w-4 h-4" />, color: "bg-gray-700" },
];

export function FlowSidebar() {
  const onDragStart = (e: React.DragEvent, nodeType: FlowNodeType) => {
    e.dataTransfer.setData("application/reactflow", nodeType);
    e.dataTransfer.effectAllowed = "move";
  };

  return (
    <div className="bg-white border-r border-gray-200 w-48 flex flex-col h-full">
      <div className="px-3 py-3 border-b border-gray-200">
        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Nodos</h3>
        <p className="text-[10px] text-gray-400 mt-0.5">Arrastra al canvas</p>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
        {ITEMS.map((item) => (
          <div
            key={item.type}
            draggable
            onDragStart={(e) => onDragStart(e, item.type)}
            className="flex items-center gap-2.5 px-3 py-2 rounded-lg cursor-grab active:cursor-grabbing hover:bg-gray-50 border border-gray-200 hover:border-gray-300 transition-colors select-none"
          >
            <div className={`${item.color} text-white p-1.5 rounded-md`}>
              {item.icon}
            </div>
            <span className="text-xs font-medium text-gray-700">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
