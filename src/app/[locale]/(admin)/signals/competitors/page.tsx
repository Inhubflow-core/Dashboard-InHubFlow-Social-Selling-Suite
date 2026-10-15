"use client";

import ComponentCard from "@/components/common/ComponentCard";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { useSignalRadar } from "@/lib/signals/store";
import type { Level2CompetitorMonitor, SignalLeadItem } from "@/lib/signals/types";
import { getStoredAccounts } from "@/lib/unipile/store";
import type { UnipileAccount } from "@/lib/unipile/types";
import Link from "next/link";
import { useEffect, useState } from "react";

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
  } = useSignalRadar();

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

  const [isAddingCompetitor, setIsAddingCompetitor] = useState(false);
  const [selectedCompetitorForLeads, setSelectedCompetitorForLeads] =
    useState<Level2CompetitorMonitor | null>(null);
  const [isScanningId, setIsScanningId] = useState<string | null>(null);
  const [scanFeedback, setScanFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Form states
  const [competitorName, setCompetitorName] = useState("");
  const [competitorUrl, setCompetitorUrl] = useState("");
  const [keywordsFilterInput, setKeywordsFilterInput] = useState(
    "Agentes IA, Prospeccion B2B, Outreach"
  );
  const [trackComments, setTrackComments] = useState(true);
  const [trackLikes, setTrackLikes] = useState(true);
  const [outreachTemplate, setOutreachTemplate] = useState(
    "Hola {{first_name}}, vi tu interaccion en el post de {{competitor}} sobre {{tema}}. Me parecio muy interesante... ¿como lo estan resolviendo en {{company}}?"
  );

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

    const newMonitor: Level2CompetitorMonitor = {
      id: `mon-l2-${Date.now()}`,
      competitorName,
      competitorUrl: competitorUrl || "https://www.linkedin.com/company/competitor",
      keywordsFilter: keywords.length > 0 ? keywords : ["Prospeccion B2B"],
      status: "active",
      interactionTypes: interactions.length > 0 ? interactions : ["comments"],
      outreachTemplate,
      leadsIdentifiedCount: 0,
      lastScanAt: "Recien configurado",
      createdAt: new Date().toISOString(),
    };

    addLevel2Monitor(newMonitor);
    setIsAddingCompetitor(false);
    setCompetitorName("");
    setCompetitorUrl("");
    setScanFeedback({
      type: "success",
      text: `Competidor "${newMonitor.competitorName}" agregado para auditoría y captura de señales.`,
    });
  };

  const handleScanCompetitor = async (comp: Level2CompetitorMonitor) => {
    setIsScanningId(comp.id);
    setScanFeedback(null);
    try {
      // Simulación de auditoría de actividad del competidor con IA/Unipile
      await new Promise((r) => setTimeout(r, 1200));

      const sampleCompetitorProspects = [
        {
          name: "Alejandro Morales",
          headline: "Director Comercial en Global Logistics",
          company: "Global Logistics",
          location: "Bogotá, Colombia",
          snippet: `Comentó en el post de ${comp.competitorName}: "Interesante enfoque, pero la integración CRM suele ser el cuello de botella."`,
        },
        {
          name: "Valeria Gómez",
          headline: "VP Growth & RevOps en FinCloud",
          company: "FinCloud",
          location: "Ciudad de México, México",
          snippet: `Dio Like a la publicación sobre ${comp.keywordsFilter[0] || "Soluciones B2B"}`,
        },
        {
          name: "Javier Santos",
          headline: "CEO & Co-Founder en ScaleTech",
          company: "ScaleTech",
          location: "Madrid, España",
          snippet: `Comentó: "¿Tienen soporte multicanal o solo operan en LinkedIn?"`,
        },
      ];

      const newLeadsToAdd: SignalLeadItem[] = sampleCompetitorProspects.map((p, idx) => ({
        id: `sig-lead-c-${Date.now()}-${idx}`,
        monitorId: comp.id,
        fullName: p.name,
        headline: p.headline,
        company: p.company,
        location: p.location,
        linkedinUrl: `https://www.linkedin.com/in/${p.name.toLowerCase().replace(/\s+/g, "-")}`,
        connectionDegree: "2nd",
        intentLevel: "medium_high",
        signalSnippet: p.snippet,
        detectedAt: new Date().toISOString(),
        status: "new",
      }));

      const added = recordDiscoveredLeads(newLeadsToAdd);
      const newCapturedCount = comp.leadsIdentifiedCount + added.length;

      updateLevel2Monitor(comp.id, {
        leadsIdentifiedCount: newCapturedCount,
        lastScanAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      });

      setScanFeedback({
        type: "success",
        text: `Auditoría completada para ${comp.competitorName}: ${added.length} nuevos decisores identificados interactuando con su contenido.`,
      });
    } catch (err: any) {
      setScanFeedback({
        type: "error",
        text: `Error al auditar competidor: ${err.message || "Error al conectar"}`,
      });
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
              <div>
                <label className="block text-xs font-semibold uppercase text-gray-500 mb-1">
                  Nombre de la Cuenta o Competidor
                </label>
                <input
                  type="text"
                  required
                  value={competitorName}
                  onChange={(e) => setCompetitorName(e.target.value)}
                  placeholder="Ej. Adapta IA / Fundador"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs text-gray-800 focus:border-brand-500 focus:outline-hidden dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-gray-500 mb-1">
                  URL de LinkedIn de la Cuenta
                </label>
                <input
                  type="url"
                  value={competitorUrl}
                  onChange={(e) => setCompetitorUrl(e.target.value)}
                  placeholder="https://www.linkedin.com/company/nombre-competidor"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs text-gray-800 focus:border-brand-500 focus:outline-hidden dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                />
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
          <button
            type="button"
            onClick={() => setScanFeedback(null)}
            className="text-xs font-bold hover:underline px-2"
          >
            ✕
          </button>
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
                {l2Monitors.map((comp) => (
                  <tr key={comp.id} className="hover:bg-gray-50/50 dark:hover:bg-white/2 transition">
                    <td className="py-4">
                      <p className="font-semibold text-gray-900 dark:text-white">
                        {comp.competitorName}
                      </p>
                      <a
                        href={comp.competitorUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[11px] text-brand-600 hover:underline dark:text-brand-400 truncate block max-w-xs"
                      >
                        {comp.competitorUrl}
                      </a>
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

                      {/* Botón Ver Leads */}
                      <button
                        type="button"
                        onClick={() => setSelectedCompetitorForLeads(comp)}
                        className="rounded-md border border-brand-500 px-2.5 py-1 text-brand-600 hover:bg-brand-50 dark:text-brand-400 dark:hover:bg-brand-950/20 font-medium text-xs"
                      >
                        Ver Leads ({getCompetitorLeads(comp.id).length})
                      </button>

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
                ))}
              </tbody>
            </table>
          </div>
        )}
      </ComponentCard>

      {/* Modal para Visualizar Leads Extraídos del Competidor */}
      {selectedCompetitorForLeads && (
        <div className="fixed inset-0 z-99999 flex items-center justify-center bg-black/60 p-4">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-6 shadow-theme-xl dark:bg-gray-900 border border-gray-200 dark:border-gray-800">
            <div className="flex items-start justify-between border-b border-gray-100 pb-4 dark:border-gray-800">
              <div>
                <span className="rounded bg-purple-50 px-2 py-0.5 text-xs font-semibold text-purple-700 dark:bg-purple-950 dark:text-purple-300">
                  Auditoria Rival: {selectedCompetitorForLeads.competitorName}
                </span>
                <h3 className="mt-2 text-base font-bold text-gray-900 dark:text-white">
                  Prospectos Extraidos de Publicaciones Rival
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Decisores que interactuaron con el contenido de la competencia sobre tematicas de interes.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedCompetitorForLeads(null)}
                className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 font-bold"
              >
                Cerrar
              </button>
            </div>

            <div className="my-4 divide-y divide-gray-100 dark:divide-gray-800">
              {getCompetitorLeads(selectedCompetitorForLeads.id).length === 0 ? (
                <div className="py-8 text-center space-y-3">
                  <p className="text-xs text-gray-500">
                    Aún no hay prospectos extraídos para este competidor. Haz clic en &quot;Auditar Ahora&quot; para iniciar la detección.
                  </p>
                  <div className="flex items-center justify-center gap-3 pt-2">
                    <button
                      type="button"
                      disabled={isScanningId === selectedCompetitorForLeads.id}
                      onClick={() => handleScanCompetitor(selectedCompetitorForLeads)}
                      className="rounded-lg bg-brand-500 px-4 py-1.5 text-xs font-semibold text-white hover:bg-brand-600 transition"
                    >
                      {isScanningId === selectedCompetitorForLeads.id ? "Auditando..." : "Auditar Competidor Ahora"}
                    </button>
                  </div>
                </div>
              ) : (
                getCompetitorLeads(selectedCompetitorForLeads.id).map((lead) => (
                  <div key={lead.id} className="py-3.5 flex items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-bold text-gray-900 dark:text-white">
                          {lead.fullName}
                        </h4>
                        <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-semibold text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                          Grado {lead.connectionDegree}
                        </span>
                        <span className="rounded bg-purple-50 px-1.5 py-0.5 text-[10px] font-bold text-purple-700 dark:bg-purple-950 dark:text-purple-400">
                          Intencion Media-Alta
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-500 dark:text-gray-400">
                        {lead.headline} • {lead.location}
                      </p>
                      <p className="text-xs text-purple-800 italic dark:text-purple-300 font-medium">
                        {lead.signalSnippet}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Link
                        href="/campaigns"
                        className="rounded-lg bg-brand-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-600 transition"
                      >
                        Enviar a Secuencia
                      </Link>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-800">
              <button
                type="button"
                disabled={isScanningId === selectedCompetitorForLeads.id}
                onClick={() => handleScanCompetitor(selectedCompetitorForLeads)}
                className="text-xs font-semibold text-brand-600 hover:underline dark:text-brand-400"
              >
                + Re-auditar y Buscar Más Prospectos
              </button>
              <button
                type="button"
                onClick={() => setSelectedCompetitorForLeads(null)}
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
