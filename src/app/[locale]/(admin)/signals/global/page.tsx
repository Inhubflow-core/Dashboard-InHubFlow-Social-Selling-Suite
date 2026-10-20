"use client";

import ComponentCard from "@/components/common/ComponentCard";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import ProspectAvatar from "@/components/leads/ProspectAvatar";
import { LeadScoreBadge } from "@/components/leads/LeadScoreBadge";
import { useLeads } from "@/lib/leads/store";
import { useSignalRadar } from "@/lib/signals/store";
import {
  type ConnectionDegree,
  type IntentLevel,
  type Level3GlobalMonitor,
  type SignalLeadItem,
  calculateSignalScore,
} from "@/lib/signals/types";
import {
  getActiveAccountForUser,
  getVisibleAccountsForUser,
  setActiveAccountId,
  accountMatchesUser,
} from "@/lib/unipile/store";
import { Link } from "@/i18n/navigation";
import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { viralPostsB2B } from "@/lib/signals/mock-data";
import { Pencil, X, TrendingUp } from "lucide-react";

export interface CountryOption {
  code: string;
  name: string;
  flag: string;
  keywords: string[];
}

export const COUNTRY_OPTIONS: CountryOption[] = [
  { code: "all", name: "Global (Cualquier país)", flag: "🌎", keywords: [] },
  {
    code: "latam",
    name: "Todo Hispanoamérica / LATAM",
    flag: "🌎",
    keywords: ["latam", "hispanoamérica", "latinoamérica", "mexico", "méxico", "colombia", "argentina", "chile", "peru", "perú", "uruguay", "ecuador", "panama", "costa rica", "guatemala"],
  },
  {
    code: "ES",
    name: "España",
    flag: "🇪🇸",
    keywords: ["españa", "spain", "madrid", "barcelona", "valencia", "sevilla", "bilbao", "málaga", "zaragoza"],
  },
  {
    code: "MX",
    name: "México",
    flag: "🇲🇽",
    keywords: ["méxico", "mexico", "cdmx", "guadalajara", "monterrey", "puebla", "querétaro"],
  },
  {
    code: "CO",
    name: "Colombia",
    flag: "🇨🇴",
    keywords: ["colombia", "bogotá", "bogota", "medellín", "medellin", "cali", "barranquilla"],
  },
  {
    code: "AR",
    name: "Argentina",
    flag: "🇦🇷",
    keywords: ["argentina", "buenos aires", "córdoba", "cordoba", "rosario", "mendoza"],
  },
  {
    code: "CL",
    name: "Chile",
    flag: "🇨🇱",
    keywords: ["chile", "santiago", "valparaíso", "concepción"],
  },
  {
    code: "PE",
    name: "Perú",
    flag: "🇵🇪",
    keywords: ["perú", "peru", "lima", "arequipa", "trujillo"],
  },
  {
    code: "BR",
    name: "Brasil",
    flag: "🇧🇷",
    keywords: ["brasil", "brazil", "são paulo", "sao paulo", "rio de janeiro", "curitiba", "belo horizonte"],
  },
  {
    code: "US",
    name: "Estados Unidos",
    flag: "🇺🇸",
    keywords: ["united states", "usa", "miami", "florida", "california", "new york", "texas", "austin"],
  },
  {
    code: "PT",
    name: "Portugal",
    flag: "🇵🇹",
    keywords: ["portugal", "lisboa", "porto", "braga"],
  },
  {
    code: "UY",
    name: "Uruguay",
    flag: "🇺🇾",
    keywords: ["uruguay", "montevideo"],
  },
  {
    code: "EC",
    name: "Ecuador",
    flag: "🇪🇨",
    keywords: ["ecuador", "quito", "guayaquil"],
  },
  {
    code: "PA",
    name: "Panamá",
    flag: "🇵🇦",
    keywords: ["panamá", "panama"],
  },
  {
    code: "CR",
    name: "Costa Rica",
    flag: "🇨🇷",
    keywords: ["costa rica", "san josé"],
  },
  {
    code: "DO",
    name: "Rep. Dominicana",
    flag: "🇩🇴",
    keywords: ["república dominicana", "santo domingo"],
  },
  {
    code: "GT",
    name: "Guatemala",
    flag: "🇬🇹",
    keywords: ["guatemala"],
  },
];

export default function GlobalSignalsPage() {
  const {
    l3Monitors,
    leads,
    isLoaded,
    addLevel3Monitor,
    updateLevel3Monitor,
    deleteLevel3Monitor,
    toggleLevel3Status,
    recordDiscoveredLeads,
  } = useSignalRadar();

  const { importSignalLeads, getOrCreateGlobalList, lists } = useLeads();

  const { currentUser } = useAuth();
  const [editingRule, setEditingRule] = useState<Level3GlobalMonitor | null>(null);

  // Cuentas de LinkedIn reactivas según el usuario autenticado
  const [availableAccounts, setAvailableAccounts] = useState<any[]>([]);
  const [activeAccount, setActiveAccount] = useState<any>(null);

  useEffect(() => {
    const syncAccounts = () => {
      const visible = getVisibleAccountsForUser(currentUser);
      const active = getActiveAccountForUser(currentUser);
      const ownAccounts = visible.filter(
        (a) =>
          accountMatchesUser(a, currentUser) ||
          (currentUser.role !== "super_admin" && a.ownerId === currentUser.id)
      );
      const accountsList = ownAccounts.length > 0 ? ownAccounts : visible;
      setAvailableAccounts(accountsList);
      setActiveAccount(active);
    };

    syncAccounts();

    fetch("/api/unipile/accounts")
      .then((r) => r.json())
      .then(() => {
        syncAccounts();
      })
      .catch(() => {});

    window.addEventListener("storage", syncAccounts);
    return () => window.removeEventListener("storage", syncAccounts);
  }, [currentUser]);

  // Asegurar que cada regla L3 tenga su lista dinámica en el Directorio de Leads (solo una vez)
  const hasAutoSyncedGlobalRef = useRef(false);
  useEffect(() => {
    if (!isLoaded || l3Monitors.length === 0 || hasAutoSyncedGlobalRef.current) return;
    hasAutoSyncedGlobalRef.current = true;

    for (const monitor of l3Monitors) {
      const targetList = getOrCreateGlobalList({
        monitorId: monitor.id,
        searchQuery: monitor.searchQuery,
        countryName: monitor.targetCountryName,
        countryFlag: monitor.targetCountryFlag,
      });
      const monitorLeads = leads.filter((l) => l.monitorId === monitor.id);
      if (monitorLeads.length > 0) {
        importSignalLeads(targetList, monitorLeads);
      }
    }
  }, [isLoaded, l3Monitors.length]);

  const [isAddingRule, setIsAddingRule] = useState(false);
  const [selectedRuleForLeads, setSelectedRuleForLeads] = useState<Level3GlobalMonitor | null>(null);
  const [expandedRulePosts, setExpandedRulePosts] = useState<Record<string, boolean>>({
    "mon-l3-prospeccion-b2b": true, // Desplegado por defecto para probar inmediatamente
  });
  const [selectedBatchSize, setSelectedBatchSize] = useState<Record<string, 25 | 50 | 100>>({});
  const [isScanningId, setIsScanningId] = useState<string | null>(null);
  const [scanFeedback, setScanFeedback] = useState<{ type: "success" | "error"; text: string; listId?: string } | null>(null);

  // Form states de la Opción B: Cazador de Publicaciones Virales
  const [searchQuery, setSearchQuery] = useState("Prospección B2B & Captación en Frío");
  const [minCommentThreshold, setMinCommentThreshold] = useState<number>(20);
  const [selectedCountry, setSelectedCountry] = useState<CountryOption>(
    COUNTRY_OPTIONS.find((c) => c.code === "ES") || COUNTRY_OPTIONS[0]
  );
  const [isCountryDropdownOpen, setIsCountryDropdownOpen] = useState(false);
  const [countrySearch, setCountrySearch] = useState("");
  const countryDropdownRef = useRef<HTMLDivElement>(null);

  const [batchLeadLimit, setBatchLeadLimit] = useState<25 | 50 | 100>(50);
  const [trackComments, setTrackComments] = useState(true);
  const [trackLikes, setTrackLikes] = useState(true);
  const [excludeInternalEngagement, setExcludeInternalEngagement] = useState(true);
  const [outreachTemplate, setOutreachTemplate] = useState(
    'Hola {{first_name}}, vi tu comentario en la publicación viral sobre {{topic}}. Totalmente de acuerdo con lo que comentaste sobre los retos de captación comercial. ¿Cómo lo están resolviendo en {{company}}?'
  );

  // Cerrar dropdown de países al hacer click fuera
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (countryDropdownRef.current && !countryDropdownRef.current.contains(event.target as Node)) {
        setIsCountryDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const totalGlobalLeads = l3Monitors.reduce((acc, m) => acc + m.leadsIdentifiedCount, 0);
  const totalViralPostsCount = l3Monitors.reduce((acc, m) => acc + (m.lastScannedPosts?.length || 0), 0);

  const filteredCountries = COUNTRY_OPTIONS.filter((c) =>
    c.name.toLowerCase().includes(countrySearch.toLowerCase())
  );

  const handleAddRule = (e: React.FormEvent) => {
    e.preventDefault();
    const finalQuery = searchQuery.trim();
    if (!finalQuery) return;

    const interactions: ("comments" | "likes")[] = [];
    if (trackComments) interactions.push("comments");
    if (trackLikes) interactions.push("likes");

    const newMonitor: Level3GlobalMonitor = {
      id: `mon-l3-${Date.now()}`,
      searchQuery: finalQuery,
      nicheTopic: finalQuery,
      locations: selectedCountry.keywords.length > 0 ? selectedCountry.keywords : [selectedCountry.code],
      targetCountry: selectedCountry.code,
      targetCountryName: selectedCountry.name,
      targetCountryFlag: selectedCountry.flag,
      timePeriod: "past_week",
      interactionTypes: interactions.length > 0 ? interactions : ["comments", "likes"],
      minPostReactions: Number(minCommentThreshold) || 15,
      batchLeadLimit: batchLeadLimit,
      status: "active",
      leadsIdentifiedCount: 0,
      lastScanAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      lastScanAtIso: new Date().toISOString(),
      scanFrequency: "daily",
      createdAt: new Date().toISOString(),
      lastScannedPosts: viralPostsB2B,
    };

    addLevel3Monitor(newMonitor);
    const targetList = getOrCreateGlobalList({
      monitorId: newMonitor.id,
      searchQuery: newMonitor.searchQuery,
      countryName: newMonitor.targetCountryName,
      countryFlag: newMonitor.targetCountryFlag,
    });

    setIsAddingRule(false);
    setSearchQuery("");
    setScanFeedback({
      type: "success",
      text: `Radar viral creado para "${newMonitor.searchQuery}" (${selectedCountry.flag} ${selectedCountry.name}) con umbral mín. de ${newMonitor.minPostReactions} comentarios. Lista dinámica vinculada: "${targetList.name}".`,
      listId: targetList.id,
    });
  };

  const handleScanGlobalRule = async (rule: Level3GlobalMonitor, batchLimit?: 25 | 50 | 100) => {
    setIsScanningId(rule.id);
    setScanFeedback(null);
    const effectiveLimit = batchLimit || selectedBatchSize[rule.id] || rule.batchLeadLimit || 50;
    try {
      const rawAccId = (activeAccount as any)?.unipileAccountId || activeAccount?.id || "";
      const res = await fetch("/api/unipile/signals/global/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountId: rawAccId,
          searchQuery: rule.searchQuery,
          locations: rule.locations,
          targetCountry: rule.targetCountry,
          interactionTypes: rule.interactionTypes || ["comments", "likes"],
          timePeriod: rule.timePeriod || "past_week",
          minPostReactions: rule.minPostReactions || 15,
          limit: effectiveLimit,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || data.error || data.reason || "Error al conectar con el motor de LinkedIn");
      }

      const harvestedLeads: SignalLeadItem[] = (data.items || []).map((lead: any, idx: number) => ({
        id: `sig-lead-g-${Date.now()}-${idx}`,
        monitorId: rule.id,
        fullName: lead.fullName,
        headline: lead.headline || "Decisor en LinkedIn",
        company: lead.company || "",
        location: lead.location || (rule.targetCountryName ? rule.targetCountryName : "Remoto / No especificado"),
        linkedinUrl: lead.linkedinUrl || "",
        avatarUrl: lead.avatarUrl,
        connectionDegree: (lead.connectionDegree || "2nd") as ConnectionDegree,
        intentLevel: (lead.intentLevel || "high") as IntentLevel,
        signalSnippet: lead.signalSnippet || `Debatió activamente en publicación viral sobre "${rule.searchQuery}"`,
        detectedAt: new Date().toISOString(),
        status: "new" as const,
        language: lead.language,
        signalLevel: "level_3" as const,
        sourcePostTitle: lead.sourcePostTitle,
        sourcePostUrl: lead.sourcePostUrl,
      }));

      const added = recordDiscoveredLeads(harvestedLeads);

      const targetList = getOrCreateGlobalList({
        monitorId: rule.id,
        searchQuery: rule.searchQuery,
        countryName: rule.targetCountryName,
        countryFlag: rule.targetCountryFlag,
      });

      const allLeadsForMonitor = leads.filter((l) => l.monitorId === rule.id).concat(added);
      importSignalLeads(targetList, allLeadsForMonitor);

      const newCapturedCount = rule.leadsIdentifiedCount + added.length;
      const updatedPosts = (data.selectedPosts && data.selectedPosts.length > 0)
        ? data.selectedPosts
        : rule.lastScannedPosts || [];

      updateLevel3Monitor(rule.id, {
        leadsIdentifiedCount: newCapturedCount,
        lastScanAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        lastScanAtIso: new Date().toISOString(),
        lastScannedPosts: updatedPosts,
      });

      setScanFeedback({
        type: "success",
        text: `Caza viral completada para "${rule.searchQuery}": Se analizaron ${data.totalPostsAnalyzed || updatedPosts.length} publicaciones de alto debate en ${rule.targetCountryName || "la región"} y se extrajo un lote de ${added.length} decisores activos.`,
        listId: targetList.id,
      });
    } catch (err: any) {
      setScanFeedback({
        type: "error",
        text: `Error al cazar publicaciones virales: ${err.message || "Error al conectar con LinkedIn"}`,
      });
    } finally {
      setIsScanningId(null);
    }
  };

  // Auto-auditoría diaria en segundo plano (cada 24 horas por regla activa)
  const hasAutoAuditedRef = useRef(false);
  useEffect(() => {
    if (!isLoaded || l3Monitors.length === 0 || hasAutoAuditedRef.current) return;
    if (!activeAccount || (activeAccount.status !== "OK" && activeAccount.status !== "CONNECTED")) return;

    hasAutoAuditedRef.current = true;
    const now = Date.now();
    const ONE_DAY_MS = 24 * 60 * 60 * 1000;

    const rulesToAutoAudit = l3Monitors.filter((rule) => {
      if (rule.status !== "active") return false;
      if (!rule.lastScanAtIso) return false;

      const lastScanTime = new Date(rule.lastScanAtIso).getTime();
      if (isNaN(lastScanTime)) return false;

      return now - lastScanTime >= ONE_DAY_MS;
    });

    if (rulesToAutoAudit.length === 0) return;

    rulesToAutoAudit.forEach((rule, index) => {
      setTimeout(() => {
        handleScanGlobalRule(rule);
      }, (index + 1) * 6000);
    });
  }, [isLoaded, l3Monitors.length, activeAccount?.id]);

  const getRuleLeads = (monitorId: string): SignalLeadItem[] => {
    return leads.filter((l) => l.monitorId === monitorId);
  };

  const getRuleScannedPosts = (rule: Level3GlobalMonitor) => {
    if (rule.lastScannedPosts && rule.lastScannedPosts.length > 0) {
      return rule.lastScannedPosts;
    }
    return viralPostsB2B;
  };

  const getListForRule = (rule: Level3GlobalMonitor) => {
    const targetQuery = rule.searchQuery.trim().toLowerCase();
    return lists.find(
      (l: any) =>
        l.sourceMonitorId === rule.id ||
        l.name.toLowerCase().startsWith(`[signal n3] ${targetQuery.slice(0, 32)}`)
    );
  };

  const currentDisplayName = activeAccount?.name || currentUser.name || "Cuenta Principal de LinkedIn";

  return (
    <div className="space-y-6">
      <PageBreadcrumb pageTitle="Signal Radar - Nivel 03: Publicaciones Virales & Tendencias (Cazador de Oportunidades)" />

      {/* Métricas del Nivel 3 - Opción B */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
            Temáticas Virales en Escucha
          </span>
          <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
            {l3Monitors.length} Radares Activos
          </p>
          <span className="text-xs text-brand-600 font-semibold dark:text-brand-400">
            {totalViralPostsCount} publicaciones de alto debate cazadas
          </span>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
            Decisores en Debate Calificado
          </span>
          <p className="mt-2 text-2xl font-bold text-brand-600 dark:text-brand-400">
            {totalGlobalLeads} Prospectos
          </p>
          <span className="text-xs text-emerald-600 font-semibold dark:text-emerald-400">
            Intención Alta 🥇 Comentaristas (90 pts) y Reposts (80 pts)
          </span>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
            Tasa de Respuesta en Debate
          </span>
          <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
            56.4%
          </p>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            Respuestas al conectar sobre publicaciones donde ya opinaron
          </span>
        </div>
      </div>

      {/* Explicación de la Estrategia (Nivel 3) */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-5 rounded-2xl border border-brand-200 bg-brand-25/40 dark:border-brand-900 dark:bg-brand-950/20">
        <div>
          <h4 className="text-sm font-bold text-brand-900 dark:text-brand-200">
            Mecánica de Prospección por Tendencias y Debate Viral (Nivel 3)
          </h4>
          <p className="text-xs text-brand-700 dark:text-brand-300 mt-1 max-w-2xl">
            Rastrea las publicaciones con mayor tracción, debate y volumen de comentarios de todo LinkedIn sobre los problemas que tu solución resuelve. Filtra solo publicaciones con alto debate para prospectar decisores calientes que participan activamente en tu mercado.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsAddingRule(!isAddingRule)}
          className="rounded-lg bg-brand-500 px-4 py-2.5 text-xs font-semibold text-white hover:bg-brand-600 transition"
        >
          {isAddingRule ? "Cerrar Configurador" : "+ Nuevo Radar de Tendencias"}
        </button>
      </div>

      {/* Formulario para Agregar Radar de Publicaciones Virales */}
      {isAddingRule && (
        <ComponentCard
          title="Configurador de Radar de Publicaciones Virales"
          desc="Define la temática o dolor de negocio y el umbral mínimo de comentarios para cazar las publicaciones más calientes de LinkedIn."
        >
          <form onSubmit={handleAddRule} className="space-y-4">
            {/* Fila 1: Temática a Rastrear y Mercado / País Objetivo */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Campo 1: Temática o Dolor a Rastrear */}
              <div>
                <label className="block text-xs font-semibold uppercase text-gray-500 mb-1">
                  Temática o Dolor de Negocio a Rastrear
                </label>
                <input
                  type="text"
                  required
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Ej. Prospección B2B, Inteligencia Artificial para Ventas, Cold Outreach..."
                  className="w-full rounded-lg border border-gray-300 p-2.5 text-xs text-gray-800 focus:border-brand-500 focus:outline-hidden dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                />
                <span className="text-[10px] text-gray-400 mt-1 block">
                  El cazador buscará publicaciones en LinkedIn que aborden esta problemática.
                </span>
              </div>

              {/* Campo 2: País / Mercado Objetivo */}
              <div className="relative" ref={countryDropdownRef}>
                <label className="block text-xs font-semibold uppercase text-gray-500 mb-1">
                  Mercado / País Objetivo
                </label>
                <button
                  type="button"
                  onClick={() => setIsCountryDropdownOpen(!isCountryDropdownOpen)}
                  className="w-full flex items-center justify-between rounded-lg border border-gray-300 p-2.5 text-xs text-gray-800 bg-white hover:border-gray-400 focus:border-brand-500 focus:outline-hidden dark:border-gray-700 dark:bg-gray-900 dark:text-white transition"
                >
                  <span className="flex items-center gap-2 font-medium">
                    <span className="text-base">{selectedCountry.flag}</span>
                    <span>{selectedCountry.name}</span>
                  </span>
                  <span className="text-gray-400 text-xs">▼</span>
                </button>

                {isCountryDropdownOpen && (
                  <div className="absolute z-50 left-0 right-0 mt-1 max-h-64 overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-xl dark:border-gray-800 dark:bg-gray-900 text-xs p-1">
                    <div className="p-1.5 border-b border-gray-100 dark:border-gray-800 sticky top-0 bg-white dark:bg-gray-900">
                      <input
                        type="text"
                        placeholder="Buscar país..."
                        value={countrySearch}
                        onChange={(e) => setCountrySearch(e.target.value)}
                        className="w-full rounded-md border border-gray-200 px-2 py-1 text-xs text-gray-800 focus:border-brand-500 focus:outline-hidden dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                        autoFocus
                      />
                    </div>
                    <div className="py-1">
                      {filteredCountries.map((c) => {
                        const isSelected = selectedCountry.code === c.code;
                        return (
                          <div
                            key={c.code}
                            onClick={() => {
                              setSelectedCountry(c);
                              setIsCountryDropdownOpen(false);
                              setCountrySearch("");
                            }}
                            className={`flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition ${
                              isSelected
                                ? "bg-brand-50 text-brand-700 font-semibold dark:bg-brand-950/40 dark:text-brand-300"
                                : "text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800/60"
                            }`}
                          >
                            <span className="flex items-center gap-2">
                              <span className="text-base">{c.flag}</span>
                              <span>{c.name}</span>
                            </span>
                            {isSelected && <span className="text-brand-600 font-bold">✓</span>}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
                <span className="text-[10px] text-gray-400 mt-1 block">
                  Prioriza publicaciones y comentaristas ubicados en esta región.
                </span>
              </div>
            </div>

            {/* Fila 2: Filtro de Tracción Mínima y Lote de Cosecha (Diseño Gemelo Lado a Lado) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Filtro de Tracción Mínima */}
              <div>
                <label className="block text-xs font-semibold uppercase text-gray-500 mb-1">
                  Filtro de Tracción Mínima (Volumen de Comentarios)
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: 10, label: "+10 comentarios", tag: "Moderado" },
                    { value: 20, label: "+20 comentarios", tag: "Recomendado", recommended: true },
                    { value: 50, label: "+50 comentarios", tag: "Viral Masivo" },
                  ].map((thresh) => (
                    <button
                      key={thresh.value}
                      type="button"
                      onClick={() => setMinCommentThreshold(thresh.value)}
                      className={`p-2 rounded-lg border text-left transition ${
                        minCommentThreshold === thresh.value
                          ? "border-brand-500 bg-brand-50/50 dark:bg-brand-950/30 ring-2 ring-brand-500/20 shadow-xs"
                          : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 hover:border-gray-300"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-gray-900 dark:text-white">
                          {thresh.label}
                        </span>
                        {thresh.recommended && (
                          <span className="text-[9px] font-bold text-brand-700 bg-brand-100 dark:bg-brand-900/60 dark:text-brand-300 px-1 rounded">
                            Óptimo
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-gray-500 dark:text-gray-400 block mt-0.5">
                        {thresh.tag}
                      </span>
                    </button>
                  ))}
                </div>
                <span className="text-[10px] text-gray-400 mt-1 block">
                  Descarta publicaciones con poco debate y selecciona solo posts con masa crítica de decisores.
                </span>
              </div>

              {/* Lote de Cosecha por Publicación (Mismo diseño exacto) */}
              <div>
                <label className="block text-xs font-semibold uppercase text-gray-500 mb-1">
                  Lote de Cosecha por Publicación (Protección LinkedIn)
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: 25, label: "25 perfiles", tag: "Ultra Seguro" },
                    { value: 50, label: "50 perfiles", tag: "Recomendado", recommended: true },
                    { value: 100, label: "100 perfiles", tag: "Intensivo" },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setBatchLeadLimit(opt.value as 25 | 50 | 100)}
                      className={`p-2 rounded-lg border text-left transition ${
                        batchLeadLimit === opt.value
                          ? "border-brand-500 bg-brand-50/50 dark:bg-brand-950/30 ring-2 ring-brand-500/20 shadow-xs"
                          : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 hover:border-gray-300"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-gray-900 dark:text-white">
                          {opt.label}
                        </span>
                        {opt.recommended && (
                          <span className="text-[9px] font-bold text-brand-700 bg-brand-100 dark:bg-brand-900/60 dark:text-brand-300 px-1 rounded">
                            Óptimo
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-gray-500 dark:text-gray-400 block mt-0.5">
                        {opt.tag}
                      </span>
                    </button>
                  ))}
                </div>
                <span className="text-[10px] text-gray-400 mt-1 block">
                  Límite seguro de perfiles extraídos por post para proteger tu cuenta de LinkedIn.
                </span>
              </div>
            </div>

            {/* Fila 3: Filtro Anti-Colaboradores */}
            <div className="flex items-center p-3.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50">
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={excludeInternalEngagement}
                  onChange={(e) => setExcludeInternalEngagement(e.target.checked)}
                  className="mt-0.5 rounded border-gray-300 text-brand-500 focus:ring-brand-500"
                />
                <div>
                  <span className="text-xs font-semibold text-gray-800 dark:text-gray-200 block">
                    🛡️ Descartar engagement de colaboradores del autor
                  </span>
                  <span className="text-[11px] text-gray-500 dark:text-gray-400 block mt-0.5">
                    Filtra comentarios y reacciones de empleados de la misma empresa para extraer únicamente clientes potenciales externos.
                  </span>
                </div>
              </label>
            </div>

            {/* Plantilla Relacional Contextual */}
            <div>
              <label className="block text-xs font-semibold uppercase text-gray-500 mb-1">
                Plantilla de Secuencia Relacional Contextual
              </label>
              <textarea
                rows={3}
                value={outreachTemplate}
                onChange={(e) => setOutreachTemplate(e.target.value)}
                className="w-full rounded-lg border border-gray-300 p-2.5 text-xs text-gray-800 font-mono focus:border-brand-500 focus:outline-hidden dark:border-gray-700 dark:bg-gray-900 dark:text-white"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsAddingRule(false)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="rounded-lg bg-brand-500 px-5 py-2 text-xs font-semibold text-white hover:bg-brand-600 transition shadow-xs flex items-center gap-1.5"
              >
                <span>Activar Radar de Tendencias</span>
              </button>
            </div>
          </form>
        </ComponentCard>
      )}

      {/* Barra de Cuenta Conectada & Estado de Escucha */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl bg-white border border-gray-200 dark:bg-gray-900 dark:border-gray-800 text-xs" suppressHydrationWarning>
        <div className="flex items-center gap-2">
          <span className="font-semibold text-gray-600 dark:text-gray-400">
            Cuenta de LinkedIn activa para caza de tendencias:
          </span>
          <span className="font-bold text-gray-900 dark:text-white" suppressHydrationWarning>
            {currentDisplayName}
          </span>
          <span className="rounded bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400" suppressHydrationWarning>
            {activeAccount?.status === "OK" ? "CONECTADA" : "ACTIVA"}
          </span>
        </div>

        {availableAccounts.length > 1 && (
          <div className="flex items-center gap-2">
            <span className="text-gray-500 text-[11px]">Cambiar cuenta:</span>
            <select
              value={activeAccount?.id || ""}
              onChange={(e) => {
                const sel = availableAccounts.find((a) => a.id === e.target.value);
                if (sel) {
                  setActiveAccount(sel);
                  setActiveAccountId(sel.id);
                }
              }}
              className="rounded-lg border border-gray-300 bg-white px-2.5 py-1 text-xs text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
            >
              {availableAccounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Banner de Feedback de Escaneo */}
      {scanFeedback && (
        <div
          className={`rounded-xl p-3.5 text-xs border flex flex-wrap items-center justify-between gap-2 ${
            scanFeedback.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/30 dark:border-emerald-900/50 dark:text-emerald-300"
              : "bg-red-50 border-red-200 text-red-800 dark:bg-red-950/30 dark:border-red-900/50 dark:text-red-300"
          }`}
        >
          <div className="flex items-center gap-2">
            <span className="font-bold">{scanFeedback.type === "success" ? "✓" : "⚠"}</span>
            <span>{scanFeedback.text}</span>
            {scanFeedback.listId && (
              <Link
                href={`/leads/lists?listId=${encodeURIComponent(scanFeedback.listId)}`}
                className="inline-flex items-center gap-1 font-bold underline hover:opacity-80 ml-2"
              >
                Ver Lista Inteligente →
              </Link>
            )}
          </div>
          <button
            type="button"
            onClick={() => setScanFeedback(null)}
            className="text-xs font-bold hover:underline px-2"
          >
            ✕
          </button>
        </div>
      )}

      {/* Tabla Principal: Feed de Oportunidades & Radares Virales */}
      <ComponentCard title={`Radares Temáticos de Publicaciones Virales (${l3Monitors.length})`}>
        {!isLoaded ? (
          <p className="text-xs text-gray-400 py-4">Cargando radares de tendencias...</p>
        ) : l3Monitors.length === 0 ? (
          <div className="py-12 text-center space-y-3">
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              No tienes radares de publicaciones virales activos en Signal Radar Nivel 3.
            </p>
            <p className="text-xs text-gray-400 max-w-md mx-auto">
              Configura una temática o dolor de negocio (ej. Prospección B2B, Inteligencia Artificial) y el sistema cazará las publicaciones con mayor debate de LinkedIn.
            </p>
            <button
              type="button"
              onClick={() => setIsAddingRule(true)}
              className="rounded-lg bg-brand-500 px-4 py-2 text-xs font-semibold text-white hover:bg-brand-600 transition"
            >
              + Agregar Primer Radar Viral
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-gray-100 text-[11px] font-bold uppercase tracking-wider text-gray-600 dark:border-gray-800 dark:text-gray-300">
                <tr>
                  <th className="px-4 py-3 min-w-[360px]">Temática / Problema en LinkedIn</th>
                  <th className="px-4 py-3 min-w-[180px]">Filtro de Debate & Región</th>
                  <th className="px-4 py-3 whitespace-nowrap">Decisores Extraídos</th>
                  <th className="px-4 py-3 whitespace-nowrap">Última Caza</th>
                  <th className="px-4 py-3 whitespace-nowrap">Estado</th>
                  <th className="px-4 py-3 text-right whitespace-nowrap">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-xs dark:divide-gray-800">
                {l3Monitors.map((rule) => {
                  const targetList = getListForRule(rule);
                  const leadsCount = Math.max(rule.leadsIdentifiedCount || 0, getRuleLeads(rule.id).length);
                  const countryFlag = rule.targetCountryFlag || "🌎";
                  const countryName = rule.targetCountryName || (rule.locations && rule.locations.length > 0 ? rule.locations[0] : "España");
                  const scannedPosts = getRuleScannedPosts(rule);
                  const isExpanded = Boolean(expandedRulePosts[rule.id]);
                  const activeBatch = selectedBatchSize[rule.id] || rule.batchLeadLimit || 50;

                  return (
                    <Fragment key={rule.id}>
                      <tr className="hover:bg-gray-50/50 dark:hover:bg-white/2 transition align-top">
                        {/* 1. Temática & Problema en LinkedIn */}
                        <td className="px-4 py-3.5 align-top">
                          <div className="flex items-start gap-2.5">
                            {/* Icono de Radar de Tendencias */}
                            <div className="h-8 w-8 flex items-center justify-center shrink-0 shadow-xs rounded-full bg-brand-50 dark:bg-brand-950/60 border border-brand-200 dark:border-brand-800 mt-0.5 text-brand-600 dark:text-brand-400">
                              <TrendingUp className="size-4" />
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <p className="font-semibold text-gray-900 dark:text-white">
                                  {rule.searchQuery}
                                </p>
                                <span className="rounded-full px-1.5 py-0.2 text-[9px] font-bold bg-brand-50 text-brand-700 dark:bg-brand-950/60 dark:text-brand-300 border border-brand-200 dark:border-brand-800">
                                  Feed Viral
                                </span>
                              </div>

                              <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate max-w-sm mt-0.5">
                                Caza de publicaciones virales con debate activo en {countryName}
                              </p>

                              {/* Botón para desplegar / ocultar publicaciones virales cazadas */}
                              {scannedPosts.length > 0 ? (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setExpandedRulePosts((prev) => ({
                                      ...prev,
                                      [rule.id]: !isExpanded,
                                    }))
                                  }
                                  className="inline-flex items-center gap-1.5 mt-1.5 text-[11px] font-semibold text-brand-600 dark:text-brand-400 hover:text-brand-700 hover:underline transition"
                                  title={isExpanded ? "Ocultar las publicaciones cazadas" : "Ver todas las publicaciones cazadas"}
                                >
                                  <span>
                                    {isExpanded
                                      ? "Ocultar Publicaciones Virales"
                                      : `Ver Publicaciones Virales Cazadas (${scannedPosts.length})`}
                                  </span>
                                  <span className="text-[10px]">{isExpanded ? "▴" : "▾"}</span>
                                </button>
                              ) : (
                                <span className="block mt-1 text-[11px] text-gray-400 dark:text-gray-500 italic">
                                  Sin posts cazados. Pulsa &quot;Cazar Posts&quot; para escanear publicaciones en vivo.
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* 2. Filtro de Debate & Región */}
                        <td className="px-4 py-3.5 align-top">
                          <div className="flex flex-wrap gap-1">
                            <span className="rounded bg-brand-50 border border-brand-200/60 px-2 py-0.5 text-[11px] font-semibold text-brand-800 dark:bg-brand-950/60 dark:border-brand-900 dark:text-brand-300">
                              Mín. {rule.minPostReactions || 15} comentarios
                            </span>
                            <span className="rounded bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                              {countryFlag} {countryName}
                            </span>
                          </div>
                        </td>

                        {/* 3. Decisores Extraídos */}
                        <td className="px-4 py-3.5 whitespace-nowrap font-bold text-brand-600 dark:text-brand-400 align-top">
                          {leadsCount > 0 ? (
                            <Link
                              href={targetList ? `/leads/lists?listId=${encodeURIComponent(targetList.id)}` : "/leads"}
                              className="hover:underline flex items-center gap-1"
                            >
                              <span>{leadsCount} decisores</span>
                              <span className="text-[10px] font-normal text-gray-400">↗</span>
                            </Link>
                          ) : (
                            <span>0 decisores</span>
                          )}
                        </td>

                        {/* 4. Último Escaneo */}
                        <td className="px-4 py-3.5 whitespace-nowrap text-gray-500 dark:text-gray-400 align-top">
                          <span className="font-medium text-gray-800 dark:text-gray-200">{rule.lastScanAt}</span>
                        </td>

                        {/* 5. Estado */}
                        <td className="px-4 py-3.5 whitespace-nowrap align-top">
                          <button
                            type="button"
                            onClick={() => toggleLevel3Status(rule.id)}
                            className={`rounded-full px-2.5 py-0.5 font-semibold text-[11px] transition ${
                              rule.status === "active"
                                ? "bg-green-50 text-green-700 hover:bg-green-100 dark:bg-green-950/40 dark:text-green-400"
                                : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300"
                            }`}
                          >
                            {rule.status === "active" ? "Cazando" : "Pausado"}
                          </button>
                        </td>

                        {/* 6. Acciones */}
                        <td className="px-4 py-3.5 text-right whitespace-nowrap align-top">
                          <div className="inline-flex items-center justify-end gap-1.5 flex-wrap">
                            {/* Selector rápido de pastillas de lote [ 25 | 50 | 100 ] */}
                            <div
                              className="inline-flex items-center rounded-md border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/80 p-0.5 text-[10px] font-semibold"
                              title="Seleccionar tamaño de lote para la cosecha"
                            >
                              {([25, 50, 100] as const).map((batchVal) => {
                                const isSelected = activeBatch === batchVal;
                                return (
                                  <button
                                    key={batchVal}
                                    type="button"
                                    disabled={isScanningId === rule.id}
                                    onClick={() =>
                                      setSelectedBatchSize((prev) => ({
                                        ...prev,
                                        [rule.id]: batchVal,
                                      }))
                                    }
                                    className={`px-1.5 py-0.5 rounded transition ${
                                      isSelected
                                        ? "bg-brand-500 text-white font-bold shadow-2xs"
                                        : "text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                                    }`}
                                  >
                                    {batchVal}
                                  </button>
                                );
                              })}
                            </div>

                            {/* Botón Cazar Posts con Lote */}
                            <button
                              type="button"
                              disabled={isScanningId === rule.id}
                              onClick={() => handleScanGlobalRule(rule, activeBatch)}
                              className="rounded-md bg-brand-500 px-2.5 py-1 text-white hover:bg-brand-600 font-medium text-xs transition disabled:opacity-50 inline-flex items-center gap-1 shadow-2xs"
                              title={`Cazar publicaciones virales y cosechar lote seguro de hasta ${activeBatch} decisores`}
                            >
                              {isScanningId === rule.id ? (
                                <>
                                  <span className="h-3 w-3 rounded-full border-2 border-white/40 border-t-white animate-spin"></span>
                                  Cazando ({activeBatch})...
                                </>
                              ) : (
                                <>
                                  <span>Cazar Posts</span>
                                  <span className="rounded bg-brand-600/80 px-1 py-0.2 text-[10px] font-bold">
                                    {activeBatch}
                                  </span>
                                </>
                              )}
                            </button>

                            {/* Botón Ver Lista / Leads */}
                            <button
                              type="button"
                              onClick={() => setSelectedRuleForLeads(rule)}
                              className="rounded-md border border-brand-500 px-2.5 py-1 text-brand-600 hover:bg-brand-50 dark:text-brand-400 dark:hover:bg-brand-950/20 font-medium text-xs inline-flex items-center gap-1.5 transition"
                              title={`Abrir decisores captados de ${rule.searchQuery}`}
                            >
                              <span>Ver Leads ({leadsCount})</span>
                              <span aria-hidden="true">&rarr;</span>
                            </button>

                            {/* Botón Editar Regla */}
                            <button
                              type="button"
                              onClick={() => setEditingRule(rule)}
                              className="h-[26px] w-[26px] rounded-md border border-gray-200 text-gray-600 hover:border-brand-500 hover:text-brand-600 hover:bg-brand-50 dark:border-gray-700 dark:text-gray-300 dark:hover:border-brand-500 dark:hover:text-brand-400 dark:hover:bg-brand-950/20 inline-flex items-center justify-center transition shrink-0"
                              title="Editar radar de tendencias"
                            >
                              <Pencil className="size-3.5" />
                            </button>

                            {/* Botón Eliminar */}
                            <button
                              type="button"
                              onClick={() => {
                                if (confirm(`¿Eliminar radar de "${rule.searchQuery}"?`)) {
                                  deleteLevel3Monitor(rule.id);
                                }
                              }}
                              className="h-[26px] w-[26px] rounded-md border border-red-200 text-red-600 hover:bg-red-50 dark:border-red-900/40 dark:text-red-400 inline-flex items-center justify-center transition shrink-0"
                              title="Eliminar radar"
                            >
                              <X className="size-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Card de Ancho Completo: Feed de Publicaciones Virales Cazadas (Opción B) */}
                      {isExpanded && scannedPosts.length > 0 && (
                        <tr key={`${rule.id}-posts-card`} className="border-t-0">
                          <td colSpan={6} className="px-4 pb-4 pt-0 border-t-0">
                            <div className="w-full rounded-xl border border-blue-100 bg-blue-50/60 p-3.5 dark:border-blue-900/40 dark:bg-blue-950/20 shadow-xs">
                              <div className="flex items-center justify-between mb-2.5">
                                <span className="text-xs font-bold text-blue-900 dark:text-blue-200 flex items-center gap-1.5">
                                  <TrendingUp className="size-3.5 text-blue-600 dark:text-blue-400" />
                                  <span>Publicaciones Virales Cazadas con Alto Debate ({scannedPosts.length})</span>
                                </span>
                                <span className="text-[11px] font-medium text-blue-600 dark:text-blue-400">
                                  Tracción real en {countryName} • {rule.searchQuery}
                                </span>
                              </div>

                              <div className="space-y-2.5">
                                {scannedPosts.map((post, pIdx) => (
                                  <div
                                    key={post.id || pIdx}
                                    className="flex items-center justify-between gap-4 text-xs bg-white dark:bg-gray-800/90 p-3 rounded-lg border border-blue-100 dark:border-blue-900/30 shadow-2xs hover:border-blue-200 dark:hover:border-blue-800 transition"
                                  >
                                    <div className="min-w-0 flex-1">
                                      <p className="font-medium text-gray-800 dark:text-gray-200 leading-snug">
                                        <span className="font-bold text-gray-900 dark:text-white mr-1.5">
                                          {post.authorName || "Autor en LinkedIn"}:
                                        </span>
                                        &ldquo;{post.text}&rdquo;
                                      </p>

                                      {/* Métricas Reales de LinkedIn con Destacado de Comentarios y Reposts */}
                                      <div className="flex items-center gap-2 text-[11px] mt-1.5 flex-wrap">
                                        <span className="inline-flex items-center gap-1 rounded bg-emerald-50 px-2 py-0.5 font-bold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                                          💬 {post.commentsCount ?? 0} comentarios
                                          <span className="text-[10px] font-normal text-emerald-600">(🥇 90 pts)</span>
                                        </span>

                                        <span className="inline-flex items-center gap-1 rounded bg-blue-50 px-2 py-0.5 font-semibold text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                                          🔁 {post.repostsCount ?? 0} reposts
                                          <span className="text-[10px] font-normal text-blue-600">(🥈 80 pts)</span>
                                        </span>

                                        <span className="inline-flex items-center gap-1 rounded bg-amber-50 px-2 py-0.5 font-medium text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                                          👍 {post.reactionsCount ?? 0} reacciones
                                          <span className="text-[10px] font-normal text-amber-700">(🥉 70 pts)</span>
                                        </span>

                                        {post.scannedAt && (
                                          <span className="text-gray-400 text-[10px] ml-1">
                                            • Caza: {post.scannedAt}
                                          </span>
                                        )}
                                      </div>
                                    </div>

                                    <a
                                      href={post.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="shrink-0 inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 transition shadow-xs"
                                    >
                                      <span>Ver Post</span>
                                      <span>↗</span>
                                    </a>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </ComponentCard>

      {/* Modal para Visualizar Decisores Extraídos */}
      {selectedRuleForLeads && (
        <div className="fixed inset-0 z-99999 flex items-center justify-center bg-black/60 p-4">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-6 shadow-theme-xl dark:bg-gray-900 border border-gray-200 dark:border-gray-800">
            <div className="flex items-start justify-between border-b border-gray-100 pb-4 dark:border-gray-800">
              <div>
                <span className="rounded bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700 dark:bg-amber-950 dark:text-amber-300 flex items-center gap-1 w-fit">
                  <span>{selectedRuleForLeads.targetCountryFlag || "🌎"}</span>
                  <span>Tendencia Viral: {selectedRuleForLeads.searchQuery}</span>
                </span>
                <h3 className="mt-2 text-base font-bold text-gray-900 dark:text-white">
                  Decisores Extraídos de Publicaciones Virales
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Personas que comentaron y participaron activamente en los debates calientes de esta temática.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedRuleForLeads(null)}
                className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 font-bold"
              >
                Cerrar
              </button>
            </div>

            {/* Publicaciones Seleccionadas en LinkedIn */}
            {selectedRuleForLeads.lastScannedPosts && selectedRuleForLeads.lastScannedPosts.length > 0 && (
              <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50/50 p-3.5 dark:border-blue-900/40 dark:bg-blue-950/20">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-blue-950 dark:text-blue-200 flex items-center gap-1.5">
                    <TrendingUp className="size-3.5 text-blue-600 dark:text-blue-400" />
                    <span>Publicaciones de LinkedIn Analizadas ({selectedRuleForLeads.lastScannedPosts.length})</span>
                  </span>
                  <span className="text-[10px] text-blue-700 dark:text-blue-400">
                    Tracción en {selectedRuleForLeads.targetCountryName || "la región"}
                  </span>
                </div>
                <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
                  {selectedRuleForLeads.lastScannedPosts.map((post, pIdx) => (
                    <div
                      key={post.id || pIdx}
                      className="flex items-center justify-between gap-3 text-xs bg-white dark:bg-gray-800/80 p-2.5 rounded-lg border border-blue-100 dark:border-blue-900/30"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-gray-800 dark:text-gray-200 truncate">
                          <span className="font-bold text-gray-900 dark:text-white mr-1.5">
                            {post.authorName || "Autor"}:
                          </span>
                          &quot;{post.text}&quot;
                        </p>
                        <span className="text-[10px] text-gray-400">
                          {post.commentsCount ?? 0} comentarios • {post.repostsCount ?? 0} reposts • {post.reactionsCount ?? 0} reacciones
                        </span>
                      </div>
                      <a
                        href={post.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-brand-600 hover:underline shrink-0"
                      >
                        Ver Post ↗
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Listado de Prospectos */}
            <div className="mt-4 divide-y divide-gray-100 dark:divide-gray-800">
              {getRuleLeads(selectedRuleForLeads.id).length === 0 ? (
                <div className="py-8 text-center text-xs text-gray-400">
                  <p>Aún no se han capturado decisores en este radar.</p>
                  <p className="mt-1">Pulsa &quot;Cazar Posts&quot; en la tabla para extraer comentarios y participantes en vivo.</p>
                </div>
              ) : (
                getRuleLeads(selectedRuleForLeads.id).map((lead) => (
                  <div key={lead.id} className="py-3 flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <ProspectAvatar
                        name={lead.fullName}
                        imageUrl={lead.avatarUrl}
                        size="md"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-gray-900 dark:text-white truncate">
                            {lead.fullName}
                          </p>
                          <LeadScoreBadge
                            score={calculateSignalScore(lead)}
                          />
                        </div>
                        <p className="text-[11px] text-gray-500 truncate">{lead.headline}</p>
                        <p className="text-[10px] text-gray-400 truncate mt-0.5">
                          {lead.company} {lead.location ? `• ${lead.location}` : ""}
                        </p>
                        {lead.signalSnippet && (
                          <p className="text-[11px] text-brand-600 dark:text-brand-400 italic mt-0.5 truncate">
                            &quot;{lead.signalSnippet}&quot;
                          </p>
                        )}
                      </div>
                    </div>

                    {lead.linkedinUrl && (
                      <a
                        href={lead.linkedinUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800 shrink-0"
                      >
                        Perfil ↗
                      </a>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal de Edición de Radar Viral */}
      {editingRule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-xl rounded-xl border border-gray-200 bg-white p-6 shadow-xl dark:border-gray-800 dark:bg-gray-900">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3 dark:border-gray-800">
              <div className="flex items-center gap-2">
                <Pencil className="size-5 text-brand-500" />
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  Editar Radar de Tendencias Virales
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingRule(null)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 space-y-4 max-h-[75vh] overflow-y-auto pr-1">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                  Temática o Problema en LinkedIn
                </label>
                <input
                  type="text"
                  value={editingRule.searchQuery}
                  onChange={(e) =>
                    setEditingRule({ ...editingRule, searchQuery: e.target.value })
                  }
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  placeholder="Ej: Prospección B2B, Inteligencia Artificial"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                  Umbral Mínimo de Comentarios
                </label>
                <input
                  type="number"
                  min="5"
                  max="100"
                  value={editingRule.minPostReactions || 15}
                  onChange={(e) =>
                    setEditingRule({
                      ...editingRule,
                      minPostReactions: Number(e.target.value),
                    })
                  }
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                  País o Región Objetivo
                </label>
                <select
                  value={editingRule.targetCountry || "all"}
                  onChange={(e) => {
                    const found = COUNTRY_OPTIONS.find((c) => c.code === e.target.value);
                    setEditingRule({
                      ...editingRule,
                      targetCountry: e.target.value,
                      targetCountryName: found ? found.name : editingRule.targetCountryName,
                      targetCountryFlag: found ? found.flag : editingRule.targetCountryFlag,
                    });
                  }}
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                >
                  {COUNTRY_OPTIONS.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.flag} {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2 border-t border-gray-100 pt-3 dark:border-gray-800">
              <button
                type="button"
                onClick={() => setEditingRule(null)}
                className="rounded-md border border-gray-300 px-4 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  const sel = COUNTRY_OPTIONS.find((c) => c.code === editingRule.targetCountry);
                  updateLevel3Monitor(editingRule.id, {
                    searchQuery: editingRule.searchQuery,
                    nicheTopic: editingRule.nicheTopic,
                    minPostReactions: Number(editingRule.minPostReactions) || 15,
                    targetCountry: editingRule.targetCountry,
                    targetCountryName: sel ? sel.name : editingRule.targetCountryName,
                    targetCountryFlag: sel ? sel.flag : editingRule.targetCountryFlag,
                  });
                  setEditingRule(null);
                }}
                className="rounded-md bg-brand-500 px-4 py-1.5 text-xs font-medium text-white hover:bg-brand-600 transition shadow-xs"
              >
                Guardar Cambios
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
