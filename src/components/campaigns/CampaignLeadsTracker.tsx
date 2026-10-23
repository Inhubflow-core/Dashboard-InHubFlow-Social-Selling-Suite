"use client";

import React, { useState, useMemo, useEffect } from "react";
import {
  Search,
  Eye,
  ThumbsUp,
  UserPlus,
  Send,
  Check,
  ExternalLink,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Play,
  Folder,
  Radio,
  ShieldCheck,
  X,
  RefreshCw,
  Users,
} from "lucide-react";
import type {
  LinearSequenceCampaign,
  SocialStepType,
} from "@/lib/campaigns/types";
import type { Lead360Item, LeadListGroup } from "@/lib/leads/types";
import type { ConnectedLinkedInAccount } from "@/lib/unipile/types";
import type { CampaignExecutionLog } from "@/lib/campaigns/runner";

export interface LeadCampaignTrackerItem {
  id: string;
  fullName: string;
  headline: string;
  company: string;
  linkedinUrl: string;
  avatarUrl?: string;
  listId: string;
  listName: string;
  monitorName: string;
  monitorType: "lead_magnet" | "competitor" | "group" | "global" | "custom";
  currentStepIndex: number; // 0..N
  completedStepIndices: number[];
  status: "in_progress" | "waiting_delay" | "completed" | "replied" | "failed";
  lastActionTitle: string;
  lastActionAt: string;
  language?: "es" | "pt" | "en";
}

const STORAGE_KEY = "inhubflow_campaign_leads_tracker_v2";
const LEGACY_STORAGE_KEY = "inhubflow_campaign_leads_tracker_v1";

// Filtros para depurar leads de ejemplo anteriores
const FAKE_MOCK_IDS = new Set([
  "lead-carolina-mendes",
  "lead-carlos-aranguren",
  "lead-mariana-rios",
  "lead-diego-forlan",
  "lead-sofia-valenzuela",
]);

const FAKE_NAMES = [
  "Carolina Mendes",
  "Carlos Aranguren",
  "Mariana Ríos",
  "Diego Forlán",
  "Sofía Valenzuela",
];

// Lead real verificado de prueba
const INITIAL_TRACKER_LEADS: LeadCampaignTrackerItem[] = [
  {
    id: "lead-roberto-orse",
    fullName: "Roberto OrSe",
    headline: "Founder & CEO | Empreendedor | Social Selling B2B",
    company: "InHubFlow / Agencia OrSe",
    linkedinUrl: "https://www.linkedin.com/in/robertoorse",
    avatarUrl:
      "https://media.licdn.com/dms/image/v2/D4D03AQFTx0yofVp5sA/profile-displayphoto-scale_400_400/B4DaBTR_lrK0Ak-/0/1788103621663?e=1794441600&v=beta&t=4f0dQmSolmfe38X3L_NTEOSFbLxxQliMvHX8RNECTUw",
    listId: "list-l1-sistema",
    listName: "Leads Captados por Signal Radar",
    monitorName: "Signal Radar N1: Lead Magnet SISTEMA",
    monitorType: "lead_magnet",
    currentStepIndex: 2, // Paso 3: Conectar (ya visitado y comentado)
    completedStepIndices: [0, 1],
    status: "in_progress",
    lastActionTitle: "Like + Comentario",
    lastActionAt: "Completado en vivo",
    language: "pt",
  },
];

interface CampaignLeadsTrackerProps {
  activeCampaign: LinearSequenceCampaign;
  leadLists: LeadListGroup[];
  allLeads: Lead360Item[];
  activeAccount: ConnectedLinkedInAccount | null;
  onLogGenerated?: (log: CampaignExecutionLog) => void;
}

export function CampaignLeadsTracker({
  activeCampaign,
  leadLists,
  allLeads,
  activeAccount,
  onLogGenerated,
}: CampaignLeadsTrackerProps) {
  const [leadsTracker, setLeadsTracker] = useState<LeadCampaignTrackerItem[]>([]);

  // Filtros
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedListFilter, setSelectedListFilter] = useState("all");
  const [selectedMonitorFilter, setSelectedMonitorFilter] = useState("all");
  const [selectedStatusFilter, setSelectedStatusFilter] = useState("all");

  // Estado de ejecución por fila
  const [executingLeadId, setExecutingLeadId] = useState<string | null>(null);
  const [rowNotice, setRowNotice] = useState<{ leadId: string; message: string; ok: boolean } | null>(null);

  // Cargar estado desde localStorage depurando datos fake y fusionando con prospectos reales
  useEffect(() => {
    try {
      let raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        // Migrar de v1 limpiando datos fake
        raw = localStorage.getItem(LEGACY_STORAGE_KEY);
        if (raw) {
          try {
            localStorage.removeItem(LEGACY_STORAGE_KEY);
          } catch {}
        }
      }

      let loadedList: LeadCampaignTrackerItem[] = [];
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) loadedList = parsed;
        } catch {
          loadedList = [];
        }
      }

      // Purgar rigurosamente los datos fake
      let cleanList = loadedList.filter((item) => {
        if (!item || !item.id) return false;
        if (FAKE_MOCK_IDS.has(item.id)) return false;
        if (FAKE_NAMES.some((fn) => item.fullName?.toLowerCase().includes(fn.toLowerCase()))) return false;
        return true;
      });

      // Sanitizar títulos de acciones para no mostrar marcas de IA (ej. Gemini)
      cleanList = cleanList.map((item) => {
        if (item.lastActionTitle && /gemini/i.test(item.lastActionTitle)) {
          return {
            ...item,
            lastActionTitle: "Like + Comentario",
          };
        }
        return item;
      });

      // Si la lista quedó vacía y no hay leads reales aún, inicializar con Roberto OrSe (perfil real de pruebas)
      if (cleanList.length === 0) {
        cleanList = [...INITIAL_TRACKER_LEADS];
      }

      // Asegurar que Roberto OrSe tenga la URL limpia y verificada
      const robertoIdx = cleanList.findIndex(
        (l) => l.fullName === "Roberto OrSe" || l.linkedinUrl?.includes("robertoorse")
      );
      if (robertoIdx !== -1) {
        cleanList[robertoIdx].linkedinUrl = "https://www.linkedin.com/in/robertoorse";
      }

      // Integrar leads reales de allLeads si no existen en el tracker
      for (const realLead of allLeads) {
        const exists = cleanList.find(
          (t) => t.id === realLead.id || (realLead.linkedinUrl && t.linkedinUrl === realLead.linkedinUrl)
        );
        if (!exists && realLead.fullName) {
          cleanList.push({
            id: realLead.id,
            fullName: realLead.fullName,
            headline: realLead.title || `${realLead.company || "Profesional B2B"}`,
            company: realLead.company || "Empresa B2B",
            linkedinUrl: realLead.linkedinUrl,
            avatarUrl: realLead.avatarUrl,
            listId: realLead.listId || "list-general",
            listName: realLead.listName || "Leads Importados de Signal Radar",
            monitorName: realLead.signalSource || "Signal Radar B2B",
            monitorType: "custom",
            currentStepIndex: realLead.sequenceStatus === "completed" ? activeCampaign.steps.length : 0,
            completedStepIndices: realLead.sequenceStatus === "completed" ? activeCampaign.steps.map((_, i) => i) : [],
            status:
              realLead.sequenceStatus === "completed"
                ? "completed"
                : realLead.sequenceStatus === "replied"
                ? "replied"
                : "in_progress",
            lastActionTitle: "Lead añadido a la secuencia",
            lastActionAt: "Reciente",
            language: realLead.language || "es",
          });
        }
      }

      setLeadsTracker(cleanList);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(cleanList));
      } catch {}
    } catch {
      setLeadsTracker(INITIAL_TRACKER_LEADS);
    }
  }, [allLeads, activeCampaign.steps.length]);

  // Persistir cambios en localStorage
  const saveTrackerList = (updated: LeadCampaignTrackerItem[]) => {
    setLeadsTracker(updated);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch {}
  };

  // Quitar un lead del seguimiento
  const handleDeleteLeadFromTracker = (leadId: string) => {
    const updated = leadsTracker.filter((l) => l.id !== leadId);
    saveTrackerList(updated);
    setRowNotice({
      leadId,
      message: "Prospecto quitado del seguimiento.",
      ok: true,
    });
    setTimeout(() => setRowNotice(null), 3000);
  };

  // Sincronizar prospectos desde Signal Radar
  const handleSyncLeadsFromRadar = () => {
    const currentKeys = new Set(leadsTracker.map((l) => l.linkedinUrl || l.id));
    const nextList = [...leadsTracker];
    let addedCount = 0;

    for (const realLead of allLeads) {
      const key = realLead.linkedinUrl || realLead.id;
      if (!currentKeys.has(key) && realLead.fullName) {
        nextList.push({
          id: realLead.id,
          fullName: realLead.fullName,
          headline: realLead.title || `${realLead.company || "Profesional B2B"}`,
          company: realLead.company || "Empresa B2B",
          linkedinUrl: realLead.linkedinUrl,
          avatarUrl: realLead.avatarUrl,
          listId: realLead.listId || "list-general",
          listName: realLead.listName || "Leads Importados de Signal Radar",
          monitorName: realLead.signalSource || "Signal Radar B2B",
          monitorType: "custom",
          currentStepIndex: realLead.sequenceStatus === "completed" ? activeCampaign.steps.length : 0,
          completedStepIndices: realLead.sequenceStatus === "completed" ? activeCampaign.steps.map((_, i) => i) : [],
          status:
            realLead.sequenceStatus === "completed"
              ? "completed"
              : realLead.sequenceStatus === "replied"
              ? "replied"
              : "in_progress",
          lastActionTitle: "Sincronizado desde Signal Radar",
          lastActionAt: "Ahora",
          language: realLead.language || "es",
        });
        currentKeys.add(key);
        addedCount++;
      }
    }

    if (addedCount > 0) {
      saveTrackerList(nextList);
      setRowNotice({
        leadId: "sync",
        message: `✓ Se sincronizaron ${addedCount} prospectos reales desde tus listas de Signal Radar.`,
        ok: true,
      });
      setTimeout(() => setRowNotice(null), 5000);
    } else {
      setRowNotice({
        leadId: "sync",
        message: `Todos los prospectos disponibles ya están integrados en el seguimiento.`,
        ok: true,
      });
      setTimeout(() => setRowNotice(null), 4000);
    }
  };

  // Obtener listas y monitores únicos para los filtros desplegables
  const uniqueLists = useMemo(() => {
    const map = new Map<string, string>();
    leadsTracker.forEach((l) => {
      if (l.listName) map.set(l.listId || l.listName, l.listName);
    });
    leadLists.forEach((lg) => map.set(lg.id, lg.name));
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [leadsTracker, leadLists]);

  const uniqueMonitors = useMemo(() => {
    const set = new Set<string>();
    leadsTracker.forEach((l) => {
      if (l.monitorName) set.add(l.monitorName);
    });
    return Array.from(set);
  }, [leadsTracker]);

  // Filtrado de prospectos
  const filteredLeads = useMemo(() => {
    return leadsTracker.filter((l) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        l.fullName.toLowerCase().includes(q) ||
        l.company.toLowerCase().includes(q) ||
        l.headline.toLowerCase().includes(q) ||
        l.monitorName.toLowerCase().includes(q);

      const matchesList =
        selectedListFilter === "all" ||
        l.listId === selectedListFilter ||
        l.listName === selectedListFilter;

      const matchesMonitor =
        selectedMonitorFilter === "all" || l.monitorName === selectedMonitorFilter;

      const matchesStatus =
        selectedStatusFilter === "all" || l.status === selectedStatusFilter;

      return matchesSearch && matchesList && matchesMonitor && matchesStatus;
    });
  }, [leadsTracker, searchQuery, selectedListFilter, selectedMonitorFilter, selectedStatusFilter]);

  // Contadores KPI rápidos
  const kpiStats = useMemo(() => {
    const total = leadsTracker.length;
    const inProgress = leadsTracker.filter((l) => l.status === "in_progress").length;
    const waiting = leadsTracker.filter((l) => l.status === "waiting_delay").length;
    const completed = leadsTracker.filter((l) => l.status === "completed").length;
    const replied = leadsTracker.filter((l) => l.status === "replied").length;
    return { total, inProgress, waiting, completed, replied };
  }, [leadsTracker]);

  // Función para obtener icono según tipo de paso
  const getStepMiniIcon = (type: SocialStepType) => {
    switch (type) {
      case "visit":
        return <Eye className="size-3" />;
      case "like_comment":
        return <ThumbsUp className="size-3" />;
      case "connect":
      case "connect_message":
        return <UserPlus className="size-3" />;
      case "message_icebreaker":
      case "message_followup":
      case "message_value_prop":
        return <Send className="size-3" />;
    }
  };

  // Ejecución del siguiente paso para un lead individual desde la fila
  const handleExecuteNextStepForLead = async (lead: LeadCampaignTrackerItem) => {
    if (lead.status === "completed") {
      alert(`${lead.fullName} ya ha completado todos los pasos de la secuencia.`);
      return;
    }

    setExecutingLeadId(lead.id);
    setRowNotice(null);

    const stepIndexToRun = lead.currentStepIndex < activeCampaign.steps.length ? lead.currentStepIndex : 0;
    const stepDef = activeCampaign.steps[stepIndexToRun];
    const isDry = false; // Ejecución real con Unipile

    try {
      const res = await fetch("/api/campaigns/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaign: activeCampaign,
          stepIndex: stepIndexToRun,
          leadName: lead.fullName,
          linkedinUrl: lead.linkedinUrl,
          company: lead.company,
          dryRun: isDry,
          accountId: activeAccount?.unipileAccountId || activeAccount?.id,
        }),
      });

      const data = await res.json();
      if (data.ok && data.result?.success !== false) {
        const nextIdx = data.result?.nextStepIndex ?? (stepIndexToRun + 1);
        const isDone = data.result?.isSequenceCompleted || nextIdx >= activeCampaign.steps.length;

        const updatedList = leadsTracker.map((item) => {
          if (item.id === lead.id) {
            const nextCompleted = Array.from(new Set([...item.completedStepIndices, stepIndexToRun]));
            return {
              ...item,
              currentStepIndex: isDone ? activeCampaign.steps.length : nextIdx,
              completedStepIndices: nextCompleted,
              status: (isDone ? "completed" : "in_progress") as LeadCampaignTrackerItem["status"],
              lastActionTitle: `Paso ${stepIndexToRun + 1} (${stepDef?.title || "Paso"}) ejecutado exitosamente`,
              lastActionAt: "Ahora mismo",
            };
          }
          return item;
        });

        saveTrackerList(updatedList);
        setRowNotice({
          leadId: lead.id,
          message: `✓ Paso ${stepIndexToRun + 1} (${stepDef?.title}) ejecutado con éxito`,
          ok: true,
        });

        if (data.result?.log && onLogGenerated) {
          onLogGenerated(data.result.log);
        }
      } else {
        const errMessage = data.result?.log?.message || data.error || "Error al ejecutar el paso";
        setRowNotice({
          leadId: lead.id,
          message: `✗ Error en Paso ${stepIndexToRun + 1}: ${errMessage}`,
          ok: false,
        });
      }
    } catch (err: any) {
      setRowNotice({
        leadId: lead.id,
        message: `✗ Error de conexión: ${err?.message || "Servidor no disponible"}`,
        ok: false,
      });
    } finally {
      setExecutingLeadId(null);
      setTimeout(() => setRowNotice(null), 6000);
    }
  };

  // Reiniciar progreso de un lead a 0
  const handleResetLeadProgress = (leadId: string) => {
    const updated = leadsTracker.map((l) => {
      if (l.id === leadId) {
        return {
          ...l,
          currentStepIndex: 0,
          completedStepIndices: [],
          status: "in_progress" as const,
          lastActionTitle: "Secuencia reiniciada al Paso 1",
          lastActionAt: "Ahora mismo",
        };
      }
      return l;
    });
    saveTrackerList(updated);
  };

  return (
    <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-2xs overflow-hidden">
      {/* Cabecera de la Sección */}
      <div className="p-5 border-b border-gray-100 dark:border-gray-800 bg-gradient-to-r from-gray-50/80 via-white to-gray-50/50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-850">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="h-8 w-8 rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-400 flex items-center justify-center font-bold">
                <Radio className="size-4" />
              </span>
              <div>
                <div className="flex items-center gap-2.5">
                  <h3 className="text-base font-bold text-gray-900 dark:text-white">
                    Prospectos en Campaña: Seguimiento y Avance de Secuencias
                  </h3>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Monitorea por qué estación va cada contacto en tiempo real, su lista de asignación y el monitor de origen de Signal Radar.
                </p>
              </div>
            </div>
          </div>

          {/* Resumen Estadístico de Avance y Sincronización */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {allLeads.length > 0 && (
              <button
                type="button"
                onClick={handleSyncLeadsFromRadar}
                className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-brand-50 hover:bg-brand-100 text-brand-700 dark:bg-brand-950/60 dark:text-brand-300 dark:hover:bg-brand-900 border border-brand-200 dark:border-brand-800 text-xs font-semibold transition"
                title="Sincronizar nuevos prospectos desde Signal Radar"
              >
                <RefreshCw className="size-3 text-brand-600" />
                <span>Sincronizar Radar</span>
              </button>
            )}
            <span className="px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-semibold border border-gray-200 dark:border-gray-700">
              Total: <strong className="text-gray-900 dark:text-white">{kpiStats.total}</strong>
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 font-semibold border border-blue-200 dark:border-blue-800">
              En Progreso: <strong>{kpiStats.inProgress}</strong>
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 font-semibold border border-amber-200 dark:border-amber-800">
              Esperando Retardo: <strong>{kpiStats.waiting}</strong>
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 font-semibold border border-emerald-200 dark:border-emerald-800">
              Completados: <strong>{kpiStats.completed}</strong>
            </span>
            {kpiStats.replied > 0 && (
              <span className="px-2.5 py-1 rounded-lg bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 font-semibold border border-purple-200 dark:border-purple-800">
                Respondieron: <strong>{kpiStats.replied}</strong>
              </span>
            )}
          </div>
        </div>

        {/* Barra de Filtros y Búsqueda */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-2.5 pt-4 mt-4 border-t border-gray-100 dark:border-gray-800 text-xs">
          {/* Buscador de texto */}
          <div className="lg:col-span-4 relative">
            <Search className="size-3.5 text-gray-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por contacto, cargo o monitor..."
              className="h-8.5 w-full rounded-lg border border-gray-300 dark:border-gray-700 dark:bg-gray-800 pl-8 pr-3 text-xs dark:text-white focus:outline-none focus:border-brand-500"
            />
          </div>

          {/* Filtro por Lista */}
          <div className="lg:col-span-3">
            <select
              value={selectedListFilter}
              onChange={(e) => setSelectedListFilter(e.target.value)}
              className="h-8.5 w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-2.5 text-xs text-gray-700 dark:text-gray-300"
            >
              <option value="all">Todas las Listas ({uniqueLists.length})</option>
              {uniqueLists.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          </div>

          {/* Filtro por Monitor */}
          <div className="lg:col-span-3">
            <select
              value={selectedMonitorFilter}
              onChange={(e) => setSelectedMonitorFilter(e.target.value)}
              className="h-8.5 w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-2.5 text-xs text-gray-700 dark:text-gray-300"
            >
              <option value="all">Todos los Monitores ({uniqueMonitors.length})</option>
              {uniqueMonitors.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          {/* Filtro por Estado */}
          <div className="lg:col-span-2">
            <select
              value={selectedStatusFilter}
              onChange={(e) => setSelectedStatusFilter(e.target.value)}
              className="h-8.5 w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-2.5 text-xs text-gray-700 dark:text-gray-300"
            >
              <option value="all">Todos los Estados</option>
              <option value="in_progress">En Secuencia</option>
              <option value="waiting_delay">Esperando Retardo</option>
              <option value="completed">Completados</option>
              <option value="replied">Respondieron</option>
            </select>
          </div>
        </div>
      </div>

      {/* Aviso de acción de fila */}
      {rowNotice && (
        <div
          className={`px-5 py-2 text-xs font-semibold flex items-center gap-2 border-b ${
            rowNotice.ok
              ? "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900"
              : "bg-red-50 text-red-800 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-900"
          }`}
        >
          {rowNotice.ok ? <CheckCircle2 className="size-4 shrink-0 text-emerald-600" /> : <AlertCircle className="size-4 shrink-0 text-red-600" />}
          <span>{rowNotice.message}</span>
        </div>
      )}

      {/* Lista General de Prospectos con Estaciones de Secuencia */}
      <div className="divide-y divide-gray-100 dark:divide-gray-800">
        {leadsTracker.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center justify-center">
            <div className="h-12 w-12 rounded-2xl bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400 flex items-center justify-center mb-3">
              <Users className="size-6" />
            </div>
            <h4 className="text-sm font-bold text-gray-900 dark:text-white">
              No hay prospectos en esta campaña
            </h4>
            <p className="text-xs text-gray-500 dark:text-gray-400 max-w-md mt-1 mb-4">
              Los prospectos reales aparecerán aquí al ser captados por Signal Radar o al sincronizarse desde tus listas de leads.
            </p>
            {allLeads.length > 0 ? (
              <button
                type="button"
                onClick={handleSyncLeadsFromRadar}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-brand-600 text-white text-xs font-semibold hover:bg-brand-700 shadow-sm transition"
              >
                <RefreshCw className="size-3.5" />
                <span>Sincronizar {allLeads.length} Prospectos de Signal Radar</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  const roberto = INITIAL_TRACKER_LEADS[0];
                  saveTrackerList([roberto]);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs font-semibold hover:border-brand-500 hover:text-brand-600 transition"
              >
                <span>Añadir Roberto OrSe para Pruebas</span>
              </button>
            )}
          </div>
        ) : filteredLeads.length === 0 ? (
          <div className="p-8 text-center text-xs text-gray-400">
            No se encontraron prospectos que coincidan con los filtros seleccionados.
          </div>
        ) : (
          filteredLeads.map((lead) => {
            const stepsCount = activeCampaign.steps.length;
            const progressPercent = Math.round(
              (Math.min(lead.completedStepIndices.length, stepsCount) / stepsCount) * 100
            );
            const isCompleted = lead.status === "completed" || lead.currentStepIndex >= stepsCount;
            const isExecuting = executingLeadId === lead.id;

            return (
              <div
                key={lead.id}
                className="p-4 sm:p-5 hover:bg-gray-50/60 dark:hover:bg-gray-800/40 transition flex flex-col xl:flex-row xl:items-center justify-between gap-4"
              >
                {/* 1. Datos del Contacto y Empresa */}
                <div className="w-full xl:w-72 shrink-0">
                  <div className="flex items-start gap-3">
                    {/* Avatar con foto o iniciales */}
                    <div className="relative shrink-0">
                      {lead.avatarUrl ? (
                        <img
                          src={lead.avatarUrl}
                          alt={lead.fullName}
                          className="h-10 w-10 rounded-xl object-cover border border-gray-200 dark:border-gray-700 shadow-2xs"
                        />
                      ) : (
                        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-brand-500 to-indigo-600 text-white font-bold text-sm flex items-center justify-center shadow-2xs">
                          {lead.fullName.charAt(0)}
                        </div>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-xs text-gray-900 dark:text-white truncate">
                          {lead.fullName}
                        </span>
                        {lead.language && (
                          <span className="uppercase font-bold px-1.5 py-0.2 rounded bg-gray-100 dark:bg-gray-800 text-gray-500 text-xs">
                            {lead.language}
                          </span>
                        )}
                        <a
                          href={lead.linkedinUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-gray-400 hover:text-brand-600 transition"
                          title="Abrir perfil de LinkedIn"
                        >
                          <ExternalLink className="size-3" />
                        </a>
                      </div>

                      {/* Cargo del Contacto (Headline) */}
                      <p
                        className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5"
                        title={lead.headline}
                      >
                        {lead.headline}
                      </p>
                    </div>
                  </div>
                </div>

                {/* 2. Lista y Monitor de Origen */}
                <div className="w-full xl:w-56 shrink-0 space-y-1 text-xs">
                  <div className="flex items-center gap-1 text-xs text-gray-700 dark:text-gray-300 font-semibold truncate">
                    <Folder className="size-3 text-amber-500 shrink-0" />
                    <span className="truncate" title={lead.listName}>
                      {lead.listName}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 truncate">
                    <Radio className="size-3 text-brand-500 shrink-0" />
                    <span className="truncate" title={lead.monitorName}>
                      {lead.monitorName}
                    </span>
                  </div>
                </div>

                {/* 3. BARRA DE PROGRESO CON ESTACIONES DE LA SECUENCIA */}
                <div className="flex-1 min-w-[280px] max-w-xl py-1">
                  <div className="flex items-center justify-between text-xs mb-2 font-medium">
                    <span className="font-bold text-gray-800 dark:text-gray-200 truncate pr-2">
                      {isCompleted
                        ? "Secuencia Finalizada"
                        : `Paso ${Math.min(lead.currentStepIndex + 1, stepsCount)} de ${stepsCount}: ${
                            activeCampaign.steps[lead.currentStepIndex]?.title || "En Proceso"
                          }`}
                    </span>
                    <span className="font-bold text-brand-600 dark:text-brand-400 text-xs shrink-0">
                      {progressPercent}%
                    </span>
                  </div>

                  {/* La Barra Visual con Estaciones / Stepper */}
                  <div className="relative flex items-center w-full px-2">
                    {/* Línea horizontal base conectora */}
                    <div className="absolute left-3 right-3 top-1/2 -translate-y-1/2 h-1 bg-gray-200 dark:bg-gray-700 z-0 rounded-full" />
                    {/* Línea de progreso llena */}
                    <div
                      className="absolute left-3 top-1/2 -translate-y-1/2 h-1 bg-emerald-500 z-0 rounded-full transition-all duration-500"
                      style={{
                        width: `calc(${
                          (Math.min(lead.completedStepIndices.length, stepsCount - 1) / (stepsCount - 1)) * 100
                        }% - 12px)`,
                      }}
                    />

                    {/* Cada una de las estaciones / pasos */}
                    {activeCampaign.steps.map((step, sIdx) => {
                      const isStepCompleted = lead.completedStepIndices.includes(sIdx);
                      const isCurrentStep = lead.currentStepIndex === sIdx && !isCompleted;

                      return (
                        <div
                          key={step.id || sIdx}
                          className="relative z-10 flex flex-1 flex-col items-center group cursor-pointer"
                          title={`Paso ${sIdx + 1}: ${step.title} (${step.description})`}
                        >
                          {/* Círculo de la Estación */}
                          <div
                            className={`flex items-center justify-center transition-all ${
                              isStepCompleted
                                ? "h-6 w-6 rounded-full bg-emerald-500 text-white font-bold shadow-xs border-2 border-white dark:border-gray-900"
                                : isCurrentStep
                                ? "h-7 w-7 rounded-full bg-brand-500 text-white font-bold shadow-md ring-4 ring-brand-200 dark:ring-brand-950/80 animate-pulse border-2 border-white dark:border-gray-900"
                                : "h-5 w-5 rounded-full bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 text-gray-400 font-semibold text-xs"
                            }`}
                          >
                            {isStepCompleted ? (
                              <Check className="size-3.5 stroke-[3]" />
                            ) : isCurrentStep ? (
                              getStepMiniIcon(step.type)
                            ) : (
                              <span>{sIdx + 1}</span>
                            )}
                          </div>

                          {/* Etiqueta compacta debajo de la estación */}
                          <span
                            className={`text-xs mt-1 text-center whitespace-nowrap truncate max-w-[65px] ${
                              isCurrentStep
                                ? "font-bold text-brand-600 dark:text-brand-400 scale-105"
                                : isStepCompleted
                                ? "font-medium text-emerald-600 dark:text-emerald-400"
                                : "text-gray-400"
                            }`}
                          >
                            {step.title.split(" ")[0]}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 4. Acciones Rápidas Unificadas */}
                <div className="shrink-0 flex items-center justify-end gap-1.5">
                  {/* Botón Ejecutar Siguiente Paso */}
                  <button
                    type="button"
                    disabled={isCompleted || isExecuting}
                    onClick={() => handleExecuteNextStepForLead(lead)}
                    className={`h-[26px] w-[26px] rounded-md border inline-flex items-center justify-center transition ${
                      isCompleted
                        ? "opacity-35 cursor-not-allowed border-gray-200 bg-gray-50 text-gray-300 dark:border-gray-800 dark:bg-gray-900/40"
                        : isExecuting
                        ? "bg-brand-500 text-white border-brand-500 cursor-wait"
                        : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-brand-500 hover:text-brand-600 hover:bg-brand-50 dark:border-gray-700 dark:text-brand-400 dark:hover:border-brand-500 dark:hover:text-brand-400"
                    }`}
                    title={
                      isCompleted
                        ? "Secuencia finalizada para este lead"
                        : `Ejecutar Paso ${lead.currentStepIndex + 1}: ${
                            activeCampaign.steps[lead.currentStepIndex]?.title || "Siguiente Paso"
                          }`
                    }
                  >
                    {isExecuting ? (
                      <span className="h-3 w-3 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                    ) : (
                      <Play className="size-3.5 text-brand-600 fill-brand-600 ml-0.5" />
                    )}
                  </button>

                  {/* Botón Reiniciar Avance de este Lead */}
                  {isCompleted && (
                    <button
                      type="button"
                      onClick={() => handleResetLeadProgress(lead.id)}
                      className="h-[26px] w-[26px] rounded-md border border-gray-200 text-gray-600 hover:border-brand-500 hover:text-brand-600 hover:bg-brand-50 dark:border-gray-700 dark:text-gray-300 dark:hover:border-brand-500 dark:hover:text-brand-400 inline-flex items-center justify-center transition"
                      title="Reiniciar secuencia al Paso 1 para este lead"
                    >
                      <RotateCcw className="size-3.5" />
                    </button>
                  )}

                  {/* Botón Quitar Lead del Seguimiento */}
                  <button
                    type="button"
                    onClick={() => handleDeleteLeadFromTracker(lead.id)}
                    className="h-[26px] w-[26px] rounded-md border border-red-200 text-red-500 hover:bg-red-50 dark:border-red-900/40 dark:text-red-400 inline-flex items-center justify-center transition"
                    title="Quitar este prospecto de la lista de seguimiento"
                  >
                    <X className="size-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Pie de la tabla */}
      <div className="p-3 px-5 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/60 flex items-center justify-between text-xs text-gray-500">
        <span>
          Mostrando <strong>{filteredLeads.length}</strong> de <strong>{leadsTracker.length}</strong> prospectos en seguimiento activo.
        </span>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
            <ShieldCheck className="size-3.5" />
            Límites diarios de seguridad activos en motor
          </span>
        </div>
      </div>
    </div>
  );
}
