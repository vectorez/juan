import { useState, useCallback, useRef, useEffect } from "react";
import {
  ReactFlow,
  addEdge,
  useNodesState,
  useEdgesState,
  Controls,
  Background,
  MiniMap,
  BackgroundVariant,
  type Connection,
  type NodeTypes,
  type ReactFlowInstance,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import axios from "axios";
import {
  Play,
  Save,
  FolderOpen,
  Trash2,
  Loader2,
  X,
} from "lucide-react";

import { FlowSidebar } from "./FlowSidebar";
import { NodeConfigPanel } from "./panels/NodeConfigPanel";
import { ResultsPanel } from "./panels/ResultsPanel";
import {
  SourceNode,
  FilterNode,
  AggregateNode,
  TransformNode,
  ConditionalNode,
  OutputNode,
} from "./nodes";
import { executePipeline } from "./engine";
import type {
  PipelineNode,
  PipelineEdge,
  MunicipioOption,
  NodeResult,
  FlowNodeType,
  SavedPipeline,
} from "./types";

const nodeTypes: NodeTypes = {
  source: SourceNode,
  filter: FilterNode,
  aggregate: AggregateNode,
  transform: TransformNode,
  conditional: ConditionalNode,
  output: OutputNode,
};

const DEFAULT_DATA: Record<FlowNodeType, Record<string, unknown>> = {
  source: { label: "Fuente", municipioSlug: "", tableType: "facturacion" },
  filter: { label: "Filtro", conditions: [], logic: "AND" },
  aggregate: { label: "Agregación", operation: "sum", column: "", groupBy: "" },
  transform: { label: "Transformación", transformType: "parseNumber", column: "", params: "" },
  conditional: { label: "Condicional", condition: { column: "", operator: "=", value: "" } },
  output: { label: "Resultado", format: "table", limit: 100 },
};

let nodeIdCounter = 0;

export function FlowBuilder() {
  const [nodes, setNodes, onNodesChange] = useNodesState<PipelineNode>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<PipelineEdge>([]);
  const [rfInstance, setRfInstance] = useState<ReactFlowInstance | null>(null);
  const reactFlowWrapper = useRef<HTMLDivElement>(null);

  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [municipios, setMunicipios] = useState<MunicipioOption[]>([]);
  const [results, setResults] = useState<Map<string, NodeResult>>(new Map());
  const [showResults, setShowResults] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [executingNodeId, setExecutingNodeId] = useState<string | null>(null);

  // Pipelines guardados
  const [pipelines, setPipelines] = useState<SavedPipeline[]>([]);
  const [showPipelineList, setShowPipelineList] = useState(false);
  const [pipelineName, setPipelineName] = useState("");
  const [currentPipelineId, setCurrentPipelineId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  // Cargar municipios
  useEffect(() => {
    axios
      .get("/api/municipios")
      .then((res) => {
        const data = res.data.data || [];
        setMunicipios(
          data.map((m: Record<string, unknown>) => ({
            slug: m.slug,
            nombre: m.nombreMunicipio,
            columnasFacturacion: m.columnasFacturacion || 0,
            columnasRecaudos: m.columnasRecaudos || 0,
            encabezadosFacturacion: m.encabezadosFacturacion || [],
            encabezadosRecaudos: m.encabezadosRecaudos || [],
          }))
        );
      })
      .catch(() => {});
  }, []);

  // Cargar pipelines
  const fetchPipelines = useCallback(() => {
    axios
      .get("/api/pipelines")
      .then((res) => setPipelines(res.data.data || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchPipelines();
  }, [fetchPipelines]);

  const onConnect = useCallback(
    (params: Connection) => {
      setEdges((eds) =>
        addEdge(
          {
            ...params,
            animated: true,
            style: { strokeWidth: 2, stroke: "#6366f1" },
          },
          eds
        )
      );
    },
    [setEdges]
  );

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const type = e.dataTransfer.getData("application/reactflow") as FlowNodeType;
      if (!type || !rfInstance || !reactFlowWrapper.current) return;

      const bounds = reactFlowWrapper.current.getBoundingClientRect();
      const position = rfInstance.screenToFlowPosition({
        x: e.clientX - bounds.left,
        y: e.clientY - bounds.top,
      });

      const newNode: PipelineNode = {
        id: `node_${++nodeIdCounter}_${Date.now()}`,
        type,
        position,
        data: { ...DEFAULT_DATA[type] } as PipelineNode["data"],
      };

      setNodes((nds) => [...nds, newNode]);
    },
    [rfInstance, setNodes]
  );

  // onNodeClick is handled inline on ReactFlow component

  const onPaneClick = useCallback(() => {
    setSelectedNodeId(null);
  }, []);

  const updateNodeData = useCallback(
    (nodeId: string, data: Record<string, unknown>) => {
      setNodes((nds) =>
        nds.map((n) =>
          n.id === nodeId ? { ...n, data: { ...data } as PipelineNode["data"] } : n
        )
      );
    },
    [setNodes]
  );

  // Ejecutar pipeline
  const handleExecute = useCallback(async () => {
    setExecuting(true);
    setResults(new Map());
    setShowResults(true);

    try {
      const finalResults = await executePipeline(
        nodes as PipelineNode[],
        edges as PipelineEdge[],
        (nodeId) => setExecutingNodeId(nodeId),
        (nodeId, result) => {
          setResults((prev) => {
            const next = new Map(prev);
            next.set(nodeId, result);
            return next;
          });
        }
      );
      setResults(finalResults);
    } catch (err) {
      console.error("Error ejecutando pipeline:", err);
    } finally {
      setExecuting(false);
      setExecutingNodeId(null);
    }
  }, [nodes, edges]);

  // Guardar pipeline
  const handleSave = useCallback(async () => {
    const name = pipelineName.trim() || "Pipeline sin nombre";
    setSaving(true);
    try {
      const flowData = { nodes, edges };
      if (currentPipelineId) {
        await axios.put(`/api/pipelines/${currentPipelineId}`, {
          nombre: name,
          flowData,
        });
      } else {
        const res = await axios.post("/api/pipelines", {
          nombre: name,
          descripcion: "",
          flowData,
        });
        setCurrentPipelineId(res.data.data.id);
      }
      fetchPipelines();
    } catch (err) {
      console.error("Error guardando pipeline:", err);
    } finally {
      setSaving(false);
    }
  }, [nodes, edges, pipelineName, currentPipelineId, fetchPipelines]);

  // Cargar pipeline
  const handleLoad = useCallback(
    (pipeline: SavedPipeline) => {
      setNodes(pipeline.flowData.nodes || []);
      setEdges(pipeline.flowData.edges || []);
      setPipelineName(pipeline.nombre);
      setCurrentPipelineId(pipeline.id);
      setShowPipelineList(false);
      setSelectedNodeId(null);
      setResults(new Map());
      setShowResults(false);

      // Actualizar counter para evitar colisiones de IDs
      const maxId = (pipeline.flowData.nodes || []).reduce((max, n) => {
        const match = n.id.match(/node_(\d+)/);
        return match ? Math.max(max, parseInt(match[1])) : max;
      }, 0);
      nodeIdCounter = maxId;
    },
    [setNodes, setEdges]
  );

  // Eliminar pipeline
  const handleDeletePipeline = useCallback(
    async (id: number) => {
      try {
        await axios.delete(`/api/pipelines/${id}`);
        if (currentPipelineId === id) {
          setCurrentPipelineId(null);
          setPipelineName("");
        }
        fetchPipelines();
      } catch (err) {
        console.error("Error eliminando pipeline:", err);
      }
    },
    [currentPipelineId, fetchPipelines]
  );

  // Limpiar canvas
  const handleClear = useCallback(() => {
    setNodes([]);
    setEdges([]);
    setSelectedNodeId(null);
    setResults(new Map());
    setShowResults(false);
    setCurrentPipelineId(null);
    setPipelineName("");
    nodeIdCounter = 0;
  }, [setNodes, setEdges]);

  const selectedNode = nodes.find((n) => n.id === selectedNodeId) as PipelineNode | undefined;

  return (
    <div className="flex flex-col h-[calc(100vh-120px)] bg-gray-50 rounded-xl border border-gray-200 overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-4 py-2 bg-white border-b border-gray-200">
        <input
          className="flex-1 max-w-xs rounded border border-gray-300 px-3 py-1.5 text-sm"
          placeholder="Nombre del pipeline..."
          value={pipelineName}
          onChange={(e) => setPipelineName(e.target.value)}
        />
        <button
          onClick={handleExecute}
          disabled={executing || nodes.length === 0}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-medium hover:bg-emerald-700 disabled:opacity-50 transition-colors"
        >
          {executing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
          {executing ? "Ejecutando..." : "Ejecutar"}
        </button>
        <button
          onClick={handleSave}
          disabled={saving || nodes.length === 0}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
        >
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
          Guardar
        </button>
        <button
          onClick={() => setShowPipelineList(!showPipelineList)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-xs font-medium hover:bg-gray-200 transition-colors"
        >
          <FolderOpen className="w-3.5 h-3.5" />
          Cargar
        </button>
        <button
          onClick={handleClear}
          disabled={nodes.length === 0}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-600 rounded-lg text-xs font-medium hover:bg-red-100 disabled:opacity-50 transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" />
          Limpiar
        </button>
        {executingNodeId && (
          <span className="ml-2 text-xs text-gray-500 flex items-center gap-1">
            <Loader2 className="w-3 h-3 animate-spin" />
            Procesando nodo...
          </span>
        )}
      </div>

      {/* Pipeline list overlay */}
      {showPipelineList && (
        <div className="absolute top-14 right-4 z-50 bg-white rounded-lg shadow-xl border border-gray-200 w-80 max-h-96 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200">
            <h4 className="text-sm font-bold text-gray-900">Pipelines guardados</h4>
            <button onClick={() => setShowPipelineList(false)} className="text-gray-400 hover:text-gray-600">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="overflow-y-auto max-h-72">
            {pipelines.length === 0 ? (
              <p className="p-4 text-sm text-gray-500 text-center">No hay pipelines guardados</p>
            ) : (
              pipelines.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between px-4 py-2 hover:bg-gray-50 border-b border-gray-100"
                >
                  <button
                    onClick={() => handleLoad(p)}
                    className="flex-1 text-left"
                  >
                    <p className="text-sm font-medium text-gray-900">{p.nombre}</p>
                    <p className="text-[10px] text-gray-400">
                      {new Date(p.createdAt).toLocaleDateString()}
                    </p>
                  </button>
                  <button
                    onClick={() => handleDeletePipeline(p.id)}
                    className="text-gray-400 hover:text-red-500 p-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden relative">
        <FlowSidebar />

        <div className="flex-1 flex flex-col">
          <div className="flex-1" ref={reactFlowWrapper}>
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onDrop={onDrop}
              onDragOver={onDragOver}
              onInit={(instance) => setRfInstance(instance as unknown as ReactFlowInstance)}
              onNodeClick={(_event, node) => setSelectedNodeId(node.id)}
              onPaneClick={onPaneClick}
              nodeTypes={nodeTypes}
              fitView
              deleteKeyCode="Delete"
              className="bg-gray-50"
            >
              <Controls position="bottom-left" />
              <Background variant={BackgroundVariant.Dots} gap={16} size={1} color="#d1d5db" />
              <MiniMap
                nodeStrokeWidth={3}
                pannable
                zoomable
                className="!bg-white !border !border-gray-200 !rounded-lg !shadow-sm"
              />
            </ReactFlow>
          </div>

          {/* Results Panel */}
          {showResults && (
            <ResultsPanel
              results={results}
              nodes={nodes as PipelineNode[]}
              onClose={() => setShowResults(false)}
            />
          )}
        </div>

        {/* Config Panel */}
        {selectedNode && (
          <NodeConfigPanel
            node={selectedNode}
            nodes={nodes as PipelineNode[]}
            edges={edges as PipelineEdge[]}
            municipios={municipios}
            onUpdate={updateNodeData}
            onClose={() => setSelectedNodeId(null)}
          />
        )}
      </div>
    </div>
  );
}
