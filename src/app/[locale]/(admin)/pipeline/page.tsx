"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { PIPELINE_STAGES } from "@/lib/pipeline/mock-data";
import {
  addPipelineDeal,
  deletePipelineDeal,
  getPipelineDeals,
  moveDealStage,
  syncPipelineWithCampaignLeads,
  updatePipelineDeal,
} from "@/lib/pipeline/store";
import type { PipelineDeal, PipelineStageId } from "@/lib/pipeline/types";
import {
  ArrowLeft,
  ArrowRight,
  Building,
  Calendar,
  ExternalLink,
  FileText,
  Filter,
  MessageSquare,
  Pencil,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  Sparkles,
  Trash2,
  TrendingUp,
  UserCheck,
  Users,
  X,
} from "lucide-react";

export default function PipelinePage() {
  const t = useTranslations("pipeline");
  const [deals, setDeals] = useState<PipelineDeal[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [campaignFilter, setCampaignFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [draggedDealId, setDraggedDealId] = useState<string | null>(null);
  const [dragOverStage, setDragOverStage] = useState<PipelineStageId | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  // Modal Crear Oportunidad (sin campos de valores monetarios)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newDealName, setNewDealName] = useState("");
  const [newDealTitle, setNewDealTitle] = useState("");
  const [newDealCompany, setNewDealCompany] = useState("");
  const [newDealStage, setNewDealStage] = useState<PipelineStageId>("lead_captured");
  const [newDealCampaign, setNewDealCampaign] = useState("Nivel 1 - Post Lead Magnet SISTEMA");
  const [newDealPriority, setNewDealPriority] = useState<"Alta" | "Media" | "Baja">("Alta");
  const [newDealNotes, setNewDealNotes] = useState("");

  // Modal Editar Oportunidad (sin campos de valores monetarios)
  const [editingDeal, setEditingDeal] = useState<PipelineDeal | null>(null);
  const [editDealStage, setEditDealStage] = useState<PipelineStageId>("lead_captured");
  const [editDealPriority, setEditDealPriority] = useState<"Alta" | "Media" | "Baja">("Alta");
  const [editDealMeetingDate, setEditDealMeetingDate] = useState("");
  const [editDealNextAction, setEditDealNextAction] = useState("");
  const [editDealNotes, setEditDealNotes] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  useEffect(() => {
    setDeals(getPipelineDeals());
  }, []);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => {
      setToastMsg(null);
    }, 3500);
  };

  const handleSyncFromCampaigns = () => {
    setIsSyncing(true);
    try {
      const refreshed = syncPipelineWithCampaignLeads();
      setDeals(refreshed);
      showToast(t("toastSynced", { count: refreshed.length }));
    } finally {
      setTimeout(() => setIsSyncing(false), 500);
    }
  };

  const uniqueCampaigns = useMemo(() => {
    const set = new Set<string>();
    deals.forEach((d) => {
      if (d.sourceCampaign) set.add(d.sourceCampaign);
    });
    return Array.from(set);
  }, [deals]);

  const filteredDeals = useMemo(() => {
    return deals.filter((d) => {
      const query = searchQuery.toLowerCase();
      const matchSearch =
        d.leadName.toLowerCase().includes(query) ||
        d.company.toLowerCase().includes(query) ||
        d.leadTitle.toLowerCase().includes(query) ||
        (d.notes && d.notes.toLowerCase().includes(query));

      const matchCampaign =
        campaignFilter === "all" || d.sourceCampaign === campaignFilter;

      const matchPriority =
        priorityFilter === "all" || d.priority === priorityFilter;

      return matchSearch && matchCampaign && matchPriority;
    });
  }, [deals, searchQuery, campaignFilter, priorityFilter]);

  // Métricas operativas 100% enfocadas en flujo de leads y conversión (sin valores en dólares)
  const activeDealsCount = useMemo(() => {
    return deals.filter((d) => d.stageId !== "closed_lost").length;
  }, [deals]);

  const wonDealsCount = useMemo(() => {
    return deals.filter((d) => d.stageId === "closed_won").length;
  }, [deals]);

  const activeMeetingsCount = useMemo(() => {
    return deals.filter((d) => d.stageId === "meeting_scheduled").length;
  }, [deals]);

  const conversionRate = useMemo(() => {
    if (deals.length === 0) return "0.0";
    return ((wonDealsCount / deals.length) * 100).toFixed(1);
  }, [deals, wonDealsCount]);

  // Helper para nombre de etapa localizado
  const getStageLocalizedName = (stageId: PipelineStageId, fallbackName: string) => {
    const stageKey = stageId === "closed_won" ? "won" : stageId;
    try {
      return t(`stagesList.${stageKey}`);
    } catch {
      return fallbackName;
    }
  };

  // Drag & drop handlers
  const handleDragStart = (e: React.DragEvent, dealId: string) => {
    setDraggedDealId(dealId);
    e.dataTransfer.setData("text/plain", dealId);
  };

  const handleDragOver = (e: React.DragEvent, stageId: PipelineStageId) => {
    e.preventDefault();
    if (dragOverStage !== stageId) {
      setDragOverStage(stageId);
    }
  };

  const handleDragLeave = (stageId: PipelineStageId) => {
    if (dragOverStage === stageId) {
      setDragOverStage(null);
    }
  };

  const handleDrop = (e: React.DragEvent, targetStage: PipelineStageId) => {
    e.preventDefault();
    setDragOverStage(null);
    const dealId = draggedDealId || e.dataTransfer.getData("text/plain");
    if (!dealId) return;

    const updated = moveDealStage(dealId, targetStage);
    setDeals(updated);
    setDraggedDealId(null);
    const targetName = getStageLocalizedName(targetStage, targetStage);
    showToast(t("toastDealMoved", { stage: targetName }));
  };

  const handleMoveStep = (deal: PipelineDeal, direction: "prev" | "next") => {
    const currentIndex = PIPELINE_STAGES.findIndex((s) => s.id === deal.stageId);
    if (currentIndex === -1) return;

    const newIndex = direction === "next" ? currentIndex + 1 : currentIndex - 1;
    if (newIndex >= 0 && newIndex < PIPELINE_STAGES.length) {
      const targetStage = PIPELINE_STAGES[newIndex].id;
      const updated = moveDealStage(deal.id, targetStage);
      setDeals(updated);
      const stageName = getStageLocalizedName(targetStage, PIPELINE_STAGES[newIndex].name);
      showToast(t("toastDealMoved", { stage: stageName }));
    }
  };

  const handleCreateDeal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDealName || !newDealCompany) return;

    const initials = newDealName
      .trim()
      .split(" ")
      .filter(Boolean)
      .map((w) => w[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();

    const updated = addPipelineDeal({
      leadId: "lead-" + Date.now(),
      leadName: newDealName.trim(),
      leadTitle: newDealTitle.trim() || "Decisor Comercial",
      company: newDealCompany.trim(),
      location: "Remoto / B2B",
      avatarInitials: initials || "LI",
      stageId: newDealStage,
      sourceCampaign: newDealCampaign,
      lastActivity: "Creado manualmente en Pipeline",
      nextAction: "Iniciar secuencia o seguimiento comercial",
      priority: newDealPriority,
      notes: newDealNotes.trim() || undefined,
    });

    setDeals(updated);
    setIsCreateModalOpen(false);
    setNewDealName("");
    setNewDealCompany("");
    setNewDealTitle("");
    setNewDealNotes("");
    showToast(t("toastDealCreated"));
  };

  // Abrir Modal de Edición
  const handleOpenEditModal = (deal: PipelineDeal) => {
    setEditingDeal(deal);
    setEditDealStage(deal.stageId);
    setEditDealPriority(deal.priority);
    setEditDealMeetingDate(deal.meetingDate || "");
    setEditDealNextAction(deal.nextAction);
    setEditDealNotes(deal.notes || "");
    setConfirmDeleteId(null);
  };

  const handleSaveEditDeal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDeal) return;

    const updated = updatePipelineDeal(editingDeal.id, {
      stageId: editDealStage,
      priority: editDealPriority,
      meetingDate: editDealMeetingDate.trim() || undefined,
      nextAction: editDealNextAction.trim() || editingDeal.nextAction,
      notes: editDealNotes.trim() || undefined,
    });

    setDeals(updated);
    setEditingDeal(null);
    showToast(t("toastDealUpdated"));
  };

  const handleDeleteDeal = (dealId: string) => {
    const updated = deletePipelineDeal(dealId);
    setDeals(updated);
    setEditingDeal(null);
    setConfirmDeleteId(null);
    showToast(t("toastDealDeleted"));
  };

  const handleResetFilters = () => {
    setSearchQuery("");
    setCampaignFilter("all");
    setPriorityFilter("all");
  };

  const hasActiveFilters =
    searchQuery.trim() !== "" ||
    campaignFilter !== "all" ||
    priorityFilter !== "all";

  return (
    <div className="w-full space-y-6">
      <PageBreadcrumb pageTitle={t("pageTitle")} />

      {/* Toast flotante */}
      {toastMsg && (
        <div className="fixed top-20 right-6 z-50 flex items-center gap-2 rounded-lg bg-gray-900 border border-brand-500/30 px-4 py-2.5 text-xs text-white shadow-xl dark:bg-black animate-fade-in">
          <Sparkles className="size-4 text-brand-400 shrink-0" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Cabecera y Navegación en formato estándar de Card Principal */}
      <div className="w-full rounded-lg border border-gray-300 bg-white px-6 py-5 dark:border-gray-800 dark:bg-white/3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h3 className="text-base font-medium text-gray-800 dark:text-white/90">
              {t("cardTitle")}
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {t("cardDesc")}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleSyncFromCampaigns}
              disabled={isSyncing}
              className="rounded-lg border border-brand-300 bg-brand-50/70 px-3 py-2 text-xs font-semibold text-brand-700 hover:bg-brand-100 dark:border-brand-800 dark:bg-brand-950/40 dark:text-brand-300 transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
              title={t("syncTooltip")}
            >
              <RefreshCw
                className={`size-3.5 text-brand-600 ${isSyncing ? "animate-spin" : ""}`}
              />
              <span>{t("syncCampaigns")}</span>
            </button>

            <button
              type="button"
              onClick={() => setIsCreateModalOpen(true)}
              className="rounded-lg bg-brand-500 px-3.5 py-2 text-xs font-semibold text-white hover:bg-brand-600 transition flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Plus className="size-3.5" />
              <span>{t("newOpportunity")}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Tarjetas de Métricas Operativas (100% limpias, sin valores en dólares) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-lg border border-gray-300 bg-white p-3.5 shadow-2xs dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
            <span className="font-medium uppercase">{t("totalProspects")}</span>
            <Users className="size-4 text-brand-500" />
          </div>
          <p className="text-xl font-bold text-gray-900 dark:text-white mt-1">
            {deals.length}{" "}
            <span className="text-xs font-normal text-gray-400">{t("leadsInFunnel")}</span>
          </p>
          <span className="text-xs text-brand-600 dark:text-brand-400 font-medium mt-0.5 block">
            {t("allStagesDesc")}
          </span>
        </div>

        <div className="rounded-lg border border-gray-300 bg-white p-3.5 shadow-2xs dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
            <span className="font-medium uppercase">{t("activeOpportunities")}</span>
            <TrendingUp className="size-4 text-emerald-500" />
          </div>
          <p className="text-xl font-bold text-gray-900 dark:text-white mt-1">
            {activeDealsCount}{" "}
            <span className="text-xs font-normal text-gray-400">{t("leadsInFunnel")}</span>
          </p>
          <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium mt-0.5 block">
            {t("inFollowUp")}
          </span>
        </div>

        <div className="rounded-lg border border-gray-300 bg-white p-3.5 shadow-2xs dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
            <span className="font-medium uppercase">{t("scheduledMeetings")}</span>
            <Calendar className="size-4 text-purple-500" />
          </div>
          <p className="text-xl font-bold text-gray-900 dark:text-white mt-1">
            {activeMeetingsCount}{" "}
            <span className="text-xs font-normal text-gray-400">{t("scheduled")}</span>
          </p>
          <span className="text-xs text-purple-600 dark:text-purple-400 font-medium mt-0.5 block">
            {t("syncedWithCal")}
          </span>
        </div>

        <div className="rounded-lg border border-gray-300 bg-white p-3.5 shadow-2xs dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
            <span className="font-medium uppercase">{t("wonDeals")}</span>
            <UserCheck className="size-4 text-emerald-500" />
          </div>
          <p className="text-xl font-bold text-gray-900 dark:text-white mt-1">
            {wonDealsCount}{" "}
            <span className="text-xs font-normal text-gray-400">{t("closed")}</span>
          </p>
          <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium mt-0.5 block">
            {conversionRate}% {t("conversionRate")}
          </span>
        </div>
      </div>

      {/* Barra de Búsqueda y Filtros */}
      <div className="rounded-lg border border-gray-300 bg-white p-3 mb-4 flex flex-wrap items-center justify-between gap-3 shadow-2xs dark:border-gray-800 dark:bg-gray-900">
        <div className="flex items-center gap-2 flex-1 min-w-[220px]">
          <Search className="size-4 text-gray-400 shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t("filterPlaceholder")}
            className="w-full text-xs text-gray-800 bg-transparent focus:outline-hidden dark:text-white"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
            <Filter className="size-3.5" />
            <span className="hidden sm:inline">{t("campaignLabel")}</span>
          </div>
          <select
            value={campaignFilter}
            onChange={(e) => setCampaignFilter(e.target.value)}
            className="rounded-lg border border-gray-300 bg-gray-50 px-2 py-1 text-xs text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
          >
            <option value="all">{t("allCampaigns")}</option>
            {uniqueCampaigns.map((camp) => (
              <option key={camp} value={camp}>
                {camp}
              </option>
            ))}
          </select>

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="rounded-lg border border-gray-300 bg-gray-50 px-2 py-1 text-xs text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
          >
            <option value="all">{t("allPriorities")}</option>
            <option value="Alta">{t("filterPriorityAlta")}</option>
            <option value="Media">{t("filterPriorityMedia")}</option>
            <option value="Baja">{t("filterPriorityBaja")}</option>
          </select>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="rounded-lg border border-gray-200 px-2 py-1 text-xs text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 flex items-center gap-1 transition"
            >
              <RotateCcw className="size-3" />
              <span>{t("clearFilters")}</span>
            </button>
          )}
        </div>
      </div>

      {/* Tablero Kanban (8 Columnas limpias sin volumen monetario) */}
      <div className="flex-1 overflow-x-auto pb-6">
        <div className="flex gap-3.5 min-w-[1950px] items-stretch">
          {PIPELINE_STAGES.map((stage) => {
            const stageDeals = filteredDeals.filter((d) => d.stageId === stage.id);
            const isTargetOver = dragOverStage === stage.id;
            const localizedStageName = getStageLocalizedName(stage.id, stage.name);

            return (
              <div
                key={stage.id}
                onDragOver={(e) => handleDragOver(e, stage.id)}
                onDragLeave={() => handleDragLeave(stage.id)}
                onDrop={(e) => handleDrop(e, stage.id)}
                className={`w-[245px] shrink-0 flex flex-col rounded-lg border border-gray-300 bg-gray-50/70 p-3 shadow-2xs dark:border-gray-800 dark:bg-gray-900/50 border-t-4 ${
                  stage.headerBorder
                } transition-all duration-150 ${
                  isTargetOver
                    ? "ring-2 ring-brand-500 bg-brand-50/40 dark:bg-brand-950/40 scale-[1.01]"
                    : ""
                }`}
              >
                {/* Cabecera de Columna (Título y Contador de Leads) */}
                <div className="pb-2.5 mb-2.5 border-b border-gray-300 dark:border-gray-800 flex items-center justify-between">
                  <h4
                    className="text-xs font-bold text-gray-900 dark:text-white truncate"
                    title={localizedStageName}
                  >
                    {localizedStageName}
                  </h4>
                  <span className="rounded-full bg-white px-2 py-0.5 text-xs font-bold text-gray-700 shadow-2xs dark:bg-gray-800 dark:text-gray-200">
                    {stageDeals.length}
                  </span>
                </div>

                {/* Lista de Tarjetas de la Etapa */}
                <div className="flex-1 space-y-2.5 overflow-y-auto max-h-[calc(100vh-360px)] pr-1">
                  {stageDeals.map((deal) => (
                    <div
                      key={deal.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, deal.id)}
                      className="group rounded-lg border border-gray-300 bg-white p-3 shadow-2xs hover:border-brand-500 hover:shadow-xs transition cursor-grab active:cursor-grabbing dark:border-gray-800 dark:bg-gray-800"
                    >
                      {/* Top bar de la tarjeta */}
                      <div className="flex items-center justify-between gap-1 mb-1.5">
                        <span className="text-xs font-semibold text-brand-700 bg-brand-50 px-1.5 py-0.5 rounded-lg truncate max-w-[130px] dark:bg-brand-950/60 dark:text-brand-300">
                          {deal.sourceCampaign.replace("Nivel ", "N")}
                        </span>
                        <span
                          className={`text-xs font-semibold px-1.5 py-0.5 rounded-full ${
                            deal.priority === "Alta"
                              ? "bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-300"
                              : deal.priority === "Media"
                              ? "bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-300"
                              : "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300"
                          }`}
                        >
                          {deal.priority}
                        </span>
                      </div>

                      {/* Lead Info */}
                      <div className="flex items-center gap-2 mb-1.5">
                        <div className="size-6 rounded-full bg-brand-500 text-white font-bold text-xs flex items-center justify-center shrink-0">
                          {deal.avatarInitials}
                        </div>
                        <div className="min-w-0 flex-1">
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(deal)}
                            className="text-xs font-semibold text-gray-900 dark:text-white truncate block hover:text-brand-600 dark:hover:text-brand-400 text-left w-full cursor-pointer"
                            title={t("editOpportunity")}
                          >
                            {deal.leadName}
                          </button>
                          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                            {deal.leadTitle}
                          </p>
                        </div>
                      </div>

                      <div className="text-xs font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1 mb-2">
                        <Building className="size-3 text-gray-400 shrink-0" />
                        <span className="truncate">{deal.company}</span>
                      </div>

                      {deal.leadMagnetUsed && (
                        <div className="mb-2">
                          <span className="rounded-lg bg-brand-50 text-brand-700 border border-brand-200 px-1.5 py-0.5 text-xs font-mono dark:bg-brand-950/50 dark:border-brand-800 dark:text-brand-300">
                            Lead Magnet: {deal.leadMagnetUsed}
                          </span>
                        </div>
                      )}

                      {/* Cita Agendada si existe */}
                      {deal.meetingDate && (
                        <div className="flex items-center gap-1 text-xs text-purple-600 dark:text-purple-400 font-semibold mb-2">
                          <Calendar className="size-3 shrink-0" />
                          <span className="truncate">{deal.meetingDate}</span>
                        </div>
                      )}

                      {/* Siguiente Acción */}
                      <div className="mt-1 rounded-lg bg-gray-50 p-1.5 text-xs text-gray-500 dark:bg-gray-900/60 dark:text-gray-400">
                        <span className="font-semibold text-gray-700 dark:text-gray-300">
                          {t("step")}{" "}
                        </span>
                        <span className="line-clamp-2">{deal.nextAction}</span>
                      </div>

                      {/* Notas si existen */}
                      {deal.notes && (
                        <div className="mt-1.5 flex items-start gap-1 rounded bg-amber-50/60 p-1 text-[11px] text-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
                          <FileText className="size-3 mt-0.5 shrink-0 text-amber-600" />
                          <span className="line-clamp-2 italic">{deal.notes}</span>
                        </div>
                      )}

                      {/* Barra de Acciones Rápidas */}
                      <div className="mt-2.5 pt-1.5 border-t border-gray-300 flex items-center justify-between dark:border-gray-700/60">
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleMoveStep(deal, "prev")}
                            title={t("moveToPrev")}
                            className="p-1 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 transition cursor-pointer"
                          >
                            <ArrowLeft className="size-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMoveStep(deal, "next")}
                            title={t("moveToNext")}
                            className="p-1 rounded-lg text-gray-400 hover:text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-950/40 transition cursor-pointer"
                          >
                            <ArrowRight className="size-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(deal)}
                            title={t("editOpportunity")}
                            className="p-1 rounded-lg text-gray-400 hover:text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-950/40 transition cursor-pointer"
                          >
                            <Pencil className="size-3" />
                          </button>
                        </div>

                        <div className="flex items-center gap-2">
                          <Link
                            href={`/inbox?leadId=${deal.leadId}`}
                            className="text-xs font-semibold text-brand-600 hover:underline flex items-center gap-1 dark:text-brand-400"
                            title={t("openInbox")}
                          >
                            <MessageSquare className="size-3" />
                            <span>{t("inbox")}</span>
                          </Link>
                        </div>
                      </div>
                    </div>
                  ))}

                  {stageDeals.length === 0 && (
                    <div className="h-28 flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-lg text-xs text-gray-400 p-3 text-center dark:border-gray-800">
                      <span>{t("noOpportunitiesInStage")}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal para Crear Nueva Oportunidad */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-lg border border-gray-300 bg-white p-5 shadow-xl dark:border-gray-800 dark:bg-gray-900">
            <div className="flex items-center justify-between pb-3 border-b border-gray-300 dark:border-gray-800">
              <div>
                <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                  {t("newOpportunityModal")}
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  {t("newOpportunityModalDesc")}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer"
              >
                <X className="size-4" />
              </button>
            </div>

            <form onSubmit={handleCreateDeal} className="space-y-3.5 pt-3">
              <div>
                <label className="text-xs font-medium text-gray-700 dark:text-gray-300">
                  {t("prospectNameLabel")}
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Sofia Navarro"
                  value={newDealName}
                  onChange={(e) => setNewDealName(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-xs focus:border-brand-500 focus:outline-hidden dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-gray-700 dark:text-gray-300">
                  {t("companyLabel")}
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Nexo Growth Solutions"
                  value={newDealCompany}
                  onChange={(e) => setNewDealCompany(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-xs focus:border-brand-500 focus:outline-hidden dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-gray-700 dark:text-gray-300">
                  {t("titleLabel")}
                </label>
                <input
                  type="text"
                  placeholder="Ej. VP of Sales"
                  value={newDealTitle}
                  onChange={(e) => setNewDealTitle(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-xs focus:border-brand-500 focus:outline-hidden dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-medium text-gray-700 dark:text-gray-300">
                    {t("initialStageLabel")}
                  </label>
                  <select
                    value={newDealStage}
                    onChange={(e) => setNewDealStage(e.target.value as PipelineStageId)}
                    className="mt-1 w-full rounded-lg border border-gray-300 px-2 py-2 text-xs dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  >
                    {PIPELINE_STAGES.map((s) => (
                      <option key={s.id} value={s.id}>
                        {getStageLocalizedName(s.id, s.name)}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-700 dark:text-gray-300">
                    {t("priorityLabel")}
                  </label>
                  <select
                    value={newDealPriority}
                    onChange={(e) =>
                      setNewDealPriority(e.target.value as "Alta" | "Media" | "Baja")
                    }
                    className="mt-1 w-full rounded-lg border border-gray-300 px-2 py-2 text-xs dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  >
                    <option value="Alta">{t("priorityHigh")}</option>
                    <option value="Media">{t("priorityMedium")}</option>
                    <option value="Baja">{t("priorityLow")}</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-gray-700 dark:text-gray-300">
                  {t("originCampaignLabel")}
                </label>
                <select
                  value={newDealCampaign}
                  onChange={(e) => setNewDealCampaign(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-2 py-2 text-xs dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                >
                  <option value="Nivel 1 - Post Lead Magnet SISTEMA">
                    Nivel 1 - Post Lead Magnet SISTEMA
                  </option>
                  <option value="01. Secuencia: Listas de Leads">
                    01. Secuencia: Listas de Leads
                  </option>
                  <option value="02. Secuencia: Lead Magnet">
                    02. Secuencia: Lead Magnet
                  </option>
                  <option value="Nivel 2 - Comentarios en Competidores">
                    Nivel 2 - Comentarios en Competidores
                  </option>
                  <option value="Nivel 3 - Grupos y Temas Estratégicos">
                    Nivel 3 - Grupos y Temas Estratégicos
                  </option>
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-gray-700 dark:text-gray-300">
                  {t("notesLabel")}
                </label>
                <textarea
                  rows={2}
                  placeholder={t("notesPlaceholder")}
                  value={newDealNotes}
                  onChange={(e) => setNewDealNotes(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-xs focus:border-brand-500 focus:outline-hidden dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-gray-200 dark:border-gray-800">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 cursor-pointer"
                >
                  {t("cancel")}
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-brand-500 px-4 py-1.5 text-xs font-semibold text-white hover:bg-brand-600 transition cursor-pointer"
                >
                  {t("saveOpportunity")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal para Ver y Editar Oportunidad Comercial */}
      {editingDeal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-lg border border-gray-300 bg-white p-5 shadow-xl dark:border-gray-800 dark:bg-gray-900 animate-fade-in">
            {/* Header del Modal */}
            <div className="flex items-center justify-between pb-3 border-b border-gray-300 dark:border-gray-800">
              <div className="flex items-center gap-2.5">
                <div className="size-8 rounded-full bg-brand-500 text-white font-bold text-xs flex items-center justify-center shrink-0">
                  {editingDeal.avatarInitials}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white leading-tight">
                    {editingDeal.leadName}
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {editingDeal.leadTitle} • {editingDeal.company}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setEditingDeal(null);
                  setConfirmDeleteId(null);
                }}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* Enlaces rápidos a Leads 360 y a Inbox */}
            <div className="flex items-center gap-2 pt-2.5 pb-1">
              <Link
                href={`/leads?search=${encodeURIComponent(editingDeal.leadName)}`}
                className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50 hover:text-brand-600 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800 transition"
              >
                <ExternalLink className="size-3 text-brand-500" />
                <span>{t("view360Lead")}</span>
              </Link>

              <Link
                href={`/inbox?leadId=${editingDeal.leadId}`}
                className="inline-flex items-center gap-1 rounded-lg border border-brand-200 bg-brand-50/50 px-2.5 py-1 text-xs font-semibold text-brand-700 hover:bg-brand-100 dark:border-brand-800 dark:bg-brand-950/40 dark:text-brand-300 transition"
              >
                <MessageSquare className="size-3 text-brand-500" />
                <span>{t("openInbox")}</span>
              </Link>
            </div>

            {/* Formulario de Edición */}
            <form onSubmit={handleSaveEditDeal} className="space-y-3 pt-2">
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-xs font-medium text-gray-700 dark:text-gray-300">
                    {t("changeStage")}
                  </label>
                  <select
                    value={editDealStage}
                    onChange={(e) => setEditDealStage(e.target.value as PipelineStageId)}
                    className="mt-1 w-full rounded-lg border border-gray-300 px-2 py-2 text-xs font-semibold text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  >
                    {PIPELINE_STAGES.map((s) => (
                      <option key={s.id} value={s.id}>
                        {getStageLocalizedName(s.id, s.name)}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-medium text-gray-700 dark:text-gray-300">
                    {t("priorityLabel")}
                  </label>
                  <select
                    value={editDealPriority}
                    onChange={(e) =>
                      setEditDealPriority(e.target.value as "Alta" | "Media" | "Baja")
                    }
                    className="mt-1 w-full rounded-lg border border-gray-300 px-2 py-2 text-xs dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  >
                    <option value="Alta">{t("priorityHigh")}</option>
                    <option value="Media">{t("priorityMedium")}</option>
                    <option value="Baja">{t("priorityLow")}</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-gray-700 dark:text-gray-300">
                  {t("meetingDateLabel")}
                </label>
                <input
                  type="text"
                  placeholder="Ej. 12 Nov - 16:30 hs"
                  value={editDealMeetingDate}
                  onChange={(e) => setEditDealMeetingDate(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-xs focus:border-brand-500 focus:outline-hidden dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-gray-700 dark:text-gray-300">
                  {t("nextActionLabel")}
                </label>
                <input
                  type="text"
                  value={editDealNextAction}
                  onChange={(e) => setEditDealNextAction(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-xs focus:border-brand-500 focus:outline-hidden dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-gray-700 dark:text-gray-300">
                  {t("notesLabel")}
                </label>
                <textarea
                  rows={3}
                  placeholder={t("notesPlaceholder")}
                  value={editDealNotes}
                  onChange={(e) => setEditDealNotes(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-xs focus:border-brand-500 focus:outline-hidden dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                />
              </div>

              {/* Confirmación de eliminación */}
              {confirmDeleteId === editingDeal.id ? (
                <div className="rounded-lg bg-red-50 p-2.5 text-xs text-red-700 dark:bg-red-950/40 dark:text-red-300 border border-red-200 dark:border-red-900/40">
                  <p className="font-semibold">{t("confirmDelete")}</p>
                  <div className="mt-2 flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteId(null)}
                      className="rounded border border-gray-300 px-2.5 py-1 text-xs text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 cursor-pointer"
                    >
                      {t("cancel")}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteDeal(editingDeal.id)}
                      className="rounded bg-red-600 px-2.5 py-1 text-xs font-bold text-white hover:bg-red-700 cursor-pointer"
                    >
                      {t("confirmDeleteAction")}
                    </button>
                  </div>
                </div>
              ) : null}

              {/* Botones de acción del Modal */}
              <div className="pt-2 flex items-center justify-between border-t border-gray-200 dark:border-gray-800">
                <button
                  type="button"
                  onClick={() => setConfirmDeleteId(editingDeal.id)}
                  className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 flex items-center gap-1 transition cursor-pointer"
                  title={t("deleteOpportunity")}
                >
                  <Trash2 className="size-3.5" />
                  <span>{t("deleteOpportunity")}</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingDeal(null);
                      setConfirmDeleteId(null);
                    }}
                    className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 cursor-pointer"
                  >
                    {t("cancel")}
                  </button>
                  <button
                    type="submit"
                    className="rounded-lg bg-brand-500 px-4 py-1.5 text-xs font-semibold text-white hover:bg-brand-600 transition cursor-pointer"
                  >
                    {t("saveChanges")}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
