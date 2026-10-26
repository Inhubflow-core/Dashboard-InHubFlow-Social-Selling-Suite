"use client";

import ComponentCard from "@/components/common/ComponentCard";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import ProspectAvatar from "@/components/leads/ProspectAvatar";
import LeadScoreBadge from "@/components/leads/LeadScoreBadge";
import { exportLeadsToCsv, useLeadsStore } from "@/lib/leads/store";
import { useSignalRadar } from "@/lib/signals/store";
import type { CrmStage, Lead360Item, SequenceStatus } from "@/lib/leads/types";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";

const truncateText = (text?: string, maxLength: number = 48): string => {
  if (!text) return "";
  const clean = text.trim();
  if (clean.length <= maxLength) return clean;
  return `${clean.slice(0, maxLength).trimEnd()}...`;
};

export default function DynamicListDetailPage() {
  const t = useTranslations("leads");
  const params = useParams();
  const router = useRouter();
  const listId = Array.isArray(params?.id) ? params.id[0] : (params?.id as string) || "";

  const {
    lists,
    leads,
    isLoaded,
    deleteList,
    deleteLead,
    updateLeadStage,
    updateLeadSequenceStatus,
    batchUpdateLeadPhotos,
  } = useLeadsStore();
  const { l1Monitors, l2Monitors, l3GroupMonitors, l4GlobalMonitors } = useSignalRadar();

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStageFilter, setSelectedStageFilter] = useState<string>("all");
  const [selectedLeadFor360, setSelectedLeadFor360] = useState<Lead360Item | null>(null);

  // Auto-sync de fotos oficiales de LinkedIn en segundo plano (estilo #b2b)
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
        targets: leadsToEnrich.map((l) => ({
          id: l.id,
          linkedinUrl: l.linkedinUrl,
          fullName: l.fullName,
          competitorName: currentList?.competitorName || l.company || l.signalSource,
          listName: currentList?.name || l.listName,
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

  // Encontrar la lista por id o por sourceMonitorId
  const currentList = useMemo(() => {
    if (!listId) return null;
    return (
      lists.find((l) => l.id === listId) ||
      lists.find((l) => l.sourceMonitorId === listId) ||
      null
    );
  }, [lists, listId]);

  const isMonitorDeleted = useMemo(() => {
    if (!currentList) return false;
    if (currentList.isMonitorDeleted) return true;
    if (!currentList.signalLevel && !currentList.sourceMonitorId && !currentList.competitorName && !currentList.groupName) return false;

    if (currentList.signalLevel === "level_3") {
      const exists = l3GroupMonitors.some(
        (m) =>
          (currentList.sourceMonitorId && m.id === currentList.sourceMonitorId) ||
          (currentList.groupName && m.groupName.trim().toLowerCase() === currentList.groupName.trim().toLowerCase()) ||
          (currentList.name && m.groupName.trim().toLowerCase() === currentList.name.trim().toLowerCase())
      );
      return !exists;
    }

    if (currentList.signalLevel === "level_2") {
      const exists = l2Monitors.some(
        (m) =>
          (currentList.sourceMonitorId && m.id === currentList.sourceMonitorId) ||
          (currentList.competitorName && m.competitorName.trim().toLowerCase() === currentList.competitorName.trim().toLowerCase()) ||
          (currentList.name && m.competitorName.trim().toLowerCase() === currentList.name.trim().toLowerCase())
      );
      return !exists;
    }

    if (currentList.signalLevel === "level_1") {
      const exists = l1Monitors.some(
        (m) =>
          (currentList.sourceMonitorId && m.id === currentList.sourceMonitorId) ||
          (currentList.name && m.postTitle.trim().toLowerCase() === currentList.name.trim().toLowerCase())
      );
      return !exists;
    }

    if (currentList.signalLevel === "level_4") {
      const exists = l4GlobalMonitors.some(
        (m) =>
          (currentList.sourceMonitorId && m.id === currentList.sourceMonitorId) ||
          (currentList.name && m.searchQuery.trim().toLowerCase() === currentList.name.trim().toLowerCase())
      );
      return !exists;
    }

    return false;
  }, [currentList, l1Monitors, l2Monitors, l3GroupMonitors, l4GlobalMonitors]);

  // Prospectos pertenecientes a esta lista
  const listLeads = useMemo(() => {
    if (!currentList) return [];
    return leads.filter((l) => {
      const matchesDirect = l.listId === currentList.id;
      const targetComp = currentList.competitorName ? currentList.competitorName.trim().toLowerCase() : null;
      const matchesMonitor = Boolean(currentList.sourceMonitorId && (l as any).monitorId === currentList.sourceMonitorId);
      const matchesCompetitor =
        targetComp &&
        ((l.company && l.company.trim().toLowerCase() === targetComp) ||
          (l.signalSource && l.signalSource.trim().toLowerCase() === `signal: ${targetComp}`));

      const inList = matchesDirect || matchesMonitor || Boolean(matchesCompetitor);
      if (!inList) return false;

      const matchesSearch =
        !searchTerm.trim() ||
        l.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        l.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
        l.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        l.location.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStage =
        selectedStageFilter === "all" || l.stage === selectedStageFilter;

      return matchesSearch && matchesStage;
    });
  }, [leads, currentList, searchTerm, selectedStageFilter]);

  const handleDeleteThisList = () => {
    if (!currentList) return;
    const count = listLeads.length;
    const confirmed = window.confirm(
      t("deleteListConfirm", { name: currentList.name, count })
    );
    if (confirmed) {
      deleteList(currentList.id);
      router.push("/leads/lists");
    }
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

  if (!isLoaded) {
    return (
      <div className="py-12 text-center text-xs text-gray-400">
        {t("loadingListAndLeads")}
      </div>
    );
  }

  if (!currentList) {
    return (
      <div className="space-y-4">
        <PageBreadcrumb pageTitle={t("listNotFound")} />
        <div className="p-8 text-center rounded-lg bg-white border border-gray-300 dark:bg-gray-900 dark:border-gray-800 space-y-3">
          <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
            La lista solicitada no existe o fue eliminada.
          </p>
          <Link
            href="/leads/lists"
            className="inline-block rounded-lg bg-brand-500 px-4 py-2 text-xs font-semibold text-white hover:bg-brand-600 transition"
          >
            {t("backToLists")}
          </Link>
        </div>
      </div>
    );
  }

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

  const getLocalizedDescription = (desc?: string, list?: any) => {
    if (!desc) return "";
    if (desc.includes("Lista inteligente auto-alimentada por publicaciones") || desc.includes("Smart list auto-fed by global")) {
      const topic = list?.name?.replace(/^\[signal\s*n[1-4]\]\s*/i, "").split(" • ")[0].trim() || "";
      return t("autoDescGlobal", { topic });
    }
    if (desc.includes("alimentada por monitores de señales") || desc.includes("powered by buying intent monitors")) {
      return t("listDescFallback");
    }
    return desc;
  };

  const cleanListName =
    currentList?.competitorName?.trim() ||
    currentList?.name.replace(/^\[signal\s*n[1-3]\]\s*/i, "").split(" • ")[0].trim() ||
    t("dynamicListDefault");

  return (
    <div className="w-full space-y-6">
      <PageBreadcrumb pageTitle={`Lista: ${cleanListName}`} />

      {/* Cabecera de la Lista Dinámica con acciones y métricas */}
      <div className="w-full px-6 py-5 rounded-lg bg-white border border-gray-300 dark:bg-gray-900 dark:border-gray-800 shadow-theme-xs">
        <div className="mb-3">
          <Link
            href="/leads/lists"
            className="text-xs font-semibold text-brand-600 hover:underline dark:text-brand-400 inline-flex items-center gap-1"
          >
            {t("backToLists")}
          </Link>
        </div>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1.5 max-w-2xl">
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider ${
                  currentList.signalLevel === "level_1"
                    ? "bg-brand-50 text-brand-600 dark:bg-brand-950 dark:text-brand-300"
                    : currentList.signalLevel === "level_2"
                    ? "bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300"
                    : currentList.signalLevel === "level_3"
                    ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                    : "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                }`}
              >
                {currentList.signalLevel === "level_1"
                  ? "Nivel 1: Mis Posts"
                  : currentList.signalLevel === "level_2"
                  ? "Nivel 2: Competencia"
                  : currentList.signalLevel === "level_3"
                  ? "Nivel 3: Grupos"
                  : "Nivel 4: Global"}
              </span>

              {isMonitorDeleted ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-red-50 text-red-600 dark:bg-red-950/60 dark:text-red-400 px-2.5 py-0.5 text-xs font-bold border border-red-200 dark:border-red-900/60 shadow-2xs">
                  <span className="size-1.5 rounded-full bg-red-500"></span>
                  {t("monitorDeletedBadge")}
                </span>
              ) : (
                <span className="rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 px-2 py-0.5 text-xs font-bold border border-emerald-200 dark:border-emerald-800">
                  Segmento Activo
                </span>
              )}

              <span className="text-xs font-bold text-brand-600 dark:text-brand-400">
                {t("prospectsCount", { count: listLeads.length })}
              </span>
            </div>

            <h2 className="text-base font-medium text-gray-800 dark:text-white/90">
              {cleanListName}
            </h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {getLocalizedDescription(currentList.description, currentList) || t("listDescFallback")}
            </p>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-2 text-xs text-gray-500 dark:text-gray-400">
              <div>
                <span className="text-gray-400">{t("originLabel")}</span>{" "}
                <span className="font-semibold text-gray-700 dark:text-gray-300">
                  {getLocalizedSignalSource(currentList.signalSource)}
                </span>
              </div>
              {currentList.competitorName && (
                <div>
                  <span className="text-gray-400">{t("competitor")}</span>{" "}
                  <span className="font-semibold text-purple-700 dark:text-purple-300">
                    {currentList.competitorName}
                  </span>
                </div>
              )}
              {currentList.keywords && currentList.keywords.length > 0 && (
                <div className="flex items-center gap-1">
                  <span className="text-gray-400">{t("filters")}</span>
                  {currentList.keywords.map((kw, i) => (
                    <span
                      key={i}
                      className="rounded-lg bg-gray-100 dark:bg-gray-800 px-1.5 py-0.2 text-xs font-medium text-gray-700 dark:text-gray-300"
                    >
                      {kw}
                    </span>
                  ))}
                </div>
              )}
              <div>
                <span className="text-gray-400">{t("campaignLabel")}</span>{" "}
                <span className="font-semibold text-brand-600 dark:text-brand-400">
                  {currentList.assignedCampaign}
                </span>
              </div>
            </div>
          </div>

          {/* Botones de acción principal de la lista */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => exportLeadsToCsv(listLeads)}
              disabled={listLeads.length === 0}
              className="rounded-lg border border-gray-300 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 disabled:opacity-40 transition"
              title={t("exportListCsvTooltip")}
            >
              {t("exportListCsv", { count: listLeads.length })}
            </button>

            <Link
              href={`/campaigns?listId=${currentList.id}${currentList.competitorName ? `&competitor=${encodeURIComponent(currentList.competitorName)}` : ""}`}
              className="rounded-lg bg-brand-500 px-4 py-2 text-xs font-semibold text-white hover:bg-brand-600 transition shadow-2xs"
            >
              {t("launchCampaign")}
            </Link>

            <button
              type="button"
              onClick={handleDeleteThisList}
              className="rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 dark:border-red-900/40 dark:text-red-400 transition flex items-center gap-1"
              title={t("deleteListTooltip")}
            >
              <span>🗑</span>
              <span>{t("deleteListAction")}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Filtros Internos de la Lista */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 bg-white rounded-lg border border-gray-300 dark:bg-gray-900 dark:border-gray-800">
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
            value={selectedStageFilter}
            onChange={(e) => setSelectedStageFilter(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3.5 py-2 text-xs text-gray-800 focus:border-brand-500 focus:outline-hidden dark:border-gray-700 dark:bg-gray-800 dark:text-white"
          >
            <option value="all">{t("allFunnelStages")}</option>
            <option value="lead_captured">{t("stageLeadCaptured")}</option>
            <option value="in_sequence">{t("stageInSequence")}</option>
            <option value="connected_material_sent">{t("stageMaterialSent")}</option>
            <option value="active_conversation">{t("stageActiveConversation")}</option>
            <option value="meeting_scheduled">{t("stageMeetingScheduled")}</option>
            <option value="proposal_presented">{t("stageProposalPresented")}</option>
            <option value="closed_won">{t("stageClosedWon")}</option>
          </select>
        </div>
      </div>

      {/* Tabla Completa de Prospectos de la Lista (Estándar visual #b2b con fotos reales) */}
      <ComponentCard title={t("leadsInThisList", { count: listLeads.length })}>
        {listLeads.length === 0 ? (
          <div className="py-12 text-center text-xs text-gray-400 space-y-2">
            <p className="font-semibold text-gray-600 dark:text-gray-300">
              {t("noLeadsFiltered")}
            </p>
            <p className="text-xs text-gray-400">
              {t("noLeadsFilteredSub")}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-gray-300 text-xs leading-5 font-normal tracking-normal uppercase text-gray-400 [&_th]:font-normal dark:border-gray-800">
                <tr>
                  <th className="pb-3 min-w-[190px]">{t("colProspect")}</th>
                  <th className="pb-3 min-w-[210px] max-w-[270px]">{t("colJob")}</th>
                  <th className="pb-3 min-w-[140px] whitespace-nowrap">{t("colSignalSource")}</th>
                  <th className="pb-3 min-w-[90px] whitespace-nowrap text-center">{t("colScore")}</th>
                  <th className="pb-3 min-w-[130px] whitespace-nowrap">{t("colCrmStage")}</th>
                  <th className="pb-3 min-w-[110px] whitespace-nowrap">{t("colSequenceStatus")}</th>
                  <th className="pb-3 min-w-[140px] whitespace-nowrap text-right">{t("colActions")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-300 text-xs dark:divide-gray-800">
                {listLeads.map((lead) => {
                  const stageBadge = getStageLabel(lead.stage);
                  const sequenceBadge = getSequenceBadge(lead.sequenceStatus);

                  return (
                    <tr key={lead.id} className="hover:bg-gray-50/50 dark:hover:bg-white/2 transition">
                      {/* Columna: Prospecto con Foto de Perfil */}
                      <td className="py-3.5 pr-3 min-w-[200px]">
                        <div className="flex items-center gap-3">
                          <ProspectAvatar
                            imageUrl={lead.avatarUrl}
                            name={lead.fullName}
                            size="md"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <h4 className="font-semibold text-gray-900 dark:text-white truncate">
                                {lead.fullName}
                              </h4>
                              {lead.language && (
                                <span
                                  className={`rounded-lg px-1.5 py-0.2 text-xs font-bold border shrink-0 ${
                                    lead.language === "en"
                                      ? "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800"
                                      : lead.language === "pt"
                                      ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800"
                                      : "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800"
                                  }`}
                                  title={`Idioma: ${lead.language.toUpperCase()}`}
                                >
                                  {lead.language.toUpperCase()}
                                </span>
                              )}
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
                      <td className="py-3.5 pr-3 max-w-[270px]">
                        <p
                          className="font-medium text-gray-800 dark:text-gray-200 text-xs truncate leading-snug cursor-help"
                          title={lead.title}
                        >
                          {truncateText(lead.title, 48)}
                        </p>
                      </td>

                      {/* Columna: Origen de Señal */}
                      <td className="py-3.5 pr-2 whitespace-nowrap">
                        <span
                          className="rounded-lg bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-700 dark:bg-brand-950 dark:text-brand-300 inline-block max-w-[170px] truncate align-middle border border-brand-100 dark:border-brand-900/40"
                          title={lead.signalSource}
                        >
                          {truncateText(lead.signalSource, 26)}
                        </span>
                      </td>

                      {/* Columna: Puntuación */}
                      <td className="py-3.5 px-2 whitespace-nowrap text-center">
                        <LeadScoreBadge score={lead.intentScore} />
                      </td>

                      {/* Columna: Etapa CRM */}
                      <td className="py-3.5 pr-2 whitespace-nowrap">
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold inline-block ${stageBadge.color}`}>
                          {stageBadge.label}
                        </span>
                      </td>

                      {/* Columna: Estado Secuencia */}
                      <td className="py-3.5 pr-2 whitespace-nowrap">
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold inline-block ${sequenceBadge.color}`}>
                          {sequenceBadge.label}
                        </span>
                      </td>

                      {/* Columna: Acciones */}
                      <td className="py-3.5 text-right whitespace-nowrap space-x-1.5">
                        <button
                          type="button"
                          onClick={() => setSelectedLeadFor360(lead)}
                          className="rounded-lg border border-brand-500 px-2.5 py-1 text-xs font-semibold text-brand-600 hover:bg-brand-50 dark:text-brand-400 dark:hover:bg-brand-950/20 transition shadow-2xs"
                          title={t("viewDetails")}
                        >
                          {t("actionRecord")}
                        </button>
                        <a
                          href="/inbox"
                          className="rounded-lg border border-gray-300 px-2.5 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 transition"
                          title={t("openChatInInbox")}
                        >
                          {t("actionChat")}
                        </a>
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
          <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-lg bg-white p-6 shadow-theme-xl dark:bg-gray-900 border border-gray-300 dark:border-gray-800 space-y-4">
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
                    {selectedLeadFor360.language && (
                      <span
                        className={`rounded-lg px-1.5 py-0.5 text-xs font-bold border shrink-0 ${
                          selectedLeadFor360.language === "en"
                            ? "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800"
                            : selectedLeadFor360.language === "pt"
                            ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800"
                            : "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800"
                        }`}
                        title={`Idioma detectado: ${selectedLeadFor360.language.toUpperCase()}`}
                      >
                        {selectedLeadFor360.language.toUpperCase()}
                      </span>
                    )}
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
                  {selectedLeadFor360.phone || t("notAvailable")}
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
                  {t("pipelineStageHeader")}
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
                  {t("sequenceStatusHeader")}
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
                {selectedLeadFor360.timeline?.map((event) => (
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

            {/* Botones de Acción del Modal */}
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
                <a
                  href="/inbox"
                  className="rounded-lg bg-brand-500 px-4 py-2 text-xs font-semibold text-white hover:bg-brand-600 transition"
                >
                  {t("openChatInInbox")}
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
