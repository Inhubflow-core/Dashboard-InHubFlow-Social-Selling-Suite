"use client";

import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { customNodeTypes } from "@/lib/campaigns/custom-nodes";
import { getStoredWorkflow, saveStoredWorkflow } from "@/lib/campaigns/store";
import { availablePaletteNodes, defaultCampaignEdges, defaultCampaignNodes } from "@/lib/campaigns/templates";
import type { CampaignWorkflow, NodeConfigData } from "@/lib/campaigns/types";
import type { CampaignExecutionLog } from "@/lib/campaigns/runner";
import { getStoredLeadLists } from "@/lib/leads/store";
import type { LeadListGroup } from "@/lib/leads/types";
import {
  Play,
  Terminal,
  CheckCircle2,
  AlertCircle,
  X,
  Shield,
  Layers,
} from "lucide-react";
import {
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  type Connection,
  type Edge,
  type EdgeChange,
  type Node,
  type NodeChange,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { getActiveAccountForUser } from "@/lib/unipile/store";

export default function CampaignsPage() {
  const { currentUser } = useAuth();
  const [workflow, setWorkflow] = useState<CampaignWorkflow | null>(null);
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [isSavedMessage, setIsSavedMessage] = useState(false);
  const [showPacingModal, setShowPacingModal] = useState(false);
  const [showRunnerLogsModal, setShowRunnerLogsModal] = useState(false);
  const [isExecutingTest, setIsExecutingTest] = useState(false);
  const [runnerLogs, setRunnerLogs] = useState<CampaignExecutionLog[]>([]);
  const [runnerNotice, setRunnerNotice] = useState<string | null>(null);

  // Audiencia vinculada desde Signal Radar o Listas de Leads
  const [linkedList, setLinkedList] = useState<LeadListGroup | null>(null);
  const [linkedCompetitor, setLinkedCompetitor] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const listId = params.get("listId");
    const competitor = params.get("competitor");
    if (competitor) setLinkedCompetitor(competitor);

    if (listId) {
      const allLists = getStoredLeadLists();
      const found = allLists.find((l) => l.id === listId);
      if (found) {
        setLinkedList(found);
      }
    }
  }, []);

  // Cargar campaña guardada
  useEffect(() => {
    const wf = getStoredWorkflow();
    setWorkflow(wf);
    try {
      const parsedNodes = JSON.parse(wf.nodesJson);
      const parsedEdges = JSON.parse(wf.edgesJson);
      setNodes(parsedNodes);
      setEdges(parsedEdges);
    } catch {
      setNodes(defaultCampaignNodes);
      setEdges(defaultCampaignEdges);
    }
  }, []);

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => setNodes((nds) => applyNodeChanges(changes, nds)),
    []
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    []
  );

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge({ ...params, animated: true }, eds)),
    []
  );

  const selectedNode = nodes.find((n) => n.id === selectedNodeId);
  const selectedNodeData = selectedNode?.data as unknown as NodeConfigData | undefined;

  // Actualizar datos del nodo seleccionado en el inspector
  const updateSelectedNodeData = (updates: Partial<NodeConfigData>) => {
    if (!selectedNodeId) return;
    setNodes((nds) =>
      nds.map((n) => {
        if (n.id === selectedNodeId) {
          return {
            ...n,
            data: {
              ...(n.data as unknown as NodeConfigData),
              ...updates,
            },
          };
        }
        return n;
      })
    );
  };

  // Eliminar nodo seleccionado
  const handleDeleteSelectedNode = () => {
    if (!selectedNodeId) return;
    setNodes((nds) => nds.filter((n) => n.id !== selectedNodeId));
    setEdges((eds) => eds.filter((e) => e.source !== selectedNodeId && e.target !== selectedNodeId));
    setSelectedNodeId(null);
  };

  // Añadir un nuevo nodo desde la paleta
  const handleAddNodeFromPalette = (paletteItem: (typeof availablePaletteNodes)[0]) => {
    const newNodeId = `node-${Date.now()}`;
    const newNode: Node = {
      id: newNodeId,
      type: paletteItem.type,
      position: { x: 350, y: (nodes.length + 1) * 90 },
      data: {
        label: paletteItem.label,
        category: paletteItem.category,
        nodeType: paletteItem.nodeType,
        description: paletteItem.description,
        hasNote: paletteItem.nodeType === "action_follow_connect",
        noteText: "Hola {{first_name}}, vi tu interaccion y queria conectar.",
        commentText: "Gran aporte {{first_name}}, totalmente alineado con esta vision.",
        useAiComment: false,
        dmText: "Hola {{first_name}}, te comparto este recurso de valor.",
        delayHours: 24,
      } as NodeConfigData,
    };

    setNodes((nds) => [...nds, newNode]);
    setSelectedNodeId(newNodeId);
  };

  // Guardar flujo
  const handleSaveWorkflow = () => {
    if (!workflow) return;
    const updated: CampaignWorkflow = {
      ...workflow,
      nodesJson: JSON.stringify(nodes),
      edgesJson: JSON.stringify(edges),
      updatedAt: new Date().toISOString(),
    };
    setWorkflow(updated);
    saveStoredWorkflow(updated);
    setIsSavedMessage(true);
    setTimeout(() => setIsSavedMessage(false), 2500);
  };

  // Restablecer al flujo oficial del PRD
  const handleResetToPrdTemplate = () => {
    setNodes(defaultCampaignNodes);
    setEdges(defaultCampaignEdges);
    setSelectedNodeId(null);
    if (workflow) {
      const updated: CampaignWorkflow = {
        ...workflow,
        nodesJson: JSON.stringify(defaultCampaignNodes),
        edgesJson: JSON.stringify(defaultCampaignEdges),
      };
      setWorkflow(updated);
      saveStoredWorkflow(updated);
    }
  };

  const handleTriggerRunnerTest = async () => {
    setIsExecutingTest(true);
    try {
      const activeAcc = getActiveAccountForUser(currentUser);
      const res = await fetch("/api/campaigns/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadName: "Mariana Costa",
          linkedinUrl: "https://www.linkedin.com/in/mariana-costa-tech",
          connectionDegree: "2nd",
          accountId: activeAcc?.unipileAccountId || activeAcc?.id,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setRunnerNotice(data.result?.log?.message || "Paso de campaña ejecutado con exito.");
        setTimeout(() => setRunnerNotice(null), 4000);
        // Cargar logs actualizados
        fetch("/api/campaigns/run")
          .then((r) => r.json())
          .then((d) => setRunnerLogs(d.logs || []));
      }
    } catch (err) {
      console.warn("[Runner] Error:", err);
    } finally {
      setIsExecutingTest(false);
    }
  };

  const handleOpenRunnerLogs = () => {
    fetch("/api/campaigns/run")
      .then((r) => r.json())
      .then((d) => {
        setRunnerLogs(d.logs || []);
        setShowRunnerLogsModal(true);
      })
      .catch(() => setShowRunnerLogsModal(true));
  };

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] space-y-3">
      {/* Barra Superior de la Campaña */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-gray-200 dark:bg-gray-900 dark:border-gray-800">
        <div>
          <PageBreadcrumb pageTitle="Constructor Visual de Campañas (Workflow)" />
          <p className="text-xs text-gray-500 dark:text-gray-400 -mt-4">
            Diseño modular de secuencias con retardo humano, bifurcaciones lógicas y detención automática ante respuesta.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {runnerNotice && (
            <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-lg border border-emerald-200 dark:border-emerald-800">
              <CheckCircle2 className="size-3.5" />
              {runnerNotice}
            </span>
          )}

          {isSavedMessage && (
            <span className="text-xs font-semibold text-green-600 dark:text-green-400">
              Flujo Guardado Exitosamente
            </span>
          )}

          <button
            type="button"
            onClick={handleTriggerRunnerTest}
            disabled={isExecutingTest}
            className="flex items-center gap-1.5 rounded-lg bg-[#0099ff]/10 border border-[#0099ff]/20 px-3 py-1.5 text-xs font-bold text-[#0099ff] hover:bg-[#0099ff]/20 transition disabled:opacity-50"
          >
            <Play className="size-3.5 fill-current" />
            <span>{isExecutingTest ? "Ejecutando..." : "Simular Lead en Runner"}</span>
          </button>

          <button
            type="button"
            onClick={handleOpenRunnerLogs}
            className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
          >
            <Terminal className="size-3.5 text-gray-500" />
            <span>Logs del Runner</span>
          </button>

          <button
            type="button"
            onClick={() => setShowPacingModal(true)}
            className="rounded-lg border border-[#0099ff]/30 bg-[#0099ff]/5 px-3 py-1.5 text-xs font-semibold text-[#0099ff] hover:bg-[#0099ff]/10 dark:bg-brand-950 dark:border-brand-900 dark:text-brand-300"
          >
            Pacing: {workflow?.dailyInvitationLimit || 25} Inv / {workflow?.dailyDmLimit || 40} DMs
          </button>

          <button
            type="button"
            onClick={handleResetToPrdTemplate}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300"
          >
            Restablecer Plantilla PRD
          </button>

          <button
            type="button"
            onClick={handleSaveWorkflow}
            className="rounded-lg bg-[#0099ff] px-4 py-1.5 text-xs font-semibold text-white hover:bg-[#0088ee] transition shadow-sm"
          >
            Guardar Flujo
          </button>
        </div>
      </div>

      {/* Banner de Audiencia Vinculada desde Signal Radar */}
      {linkedList && (
        <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl bg-purple-50/70 border border-purple-200 dark:bg-purple-950/30 dark:border-purple-900/60 text-xs">
          <div className="flex items-center gap-2.5">
            <span className="rounded-full bg-purple-600 text-white px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider">
              Audiencia Vinculada
            </span>
            <span className="font-bold text-gray-900 dark:text-white">
              {linkedList.name}
            </span>
            <span className="text-gray-500 dark:text-gray-400">
              • {linkedList.leadsCount} prospectos ({linkedCompetitor ? `Competidor: ${linkedCompetitor}` : linkedList.signalSource})
            </span>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-[11px] text-purple-800 dark:text-purple-300 font-medium">
              Variables contextuales activas: &#123;&#123;first_name&#125;&#125;, &#123;&#123;company&#125;&#125;, &#123;&#123;competitor&#125;&#125;
            </span>
            <button
              type="button"
              onClick={() => {
                setLinkedList(null);
                setLinkedCompetitor(null);
              }}
              className="text-gray-400 hover:text-gray-600 font-bold"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Área de Trabajo Principal */}
      <div className="flex-1 grid grid-cols-12 gap-3 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
        {/* Panel Izquierdo: Catálogo de Nodos Disponibles */}
        <div className="col-span-12 md:col-span-3 border-r border-gray-100 dark:border-gray-800 p-4 overflow-y-auto space-y-4">
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400">
              Catalogo de Nodos
            </h4>
            <p className="text-[11px] text-gray-500 mt-0.5">
              Haz clic en cualquier nodo para agregarlo a la secuencia.
            </p>
          </div>

          <div className="space-y-2">
            {availablePaletteNodes.map((item, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleAddNodeFromPalette(item)}
                className="w-full text-left rounded-xl border border-gray-200 p-3 hover:border-brand-500 hover:bg-brand-25/30 transition dark:border-gray-800 dark:hover:bg-brand-950/20"
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${
                      item.category === "action"
                        ? "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                        : item.category === "logic"
                        ? "bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300"
                        : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
                    }`}
                  >
                    {item.category}
                  </span>
                  <span className="text-[10px] text-brand-600 font-bold">+ Agregar</span>
                </div>
                <h5 className="mt-1.5 text-xs font-bold text-gray-900 dark:text-white leading-snug">
                  {item.label}
                </h5>
                <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">
                  {item.description}
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* Lienzo Central de React Flow */}
        <div className="col-span-12 md:col-span-6 h-full relative">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={customNodeTypes}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={(_, node) => setSelectedNodeId(node.id)}
            onPaneClick={() => setSelectedNodeId(null)}
            fitView
            minZoom={0.3}
            maxZoom={1.5}
          >
            <Background gap={18} size={1} />
            <Controls />
            <MiniMap />
          </ReactFlow>
        </div>

        {/* Panel Derecho: Inspector y Configurador Técnico del Nodo */}
        <div className="col-span-12 md:col-span-3 border-l border-gray-100 dark:border-gray-800 p-4 overflow-y-auto space-y-4 bg-gray-50/50 dark:bg-gray-900/40">
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400">
              Inspector del Nodo
            </h4>
            <p className="text-[11px] text-gray-500 mt-0.5">
              Configura los parametros tecnicos del elemento seleccionado.
            </p>
          </div>

          {!selectedNode || !selectedNodeData ? (
            <div className="rounded-xl border border-dashed border-gray-300 p-6 text-center text-xs text-gray-400 dark:border-gray-800">
              Selecciona cualquier nodo del lienzo para inspeccionar y editar sus parametros de ejecucion.
            </div>
          ) : (
            <div className="space-y-4 bg-white p-4 rounded-xl border border-gray-200 dark:bg-gray-900 dark:border-gray-800">
              <div>
                <span className="text-[10px] font-bold uppercase text-brand-600">
                  {selectedNodeData.category} • {selectedNodeData.nodeType}
                </span>
                <input
                  type="text"
                  value={selectedNodeData.label}
                  onChange={(e) => updateSelectedNodeData({ label: e.target.value })}
                  className="w-full mt-1 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-bold text-gray-900 focus:border-brand-500 focus:outline-hidden dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-gray-500 uppercase mb-1">
                  Descripcion
                </label>
                <textarea
                  rows={2}
                  value={selectedNodeData.description}
                  onChange={(e) => updateSelectedNodeData({ description: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 p-2 text-xs text-gray-800 focus:border-brand-500 focus:outline-hidden dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                />
              </div>

              {/* Parámetros de Trigger */}
              {selectedNodeData.nodeType === "trigger_signal" && (
                <div className="space-y-2 pt-2 border-t border-gray-100 dark:border-gray-800">
                  <label className="block text-[11px] font-semibold text-gray-500 uppercase">
                    Palabra Clave Activadora
                  </label>
                  <input
                    type="text"
                    value={selectedNodeData.keyword || "SISTEMA"}
                    onChange={(e) => updateSelectedNodeData({ keyword: e.target.value.toUpperCase() })}
                    className="w-full rounded-md border border-gray-300 px-2.5 py-1.5 text-xs font-mono font-bold text-brand-600 dark:border-gray-700 dark:bg-gray-800"
                  />
                </div>
              )}

              {/* Parámetros de Acción Unificada: Like + Comentario */}
              {selectedNodeData.nodeType === "action_like_comment" && (
                <div className="space-y-3 pt-2 border-t border-gray-100 dark:border-gray-800">
                  <div className="flex items-center justify-between">
                    <label className="block text-[11px] font-semibold text-gray-500 uppercase">
                      Like + Comentario
                    </label>
                    <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded font-bold dark:bg-blue-900/50 dark:text-blue-300">
                      Paso Unificado
                    </span>
                  </div>

                  <label className="flex items-center gap-2 text-xs text-gray-700 dark:text-gray-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedNodeData.useAiComment ?? false}
                      onChange={(e) => updateSelectedNodeData({ useAiComment: e.target.checked })}
                      className="rounded border-gray-300 text-brand-500"
                    />
                    <span>Generar comentario con IA segun el post</span>
                  </label>

                  <div>
                    <label className="block text-[11px] font-medium text-gray-600 dark:text-gray-400 mb-1">
                      {selectedNodeData.useAiComment ? "Texto de Respaldo / Plantilla Base" : "Texto del Comentario"}
                    </label>
                    <textarea
                      rows={3}
                      value={selectedNodeData.commentText || ""}
                      onChange={(e) => updateSelectedNodeData({ commentText: e.target.value })}
                      placeholder="Gran aporte {{first_name}}, totalmente alineado con esta vision..."
                      className="w-full rounded-md border border-gray-300 p-2 text-xs font-mono text-gray-800 focus:border-brand-500 focus:outline-hidden dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                    />
                    <span className="text-[10px] text-gray-400">
                      Variables: &#123;&#123;first_name&#125;&#125;
                    </span>
                  </div>
                </div>
              )}

              {/* Parámetros de Acción Unificada: Seguir + Conectar */}
              {selectedNodeData.nodeType === "action_follow_connect" && (
                <div className="space-y-3 pt-2 border-t border-gray-100 dark:border-gray-800">
                  <div className="flex items-center justify-between">
                    <label className="block text-[11px] font-semibold text-gray-500 uppercase">
                      Seguir y Conectar
                    </label>
                    <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded font-bold dark:bg-blue-900/50 dark:text-blue-300">
                      Paso Unificado
                    </span>
                  </div>

                  <p className="text-[11px] text-gray-500 dark:text-gray-400">
                    Sigue automaticamente el perfil del prospecto y despues envia la solicitud de conexion.
                  </p>

                  <label className="flex items-center gap-2 text-xs text-gray-700 dark:text-gray-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedNodeData.hasNote ?? true}
                      onChange={(e) => updateSelectedNodeData({ hasNote: e.target.checked })}
                      className="rounded border-gray-300 text-brand-500"
                    />
                    <span>Incluir nota personalizada al conectar</span>
                  </label>

                  {selectedNodeData.hasNote !== false && (
                    <div>
                      <label className="block text-[11px] font-medium text-gray-600 dark:text-gray-400 mb-1">
                        Nota de Conexion
                      </label>
                      <textarea
                        rows={3}
                        value={selectedNodeData.noteText || ""}
                        onChange={(e) => updateSelectedNodeData({ noteText: e.target.value })}
                        placeholder="Hola {{first_name}}, vi tu interaccion y me gustaria conectar..."
                        className="w-full rounded-md border border-gray-300 p-2 text-xs font-mono text-gray-800 focus:border-brand-500 focus:outline-hidden dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                      />
                      <span className="text-[10px] text-gray-400">
                        Variables: &#123;&#123;first_name&#125;&#125;, &#123;&#123;company&#125;&#125;
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Parámetros de Acción Invitación */}
              {selectedNodeData.nodeType === "action_invite" && (
                <div className="space-y-2 pt-2 border-t border-gray-100 dark:border-gray-800">
                  <label className="block text-[11px] font-semibold text-gray-500 uppercase">
                    Nota Personalizada de Conexion
                  </label>
                  <textarea
                    rows={3}
                    value={selectedNodeData.noteText || ""}
                    onChange={(e) => updateSelectedNodeData({ noteText: e.target.value })}
                    placeholder="Hola {{first_name}}, te envio invitacion..."
                    className="w-full rounded-md border border-gray-300 p-2 text-xs font-mono text-gray-800 focus:border-brand-500 focus:outline-hidden dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  />
                  <span className="text-[10px] text-gray-400">
                    Variables: &#123;&#123;first_name&#125;&#125;, &#123;&#123;company&#125;&#125;
                  </span>
                </div>
              )}

              {/* Parámetros de Acción DM */}
              {selectedNodeData.nodeType === "action_dm" && (
                <div className="space-y-3 pt-2 border-t border-gray-100 dark:border-gray-800">
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-500 uppercase mb-1">
                      Mensaje Directo (DM)
                    </label>
                    <textarea
                      rows={3}
                      value={selectedNodeData.dmText || ""}
                      onChange={(e) => updateSelectedNodeData({ dmText: e.target.value })}
                      className="w-full rounded-md border border-gray-300 p-2 text-xs font-mono text-gray-800 focus:border-brand-500 focus:outline-hidden dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-500 uppercase mb-1">
                      Archivo Adjunto (Lead Magnet)
                    </label>
                    <input
                      type="text"
                      value={selectedNodeData.attachedResource || ""}
                      onChange={(e) => updateSelectedNodeData({ attachedResource: e.target.value })}
                      placeholder="Guia_Framework.pdf"
                      className="w-full rounded-md border border-gray-300 px-2.5 py-1.5 text-xs text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                    />
                  </div>
                </div>
              )}

              {/* Parámetros de Delay */}
              {selectedNodeData.nodeType === "logic_delay" && (
                <div className="space-y-2 pt-2 border-t border-gray-100 dark:border-gray-800">
                  <label className="block text-[11px] font-semibold text-gray-500 uppercase">
                    Tiempo de Retardo
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      min="1"
                      max="168"
                      value={selectedNodeData.delayHours || 24}
                      onChange={(e) => updateSelectedNodeData({ delayHours: Number(e.target.value) })}
                      className="w-20 rounded-md border border-gray-300 px-2.5 py-1.5 text-xs font-bold text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                    />
                    <span className="text-xs text-gray-500 self-center">Horas</span>
                  </div>
                  <label className="flex items-center gap-2 pt-1 text-xs text-gray-600 dark:text-gray-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedNodeData.workingHoursOnly ?? true}
                      onChange={(e) => updateSelectedNodeData({ workingHoursOnly: e.target.checked })}
                      className="rounded border-gray-300 text-brand-500"
                    />
                    <span>Solo en horario laboral (L-V 09:00 - 18:00)</span>
                  </label>
                </div>
              )}

              {/* Botón de Eliminación */}
              <div className="pt-3 border-t border-gray-100 dark:border-gray-800">
                <button
                  type="button"
                  onClick={handleDeleteSelectedNode}
                  className="w-full rounded-lg border border-red-200 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 dark:border-red-900 dark:text-red-400"
                >
                  Eliminar Nodo
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal de Configuración de Pacing Humano y Seguridad */}
      {showPacingModal && workflow && (
        <div className="fixed inset-0 z-99999 flex items-center justify-center bg-black/60 p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-theme-xl dark:bg-gray-900 border border-gray-200 dark:border-gray-800 space-y-4">
            <div className="flex items-start justify-between border-b border-gray-100 pb-3 dark:border-gray-800">
              <div>
                <h3 className="text-base font-bold text-gray-900 dark:text-white">
                  Motor de Seguridad y Pacing Humano (InHubFlow)
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Parametros de navegacion y proteccion de cuenta de LinkedIn.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowPacingModal(false)}
                className="text-gray-400 hover:text-gray-600 font-bold"
              >
                Cerrar
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Max. Invitaciones Diarias
                  </label>
                  <input
                    type="number"
                    min="5"
                    max="30"
                    value={workflow.dailyInvitationLimit}
                    onChange={(e) =>
                      setWorkflow({ ...workflow, dailyInvitationLimit: Number(e.target.value) })
                    }
                    className="w-full rounded-lg border border-gray-300 p-2 text-xs font-bold text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  />
                  <span className="text-[10px] text-gray-400">Recomendado: 20 a 25 / dia</span>
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Max. DMs Diarios
                  </label>
                  <input
                    type="number"
                    min="10"
                    max="50"
                    value={workflow.dailyDmLimit}
                    onChange={(e) =>
                      setWorkflow({ ...workflow, dailyDmLimit: Number(e.target.value) })
                    }
                    className="w-full rounded-lg border border-gray-300 p-2 text-xs font-bold text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  />
                  <span className="text-[10px] text-gray-400">Recomendado: 30 a 40 / dia</span>
                </div>
              </div>

              <div className="rounded-xl border border-brand-200 bg-brand-25/50 p-3.5 space-y-2 dark:border-brand-900 dark:bg-brand-950/20">
                <span className="font-bold text-brand-900 dark:text-brand-300">
                  Intervalo Aleatorio de Jitter (Seguridad Antidetect):
                </span>
                <p className="text-[11px] text-brand-700 dark:text-brand-300">
                  El sistema introduce pausas variables de {workflow.jitterMinMinutes} a {workflow.jitterMaxMinutes} minutos entre cada accion consecutiva para replicar el comportamiento de un humano real.
                </p>
              </div>

              <div className="pt-2">
                <label className="flex items-center gap-2 cursor-pointer font-medium text-gray-800 dark:text-gray-200">
                  <input
                    type="checkbox"
                    checked={workflow.stopOnReply}
                    onChange={(e) =>
                      setWorkflow({ ...workflow, stopOnReply: e.target.checked })
                    }
                    className="rounded border-gray-300 text-brand-500"
                  />
                  <span>Detencion automatica de secuencia cuando el prospecto responde</span>
                </label>
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-gray-100 dark:border-gray-800">
              <button
                type="button"
                onClick={() => {
                  saveStoredWorkflow(workflow);
                  setShowPacingModal(false);
                }}
                className="rounded-lg bg-brand-500 px-5 py-2 text-xs font-semibold text-white hover:bg-brand-600 transition"
              >
                Guardar Parametros de Seguridad
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Logs del Campaign Runner */}
      {showRunnerLogsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl dark:bg-gray-900 border border-gray-200 dark:border-gray-800 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="flex size-8 items-center justify-center rounded-lg bg-[#0099ff]/10 text-[#0099ff]">
                  <Terminal className="size-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                    Logs de Auditoría del Campaign Runner ({runnerLogs.length})
                  </h3>
                  <p className="text-[11px] text-gray-500">
                    Historial de ejecución de nodos, llamadas a LinkedIn y controles de pacing en vivo.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowRunnerLogsModal(false)}
                className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="max-h-[380px] overflow-y-auto space-y-2.5 font-mono text-xs">
              {runnerLogs.length === 0 ? (
                <div className="py-8 text-center text-gray-400 font-sans text-xs">
                  No hay registros de ejecución recientes. Haz clic en "Simular Lead en Runner" para iniciar una prueba.
                </div>
              ) : (
                runnerLogs.map((log) => (
                  <div
                    key={log.id}
                    className="rounded-xl border border-gray-100 bg-gray-50 p-3.5 dark:border-gray-800 dark:bg-gray-950/60"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span
                          className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                            log.status === "success"
                              ? "bg-emerald-500/10 text-emerald-600"
                              : log.status === "rate_limited"
                              ? "bg-amber-500/10 text-amber-600"
                              : log.status === "delayed"
                              ? "bg-blue-500/10 text-blue-600"
                              : "bg-red-500/10 text-red-600"
                          }`}
                        >
                          {log.status.toUpperCase()}
                        </span>
                        <span className="font-semibold text-gray-900 dark:text-white">
                          {log.nodeLabel}
                        </span>
                      </div>
                      <span className="text-[10px] text-gray-400">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="mt-1 font-sans text-xs text-gray-600 dark:text-gray-300">
                      {log.message}
                    </p>
                  </div>
                ))
              )}
            </div>

            <div className="flex justify-end pt-3 border-t border-gray-100 dark:border-gray-800">
              <button
                type="button"
                onClick={() => setShowRunnerLogsModal(false)}
                className="rounded-lg bg-gray-100 px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
