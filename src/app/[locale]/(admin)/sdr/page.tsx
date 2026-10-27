"use client";

import React, { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
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
import { sendMessageToConversation } from "@/lib/inbox/store";

type SdrTab =
  | "overview"
  | "approvals"
  | "knowledge"
  | "policies"
  | "simulator"
  | "gates"
  | "logs";

export default function SdrAgentPage() {
  const t = useTranslations("sdr");
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
    showToast(t("toastModeUpdated", { mode: mode.toUpperCase() }));
  };

  // Save config
  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    saveStoredSdrConfig(config);
    refreshData();
    showToast(t("toastConfigSaved"));
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
    showToast(t("toastApproved", { name: action.prospectName }));
  };

  // Reject / Dismiss action
  const handleRejectAction = (actionId: string) => {
    const allActions = getStoredPendingActions();
    const updated = allActions.filter((a) => a.id !== actionId);
    saveStoredPendingActions(updated);
    setEditingActionId(null);
    refreshData();
    showToast(t("toastDiscarded"));
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
    showToast(t("toastHandoff", { name: action.prospectName }));
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
          label: t("modeBadgeAuto"),
          bg: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
          desc: t("modeBadgeAutoDesc"),
        };
      case "copilot":
      case "approval":
        return {
          label: t("modeBadgeCopilot"),
          bg: "bg-[#0099ff]/10 text-[#0099ff] border-[#0099ff]/20",
          desc: t("modeBadgeCopilotDesc"),
        };
      case "shadow":
        return {
          label: t("modeBadgeShadow"),
          bg: "bg-amber-500/10 text-amber-600 border-amber-500/20",
          desc: t("modeBadgeShadowDesc"),
        };
      case "off":
      default:
        return {
          label: t("modeBadgeOff"),
          bg: "bg-gray-500/10 text-gray-500 border-gray-500/20",
          desc: t("modeBadgeOffDesc"),
        };
    }
  };

  const getIntentBadge = (intent: SdrIntent) => {
    switch (intent) {
      case "meeting_request":
        return { label: t("intentMeeting"), color: "bg-emerald-500/10 text-emerald-600" };
      case "pricing_question":
        return { label: t("intentPricing"), color: "bg-blue-500/10 text-blue-600" };
      case "objection":
        return { label: t("intentObjection"), color: "bg-amber-500/10 text-amber-600" };
      case "interested":
        return { label: t("intentInterested"), color: "bg-purple-500/10 text-purple-600" };
      case "human_requested":
        return { label: t("intentHuman"), color: "bg-red-500/10 text-red-600" };
      case "unsubscribe":
        return { label: t("intentUnsubscribe"), color: "bg-gray-500/10 text-gray-600" };
      default:
        return { label: intent.replace("_", " "), color: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300" };
    }
  };

  const currentModeInfo = getModeBadge(config.mode);

  return (
    <div className="w-full space-y-6">
      <PageBreadcrumb pageTitle={t("pageTitle")} />

      {/* Notificación Toast */}
      {notification && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-3.5 text-sm font-medium text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 className="size-4 shrink-0" />
          <span>{notification}</span>
        </div>
      )}

      {/* Header del Agente & Selector de Modo Operativo */}
      <div className="rounded-lg border border-gray-300 bg-white p-5 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900 lg:p-6">
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
                <span className="rounded-lg border border-gray-300 bg-gray-50 px-2 py-0.5 text-xs text-gray-600 dark:border-gray-800 dark:bg-gray-800 dark:text-gray-300">
                  {t("model", { model: config.model })}
                </span>
              </div>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {t("headerDesc")}
              </p>
            </div>
          </div>

          {/* Selector de Modo */}
          {!isMember && (
            <div className="flex flex-col gap-1.5 sm:items-end">
              <span className="text-xs leading-5 font-normal tracking-normal text-gray-400 uppercase">
                {t("operationMode")}
              </span>
              <div className="inline-flex rounded-lg border border-gray-300 bg-gray-50 p-1 dark:border-gray-800 dark:bg-gray-800/60">
                <button
                  type="button"
                  onClick={() => handleModeChange("copilot")}
                  className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all ${
                    config.mode === "copilot" || config.mode === "approval"
                      ? "bg-[#0099ff] text-white shadow-xs"
                      : "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                  }`}
                >
                  <UserCheck className="size-3.5" />
                  <span>{t("modeCopilot")}</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleModeChange("auto")}
                  className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all ${
                    config.mode === "auto"
                      ? "bg-emerald-600 text-white shadow-xs"
                      : "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                  }`}
                >
                  <Sparkles className="size-3.5" />
                  <span>{t("modeAuto")}</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleModeChange("off")}
                  className={`rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all ${
                    config.mode === "off"
                      ? "bg-gray-700 text-white shadow-xs"
                      : "text-gray-400 hover:text-gray-700 dark:text-gray-500 dark:hover:text-gray-300"
                  }`}
                  title={t("pauseAssistant")}
                >
                  {t("modePaused")}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Métricas Clave */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <div className="rounded-lg border border-gray-300 bg-white p-4 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
          <div className="text-xs leading-5 font-normal tracking-normal text-gray-400 uppercase">{t("statAiDecisions")}</div>
          <div className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
            {stats.totalDecisions}
          </div>
          <div className="mt-1 flex items-center gap-1 text-xs text-emerald-600">
            <CheckCircle2 className="size-3" />
            <span>{t("statAudited")}</span>
          </div>
        </div>

        <div className="rounded-lg border border-gray-300 bg-white p-4 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
          <div className="text-xs leading-5 font-normal tracking-normal text-gray-400 uppercase">{t("statAvgConfidence")}</div>
          <div className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
            {stats.averageConfidence}%
          </div>
          <div className="mt-1 text-xs text-gray-500">{t("statMinThreshold")}</div>
        </div>

        <div className="rounded-lg border border-gray-300 bg-white p-4 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
          <div className="text-xs leading-5 font-normal tracking-normal text-gray-400 uppercase">{t("statToApprove")}</div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-[#0099ff]">
              {pendingActions.filter((a) => a.status === "pending").length}
            </span>
            <span className="text-xs text-gray-500">{t("statInQueue")}</span>
          </div>
          <div className="mt-1 text-xs text-blue-600">{t("statHumanInTheLoop")}</div>
        </div>

        <div className="rounded-lg border border-gray-300 bg-white p-4 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
          <div className="text-xs leading-5 font-normal tracking-normal text-gray-400 uppercase">{t("statHandoffs")}</div>
          <div className="mt-2 text-2xl font-bold text-amber-600">
            {stats.handoffCount}
          </div>
          <div className="mt-1 text-xs text-gray-500">{t("statActiveProtection")}</div>
        </div>

        <div className="rounded-lg border border-gray-300 bg-white p-4 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
          <div className="text-xs leading-5 font-normal tracking-normal text-gray-400 uppercase">{t("statAutonomousReplies")}</div>
          <div className="mt-2 text-2xl font-bold text-emerald-600">
            {stats.autonomousRepliesSent}
          </div>
          <div className="mt-1 text-xs text-gray-500">{t("statZeroHallucinations")}</div>
        </div>
      </div>

      {/* Navegación por Pestañas */}
      <div className="flex overflow-x-auto border-b border-gray-300 pb-px dark:border-gray-800">
        <div className="flex gap-2">
          {[
            { key: "overview", label: t("tabOverview"), icon: Activity },
            {
              key: "approvals",
              label: t("tabApprovals", { count: pendingActions.filter((a) => a.status === "pending").length }),
              icon: UserCheck,
            },
            { key: "knowledge", label: t("tabKnowledge"), icon: BookOpen },
            { key: "policies", label: t("tabPolicies"), icon: Sliders },
            { key: "simulator", label: t("tabSimulator"), icon: Play },
            { key: "gates", label: t("tabGates"), icon: ShieldCheck },
            { key: "logs", label: t("tabLogs"), icon: FileText },
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
            <div className="space-y-4 rounded-lg border border-gray-300 bg-white p-6 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900 lg:col-span-2">
              <h3 className="text-base font-medium text-gray-800 dark:text-white/90">
                {t("lifecycleTitle")}
              </h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {t("lifecycleDesc")}
              </p>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
                <div className="rounded-lg border border-gray-300 bg-gray-50/70 p-3.5 dark:border-gray-800 dark:bg-gray-800/50">
                  <div className="flex size-7 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600">
                    <MessageSquare className="size-4" />
                  </div>
                  <div className="mt-2 text-base font-medium text-gray-800 dark:text-white/90">
                    {t("step1Title")}
                  </div>
                  <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    {t("step1Desc")}
                  </div>
                </div>

                <div className="rounded-lg border border-gray-300 bg-gray-50/70 p-3.5 dark:border-gray-800 dark:bg-gray-800/50">
                  <div className="flex size-7 items-center justify-center rounded-lg bg-purple-500/10 text-purple-600">
                    <Brain className="size-4" />
                  </div>
                  <div className="mt-2 text-base font-medium text-gray-800 dark:text-white/90">
                    {t("step2Title")}
                  </div>
                  <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    {t("step2Desc")}
                  </div>
                </div>

                <div className="rounded-lg border border-gray-300 bg-gray-50/70 p-3.5 dark:border-gray-800 dark:bg-gray-800/50">
                  <div className="flex size-7 items-center justify-center rounded-lg bg-[#0099ff]/10 text-[#0099ff]">
                    <BookOpen className="size-4" />
                  </div>
                  <div className="mt-2 text-base font-medium text-gray-800 dark:text-white/90">
                    {t("step3Title")}
                  </div>
                  <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    {t("step3Desc")}
                  </div>
                </div>

                <div className="rounded-lg border border-gray-300 bg-gray-50/70 p-3.5 dark:border-gray-800 dark:bg-gray-800/50">
                  <div className="flex size-7 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600">
                    <Send className="size-4" />
                  </div>
                  <div className="mt-2 text-base font-medium text-gray-800 dark:text-white/90">
                    {t("step4Title")}
                  </div>
                  <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    {t("step4Desc")}
                  </div>
                </div>
              </div>

              {/* Banner de Modo Operativo */}
              <div className="rounded-lg border border-gray-300 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-800/40">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs leading-5 font-normal tracking-normal uppercase text-gray-400">
                      {t("currentModeLabel")}
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
            <div className="space-y-4 rounded-lg border border-gray-300 bg-white p-6 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
              <h3 className="text-base font-medium text-gray-800 dark:text-white/90">
                {t("securityParamsTitle")}
              </h3>

              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between border-b border-gray-300 pb-2.5 dark:border-gray-800">
                  <span className="text-gray-500">{t("paramConfidenceThreshold")}</span>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {Math.round(config.confidenceThreshold * 100)}%
                  </span>
                </div>

                <div className="flex items-center justify-between border-b border-gray-300 pb-2.5 dark:border-gray-800">
                  <span className="text-gray-500">{t("paramMaxAutoTurns")}</span>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {t("paramTurnsUnit", { count: config.maxAutoTurns })}
                  </span>
                </div>

                <div className="flex items-center justify-between border-b border-gray-300 pb-2.5 dark:border-gray-800">
                  <span className="text-gray-500">{t("paramIntegratedCalendar")}</span>
                  <span className="font-semibold text-emerald-600">
                    {config.calendarEnabled ? t("paramCalendarActive") : t("paramCalendarInactive")}
                  </span>
                </div>

                <div className="flex items-center justify-between border-b border-gray-300 pb-2.5 dark:border-gray-800">
                  <span className="text-gray-500">{t("paramHandoffEmail")}</span>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {config.handoffEmail}
                  </span>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-gray-500">{t("paramRagDocs")}</span>
                  <span className="font-semibold text-[#0099ff]">
                    {t("paramRagApproved", { count: knowledge.filter((k) => k.status === "approved").length })}
                  </span>
                </div>
              </div>

              <button
                onClick={() => setActiveTab("simulator")}
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#0099ff] px-4 py-2.5 text-xs font-semibold text-white shadow-theme-xs transition hover:bg-[#0088e6]"
              >
                <Play className="size-3.5" />
                <span>{t("btnTestInSimulator")}</span>
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
                {t("approvalsTitle")}
              </h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {t("approvalsDesc")}
              </p>
            </div>
            <div className="text-xs font-medium text-gray-500">
              {t("showingPendingActions", { count: pendingActions.filter((a) => a.status === "pending").length })}
            </div>
          </div>

          {pendingActions.filter((a) => a.status === "pending").length === 0 ? (
            <div className="rounded-lg border border-dashed border-gray-300 bg-white p-12 text-center dark:border-gray-800 dark:bg-gray-900">
              <div className="mx-auto flex size-12 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600">
                <CheckCircle2 className="size-6" />
              </div>
              <h4 className="mt-3 text-base font-semibold text-gray-900 dark:text-white">
                {t("emptyApprovalsTitle")}
              </h4>
              <p className="mx-auto mt-1 max-w-sm text-xs text-gray-500 dark:text-gray-400">
                {t("emptyApprovalsDesc")}
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
                      className="rounded-lg border border-gray-300 bg-white p-5 shadow-theme-xs transition-all dark:border-gray-800 dark:bg-gray-900"
                    >
                      {/* Top Bar: Prospecto & Badges */}
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-gray-300 pb-4 dark:border-gray-800">
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
                              {t("senderAccount")} <span className="font-medium text-gray-600 dark:text-gray-300">{action.accountName}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${intentInfo.color}`}>
                            {intentInfo.label}
                          </span>
                          <span className="rounded-lg border border-gray-300 bg-gray-50 px-2.5 py-1 text-xs font-medium text-gray-600 dark:border-gray-800 dark:bg-gray-800 dark:text-gray-300">
                            {t("confidenceLabel", { val: Math.round(action.confidence * 100) })}
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
                            {t("riskLabel", { val: action.riskLevel.toUpperCase() })}
                          </span>
                        </div>
                      </div>

                      {/* Mensaje Entrante del Lead */}
                      <div className="mt-4 rounded-lg border border-gray-300 bg-gray-50/70 p-3.5 dark:border-gray-800/80 dark:bg-gray-800/40">
                        <span className="text-xs leading-5 font-normal tracking-normal text-gray-400 uppercase">
                          {t("inboundMessageLead")}
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
                            <span>{t("replyGeneratedAi")}</span>
                          </div>
                          {!isEditing ? (
                            <button
                              onClick={() => {
                                setEditingActionId(action.id);
                                setEditedReply(action.suggestedReply);
                              }}
                              className="text-xs font-medium text-gray-500 hover:text-gray-900 dark:hover:text-white"
                            >
                              {t("btnEditText")}
                            </button>
                          ) : (
                            <button
                              onClick={() => setEditingActionId(null)}
                              className="text-xs font-medium text-gray-400 hover:text-gray-600"
                            >
                              {t("btnCancelEdit")}
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
                            <span>{t("groundedIn")}</span>
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
                      <div className="mt-5 flex flex-wrap items-center justify-end gap-2.5 border-t border-gray-300 pt-3.5 dark:border-gray-800">
                        <button
                          onClick={() => handleRejectAction(action.id)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-600 transition hover:bg-gray-50 dark:border-gray-800 dark:text-gray-300 dark:hover:bg-gray-800"
                        >
                          <Trash2 className="size-3.5" />
                          <span>{t("btnDismiss")}</span>
                        </button>

                        <button
                          onClick={() => handleHandoffAction(action)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs font-medium text-amber-600 transition hover:bg-amber-500/20"
                        >
                          <ShieldAlert className="size-3.5" />
                          <span>{t("btnEscalateHuman")}</span>
                        </button>

                        <button
                          onClick={() => handleApproveAction(action)}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-[#0099ff] px-4 py-2 text-xs font-semibold text-white shadow-theme-xs transition hover:bg-[#0088e6]"
                        >
                          <Send className="size-3.5" />
                          <span>{t("btnApproveSend")}</span>
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
                {t("knowledgeTitle")}
              </h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {t("knowledgeDesc")}
              </p>
            </div>
            {!isMember && (
              <button
                onClick={() => setIsAddKnowledgeOpen(true)}
                className="inline-flex items-center gap-2 rounded-lg bg-[#0099ff] px-4 py-2 text-xs font-semibold text-white shadow-theme-xs transition hover:bg-[#0088e6]"
              >
                <Plus className="size-3.5" />
                <span>{t("btnAddDocument")}</span>
              </button>
            )}
          </div>

          {/* Filtros de conocimiento */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder={t("searchKnowledgePlaceholder")}
                value={knowledgeSearch}
                onChange={(e) => setKnowledgeSearch(e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white py-2 pr-4 pl-9 text-xs text-gray-900 focus:outline-hidden dark:border-gray-800 dark:bg-gray-900 dark:text-white"
              />
            </div>

            <div className="inline-flex rounded-lg border border-gray-300 bg-gray-50 p-1 dark:border-gray-800 dark:bg-gray-800/60">
              {[
                { key: "all", label: t("catAll") },
                { key: "value_prop", label: t("catValueProp") },
                { key: "pricing", label: t("catPricing") },
                { key: "objections", label: t("catObjections") },
                { key: "company", label: t("catCompany") },
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
                className="flex flex-col justify-between rounded-lg border border-gray-300 bg-white p-5 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900"
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
                <div className="mt-4 flex items-center justify-between border-t border-gray-300 pt-3 text-xs text-gray-400 dark:border-gray-800">
                  <span className="inline-flex items-center gap-1 text-emerald-600">
                    <CheckCircle2 className="size-3" />
                    {t("docStatus", { status: item.status.toUpperCase() })}
                  </span>
                  <span>{t("docUpdated", { date: new Date(item.updatedAt).toLocaleDateString() })}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Modal Agregar Documento */}
          {isAddKnowledgeOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
              <div className="w-full max-w-lg rounded-lg border border-gray-300 bg-white p-6 shadow-xl dark:border-gray-800 dark:bg-gray-900">
                <h4 className="text-base font-bold text-gray-900 dark:text-white">
                  {t("modalAddTitle")}
                </h4>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  {t("modalAddDesc")}
                </p>

                <form onSubmit={handleAddKnowledge} className="mt-4 space-y-4">
                  <div>
                    <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                      {t("docTitleLabel")}
                    </label>
                    <input
                      type="text"
                      required
                      placeholder={t("docTitlePlaceholder")}
                      value={newKbTitle}
                      onChange={(e) => setNewKbTitle(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-gray-300 bg-white p-2.5 text-xs text-gray-900 focus:outline-hidden dark:border-gray-800 dark:bg-gray-950 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                      {t("docCategoryLabel")}
                    </label>
                    <select
                      value={newKbCategory}
                      onChange={(e) => setNewKbCategory(e.target.value as KnowledgeCategory)}
                      className="mt-1 w-full rounded-lg border border-gray-300 bg-white p-2.5 text-xs text-gray-900 focus:outline-hidden dark:border-gray-800 dark:bg-gray-950 dark:text-white"
                    >
                      <option value="value_prop">{t("catValueProp")}</option>
                      <option value="pricing">{t("catPricing")}</option>
                      <option value="objections">{t("catObjections")}</option>
                      <option value="faqs">{t("catFaqs")}</option>
                      <option value="company">{t("catCompany")}</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                      {t("docContentLabel")}
                    </label>
                    <textarea
                      required
                      rows={5}
                      placeholder={t("docContentPlaceholder")}
                      value={newKbContent}
                      onChange={(e) => setNewKbContent(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-gray-300 bg-white p-2.5 text-xs text-gray-900 focus:outline-hidden dark:border-gray-800 dark:bg-gray-950 dark:text-white"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2.5 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsAddKnowledgeOpen(false)}
                      className="rounded-lg border border-gray-200 px-4 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50 dark:border-gray-800 dark:text-gray-300"
                    >
                      {t("btnCancel")}
                    </button>
                    <button
                      type="submit"
                      className="rounded-lg bg-[#0099ff] px-4 py-2 text-xs font-semibold text-white hover:bg-[#0088e6]"
                    >
                      {t("btnSaveDocument")}
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
          <div className="rounded-lg border border-gray-300 bg-white p-6 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
            <h3 className="text-base font-medium text-gray-800 dark:text-white/90">
              {t("policiesTitle")}
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {t("policiesDesc")}
            </p>

            <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2">
              <div>
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                  {t("agentNameLabel")}
                </label>
                <input
                  type="text"
                  disabled={isMember}
                  value={config.name}
                  onChange={(e) => setConfig({ ...config, name: e.target.value })}
                  className="mt-1.5 w-full rounded-lg border border-gray-300 bg-white p-2.5 text-xs text-gray-900 focus:outline-hidden disabled:bg-gray-50 dark:border-gray-800 dark:bg-gray-950 dark:text-white"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                  {t("modelLabel")}
                </label>
                <input
                  type="text"
                  disabled
                  value={config.model}
                  className="mt-1.5 w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-xs text-gray-500 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400"
                />
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                    {t("minConfidenceLabel")}
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
                  {t("confidenceHelper")}
                </span>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                  {t("maxTurnsLabel")}
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
                  className="mt-1.5 w-full rounded-lg border border-gray-300 bg-white p-2.5 text-xs text-gray-900 focus:outline-hidden disabled:bg-gray-50 dark:border-gray-800 dark:bg-gray-950 dark:text-white"
                />
                <span className="text-xs text-gray-400">
                  {t("maxTurnsHelper")}
                </span>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                  {t("bookingLinkLabel")}
                </label>
                <input
                  type="text"
                  disabled={isMember}
                  value={config.bookingLink || ""}
                  onChange={(e) => setConfig({ ...config, bookingLink: e.target.value })}
                  placeholder="https://cal.inhubflow.com/demo-20min"
                  className="mt-1.5 w-full rounded-lg border border-gray-300 bg-white p-2.5 text-xs text-gray-900 focus:outline-hidden disabled:bg-gray-50 dark:border-gray-800 dark:bg-gray-950 dark:text-white"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                  {t("handoffEmailLabel")}
                </label>
                <input
                  type="email"
                  disabled={isMember}
                  value={config.handoffEmail}
                  onChange={(e) => setConfig({ ...config, handoffEmail: e.target.value })}
                  className="mt-1.5 w-full rounded-lg border border-gray-300 bg-white p-2.5 text-xs text-gray-900 focus:outline-hidden disabled:bg-gray-50 dark:border-gray-800 dark:bg-gray-950 dark:text-white"
                />
              </div>
            </div>

            <div className="mt-5 space-y-4">
              <div>
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                  {t("systemPromptLabel")}
                </label>
                <textarea
                  rows={3}
                  disabled={isMember}
                  value={config.systemPrompt}
                  onChange={(e) => setConfig({ ...config, systemPrompt: e.target.value })}
                  className="mt-1.5 w-full rounded-lg border border-gray-300 bg-white p-3 text-xs text-gray-900 focus:outline-hidden disabled:bg-gray-50 dark:border-gray-800 dark:bg-gray-950 dark:text-white"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                  {t("customInstructionsLabel")}
                </label>
                <textarea
                  rows={3}
                  disabled={isMember}
                  value={config.customInstructions}
                  onChange={(e) => setConfig({ ...config, customInstructions: e.target.value })}
                  className="mt-1.5 w-full rounded-lg border border-gray-300 bg-white p-3 text-xs text-gray-900 focus:outline-hidden disabled:bg-gray-50 dark:border-gray-800 dark:bg-gray-950 dark:text-white"
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
                  <span>{t("btnSavePolicies")}</span>
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
          <div className="space-y-4 rounded-lg border border-gray-300 bg-white p-6 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
            <div>
              <h3 className="text-base font-medium text-gray-800 dark:text-white/90">
                {t("simTitle")}
              </h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {t("simDesc")}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                  {t("simLeadName")}
                </label>
                <input
                  type="text"
                  value={simSender}
                  onChange={(e) => setSimSender(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-300 bg-white p-2 text-xs text-gray-900 focus:outline-hidden dark:border-gray-800 dark:bg-gray-950 dark:text-white"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                  {t("simLeadCompany")}
                </label>
                <input
                  type="text"
                  value={simCompany}
                  onChange={(e) => setSimCompany(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-300 bg-white p-2 text-xs text-gray-900 focus:outline-hidden dark:border-gray-800 dark:bg-gray-950 dark:text-white"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                {t("simInboundMsg")}
              </label>
              <textarea
                rows={4}
                value={simText}
                onChange={(e) => setSimText(e.target.value)}
                placeholder={t("simMsgPlaceholder")}
                className="mt-1.5 w-full rounded-lg border border-gray-300 bg-white p-3 text-xs text-gray-900 focus:outline-hidden dark:border-gray-800 dark:bg-gray-950 dark:text-white"
              />
            </div>

            {/* Ejemplos Rápidos */}
            <div>
              <span className="text-xs leading-5 font-normal tracking-normal text-gray-400 uppercase">
                {t("simQuickCases")}
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
                <span>{t("btnSimulating")}</span>
              ) : (
                <>
                  <Sparkles className="size-3.5" />
                  <span>{t("btnSimulate")}</span>
                </>
              )}
            </button>
          </div>

          {/* Panel Derecho: Resultado de la Simulación */}
          <div className="space-y-4 rounded-lg border border-gray-300 bg-white p-6 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
            <h3 className="text-base font-medium text-gray-800 dark:text-white/90">
              {t("simAnalysisTitle")}
            </h3>

            {!simResult ? (
              <div className="rounded-lg border border-dashed border-gray-300 p-10 text-center dark:border-gray-800">
                <Brain className="mx-auto size-8 text-gray-400" />
                <p className="mt-2 text-xs text-gray-500">
                  {t("simEmptyDesc")}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Badges de Decisión */}
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <div className="rounded-lg border border-gray-300 bg-gray-50 p-2.5 dark:border-gray-800 dark:bg-gray-800/50">
                    <div className="text-xs leading-5 font-normal tracking-normal text-gray-400 uppercase">{t("colIntent")}</div>
                    <div className="mt-1 text-xs font-bold text-gray-900 dark:text-white">
                      {simResult.intent}
                    </div>
                  </div>

                  <div className="rounded-lg border border-gray-300 bg-gray-50 p-2.5 dark:border-gray-800 dark:bg-gray-800/50">
                    <div className="text-xs leading-5 font-normal tracking-normal text-gray-400 uppercase">{t("colConfidence")}</div>
                    <div className="mt-1 text-xs font-bold text-[#0099ff]">
                      {Math.round(simResult.confidence * 100)}%
                    </div>
                  </div>

                  <div className="rounded-lg border border-gray-300 bg-gray-50 p-2.5 dark:border-gray-800 dark:bg-gray-800/50">
                    <div className="text-xs leading-5 font-normal tracking-normal text-gray-400 uppercase">{t("colAction")}</div>
                    <div className="mt-1 text-xs font-bold text-emerald-600">
                      {simResult.recommendedAction}
                    </div>
                  </div>

                  <div className="rounded-lg border border-gray-300 bg-gray-50 p-2.5 dark:border-gray-800 dark:bg-gray-800/50">
                    <div className="text-xs leading-5 font-normal tracking-normal text-gray-400 uppercase">{t("colLatency")}</div>
                    <div className="mt-1 text-xs font-bold text-gray-700 dark:text-gray-300">
                      {simResult.latencyMs} ms
                    </div>
                  </div>
                </div>

                {/* Razonamiento */}
                <div className="rounded-lg border border-gray-300 bg-gray-50 p-3 dark:border-gray-800 dark:bg-gray-800/40">
                  <span className="text-xs leading-5 font-normal tracking-normal text-gray-400 uppercase">
                    {t("reasoningSummary")}
                  </span>
                  <p className="mt-1 text-xs text-gray-600 dark:text-gray-300">
                    {simResult.reasoningSummary}
                  </p>
                </div>

                {/* Borrador Generado */}
                <div>
                  <span className="text-xs leading-5 font-normal tracking-normal text-gray-400 uppercase">
                    {t("suggestedReplyDraft")}
                  </span>
                  <div className="mt-1.5 rounded-lg border border-[#0099ff]/20 bg-[#0099ff]/5 p-3.5 text-xs text-gray-800 whitespace-pre-wrap dark:text-gray-200">
                    {simResult.replyDraft}
                  </div>
                </div>

                {/* Citas */}
                {simResult.citations.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 text-xs text-gray-500">
                    <BookOpen className="size-3 text-[#0099ff]" />
                    <span>{t("citationsApplied")}</span>
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
              {t("gatesTitle")}
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {t("gatesDesc")}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {gates.map((gate) => (
              <div
                key={gate.key}
                className="flex items-start justify-between rounded-lg border border-gray-300 bg-white p-5 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900"
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
                    <div className="mt-2.5 inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-gray-50 px-2.5 py-1 text-xs font-medium text-gray-700 dark:border-gray-800 dark:bg-gray-800 dark:text-gray-300">
                      <span className="font-semibold text-[#0099ff]">{t("technicalEvidence")}</span>
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
                  {gate.passed ? t("badgePassed") : t("badgePending")}
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
              {t("logsTitle")}
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {t("logsDesc")}
            </p>
          </div>

          <div className="overflow-x-auto rounded-lg border border-gray-300 bg-white shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-gray-300 bg-gray-50/75 text-xs leading-5 font-normal tracking-normal text-gray-400 uppercase [&_th]:font-normal dark:border-gray-800 dark:bg-gray-800/50">
                <tr>
                  <th className="px-4 py-3">{t("colDateTime")}</th>
                  <th className="px-4 py-3">{t("colProspect")}</th>
                  <th className="px-4 py-3">{t("colInboundText")}</th>
                  <th className="px-4 py-3">{t("colIntentLog")}</th>
                  <th className="px-4 py-3">{t("colConfidenceLog")}</th>
                  <th className="px-4 py-3">{t("colActionLog")}</th>
                  <th className="px-4 py-3">{t("colLatencyLog")}</th>
                  <th className="px-4 py-3">{t("colStatusLog")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-300 dark:divide-gray-800">
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
