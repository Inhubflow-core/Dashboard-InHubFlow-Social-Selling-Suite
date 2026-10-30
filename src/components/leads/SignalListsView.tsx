"use client";

import ComponentCard from "@/components/common/ComponentCard";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { useLeadsStore } from "@/lib/leads/store";
import { useSignalRadar } from "@/lib/signals/store";
import type { LeadListGroup } from "@/lib/leads/types";
import { X } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";

export default function SignalListsView({
  onTabChange,
  hideBreadcrumb,
}: {
  onTabChange?: (tab: string) => void;
  hideBreadcrumb?: boolean;
} = {}) {
  const t = useTranslations("leads");
  const { lists, leads, isLoaded, createList, deleteList } = useLeadsStore();
  const { l1Monitors, l2Monitors, l3GroupMonitors, l4GlobalMonitors } = useSignalRadar();

  const [highlightedListId, setHighlightedListId] = useState<string | null>(null);

  const hasCheckedUrlRef = useRef(false);
  useEffect(() => {
    if (typeof window === "undefined" || !isLoaded || hasCheckedUrlRef.current) return;
    const params = new URLSearchParams(window.location.search);
    const lId = params.get("listId");
    const competitorParam = params.get("competitor");
    if (lId || competitorParam) {
      hasCheckedUrlRef.current = true;
      if (lId) setHighlightedListId(lId);
      let found = lists.find((l) => l.id === lId || l.sourceMonitorId === lId);
      if (!found && competitorParam) {
        const targetComp = competitorParam.trim().toLowerCase();
        found = lists.find(
          (l) =>
            (l.competitorName && l.competitorName.trim().toLowerCase() === targetComp) ||
            l.name.toLowerCase().startsWith(`[signal n2] ${targetComp}`)
        );
      }
      if (found) {
        setHighlightedListId(found.id);
      }
    }
  }, [isLoaded, lists]);

  const handleDeleteList = (list: LeadListGroup) => {
    const count = getRealLeadsCount(list);
    const confirmed = window.confirm(
      t("deleteListConfirm", { name: list.name, count })
    );
    if (confirmed) {
      deleteList(list.id);
    }
  };

  const [isCreatingList, setIsCreatingList] = useState(false);
  const [newListName, setNewListName] = useState("");
  const [newListDesc, setNewListDesc] = useState("");
  const [newSignalSource, setNewSignalSource] = useState("Post SISTEMA");
  const [newSignalLevel, setNewSignalLevel] = useState<"level_1" | "level_2" | "level_3" | "level_4">("level_1");
  const [newAssignedCampaign, setNewAssignedCampaign] = useState("01. Secuencia: Listas de Leads");

  const handleCreateList = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newListName.trim()) return;

    const newList: LeadListGroup = {
      id: `list-${Date.now()}`,
      name: newListName,
      description: newListDesc,
      signalSource: newSignalSource,
      signalLevel: newSignalLevel,
      leadsCount: 0,
      assignedCampaign: newAssignedCampaign,
      createdAt: new Date().toISOString(),
    };

    createList(newList);
    setIsCreatingList(false);
    setNewListName("");
    setNewListDesc("");
  };

  const getRealLeadsCount = (list: LeadListGroup) => {
    const targetComp = list.competitorName ? list.competitorName.trim().toLowerCase() : null;
    const matching = leads.filter(
      (l) =>
        l.listId === list.id ||
        (list.sourceMonitorId && (l as any).monitorId === list.sourceMonitorId) ||
        (targetComp && (
          (l.company && l.company.trim().toLowerCase() === targetComp) ||
          (l.signalSource && l.signalSource.trim().toLowerCase() === `signal: ${targetComp}`)
        ))
    );
    return matching.length > 0 ? matching.length : list.leadsCount;
  };

  const checkIsMonitorDeleted = useCallback(
    (list: LeadListGroup): boolean => {
      if (list.isMonitorDeleted) return true;
      if (!list.signalLevel && !list.sourceMonitorId && !list.competitorName && !list.groupName) return false;

      // Nivel 3: Grupos de LinkedIn
      if (list.signalLevel === "level_3") {
        const exists = l3GroupMonitors.some(
          (m) =>
            (list.sourceMonitorId && m.id === list.sourceMonitorId) ||
            (list.groupName && m.groupName.trim().toLowerCase() === list.groupName.trim().toLowerCase()) ||
            (list.name && m.groupName.trim().toLowerCase() === list.name.trim().toLowerCase())
        );
        return !exists;
      }

      // Nivel 2: Posts de la Competencia
      if (list.signalLevel === "level_2") {
        const exists = l2Monitors.some(
          (m) =>
            (list.sourceMonitorId && m.id === list.sourceMonitorId) ||
            (list.competitorName && m.competitorName.trim().toLowerCase() === list.competitorName.trim().toLowerCase()) ||
            (list.name && m.competitorName.trim().toLowerCase() === list.name.trim().toLowerCase())
        );
        return !exists;
      }

      // Nivel 1: Mis Propios Posts
      if (list.signalLevel === "level_1") {
        const exists = l1Monitors.some(
          (m) =>
            (list.sourceMonitorId && m.id === list.sourceMonitorId) ||
            (list.name && m.postTitle.trim().toLowerCase() === list.name.trim().toLowerCase())
        );
        return !exists;
      }

      // Nivel 4: Posts Globales en LinkedIn
      if (list.signalLevel === "level_4") {
        const exists = l4GlobalMonitors.some(
          (m) =>
            (list.sourceMonitorId && m.id === list.sourceMonitorId) ||
            (list.name && m.searchQuery.trim().toLowerCase() === list.name.trim().toLowerCase())
        );
        return !exists;
      }

      return false;
    },
    [l1Monitors, l2Monitors, l3GroupMonitors, l4GlobalMonitors]
  );

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

  const getLocalizedDescription = (desc?: string, list?: LeadListGroup) => {
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

  return (
    <div className="w-full space-y-6">
      {!hideBreadcrumb && <PageBreadcrumb pageTitle={t("listsPageTitle")} />}

      {/* Cabecera en formato estándar de Card */}
      <div className="w-full rounded-lg border border-gray-300 bg-white px-6 py-5 dark:border-gray-800 dark:bg-white/3">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-medium text-gray-800 dark:text-white/90">
              {t("listsCardTitle")}
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {t("listsCardDesc")}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <a
              href="/leads?tab=directory" onClick={(e) => { if (onTabChange) { e.preventDefault(); onTabChange("directory"); } }}
              className="rounded-lg border border-gray-300 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300"
            >
              {t("viewDirectory360")}
            </a>
            <button
              type="button"
              onClick={() => setIsCreatingList(!isCreatingList)}
              className="rounded-lg bg-brand-500 px-4 py-2 text-xs font-semibold text-white hover:bg-brand-600 transition"
            >
              {isCreatingList ? t("closeForm") : t("createListBtn")}
            </button>
          </div>
        </div>
      </div>

      {/* Formulario de Creación de Lista */}
      {isCreatingList && (
        <ComponentCard
          title={t("createListTitle")}
          desc={t("createListDesc")}
        >
          <form onSubmit={handleCreateList} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs leading-5 font-normal tracking-normal uppercase text-gray-400 mb-1">
                  {t("listNameLabel")}
                </label>
                <input
                  type="text"
                  required
                  value={newListName}
                  onChange={(e) => setNewListName(e.target.value)}
                  placeholder={t("listNamePlaceholder")}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs text-gray-800 focus:border-brand-500 focus:outline-hidden dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs leading-5 font-normal tracking-normal uppercase text-gray-400 mb-1">
                  {t("assignedCampaignLabel")}
                </label>
                <select
                  value={newAssignedCampaign}
                  onChange={(e) => setNewAssignedCampaign(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs text-gray-800 focus:border-brand-500 focus:outline-hidden dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                >
                  <option value="01. Secuencia: Listas de Leads">01. Secuencia: Listas de Leads</option>
                  <option value="02. Secuencia: Lead Magnet">02. Secuencia: Lead Magnet</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs leading-5 font-normal tracking-normal uppercase text-gray-400 mb-1">
                  {t("signalSourceLabel")}
                </label>
                <input
                  type="text"
                  value={newSignalSource}
                  onChange={(e) => setNewSignalSource(e.target.value)}
                  placeholder="Ej. Post SISTEMA (Lead Magnet)"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs text-gray-800 focus:border-brand-500 focus:outline-hidden dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs leading-5 font-normal tracking-normal uppercase text-gray-400 mb-1">
                  {t("signalLevelLabel")}
                </label>
                <select
                  value={newSignalLevel}
                  onChange={(e) => setNewSignalLevel(e.target.value as "level_1" | "level_2" | "level_4")}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs text-gray-800 focus:border-brand-500 focus:outline-hidden dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                >
                  <option value="level_1">{t("optionLevel1")}</option>
                  <option value="level_2">{t("optionLevel2")}</option>
                  <option value="level_4">{t("optionLevel4")}</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs leading-5 font-normal tracking-normal uppercase text-gray-400 mb-1">
                {t("listDescLabel")}
              </label>
              <textarea
                rows={2}
                value={newListDesc}
                onChange={(e) => setNewListDesc(e.target.value)}
                placeholder={t("listDescPlaceholder")}
                className="w-full rounded-lg border border-gray-300 p-2 text-xs text-gray-800 focus:border-brand-500 focus:outline-hidden dark:border-gray-700 dark:bg-gray-900 dark:text-white"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsCreatingList(false)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300"
              >
                {t("cancel")}
              </button>
              <button
                type="submit"
                className="rounded-lg bg-brand-500 px-5 py-2 text-xs font-semibold text-white hover:bg-brand-600 transition"
              >
                {t("saveList")}
              </button>
            </div>
          </form>
        </ComponentCard>
      )}

      {/* Lista de Tarjetas a lo Largo (Una debajo de otra) */}
      <div className="space-y-3">
        {!isLoaded ? (
          <p className="text-xs text-gray-400 py-4">{t("loadingLists")}</p>
        ) : lists.length === 0 ? (
          <div className="py-12 text-center text-xs text-gray-400">
            {t("noLists")}
          </div>
        ) : (
          lists.map((list) => {
            const count = getRealLeadsCount(list);
            const isHighlighted = highlightedListId === list.id;
            const isMonDeleted = checkIsMonitorDeleted(list);

            return (
              <div
                key={list.id}
                className={`w-full rounded-lg border p-4 sm:p-5 shadow-xs transition dark:bg-gray-900 ${
                  isHighlighted
                    ? "border-brand-500 ring-2 ring-brand-500/20 bg-brand-50/10 dark:border-brand-400 dark:bg-brand-950/20"
                    : "border-gray-300 bg-white hover:border-gray-300 dark:border-gray-800 dark:hover:border-gray-700"
                }`}
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  {/* Bloque Izquierdo: Badges, Nombre, Descripción y Metadatos */}
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider ${
                          list.signalLevel === "level_1"
                            ? "bg-brand-50 text-brand-600 dark:bg-brand-950 dark:text-brand-300"
                            : list.signalLevel === "level_2"
                            ? "bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300"
                            : list.signalLevel === "level_3"
                            ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                            : "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                        }`}
                      >
                        {list.signalLevel === "level_1"
                          ? t("badgeLevel1")
                          : list.signalLevel === "level_2"
                          ? t("badgeLevel2")
                          : list.signalLevel === "level_3"
                          ? t("badgeLevel3")
                          : t("badgeLevel4")}
                      </span>

                      {isMonDeleted && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-red-50 text-red-600 dark:bg-red-950/60 dark:text-red-400 px-2.5 py-0.5 text-xs font-bold border border-red-200 dark:border-red-900/60 shadow-2xs">
                          <span className="h-1.5 w-1.5 rounded-full bg-red-500"></span>
                          {t("monitorDeletedBadge")}
                        </span>
                      )}

                      {isHighlighted && (
                        <span className="rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 px-2 py-0.5 text-xs font-bold border border-emerald-200 dark:border-emerald-800">
                          {t("selectedList")}
                        </span>
                      )}

                      <h4 className="text-base font-medium text-gray-800 dark:text-white/90 truncate">
                        {list.competitorName?.trim() ||
                          list.groupName?.trim() ||
                          list.name.replace(/^\[signal\s*n[1-4]\]\s*/i, "").split(" • ")[0].trim()}
                      </h4>
                    </div>

                    {list.description && (
                      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 line-clamp-1">
                        {getLocalizedDescription(list.description, list)}
                      </p>
                    )}

                    {/* Metadatos horizontales inline */}
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
                      <div className="flex items-center gap-1.5">
                        <span className="text-gray-400 text-xs">{t("origin")}</span>
                        <span className="font-semibold text-gray-700 dark:text-gray-300">
                          {getLocalizedSignalSource(list.signalSource)}
                        </span>
                      </div>

                      {list.competitorName && (
                        <div className="flex items-center gap-1.5">
                          <span className="text-gray-400 text-xs">{t("competitor")}</span>
                          <span className="font-bold text-purple-700 dark:text-purple-300">
                            {list.competitorName}
                          </span>
                        </div>
                      )}

                      {list.groupName && (
                        <div className="flex items-center gap-1.5">
                          <span className="text-gray-400 text-xs">{t("group")}</span>
                          <span className="font-bold text-emerald-700 dark:text-emerald-300">
                            {list.groupName}
                          </span>
                        </div>
                      )}

                      {list.keywords && list.keywords.length > 0 && (
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-gray-400 text-xs">{t("filters")}</span>
                          {list.keywords.map((kw, i) => (
                            <span
                              key={i}
                              className="rounded-lg bg-gray-100 dark:bg-gray-800 px-2 py-0.5 text-xs font-medium text-gray-700 dark:text-gray-300"
                            >
                              {kw}
                            </span>
                          ))}
                        </div>
                      )}

                      {list.assignedCampaign && (
                        <div className="flex items-center gap-1.5">
                          <span className="text-gray-400 text-xs">{t("campaign")}</span>
                          <span className="font-semibold text-brand-600 dark:text-brand-400 truncate max-w-[240px]">
                            {list.assignedCampaign}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Bloque Derecho: Conteo de Leads y Botones de Acción */}
                  <div className="flex items-center justify-between gap-4 pt-3 border-t border-gray-300 dark:border-gray-800 lg:border-t-0 lg:pt-0 lg:justify-end shrink-0">
                    <div className="text-left lg:text-right px-2">
                      <span className="text-lg font-black text-brand-600 dark:text-brand-400 tracking-tight">
                        {count}
                      </span>
                      <span className="block text-xs leading-5 font-normal tracking-normal uppercase text-gray-400 -mt-0.5">
                        Leads
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Link
                        href={`/leads/lists/${list.id}`}
                        className="rounded-lg border border-gray-300 px-3.5 py-2 text-center text-xs font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 transition whitespace-nowrap"
                      >
                        {t("viewProspectsLink", { count })}
                      </Link>

                      <Link
                        href={`/campaigns?listId=${list.id}${list.competitorName ? `&competitor=${encodeURIComponent(list.competitorName)}` : ""}`}
                        className="rounded-lg bg-brand-500 px-4 py-2 text-xs font-semibold text-white hover:bg-brand-600 transition whitespace-nowrap shadow-xs"
                      >
                        {t("launchCampaign")}
                      </Link>

                      <button
                        type="button"
                        onClick={() => handleDeleteList(list)}
                        title={t("deleteListAction")}
                        className="h-[26px] w-[26px] rounded-lg border border-red-200 text-red-600 hover:bg-red-50 dark:border-red-900/40 dark:text-red-400 inline-flex items-center justify-center transition shrink-0"
                      >
                        <X className="size-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
