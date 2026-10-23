"use client";

import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { PIPELINE_STAGES } from "@/lib/pipeline/mock-data";
import { addPipelineDeal, getPipelineDeals, moveDealStage } from "@/lib/pipeline/store";
import type { PipelineDeal, PipelineStageId } from "@/lib/pipeline/types";
import {
  ArrowLeft,
  ArrowRight,
  Briefcase,
  Building,
  Calendar,
  DollarSign,
  Filter,
  MessageSquare,
  Plus,
  Search,
  Sparkles,
  TrendingUp,
  UserCheck,
  X,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

export default function PipelinePage() {
  const [deals, setDeals] = useState<PipelineDeal[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [campaignFilter, setCampaignFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [draggedDealId, setDraggedDealId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Formulario nuevo deal
  const [newDealName, setNewDealName] = useState("");
  const [newDealTitle, setNewDealTitle] = useState("");
  const [newDealCompany, setNewDealCompany] = useState("");
  const [newDealValue, setNewDealValue] = useState("$1,500/mes");
  const [newDealStage, setNewDealStage] = useState<PipelineStageId>("lead_captured");
  const [newDealCampaign, setNewDealCampaign] = useState("Nivel 1 - Post Lead Magnet SISTEMA");
  const [newDealPriority, setNewDealPriority] = useState<"Alta" | "Media" | "Baja">("Alta");

  useEffect(() => {
    setDeals(getPipelineDeals());
  }, []);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => {
      setToastMsg(null);
    }, 3000);
  };

  const filteredDeals = useMemo(() => {
    return deals.filter((d) => {
      const matchSearch =
        d.leadName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.leadTitle.toLowerCase().includes(searchQuery.toLowerCase());

      const matchCampaign =
        campaignFilter === "all" || d.sourceCampaign.includes(campaignFilter);

      const matchPriority =
        priorityFilter === "all" || d.priority === priorityFilter;

      return matchSearch && matchCampaign && matchPriority;
    });
  }, [deals, searchQuery, campaignFilter, priorityFilter]);

  // Cálculos de métricas
  const totalPipelineMRR = useMemo(() => {
    return deals.reduce((acc, d) => {
      const clean = parseInt(d.dealValue.replace(/[^0-9]/g, ""), 10) || 0;
      return acc + clean;
    }, 0);
  }, [deals]);

  const wonDealsCount = useMemo(() => {
    return deals.filter((d) => d.stageId === "closed_won").length;
  }, [deals]);

  const activeMeetingsCount = useMemo(() => {
    return deals.filter((d) => d.stageId === "meeting_scheduled").length;
  }, [deals]);

  // Drag & drop handlers
  const handleDragStart = (e: React.DragEvent, dealId: string) => {
    setDraggedDealId(dealId);
    e.dataTransfer.setData("text/plain", dealId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, targetStage: PipelineStageId) => {
    e.preventDefault();
    const dealId = draggedDealId || e.dataTransfer.getData("text/plain");
    if (!dealId) return;

    const updated = moveDealStage(dealId, targetStage);
    setDeals(updated);
    setDraggedDealId(null);
    showToast(`Oportunidad movida a: ${PIPELINE_STAGES.find((s) => s.id === targetStage)?.name}`);
  };

  const handleMoveStep = (deal: PipelineDeal, direction: "prev" | "next") => {
    const currentIndex = PIPELINE_STAGES.findIndex((s) => s.id === deal.stageId);
    if (currentIndex === -1) return;

    const newIndex = direction === "next" ? currentIndex + 1 : currentIndex - 1;
    if (newIndex >= 0 && newIndex < PIPELINE_STAGES.length) {
      const targetStage = PIPELINE_STAGES[newIndex].id;
      const updated = moveDealStage(deal.id, targetStage);
      setDeals(updated);
      showToast(`Etapa cambiada a: ${PIPELINE_STAGES[newIndex].name}`);
    }
  };

  const handleCreateDeal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDealName || !newDealCompany) return;

    const initials = newDealName
      .split(" ")
      .map((w) => w[0])
      .join("")
      .substring(0, 2)
      .toUpperCase();

    const updated = addPipelineDeal({
      leadId: "lead-" + Date.now(),
      leadName: newDealName,
      leadTitle: newDealTitle || "Decisor Comercial",
      company: newDealCompany,
      location: "Remoto / B2B",
      avatarInitials: initials,
      dealValue: newDealValue,
      stageId: newDealStage,
      sourceCampaign: newDealCampaign,
      lastActivity: "Creado manualmente en Pipeline",
      nextAction: "Iniciar secuencia o seguimiento",
      priority: newDealPriority,
    });

    setDeals(updated);
    setIsModalOpen(false);
    setNewDealName("");
    setNewDealCompany("");
    setNewDealTitle("");
    showToast("Nueva oportunidad agregada al Pipeline");
  };

  return (
    <div className="flex flex-col min-h-[calc(100vh-140px)]">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed top-20 right-6 z-50 flex items-center gap-2 rounded-lg bg-gray-900 border border-brand-500/30 px-4 py-2.5 text-xs text-white shadow-xl dark:bg-black">
          <Sparkles className="size-4 text-brand-400" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Cabecera y Navegación */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4">
        <div>
          <PageBreadcrumb pageTitle="Pipeline CRM Comercial (Kanban)" />
          <p className="text-xs text-gray-500 dark:text-gray-400 -mt-3">
            Flujo de conversion visual de 7 etapas para prospeccion inbound y cierre de ventas en LinkedIn.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/pipeline/calendar"
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 transition flex items-center gap-1.5 shadow-2xs"
          >
            <Calendar className="size-3.5 text-brand-500" />
            <span>Calendario de Citas</span>
          </Link>
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="rounded-lg bg-brand-500 px-3.5 py-2 text-xs font-semibold text-white hover:bg-brand-600 transition flex items-center gap-1.5 shadow-xs"
          >
            <Plus className="size-3.5" />
            <span>Nueva Oportunidad</span>
          </button>
        </div>
      </div>

      {/* Tarjetas de Métricas de Ventas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <div className="rounded-lg border border-gray-300 bg-white p-3.5 shadow-2xs dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
            <span>Valor Total Pipeline</span>
            <DollarSign className="size-4 text-emerald-500" />
          </div>
          <p className="text-xl font-bold text-gray-900 dark:text-white mt-1">
            ${totalPipelineMRR.toLocaleString()} <span className="text-xs font-normal text-gray-400">MRR</span>
          </p>
          <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium mt-0.5 block">
            +18.4% vs mes anterior
          </span>
        </div>

        <div className="rounded-lg border border-gray-300 bg-white p-3.5 shadow-2xs dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
            <span>Oportunidades Activas</span>
            <TrendingUp className="size-4 text-brand-500" />
          </div>
          <p className="text-xl font-bold text-gray-900 dark:text-white mt-1">
            {deals.length} <span className="text-xs font-normal text-gray-400">leads en embudo</span>
          </p>
          <span className="text-xs text-gray-400 mt-0.5 block">
            Captados por senales LinkedIn
          </span>
        </div>

        <div className="rounded-lg border border-gray-300 bg-white p-3.5 shadow-2xs dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
            <span>Reuniones Agendadas</span>
            <Calendar className="size-4 text-purple-500" />
          </div>
          <p className="text-xl font-bold text-gray-900 dark:text-white mt-1">
            {activeMeetingsCount} <span className="text-xs font-normal text-gray-400">agendadas</span>
          </p>
          <span className="text-xs text-purple-600 dark:text-purple-400 font-medium mt-0.5 block">
            Sincronizadas con Google/Cal
          </span>
        </div>

        <div className="rounded-lg border border-gray-300 bg-white p-3.5 shadow-2xs dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
            <span>Deals Ganados</span>
            <UserCheck className="size-4 text-emerald-500" />
          </div>
          <p className="text-xl font-bold text-gray-900 dark:text-white mt-1">
            {wonDealsCount} <span className="text-xs font-normal text-gray-400">cerrados</span>
          </p>
          <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium mt-0.5 block">
            Tasa conversion: 28.5%
          </span>
        </div>
      </div>

      {/* Barra de Filtros */}
      <div className="rounded-lg border border-gray-300 bg-white p-3 mb-4 flex flex-wrap items-center justify-between gap-3 shadow-2xs dark:border-gray-800 dark:bg-gray-900">
        <div className="flex items-center gap-2 flex-1 min-w-[220px]">
          <Search className="size-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filtrar por prospecto, empresa o cargo..."
            className="w-full text-xs text-gray-800 bg-transparent focus:outline-hidden dark:text-white"
          />
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <Filter className="size-3.5" />
            <span className="hidden sm:inline">Campana:</span>
          </div>
          <select
            value={campaignFilter}
            onChange={(e) => setCampaignFilter(e.target.value)}
            className="rounded-lg border border-gray-300 bg-gray-50 px-2 py-1 text-xs text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
          >
            <option value="all">Todas las campanas</option>
            <option value="Nivel 1">Nivel 1 (Mis Posts)</option>
            <option value="Nivel 2">Nivel 2 (Competencia)</option>
            <option value="Nivel 3">Nivel 3 (LinkedIn Global)</option>
          </select>

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="rounded-lg border border-gray-300 bg-gray-50 px-2 py-1 text-xs text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
          >
            <option value="all">Todas las prioridades</option>
            <option value="Alta">Prioridad Alta</option>
            <option value="Media">Prioridad Media</option>
            <option value="Baja">Prioridad Baja</option>
          </select>
        </div>
      </div>

      {/* Tablero Kanban (7 Columnas con Scroll Horizontal) */}
      <div className="flex-1 overflow-x-auto pb-6">
        <div className="flex gap-3.5 min-w-[1700px] items-stretch">
          {PIPELINE_STAGES.map((stage) => {
            const stageDeals = filteredDeals.filter((d) => d.stageId === stage.id);
            const stageMRR = stageDeals.reduce((sum, d) => {
              return sum + (parseInt(d.dealValue.replace(/[^0-9]/g, ""), 10) || 0);
            }, 0);

            return (
              <div
                key={stage.id}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, stage.id)}
                className={`w-[245px] shrink-0 flex flex-col rounded-lg border border-gray-300 bg-gray-50/70 p-3 shadow-2xs dark:border-gray-800 dark:bg-gray-900/50 border-t-4 ${stage.headerBorder}`}
              >
                {/* Cabecera de Columna */}
                <div className="pb-2.5 mb-2.5 border-b border-gray-300 dark:border-gray-800">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-gray-900 dark:text-white truncate">
                      {stage.name}
                    </h4>
                    <span className="rounded-full bg-white px-2 py-0.5 text-xs font-bold text-gray-700 shadow-2xs dark:bg-gray-800 dark:text-gray-200">
                      {stageDeals.length}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                    <span>Volumen:</span>
                    <span className="font-semibold text-gray-800 dark:text-gray-200">
                      ${stageMRR.toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Lista de Tarjetas del Stage */}
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
                        <div className="min-w-0">
                          <h5 className="text-xs font-semibold text-gray-900 dark:text-white truncate">
                            {deal.leadName}
                          </h5>
                          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                            {deal.leadTitle}
                          </p>
                        </div>
                      </div>

                      <div className="text-xs font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1 mb-2">
                        <Building className="size-3 text-gray-400" />
                        <span className="truncate">{deal.company}</span>
                      </div>

                      {/* Deal Value */}
                      <div className="flex items-center justify-between pt-2 border-t border-gray-300 text-xs dark:border-gray-700/60">
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">
                          {deal.dealValue}
                        </span>
                        {deal.meetingDate && (
                          <span className="text-purple-600 dark:text-purple-400 font-semibold flex items-center gap-1">
                            <Calendar className="size-2.5" />
                            {deal.meetingDate}
                          </span>
                        )}
                      </div>

                      {/* Actividad / Siguiente Paso */}
                      <div className="mt-2 rounded-lg bg-gray-50 p-1.5 text-xs text-gray-500 dark:bg-gray-900/60 dark:text-gray-400">
                        <span className="font-semibold text-gray-700 dark:text-gray-300">Paso: </span>
                        {deal.nextAction}
                      </div>

                      {/* Barra de Acciones Rapidas */}
                      <div className="mt-2.5 pt-1.5 border-t border-gray-300 flex items-center justify-between dark:border-gray-700/60">
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleMoveStep(deal, "prev")}
                            title="Mover a etapa anterior"
                            className="p-1 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                          >
                            <ArrowLeft className="size-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMoveStep(deal, "next")}
                            title="Mover a siguiente etapa"
                            className="p-1 rounded-lg text-gray-400 hover:text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-950/40 transition"
                          >
                            <ArrowRight className="size-3" />
                          </button>
                        </div>

                        <Link
                          href="/inbox"
                          className="text-xs font-semibold text-brand-600 hover:underline flex items-center gap-1 dark:text-brand-400"
                        >
                          <MessageSquare className="size-3" />
                          <span>Inbox</span>
                        </Link>
                      </div>
                    </div>
                  ))}

                  {stageDeals.length === 0 && (
                    <div className="h-28 flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-lg text-xs text-gray-400 p-3 text-center dark:border-gray-800">
                      <span>Arrastra oportunidades aqui</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal para Crear Nueva Oportunidad */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-lg border border-gray-300 bg-white p-5 shadow-xl dark:border-gray-800 dark:bg-gray-900">
            <div className="flex items-center justify-between pb-3 border-b border-gray-300 dark:border-gray-800">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                Nueva Oportunidad Comercial
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                <X className="size-4" />
              </button>
            </div>

            <form onSubmit={handleCreateDeal} className="space-y-3.5 pt-3">
              <div>
                <label className="text-xs font-medium text-gray-700 dark:text-gray-300">
                  Nombre del Prospecto:
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
                  Empresa:
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

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-medium text-gray-700 dark:text-gray-300">
                    Cargo:
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. VP of Sales"
                    value={newDealTitle}
                    onChange={(e) => setNewDealTitle(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-xs focus:border-brand-500 focus:outline-hidden dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-700 dark:text-gray-300">
                    Valor Estimado:
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. $1,800/mes"
                    value={newDealValue}
                    onChange={(e) => setNewDealValue(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-xs focus:border-brand-500 focus:outline-hidden dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-medium text-gray-700 dark:text-gray-300">
                    Etapa Inicial:
                  </label>
                  <select
                    value={newDealStage}
                    onChange={(e) => setNewDealStage(e.target.value as PipelineStageId)}
                    className="mt-1 w-full rounded-lg border border-gray-300 px-2 py-2 text-xs dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  >
                    {PIPELINE_STAGES.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-700 dark:text-gray-300">
                    Prioridad:
                  </label>
                  <select
                    value={newDealPriority}
                    onChange={(e) => setNewDealPriority(e.target.value as "Alta" | "Media" | "Baja")}
                    className="mt-1 w-full rounded-lg border border-gray-300 px-2 py-2 text-xs dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  >
                    <option value="Alta">Alta</option>
                    <option value="Media">Media</option>
                    <option value="Baja">Baja</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-gray-700 dark:text-gray-300">
                  Campana de Origen:
                </label>
                <select
                  value={newDealCampaign}
                  onChange={(e) => setNewDealCampaign(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-2 py-2 text-xs dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                >
                  <option value="Nivel 1 - Post Lead Magnet SISTEMA">Nivel 1 - Post Lead Magnet SISTEMA</option>
                  <option value="Nivel 2 - Prospectos Adapta IA">Nivel 2 - Prospectos Adapta IA</option>
                  <option value="Nivel 3 - Social Selling Global">Nivel 3 - Social Selling Global</option>
                </select>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-brand-500 px-4 py-1.5 text-xs font-semibold text-white hover:bg-brand-600 transition"
                >
                  Guardar Oportunidad
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
