"use client";

import ComponentCard from "@/components/common/ComponentCard";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import ProspectAvatar from "@/components/leads/ProspectAvatar";
import { useLeads } from "@/lib/leads/store";
import { useSignalRadar } from "@/lib/signals/store";
import type { ConnectionDegree, IntentLevel, Level3GlobalMonitor, SignalLeadItem } from "@/lib/signals/types";
import { getStoredAccounts } from "@/lib/unipile/store";
import type { UnipileAccount } from "@/lib/unipile/types";
import Link from "next/link";
import { useEffect, useState } from "react";

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

  // Cuentas de LinkedIn
  const [availableAccounts, setAvailableAccounts] = useState<UnipileAccount[]>([]);
  const [activeAccount, setActiveAccount] = useState<UnipileAccount | null>(null);

  useEffect(() => {
    fetch("/api/unipile/accounts")
      .then((r) => r.json())
      .then((data) => {
        const liveItems = data.items || [];
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

  // Asegurar que cada regla L3 tenga su lista dinámica en el Directorio de Leads
  useEffect(() => {
    if (!isLoaded || l3Monitors.length === 0) return;
    for (const monitor of l3Monitors) {
      const targetList = getOrCreateGlobalList({
        monitorId: monitor.id,
        searchQuery: monitor.searchQuery,
        icpTitles: monitor.icpTitles,
      });
      const monitorLeads = leads.filter((l) => l.monitorId === monitor.id);
      if (monitorLeads.length > 0) {
        importSignalLeads(targetList, monitorLeads);
      }
    }
  }, [isLoaded, l3Monitors, leads, getOrCreateGlobalList, importSignalLeads]);

  const [isAddingRule, setIsAddingRule] = useState(false);
  const [selectedRuleForLeads, setSelectedRuleForLeads] = useState<Level3GlobalMonitor | null>(null);
  const [isScanningId, setIsScanningId] = useState<string | null>(null);
  const [scanFeedback, setScanFeedback] = useState<{ type: "success" | "error"; text: string; listId?: string } | null>(null);

  // Form states
  const [searchQuery, setSearchQuery] = useState("Prospeccion en frio B2B OR Falta de pipeline");
  const [icpTitlesInput, setIcpTitlesInput] = useState(
    "CEO, Founder, VP Sales, Head of Growth, Director Comercial"
  );
  const [locationsInput, setLocationsInput] = useState("España, Mexico, Colombia, Chile, Brasil");
  const [minReactions, setMinReactions] = useState(15);

  const totalGlobalLeads = l3Monitors.reduce((acc, m) => acc + m.leadsIdentifiedCount, 0);

  const handleAddRule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    const titles = icpTitlesInput
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    const locs = locationsInput
      .split(",")
      .map((l) => l.trim())
      .filter(Boolean);

    const newMonitor: Level3GlobalMonitor = {
      id: `mon-l3-${Date.now()}`,
      searchQuery: searchQuery.trim(),
      icpTitles: titles.length > 0 ? titles : ["CEO", "Founder"],
      locations: locs.length > 0 ? locs : ["España", "LATAM"],
      minPostReactions: Number(minReactions) || 15,
      status: "active",
      leadsIdentifiedCount: 0,
      lastScanAt: "Recién configurado",
      createdAt: new Date().toISOString(),
    };

    addLevel3Monitor(newMonitor);
    const targetList = getOrCreateGlobalList({
      monitorId: newMonitor.id,
      searchQuery: newMonitor.searchQuery,
      icpTitles: newMonitor.icpTitles,
    });

    setIsAddingRule(false);
    setScanFeedback({
      type: "success",
      text: `Regla global creada para monitorear "${newMonitor.searchQuery}". Se vinculó la lista dinámica "${targetList.name}".`,
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
          icpTitles: rule.icpTitles,
          locations: rule.locations,
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
        location: lead.location || "Remoto / No especificado",
        linkedinUrl: lead.linkedinUrl || "",
        avatarUrl: lead.avatarUrl,
        connectionDegree: (lead.connectionDegree || "2nd") as ConnectionDegree,
        intentLevel: (lead.intentLevel || "medium_high") as IntentLevel,
        signalSnippet: lead.signalSnippet || `Participó en debate sobre ${rule.searchQuery}`,
        detectedAt: new Date().toISOString(),
        status: "new" as const,
        language: lead.language,
        signalLevel: "level_3" as const,
        sourcePostTitle: lead.sourcePostTitle,
      }));

      const added = recordDiscoveredLeads(harvestedLeads);

      // Crear o vincular lista dinámica en el Directorio de Leads
      const targetList = getOrCreateGlobalList({
        monitorId: rule.id,
        searchQuery: rule.searchQuery,
        icpTitles: rule.icpTitles,
      });

      // Sincronizar todos los leads descubiertos con la lista del CRM
      const allLeadsForMonitor = leads.filter((l) => l.monitorId === rule.id).concat(added);
      importSignalLeads(targetList, allLeadsForMonitor);

      const newCapturedCount = rule.leadsIdentifiedCount + added.length;
      updateLevel3Monitor(rule.id, {
        leadsIdentifiedCount: newCapturedCount,
        lastScanAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      });

      setScanFeedback({
        type: "success",
        text: `Escaneo global finalizado: Se analizaron ${data.totalPostsAnalyzed || 0} publicaciones virales y se extrajeron ${added.length} decisores calificados según tu ICP para "${rule.searchQuery}".`,
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
    return lists.find(
      (l: any) =>
        l.sourceMonitorId === rule.id ||
        l.name.toLowerCase().includes(rule.searchQuery.toLowerCase())
    );
  };

  const currentDisplayName = activeAccount?.name || "Cuenta Principal de LinkedIn";

  return (
    <div className="space-y-6">
      <PageBreadcrumb pageTitle="Signal Radar - Nivel 03: LinkedIn Global (Tendencias & Palabras Clave)" />

      {/* Métricas del Nivel 3 */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
            Reglas de Tendencias Activas
          </span>
          <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
            {l3Monitors.length} Monitores Globales
          </p>
          <span className="text-xs text-brand-600 font-semibold dark:text-brand-400">
            Escaneo en vivo de debates en toda la red
          </span>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
            Decisores ICP Calificados
          </span>
          <p className="mt-2 text-2xl font-bold text-brand-600 dark:text-brand-400">
            {totalGlobalLeads} Prospectos
          </p>
          <span className="text-xs text-blue-600 font-semibold dark:text-blue-400">
            Filtro de Cargo y Geografía Aplicado
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
            Genera notificaciones de visita antes de conectar
          </span>
        </div>
      </div>

      {/* Explicación de la Estrategia */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-5 rounded-2xl border border-blue-200 bg-blue-25/40 dark:border-blue-900 dark:bg-blue-950/20">
        <div>
          <h4 className="text-sm font-bold text-blue-900 dark:text-blue-200">
            Mecánica de Escaneo Global de LinkedIn (Nivel 3)
          </h4>
          <p className="text-xs text-blue-700 dark:text-blue-300 mt-1 max-w-2xl">
            Detecta publicaciones virales y debates con alta tracción en LinkedIn sobre temáticas de dolor o necesidad donde tu solución aporta valor. Extrae a los comentaristas e interactuantes y filtra solo a los decisores cuyo cargo y geografía coincidan exactamente con tu ICP.
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

      {/* Formulario para Agregar Regla Global */}
      {isAddingRule && (
        <ComponentCard
          title="Configurador de Regla Global en LinkedIn"
          desc="Especifica términos de búsqueda temática, cargos ICP y geografías para monitorear posts relevantes en toda la red."
        >
          <form onSubmit={handleAddRule} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-gray-500 mb-1">
                  Términos de Búsqueda (Keywords o Frases Clave)
                </label>
                <input
                  type="text"
                  required
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Ej. Prospeccion B2B OR Falta de pipeline"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs text-gray-800 focus:border-brand-500 focus:outline-hidden dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-gray-500 mb-1">
                  Umbral Mínimo de Reacciones en el Post
                </label>
                <input
                  type="number"
                  min="5"
                  max="1000"
                  value={minReactions}
                  onChange={(e) => setMinReactions(Number(e.target.value))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs text-gray-800 focus:border-brand-500 focus:outline-hidden dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-gray-500 mb-1">
                  Cargos Objetivo ICP (Separados por coma)
                </label>
                <input
                  type="text"
                  value={icpTitlesInput}
                  onChange={(e) => setIcpTitlesInput(e.target.value)}
                  placeholder="CEO, Founder, VP Sales, Head of Growth..."
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs text-gray-800 focus:border-brand-500 focus:outline-hidden dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-gray-500 mb-1">
                  Países y Ubicaciones (Separados por coma)
                </label>
                <input
                  type="text"
                  value={locationsInput}
                  onChange={(e) => setLocationsInput(e.target.value)}
                  placeholder="España, Mexico, Colombia, Chile, Brasil..."
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs text-gray-800 focus:border-brand-500 focus:outline-hidden dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                />
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
      <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl bg-white border border-gray-200 dark:bg-gray-900 dark:border-gray-800 text-xs">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-gray-600 dark:text-gray-400">
            Cuenta de LinkedIn activa para escaneo global:
          </span>
          <span className="font-bold text-gray-900 dark:text-white">
            {currentDisplayName}
          </span>
          <span className="rounded bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">
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
                if (sel) setActiveAccount(sel);
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

      {/* Tabla de Reglas Globales Activas */}
      <ComponentCard title={`Monitores Globales Activos (${l3Monitors.length})`}>
        {!isLoaded ? (
          <p className="text-xs text-gray-400 py-4">Cargando reglas...</p>
        ) : l3Monitors.length === 0 ? (
          <div className="py-12 text-center space-y-3">
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              No tienes reglas globales activas en Signal Radar Nivel 3.
            </p>
            <p className="text-xs text-gray-400 max-w-md mx-auto">
              Configura palabras clave y operadores para rastrear debates virales en toda la red de LinkedIn y capturar prospectos calificados con cargos ICP específicos.
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
              <thead className="border-b border-gray-100 text-xs font-semibold uppercase text-gray-400 dark:border-gray-800">
                <tr>
                  <th className="pb-3">Términos de Búsqueda</th>
                  <th className="pb-3">Cargos ICP Filtrados</th>
                  <th className="pb-3">Geografía</th>
                  <th className="pb-3">Leads Extraídos</th>
                  <th className="pb-3">Último Escaneo</th>
                  <th className="pb-3">Estado</th>
                  <th className="pb-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-xs dark:divide-gray-800">
                {l3Monitors.map((rule) => {
                  const targetList = getListForRule(rule);
                  const leadsCount = getRuleLeads(rule.id).length;
                  return (
                    <tr key={rule.id} className="hover:bg-gray-50/50 dark:hover:bg-white/2 transition">
                      <td className="py-4">
                        <p className="font-semibold text-gray-900 dark:text-white">
                          {rule.searchQuery}
                        </p>
                        <span className="text-[10px] text-gray-400">
                          Umbral: Min {rule.minPostReactions} reacciones
                        </span>
                      </td>

                      <td className="py-4 max-w-xs">
                        <div className="flex flex-wrap gap-1">
                          {rule.icpTitles.map((t, i) => (
                            <span
                              key={i}
                              className="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-medium text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                            >
                              {t}
                            </span>
                          ))}
                        </div>
                      </td>

                      <td className="py-4 text-gray-600 dark:text-gray-400 text-xs">
                        {rule.locations.join(", ")}
                      </td>

                      <td className="py-4 font-bold text-brand-600 dark:text-brand-400">
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

                      <td className="py-4 text-gray-500 dark:text-gray-400">
                        {rule.lastScanAt}
                      </td>

                      <td className="py-4">
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

                      <td className="py-4 text-right space-x-1.5 whitespace-nowrap">
                        {/* Botón Escanear Tendencias */}
                        <button
                          type="button"
                          disabled={isScanningId === rule.id}
                          onClick={() => handleScanGlobalRule(rule)}
                          className="rounded-md bg-brand-500 px-2.5 py-1 text-white hover:bg-brand-600 font-medium text-xs transition disabled:opacity-50 inline-flex items-center gap-1"
                          title="Buscar debates virales y prospectos ICP en LinkedIn"
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
                          className="rounded-md border border-brand-500 px-2.5 py-1 text-brand-600 hover:bg-brand-50 dark:text-brand-400 dark:hover:bg-brand-950/20 font-medium text-xs"
                        >
                          Ver Leads ({leadsCount})
                        </button>

                        {/* Botón Enlace al Directorio de Leads */}
                        {targetList && (
                          <Link
                            href={`/leads/lists/${targetList.id}`}
                            className="rounded-md border border-gray-300 px-2.5 py-1 text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800 font-medium text-xs inline-flex items-center gap-1"
                            title="Abrir la lista dinámica de esta regla en el Directorio de Leads"
                          >
                            <span>Lista CRM</span>
                            <span className="text-[10px]">↗</span>
                          </Link>
                        )}

                        {/* Botón Eliminar */}
                        <button
                          type="button"
                          onClick={() => {
                            if (confirm(`¿Eliminar regla de "${rule.searchQuery}"?`)) {
                              deleteLevel3Monitor(rule.id);
                            }
                          }}
                          className="rounded-md border border-red-200 px-2 py-1 text-red-600 hover:bg-red-50 dark:border-red-900/40 dark:text-red-400 text-xs"
                          title="Eliminar regla"
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

      {/* Modal para Visualizar Leads Extraídos Globalmente */}
      {selectedRuleForLeads && (
        <div className="fixed inset-0 z-99999 flex items-center justify-center bg-black/60 p-4">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-6 shadow-theme-xl dark:bg-gray-900 border border-gray-200 dark:border-gray-800">
            <div className="flex items-start justify-between border-b border-gray-100 pb-4 dark:border-gray-800">
              <div>
                <span className="rounded bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                  LinkedIn Global: {selectedRuleForLeads.searchQuery}
                </span>
                <h3 className="mt-2 text-base font-bold text-gray-900 dark:text-white">
                  Prospectos ICP Extraídos de Debates Globales
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Decisores calificados que participaron en publicaciones virales sobre esta problemática.
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

            <div className="my-4 divide-y divide-gray-100 dark:divide-gray-800">
              {getRuleLeads(selectedRuleForLeads.id).length === 0 ? (
                <div className="py-8 text-center space-y-3">
                  <p className="text-xs text-gray-500">
                    Aún no hay prospectos extraídos para esta regla global. Haz clic en &quot;Escanear Tendencias&quot; para iniciar la indexación en vivo en LinkedIn.
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
    </div>
  );
}
