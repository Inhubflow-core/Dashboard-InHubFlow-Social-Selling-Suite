"use client";

import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import {
  getStoredLinearCampaigns,
  saveStoredLinearCampaigns,
  initialLinearCampaigns,
  defaultListsSequenceSteps,
  defaultLeadMagnetSequenceSteps,
} from "@/lib/campaigns/store";
import type {
  LinearSequenceCampaign,
  SequenceStepItem,
  SocialStepType,
} from "@/lib/campaigns/types";
import type { CampaignExecutionLog } from "@/lib/campaigns/runner";
import { getStoredLeadLists } from "@/lib/leads/store";
import type { LeadListGroup } from "@/lib/leads/types";
import {
  Pencil,
  X,
  Clock,
  Plus,
  Minus,
  Eye,
  ThumbsUp,
  MessageSquare,
  UserPlus,
  UserCheck,
  Send,
  MessageCircle,
  Sparkles,
  Shield,
  Play,
  CheckCircle2,
  Zap,
  FileText,
  ChevronDown,
  Terminal,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { getActiveAccountForUser } from "@/lib/unipile/store";

export default function CampaignsPage() {
  const { currentUser } = useAuth();
  const [campaigns, setCampaigns] = useState<LinearSequenceCampaign[]>([]);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>("seq-lead-lists");
  const [leadLists, setLeadLists] = useState<LeadListGroup[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Modales
  const [editingStep, setEditingStep] = useState<{ step: SequenceStepItem; index: number } | null>(null);
  const [showPacingModal, setShowPacingModal] = useState(false);
  const [showLogsModal, setShowLogsModal] = useState(false);
  const [showAddStepModal, setShowAddStepModal] = useState(false);

  // Popover de delay
  const [openDelayPopoverIndex, setOpenDelayPopoverIndex] = useState<number | null>(null);

  // Runner y Avisos
  const [isExecutingRunner, setIsExecutingRunner] = useState(false);
  const [runnerLogs, setRunnerLogs] = useState<CampaignExecutionLog[]>([]);
  const [runnerNotice, setRunnerNotice] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  // Cuenta activa de LinkedIn
  const activeAccount = useMemo(() => {
    return getActiveAccountForUser(currentUser);
  }, [currentUser]);

  // Cargar campañas y listas
  useEffect(() => {
    const stored = getStoredLinearCampaigns();
    setCampaigns(stored);
    const lists = getStoredLeadLists();
    setLeadLists(lists);
    setIsLoaded(true);

    // Revisar si viene listId por URL
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const listIdParam = params.get("listId");
      if (listIdParam && stored.length > 0) {
        const isMagnet = listIdParam.includes("n1") || listIdParam.includes("magnet");
        setSelectedCampaignId(isMagnet ? "seq-lead-magnet" : "seq-lead-lists");
      }
    }
  }, []);

  // Cerrar popover al hacer clic fuera
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as HTMLElement;
      if (!target.closest("[data-delay-popover]")) {
        setOpenDelayPopoverIndex(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const activeCampaign = useMemo(() => {
    return campaigns.find((c) => c.id === selectedCampaignId) || campaigns[0] || initialLinearCampaigns[0];
  }, [campaigns, selectedCampaignId]);

  const updateActiveCampaign = (updater: (prev: LinearSequenceCampaign) => LinearSequenceCampaign) => {
    setCampaigns((prev) => {
      const updated = prev.map((c) => (c.id === activeCampaign.id ? updater(c) : c));
      saveStoredLinearCampaigns(updated);
      return updated;
    });
  };

  const handleUpdateStepDelay = (stepIndex: number, newDays: number) => {
    updateActiveCampaign((c) => {
      const nextSteps = [...c.steps];
      if (nextSteps[stepIndex]) {
        nextSteps[stepIndex] = {
          ...nextSteps[stepIndex],
          delayDaysBefore: Math.max(0, newDays),
        };
      }
      return {
        ...c,
        steps: nextSteps,
        updatedAt: new Date().toISOString(),
      };
    });
  };

  const handleDeleteStep = (stepIndex: number) => {
    if (confirm("¿Deseas eliminar este paso de la secuencia?")) {
      updateActiveCampaign((c) => {
        const nextSteps = c.steps.filter((_, idx) => idx !== stepIndex);
        return {
          ...c,
          steps: nextSteps,
          updatedAt: new Date().toISOString(),
        };
      });
    }
  };

  const handleSaveStepModal = (updatedStep: SequenceStepItem) => {
    if (!editingStep) return;
    updateActiveCampaign((c) => {
      const nextSteps = [...c.steps];
      nextSteps[editingStep.index] = updatedStep;
      return {
        ...c,
        steps: nextSteps,
        updatedAt: new Date().toISOString(),
      };
    });
    setEditingStep(null);
    setFeedbackMessage("Paso de la secuencia actualizado exitosamente.");
    setTimeout(() => setFeedbackMessage(null), 3000);
  };

  const handleAddStep = (type: SocialStepType) => {
    let title = "Nuevo Paso";
    let description = "Paso adicional en la secuencia.";
    let messageTemplate = "";

    if (type === "visit") {
      title = "Visitar Perfil";
      description = "Visita el perfil en LinkedIn para generar visibilidad previa en notificaciones.";
    } else if (type === "like_comment") {
      title = "Like + Comentar";
      description = "Interactúa con la publicación más reciente del prospecto.";
      messageTemplate = "Excelente perspectiva {{first_name}}, totalmente de acuerdo.";
    } else if (type === "connect") {
      title = "Solicitar Conexión";
      description = "Envía solicitud de conexión con nota contextual.";
      messageTemplate = "Hola {{first_name}}, vi tu actividad sobre {{topic}} y quería conectar contigo.";
    } else if (type === "message_icebreaker") {
      title = "Mensaje DM 01 'Icebreakers'";
      description = "Primer mensaje directo en LinkedIn tras conectar.";
      messageTemplate = "Hola {{first_name}}, vi tu aportación sobre {{topic}}. ¿Cómo lo resuelven en {{company}}?";
    } else if (type === "message_followup") {
      title = "Mensaje DM 'Follow-up'";
      description = "Mensaje de seguimiento de valor.";
      messageTemplate = "Hola {{first_name}}, te comparto este caso práctico breve sobre {{topic}}.";
    } else if (type === "message_value_prop") {
      title = "Mensaje DM 'Value Prop'";
      description = "Propuesta de valor y llamada a la acción.";
      messageTemplate = "Hola {{first_name}}, si deseas optimizar el pipeline de {{company}}, podemos conversar 15 min esta semana.";
    }

    const newStepItem: SequenceStepItem = {
      id: `step-${Date.now()}`,
      order: activeCampaign.steps.length + 1,
      type,
      title,
      description,
      delayDaysBefore: 1,
      messageTemplate,
    };

    updateActiveCampaign((c) => ({
      ...c,
      steps: [...c.steps, newStepItem],
      updatedAt: new Date().toISOString(),
    }));

    setShowAddStepModal(false);
  };

  const handleResetSequence = () => {
    if (confirm("¿Restablecer la secuencia actual a su plantilla por defecto?")) {
      updateActiveCampaign((c) => {
        const defaultSteps =
          c.code === "01_lists" ? defaultListsSequenceSteps : defaultLeadMagnetSequenceSteps;
        return {
          ...c,
          steps: defaultSteps,
          updatedAt: new Date().toISOString(),
        };
      });
      setFeedbackMessage("Secuencia restablecida a su estructura estándar.");
      setTimeout(() => setFeedbackMessage(null), 3000);
    }
  };

  const handleExecuteRunnerSim = async () => {
    setIsExecutingRunner(true);
    setRunnerNotice(null);
    try {
      const res = await fetch("/api/campaigns/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadName: "Roberto OrSe (Prospecto)",
          linkedinUrl: "https://www.linkedin.com/in/robertoorse-agencia",
          connectionDegree: "2nd",
          accountId: activeAccount?.unipileAccountId || activeAccount?.id,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setRunnerNotice("Simulación completada: Paso de secuencia procesado con éxito.");
        setTimeout(() => setRunnerNotice(null), 4000);
        fetch("/api/campaigns/run")
          .then((r) => r.json())
          .then((d) => setRunnerLogs(d.logs || []));
      }
    } catch (err: any) {
      console.warn("Error en runner:", err);
    } finally {
      setIsExecutingRunner(false);
    }
  };

  const handleOpenLogs = () => {
    fetch("/api/campaigns/run")
      .then((r) => r.json())
      .then((d) => {
        setRunnerLogs(d.logs || []);
        setShowLogsModal(true);
      })
      .catch(() => setShowLogsModal(true));
  };

  const getStepIcon = (type: SocialStepType) => {
    switch (type) {
      case "visit":
        return <Eye className="h-4 w-4 text-blue-600 dark:text-blue-400" />;
      case "like_comment":
        return <ThumbsUp className="h-4 w-4 text-purple-600 dark:text-purple-400" />;
      case "connect":
      case "connect_message":
        return <UserPlus className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />;
      case "message_icebreaker":
        return <Send className="h-4 w-4 text-brand-600 dark:text-brand-400" />;
      case "message_followup":
        return <MessageCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />;
      case "message_value_prop":
        return <Sparkles className="h-4 w-4 text-brand-500" />;
    }
  };

  const getStepBadgeColor = (type: SocialStepType) => {
    switch (type) {
      case "visit":
        return "bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-800";
      case "like_comment":
        return "bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border-purple-200 dark:border-purple-800";
      case "connect":
      case "connect_message":
        return "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800";
      case "message_icebreaker":
        return "bg-brand-50 text-brand-700 dark:bg-brand-950/60 dark:text-brand-300 border-brand-200 dark:border-brand-800";
      case "message_followup":
        return "bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800";
      case "message_value_prop":
        return "bg-brand-50 text-brand-700 dark:bg-brand-950/60 dark:text-brand-300 border-brand-200 dark:border-brand-800";
    }
  };

  return (
    <div className="space-y-6">
      <PageBreadcrumb pageTitle="Campañas de Social Selling (Secuencias Lineales)" />

      {/* Cabecera Principal */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-5 rounded-2xl bg-white border border-gray-200 dark:bg-gray-900 dark:border-gray-800 shadow-theme-xs">
        <div>
          <h3 className="text-base font-bold text-gray-900 dark:text-white">
            Motor de Outreach Relacional en LinkedIn
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 max-w-2xl">
            Secuencias lineales con retardo humano entre pasos, inspiradas en la arquitectura de Outreach B2B. Los prospectos captados en Signal Radar se ejecutan respetando los límites de seguridad y la detención automática ante respuesta.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {feedbackMessage && (
            <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-3 py-1.5 rounded-lg border border-emerald-200 dark:border-emerald-800">
              <CheckCircle2 className="size-3.5" />
              {feedbackMessage}
            </span>
          )}

          {runnerNotice && (
            <span className="flex items-center gap-1 text-xs font-semibold text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-950/40 px-3 py-1.5 rounded-lg border border-brand-200 dark:border-brand-800">
              <CheckCircle2 className="size-3.5" />
              {runnerNotice}
            </span>
          )}

          <button
            type="button"
            onClick={() => setShowPacingModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
          >
            <Shield className="size-3.5 text-emerald-600" />
            <span>Límites de Seguridad ({activeCampaign.dailyLimits.maxConnectionsPerDay}/día)</span>
          </button>

          <button
            type="button"
            disabled={isExecutingRunner}
            onClick={handleExecuteRunnerSim}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-brand-500 hover:bg-brand-600 text-white text-xs font-semibold shadow-xs transition disabled:opacity-50"
          >
            {isExecutingRunner ? (
              <>
                <span className="h-3 w-3 rounded-full border-2 border-white/40 border-t-white animate-spin"></span>
                <span>Ejecutando...</span>
              </>
            ) : (
              <>
                <Play className="size-3.5" />
                <span>Simular Ejecución</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleOpenLogs}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
          >
            <Terminal className="size-3.5 text-gray-500" />
            <span>Logs</span>
          </button>
        </div>
      </div>

      {/* Selector de Pestañas de Secuencias Maestras */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 dark:border-gray-800 pb-3">
        <div className="flex items-center gap-2">
          {campaigns.map((camp) => {
            const isSelected = camp.id === selectedCampaignId;
            return (
              <button
                key={camp.id}
                type="button"
                onClick={() => setSelectedCampaignId(camp.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
                  isSelected
                    ? "bg-brand-500 text-white shadow-2xs"
                    : "bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300 hover:border-gray-300"
                }`}
              >
                <span>{camp.name}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    isSelected ? "bg-white/20 text-white" : "bg-gray-100 dark:bg-gray-800 text-gray-500"
                  }`}
                >
                  {camp.steps.length} pasos
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() =>
              updateActiveCampaign((c) => ({
                ...c,
                status: c.status === "active" ? "paused" : "active",
              }))
            }
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              activeCampaign.status === "active"
                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
            }`}
          >
            {activeCampaign.status === "active" ? "Estado: Secuencia Activa" : "Estado: Pausada"}
          </button>

          <button
            type="button"
            onClick={handleResetSequence}
            className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 font-medium px-2 py-1"
          >
            Restablecer Plantilla
          </button>
        </div>
      </div>

      {/* Contenedor Vertical de la Secuencia Lineal */}
      <div className="max-w-3xl mx-auto space-y-0 py-2">
        {/* Card del Disparador / Activador */}
        <div className="rounded-2xl border-2 border-dashed border-brand-300 dark:border-brand-900/60 bg-brand-50/30 dark:bg-brand-950/20 p-4 shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-brand-500 text-white flex items-center justify-center shrink-0 shadow-xs">
              <Zap className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider bg-brand-100 dark:bg-brand-900/60 text-brand-700 dark:text-brand-300 px-2 py-0.5 rounded-md">
                  Activador
                </span>
                <h4 className="text-sm font-bold text-gray-900 dark:text-white">
                  {activeCampaign.triggerTitle}
                </h4>
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">
                {activeCampaign.triggerDescription}
              </p>
            </div>
          </div>
        </div>

        {/* Pasos y Conectores de Delay */}
        {activeCampaign.steps.map((step, idx) => {
          const isFirst = idx === 0;

          return (
            <div key={step.id}>
              {/* Conector de Delay (NO es una card, pastilla simple como en #b2b) */}
              {!isFirst && (
                <div
                  className="flex items-center gap-2 py-1.5 pl-6 select-none"
                  data-delay-popover
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Línea vertical con punto */}
                  <div className="flex flex-col items-center gap-0.5 shrink-0">
                    <div className="w-px h-3 bg-gray-300 dark:bg-gray-700" />
                    <div className="w-1.5 h-1.5 rounded-full bg-brand-500" />
                    <div className="w-px h-3 bg-gray-300 dark:bg-gray-700" />
                  </div>

                  {/* Píldora compacta de retardo */}
                  <div className="relative">
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-2xs hover:border-brand-500/50 transition">
                      <Clock className="h-3 w-3 text-brand-500 shrink-0" />

                      {/* Botón '-' para restar día */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleUpdateStepDelay(idx, Math.max(0, step.delayDaysBefore - 1));
                        }}
                        disabled={step.delayDaysBefore <= 0}
                        className="w-4 h-4 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-20 transition"
                        title="Restar 1 día"
                      >
                        <Minus className="h-2.5 w-2.5" />
                      </button>

                      {/* Texto editable con indicador desplegable */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenDelayPopoverIndex(openDelayPopoverIndex === idx ? null : idx);
                        }}
                        className="text-[11px] font-semibold text-gray-700 dark:text-gray-200 hover:text-brand-500 transition flex items-center gap-1 px-1 py-0.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
                        title="Seleccionar tiempo de espera"
                      >
                        <span>
                          {step.delayDaysBefore > 0
                            ? `Esperar ${step.delayDaysBefore} ${step.delayDaysBefore === 1 ? "día" : "días"}`
                            : "Inmediato (0 días)"}
                        </span>
                        <ChevronDown className="h-2.5 w-2.5 text-gray-400" />
                      </button>

                      {/* Botón '+' para sumar día */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleUpdateStepDelay(idx, step.delayDaysBefore + 1);
                        }}
                        className="w-4 h-4 rounded-full flex items-center justify-center bg-brand-50 text-brand-600 hover:bg-brand-500 hover:text-white dark:bg-brand-950 dark:text-brand-300 dark:hover:bg-brand-600 transition font-bold"
                        title="Sumar 1 día"
                      >
                        <Plus className="h-2.5 w-2.5" />
                      </button>
                    </div>

                    {/* Popover desplegable con presets */}
                    {openDelayPopoverIndex === idx && (
                      <div
                        onClick={(e) => e.stopPropagation()}
                        className="absolute left-0 top-full mt-1.5 z-40 w-64 p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl space-y-2.5"
                      >
                        <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-700/60 pb-1.5">
                          <span className="text-xs font-bold text-gray-800 dark:text-white flex items-center gap-1.5">
                            <Clock className="h-3.5 w-3.5 text-brand-500" />
                            Tiempo de Espera
                          </span>
                          <button
                            type="button"
                            onClick={() => setOpenDelayPopoverIndex(null)}
                            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xs font-bold"
                          >
                            ✕
                          </button>
                        </div>

                        {/* Presets rápidos */}
                        <div className="grid grid-cols-3 gap-1.5">
                          {[
                            { label: "0d Inmed.", days: 0 },
                            { label: "1 día", days: 1 },
                            { label: "2 días", days: 2 },
                            { label: "3 días", days: 3 },
                            { label: "5 días", days: 5 },
                            { label: "7 días", days: 7 },
                          ].map(({ label, days }) => {
                            const active = step.delayDaysBefore === days;
                            return (
                              <button
                                key={days}
                                type="button"
                                onClick={() => {
                                  handleUpdateStepDelay(idx, days);
                                  setOpenDelayPopoverIndex(null);
                                }}
                                className={`text-xs py-1 px-1.5 rounded-lg border font-semibold transition text-center ${
                                  active
                                    ? "bg-brand-500 text-white border-brand-500"
                                    : "bg-gray-50 dark:bg-gray-700/50 text-gray-700 dark:text-gray-200 border-gray-200 dark:border-gray-700 hover:bg-gray-100"
                                }`}
                              >
                                {label}
                              </button>
                            );
                          })}
                        </div>

                        {/* Input numérico */}
                        <div className="pt-1.5 border-t border-gray-100 dark:border-gray-700/60 flex items-center justify-between">
                          <span className="text-[11px] text-gray-400">Personalizado:</span>
                          <div className="flex items-center gap-1.5">
                            <input
                              type="number"
                              min={0}
                              max={60}
                              value={step.delayDaysBefore}
                              onChange={(e) => {
                                const val = Math.max(0, parseInt(e.target.value) || 0);
                                handleUpdateStepDelay(idx, val);
                              }}
                              className="w-14 px-2 py-0.5 text-xs text-center border border-gray-200 dark:border-gray-700 rounded bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-200 focus:outline-none focus:border-brand-500"
                            />
                            <span className="text-xs text-gray-500">días</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Card del Paso */}
              <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 shadow-2xs hover:border-gray-300 dark:hover:border-gray-700 transition">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    {/* Caja de Icono */}
                    <div className="h-9 w-9 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 flex items-center justify-center shrink-0 mt-0.5">
                      {getStepIcon(step.type)}
                    </div>

                    {/* Contenido del Paso */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-gray-400 dark:text-gray-500">
                          {String(idx + 1).padStart(2, "0")}.
                        </span>
                        <h4 className="text-sm font-bold text-gray-900 dark:text-white">
                          {step.title}
                        </h4>
                        <span
                          className={`rounded-full px-2 py-0.2 text-[10px] font-bold border ${getStepBadgeColor(
                            step.type
                          )}`}
                        >
                          {step.type.replace(/_/g, " ").toUpperCase()}
                        </span>
                        {step.isInheritedFromMonitor && (
                          <span className="rounded-full bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 px-2 py-0.2 text-[10px] font-bold border border-blue-200 dark:border-blue-800">
                            Heredado de Signal Radar
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {step.description}
                      </p>

                      {/* Preview de Mensaje o Nota */}
                      {step.messageTemplate && (
                        <div className="mt-2.5 rounded-lg border border-gray-100 dark:border-gray-800 bg-gray-50/70 dark:bg-gray-800/40 p-2 text-xs font-mono text-gray-700 dark:text-gray-300 line-clamp-2">
                          {step.messageTemplate}
                        </div>
                      )}

                      {step.connectNote && (
                        <div className="mt-2.5 rounded-lg border border-emerald-100 dark:border-emerald-900/40 bg-emerald-50/40 dark:bg-emerald-950/20 p-2 text-xs font-mono text-emerald-800 dark:text-emerald-300 line-clamp-2">
                          <span className="font-bold font-sans text-[10px] uppercase text-emerald-600 block mb-0.5">
                            Nota de Invitación:
                          </span>
                          {step.connectNote}
                        </div>
                      )}

                      {step.attachedResource && (
                        <div className="mt-2 flex items-center gap-1.5 text-xs text-brand-600 dark:text-brand-400 font-semibold">
                          <FileText className="h-3.5 w-3.5" />
                          <span>Adjunto: {step.attachedResource}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Los 2 botones cuadraditos exactos de la imagen */}
                  <div className="flex items-center gap-1.5 shrink-0 pt-0.5">
                    {/* Botón Editar (Pencil) */}
                    <button
                      type="button"
                      onClick={() => setEditingStep({ step, index: idx })}
                      className="h-[26px] w-[26px] rounded-md border border-gray-200 text-gray-600 hover:border-brand-500 hover:text-brand-600 hover:bg-brand-50 dark:border-gray-700 dark:text-gray-300 dark:hover:border-brand-500 dark:hover:text-brand-400 inline-flex items-center justify-center transition"
                      title="Editar paso de la secuencia"
                    >
                      <Pencil className="size-3.5" />
                    </button>

                    {/* Botón Eliminar (X) */}
                    <button
                      type="button"
                      onClick={() => handleDeleteStep(idx)}
                      className="h-[26px] w-[26px] rounded-md border border-red-200 text-red-500 hover:bg-red-50 dark:border-red-900/40 dark:text-red-400 inline-flex items-center justify-center transition"
                      title="Eliminar paso"
                    >
                      <X className="size-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {/* Botón para Añadir Nuevo Paso */}
        <div className="pt-4 flex justify-center">
          <button
            type="button"
            onClick={() => setShowAddStepModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-dashed border-gray-300 dark:border-gray-700 hover:border-brand-500 text-xs font-semibold text-gray-600 dark:text-gray-300 hover:text-brand-600 hover:bg-brand-50/40 transition"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Agregar Paso a la Secuencia</span>
          </button>
        </div>
      </div>

      {/* Modal de Edición de Paso */}
      {editingStep && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-2xl dark:bg-gray-900 border border-gray-200 dark:border-gray-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800">
              <h3 className="font-bold text-gray-900 dark:text-white text-sm">
                Configurar Paso: {editingStep.step.title}
              </h3>
              <button
                type="button"
                onClick={() => setEditingStep(null)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">
                  Nombre del Paso
                </label>
                <input
                  type="text"
                  value={editingStep.step.title}
                  onChange={(e) =>
                    setEditingStep({
                      ...editingStep,
                      step: { ...editingStep.step, title: e.target.value },
                    })
                  }
                  className="h-9 w-full rounded-lg border border-gray-300 px-3 text-xs dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                />
              </div>

              {editingStep.step.connectNote !== undefined && (
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">
                    Nota de Conexión en LinkedIn
                  </label>
                  <textarea
                    rows={3}
                    value={editingStep.step.connectNote || ""}
                    onChange={(e) =>
                      setEditingStep({
                        ...editingStep,
                        step: { ...editingStep.step, connectNote: e.target.value },
                      })
                    }
                    className="w-full rounded-lg border border-gray-300 p-2.5 text-xs font-mono dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  />
                  <span className="text-[10px] text-gray-400 mt-0.5 block">
                    Variables: &#123;&#123;first_name&#125;&#125;, &#123;&#123;topic&#125;&#125;, &#123;&#123;keyword&#125;&#125;.
                  </span>
                </div>
              )}

              {editingStep.step.messageTemplate !== undefined && (
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">
                    Plantilla de Mensaje Directo (DM)
                  </label>
                  <textarea
                    rows={4}
                    value={editingStep.step.messageTemplate || ""}
                    onChange={(e) =>
                      setEditingStep({
                        ...editingStep,
                        step: { ...editingStep.step, messageTemplate: e.target.value },
                      })
                    }
                    className="w-full rounded-lg border border-gray-300 p-2.5 text-xs font-mono dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  />
                  <div className="flex items-center gap-1.5 flex-wrap mt-1">
                    <span className="text-[10px] text-gray-400">Insertar variable:</span>
                    {["{{first_name}}", "{{company}}", "{{topic}}", "{{author_name}}"].map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() =>
                          setEditingStep({
                            ...editingStep,
                            step: {
                              ...editingStep.step,
                              messageTemplate: `${editingStep.step.messageTemplate || ""} ${tag}`,
                            },
                          })
                        }
                        className="text-[10px] bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 px-1.5 py-0.5 rounded font-mono hover:bg-gray-200"
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {editingStep.step.attachedResource !== undefined && (
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">
                    Archivo o Recurso Adjunto
                  </label>
                  <input
                    type="text"
                    value={editingStep.step.attachedResource || ""}
                    onChange={(e) =>
                      setEditingStep({
                        ...editingStep,
                        step: { ...editingStep.step, attachedResource: e.target.value },
                      })
                    }
                    className="h-9 w-full rounded-lg border border-gray-300 px-3 text-xs dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  />
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-gray-100 dark:border-gray-800">
              <button
                type="button"
                onClick={() => setEditingStep(null)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => handleSaveStepModal(editingStep.step)}
                className="rounded-lg bg-brand-500 px-4 py-2 text-xs font-semibold text-white hover:bg-brand-600 transition"
              >
                Guardar Cambios
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Selección para Añadir Paso */}
      {showAddStepModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl dark:bg-gray-900 border border-gray-200 dark:border-gray-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800">
              <h3 className="font-bold text-gray-900 dark:text-white text-sm">
                Seleccionar Tipo de Paso
              </h3>
              <button
                type="button"
                onClick={() => setShowAddStepModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2">
              {[
                { type: "visit" as const, title: "Visitar Perfil", desc: "Visita previa para figurar en notificaciones" },
                { type: "like_comment" as const, title: "Like + Comentar", desc: "Interacción combinada en el post del prospecto" },
                { type: "connect" as const, title: "Solicitar Conexión", desc: "Envío de invitación con nota opcional" },
                { type: "message_icebreaker" as const, title: "Mensaje DM Icebreaker", desc: "Mensaje contextualizado según la señal" },
                { type: "message_followup" as const, title: "Mensaje DM Follow-up", desc: "Seguimiento de valor" },
                { type: "message_value_prop" as const, title: "Mensaje DM Value Prop", desc: "Propuesta de valor y agenda de llamada" },
              ].map((opt) => (
                <button
                  key={opt.type}
                  type="button"
                  onClick={() => handleAddStep(opt.type)}
                  className="w-full flex items-center justify-between p-3 rounded-xl border border-gray-200 dark:border-gray-800 hover:border-brand-500 hover:bg-brand-50/30 transition text-left"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="h-8 w-8 rounded-lg bg-gray-50 dark:bg-gray-800 flex items-center justify-center shrink-0">
                      {getStepIcon(opt.type)}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-gray-900 dark:text-white">
                        {opt.title}
                      </p>
                      <p className="text-[11px] text-gray-500 dark:text-gray-400">
                        {opt.desc}
                      </p>
                    </div>
                  </div>
                  <Plus className="h-4 w-4 text-brand-500" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Modal de Límites de Seguridad (Pacing Limits) */}
      {showPacingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl dark:bg-gray-900 border border-gray-200 dark:border-gray-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-emerald-600" />
                <h3 className="font-bold text-gray-900 dark:text-white text-sm">
                  Límites de Seguridad (Pacing LinkedIn)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowPacingModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between p-2.5 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/50">
                <div>
                  <span className="font-semibold text-gray-800 dark:text-gray-200 block">
                    Visitas de Perfil / Día
                  </span>
                  <span className="text-[10px] text-gray-400">Recomendado: 20 perfiles</span>
                </div>
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={activeCampaign.dailyLimits.maxVisitsPerDay}
                  onChange={(e) => {
                    const val = Number(e.target.value) || 20;
                    updateActiveCampaign((c) => ({
                      ...c,
                      dailyLimits: { ...c.dailyLimits, maxVisitsPerDay: val },
                    }));
                  }}
                  className="w-16 h-8 text-center rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs font-bold"
                />
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/50">
                <div>
                  <span className="font-semibold text-gray-800 dark:text-gray-200 block">
                    Invitaciones de Conexión / Día
                  </span>
                  <span className="text-[10px] text-gray-400">Tope seguro: 20 a 25 máximo</span>
                </div>
                <input
                  type="number"
                  min={1}
                  max={30}
                  value={activeCampaign.dailyLimits.maxConnectionsPerDay}
                  onChange={(e) => {
                    const val = Number(e.target.value) || 20;
                    updateActiveCampaign((c) => ({
                      ...c,
                      dailyLimits: { ...c.dailyLimits, maxConnectionsPerDay: val },
                    }));
                  }}
                  className="w-16 h-8 text-center rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs font-bold"
                />
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/50">
                <div>
                  <span className="font-semibold text-gray-800 dark:text-gray-200 block">
                    Mensajes Directos (DM) / Día
                  </span>
                  <span className="text-[10px] text-gray-400">Tope seguro: 20 a 30 máximo</span>
                </div>
                <input
                  type="number"
                  min={1}
                  max={40}
                  value={activeCampaign.dailyLimits.maxMessagesPerDay}
                  onChange={(e) => {
                    const val = Number(e.target.value) || 20;
                    updateActiveCampaign((c) => ({
                      ...c,
                      dailyLimits: { ...c.dailyLimits, maxMessagesPerDay: val },
                    }));
                  }}
                  className="w-16 h-8 text-center rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs font-bold"
                />
              </div>

              {/* Stop on Reply */}
              <div className="p-3 rounded-xl border border-emerald-200 dark:border-emerald-900 bg-emerald-50/40 dark:bg-emerald-950/20">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-bold text-emerald-800 dark:text-emerald-300 block">
                      Regla Stop on Reply
                    </span>
                    <span className="text-[11px] text-emerald-700 dark:text-emerald-400 block mt-0.5">
                      Detiene la secuencia de inmediato en cuanto el prospecto responde a cualquier mensaje o comentario.
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={activeCampaign.stopOnReply}
                    onChange={(e) =>
                      updateActiveCampaign((c) => ({
                        ...c,
                        stopOnReply: e.target.checked,
                      }))
                    }
                    className="h-4 w-4 rounded border-emerald-300 text-emerald-600 focus:ring-emerald-500"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-gray-100 dark:border-gray-800">
              <button
                type="button"
                onClick={() => setShowPacingModal(false)}
                className="rounded-lg bg-brand-500 px-4 py-2 text-xs font-semibold text-white hover:bg-brand-600 transition"
              >
                Entendido y Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Logs de Ejecución */}
      {showLogsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-5 shadow-2xl dark:bg-gray-900 border border-gray-200 dark:border-gray-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-2">
                <Terminal className="h-4 w-4 text-gray-500" />
                <h3 className="font-bold text-gray-900 dark:text-white text-sm">
                  Historial de Ejecución en Vivo (Unipile)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowLogsModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <div className="max-h-80 overflow-y-auto space-y-2 pr-1">
              {runnerLogs.length === 0 ? (
                <p className="text-xs text-gray-400 py-6 text-center">
                  Sin registros recientes. Ejecuta una simulación o activa la campaña para ver los logs.
                </p>
              ) : (
                runnerLogs.map((log) => (
                  <div
                    key={log.id}
                    className="p-2.5 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/40 text-xs flex items-start justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-bold text-gray-900 dark:text-white">
                          {log.leadName}
                        </span>
                        <span className="text-[10px] text-gray-400">{log.timestamp?.slice(11, 19)}</span>
                        <span
                          className={`rounded px-1.5 py-0.2 text-[9px] font-bold ${
                            log.status === "success"
                              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                              : log.status === "paused"
                              ? "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                              : "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300"
                          }`}
                        >
                          {log.status.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-gray-600 dark:text-gray-300 text-[11px]">{log.message}</p>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="flex justify-end pt-2 border-t border-gray-100 dark:border-gray-800">
              <button
                type="button"
                onClick={() => setShowLogsModal(false)}
                className="rounded-lg bg-gray-100 dark:bg-gray-800 px-4 py-2 text-xs font-semibold text-gray-700 dark:text-gray-300"
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
