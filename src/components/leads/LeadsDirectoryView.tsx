"use client";

import ComponentCard from "@/components/common/ComponentCard";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import ProspectAvatar from "@/components/leads/ProspectAvatar";
import LeadScoreBadge from "@/components/leads/LeadScoreBadge";
import LeadLanguageBadge from "@/components/leads/LeadLanguageBadge";
import { exportLeadsToCsv, useLeadsStore } from "@/lib/leads/store";
import type { CrmStage, Lead360Item, SequenceStatus } from "@/lib/leads/types";
import { Link } from "@/i18n/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";

const truncateText = (text?: string, maxLength: number = 46): string => {
  if (!text) return "";
  const clean = text.trim();
  if (clean.length <= maxLength) return clean;
  return `${clean.slice(0, maxLength).trimEnd()}...`;
};

export default function LeadsDirectoryView({
  onTabChange,
  hideBreadcrumb,
}: {
  onTabChange?: (tab: string) => void;
  hideBreadcrumb?: boolean;
} = {}) {
  const t = useTranslations("leads");
  const {
    leads,
    lists,
    isLoaded,
    updateLeadStage,
    updateLeadSequenceStatus,
    deleteLead,
    batchUpdateLeadPhotos,
    addManualLead,
    bulkUpdateLeadsStage,
    bulkMoveLeadsToList,
    bulkDeleteLeads,
  } = useLeadsStore();

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedListFilter, setSelectedListFilter] = useState<string>("all");
  const [selectedStageFilter, setSelectedStageFilter] = useState<string>("all");
  const [selectedLangFilter, setSelectedLangFilter] = useState<string>("all");
  const [selectedScoreFilter, setSelectedScoreFilter] = useState<string>("all");
  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);
  const [bulkStageTarget, setBulkStageTarget] = useState<CrmStage>("in_sequence");
  const [bulkListTarget, setBulkListTarget] = useState<string>("");
  const [isAddingManualLead, setIsAddingManualLead] = useState(false);
  const [manualFullName, setManualFullName] = useState("");
  const [manualTitle, setManualTitle] = useState("");
  const [manualCompany, setManualCompany] = useState("");
  const [manualLocation, setManualLocation] = useState("");
  const [manualLinkedinUrl, setManualLinkedinUrl] = useState("");
  const [manualEmail, setManualEmail] = useState("");
  const [manualLanguage, setManualLanguage] = useState<"es" | "pt" | "en">("es");
  const [manualListId, setManualListId] = useState("");
  const [selectedLeadFor360, setSelectedLeadFor360] = useState<Lead360Item | null>(null);

  // Sincronización automática de fotos oficiales de LinkedIn en segundo plano (estilo #b2b)
  const isSyncingPhotosRef = useRef(false);
  useEffect(() => {
    if (!isLoaded || leads.length === 0 || isSyncingPhotosRef.current) return;
    const leadsToEnrich = leads
      .filter((l) => (!l.avatarUrl || !l.location || /no especificado/i.test(l.location) || !l.company || /no especificado/i.test(l.company)) && Boolean(l.linkedinUrl))
      .slice(0, 15);

    if (leadsToEnrich.length === 0) return;

    isSyncingPhotosRef.current = true;
    fetch("/api/leads/sync-photos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        accountId: typeof window !== "undefined" ? localStorage.getItem("inhubflow_active_linkedin_account_id") || undefined : undefined,
        targets: leadsToEnrich.map((l) => ({
          id: l.id,
          linkedinUrl: l.linkedinUrl,
          fullName: l.fullName,
          competitorName: l.company || l.signalSource,
          listName: l.listName,
        })),
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.updated && Object.keys(data.updated).length > 0) {
          batchUpdateLeadPhotos(data.updated);
        }
      })
      .catch(() => {})
      .finally(() => {
        isSyncingPhotosRef.current = false;
      });
  }, [isLoaded, leads.length, batchUpdateLeadPhotos]);

  const filteredLeads = useMemo(() => {
    return leads.filter((lead) => {
      const matchesSearch =
        lead.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.location.toLowerCase().includes(searchTerm.toLowerCase());

      const targetListObj = lists.find((lg) => lg.id === selectedListFilter);
      const matchesList =
        selectedListFilter === "all" ||
        lead.listId === selectedListFilter ||
        (targetListObj?.competitorName && (
          lead.company?.toLowerCase().includes(targetListObj.competitorName.toLowerCase()) ||
          lead.signalSource?.toLowerCase().includes(targetListObj.competitorName.toLowerCase())
        ));
      const matchesStage = selectedStageFilter === "all" || lead.stage === selectedStageFilter;
      const matchesLang =
        selectedLangFilter === "all" || (lead.language || "es") === selectedLangFilter;
      const matchesScore =
        selectedScoreFilter === "all" ||
        (selectedScoreFilter === "100" && lead.intentScore >= 100) ||
        (selectedScoreFilter === "90" && lead.intentScore >= 90) ||
        (selectedScoreFilter === "80" && lead.intentScore >= 80);

      return matchesSearch && matchesList && matchesStage && matchesLang && matchesScore;
    });
  }, [leads, lists, searchTerm, selectedListFilter, selectedStageFilter, selectedLangFilter, selectedScoreFilter]);

  const allFilteredSelected =
    filteredLeads.length > 0 && filteredLeads.every((l) => selectedLeadIds.includes(l.id));

  const toggleSelectAllFiltered = () => {
    if (allFilteredSelected) {
      const filteredSet = new Set(filteredLeads.map((l) => l.id));
      setSelectedLeadIds((prev) => prev.filter((id) => !filteredSet.has(id)));
    } else {
      const next = new Set(selectedLeadIds);
      for (const l of filteredLeads) next.add(l.id);
      setSelectedLeadIds(Array.from(next));
    }
  };

  const toggleSelectOne = (leadId: string) => {
    setSelectedLeadIds((prev) =>
      prev.includes(leadId) ? prev.filter((id) => id !== leadId) : [...prev, leadId]
    );
  };

  const handleCreateManualLead = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualFullName.trim()) return;
    addManualLead({
      fullName: manualFullName,
      title: manualTitle,
      company: manualCompany,
      location: manualLocation,
      linkedinUrl: manualLinkedinUrl,
      email: manualEmail,
      language: manualLanguage,
      listId: manualListId || undefined,
    });
    setIsAddingManualLead(false);
    setManualFullName("");
    setManualTitle("");
    setManualCompany("");
    setManualLocation("");
    setManualLinkedinUrl("");
    setManualEmail("");
  };

  const getStageLabel = (stage: CrmStage) => {
    switch (stage) {
      case "lead_captured":
        return { label: t("stageLeadCaptured"), color: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300" };
      case "in_sequence":
        return { label: t("stageInSequence"), color: "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300" };
      case "connected_material_sent":
        return { label: t("stageMaterialSent"), color: "bg-brand-50 text-brand-600 dark:bg-brand-950/40 dark:text-brand-300" };
      case "active_conversation":
        return { label: t("stageActiveConversation"), color: "bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300" };
      case "meeting_scheduled":
        return { label: t("stageMeetingScheduled"), color: "bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-400" };
      case "proposal_presented":
        return { label: t("stageProposalPresented"), color: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300" };
      case "closed_won":
        return { label: t("stageClosedWon"), color: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300" };
      case "closed_lost":
        return { label: t("stageClosedLost"), color: "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400" };
    }
  };

  const getSequenceBadge = (status: SequenceStatus) => {
    switch (status) {
      case "in_progress":
        return { label: t("seqInProgress"), color: "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300" };
      case "replied":
        return { label: t("seqReplied"), color: "bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-400" };
      case "completed":
        return { label: t("seqCompleted"), color: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300" };
      case "paused":
        return { label: t("seqPaused"), color: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300" };
    }
  };

  const getLocalizedSignalSource = (source?: string) => {
    if (!source) return t("notAvailable");
    if (source.includes("Mis Posts") || source.includes("My Posts")) return t("sourceMyPosts");
    if (source.includes("Competitor") || source.includes("Competencia")) return t("sourceCompetitor");
    if (source.includes("Grupos") || source.includes("Groups")) return t("sourceGroups");
    if (source.startsWith("Interacciones Globales") || source.startsWith("Global Interactions")) {
      const match = source.match(/\((.*?)\)/);
      const topic = match ? match[1] : "";
      return t("sourceGlobal", { topic });
    }
    return source;
  };

  return (
    <div className="w-full space-y-6">
      {!hideBreadcrumb && <PageBreadcrumb pageTitle={t("pageTitle")} />}

      {/* Barra de control, exportación y filtros en el formato estándar de Card */}
      <div className="w-full rounded-lg border border-gray-300 bg-white dark:border-gray-800 dark:bg-white/3">
        <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-5">
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
              onClick={() => setIsAddingManualLead(true)}
              className="rounded-lg border border-brand-500 px-3 py-2 text-xs font-semibold text-brand-600 hover:bg-brand-50 dark:text-brand-400 dark:hover:bg-brand-950/20 transition"
            >
              + Nuevo Lead
            </button>
            <Link
              href="/leads?tab=lists"
              onClick={(e) => {
                if (onTabChange) {
                  e.preventDefault();
                  onTabChange("lists");
                }
              }}
              className="rounded-lg border border-gray-300 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300"
            >
              {t("viewSignalLists", { count: lists.length })}
            </Link>
            <button
              type="button"
              onClick={() => exportLeadsToCsv(filteredLeads)}
              className="rounded-lg bg-brand-500 px-4 py-2 text-xs font-semibold text-white hover:bg-brand-600 transition"
            >
              {t("exportToCsv", { count: filteredLeads.length })}
            </button>
          </div>
        </div>

        {/* Filtros de Búsqueda y Segmentación */}
        <div className="border-t border-gray-300 px-6 py-5 sm:p-6 dark:border-gray-800 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <div>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={t("searchLeadsPlaceholder")}
            className="w-full rounded-lg border border-gray-300 px-3.5 py-2 text-xs text-gray-800 focus:border-brand-500 focus:outline-hidden dark:border-gray-700 dark:bg-gray-800 dark:text-white"
          />
        </div>

        <div>
          <select
            value={selectedListFilter}
            onChange={(e) => setSelectedListFilter(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3.5 py-2 text-xs text-gray-800 focus:border-brand-500 focus:outline-hidden dark:border-gray-700 dark:bg-gray-800 dark:text-white"
          >
            <option value="all">{t("allSignalLists")}</option>
            {lists.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <select
            value={selectedStageFilter}
            onChange={(e) => setSelectedStageFilter(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3.5 py-2 text-xs text-gray-800 focus:border-brand-500 focus:outline-hidden dark:border-gray-700 dark:bg-gray-800 dark:text-white"
          >
            <option value="all">{t("allFunnelStages")}</option>
            <option value="lead_captured">{t("stageLeadCaptured")}</option>
            <option value="in_sequence">{t("stageInSequenceOption")}</option>
            <option value="connected_material_sent">{t("stageMaterialSent")}</option>
            <option value="active_conversation">{t("stageActiveConversation")}</option>
            <option value="meeting_scheduled">{t("stageMeetingScheduled")}</option>
            <option value="proposal_presented">{t("stageProposalPresented")}</option>
            <option value="closed_won">{t("stageClosedWon")}</option>
            <option value="closed_lost">{t("stageClosedLost")}</option>
          </select>
        </div>

        <div>
          <select
            value={selectedLangFilter}
            onChange={(e) => setSelectedLangFilter(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3.5 py-2 text-xs text-gray-800 focus:border-brand-500 focus:outline-hidden dark:border-gray-700 dark:bg-gray-800 dark:text-white"
          >
            <option value="all">Todos los idiomas</option>
            <option value="es">Español (ES)</option>
            <option value="pt">Portugués (PT)</option>
            <option value="en">Inglés (EN)</option>
          </select>
        </div>

        <div>
          <select
            value={selectedScoreFilter}
            onChange={(e) => setSelectedScoreFilter(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3.5 py-2 text-xs text-gray-800 focus:border-brand-500 focus:outline-hidden dark:border-gray-700 dark:bg-gray-800 dark:text-white"
          >
            <option value="all">Todas las puntuaciones</option>
            <option value="100">🔥 100 (Lead Magnet)</option>
            <option value="90">🥇 90+ (Comentarios)</option>
            <option value="80">🥈 80+ (Reacciones)</option>
          </select>
        </div>
        </div>

        {selectedLeadIds.length > 0 && (
          <div className="border-t border-brand-200 bg-brand-50/60 dark:border-brand-900/40 dark:bg-brand-950/20 px-6 py-3 flex flex-wrap items-center justify-between gap-3 text-xs">
            <span className="font-bold text-brand-700 dark:text-brand-300">
              {selectedLeadIds.length} lead(s) seleccionado(s)
            </span>
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={bulkStageTarget}
                onChange={(e) => setBulkStageTarget(e.target.value as CrmStage)}
                className="rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-xs dark:border-gray-700 dark:bg-gray-900 dark:text-white"
              >
                <option value="lead_captured">{t("stageLeadCaptured")}</option>
                <option value="in_sequence">{t("stageInSequence")}</option>
                <option value="connected_material_sent">{t("stageMaterialSent")}</option>
                <option value="active_conversation">{t("stageActiveConversation")}</option>
                <option value="meeting_scheduled">{t("stageMeetingScheduled")}</option>
                <option value="proposal_presented">{t("stageProposalPresented")}</option>
                <option value="closed_won">{t("stageClosedWon")}</option>
                <option value="closed_lost">{t("stageClosedLost")}</option>
              </select>
              <button
                type="button"
                onClick={() => {
                  bulkUpdateLeadsStage(selectedLeadIds, bulkStageTarget);
                  setSelectedLeadIds([]);
                }}
                className="rounded-lg bg-brand-500 px-3 py-1.5 font-semibold text-white hover:bg-brand-600 transition"
              >
                Aplicar Etapa
              </button>

              {lists.length > 0 && (
                <>
                  <select
                    value={bulkListTarget}
                    onChange={(e) => setBulkListTarget(e.target.value)}
                    className="rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-xs dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                  >
                    <option value="">Mover a lista...</option>
                    {lists.map((lg) => (
                      <option key={lg.id} value={lg.id}>
                        {lg.name}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    disabled={!bulkListTarget}
                    onClick={() => {
                      if (!bulkListTarget) return;
                      bulkMoveLeadsToList(selectedLeadIds, bulkListTarget);
                      setSelectedLeadIds([]);
                      setBulkListTarget("");
                    }}
                    className="rounded-lg border border-brand-500 px-3 py-1.5 font-semibold text-brand-600 hover:bg-brand-50 disabled:opacity-40 dark:text-brand-400 transition"
                  >
                    Mover
                  </button>
                </>
              )}

              <button
                type="button"
                onClick={() => {
                  const idSet = new Set(selectedLeadIds);
                  exportLeadsToCsv(filteredLeads.filter((l) => idSet.has(l.id)));
                }}
                className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 transition"
              >
                Exportar Selección
              </button>

              <button
                type="button"
                onClick={() => {
                  if (confirm(`¿Eliminar ${selectedLeadIds.length} lead(s) seleccionado(s)?`)) {
                    bulkDeleteLeads(selectedLeadIds);
                    setSelectedLeadIds([]);
                  }
                }}
                className="rounded-lg border border-red-200 bg-white px-3 py-1.5 font-semibold text-red-600 hover:bg-red-50 dark:border-red-900/50 dark:bg-gray-900 dark:text-red-400 transition"
              >
                Eliminar
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Tabla de Directorio 360 */}
      <ComponentCard
        title={t("prospectsRegistered", { count: filteredLeads.length })}
        desc={t("prospectsRegisteredDesc")}
      >
        {!isLoaded ? (
          <p className="text-xs text-gray-400 py-4">{t("loadingProspects")}</p>
        ) : filteredLeads.length === 0 ? (
          <p className="text-xs text-gray-400 py-8 text-center">
            {t("noProspectsFound")}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-gray-200 text-xs leading-5 font-medium tracking-wider uppercase text-gray-400 [&_th]:font-semibold dark:border-gray-800">
                <tr>
                  <th className="pb-3 w-[34px] pr-2">
                    <input
                      type="checkbox"
                      checked={allFilteredSelected}
                      onChange={toggleSelectAllFiltered}
                      aria-label="Seleccionar todos"
                      className="h-4 w-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500 cursor-pointer"
                    />
                  </th>
                  <th className="pb-3 w-[210px] min-w-[195px] pr-5">{t("colProspect")}</th>
                  <th className="pb-3 w-[240px] min-w-[210px] pr-6">{t("colJob")}</th>
                  <th className="pb-3 w-[170px] min-w-[155px] pr-6 whitespace-nowrap">{t("colSignalSource")}</th>
                  <th className="pb-3 w-[140px] min-w-[130px] pr-6 whitespace-nowrap text-left">{t("colScore")}</th>
                  <th className="pb-3 w-[125px] min-w-[115px] pr-6 whitespace-nowrap text-left">{t("colSequenceStatus")}</th>
                  <th className="pb-3 w-[135px] min-w-[130px] whitespace-nowrap text-right pr-1">{t("colActions")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 text-sm dark:divide-gray-800">
                {filteredLeads.map((lead) => {
                  const sequenceBadge = getSequenceBadge(lead.sequenceStatus);

                  return (
                    <tr key={lead.id} className="hover:bg-gray-50/50 dark:hover:bg-white/2 transition">
                      {/* Checkbox selección múltiple */}
                      <td className="py-3.5 pr-2 w-[34px]">
                        <input
                          type="checkbox"
                          checked={selectedLeadIds.includes(lead.id)}
                          onChange={() => toggleSelectOne(lead.id)}
                          aria-label={`Seleccionar ${lead.fullName}`}
                          className="h-4 w-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500 cursor-pointer"
                        />
                      </td>
                      {/* Columna: Prospecto */}
                      <td className="py-3.5 pr-5 w-[210px] min-w-[195px]">
                        <div className="flex items-center gap-3">
                          <ProspectAvatar
                            imageUrl={lead.avatarUrl}
                            name={lead.fullName}
                            size="md"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <h4 className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                                {lead.fullName}
                              </h4>
                              <LeadLanguageBadge language={lead.language} />
                            </div>
                            <p className="text-xs text-gray-400 truncate mt-0.5">
                              {lead.location && !/no especificado/i.test(lead.location)
                                ? lead.location
                                : "Remoto"}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Columna: Cargo (Truncado estético con ... y tooltip nativo) */}
                      <td className="py-3.5 pr-6 w-[240px] min-w-[210px]">
                        <p
                          className="text-sm font-medium text-gray-700 dark:text-gray-200 truncate leading-snug cursor-help"
                          title={lead.title}
                        >
                          {truncateText(lead.title, 50)}
                        </p>
                      </td>

                      {/* Columna: Origen de Señal */}
                      <td className="py-3.5 pr-6 w-[170px] min-w-[155px] whitespace-nowrap">
                        <span
                          className="rounded-lg bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-700 dark:bg-brand-950 dark:text-brand-300 inline-block max-w-[145px] truncate align-middle border border-brand-100 dark:border-brand-900/40"
                          title={getLocalizedSignalSource(lead.signalSource)}
                        >
                          {truncateText(getLocalizedSignalSource(lead.signalSource), 24)}
                        </span>
                      </td>

                      {/* Columna: Puntuación */}
                      <td className="py-3.5 pr-6 w-[140px] min-w-[130px] whitespace-nowrap text-left">
                        <LeadScoreBadge score={lead.intentScore} />
                      </td>

                      {/* Columna: Estado Secuencia */}
                      <td className="py-3.5 pr-6 w-[125px] min-w-[115px] whitespace-nowrap text-left">
                        <span className={`rounded-full px-3 py-1 text-xs font-semibold inline-flex items-center justify-center ${sequenceBadge.color}`}>
                          {sequenceBadge.label}
                        </span>
                      </td>

                      {/* Columna: Acciones (Ficha y Chat) */}
                      <td className="py-3.5 pl-1 pr-1 w-[135px] min-w-[130px] text-right whitespace-nowrap space-x-1.5">
                        <button
                          type="button"
                          onClick={() => setSelectedLeadFor360(lead)}
                          className="rounded-lg border border-brand-500 px-2.5 py-1 text-xs font-semibold text-brand-600 hover:bg-brand-50 dark:text-brand-400 dark:hover:bg-brand-950/20 transition shadow-2xs"
                          title={t("viewDetails")}
                        >
                          {t("actionRecord")}
                        </button>
                        <Link
                          href={`/inbox?leadName=${encodeURIComponent(lead.fullName)}`}
                          className="rounded-lg border border-gray-300 px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 transition"
                          title={t("openChatInInbox")}
                        >
                          {t("actionChat")}
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </ComponentCard>

      {/* Modal Interactivo: Ficha del Contacto */}
      {selectedLeadFor360 && (
        <div className="fixed inset-0 z-99999 flex items-center justify-center bg-black/60 p-4">
          <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto custom-scrollbar rounded-lg bg-white p-6 shadow-theme-xl dark:bg-gray-900 border border-gray-300 dark:border-gray-800 space-y-4">
            {/* Cabecera de la Ficha */}
            <div className="flex items-start justify-between border-b border-gray-300 pb-4 dark:border-gray-800 gap-3">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <ProspectAvatar
                  imageUrl={selectedLeadFor360.avatarUrl}
                  name={selectedLeadFor360.fullName}
                  size="xl"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-gray-900 dark:text-white truncate">
                      {selectedLeadFor360.fullName}
                    </h3>
                    <LeadLanguageBadge language={selectedLeadFor360.language} />
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {selectedLeadFor360.company && !/no especificado/i.test(selectedLeadFor360.company)
                      ? `${selectedLeadFor360.company} • `
                      : ""}
                    {selectedLeadFor360.location && !/no especificado/i.test(selectedLeadFor360.location)
                      ? selectedLeadFor360.location
                      : "Remoto"}
                  </p>
                  {selectedLeadFor360.linkedinUrl && (
                    <a
                      href={selectedLeadFor360.linkedinUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-brand-600 hover:underline dark:text-brand-400 font-semibold inline-flex items-center gap-1 mt-0.5"
                    >
                      Ver Perfil en LinkedIn &rarr;
                    </a>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedLeadFor360(null)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 font-bold p-1 text-sm rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 shrink-0"
                title={t("closeRecord")}
              >
                ✕ {t("close")}
              </button>
            </div>

            {/* Titular Profesional y Cargo Completo (LinkedIn Headline íntegro) */}
            <div className="rounded-lg border border-purple-200 bg-purple-25/50 p-4 dark:border-purple-900/50 dark:bg-purple-950/20">
              <span className="text-xs leading-5 font-normal tracking-normal uppercase text-gray-400 block mb-1">
                {t("fullTitleLinkedIn")}
              </span>
              <p className="text-xs font-semibold text-gray-900 dark:text-white leading-relaxed">
                {selectedLeadFor360.title}
              </p>
            </div>

            {/* Datos de Contacto y Estado Rápido */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 bg-gray-50 rounded-lg dark:bg-gray-800/50 text-xs">
              <div>
                <span className="text-xs leading-5 font-normal tracking-normal text-gray-400 uppercase block">{t("corporateEmail")}</span>
                <span className="font-semibold text-gray-800 dark:text-gray-200">
                  {selectedLeadFor360.email || t("notAvailable")}
                </span>
              </div>
              <div>
                <span className="text-xs leading-5 font-normal tracking-normal text-gray-400 uppercase block">{t("phone")}</span>
                <span className="font-semibold text-gray-800 dark:text-gray-200">
                  {selectedLeadFor360.phone || "No disponible"}
                </span>
              </div>
              <div>
                <span className="text-xs leading-5 font-normal tracking-normal text-gray-400 uppercase block mb-1">{t("intentScore")}</span>
                <LeadScoreBadge score={selectedLeadFor360.intentScore} size="md" />
              </div>
            </div>

            {/* Configuración Rápida de Etapa y Secuencia */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 border border-gray-300 rounded-lg dark:border-gray-800">
              <div>
                <label className="block text-xs leading-5 font-normal tracking-normal uppercase text-gray-400 mb-1">
                  {t("pipelineStage")}
                </label>
                <select
                  value={selectedLeadFor360.stage}
                  onChange={(e) => {
                    const nextStage = e.target.value as CrmStage;
                    updateLeadStage(selectedLeadFor360.id, nextStage);
                    setSelectedLeadFor360({
                      ...selectedLeadFor360,
                      stage: nextStage,
                    });
                  }}
                  className="w-full rounded-lg border border-gray-300 p-2 text-xs font-semibold text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                >
                  <option value="lead_captured">{t("stageLeadCaptured")}</option>
                  <option value="in_sequence">{t("stageInSequence")}</option>
                  <option value="connected_material_sent">{t("stageMaterialSent")}</option>
                  <option value="active_conversation">{t("stageActiveConversation")}</option>
                  <option value="meeting_scheduled">{t("stageMeetingScheduled")}</option>
                  <option value="proposal_presented">{t("stageProposalPresented")}</option>
                  <option value="closed_won">{t("stageClosedWon")}</option>
                  <option value="closed_lost">{t("stageClosedLost")}</option>
                </select>
              </div>

              <div>
                <label className="block text-xs leading-5 font-normal tracking-normal uppercase text-gray-400 mb-1">
                  {t("sequenceStatus")}
                </label>
                <select
                  value={selectedLeadFor360.sequenceStatus}
                  onChange={(e) => {
                    const nextStatus = e.target.value as SequenceStatus;
                    updateLeadSequenceStatus(selectedLeadFor360.id, nextStatus);
                    setSelectedLeadFor360({
                      ...selectedLeadFor360,
                      sequenceStatus: nextStatus,
                    });
                  }}
                  className="w-full rounded-lg border border-gray-300 p-2 text-xs font-semibold text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                >
                  <option value="in_progress">{t("seqInProgress")}</option>
                  <option value="replied">{t("seqReplied")}</option>
                  <option value="paused">{t("seqPaused")}</option>
                  <option value="completed">{t("seqCompleted")}</option>
                </select>
              </div>
            </div>

            {/* Historial Cronológico de Flujo (Timeline) */}
            <div>
              <h4 className="text-xs leading-5 font-normal tracking-normal uppercase text-gray-400 mb-3">
                {t("flowTimeline")}
              </h4>
              <div className="space-y-3 border-l-2 border-brand-500/50 pl-4 ml-2">
                {selectedLeadFor360.timeline.map((event) => (
                  <div key={event.id} className="relative space-y-1">
                    <span className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-brand-500"></span>
                    <div className="flex items-center justify-between">
                      <h5 className="text-xs font-bold text-gray-900 dark:text-white">
                        {event.title}
                      </h5>
                      <span className="text-xs text-gray-400">{event.timestamp}</span>
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
                      {event.detail}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Botones de Acción */}
            <div className="flex items-center justify-between pt-4 border-t border-gray-300 dark:border-gray-800">
              <button
                type="button"
                onClick={() => {
                  deleteLead(selectedLeadFor360.id);
                  setSelectedLeadFor360(null);
                }}
                className="rounded-lg border border-red-200 px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50 dark:border-red-900/50 dark:text-red-400"
              >
                {t("deleteProspect")}
              </button>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedLeadFor360(null)}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300"
                >
                  {t("close")}
                </button>
                <Link
                  href={`/inbox?leadName=${encodeURIComponent(selectedLeadFor360.fullName)}`}
                  className="rounded-lg bg-brand-500 px-4 py-2 text-xs font-semibold text-white hover:bg-brand-600 transition"
                >
                  {t("openChatInInbox")}
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Nuevo Lead Manual */}
      {isAddingManualLead && (
        <div className="fixed inset-0 z-99999 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-lg rounded-lg bg-white p-6 shadow-theme-xl dark:bg-gray-900 border border-gray-300 dark:border-gray-800 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-300 pb-3 dark:border-gray-800">
              <h3 className="text-base font-bold text-gray-900 dark:text-white">
                Agregar Prospecto Manualmente
              </h3>
              <button
                type="button"
                onClick={() => setIsAddingManualLead(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 font-bold p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateManualLead} className="space-y-3 text-xs">
              <div>
                <label className="block uppercase text-gray-400 mb-1">Nombre completo *</label>
                <input
                  type="text"
                  required
                  value={manualFullName}
                  onChange={(e) => setManualFullName(e.target.value)}
                  placeholder="Ej. Laura Mendoza"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block uppercase text-gray-400 mb-1">Cargo / Titular</label>
                  <input
                    type="text"
                    value={manualTitle}
                    onChange={(e) => setManualTitle(e.target.value)}
                    placeholder="Ej. Head of Growth"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block uppercase text-gray-400 mb-1">Empresa</label>
                  <input
                    type="text"
                    value={manualCompany}
                    onChange={(e) => setManualCompany(e.target.value)}
                    placeholder="Ej. ScaleFlow B2B"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block uppercase text-gray-400 mb-1">Ubicación</label>
                  <input
                    type="text"
                    value={manualLocation}
                    onChange={(e) => setManualLocation(e.target.value)}
                    placeholder="Ej. Madrid, España"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block uppercase text-gray-400 mb-1">Email corporativo</label>
                  <input
                    type="email"
                    value={manualEmail}
                    onChange={(e) => setManualEmail(e.target.value)}
                    placeholder="laura@empresa.com"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  />
                </div>
              </div>
              <div>
                <label className="block uppercase text-gray-400 mb-1">URL de LinkedIn</label>
                <input
                  type="url"
                  value={manualLinkedinUrl}
                  onChange={(e) => setManualLinkedinUrl(e.target.value)}
                  placeholder="https://www.linkedin.com/in/..."
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block uppercase text-gray-400 mb-1">Idioma</label>
                  <select
                    value={manualLanguage}
                    onChange={(e) => setManualLanguage(e.target.value as "es" | "pt" | "en")}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  >
                    <option value="es">Español (ES)</option>
                    <option value="pt">Portugués (PT)</option>
                    <option value="en">Inglés (EN)</option>
                  </select>
                </div>
                <div>
                  <label className="block uppercase text-gray-400 mb-1">Lista destino</label>
                  <select
                    value={manualListId}
                    onChange={(e) => setManualListId(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  >
                    <option value="">Alta Manual CRM (sin lista)</option>
                    {lists.map((lg) => (
                      <option key={lg.id} value={lg.id}>
                        {lg.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-gray-300 dark:border-gray-800">
                <button
                  type="button"
                  onClick={() => setIsAddingManualLead(false)}
                  className="rounded-lg border border-gray-300 px-4 py-2 font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300"
                >
                  {t("cancel")}
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-brand-500 px-5 py-2 font-semibold text-white hover:bg-brand-600 transition"
                >
                  Guardar Lead
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
