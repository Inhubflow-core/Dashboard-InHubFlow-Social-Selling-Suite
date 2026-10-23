"use client";

import React, { useState, useEffect } from "react";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import {
  Bot,
  Brain,
  ShieldCheck,
  ShieldAlert,
  Sparkles,
  CheckCircle2,
  Clock,
  Send,
  UserCheck,
  AlertTriangle,
  Play,
  RotateCcw,
  BookOpen,
  Sliders,
  FileText,
  Plus,
  Trash2,
  Check,
  ExternalLink,
  Search,
  Eye,
  MessageSquare,
  Activity,
  Layers,
  ArrowRight,
  User,
  Building,
  Info,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import {
  SdrMode,
  SdrIntent,
  SdrActionType,
  SdrRiskLevel,
  KnowledgeSource,
  KnowledgeCategory,
  SdrPendingAction,
  SdrDecisionLog,
  PromotionGate,
  SdrAgentConfig,
  SdrStats,
} from "@/lib/sdr/types";
import {
  getStoredSdrConfig,
  saveStoredSdrConfig,
  getStoredKnowledgeSources,
  saveStoredKnowledgeSources,
  getStoredPendingActions,
  saveStoredPendingActions,
  getStoredDecisionLogs,
  addStoredDecisionLog,
  getStoredPromotionGates,
  getSdrStats,
} from "@/lib/sdr/store";
import { runSdrDecision, SdrSimulationOutput } from "@/lib/sdr/simulation-engine";
import { getVisibleAccountsForUser } from "@/lib/unipile/store";

type SdrTab =
  | "overview"
  | "approvals"
  | "knowledge"
  | "policies"
  | "simulator"
  | "gates"
  | "logs";

export default function SdrAgentPage() {
  const { currentUser, isSuperAdmin, isClientAdmin } = useAuth();
  const isMember = currentUser.role === "member";

  // Data states
  const [activeTab, setActiveTab] = useState<SdrTab>("overview");
  const [config, setConfig] = useState<SdrAgentConfig>(getStoredSdrConfig());
  const [knowledge, setKnowledge] = useState<KnowledgeSource[]>(getStoredKnowledgeSources());
  const [pendingActions, setPendingActions] = useState<SdrPendingAction[]>([]);
  const [decisionLogs, setDecisionLogs] = useState<SdrDecisionLog[]>([]);
  const [gates, setGates] = useState<PromotionGate[]>(getStoredPromotionGates());
  const [stats, setStats] = useState<SdrStats>(getSdrStats());

  // Editing state for approvals
  const [editingActionId, setEditingActionId] = useState<string | null>(null);
  const [editedReply, setEditedReply] = useState<string>("");

  // Feedback notifications
  const [notification, setNotification] = useState<string | null>(null);

  // Knowledge modal / filter state
  const [knowledgeSearch, setKnowledgeSearch] = useState("");
  const [knowledgeCategoryFilter, setKnowledgeCategoryFilter] = useState<string>("all");
  const [isAddKnowledgeOpen, setIsAddKnowledgeOpen] = useState(false);
  const [newKbTitle, setNewKbTitle] = useState("");
  const [newKbCategory, setNewKbCategory] = useState<KnowledgeCategory>("value_prop");
  const [newKbContent, setNewKbContent] = useState("");

  // Simulator state
  const [simText, setSimText] = useState("");
  const [simSender, setSimSender] = useState("Martin Rodriguez");
  const [simCompany, setSimCompany] = useState("Vortex Tech");
  const [simResult, setSimResult] = useState<SdrSimulationOutput | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);

  // Load visible pending actions based on role and account
  const refreshData = () => {
    const loadedConfig = getStoredSdrConfig();
    const loadedKnowledge = getStoredKnowledgeSources();
    const loadedLogs = getStoredDecisionLogs();
    const allPending = getStoredPendingActions();

    setConfig(loadedConfig);
    setKnowledge(loadedKnowledge);
    setDecisionLogs(loadedLogs);
    setGates(getStoredPromotionGates());
    setStats(getSdrStats());

    // Role-based filtering:
    // If member, only show actions for accounts assigned to the member
    if (isMember) {
      const visibleAccounts = getVisibleAccountsForUser(currentUser);
      const visibleIds = visibleAccounts.map((a) => a.id);
      setPendingActions(allPending.filter((a) => visibleIds.includes(a.accountId)));
    } else {
      setPendingActions(allPending);
    }
  };

  useEffect(() => {
    refreshData();
  }, [currentUser]);

  const showToast = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3500);
  };

  // Change operational mode
  const handleModeChange = (mode: SdrMode) => {
    const updated = { ...config, mode };
    setConfig(updated);
    saveStoredSdrConfig(updated);
    refreshData();
    showToast(`Modo del Asistente SDR actualizado a: ${mode.toUpperCase()}`);
  };

  // Save config
  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    saveStoredSdrConfig(config);
    refreshData();
    showToast("Configuraciones y políticas del Asistente SDR guardadas con éxito.");
  };

  // Approve action
  const handleApproveAction = (action: SdrPendingAction) => {
    const allActions = getStoredPendingActions();
    const replyToSend =
      editingActionId === action.id ? editedReply : action.suggestedReply;

    const updated = allActions.filter((a) => a.id !== action.id);
    saveStoredPendingActions(updated);

    // Add to audit log
    addStoredDecisionLog({
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      prospectName: action.prospectName,
      accountId: action.accountId,
      inboundText: action.lastInboundMessage,
      intent: action.intent,
      confidence: action.confidence,
      riskLevel: action.riskLevel,
      action: "answer",
      tokensUsed: 440,
      latencyMs: 180,
      status: "executed",
    });

    // Despachar a LinkedIn vía API / Unipile (modo sandbox o live)
    fetch('/api/unipile/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chatId: action.threadId || 'conv-1',
        text: replyToSend,
        accountId: action.accountId,
      }),
    }).catch((err) => console.warn('[SDR] Error despachando a Unipile:', err));

    setEditingActionId(null);
    setEditedReply("");
    refreshData();
    showToast(`Respuesta aprobada y despachada a LinkedIn para ${action.prospectName}.`);
  };

  // Reject / Dismiss action
  const handleRejectAction = (actionId: string) => {
    const allActions = getStoredPendingActions();
    const updated = allActions.filter((a) => a.id !== actionId);
    saveStoredPendingActions(updated);
    setEditingActionId(null);
    refreshData();
    showToast("Acción descartada de la cola de aprobaciones.");
  };

  // Escalate to human (Handoff)
  const handleHandoffAction = (action: SdrPendingAction) => {
    const allActions = getStoredPendingActions();
    const updated = allActions.filter((a) => a.id !== action.id);
    saveStoredPendingActions(updated);

    addStoredDecisionLog({
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      prospectName: action.prospectName,
      accountId: action.accountId,
      inboundText: action.lastInboundMessage,
      intent: action.intent,
      confidence: action.confidence,
      riskLevel: "medium",
      action: "handoff",
      tokensUsed: 310,
      latencyMs: 150,
      status: "handed_off",
    });

    refreshData();
    showToast(`Conversación con ${action.prospectName} transferida a control humano.`);
  };

  // Add knowledge source
  const handleAddKnowledge = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKbTitle.trim() || !newKbContent.trim()) return;

    const newSource: KnowledgeSource = {
      id: `kb-${Date.now()}`,
      title: newKbTitle.trim(),
      category: newKbCategory,
      content: newKbContent.trim(),
      status: "approved",
      updatedAt: new Date().toISOString(),
    };

    const updated = [newSource, ...knowledge];
    saveStoredKnowledgeSources(updated);
    setKnowledge(updated);
    setIsAddKnowledgeOpen(false);
    setNewKbTitle("");
    setNewKbContent("");
    refreshData();
    showToast("Documento de conocimiento guardado y aprobado.");
  };

  // Delete knowledge source
  const handleDeleteKnowledge = (id: string) => {
    const updated = knowledge.filter((k) => k.id !== id);
    saveStoredKnowledgeSources(updated);
    setKnowledge(updated);
    refreshData();
    showToast("Documento de conocimiento eliminado.");
  };

  // Run Simulator
  const handleRunSimulation = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!simText.trim()) return;

    setIsSimulating(true);
    setTimeout(() => {
      const output = runSdrDecision({
        inboundText: simText,
        senderName: simSender,
        senderCompany: simCompany,
        config,
        knowledgeSources: knowledge.filter((k) => k.status === "approved"),
      });
      setSimResult(output);
      setIsSimulating(false);
    }, 320);
  };

  // Filtered knowledge
  const filteredKnowledge = knowledge.filter((k) => {
    const matchesSearch =
      k.title.toLowerCase().includes(knowledgeSearch.toLowerCase()) ||
      k.content.toLowerCase().includes(knowledgeSearch.toLowerCase());
    const matchesCategory =
      knowledgeCategoryFilter === "all" || k.category === knowledgeCategoryFilter;
    return matchesSearch && matchesCategory;
  });

  const getModeBadge = (mode: SdrMode) => {
    switch (mode) {
      case "auto":
        return {
          label: "Autónomo Seguro",
          bg: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
          desc: "Responde automáticamente si confianza >= umbral y riesgo = bajo.",
        };
      case "approval":
        return {
          label: "Supervisión / Aprobación",
          bg: "bg-[#0099ff]/10 text-[#0099ff] border-[#0099ff]/20",
          desc: "Genera borradores y requiere aprobación humana de un clic.",
        };
      case "shadow":
        return {
          label: "Modo Sombra",
          bg: "bg-amber-500/10 text-amber-600 border-amber-500/20",
          desc: "Analiza y genera decisiones internamente sin enviar nada al lead.",
        };
      case "off":
        return {
          label: "Desactivado",
          bg: "bg-gray-500/10 text-gray-500 border-gray-500/20",
          desc: "El agente SDR está pausado y no procesa mensajes entrantes.",
        };
    }
  };

  const getIntentBadge = (intent: SdrIntent) => {
    switch (intent) {
      case "meeting_request":
        return { label: "Petición de Reunión", color: "bg-emerald-500/10 text-emerald-600" };
      case "pricing_question":
        return { label: "Consulta de Precios", color: "bg-blue-500/10 text-blue-600" };
      case "objection":
        return { label: "Manejo de Objeción", color: "bg-amber-500/10 text-amber-600" };
      case "interested":
        return { label: "Interés Positivo", color: "bg-purple-500/10 text-purple-600" };
      case "human_requested":
        return { label: "Pide Humano", color: "bg-red-500/10 text-red-600" };
      case "unsubscribe":
        return { label: "Baja / Opt-Out", color: "bg-gray-500/10 text-gray-600" };
      default:
        return { label: intent.replace("_", " "), color: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300" };
    }
  };

  const currentModeInfo = getModeBadge(config.mode);

  return (
    <div className="space-y-6">
      <PageBreadcrumb pageTitle="Asistente SDR IA" />

      {/* Notificación Toast */}
      {notification && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-3.5 text-sm font-medium text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 className="size-4 shrink-0" />
          <span>{notification}</span>
        </div>
      )}

      {/* Header del Agente & Selector de Modo Operativo */}
      <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900 lg:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-[#0099ff]/10 text-[#0099ff]">
              <Bot className="size-6" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <h2 className="text-base font-medium text-gray-800 dark:text-white/90">
                  {config.name}
                </h2>
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-0.5 text-xs font-semibold ${currentModeInfo.bg}`}
                >
                  <span className="size-1.5 rounded-full bg-current" />
                  {currentModeInfo.label}
                </span>
                <span className="rounded-lg border border-gray-200 bg-gray-50 px-2 py-0.5 text-xs text-gray-600 dark:border-gray-800 dark:bg-gray-800 dark:text-gray-300">
                  Modelo: {config.model}
                </span>
              </div>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Procesa respuestas de LinkedIn en tiempo real, clasifica intención con Gemini, responde con base en conocimiento aprobado y agenda llamadas en el calendario empresarial.
              </p>
            </div>
          </div>

          {/* Selector de Modo */}
          {!isMember && (
            <div className="flex flex-col gap-1.5 sm:items-end">
              <span className="text-xs leading-5 font-normal tracking-normal text-gray-400 uppercase">
                Modo Operativo
              </span>
              <div className="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-1 dark:border-gray-800 dark:bg-gray-800/60">
                {(["off", "shadow", "approval", "auto"] as SdrMode[]).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => handleModeChange(mode)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                      config.mode === mode
                        ? "bg-[#0099ff] text-white shadow-xs"
                        : "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                    }`}
                  >
                    {mode === "off" && "Pausado"}
                    {mode === "shadow" && "Sombra"}
                    {mode === "approval" && "Supervisión"}
                    {mode === "auto" && "Autónomo"}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Métricas Clave */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
          <div className="text-xs leading-5 font-normal tracking-normal text-gray-400 uppercase">Decisiones IA</div>
          <div className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
            {stats.totalDecisions}
          </div>
          <div className="mt-1 flex items-center gap-1 text-xs text-emerald-600">
            <CheckCircle2 className="size-3" />
            <span>100% auditadas</span>
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
          <div className="text-xs leading-5 font-normal tracking-normal text-gray-400 uppercase">Confianza Media</div>
          <div className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
            {stats.averageConfidence}%
          </div>
          <div className="mt-1 text-xs text-gray-500">Umbral mín: 85%</div>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
          <div className="text-xs leading-5 font-normal tracking-normal text-gray-400 uppercase">Por Aprobar</div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-[#0099ff]">
              {pendingActions.filter((a) => a.status === "pending").length}
            </span>
            <span className="text-xs text-gray-500">en cola</span>
          </div>
          <div className="mt-1 text-xs text-blue-600">Human-in-the-loop</div>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
          <div className="text-xs leading-5 font-normal tracking-normal text-gray-400 uppercase">Handoffs a Humano</div>
          <div className="mt-2 text-2xl font-bold text-amber-600">
            {stats.handoffCount}
          </div>
          <div className="mt-1 text-xs text-gray-500">Protección activa</div>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
          <div className="text-xs leading-5 font-normal tracking-normal text-gray-400 uppercase">Envíos Autónomos</div>
          <div className="mt-2 text-2xl font-bold text-emerald-600">
            {stats.autonomousRepliesSent}
          </div>
          <div className="mt-1 text-xs text-gray-500">Cero alucinaciones</div>
        </div>
      </div>

      {/* Navegación por Pestañas */}
      <div className="flex overflow-x-auto border-b border-gray-200 pb-px dark:border-gray-800">
        <div className="flex gap-2">
          {[
            { key: "overview", label: "Resumen & Estado", icon: Activity },
            {
              key: "approvals",
              label: `Cola de Aprobaciones (${pendingActions.filter((a) => a.status === "pending").length})`,
              icon: UserCheck,
            },
            { key: "knowledge", label: "Base de Conocimiento", icon: BookOpen },
            { key: "policies", label: "Políticas & Configuración", icon: Sliders },
            { key: "simulator", label: "Simulador Interactivo", icon: Play },
            { key: "gates", label: "Puertas de Seguridad", icon: ShieldCheck },
            { key: "logs", label: "Registro de Auditoría", icon: FileText },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as SdrTab)}
                className={`inline-flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors ${
                  isActive
                    ? "border-[#0099ff] text-[#0099ff]"
                    : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                }`}
              >
                <Icon className="size-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── TAB 1: OVERVIEW ── */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Estado del Pipeline SDR */}
            <div className="space-y-4 rounded-lg border border-gray-200 bg-white p-6 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900 lg:col-span-2">
              <h3 className="text-base font-medium text-gray-800 dark:text-white/90">
                Ciclo de Vida de Mensajes Entrantes
              </h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Cada respuesta entrante en LinkedIn se analiza siguiendo el flujo determinista y seguro de InHubFlow:
              </p>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
                <div className="rounded-lg border border-gray-100 bg-gray-50/70 p-3.5 dark:border-gray-800 dark:bg-gray-800/50">
                  <div className="flex size-7 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600">
                    <MessageSquare className="size-4" />
                  </div>
                  <div className="mt-2 text-base font-medium text-gray-800 dark:text-white/90">
                    1. Captura
                  </div>
                  <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    Sincronización segura con deduplicación por message_id.
                  </div>
                </div>

                <div className="rounded-lg border border-gray-100 bg-gray-50/70 p-3.5 dark:border-gray-800 dark:bg-gray-800/50">
                  <div className="flex size-7 items-center justify-center rounded-lg bg-purple-500/10 text-purple-600">
                    <Brain className="size-4" />
                  </div>
                  <div className="mt-2 text-base font-medium text-gray-800 dark:text-white/90">
                    2. Clasificación
                  </div>
                  <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    Detección de 14 intenciones comerciales con Gemini 3.6 Flash.
                  </div>
                </div>

                <div className="rounded-lg border border-gray-100 bg-gray-50/70 p-3.5 dark:border-gray-800 dark:bg-gray-800/50">
                  <div className="flex size-7 items-center justify-center rounded-lg bg-[#0099ff]/10 text-[#0099ff]">
                    <BookOpen className="size-4" />
                  </div>
                  <div className="mt-2 text-base font-medium text-gray-800 dark:text-white/90">
                    3. RAG Aprobado
                  </div>
                  <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    Cotejo con base de conocimiento oficial (precios, objeciones).
                  </div>
                </div>

                <div className="rounded-lg border border-gray-100 bg-gray-50/70 p-3.5 dark:border-gray-800 dark:bg-gray-800/50">
                  <div className="flex size-7 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600">
                    <Send className="size-4" />
                  </div>
                  <div className="mt-2 text-base font-medium text-gray-800 dark:text-white/90">
                    4. Despacho / Handoff
                  </div>
                  <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    Cola de aprobación humana o envío seguro respetando límites.
                  </div>
                </div>
              </div>

              {/* Banner de Modo Operativo */}
              <div className="rounded-lg border border-gray-100 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-800/40">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs leading-5 font-normal tracking-normal uppercase text-gray-400">
                      Modo Operativo Vigente
                    </span>
                    <h4 className="text-base font-medium text-gray-800 dark:text-white/90">
                      {currentModeInfo.label}
                    </h4>
                  </div>
                  <span className={`rounded-full border px-3 py-1 text-xs font-medium ${currentModeInfo.bg}`}>
                    {config.mode.toUpperCase()}
                  </span>
                </div>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  {currentModeInfo.desc}
                </p>
              </div>
            </div>

            {/* Configuración Rápida / Resumen */}
            <div className="space-y-4 rounded-lg border border-gray-200 bg-white p-6 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
              <h3 className="text-base font-medium text-gray-800 dark:text-white/90">
                Parámetros de Seguridad
              </h3>

              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between border-b border-gray-100 pb-2.5 dark:border-gray-800">
                  <span className="text-gray-500">Umbral de Confianza:</span>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {Math.round(config.confidenceThreshold * 100)}%
                  </span>
                </div>

                <div className="flex items-center justify-between border-b border-gray-100 pb-2.5 dark:border-gray-800">
                  <span className="text-gray-500">Turnos Máx. Autónomos:</span>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {config.maxAutoTurns} respuestas
                  </span>
                </div>

                <div className="flex items-center justify-between border-b border-gray-100 pb-2.5 dark:border-gray-800">
                  <span className="text-gray-500">Calendario Integrado:</span>
                  <span className="font-semibold text-emerald-600">
                    {config.calendarEnabled ? "Activo (Demo 20 min)" : "Inactivo"}
                  </span>
                </div>

                <div className="flex items-center justify-between border-b border-gray-100 pb-2.5 dark:border-gray-800">
                  <span className="text-gray-500">Email de Handoff:</span>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {config.handoffEmail}
                  </span>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-gray-500">Documentos RAG:</span>
                  <span className="font-semibold text-[#0099ff]">
                    {knowledge.filter((k) => k.status === "approved").length} aprobados
                  </span>
                </div>
              </div>

              <button
                onClick={() => setActiveTab("simulator")}
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#0099ff] px-4 py-2.5 text-xs font-semibold text-white shadow-theme-xs transition hover:bg-[#0088e6]"
              >
                <Play className="size-3.5" />
                <span>Probar en el Simulador</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 2: APPROVALS QUEUE (Human-in-the-loop) ── */}
      {activeTab === "approvals" && (
        <div className="space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-base font-medium text-gray-800 dark:text-white/90">
                Cola de Aprobaciones Human-in-the-Loop
              </h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Revisa, ajusta o aprueba con un solo clic las respuestas sugeridas por el Asistente SDR antes de enviarlas al lead en LinkedIn.
              </p>
            </div>
            <div className="text-xs font-medium text-gray-500">
              Mostrando {pendingActions.filter((a) => a.status === "pending").length} acción(es) pendiente(s)
            </div>
          </div>

          {pendingActions.filter((a) => a.status === "pending").length === 0 ? (
            <div className="rounded-lg border border-dashed border-gray-300 bg-white p-12 text-center dark:border-gray-800 dark:bg-gray-900">
              <div className="mx-auto flex size-12 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600">
                <CheckCircle2 className="size-6" />
              </div>
              <h4 className="mt-3 text-base font-semibold text-gray-900 dark:text-white">
                ¡Cola de Aprobaciones al Día!
              </h4>
              <p className="mx-auto mt-1 max-w-sm text-xs text-gray-500 dark:text-gray-400">
                No hay respuestas pendientes de revisión en este momento. Los nuevos mensajes entrantes de LinkedIn aparecerán aquí automáticamente.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingActions
                .filter((a) => a.status === "pending")
                .map((action) => {
                  const intentInfo = getIntentBadge(action.intent);
                  const isEditing = editingActionId === action.id;

                  return (
                    <div
                      key={action.id}
                      className="rounded-lg border border-gray-200 bg-white p-5 shadow-theme-xs transition-all dark:border-gray-800 dark:bg-gray-900"
                    >
                      {/* Top Bar: Prospecto & Badges */}
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-gray-100 pb-4 dark:border-gray-800">
                        <div className="flex items-center gap-3">
                          <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#0099ff]/10 text-sm font-bold text-[#0099ff]">
                            {action.prospectAvatar || action.prospectName.substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="text-sm font-bold text-gray-900 dark:text-white">
                                {action.prospectName}
                              </h4>
                              <span className="text-xs text-gray-400">•</span>
                              <span className="text-xs text-gray-500">
                                {action.prospectTitle} en {action.prospectCompany}
                              </span>
                            </div>
                            <div className="mt-0.5 text-xs text-gray-400">
                              Cuenta emisora: <span className="font-medium text-gray-600 dark:text-gray-300">{action.accountName}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${intentInfo.color}`}>
                            {intentInfo.label}
                          </span>
                          <span className="rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs font-medium text-gray-600 dark:border-gray-800 dark:bg-gray-800 dark:text-gray-300">
                            Confianza: {Math.round(action.confidence * 100)}%
                          </span>
                          <span
                            className={`rounded-lg px-2 py-1 text-xs font-medium ${
                              action.riskLevel === "low"
                                ? "bg-emerald-500/10 text-emerald-600"
                                : action.riskLevel === "medium"
                                ? "bg-amber-500/10 text-amber-600"
                                : "bg-red-500/10 text-red-600"
                            }`}
                          >
                            Riesgo: {action.riskLevel.toUpperCase()}
                          </span>
                        </div>
                      </div>

                      {/* Mensaje Entrante del Lead */}
                      <div className="mt-4 rounded-lg border border-gray-100 bg-gray-50/70 p-3.5 dark:border-gray-800/80 dark:bg-gray-800/40">
                        <span className="text-xs leading-5 font-normal tracking-normal text-gray-400 uppercase">
                          Mensaje del Prospecto (LinkedIn)
                        </span>
                        <p className="mt-1 text-xs text-gray-700 dark:text-gray-200">
                          &quot;{action.lastInboundMessage}&quot;
                        </p>
                      </div>

                      {/* Respuesta Generada por IA */}
                      <div className="mt-4">
                        <div className="flex items-center justify-between pb-1.5">
                          <div className="flex items-center gap-1.5 text-xs font-semibold text-[#0099ff]">
                            <Sparkles className="size-3.5" />
                            <span>Respuesta Generada por InHubFlow Virtual SDR</span>
                          </div>
                          {!isEditing ? (
                            <button
                              onClick={() => {
                                setEditingActionId(action.id);
                                setEditedReply(action.suggestedReply);
                              }}
                              className="text-xs font-medium text-gray-500 hover:text-gray-900 dark:hover:text-white"
                            >
                              Editar texto
                            </button>
                          ) : (
                            <button
                              onClick={() => setEditingActionId(null)}
                              className="text-xs font-medium text-gray-400 hover:text-gray-600"
                            >
                              Cancelar edición
                            </button>
                          )}
                        </div>

                        {isEditing ? (
                          <textarea
                            value={editedReply}
                            onChange={(e) => setEditedReply(e.target.value)}
                            rows={4}
                            className="w-full rounded-lg border border-[#0099ff] bg-white p-3 text-xs text-gray-900 focus:outline-hidden dark:bg-gray-950 dark:text-white"
                          />
                        ) : (
                          <div className="rounded-lg border border-[#0099ff]/20 bg-[#0099ff]/5 p-3.5 text-xs text-gray-800 whitespace-pre-wrap dark:text-gray-200">
                            {action.suggestedReply}
                          </div>
                        )}

                        {/* Citas de conocimiento */}
                        {action.citations.length > 0 && (
                          <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-gray-400">
                            <BookOpen className="size-3" />
                            <span>Fundamentado en:</span>
                            {action.citations.map((cite, idx) => (
                              <span
                                key={idx}
                                className="rounded-lg bg-gray-100 px-1.5 py-0.5 font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-300"
                              >
                                {cite}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Acciones */}
                      <div className="mt-5 flex flex-wrap items-center justify-end gap-2.5 border-t border-gray-100 pt-3.5 dark:border-gray-800">
                        <button
                          onClick={() => handleRejectAction(action.id)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-600 transition hover:bg-gray-50 dark:border-gray-800 dark:text-gray-300 dark:hover:bg-gray-800"
                        >
                          <Trash2 className="size-3.5" />
                          <span>Descartar</span>
                        </button>

                        <button
                          onClick={() => handleHandoffAction(action)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs font-medium text-amber-600 transition hover:bg-amber-500/20"
                        >
                          <ShieldAlert className="size-3.5" />
                          <span>Escalar a Humano</span>
                        </button>

                        <button
                          onClick={() => handleApproveAction(action)}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-[#0099ff] px-4 py-2 text-xs font-semibold text-white shadow-theme-xs transition hover:bg-[#0088e6]"
                        >
                          <Send className="size-3.5" />
                          <span>Aprobar & Enviar a LinkedIn</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      )}

      {/* ── TAB 3: KNOWLEDGE BASE ── */}
      {activeTab === "knowledge" && (
        <div className="space-y-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-base font-medium text-gray-800 dark:text-white/90">
                Base de Conocimiento Aprobada (RAG)
              </h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                La IA únicamente responde dudas basándose en estos documentos oficiales, previniendo alucinaciones comerciales.
              </p>
            </div>
            {!isMember && (
              <button
                onClick={() => setIsAddKnowledgeOpen(true)}
                className="inline-flex items-center gap-2 rounded-lg bg-[#0099ff] px-4 py-2 text-xs font-semibold text-white shadow-theme-xs transition hover:bg-[#0088e6]"
              >
                <Plus className="size-3.5" />
                <span>Agregar Documento</span>
              </button>
            )}
          </div>

          {/* Filtros de conocimiento */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar en la base de conocimiento..."
                value={knowledgeSearch}
                onChange={(e) => setKnowledgeSearch(e.target.value)}
                className="w-full rounded-lg border border-gray-200 bg-white py-2 pr-4 pl-9 text-xs text-gray-900 focus:outline-hidden dark:border-gray-800 dark:bg-gray-900 dark:text-white"
              />
            </div>

            <div className="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-1 dark:border-gray-800 dark:bg-gray-800/60">
              {[
                { key: "all", label: "Todos" },
                { key: "value_prop", label: "Propuesta" },
                { key: "pricing", label: "Precios" },
                { key: "objections", label: "Objeciones" },
                { key: "company", label: "Protocolos" },
              ].map((cat) => (
                <button
                  key={cat.key}
                  onClick={() => setKnowledgeCategoryFilter(cat.key)}
                  className={`rounded-lg px-3 py-1 text-xs font-medium transition-colors ${
                    knowledgeCategoryFilter === cat.key
                      ? "bg-[#0099ff] text-white shadow-xs"
                      : "text-gray-600 hover:text-gray-900 dark:text-gray-400"
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Listado de Documentos */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {filteredKnowledge.map((item) => (
              <div
                key={item.id}
                className="flex flex-col justify-between rounded-lg border border-gray-200 bg-white p-5 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className="rounded-lg bg-[#0099ff]/10 px-2 py-0.5 text-xs font-semibold text-[#0099ff] uppercase">
                        {item.category.replace("_", " ")}
                      </span>
                      <h4 className="mt-2 text-base font-medium text-gray-800 dark:text-white/90">
                        {item.title}
                      </h4>
                    </div>
                    {!isMember && (
                      <button
                        onClick={() => handleDeleteKnowledge(item.id)}
                        className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-red-600 dark:hover:bg-gray-800"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 whitespace-pre-wrap">
                    {item.content}
                  </p>
                </div>
                <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-3 text-xs text-gray-400 dark:border-gray-800">
                  <span className="inline-flex items-center gap-1 text-emerald-600">
                    <CheckCircle2 className="size-3" />
                    Estado: {item.status.toUpperCase()}
                  </span>
                  <span>Actualizado: {new Date(item.updatedAt).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Modal Agregar Documento */}
          {isAddKnowledgeOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
              <div className="w-full max-w-lg rounded-lg border border-gray-200 bg-white p-6 shadow-xl dark:border-gray-800 dark:bg-gray-900">
                <h4 className="text-base font-bold text-gray-900 dark:text-white">
                  Agregar Documento a la Base de Conocimiento
                </h4>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Ingresa las políticas o respuestas aprobadas que la IA podrá citar en LinkedIn.
                </p>

                <form onSubmit={handleAddKnowledge} className="mt-4 space-y-4">
                  <div>
                    <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                      Título del Documento
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ej: Política de Reembolso o Tarifas de Implementación"
                      value={newKbTitle}
                      onChange={(e) => setNewKbTitle(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-gray-200 bg-white p-2.5 text-xs text-gray-900 focus:outline-hidden dark:border-gray-800 dark:bg-gray-950 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                      Categoría
                    </label>
                    <select
                      value={newKbCategory}
                      onChange={(e) => setNewKbCategory(e.target.value as KnowledgeCategory)}
                      className="mt-1 w-full rounded-lg border border-gray-200 bg-white p-2.5 text-xs text-gray-900 focus:outline-hidden dark:border-gray-800 dark:bg-gray-950 dark:text-white"
                    >
                      <option value="value_prop">Propuesta de Valor</option>
                      <option value="pricing">Precios y Tarifas</option>
                      <option value="objections">Manejo de Objeciones</option>
                      <option value="faqs">Preguntas Frecuentes (FAQs)</option>
                      <option value="company">Protocolos y Políticas</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                      Contenido Explicativo
                    </label>
                    <textarea
                      required
                      rows={5}
                      placeholder="Redacta la información detallada que el agente usará para responder..."
                      value={newKbContent}
                      onChange={(e) => setNewKbContent(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-gray-200 bg-white p-2.5 text-xs text-gray-900 focus:outline-hidden dark:border-gray-800 dark:bg-gray-950 dark:text-white"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2.5 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsAddKnowledgeOpen(false)}
                      className="rounded-lg border border-gray-200 px-4 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50 dark:border-gray-800 dark:text-gray-300"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="rounded-lg bg-[#0099ff] px-4 py-2 text-xs font-semibold text-white hover:bg-[#0088e6]"
                    >
                      Guardar Documento
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── TAB 4: POLICIES & CONFIG ── */}
      {activeTab === "policies" && (
        <form onSubmit={handleSaveConfig} className="space-y-6">
          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
            <h3 className="text-base font-medium text-gray-800 dark:text-white/90">
              Identidad y Parámetros del Asistente SDR
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Personaliza el comportamiento, tono de comunicación y umbrales de seguridad de la IA.
            </p>

            <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2">
              <div>
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                  Nombre del Agente
                </label>
                <input
                  type="text"
                  disabled={isMember}
                  value={config.name}
                  onChange={(e) => setConfig({ ...config, name: e.target.value })}
                  className="mt-1.5 w-full rounded-lg border border-gray-200 bg-white p-2.5 text-xs text-gray-900 focus:outline-hidden disabled:bg-gray-50 dark:border-gray-800 dark:bg-gray-950 dark:text-white"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                  Modelo LLM (Gemini Engine)
                </label>
                <input
                  type="text"
                  disabled
                  value={config.model}
                  className="mt-1.5 w-full rounded-lg border border-gray-200 bg-gray-50 p-2.5 text-xs text-gray-500 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400"
                />
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                    Umbral Mínimo de Confianza
                  </label>
                  <span className="text-xs font-bold text-[#0099ff]">
                    {Math.round(config.confidenceThreshold * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0.70"
                  max="0.95"
                  step="0.01"
                  disabled={isMember}
                  value={config.confidenceThreshold}
                  onChange={(e) =>
                    setConfig({ ...config, confidenceThreshold: parseFloat(e.target.value) })
                  }
                  className="mt-2.5 w-full accent-[#0099ff]"
                />
                <span className="text-xs text-gray-400">
                  Cualquier respuesta con confianza inferior se desviará automáticamente a un humano.
                </span>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                  Turnos Máximos de Auto-Respuesta
                </label>
                <input
                  type="number"
                  min="1"
                  max="6"
                  disabled={isMember}
                  value={config.maxAutoTurns}
                  onChange={(e) =>
                    setConfig({ ...config, maxAutoTurns: parseInt(e.target.value, 10) || 3 })
                  }
                  className="mt-1.5 w-full rounded-lg border border-gray-200 bg-white p-2.5 text-xs text-gray-900 focus:outline-hidden disabled:bg-gray-50 dark:border-gray-800 dark:bg-gray-950 dark:text-white"
                />
                <span className="text-xs text-gray-400">
                  Tras este número de respuestas consecutivas, el lead pasa a un humano.
                </span>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                  Enlace de Agendamiento de Reuniones
                </label>
                <input
                  type="text"
                  disabled={isMember}
                  value={config.bookingLink || ""}
                  onChange={(e) => setConfig({ ...config, bookingLink: e.target.value })}
                  placeholder="https://cal.inhubflow.com/demo-20min"
                  className="mt-1.5 w-full rounded-lg border border-gray-200 bg-white p-2.5 text-xs text-gray-900 focus:outline-hidden disabled:bg-gray-50 dark:border-gray-800 dark:bg-gray-950 dark:text-white"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                  Email de Notificación de Handoff
                </label>
                <input
                  type="email"
                  disabled={isMember}
                  value={config.handoffEmail}
                  onChange={(e) => setConfig({ ...config, handoffEmail: e.target.value })}
                  className="mt-1.5 w-full rounded-lg border border-gray-200 bg-white p-2.5 text-xs text-gray-900 focus:outline-hidden disabled:bg-gray-50 dark:border-gray-800 dark:bg-gray-950 dark:text-white"
                />
              </div>
            </div>

            <div className="mt-5 space-y-4">
              <div>
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                  System Prompt (Instrucción Base)
                </label>
                <textarea
                  rows={3}
                  disabled={isMember}
                  value={config.systemPrompt}
                  onChange={(e) => setConfig({ ...config, systemPrompt: e.target.value })}
                  className="mt-1.5 w-full rounded-lg border border-gray-200 bg-white p-3 text-xs text-gray-900 focus:outline-hidden disabled:bg-gray-50 dark:border-gray-800 dark:bg-gray-950 dark:text-white"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                  Instrucciones Personalizadas de Venta
                </label>
                <textarea
                  rows={3}
                  disabled={isMember}
                  value={config.customInstructions}
                  onChange={(e) => setConfig({ ...config, customInstructions: e.target.value })}
                  className="mt-1.5 w-full rounded-lg border border-gray-200 bg-white p-3 text-xs text-gray-900 focus:outline-hidden disabled:bg-gray-50 dark:border-gray-800 dark:bg-gray-950 dark:text-white"
                />
              </div>
            </div>

            {!isMember && (
              <div className="mt-6 flex justify-end">
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 rounded-lg bg-[#0099ff] px-5 py-2.5 text-xs font-semibold text-white shadow-theme-xs transition hover:bg-[#0088e6]"
                >
                  <Check className="size-4" />
                  <span>Guardar Políticas & Configuración</span>
                </button>
              </div>
            )}
          </div>
        </form>
      )}

      {/* ── TAB 5: SIMULATOR (Playground) ── */}
      {activeTab === "simulator" && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Panel Izquierdo: Entrada de Prueba */}
          <div className="space-y-4 rounded-lg border border-gray-200 bg-white p-6 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
            <div>
              <h3 className="text-base font-medium text-gray-800 dark:text-white/90">
                Simulador Interactivo de Decisión
              </h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Escribe un mensaje de prueba como si fueras un prospecto en LinkedIn para verificar cómo clasifica y responde el SDR.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                  Nombre del Lead
                </label>
                <input
                  type="text"
                  value={simSender}
                  onChange={(e) => setSimSender(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-200 bg-white p-2 text-xs text-gray-900 focus:outline-hidden dark:border-gray-800 dark:bg-gray-950 dark:text-white"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                  Empresa del Lead
                </label>
                <input
                  type="text"
                  value={simCompany}
                  onChange={(e) => setSimCompany(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-200 bg-white p-2 text-xs text-gray-900 focus:outline-hidden dark:border-gray-800 dark:bg-gray-950 dark:text-white"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                Mensaje Entrante de LinkedIn
              </label>
              <textarea
                rows={4}
                value={simText}
                onChange={(e) => setSimText(e.target.value)}
                placeholder="Ejemplo: 'Hola, me llamó la atención su herramienta. ¿Cuánto cuesta para 5 personas de mi equipo?'"
                className="mt-1.5 w-full rounded-lg border border-gray-200 bg-white p-3 text-xs text-gray-900 focus:outline-hidden dark:border-gray-800 dark:bg-gray-950 dark:text-white"
              />
            </div>

            {/* Ejemplos Rápidos */}
            <div>
              <span className="text-xs leading-5 font-normal tracking-normal text-gray-400 uppercase">
                Probar Casos de Uso Frecuentes
              </span>
              <div className="mt-2 flex flex-wrap gap-2">
                {[
                  "¿Cuánto cuesta para 5 cuentas de mi equipo?",
                  "Ya usamos Waalaxy, ¿qué tienen de diferente?",
                  "Me interesa tener una llamada esta semana para verlo en vivo.",
                  "Por favor remuéveme de tu lista de contactos.",
                  "Quiero hablar con una persona de soporte por teléfono.",
                ].map((sample, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setSimText(sample);
                    }}
                    className="rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs text-gray-600 transition hover:border-[#0099ff] hover:text-[#0099ff] dark:border-gray-800 dark:bg-gray-800 dark:text-gray-300"
                  >
                    {sample}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={() => handleRunSimulation()}
              disabled={isSimulating || !simText.trim()}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#0099ff] px-4 py-2.5 text-xs font-semibold text-white shadow-theme-xs transition hover:bg-[#0088e6] disabled:opacity-50"
            >
              {isSimulating ? (
                <span>Evaluando con Gemini...</span>
              ) : (
                <>
                  <Sparkles className="size-3.5" />
                  <span>Simular Decisión IA</span>
                </>
              )}
            </button>
          </div>

          {/* Panel Derecho: Resultado de la Simulación */}
          <div className="space-y-4 rounded-lg border border-gray-200 bg-white p-6 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
            <h3 className="text-base font-medium text-gray-800 dark:text-white/90">
              Análisis y Respuesta de la IA
            </h3>

            {!simResult ? (
              <div className="rounded-lg border border-dashed border-gray-300 p-10 text-center dark:border-gray-800">
                <Brain className="mx-auto size-8 text-gray-400" />
                <p className="mt-2 text-xs text-gray-500">
                  Ingresa o selecciona un mensaje a la izquierda y presiona &quot;Simular Decisión IA&quot; para ver la clasificación en tiempo real.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Badges de Decisión */}
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <div className="rounded-lg border border-gray-100 bg-gray-50 p-2.5 dark:border-gray-800 dark:bg-gray-800/50">
                    <div className="text-xs leading-5 font-normal tracking-normal text-gray-400 uppercase">Intención</div>
                    <div className="mt-1 text-xs font-bold text-gray-900 dark:text-white">
                      {simResult.intent}
                    </div>
                  </div>

                  <div className="rounded-lg border border-gray-100 bg-gray-50 p-2.5 dark:border-gray-800 dark:bg-gray-800/50">
                    <div className="text-xs leading-5 font-normal tracking-normal text-gray-400 uppercase">Confianza</div>
                    <div className="mt-1 text-xs font-bold text-[#0099ff]">
                      {Math.round(simResult.confidence * 100)}%
                    </div>
                  </div>

                  <div className="rounded-lg border border-gray-100 bg-gray-50 p-2.5 dark:border-gray-800 dark:bg-gray-800/50">
                    <div className="text-xs leading-5 font-normal tracking-normal text-gray-400 uppercase">Acción</div>
                    <div className="mt-1 text-xs font-bold text-emerald-600">
                      {simResult.recommendedAction}
                    </div>
                  </div>

                  <div className="rounded-lg border border-gray-100 bg-gray-50 p-2.5 dark:border-gray-800 dark:bg-gray-800/50">
                    <div className="text-xs leading-5 font-normal tracking-normal text-gray-400 uppercase">Latencia</div>
                    <div className="mt-1 text-xs font-bold text-gray-700 dark:text-gray-300">
                      {simResult.latencyMs} ms
                    </div>
                  </div>
                </div>

                {/* Razonamiento */}
                <div className="rounded-lg border border-gray-100 bg-gray-50 p-3 dark:border-gray-800 dark:bg-gray-800/40">
                  <span className="text-xs leading-5 font-normal tracking-normal text-gray-400 uppercase">
                    Resumen de Razonamiento
                  </span>
                  <p className="mt-1 text-xs text-gray-600 dark:text-gray-300">
                    {simResult.reasoningSummary}
                  </p>
                </div>

                {/* Borrador Generado */}
                <div>
                  <span className="text-xs leading-5 font-normal tracking-normal text-gray-400 uppercase">
                    Borrador de Respuesta Sugerida
                  </span>
                  <div className="mt-1.5 rounded-lg border border-[#0099ff]/20 bg-[#0099ff]/5 p-3.5 text-xs text-gray-800 whitespace-pre-wrap dark:text-gray-200">
                    {simResult.replyDraft}
                  </div>
                </div>

                {/* Citas */}
                {simResult.citations.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 text-xs text-gray-500">
                    <BookOpen className="size-3 text-[#0099ff]" />
                    <span>Citas aplicadas:</span>
                    {simResult.citations.map((c, i) => (
                      <span
                        key={i}
                        className="rounded-lg bg-gray-100 px-1.5 py-0.5 font-medium text-gray-700 dark:bg-gray-800 dark:text-gray-300"
                      >
                        {c}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── TAB 6: PROMOTION GATES ── */}
      {activeTab === "gates" && (
        <div className="space-y-4">
          <div className="flex flex-col gap-1">
            <h3 className="text-base font-medium text-gray-800 dark:text-white/90">
              Puertas de Seguridad para Promoción a Modo Autónomo
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Estas reglas de validación garantizan que el Asistente SDR opere con máxima protección antes de permitir respuestas autónomas.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {gates.map((gate) => (
              <div
                key={gate.key}
                className="flex items-start justify-between rounded-lg border border-gray-200 bg-white p-5 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900"
              >
                <div className="flex items-start gap-3.5">
                  <div
                    className={`flex size-10 shrink-0 items-center justify-center rounded-lg ${
                      gate.passed
                        ? "bg-emerald-500/10 text-emerald-600"
                        : "bg-red-500/10 text-red-600"
                    }`}
                  >
                    {gate.passed ? (
                      <CheckCircle2 className="size-5" />
                    ) : (
                      <AlertTriangle className="size-5" />
                    )}
                  </div>
                  <div>
                    <h4 className="text-base font-medium text-gray-800 dark:text-white/90">
                      {gate.label}
                    </h4>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      {gate.description}
                    </p>
                    <div className="mt-2.5 inline-flex items-center gap-1.5 rounded-lg border border-gray-100 bg-gray-50 px-2.5 py-1 text-xs font-medium text-gray-700 dark:border-gray-800 dark:bg-gray-800 dark:text-gray-300">
                      <span className="font-semibold text-[#0099ff]">Evidencia técnica:</span>
                      <span>{gate.evidence}</span>
                    </div>
                  </div>
                </div>

                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    gate.passed
                      ? "bg-emerald-500/10 text-emerald-600"
                      : "bg-red-500/10 text-red-600"
                  }`}
                >
                  {gate.passed ? "CUMPLIDO" : "PENDIENTE"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── TAB 7: AUDIT LOGS ── */}
      {activeTab === "logs" && (
        <div className="space-y-4">
          <div className="flex flex-col gap-1">
            <h3 className="text-base font-medium text-gray-800 dark:text-white/90">
              Registro de Auditoría de Decisiones (Audit Trail)
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Historial completo de mensajes procesados, intenciones clasificadas y consumo de tokens.
            </p>
          </div>

          <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-gray-100 bg-gray-50/75 text-xs leading-5 font-normal tracking-normal text-gray-400 uppercase [&_th]:font-normal dark:border-gray-800 dark:bg-gray-800/50">
                <tr>
                  <th className="px-4 py-3">Fecha & Hora</th>
                  <th className="px-4 py-3">Prospecto</th>
                  <th className="px-4 py-3">Mensaje Entrante</th>
                  <th className="px-4 py-3">Intención</th>
                  <th className="px-4 py-3">Confianza</th>
                  <th className="px-4 py-3">Acción</th>
                  <th className="px-4 py-3">Latencia</th>
                  <th className="px-4 py-3">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {decisionLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-850">
                    <td className="px-4 py-3 text-gray-500">
                      {new Date(log.timestamp).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="px-4 py-3 font-semibold text-gray-900 dark:text-white">
                      {log.prospectName}
                    </td>
                    <td className="max-w-xs truncate px-4 py-3 text-gray-600 dark:text-gray-300">
                      {log.inboundText}
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-lg bg-blue-500/10 px-2 py-0.5 text-xs font-semibold text-blue-600">
                        {log.intent}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium text-[#0099ff]">
                      {Math.round(log.confidence * 100)}%
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-700 dark:text-gray-300">
                      {log.action}
                    </td>
                    <td className="px-4 py-3 text-gray-500">{log.latencyMs}ms</td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-semibold uppercase ${
                          log.status === "executed"
                            ? "bg-emerald-500/10 text-emerald-600"
                            : log.status === "queued_for_approval"
                            ? "bg-[#0099ff]/10 text-[#0099ff]"
                            : "bg-amber-500/10 text-amber-600"
                        }`}
                      >
                        {log.status.replace(/_/g, " ")}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
