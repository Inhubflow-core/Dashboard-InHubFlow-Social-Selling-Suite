"use client";

import ComponentCard from "@/components/common/ComponentCard";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { extractIdentifier } from "@/lib/signals/employee-filter";
import { useSignalRadar } from "@/lib/signals/store";
import type { Level2CompetitorMonitor, SignalLeadItem } from "@/lib/signals/types";
import { getStoredAccounts } from "@/lib/unipile/store";
import type { UnipileAccount } from "@/lib/unipile/types";
import { useLeadsStore } from "@/lib/leads/store";
import type { LeadListGroup } from "@/lib/leads/types";
import { detectLeadLanguage, LANGUAGE_LABELS } from "@/lib/signals/language-detector";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

export default function CompetitorsSignalRadarPage() {
  const {
    l2Monitors,
    leads,
    isLoaded,
    addLevel2Monitor,
    updateLevel2Monitor,
    deleteLevel2Monitor,
    toggleLevel2Status,
    recordDiscoveredLeads,
    sanitizeLeadsForMonitor,
  } = useSignalRadar();

  // Cuentas de LinkedIn
  const [availableAccounts, setAvailableAccounts] = useState<UnipileAccount[]>([]);
  const [activeAccount, setActiveAccount] = useState<UnipileAccount | null>(null);

  useEffect(() => {
    fetch("/api/unipile/accounts")
      .then((r) => r.json())
      .then((data) => {
        const liveItems = data.accounts?.length ? data.accounts : (data.items || []);
        if (liveItems.length > 0) {
          setAvailableAccounts(liveItems);
          const healthy = liveItems.find((a: any) => a.status === "OK" || a.status === "CONNECTED") || liveItems[0];
          setActiveAccount(healthy);
        } else {
          const fallback = getStoredAccounts();
          setAvailableAccounts(fallback);
          if (fallback.length > 0) setActiveAccount(fallback[0]);
        }
      })
      .catch(() => {
        const fallback = getStoredAccounts();
        setAvailableAccounts(fallback);
        if (fallback.length > 0) setActiveAccount(fallback[0]);
      });
  }, []);

  // Auto-sanitización retroactiva de leads existentes contra engagement interno
  const [hasSanitizedExisting, setHasSanitizedExisting] = useState(false);
  useEffect(() => {
    if (!isLoaded || hasSanitizedExisting || l2Monitors.length === 0) return;

    let totalPurged = 0;
    for (const comp of l2Monitors) {
      if (comp.excludeAuthorEmployees !== false) {
        const iden = extractIdentifier(comp.competitorUrl);
        const targets = [comp.competitorName, iden].filter(Boolean);
        const purged = sanitizeLeadsForMonitor(comp.id, targets);
        if (purged > 0) {
          totalPurged += purged;
          updateLevel2Monitor(comp.id, {
            leadsIdentifiedCount: Math.max(0, comp.leadsIdentifiedCount - purged),
          });
        }
      }
    }

    if (totalPurged > 0) {
      setScanFeedback({
        type: "success",
        text: `Filtro inteligente aplicado: se depuraron ${totalPurged} perfiles de colaboradores/empleados internos en tus leads guardados.`,
      });
    }

    setHasSanitizedExisting(true);
  }, [isLoaded, l2Monitors, hasSanitizedExisting, sanitizeLeadsForMonitor, updateLevel2Monitor]);

  const router = useRouter();
  const { lists: allLeadLists, importSignalLeads, getOrCreateList } = useLeadsStore();

  const [isAddingCompetitor, setIsAddingCompetitor] = useState(false);
  const [isScanningId, setIsScanningId] = useState<string | null>(null);
  const [scanFeedback, setScanFeedback] = useState<{ type: "success" | "error"; text: string; listId?: string } | null>(null);

  // Auto-sincronización continua de leads de monitores hacia sus listas inteligentes
  useEffect(() => {
    if (!isLoaded || l2Monitors.length === 0) return;
    for (const comp of l2Monitors) {
      const compLeads = leads.filter((l) => l.monitorId === comp.id);
      if (compLeads.length > 0) {
        const targetList = getOrCreateList({
          monitorId: comp.id,
          competitorName: comp.competitorName,
          keywords: comp.keywordsFilter,
        });
        importSignalLeads(targetList, compLeads);
      }
    }
  }, [isLoaded, l2Monitors.length]);

  // Form states
  const [competitorName, setCompetitorName] = useState("");
  const [competitorUrl, setCompetitorUrl] = useState("");
  const [keywordsFilterInput, setKeywordsFilterInput] = useState(
    "Agentes IA, Prospeccion B2B, Outreach"
  );
  const [trackComments, setTrackComments] = useState(true);
  const [trackLikes, setTrackLikes] = useState(true);
  const [excludeAuthorEmployees, setExcludeAuthorEmployees] = useState(true);
  const [outreachTemplate, setOutreachTemplate] = useState(
    "Hola {{first_name}}, vi tu interaccion en el post de {{competitor}} sobre {{tema}}. Me parecio muy interesante... ¿como lo estan resolviendo en {{company}}?"
  );

  // LinkedIn real-time search states
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchCategoryFilter, setSearchCategoryFilter] = useState<"all" | "companies" | "people">("all");
  const [isSearching, setIsSearching] = useState(false);
  const [isSearchDropdownOpen, setIsSearchDropdownOpen] = useState(false);
  const [selectedCompetitorItem, setSelectedCompetitorItem] = useState<any | null>(null);

  const filteredSearchResults = useMemo(() => {
    if (searchCategoryFilter === "companies") {
      return searchResults.filter((item) => item.type === "company");
    }
    if (searchCategoryFilter === "people") {
      return searchResults.filter((item) => item.type === "person");
    }
    return searchResults;
  }, [searchResults, searchCategoryFilter]);

  useEffect(() => {
    const term = competitorName.trim();
    if (!term || term.length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    if (
      selectedCompetitorItem &&
      selectedCompetitorItem.name.toLowerCase() === term.toLowerCase()
    ) {
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const rawAccId = (activeAccount as any)?.unipileAccountId || activeAccount?.id || "";
        const res = await fetch(
          `/api/unipile/competitors/search?query=${encodeURIComponent(term)}&accountId=${encodeURIComponent(rawAccId)}`
        );
        const data = await res.json();
        setSearchResults(data.items || []);
        setIsSearchDropdownOpen(true);
        if (data.reason === "unipile_not_configured") {
          setScanFeedback({ type: "error", text: "La búsqueda real requiere Unipile configurado. No se mostrarán resultados simulados." });
        } else if (data.reason === "linkedin_account_not_connected") {
          setScanFeedback({ type: "error", text: "Conecta una cuenta activa de LinkedIn para buscar resultados reales." });
        } else {
          setScanFeedback(null);
        }
      } catch (err) {
        console.warn("[Competitors] Error en búsqueda de competidores en LinkedIn:", err);
      } finally {
        setIsSearching(false);
      }
    }, 280);

    return () => clearTimeout(timer);
  }, [competitorName, activeAccount?.id, selectedCompetitorItem]);

  const handleSelectCompetitor = (item: any) => {
    setCompetitorName(item.name);
    setCompetitorUrl(item.linkedinUrl);
    setSelectedCompetitorItem(item);
    setIsSearchDropdownOpen(false);
  };

  const totalCompetitorLeads = l2Monitors.reduce((acc, m) => acc + m.leadsIdentifiedCount, 0);

  const handleAddCompetitor = (e: React.FormEvent) => {
    e.preventDefault();
    if (!competitorName.trim()) return;

    const keywords = keywordsFilterInput
      .split(",")
      .map((k) => k.trim())
      .filter(Boolean);

    const interactions: ("likes" | "comments")[] = [];
    if (trackLikes) interactions.push("likes");
    if (trackComments) interactions.push("comments");

    const isPerson = selectedCompetitorItem?.type === "person" || competitorUrl.includes("/in/");
    if (!selectedCompetitorItem || !competitorUrl) {
      setScanFeedback({ type: "error", text: "Selecciona un resultado real de LinkedIn antes de agregarlo." });
      return;
    }

    const newMonitor: Level2CompetitorMonitor = {
      id: `mon-l2-${Date.now()}`,
      competitorName,
      competitorUrl,
      logoUrl: selectedCompetitorItem?.logoUrl,
      competitorType: isPerson ? "person" : "company",
      keywordsFilter: keywords.length > 0 ? keywords : ["Prospeccion B2B"],
      status: "active",
      interactionTypes: interactions.length > 0 ? interactions : ["comments"],
      excludeAuthorEmployees,
      outreachTemplate,
      leadsIdentifiedCount: 0,
      lastScanAt: "Recien configurado",
      createdAt: new Date().toISOString(),
    };

    addLevel2Monitor(newMonitor);
    const targetList = getOrCreateList({
      monitorId: newMonitor.id,
      competitorName: newMonitor.competitorName,
      keywords: newMonitor.keywordsFilter,
    });

    setIsAddingCompetitor(false);
    setSelectedCompetitorItem(null);
    setSearchResults([]);
    setIsSearchDropdownOpen(false);
    setCompetitorName("");
    setCompetitorUrl("");
    setScanFeedback({
      type: "success",
      text: `Competidor "${newMonitor.competitorName}" agregado y su lista inteligente "${targetList.name}" creada automáticamente.`,
      listId: targetList.id,
    });
  };


  const handleScanCompetitor = async (comp: Level2CompetitorMonitor) => {
    setIsScanningId(comp.id);
    setScanFeedback(null);
    try {
      const rawAccId = (activeAccount as any)?.unipileAccountId || activeAccount?.id || "";
      const response = await fetch("/api/unipile/competitors/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountId: rawAccId,
          competitorName: comp.competitorName,
          competitorUrl: comp.competitorUrl,
          interactionTypes: comp.interactionTypes,
          keywordsFilter: comp.keywordsFilter,
          excludeAuthorEmployees: comp.excludeAuthorEmployees !== false,
          limit: 10,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.reason || data.error || "No se pudo consultar LinkedIn");

      const newLeadsToAdd: SignalLeadItem[] = (data.items || []).map((lead: any, idx: number) => ({
        id: `sig-lead-c-${Date.now()}-${idx}`,
        monitorId: comp.id,
        fullName: lead.fullName,
        headline: lead.headline || "Profesional en LinkedIn",
        company: lead.company || "",
        location: lead.location || "",
        linkedinUrl: lead.linkedinUrl || "",
        avatarUrl: lead.avatarUrl,
        connectionDegree: "2nd",
        intentLevel: lead.signalType === "comment" ? "medium_high" : "medium",
        signalSnippet: lead.signalSnippet,
        detectedAt: new Date().toISOString(),
        status: "new",
        language: lead.language || detectLeadLanguage({
          headline: lead.headline,
          location: lead.location,
          signalSnippet: lead.signalSnippet,
        }),
      }));

      const added = recordDiscoveredLeads(newLeadsToAdd);
      const targetList = getOrCreateList({
        monitorId: comp.id,
        competitorName: comp.competitorName,
        keywords: comp.keywordsFilter,
      });
      const importRes = importSignalLeads(targetList, newLeadsToAdd);

      updateLevel2Monitor(comp.id, {
        leadsIdentifiedCount: comp.leadsIdentifiedCount + added.length,
        lastScanAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      });
      setScanFeedback({
        type: "success",
        text: `Auditoría completada para ${comp.competitorName}: ${added.length} interacciones encontradas e incorporadas automáticamente a la lista "${targetList.name}" (${importRes.addedCount} nuevos leads añadidos)${
          data.excludedEmployeesCount ? ` [${data.excludedEmployeesCount} colaboradores internos excluidos]` : ""
        }.`,
        listId: targetList.id,
      });
    } catch (err: any) {
      setScanFeedback({ type: "error", text: `Error al auditar competidor: ${err.message || "Error al conectar"}` });
    } finally {
      setIsScanningId(null);
    }
  };

  const getCompetitorLeads = (monitorId: string): SignalLeadItem[] => {
    return leads.filter((l) => l.monitorId === monitorId);
  };

  const currentDisplayName = activeAccount?.name || "Cuenta Principal de LinkedIn";

  return (
    <div className="space-y-6">
      <PageBreadcrumb pageTitle="Signal Radar - Nivel 02: Posts de la Competencia (Auditoria Rival)" />

      {/* Métricas del Nivel 2 */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
            Cuentas Rivales Monitoreadas
          </span>
          <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
            {l2Monitors.length} Empresas / Perfiles
          </p>
          <span className="text-xs text-brand-600 font-semibold dark:text-brand-400">
            Escaneo de Likes y Comentarios
          </span>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
            Prospectos Calificados Extraidos
          </span>
          <p className="mt-2 text-2xl font-bold text-brand-600 dark:text-brand-400">
            {totalCompetitorLeads} Decisores
          </p>
          <span className="text-xs text-green-600 font-semibold dark:text-green-400">
            Intención Media-Alta (Interesados en Soluciones Rivales)
          </span>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
            Tasa de Aceptacion Relacional
          </span>
          <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
            48.2%
          </p>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            Respuestas al referenciar contexto de la temática
          </span>
        </div>
      </div>

      {/* Explicación de la Estrategia */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-5 rounded-2xl border border-purple-200 bg-purple-25/40 dark:border-purple-900 dark:bg-purple-950/20">
        <div>
          <h4 className="text-sm font-bold text-purple-900 dark:text-purple-200">
            Mecanica de Prospeccion a Competidores (Nivel 2)
          </h4>
          <p className="text-xs text-purple-700 dark:text-purple-300 mt-1 max-w-2xl">
            Cuando un prospecto interactua con un competidor directo (ej. Adapta IA), expresa necesidad activa. El monitor extrae su perfil y dispara una secuencia relacional suave reconociendo el tema sin hacer un pitch agresivo.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsAddingCompetitor(!isAddingCompetitor)}
          className="rounded-lg bg-brand-500 px-4 py-2.5 text-xs font-semibold text-white hover:bg-brand-600 transition"
        >
          {isAddingCompetitor ? "Cerrar Formulario" : "+ Agregar Competidor"}
        </button>
      </div>

      {/* Formulario para Agregar Competidor */}
      {isAddingCompetitor && (
        <ComponentCard
          title="Configurador de Auditoria de Competidor"
          desc="Define la cuenta objetivo y los criterios para extraer a quienes comentan o reaccionan a sus posts."
        >
          <form onSubmit={handleAddCompetitor} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Buscador inteligente en tiempo real de LinkedIn */}
              <div className="relative">
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold uppercase text-gray-500">
                    Nombre de la Cuenta o Competidor
                  </label>
                  {isSearching && (
                    <span className="flex items-center gap-1 text-[10px] text-brand-600 dark:text-brand-400 font-medium">
                      <span className="h-2.5 w-2.5 rounded-full border-2 border-brand-500 border-t-transparent animate-spin"></span>
                      Buscando en LinkedIn...
                    </span>
                  )}
                </div>

                <div className="relative">
                  <input
                    type="text"
                    required
                    value={competitorName}
                    onFocus={() => {
                      if (searchResults.length > 0) setIsSearchDropdownOpen(true);
                    }}
                    onChange={(e) => {
                      setCompetitorName(e.target.value);
                      if (
                        selectedCompetitorItem &&
                        e.target.value !== selectedCompetitorItem.name
                      ) {
                        setSelectedCompetitorItem(null);
                      }
                    }}
                    placeholder="Ej. Prospect Me, Adapta IA, Lemlist..."
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs text-gray-800 focus:border-brand-500 focus:outline-hidden dark:border-gray-700 dark:bg-gray-900 dark:text-white pr-7"
                  />
                  {competitorName && (
                    <button
                      type="button"
                      onClick={() => {
                        setCompetitorName("");
                        setCompetitorUrl("");
                        setSelectedCompetitorItem(null);
                        setSearchResults([]);
                        setIsSearchDropdownOpen(false);
                      }}
                      className="absolute right-2.5 top-2 text-xs font-bold text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                      title="Limpiar búsqueda"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Dropdown de cuentas de LinkedIn encontradas */}
                {isSearchDropdownOpen && (searchResults.length > 0 || !isSearching) && (
                  <div
                    className="absolute z-50 left-0 right-0 mt-1 max-h-[30rem] overflow-hidden rounded-xl border border-gray-200 bg-white shadow-2xl dark:border-gray-800 dark:bg-gray-900 text-xs flex flex-col"
                    onMouseDown={(e) => e.preventDefault()}
                  >
                    {/* Header con tabs de categoría y botón cerrar */}
                    <div className="p-2.5 border-b border-gray-100 dark:border-gray-800 bg-gray-50/80 dark:bg-gray-800/40 shrink-0">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                          Sugerencias de LinkedIn ({searchResults.length} resultados)
                        </span>
                        <button
                          type="button"
                          onClick={() => setIsSearchDropdownOpen(false)}
                          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xs font-bold px-1"
                          title="Cerrar lista"
                        >
                          ✕
                        </button>
                      </div>

                      {/* Tabs de Filtro Rápido */}
                      <div className="flex items-center gap-1.5 bg-gray-200/70 dark:bg-gray-800 p-1 rounded-lg">
                        <button
                          type="button"
                          onClick={() => setSearchCategoryFilter("all")}
                          className={`flex-1 py-1 px-2 rounded-md text-[11px] font-semibold transition ${
                            searchCategoryFilter === "all"
                              ? "bg-white text-gray-900 shadow-xs dark:bg-gray-700 dark:text-white"
                              : "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                          }`}
                        >
                          Todos ({searchResults.length})
                        </button>
                        <button
                          type="button"
                          onClick={() => setSearchCategoryFilter("companies")}
                          className={`flex-1 py-1 px-2 rounded-md text-[11px] font-semibold transition flex items-center justify-center gap-1 ${
                            searchCategoryFilter === "companies"
                              ? "bg-white text-blue-700 shadow-xs dark:bg-gray-700 dark:text-blue-300"
                              : "text-gray-600 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-300"
                          }`}
                        >
                          Empresas ({searchResults.filter((i) => i.type === "company").length})
                        </button>
                        <button
                          type="button"
                          onClick={() => setSearchCategoryFilter("people")}
                          className={`flex-1 py-1 px-2 rounded-md text-[11px] font-semibold transition flex items-center justify-center gap-1 ${
                            searchCategoryFilter === "people"
                              ? "bg-white text-purple-700 shadow-xs dark:bg-gray-700 dark:text-purple-300"
                              : "text-gray-600 hover:text-purple-600 dark:text-gray-400 dark:hover:text-purple-300"
                          }`}
                        >
                          Personas ({searchResults.filter((i) => i.type === "person").length})
                        </button>
                      </div>
                    </div>

                    {/* Lista con scroll vertical explícito */}
                    <div className="overflow-y-auto max-h-72 p-2 space-y-1 divide-y divide-gray-50 dark:divide-gray-800/60">
                      {filteredSearchResults.length === 0 ? (
                        <div className="py-6 text-center text-gray-500 dark:text-gray-400 text-xs">
                          {searchResults.length === 0
                            ? "LinkedIn no devolvió resultados para esta búsqueda. Prueba otro nombre o verifica que la cuenta esté conectada."
                            : "No se encontraron coincidencias en esta categoría."}
                        </div>
                      ) : (
                        filteredSearchResults.map((item) => {
                          const isCompany = item.type === "company";
                          return (
                            <div
                              key={item.id}
                              onClick={() => handleSelectCompetitor(item)}
                              className="cursor-pointer rounded-lg p-2.5 hover:bg-brand-50/50 dark:hover:bg-brand-950/20 transition flex items-center justify-between gap-3 border border-transparent hover:border-brand-200 dark:hover:border-brand-800/40"
                            >
                              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                {item.logoUrl ? (
                                  <img
                                    src={item.logoUrl}
                                    alt={item.name}
                                    className={`h-9 w-9 object-contain bg-white border border-gray-100 p-0.5 shadow-xs dark:border-gray-800 shrink-0 ${
                                      isCompany ? "rounded-lg" : "rounded-full object-cover"
                                    }`}
                                    onError={(e) => {
                                      (e.target as HTMLElement).style.display = "none";
                                      const fallback = (e.target as HTMLElement).nextElementSibling;
                                      if (fallback) (fallback as HTMLElement).style.display = "flex";
                                    }}
                                  />
                                ) : null}
                                <div
                                  style={{ display: item.logoUrl ? "none" : "flex" }}
                                  className={`h-9 w-9 text-white font-bold items-center justify-center shrink-0 text-xs shadow-xs ${
                                    isCompany ? "rounded-lg bg-blue-600" : "rounded-full bg-purple-600"
                                  }`}
                                >
                                  {item.name.charAt(0).toUpperCase()}
                                </div>

                                <div className="min-w-0 flex-1">
                                  <p className="font-semibold text-gray-900 dark:text-white truncate">
                                    {item.name}
                                  </p>
                                  <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate">
                                    {item.headline || item.industry}
                                  </p>
                                  <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-gray-400">
                                    <span>{item.location || "Global"}</span>
                                    {item.followers && (
                                      <>
                                        <span>•</span>
                                        <span className="font-medium text-gray-600 dark:text-gray-300">
                                          {item.followers}
                                        </span>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>

                              <div className="shrink-0 flex flex-col items-end gap-1">
                                {isCompany ? (
                                  <span className="rounded-full bg-blue-50 border border-blue-200 px-2 py-0.5 text-[10px] font-bold text-blue-700 dark:bg-blue-950/60 dark:border-blue-900 dark:text-blue-300">
                                    Empresa
                                  </span>
                                ) : (
                                  <span className="rounded-full bg-purple-50 border border-purple-200 px-2 py-0.5 text-[10px] font-bold text-purple-700 dark:bg-purple-950/60 dark:border-purple-900 dark:text-purple-300">
                                    Perfil
                                  </span>
                                )}
                                <span className="text-[9px] text-gray-400 font-mono">LinkedIn</span>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>

                    {/* Footer informativo de scroll */}
                    <div className="px-3 py-1.5 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-800 text-[10px] text-gray-500 dark:text-gray-400 flex items-center justify-between shrink-0">
                      <span>Desplaza con el cursor para explorar mas opciones</span>
                      <span className="font-semibold text-brand-600 dark:text-brand-400">
                        {filteredSearchResults.length} opciones
                      </span>
                    </div>
                  </div>
                )}

                {selectedCompetitorItem && (
                  <div className="mt-2 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50/70 p-2 text-xs text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-300 font-medium">
                    {selectedCompetitorItem.logoUrl && (
                      <img
                        src={selectedCompetitorItem.logoUrl}
                        alt={selectedCompetitorItem.name}
                        className={`h-6 w-6 object-contain bg-white border border-emerald-200 p-0.5 shrink-0 ${
                          selectedCompetitorItem.type === "person" ? "rounded-full object-cover" : "rounded-md"
                        }`}
                      />
                    )}
                    <div className="min-w-0 flex-1 truncate">
                      <span className="font-bold">
                        {selectedCompetitorItem.type === "person" ? "Perfil referente vinculado: " : "Cuenta oficial de empresa vinculada: "}
                      </span>
                      <span className="font-semibold underline">{selectedCompetitorItem.name}</span>
                      <span className="ml-1.5 inline-block text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200">
                        {selectedCompetitorItem.type === "person" ? "Perfil" : "Empresa"}
                      </span>
                      {selectedCompetitorItem.followers && (
                        <span className="text-[11px] text-emerald-600 dark:text-emerald-400 ml-1.5">
                          • {selectedCompetitorItem.followers}
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-gray-500 mb-1">
                  URL de LinkedIn de la Cuenta o Perfil
                </label>
                <div className="relative">
                  <input
                    type="url"
                    value={competitorUrl}
                    onChange={(e) => setCompetitorUrl(e.target.value)}
                    placeholder="https://www.linkedin.com/company/nombre o https://www.linkedin.com/in/nombre"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs text-gray-800 focus:border-brand-500 focus:outline-hidden dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                  />
                  {selectedCompetitorItem && (
                    <span className="absolute right-2.5 top-2 text-xs font-bold text-emerald-600" title="URL confirmada">
                      ✓
                    </span>
                  )}
                </div>
              </div>
            </div>


            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-gray-500 mb-1">
                  Palabras Clave en Contenido del Post (Separadas por coma)
                </label>
                <input
                  type="text"
                  value={keywordsFilterInput}
                  onChange={(e) => setKeywordsFilterInput(e.target.value)}
                  placeholder="Agentes IA, Prospeccion B2B, Outreach..."
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs text-gray-800 focus:border-brand-500 focus:outline-hidden dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                />
              </div>

              <div className="flex items-center gap-6 pt-5">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-gray-700 dark:text-gray-300">
                  <input
                    type="checkbox"
                    checked={trackComments}
                    onChange={(e) => setTrackComments(e.target.checked)}
                    className="rounded border-gray-300 text-brand-500"
                  />
                  <span>Comentarios (Mayor intencion)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-gray-700 dark:text-gray-300">
                  <input
                    type="checkbox"
                    checked={trackLikes}
                    onChange={(e) => setTrackLikes(e.target.checked)}
                    className="rounded border-gray-300 text-brand-500"
                  />
                  <span>Likes / Reacciones</span>
                </label>
              </div>
            </div>

            {/* Filtro Anti-Engagement Interno / Excluir empleados del autor */}
            <div className="rounded-xl border border-gray-200 bg-gray-50/70 p-3.5 dark:border-gray-800 dark:bg-gray-800/40">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-gray-600 dark:text-gray-300">
                  Filtros Inteligentes de Post
                </span>
                <span className="text-[10px] font-semibold text-brand-600 bg-brand-50 border border-brand-200 px-2 py-0.5 rounded-full dark:bg-brand-950/60 dark:border-brand-900 dark:text-brand-300">
                  Calidad Anti-Spam
                </span>
              </div>
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={excludeAuthorEmployees}
                  onChange={(e) => setExcludeAuthorEmployees(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500 dark:border-gray-700 cursor-pointer"
                />
                <div className="min-w-0">
                  <span className="block text-xs font-bold text-gray-800 dark:text-gray-200">
                    Excluir engagement interno
                  </span>
                  <span className="block text-[11px] text-gray-500 dark:text-gray-400 leading-tight mt-0.5">
                    Descarta interacciones de empleados y colaboradores de la misma empresa.
                  </span>
                </div>
              </label>
            </div>

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
                onClick={() => setIsAddingCompetitor(false)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="rounded-lg bg-brand-500 px-5 py-2 text-xs font-semibold text-white hover:bg-brand-600 transition"
              >
                Iniciar Escaneo de Competidor
              </button>
            </div>
          </form>
        </ComponentCard>
      )}

      {/* Barra de Cuenta Conectada & Estado de Escucha */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl bg-white border border-gray-200 dark:bg-gray-900 dark:border-gray-800 text-xs">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-gray-600 dark:text-gray-400">
            Cuenta de LinkedIn activa para auditoría:
          </span>
          <span className="font-bold text-gray-900 dark:text-white">
            {currentDisplayName}
          </span>
          <span
            className={`rounded px-2 py-0.5 text-[10px] font-bold ${
              activeAccount?.status === "OK" || activeAccount?.status === "CONNECTED"
                ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400"
                : "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-400"
            }`}
          >
            {activeAccount?.status === "OK" || activeAccount?.status === "CONNECTED"
              ? "CONECTADA EN LINKEDIN"
              : `ESTADO: ${activeAccount?.status || "DESCONECTADA"}`}
          </span>
        </div>

        {availableAccounts.length > 1 && (
          <div className="flex items-center gap-2">
            <span className="text-gray-500 text-[11px]">Cambiar cuenta:</span>
            <select
              value={activeAccount?.id || ""}
              onChange={(e) => {
                const sel = availableAccounts.find((a) => a.id === e.target.value);
                if (sel) setActiveAccount(sel);
              }}
              className="rounded-lg border border-gray-300 bg-white px-2.5 py-1 text-xs text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
            >
              {availableAccounts.map((a) => {
                const isConnected = a.status === "OK" || a.status === "CONNECTED";
                return (
                  <option key={a.id} value={a.id}>
                    {a.name} {isConnected ? "(Conectada ✓)" : `(${a.status || "Desconectada"})`}
                  </option>
                );
              })}
            </select>
          </div>
        )}
      </div>

      {/* Banner de Feedback de Auditoría */}
      {scanFeedback && (
        <div
          className={`rounded-xl p-3.5 text-xs border flex items-center justify-between ${
            scanFeedback.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/30 dark:border-emerald-900/50 dark:text-emerald-300"
              : "bg-red-50 border-red-200 text-red-800 dark:bg-red-950/30 dark:border-red-900/50 dark:text-red-300"
          }`}
        >
          <div className="flex items-center gap-2">
            <span className="font-bold">{scanFeedback.type === "success" ? "✓" : "⚠"}</span>
            <span>{scanFeedback.text}</span>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            {scanFeedback.listId && (
              <Link
                href={`/leads/lists?listId=${encodeURIComponent(scanFeedback.listId)}`}
                className="font-bold underline hover:text-emerald-950 dark:hover:text-emerald-200"
              >
                Abrir Lista Inteligente &rarr;
              </Link>
            )}
            <button
              type="button"
              onClick={() => setScanFeedback(null)}
              className="text-xs font-bold hover:underline px-2"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Lista de Competidores en Seguimiento */}
      <ComponentCard title={`Cuentas Objetivo en Seguimiento (${l2Monitors.length})`}>
        {!isLoaded ? (
          <p className="text-xs text-gray-400 py-4">Cargando cuentas...</p>
        ) : l2Monitors.length === 0 ? (
          <div className="py-12 text-center space-y-3">
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              No tienes competidores registrados en Signal Radar Nivel 2.
            </p>
            <p className="text-xs text-gray-400 max-w-md mx-auto">
              Agrega una empresa competidora o perfil referente de tu nicho para auditar a los decisores que comentan y reaccionan a sus publicaciones.
            </p>
            <button
              type="button"
              onClick={() => setIsAddingCompetitor(true)}
              className="rounded-lg bg-brand-500 px-4 py-2 text-xs font-semibold text-white hover:bg-brand-600 transition"
            >
              + Agregar Primer Competidor
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-gray-100 text-xs font-semibold uppercase text-gray-400 dark:border-gray-800">
                <tr>
                  <th className="pb-3">Cuenta Objetivo</th>
                  <th className="pb-3">Palabras Clave de Filtrado</th>
                  <th className="pb-3">Tipos de Interaccion</th>
                  <th className="pb-3">Leads Extraidos</th>
                  <th className="pb-3">Ultimo Escaneo</th>
                  <th className="pb-3">Estado</th>
                  <th className="pb-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-xs dark:divide-gray-800">
                {l2Monitors.map((comp) => {
                  const isPerson = comp.competitorType === "person" || comp.competitorUrl.includes("/in/");
                  return (
                    <tr key={comp.id} className="hover:bg-gray-50/50 dark:hover:bg-white/2 transition">
                      <td className="py-4">
                        <div className="flex items-center gap-2.5">
                          {comp.logoUrl ? (
                            <img
                              src={comp.logoUrl}
                              alt={comp.competitorName}
                              className={`h-8 w-8 object-contain bg-white border border-gray-100 p-0.5 shadow-xs dark:border-gray-800 shrink-0 ${
                                isPerson ? "rounded-full object-cover" : "rounded-lg"
                              }`}
                              onError={(e) => {
                                (e.target as HTMLElement).style.display = "none";
                                const fb = (e.target as HTMLElement).nextElementSibling;
                                if (fb) (fb as HTMLElement).style.display = "flex";
                              }}
                            />
                          ) : null}
                          <div
                            style={{ display: comp.logoUrl ? "none" : "flex" }}
                            className={`h-8 w-8 text-white font-bold items-center justify-center shrink-0 text-xs shadow-xs ${
                              isPerson ? "rounded-full bg-purple-600" : "rounded-lg bg-blue-600"
                            }`}
                          >
                            {comp.competitorName.charAt(0).toUpperCase()}
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <p className="font-semibold text-gray-900 dark:text-white truncate">
                                {comp.competitorName}
                              </p>
                              <span
                                className={`rounded-full px-1.5 py-0.2 text-[9px] font-bold ${
                                  isPerson
                                    ? "bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800"
                                    : "bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800"
                                }`}
                              >
                                {isPerson ? "Perfil" : "Empresa"}
                              </span>
                              {comp.excludeAuthorEmployees !== false && (
                                <span
                                  className="rounded-full px-1.5 py-0.2 text-[9px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/60 dark:border-emerald-800 dark:text-emerald-300"
                                  title="Filtrando engagement interno de empleados del autor"
                                >
                                  Sin engagement interno
                                </span>
                              )}
                            </div>
                            <a
                              href={comp.competitorUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[11px] text-brand-600 hover:underline dark:text-brand-400 truncate block max-w-xs"
                            >
                              {comp.competitorUrl}
                            </a>
                          </div>
                        </div>
                      </td>


                    <td className="py-4">
                      <div className="flex flex-wrap gap-1">
                        {comp.keywordsFilter.map((kw, i) => (
                          <span
                            key={i}
                            className="rounded bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-700 dark:bg-gray-800 dark:text-gray-300"
                          >
                            {kw}
                          </span>
                        ))}
                      </div>
                    </td>

                    <td className="py-4 text-gray-600 dark:text-gray-400 text-xs">
                      {comp.interactionTypes.join(" + ")}
                    </td>

                    <td className="py-4 font-bold text-brand-600 dark:text-brand-400">
                      {comp.leadsIdentifiedCount} leads
                    </td>

                    <td className="py-4 text-gray-500 dark:text-gray-400">
                      {comp.lastScanAt}
                    </td>

                    <td className="py-4">
                      <button
                        type="button"
                        onClick={() => toggleLevel2Status(comp.id)}
                        className={`rounded-full px-2.5 py-0.5 font-semibold text-[11px] transition ${
                          comp.status === "active"
                            ? "bg-green-50 text-green-700 hover:bg-green-100 dark:bg-green-950/40 dark:text-green-400"
                            : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300"
                        }`}
                      >
                        {comp.status === "active" ? "Monitoreando" : "Pausado"}
                      </button>
                    </td>

                    <td className="py-4 text-right space-x-1.5 whitespace-nowrap">
                      {/* Botón de Auditoría en Vivo */}
                      <button
                        type="button"
                        disabled={isScanningId === comp.id}
                        onClick={() => handleScanCompetitor(comp)}
                        className="rounded-md bg-brand-500 px-2.5 py-1 text-white hover:bg-brand-600 font-medium text-xs transition disabled:opacity-50 inline-flex items-center gap-1"
                        title="Auditar publicaciones recientes y extraer decisores"
                      >
                        {isScanningId === comp.id ? (
                          <>
                            <span className="h-3 w-3 rounded-full border-2 border-white/40 border-t-white animate-spin"></span>
                            Auditando...
                          </>
                        ) : (
                          "Auditar Ahora"
                        )}
                      </button>

                      {/* Botón Ver Lista Directa */}
                      {(() => {
                        const targetList = getOrCreateList({
                          monitorId: comp.id,
                          competitorName: comp.competitorName,
                          keywords: comp.keywordsFilter,
                        });
                        const compLeads = getCompetitorLeads(comp.id);
                        const leadCount = compLeads.length;

                        return (
                          <Link
                            href={`/leads/lists?listId=${encodeURIComponent(targetList.id)}&competitor=${encodeURIComponent(comp.competitorName)}`}
                            className="rounded-md border border-brand-500 px-2.5 py-1 text-brand-600 hover:bg-brand-50 dark:text-brand-400 dark:hover:bg-brand-950/20 font-medium text-xs inline-flex items-center gap-1.5 transition"
                            title={`Abrir lista inteligente de ${comp.competitorName}`}
                          >
                            <span>Ver Lista ({leadCount})</span>
                            <span aria-hidden="true">&rarr;</span>
                          </Link>
                        );
                      })()}

                      {/* Botón Eliminar */}
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm(`¿Eliminar auditoría de "${comp.competitorName}"?`)) {
                            deleteLevel2Monitor(comp.id);
                          }
                        }}
                        className="rounded-md border border-red-200 px-2 py-1 text-red-600 hover:bg-red-50 dark:border-red-900/40 dark:text-red-400 text-xs"
                        title="Eliminar competidor"
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                );
              })}
              </tbody>
            </table>
          </div>
        )}
      </ComponentCard>
    </div>
  );
}
