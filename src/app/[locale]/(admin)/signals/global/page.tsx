"use client";

import ComponentCard from "@/components/common/ComponentCard";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import ProspectAvatar from "@/components/leads/ProspectAvatar";
import { useLeads } from "@/lib/leads/store";
import { useSignalRadar } from "@/lib/signals/store";
import type { ConnectionDegree, IntentLevel, Level3GlobalMonitor, SignalLeadItem } from "@/lib/signals/types";
import {
  getActiveAccountForUser,
  getVisibleAccountsForUser,
  setActiveAccountId,
  accountMatchesUser,
} from "@/lib/unipile/store";
import type { UnipileAccount } from "@/lib/unipile/types";
import { Link } from "@/i18n/navigation";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Pencil, X } from "lucide-react";

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
    code: "BR",
    name: "Brasil",
    flag: "🇧🇷",
    keywords: ["brasil", "brazil", "são paulo", "sao paulo", "rio de janeiro", "curitiba", "belo horizonte", "porto alegre", "campinas", "florianópolis"],
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
  const [isScanningId, setIsScanningId] = useState<string | null>(null);
  const [scanFeedback, setScanFeedback] = useState<{ type: "success" | "error"; text: string; listId?: string } | null>(null);

  // Form states simplificados
  const [searchQuery, setSearchQuery] = useState("Prospección B2B");
  const [selectedCountry, setSelectedCountry] = useState<CountryOption>(
    COUNTRY_OPTIONS.find((c) => c.code === "ES") || COUNTRY_OPTIONS[0]
  );
  const [isCountryDropdownOpen, setIsCountryDropdownOpen] = useState(false);
  const [countrySearch, setCountrySearch] = useState("");
  const countryDropdownRef = useRef<HTMLDivElement>(null);

  const [timePeriod, setTimePeriod] = useState<"past_24h" | "past_week" | "past_month">("past_week");
  const [trackComments, setTrackComments] = useState(true);
  const [trackLikes, setTrackLikes] = useState(false);
  const [minReactions, setMinReactions] = useState(10);
  const [excludeInternalEngagement, setExcludeInternalEngagement] = useState(true);

  // Cerrar dropdown al hacer click fuera
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

  const filteredCountries = COUNTRY_OPTIONS.filter((c) =>
    c.name.toLowerCase().includes(countrySearch.toLowerCase())
  );

  const handleAddRule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    const interactions: ("comments" | "likes")[] = [];
    if (trackComments) interactions.push("comments");
    if (trackLikes) interactions.push("likes");

    const newMonitor: Level3GlobalMonitor = {
      id: `mon-l3-${Date.now()}`,
      searchQuery: searchQuery.trim(),
      locations: selectedCountry.keywords.length > 0 ? selectedCountry.keywords : [selectedCountry.code],
      targetCountry: selectedCountry.code,
      targetCountryName: selectedCountry.name,
      targetCountryFlag: selectedCountry.flag,
      timePeriod,
      interactionTypes: interactions.length > 0 ? interactions : ["comments"],
      minPostReactions: Number(minReactions) || 10,
      status: "active",
      leadsIdentifiedCount: 0,
      lastScanAt: "Recién configurado",
      createdAt: new Date().toISOString(),
    };

    addLevel3Monitor(newMonitor);
    const targetList = getOrCreateGlobalList({
      monitorId: newMonitor.id,
      searchQuery: newMonitor.searchQuery,
      countryName: newMonitor.targetCountryName,
      countryFlag: newMonitor.targetCountryFlag,
    });

    setIsAddingRule(false);
    setScanFeedback({
      type: "success",
      text: `Monitor temático global creado para "${newMonitor.searchQuery}" (${selectedCountry.flag} ${selectedCountry.name}). Se vinculó la lista dinámica "${targetList.name}".`,
      listId: targetList.id,
    });
  };

  const handleScanGlobalRule = async (rule: Level3GlobalMonitor) => {
    setIsScanningId(rule.id);
    setScanFeedback(null);
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
          interactionTypes: rule.interactionTypes || ["comments"],
          timePeriod: rule.timePeriod || "past_week",
          minPostReactions: rule.minPostReactions,
          limit: 8,
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
        headline: lead.headline || "Profesional en LinkedIn",
        company: lead.company || "",
        location: lead.location || (rule.targetCountryName ? rule.targetCountryName : "Remoto / No especificado"),
        linkedinUrl: lead.linkedinUrl || "",
        avatarUrl: lead.avatarUrl,
        connectionDegree: (lead.connectionDegree || "2nd") as ConnectionDegree,
        intentLevel: (lead.intentLevel || "medium_high") as IntentLevel,
        signalSnippet: lead.signalSnippet || `Participó en debate viral sobre "${rule.searchQuery}"`,
        detectedAt: new Date().toISOString(),
        status: "new" as const,
        language: lead.language,
        signalLevel: "level_3" as const,
        sourcePostTitle: lead.sourcePostTitle,
        sourcePostUrl: lead.sourcePostUrl,
      }));

      const added = recordDiscoveredLeads(harvestedLeads);

      // Crear o vincular lista dinámica en el Directorio de Leads
      const targetList = getOrCreateGlobalList({
        monitorId: rule.id,
        searchQuery: rule.searchQuery,
        countryName: rule.targetCountryName,
        countryFlag: rule.targetCountryFlag,
      });

      // Sincronizar todos los leads descubiertos con la lista del CRM
      const allLeadsForMonitor = leads.filter((l) => l.monitorId === rule.id).concat(added);
      importSignalLeads(targetList, allLeadsForMonitor);

      const newCapturedCount = rule.leadsIdentifiedCount + added.length;
      const updatedPosts = (data.selectedPosts && data.selectedPosts.length > 0)
        ? data.selectedPosts
        : rule.lastScannedPosts || [];

      updateLevel3Monitor(rule.id, {
        leadsIdentifiedCount: newCapturedCount,
        lastScanAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        lastScannedPosts: updatedPosts,
      });

      setScanFeedback({
        type: "success",
        text: `Escaneo global finalizado: Se analizaron ${data.totalPostsAnalyzed || 0} publicaciones virales en ${rule.targetCountryName || "la región"} y se extrajeron ${added.length} prospectos locales verificados para "${rule.searchQuery}".`,
        listId: targetList.id,
      });
    } catch (err: any) {
      setScanFeedback({
        type: "error",
        text: `Error al escanear debates globales: ${err.message || "Error al conectar con LinkedIn"}`,
      });
    } finally {
      setIsScanningId(null);
    }
  };

  const getRuleLeads = (monitorId: string): SignalLeadItem[] => {
    return leads.filter((l) => l.monitorId === monitorId);
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
      <PageBreadcrumb pageTitle="Signal Radar - Nivel 03: LinkedIn Global (Tendencias & Palabras Clave)" />

      {/* Métricas del Nivel 3 */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
            Temas Globales en Escucha
          </span>
          <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
            {l3Monitors.length} Monitores Activos
          </p>
          <span className="text-xs text-brand-600 font-semibold dark:text-brand-400">
            Rastreo temático de publicaciones virales
          </span>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
            Contactos con Interés Temático
          </span>
          <p className="mt-2 text-2xl font-bold text-brand-600 dark:text-brand-400">
            {totalGlobalLeads} Prospectos
          </p>
          <span className="text-xs text-blue-600 font-semibold dark:text-blue-400">
            Extraídos de debates y publicaciones virales
          </span>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
            Estrategia de Acercamiento
          </span>
          <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
            Visita + Soft Connect
          </p>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            Rompehielos basado en lo que comentaron
          </span>
        </div>
      </div>

      {/* Explicación de la Estrategia (Mismo diseño de Nivel 1 y 2) */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-5 rounded-2xl border border-brand-200 bg-brand-25/40 dark:border-brand-900 dark:bg-brand-950/20">
        <div>
          <h4 className="text-sm font-bold text-brand-900 dark:text-brand-200">
            Mecánica de Escaneo Temático Global (Nivel 3)
          </h4>
          <p className="text-xs text-brand-700 dark:text-brand-300 mt-1 max-w-2xl">
            Monitorea publicaciones virales y debates con alta tracción en LinkedIn sobre un tema específico (ej. Prospección B2B, Inteligencia Artificial, Agencias). Extrae a las personas que interactuaron en un país concreto para conectar con ellas de forma orgánica.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsAddingRule(!isAddingRule)}
          className="rounded-lg bg-brand-500 px-4 py-2.5 text-xs font-semibold text-white hover:bg-brand-600 transition"
        >
          {isAddingRule ? "Cerrar Configurador" : "+ Nueva Regla Global"}
        </button>
      </div>

      {/* Formulario para Agregar Regla Global Simplificado */}
      {isAddingRule && (
        <ComponentCard
          title="Configurador de Monitor Temático Global"
          desc="Especifica la palabra clave o tema y selecciona el país objetivo para capturar a quienes comentan en publicaciones populares."
        >
          <form onSubmit={handleAddRule} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Campo 1: Términos o Tema de Búsqueda */}
              <div>
                <label className="block text-xs font-semibold uppercase text-gray-500 mb-1">
                  Tema o Palabra Clave del Debate
                </label>
                <input
                  type="text"
                  required
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Ej. Prospección B2B, Social Selling, Automatización, IA..."
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs text-gray-800 focus:border-brand-500 focus:outline-hidden dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                />
                <span className="text-[10px] text-gray-400 mt-1 block">
                  LinkedIn buscará publicaciones que hablen sobre este tema en el feed.
                </span>
              </div>

              {/* Campo 2: País / Mercado Objetivo con Desplegable Visual y Banderas */}
              <div className="relative" ref={countryDropdownRef}>
                <label className="block text-xs font-semibold uppercase text-gray-500 mb-1">
                  País o Mercado Objetivo
                </label>
                <button
                  type="button"
                  onClick={() => setIsCountryDropdownOpen(!isCountryDropdownOpen)}
                  className="w-full flex items-center justify-between rounded-lg border border-gray-300 px-3 py-2 text-xs text-gray-800 bg-white hover:border-gray-400 focus:border-brand-500 focus:outline-hidden dark:border-gray-700 dark:bg-gray-900 dark:text-white transition"
                >
                  <span className="flex items-center gap-2 font-medium">
                    <span className="text-base">{selectedCountry.flag}</span>
                    <span>{selectedCountry.name}</span>
                  </span>
                  <span className="text-gray-400 text-xs">▼</span>
                </button>

                {/* Dropdown de Países con Banderas */}
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
                  Filtra que los autores y comentaristas pertenezcan a este mercado.
                </span>
              </div>
            </div>

            {/* Fila 2: Frescura Temporal y Umbral de Reacciones */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-gray-500 mb-1">
                  Frescura del Post (Período)
                </label>
                <select
                  value={timePeriod}
                  onChange={(e) => setTimePeriod(e.target.value as any)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs text-gray-800 bg-white focus:border-brand-500 focus:outline-hidden dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                >
                  <option value="past_week">Última semana (Recomendado - Mayor actualidad)</option>
                  <option value="past_month">Último mes (Mayor volumen de publicaciones)</option>
                  <option value="past_24h">Últimas 24 horas (Tiempo real / Viral reciente)</option>
                </select>
                <span className="text-[10px] text-gray-400 mt-1 block">
                  Captura prospectos con el problema fresco en mente.
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-gray-500 mb-1">
                  Tracción Mínima (Reacciones en el Post)
                </label>
                <input
                  type="number"
                  min="5"
                  max="1000"
                  value={minReactions}
                  onChange={(e) => setMinReactions(Number(e.target.value))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs text-gray-800 focus:border-brand-500 focus:outline-hidden dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                />
                <span className="text-[10px] text-gray-400 mt-1 block">
                  Descarta publicaciones frías sin debate activo.
                </span>
              </div>
            </div>

            {/* Fila 3: Filtros de Interacción & Calidad (Estilo Nivel 2) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              <div>
                <label className="block text-xs font-semibold uppercase text-gray-500 mb-2">
                  Tipo de Participantes a Extraer
                </label>
                <div className="flex items-center gap-6">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-gray-700 dark:text-gray-300">
                    <input
                      type="checkbox"
                      checked={trackComments}
                      onChange={(e) => setTrackComments(e.target.checked)}
                      className="rounded border-gray-300 text-brand-500 cursor-pointer"
                    />
                    <span>Comentaristas (Máxima intención de debate)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-gray-700 dark:text-gray-300">
                    <input
                      type="checkbox"
                      checked={trackLikes}
                      onChange={(e) => setTrackLikes(e.target.checked)}
                      className="rounded border-gray-300 text-brand-500 cursor-pointer"
                    />
                    <span>Reacciones / Likes</span>
                  </label>
                </div>
              </div>

              <div className="rounded-xl border border-gray-200 bg-gray-50/70 p-3 dark:border-gray-800 dark:bg-gray-800/40">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={excludeInternalEngagement}
                    onChange={(e) => setExcludeInternalEngagement(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500 dark:border-gray-700 cursor-pointer"
                  />
                  <div className="min-w-0">
                    <span className="block text-xs font-bold text-gray-800 dark:text-gray-200">
                      Excluir autor y sus colaboradores
                    </span>
                    <span className="block text-[11px] text-gray-500 dark:text-gray-400 leading-tight mt-0.5">
                      Filtro anti-empleados: Descarta al creador del post y empleados de su misma empresa.
                    </span>
                  </div>
                </label>
              </div>
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
                className="rounded-lg bg-brand-500 px-5 py-2 text-xs font-semibold text-white hover:bg-brand-600 transition"
              >
                Guardar Regla Global
              </button>
            </div>
          </form>
        </ComponentCard>
      )}

      {/* Barra de Cuenta Conectada & Estado de Escucha */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl bg-white border border-gray-200 dark:bg-gray-900 dark:border-gray-800 text-xs" suppressHydrationWarning>
        <div className="flex items-center gap-2">
          <span className="font-semibold text-gray-600 dark:text-gray-400">
            Cuenta de LinkedIn activa para escaneo global:
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
                href={`/leads/lists/${scanFeedback.listId}`}
                className="inline-flex items-center gap-1 font-bold underline hover:opacity-80 ml-2"
              >
                Ver Lista en Directorio de Leads →
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

      {/* Tabla de Reglas Globales Activas (Estilo Nivel 1 y 2) */}
      <ComponentCard title={`Monitores Globales Activos (${l3Monitors.length})`}>
        {!isLoaded ? (
          <p className="text-xs text-gray-400 py-4">Cargando reglas...</p>
        ) : l3Monitors.length === 0 ? (
          <div className="py-12 text-center space-y-3">
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              No tienes reglas globales activas en Signal Radar Nivel 3.
            </p>
            <p className="text-xs text-gray-400 max-w-md mx-auto">
              Configura un tema de debate y un país objetivo para rastrear publicaciones virales en LinkedIn y capturar prospectos calificados interesados en esa problemática.
            </p>
            <button
              type="button"
              onClick={() => setIsAddingRule(true)}
              className="rounded-lg bg-brand-500 px-4 py-2 text-xs font-semibold text-white hover:bg-brand-600 transition"
            >
              + Nueva Regla Global
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-gray-100 text-[11px] font-bold uppercase tracking-wider text-gray-600 dark:border-gray-800 dark:text-gray-300">
                <tr>
                  <th className="px-4 py-3 min-w-[240px]">Tema / Palabra Clave</th>
                  <th className="px-4 py-3 whitespace-nowrap">País Objetivo</th>
                  <th className="px-4 py-3 whitespace-nowrap">Participantes</th>
                  <th className="px-4 py-3 whitespace-nowrap">Leads Extraídos</th>
                  <th className="px-4 py-3 whitespace-nowrap">Último Escaneo</th>
                  <th className="px-4 py-3 whitespace-nowrap">Estado</th>
                  <th className="px-4 py-3 text-right whitespace-nowrap">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-xs dark:divide-gray-800">
                {l3Monitors.map((rule) => {
                  const targetList = getListForRule(rule);
                  const leadsCount = getRuleLeads(rule.id).length;
                  const countryFlag = rule.targetCountryFlag || "🌎";
                  const countryName = rule.targetCountryName || (rule.locations.length > 0 ? rule.locations.join(", ") : "Global");
                  const hasComments = !rule.interactionTypes || rule.interactionTypes.includes("comments");
                  const hasLikes = rule.interactionTypes?.includes("likes");

                  return (
                    <tr key={rule.id} className="hover:bg-gray-50/50 dark:hover:bg-white/2 transition">
                      <td className="px-4 py-3.5">
                        <p className="font-semibold text-gray-900 dark:text-white">
                          {rule.searchQuery}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] text-gray-400">
                            Min {rule.minPostReactions} reacciones
                          </span>
                          {rule.lastScannedPosts && rule.lastScannedPosts.length > 0 && (
                            <button
                              type="button"
                              onClick={() => setSelectedRuleForLeads(rule)}
                              className="inline-flex items-center gap-1 text-[10px] font-semibold text-brand-600 hover:underline dark:text-brand-400"
                              title="Ver los links de las publicaciones seleccionadas en LinkedIn"
                            >
                              <span>• {rule.lastScannedPosts.length} posts analizados</span>
                              <span>↗</span>
                            </button>
                          )}
                        </div>
                      </td>

                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-gray-50/80 px-2.5 py-1 text-xs font-medium text-gray-800 dark:border-gray-800 dark:bg-gray-800/50 dark:text-gray-200">
                          <span className="text-sm">{countryFlag}</span>
                          <span>{countryName}</span>
                        </span>
                      </td>

                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          {hasComments && (
                            <span className="rounded bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                              Comentarios
                            </span>
                          )}
                          {hasLikes && (
                            <span className="rounded bg-purple-50 px-2 py-0.5 text-[10px] font-semibold text-purple-700 dark:bg-purple-950 dark:text-purple-300">
                              Likes
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="px-4 py-3.5 whitespace-nowrap font-bold text-brand-600 dark:text-brand-400">
                        {leadsCount > 0 ? (
                          <Link
                            href={targetList ? `/leads/lists/${targetList.id}` : "/leads"}
                            className="hover:underline flex items-center gap-1"
                          >
                            <span>{leadsCount} leads</span>
                            <span className="text-[10px] font-normal text-gray-400">↗</span>
                          </Link>
                        ) : (
                          <span>0 leads</span>
                        )}
                      </td>

                      <td className="px-4 py-3.5 whitespace-nowrap text-gray-500 dark:text-gray-400">
                        {rule.lastScanAt}
                      </td>

                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => toggleLevel3Status(rule.id)}
                          className={`rounded-full px-2.5 py-0.5 font-semibold text-[11px] transition ${
                            rule.status === "active"
                              ? "bg-green-50 text-green-700 hover:bg-green-100 dark:bg-green-950/40 dark:text-green-400"
                              : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300"
                          }`}
                        >
                          {rule.status === "active" ? "Activo" : "Pausado"}
                        </button>
                      </td>

                      <td className="px-4 py-3.5 text-right whitespace-nowrap">
                        <div className="inline-flex items-center justify-end gap-1.5">
                          {/* Botón Escanear Tendencias */}
                          <button
                            type="button"
                            disabled={isScanningId === rule.id}
                            onClick={() => handleScanGlobalRule(rule)}
                            className="rounded-md bg-brand-500 px-2.5 py-1 text-white hover:bg-brand-600 font-medium text-xs transition disabled:opacity-50 inline-flex items-center gap-1"
                            title="Buscar publicaciones virales en LinkedIn y extraer personas interesadas"
                          >
                            {isScanningId === rule.id ? (
                              <>
                                <span className="h-3 w-3 rounded-full border-2 border-white/40 border-t-white animate-spin"></span>
                                Escaneando...
                              </>
                            ) : (
                              "Escanear Tendencias"
                            )}
                          </button>

                          {/* Botón Ver Leads */}
                          <button
                            type="button"
                            onClick={() => setSelectedRuleForLeads(rule)}
                            className="rounded-md border border-brand-500 px-2.5 py-1 text-brand-600 hover:bg-brand-50 dark:text-brand-400 dark:hover:bg-brand-950/20 font-medium text-xs inline-flex items-center"
                          >
                            Ver Leads ({leadsCount})
                          </button>

                          {/* Botón Editar Regla */}
                          <button
                            type="button"
                            onClick={() => setEditingRule(rule)}
                            className="h-[26px] w-[26px] rounded-md border border-gray-200 text-gray-600 hover:border-brand-500 hover:text-brand-600 hover:bg-brand-50 dark:border-gray-700 dark:text-gray-300 dark:hover:border-brand-500 dark:hover:text-brand-400 dark:hover:bg-brand-950/20 inline-flex items-center justify-center transition shrink-0"
                            title="Editar regla global"
                          >
                            <Pencil className="size-3.5" />
                          </button>

                          {/* Botón Eliminar */}
                          <button
                            type="button"
                            onClick={() => {
                              if (confirm(`¿Eliminar regla de "${rule.searchQuery}"?`)) {
                                deleteLevel3Monitor(rule.id);
                              }
                            }}
                            className="h-[26px] w-[26px] rounded-md border border-red-200 text-red-600 hover:bg-red-50 dark:border-red-900/40 dark:text-red-400 inline-flex items-center justify-center transition shrink-0"
                            title="Eliminar regla"
                          >
                            <X className="size-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </ComponentCard>

      {/* Modal para Visualizar Leads Extraídos Globalmente (Diseño unificado Nivel 1 y 2) */}
      {selectedRuleForLeads && (
        <div className="fixed inset-0 z-99999 flex items-center justify-center bg-black/60 p-4">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-6 shadow-theme-xl dark:bg-gray-900 border border-gray-200 dark:border-gray-800">
            <div className="flex items-start justify-between border-b border-gray-100 pb-4 dark:border-gray-800">
              <div>
                <span className="rounded bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700 dark:bg-blue-950 dark:text-blue-300 flex items-center gap-1 w-fit">
                  <span>{selectedRuleForLeads.targetCountryFlag || "🌎"}</span>
                  <span>LinkedIn Global: {selectedRuleForLeads.searchQuery}</span>
                </span>
                <h3 className="mt-2 text-base font-bold text-gray-900 dark:text-white">
                  Contactos Interesados Extraídos del Debate
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Personas que participaron activamente en publicaciones virales sobre este tema.
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
              <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50/60 p-3.5 dark:border-blue-900/40 dark:bg-blue-950/20">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-blue-900 dark:text-blue-200 flex items-center gap-1.5">
                    <span>🔗</span>
                    <span>Publicaciones de LinkedIn Analizadas ({selectedRuleForLeads.lastScannedPosts.length})</span>
                  </span>
                  <span className="text-[10px] text-blue-600 dark:text-blue-400">
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
                          {post.authorName ? <span className="font-bold text-gray-900 dark:text-white mr-1.5">{post.authorName}:</span> : null}
                          &quot;{post.text}&quot;
                        </p>
                        <span className="text-[10px] text-gray-400">
                          {post.reactionsCount} reacciones • {post.commentsCount} comentarios
                        </span>
                      </div>
                      <a
                        href={post.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="shrink-0 inline-flex items-center gap-1 rounded bg-blue-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-blue-700 transition"
                      >
                        <span>Ver Post</span>
                        <span>↗</span>
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="my-4 divide-y divide-gray-100 dark:divide-gray-800">
              {getRuleLeads(selectedRuleForLeads.id).length === 0 ? (
                <div className="py-8 text-center space-y-3">
                  <p className="text-xs text-gray-500">
                    Aún no hay prospectos extraídos para este tema. Haz clic en &quot;Escanear Tendencias&quot; para iniciar la indexación en vivo en LinkedIn.
                  </p>
                  <div className="flex items-center justify-center gap-3 pt-2">
                    <button
                      type="button"
                      disabled={isScanningId === selectedRuleForLeads.id}
                      onClick={() => handleScanGlobalRule(selectedRuleForLeads)}
                      className="rounded-lg bg-brand-500 px-4 py-1.5 text-xs font-semibold text-white hover:bg-brand-600 transition"
                    >
                      {isScanningId === selectedRuleForLeads.id ? "Escaneando en LinkedIn..." : "Escanear Tendencias Ahora"}
                    </button>
                  </div>
                </div>
              ) : (
                getRuleLeads(selectedRuleForLeads.id).map((lead) => {
                  const targetList = getListForRule(selectedRuleForLeads);
                  return (
                    <div key={lead.id} className="py-3.5 flex items-center justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <ProspectAvatar
                          imageUrl={lead.avatarUrl}
                          name={lead.fullName}
                          size="md"
                        />
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <h4 className="text-xs font-bold text-gray-900 dark:text-white">
                              {lead.fullName}
                            </h4>
                            <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-semibold text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                              Grado {lead.connectionDegree}
                            </span>
                            <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-bold text-blue-700 dark:bg-blue-950 dark:text-blue-400">
                              Debate Activo
                            </span>
                            {lead.language && (
                              <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[9px] font-bold uppercase text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                                {lead.language}
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-gray-500 dark:text-gray-400">
                            {lead.headline} {lead.location && `• ${lead.location}`}
                          </p>
                          <p className="text-xs text-blue-800 italic dark:text-blue-300 font-medium">
                            {lead.signalSnippet}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {lead.sourcePostUrl && (
                          <a
                            href={lead.sourcePostUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="rounded-lg border border-blue-200 bg-blue-50/50 px-2.5 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100 dark:border-blue-900/40 dark:bg-blue-950/30 dark:text-blue-300 inline-flex items-center gap-1"
                            title="Ver el post de LinkedIn donde comentó o reaccionó"
                          >
                            <span>Post Debate</span>
                            <span className="text-[10px]">↗</span>
                          </a>
                        )}
                        {lead.linkedinUrl && (
                          <a
                            href={lead.linkedinUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="rounded-lg border border-gray-300 px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300"
                          >
                            LinkedIn ↗
                          </a>
                        )}
                        <Link
                          href={targetList ? `/leads/lists/${targetList.id}` : "/leads"}
                          className="rounded-lg bg-brand-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-600 transition"
                        >
                          Ficha 360 CRM →
                        </Link>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-800">
              <button
                type="button"
                disabled={isScanningId === selectedRuleForLeads.id}
                onClick={() => handleScanGlobalRule(selectedRuleForLeads)}
                className="text-xs font-semibold text-brand-600 hover:underline dark:text-brand-400"
              >
                + Re-escanear y Buscar Más Prospectos
              </button>
              <button
                type="button"
                onClick={() => setSelectedRuleForLeads(null)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Edición de Regla Global Nivel 3 */}
      {editingRule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-xl rounded-xl border border-gray-200 bg-white p-6 shadow-xl dark:border-gray-800 dark:bg-gray-900">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3 dark:border-gray-800">
              <div className="flex items-center gap-2">
                <Pencil className="size-5 text-brand-500" />
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  Editar Regla de Búsqueda Global
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingRule(null)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="mt-4 space-y-4 max-h-[75vh] overflow-y-auto pr-1">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                  Temática o Palabra Clave en LinkedIn
                </label>
                <input
                  type="text"
                  value={editingRule.searchQuery}
                  onChange={(e) =>
                    setEditingRule({ ...editingRule, searchQuery: e.target.value })
                  }
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  placeholder="Ej: Prospección B2B, Agentes IA, Cold Email"
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                    Frescura del Post (Período)
                  </label>
                  <select
                    value={editingRule.timePeriod || "past_week"}
                    onChange={(e) =>
                      setEditingRule({
                        ...editingRule,
                        timePeriod: e.target.value as any,
                      })
                    }
                    className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  >
                    <option value="past_week">Última semana (Recomendado)</option>
                    <option value="past_month">Último mes</option>
                    <option value="past_24h">Últimas 24 horas</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                    Tracción Mínima (Reacciones)
                  </label>
                  <input
                    type="number"
                    min="5"
                    max="1000"
                    value={editingRule.minPostReactions || 10}
                    onChange={(e) =>
                      setEditingRule({
                        ...editingRule,
                        minPostReactions: Number(e.target.value),
                      })
                    }
                    className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2 rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-800 dark:bg-gray-800/50">
                <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                  Tipo de Participantes a Extraer
                </span>
                <div className="flex items-center gap-4 text-xs text-gray-700 dark:text-gray-300">
                  <label className="inline-flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={(editingRule.interactionTypes || ["comments", "likes"]).includes("comments")}
                      onChange={(e) => {
                        const current = editingRule.interactionTypes || ["comments", "likes"];
                        const next = e.target.checked
                          ? Array.from(new Set([...current, "comments" as const]))
                          : current.filter((t) => t !== "comments");
                        setEditingRule({ ...editingRule, interactionTypes: next });
                      }}
                      className="rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                    />
                    Comentaristas (Máxima intención de debate)
                  </label>
                  <label className="inline-flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={(editingRule.interactionTypes || ["comments", "likes"]).includes("likes")}
                      onChange={(e) => {
                        const current = editingRule.interactionTypes || ["comments", "likes"];
                        const next = e.target.checked
                          ? Array.from(new Set([...current, "likes" as const]))
                          : current.filter((t) => t !== "likes");
                        setEditingRule({ ...editingRule, interactionTypes: next });
                      }}
                      className="rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                    />
                    Reacciones / Likes
                  </label>
                </div>
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
                    targetCountry: editingRule.targetCountry,
                    targetCountryName: sel ? sel.name : editingRule.targetCountryName,
                    targetCountryFlag: sel ? sel.flag : editingRule.targetCountryFlag,
                    timePeriod: editingRule.timePeriod || "past_week",
                    minPostReactions: Number(editingRule.minPostReactions) || 10,
                    interactionTypes: editingRule.interactionTypes || ["comments", "likes"],
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
