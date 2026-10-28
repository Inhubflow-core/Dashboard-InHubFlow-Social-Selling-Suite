"use client";

import ComponentCard from "@/components/common/ComponentCard";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { useSignalRadar } from "@/lib/signals/store";
import type { Level3GroupMonitor, ScannedCompetitorPost, SignalLeadItem } from "@/lib/signals/types";
import {
  getActiveAccountForUser,
  getVisibleAccountsForUser,
  accountMatchesUser,
} from "@/lib/unipile/store";
import { getOrCreateGroupMonitorList, useLeadsStore } from "@/lib/leads/store";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useTranslations } from "next-intl";
import { Pencil, X, Users, MessageSquare, ExternalLink, ChevronDown, ChevronUp } from "lucide-react";

export default function LinkedInGroupsSignalRadarView({
  hideBreadcrumb,
}: {
  hideBreadcrumb?: boolean;
} = {}) {
  const { currentUser } = useAuth();
  const t = useTranslations("signals.groups");
  const tCommon = useTranslations("signals.common");
  const { lists: leadLists, deleteList, markListMonitorAsDeleted } = useLeadsStore();
  const {
    l3GroupMonitors,
    leads,
    isLoaded,
    addLevel3GroupMonitor,
    updateLevel3GroupMonitor,
    deleteLevel3GroupMonitor,
    toggleLevel3GroupStatus,
    recordDiscoveredLeads,
  } = useSignalRadar();

  const [editingMonitor, setEditingMonitor] = useState<Level3GroupMonitor | null>(null);
  const [expandedGroupPosts, setExpandedGroupPosts] = useState<Record<string, boolean>>({});
  const [batchLeadLimit, setBatchLeadLimit] = useState<25 | 50 | 100>(50);
  const [selectedBatchSize, setSelectedBatchSize] = useState<Record<string, 25 | 50 | 100>>({});

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

  const router = useRouter();
  const { lists: allLeadLists, leads: crmLeads, importSignalLeads, getOrCreateGroupList } = useLeadsStore();

  const [isAddingGroup, setIsAddingGroup] = useState(false);
  const [isScanningId, setIsScanningId] = useState<string | null>(null);
  const [scanFeedback, setScanFeedback] = useState<{ type: "success" | "error"; text: string; listId?: string } | null>(null);

  // Form State
  const [groupName, setGroupName] = useState("");
  const [groupUrl, setGroupUrl] = useState("");
  const [topicsInput, setTopicsInput] = useState("Prospeccion en frio, Outbound B2B, Ventas");
  const [minCommentThreshold, setMinCommentThreshold] = useState<number>(5);
  const [trackComments, setTrackComments] = useState(true);
  const [trackLikes, setTrackLikes] = useState(true);
  const [outreachTemplate, setOutreachTemplate] = useState(
    "Hola {{first_name}}, vi tu aportacion en el debate del grupo {{group_name}} sobre {{topic}} y me parecio un punto clave. Me gustaria conectar por aqui."
  );

  const getGroupLeads = useCallback((monitorId: string, name?: string): SignalLeadItem[] => {
    const rawMatches = leads.filter(
      (l) =>
        l.monitorId === monitorId ||
        (name && l.sourceGroupName?.toLowerCase().trim() === name.toLowerCase().trim()) ||
        (name && l.sourceAuthorName?.toLowerCase().trim() === name.toLowerCase().trim())
    );
    const seen = new Set<string>();
    const unique: SignalLeadItem[] = [];
    for (const l of rawMatches) {
      const cleanUrl = (l.linkedinUrl || "").toLowerCase().trim();
      const cleanName = (l.fullName || "").toLowerCase().trim();
      const key = cleanUrl || cleanName;
      if (key && !seen.has(key)) {
        seen.add(key);
        unique.push(l);
      }
    }
    return unique;
  }, [leads]);

  const getEffectiveGroupLeadCount = useCallback(
    (group: { id: string; groupName: string; leadsIdentifiedCount: number }) => {
      const targetGroup = group.groupName.trim().toLowerCase();
      const targetList = allLeadLists.find(
        (l) =>
          l.sourceMonitorId === group.id ||
          l.id === `list-sig-n3-group-${group.id}` ||
          (l.groupName && l.groupName.trim().toLowerCase() === targetGroup) ||
          l.name.toLowerCase() === targetGroup
      );
      const groupLeads = getGroupLeads(group.id, group.groupName);
      const listMatchingLeads = targetList
        ? crmLeads.filter(
            (l) =>
              l.listId === targetList.id ||
              (l as any).monitorId === group.id ||
              (l.company && l.company.trim().toLowerCase() === targetGroup) ||
              (l.signalSource && l.signalSource.trim().toLowerCase().includes(targetGroup))
          )
        : [];
      const effectiveCount = Math.max(
        targetList?.leadsCount || 0,
        listMatchingLeads.length,
        group.leadsIdentifiedCount || 0,
        groupLeads.length
      );
      return {
        count: effectiveCount,
        targetList,
        targetListId: targetList?.id || `list-sig-n3-group-${group.id}`,
      };
    },
    [allLeadLists, crmLeads, getGroupLeads]
  );

  const totalGroupLeads = useMemo(() => {
    return l3GroupMonitors.reduce((acc, g) => {
      const { count } = getEffectiveGroupLeadCount(g);
      return acc + count;
    }, 0);
  }, [l3GroupMonitors, getEffectiveGroupLeadCount]);

  const handleAddGroup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupName.trim()) return;

    const parsedTopics = topicsInput
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    const interactions: ("comments" | "likes")[] = [];
    if (trackComments) interactions.push("comments");
    if (trackLikes) interactions.push("likes");

    const newMonitor: Level3GroupMonitor = {
      id: `mon-l3-group-${Date.now()}`,
      groupName: groupName.trim(),
      groupUrl: groupUrl.trim() || `https://www.linkedin.com/groups/${Date.now()}/`,
      topicsFilter: parsedTopics.length > 0 ? parsedTopics : ["Social Selling"],
      status: "active",
      interactionTypes: interactions.length > 0 ? interactions : ["comments"],
      minCommentThreshold,
      batchLeadLimit,
      outreachTemplate,
      leadsIdentifiedCount: 0,
      lastScanAt: "Recien creado",
      lastScanAtIso: new Date().toISOString(),
      scanFrequency: "daily",
      createdAt: new Date().toISOString(),
      lastScannedPosts: [],
    };

    addLevel3GroupMonitor(newMonitor);

    // Auto-crear lista inteligente vinculada
    getOrCreateGroupList({
      monitorId: newMonitor.id,
      groupName: newMonitor.groupName,
      topics: newMonitor.topicsFilter,
    });

    setIsAddingGroup(false);
    setGroupName("");
    setGroupUrl("");
    setScanFeedback({
      type: "success",
      text: t("feedbackActivated", { name: newMonitor.groupName }),
      listId: `list-sig-n3-group-${newMonitor.id}`,
    });
  };

  const handleScanGroup = async (group: Level3GroupMonitor, activeBatchSize?: 25 | 50 | 100) => {
    setIsScanningId(group.id);
    setScanFeedback(null);
    const limitToUse = activeBatchSize || selectedBatchSize[group.id] || group.batchLeadLimit || 50;

    try {
      const res = await fetch("/api/unipile/signals/groups/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountId: activeAccount?.id || "default",
          groupName: group.groupName,
          groupUrl: group.groupUrl,
          topicsFilter: group.topicsFilter,
          minCommentThreshold: group.minCommentThreshold || 0,
          batchLimit: limitToUse,
          interactionTypes: group.interactionTypes,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Fallo en el escaneo del grupo");
      }

      const discovered = data.discoveredLeads || [];
      const posts = data.scannedPosts || [];

      // Registrar leads en storage de signals
      const mappedSignals: SignalLeadItem[] = discovered.map((l: any) => ({
        ...l,
        monitorId: group.id,
        signalLevel: "level_3",
      }));
      recordDiscoveredLeads(mappedSignals);

      // Auto-sincronizar con CRM / Directorio de Leads
      const targetList = getOrCreateGroupList({
        monitorId: group.id,
        groupName: group.groupName,
        topics: group.topicsFilter,
      });

      importSignalLeads(targetList, mappedSignals);

      // Actualizar contador y posts del monitor
      const newTotal = (group.leadsIdentifiedCount || 0) + mappedSignals.length;
      updateLevel3GroupMonitor(group.id, {
        leadsIdentifiedCount: newTotal,
        lastScanAt: "Justo ahora",
        lastScanAtIso: new Date().toISOString(),
        lastScannedPosts: posts.length > 0 ? posts : group.lastScannedPosts,
      });

      setScanFeedback({
        type: "success",
        text: t("feedbackScanSuccess", { count: mappedSignals.length, name: group.groupName }),
        listId: targetList.id,
      });
    } catch (err: any) {
      console.error("Error escaneando grupo:", err);
      setScanFeedback({
        type: "error",
        text: err?.message || t("feedbackScanError"),
      });
    } finally {
      setIsScanningId(null);
    }
  };

  const currentDisplayName = activeAccount?.name || currentUser.name || "Cuenta Principal de LinkedIn";

  return (
    <div className="w-full space-y-6">
      {!hideBreadcrumb && <PageBreadcrumb pageTitle={t("pageBreadcrumb")} />}

      {/* Métricas del Nivel 3 */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-gray-300 bg-white p-5 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
            {t("kpiGroupsTitle")}
          </span>
          <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
            {t("kpiGroupsCount", { count: l3GroupMonitors.length })}
          </p>
          <span className="text-xs text-brand-600 font-semibold dark:text-brand-400">
            {t("kpiGroupsSub")}
          </span>
        </div>

        <div className="rounded-lg border border-gray-300 bg-white p-5 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
            {t("kpiLeadsTitle")}
          </span>
          <p className="mt-2 text-2xl font-bold text-brand-600 dark:text-brand-400">
            {t("kpiLeadsCount", { count: totalGroupLeads })}
          </p>
          <span className="text-xs text-green-600 font-semibold dark:text-green-400">
            {t("kpiLeadsSub")}
          </span>
        </div>

        <div className="rounded-lg border border-gray-300 bg-white p-5 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
            {t("kpiRateTitle")}
          </span>
          <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
            56.4%
          </p>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {t("kpiRateSub")}
          </span>
        </div>
      </div>

      {/* Explicación de la Estrategia */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-5 rounded-lg border border-gray-300 bg-white dark:border-gray-800 dark:bg-gray-900">
        <div>
          <h4 className="text-base font-medium text-gray-800 dark:text-white/90">
            {t("strategyTitle")}
          </h4>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 max-w-2xl">
            {t("strategyDesc")}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsAddingGroup(!isAddingGroup)}
          className="rounded-lg bg-brand-500 px-4 py-2.5 text-xs font-semibold text-white hover:bg-brand-600 transition"
        >
          {isAddingGroup ? t("toggleCloseForm") : t("toggleAddMonitor")}
        </button>
      </div>

      {/* Formulario para Agregar Grupo */}
      {isAddingGroup && (
        <ComponentCard
          title={t("formTitle")}
          desc={t("formDesc")}
        >
          <form onSubmit={handleAddGroup} className="space-y-4">
            {/* Fila 1: Nombre del Grupo y URL */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs leading-5 font-normal tracking-normal uppercase text-gray-400 mb-1">
                  {t("labelGroupName")}
                </label>
                <input
                  type="text"
                  required
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  placeholder={t("placeholderGroupName")}
                  className="h-10 w-full rounded-lg border border-gray-300 px-3 text-xs text-gray-800 focus:border-brand-500 focus:outline-hidden dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs leading-5 font-normal tracking-normal uppercase text-gray-400 mb-1">
                  URL del Grupo en LinkedIn
                </label>
                <input
                  type="url"
                  value={groupUrl}
                  onChange={(e) => setGroupUrl(e.target.value)}
                  placeholder={t("placeholderGroupUrl")}
                  className="h-10 w-full rounded-lg border border-gray-300 px-3 text-xs text-gray-800 focus:border-brand-500 focus:outline-hidden dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                />
              </div>
            </div>

            {/* Fila 2: Temáticas y Selector de Lote */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs leading-5 font-normal tracking-normal uppercase text-gray-400 mb-1">
                  {t("labelKeywords")}
                </label>
                <input
                  type="text"
                  value={topicsInput}
                  onChange={(e) => setTopicsInput(e.target.value)}
                  placeholder={t("placeholderKeywords")}
                  className="h-10 w-full rounded-lg border border-gray-300 px-3 text-xs text-gray-800 focus:border-brand-500 focus:outline-hidden dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs leading-5 font-normal tracking-normal uppercase text-gray-400 mb-1">
                  {t("labelBatchSize")}
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: 25, label: "25 Leads", tag: t("tagConservative") },
                    { value: 50, label: "50 Leads", tag: t("tagRecommended"), recommended: true },
                    { value: 100, label: "100 Leads", tag: t("tagVolume") },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setBatchLeadLimit(opt.value as 25 | 50 | 100)}
                      className={`p-2 rounded-lg border text-left transition ${
                        batchLeadLimit === opt.value
                          ? "border-brand-500 bg-brand-50/50 dark:bg-brand-950/30 ring-1 ring-brand-500"
                          : "border-gray-200 dark:border-gray-800 hover:border-gray-300"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-gray-900 dark:text-white">
                          {opt.label}
                        </span>
                        {opt.recommended && (
                          <span className="text-xs font-bold text-brand-700 bg-brand-100 dark:bg-brand-900/60 dark:text-brand-300 px-1 rounded-lg">
                            {t("tractionOptimal")}
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-gray-500 dark:text-gray-400 block mt-0.5">
                        {opt.tag}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Fila 3: Filtro de Tracción y Tipos de Interacción */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col justify-center p-3.5 rounded-lg border border-gray-300 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50">
                <span className="text-xs font-semibold text-gray-800 dark:text-gray-200 block mb-1.5">
                  {t("labelInteractions")}
                </span>
                <div className="flex items-center gap-5">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-gray-700 dark:text-gray-300">
                    <input
                      type="checkbox"
                      checked={trackComments}
                      onChange={(e) => setTrackComments(e.target.checked)}
                      className="rounded-lg border-gray-300 text-brand-500 focus:ring-brand-500"
                    />
                    <span>{t("optComments")}</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-gray-700 dark:text-gray-300">
                    <input
                      type="checkbox"
                      checked={trackLikes}
                      onChange={(e) => setTrackLikes(e.target.checked)}
                      className="rounded-lg border-gray-300 text-brand-500 focus:ring-brand-500"
                    />
                    <span>{t("optLikes")}</span>
                  </label>
                </div>
              </div>

              <div className="flex flex-col justify-center p-3.5 rounded-lg border border-gray-300 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50">
                <span className="text-xs font-semibold text-gray-800 dark:text-gray-200 block mb-1.5">
                  {t("labelTractionFilter")}
                </span>
                <div className="flex items-center gap-2">
                  {[0, 5, 10, 20].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setMinCommentThreshold(val)}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                        minCommentThreshold === val
                          ? "bg-brand-500 text-white"
                          : "bg-white border border-gray-200 text-gray-700 hover:bg-gray-100 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300"
                      }`}
                    >
                      {val === 0 ? t("noFilter") : t("minCommentsVal", { val })}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Fila 4: Plantilla de Mensaje Relacional */}
            <div>
              <label className="block text-xs leading-5 font-normal tracking-normal uppercase text-gray-400 mb-1">
                Plantilla de Secuencia Relacional Contextual para el Grupo
              </label>
              <textarea
                rows={3}
                value={outreachTemplate}
                onChange={(e) => setOutreachTemplate(e.target.value)}
                className="w-full rounded-lg border border-gray-300 p-2.5 text-xs text-gray-800 font-mono focus:border-brand-500 focus:outline-hidden dark:border-gray-700 dark:bg-gray-900 dark:text-white"
              />
              <span className="text-xs text-gray-400 mt-1 block">
                Variables disponibles: &#123;&#123;first_name&#125;&#125;, &#123;&#123;group_name&#125;&#125;, &#123;&#123;topic&#125;&#125;.
              </span>
            </div>

            {/* Fila 5: Botones */}
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsAddingGroup(false)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300"
              >
                {tCommon("cancelBtn")}
              </button>
              <button
                type="submit"
                className="rounded-lg bg-brand-500 px-5 py-2 text-xs font-semibold text-white hover:bg-brand-600 transition shadow-xs flex items-center gap-1.5"
              >
                <span>{t("submitBtn")}</span>
              </button>
            </div>
          </form>
        </ComponentCard>
      )}

      {/* Banner de Feedback */}
      {scanFeedback && (
        <div
          className={`rounded-lg p-3.5 text-xs border flex items-center justify-between ${
            scanFeedback.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/30 dark:border-emerald-900/50 dark:text-emerald-300"
              : "bg-red-50 border-red-200 text-red-800 dark:bg-red-950/30 dark:border-red-900/50 dark:text-red-300"
          }`}
        >
          <div className="flex items-center gap-2">
            <span className="font-bold">{scanFeedback.type === "success" ? "✓" : "!"}</span>
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

      {/* Lista de Monitores de Grupos */}
      <ComponentCard title={t("tableTitle", { count: l3GroupMonitors.length })}>
        {!isLoaded ? (
          <p className="text-xs text-gray-400 py-4">{t("loadingCommunities")}</p>
        ) : l3GroupMonitors.length === 0 ? (
          <div className="py-12 text-center space-y-3">
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              {t("noMonitorsTitle")}
            </p>
            <p className="text-xs text-gray-400 max-w-md mx-auto">
              {t("noMonitorsDesc")}
            </p>
            <button
              type="button"
              onClick={() => setIsAddingGroup(true)}
              className="rounded-lg bg-brand-500 px-4 py-2 text-xs font-semibold text-white hover:bg-brand-600 transition"
            >
              {t("addGroup")}
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-gray-300 text-xs leading-5 font-normal tracking-normal uppercase text-gray-400 [&_th]:font-normal dark:border-gray-800 dark:text-gray-400">
                <tr>
                  <th className="px-4 py-3 min-w-[260px]">{t("thCommunity")}</th>
                  <th className="px-4 py-3 min-w-[160px]">{t("thKeywords")}</th>
                  <th className="px-4 py-3 whitespace-nowrap">{tCommon("extractedLeads")}</th>
                  <th className="px-4 py-3 whitespace-nowrap">{tCommon("lastScan")}</th>
                  <th className="px-4 py-3 whitespace-nowrap">{tCommon("status")}</th>
                  <th className="px-4 py-3 text-right whitespace-nowrap min-w-[350px]">{tCommon("actions")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-300 text-xs dark:divide-gray-800">
                {l3GroupMonitors.map((group) => {
                  const scannedPosts = group.lastScannedPosts || [];
                  const isExpanded = Boolean(expandedGroupPosts[group.id]);
                  const { count: leadCount, targetListId } = getEffectiveGroupLeadCount(group);

                  return (
                    <Fragment key={group.id}>
                      <tr className={`hover:bg-gray-50/50 dark:hover:bg-white/2 transition align-top ${isExpanded && scannedPosts.length > 0 ? "border-b-0!" : ""}`}>
                        <td className="px-4 py-3.5 align-top">
                          <div className="flex items-start gap-2.5">
                            <div className="h-8 w-8 rounded-full bg-brand-500 text-white font-bold flex items-center justify-center shrink-0 text-xs shadow-xs mt-0.5">
                              <Users className="h-4 w-4" />
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <p className="font-semibold text-gray-900 dark:text-white">
                                  {group.groupName}
                                </p>
                                <span className="rounded-full px-1.5 py-0.2 text-xs font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                                  Grupo
                                </span>
                              </div>
                              <a
                                href={group.groupUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="text-xs text-brand-600 hover:underline dark:text-brand-400 truncate block max-w-xs mt-0.5"
                              >
                                {group.groupUrl}
                              </a>

                              {/* Botón para desplegar / ocultar debates analizados */}
                              {scannedPosts.length > 0 ? (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setExpandedGroupPosts((prev) => ({
                                      ...prev,
                                      [group.id]: !isExpanded,
                                    }))
                                  }
                                  className="inline-flex items-center gap-1.5 mt-1.5 text-xs font-semibold text-brand-600 dark:text-brand-400 hover:text-brand-700 hover:underline transition"
                                >
                                  <MessageSquare className="h-3 w-3" />
                                  <span>
                                    {isExpanded
                                      ? t("btnHideDebates")
                                      : t("btnShowDebates", { count: scannedPosts.length })}
                                  </span>
                                  {isExpanded ? (
                                    <ChevronUp className="h-3 w-3" />
                                  ) : (
                                    <ChevronDown className="h-3 w-3" />
                                  )}
                                </button>
                              ) : (
                                <span className="block mt-1 text-xs text-gray-400 dark:text-gray-500 italic">
                                  {t("noPostsScannedNotice")}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        <td className="px-4 py-3.5 align-top">
                          <div className="flex flex-wrap gap-1">
                            {group.topicsFilter.map((topic, i) => (
                              <span
                                key={i}
                                className="rounded-lg bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700 dark:bg-gray-800 dark:text-gray-300"
                              >
                                {topic}
                              </span>
                            ))}
                            {group.minCommentThreshold && (
                              <span className="rounded-lg bg-brand-50 border border-brand-200 px-1.5 py-0.5 text-xs font-bold text-brand-700 dark:bg-brand-950/60 dark:border-brand-900 dark:text-brand-300">
                                &gt;={group.minCommentThreshold} coms
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="px-4 py-3.5 align-top whitespace-nowrap">
                          <span className="font-bold text-gray-900 dark:text-white">
                            {leadCount}
                          </span>
                          <span className="text-xs text-gray-400 block">{t("decisorsUnit")}</span>
                        </td>

                        <td className="px-4 py-3.5 align-top whitespace-nowrap">
                          <span className="text-gray-600 dark:text-gray-400 font-medium">
                            {group.lastScanAt || "Pendiente"}
                          </span>
                          <span className="text-xs text-gray-400 block">{tCommon("dailyFrequency")}</span>
                        </td>

                        <td className="px-4 py-3.5 align-top whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => toggleLevel3GroupStatus(group.id)}
                            className={`rounded-lg px-2.5 py-0.5 text-xs font-semibold transition ${
                              group.status === "active"
                                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                                : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                            }`}
                          >
                            {group.status === "active" ? tCommon("statusActive") : tCommon("statusPaused")}
                          </button>
                        </td>

                        <td className="px-4 py-3.5 text-right align-top whitespace-nowrap">
                          <div className="inline-flex items-center justify-end gap-1.5 flex-nowrap shrink-0">
                            {/* Selector rápido de pastillas de lote [ 25 | 50 | 100 ] */}
                            <div
                              className="inline-flex items-center rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/80 p-0.5 text-xs font-semibold"
                              title={t("selectBatchTooltip")}
                            >
                              {([25, 50, 100] as const).map((batchVal) => {
                                const currentBatch = selectedBatchSize[group.id] || group.batchLeadLimit || 50;
                                const isSelected = currentBatch === batchVal;
                                return (
                                  <button
                                    key={batchVal}
                                    type="button"
                                    disabled={isScanningId === group.id}
                                    onClick={() =>
                                      setSelectedBatchSize((prev) => ({
                                        ...prev,
                                        [group.id]: batchVal,
                                      }))
                                    }
                                    className={`px-1.5 py-0.5 rounded-lg transition ${
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

                            {/* Botón de Auditoría en Vivo */}
                            {(() => {
                              const activeBatch = selectedBatchSize[group.id] || group.batchLeadLimit || 50;
                              return (
                                <button
                                  type="button"
                                  disabled={isScanningId === group.id}
                                  onClick={() => handleScanGroup(group, activeBatch)}
                                  className="rounded-lg bg-brand-500 px-2.5 py-1 text-white hover:bg-brand-600 font-medium text-xs transition disabled:opacity-50 inline-flex items-center gap-1 shadow-2xs"
                                  title={t("scanBtnTooltip", { count: activeBatch })}
                                >
                                  {isScanningId === group.id ? (
                                    <>
                                      <span className="h-3 w-3 rounded-full border-2 border-white/40 border-t-white animate-spin"></span>
                                      Escaneando ({activeBatch})...
                                    </>
                                  ) : (
                                    <>
                                      <span>{tCommon("scanBtn")}</span>
                                      <span className="rounded-lg bg-brand-600/80 px-1 py-0.2 text-xs font-bold">
                                        {activeBatch}
                                      </span>
                                    </>
                                  )}
                                </button>
                              );
                            })()}

                            {/* Botón Ver Lista Directa */}
                            <Link
                              href={`/leads/lists?listId=${encodeURIComponent(targetListId)}&group=${encodeURIComponent(group.groupName)}`}
                              className="rounded-lg border border-brand-500 px-2.5 py-1 text-brand-600 hover:bg-brand-50 dark:text-brand-400 dark:hover:bg-brand-950/20 font-medium text-xs inline-flex items-center gap-1.5 transition"
                              title={t("openSmartListTooltip", { name: group.groupName })}
                            >
                              <span>{tCommon("viewLeads", { count: leadCount })}</span>
                              <span aria-hidden="true">&rarr;</span>
                            </Link>

                            {/* Botón Editar Monitor */}
                            <button
                              type="button"
                              onClick={() => setEditingMonitor(group)}
                              className="h-[26px] w-[26px] rounded-lg border border-gray-200 text-gray-600 hover:border-brand-500 hover:text-brand-600 hover:bg-brand-50 dark:border-gray-700 dark:text-gray-300 dark:hover:border-brand-500 dark:hover:text-brand-400 dark:hover:bg-brand-950/20 inline-flex items-center justify-center transition shrink-0"
                              title={t("editMonitorTooltip")}
                            >
                              <Pencil className="size-3.5" />
                            </button>

                            {/* Botón Eliminar */}
                            <button
                              type="button"
                              onClick={() => {
                                if (leadCount === 0) {
                                  if (
                                    confirm(
                                      t("deleteConfirmNoLeads", { name: group.groupName })
                                    )
                                  ) {
                                    deleteLevel3GroupMonitor(group.id);
                                    if (targetListId) deleteList(targetListId);
                                  }
                                } else {
                                  if (
                                    confirm(
                                      t("deleteConfirmWithLeads", { name: group.groupName, count: leadCount })
                                    )
                                  ) {
                                    deleteLevel3GroupMonitor(group.id);
                                    markListMonitorAsDeleted(group.id);
                                    markListMonitorAsDeleted(group.groupName);
                                  }
                                }
                              }}
                              className="h-[26px] w-[26px] rounded-lg border border-red-200 text-red-600 hover:bg-red-50 dark:border-red-900/40 dark:text-red-400 inline-flex items-center justify-center transition shrink-0"
                              title={t("deleteMonitorTooltip")}
                            >
                              <X className="size-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Card de Ancho Completo para Debates Analizados */}
                      {isExpanded && scannedPosts.length > 0 && (
                        <tr key={`${group.id}-posts-card`} className="border-t-0!">
                          <td colSpan={6} className="px-4 pb-4 pt-0 border-t-0!">
                            <div className="w-full rounded-lg border border-emerald-100 bg-emerald-50/60 p-3.5 dark:border-emerald-900/40 dark:bg-emerald-950/20 shadow-xs">
                              <div className="flex items-center justify-between mb-2.5">
                                <span className="text-xs font-bold text-emerald-900 dark:text-emerald-200 flex items-center gap-1.5">
                                  <MessageSquare className="h-3.5 w-3.5 text-emerald-600" />
                                  <span>{t("debatesAnalyzedHeader", { count: scannedPosts.length })}</span>
                                </span>
                                <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                                  Actividad en {group.groupName}
                                </span>
                              </div>

                              <div className="space-y-2">
                                {scannedPosts.map((post, idx) => (
                                  <div
                                    key={post.id || idx}
                                    className="rounded-lg border border-white/80 dark:border-gray-800 bg-white dark:bg-gray-900 p-2.5 flex items-start justify-between gap-3 shadow-2xs"
                                  >
                                    <div className="min-w-0 flex-1">
                                      <div className="flex items-center gap-2 mb-1">
                                        <span className="font-semibold text-gray-900 dark:text-white text-xs">
                                          {post.authorName || group.groupName}
                                        </span>
                                        <span className="text-xs text-gray-400">
                                          {post.scannedAt || "Reciente"}
                                        </span>
                                      </div>
                                      <p className="text-xs text-gray-600 dark:text-gray-300 line-clamp-2">
                                        {post.text}
                                      </p>
                                      <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-500 font-medium">
                                        <span>{t("postCommentsCount", { count: post.commentsCount || 0 })}</span>
                                        <span>{t("postReactionsCount", { count: post.reactionsCount || 0 })}</span>
                                      </div>
                                    </div>

                                    {post.url && (
                                      <a
                                        href={post.url}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="shrink-0 text-xs font-semibold text-brand-600 hover:underline dark:text-brand-400 flex items-center gap-1 mt-1"
                                      >
                                        <span>{tCommon("viewOnLinkedIn")}</span>
                                        <ExternalLink className="h-3 w-3" />
                                      </a>
                                    )}
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

      {/* Modal de Edición de Monitor de Grupo */}
      {editingMonitor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-lg bg-white p-5 shadow-2xl dark:bg-gray-900 border border-gray-300 dark:border-gray-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-300 dark:border-gray-800">
              <h3 className="font-bold text-gray-900 dark:text-white text-sm">
                {t("editModalTitle")}: {editingMonitor.groupName}
              </h3>
              <button
                type="button"
                onClick={() => setEditingMonitor(null)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">
                  {t("editKeywords")} (separadas por coma)
                </label>
                <input
                  type="text"
                  value={editingMonitor.topicsFilter.join(", ")}
                  onChange={(e) =>
                    setEditingMonitor({
                      ...editingMonitor,
                      topicsFilter: e.target.value.split(",").map((t) => t.trim()).filter(Boolean),
                    })
                  }
                  className="h-9 w-full rounded-lg border border-gray-300 px-3 text-xs dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">
                  {t("labelTractionFilter")}
                </label>
                <input
                  type="number"
                  min={0}
                  value={editingMonitor.minCommentThreshold || 0}
                  onChange={(e) =>
                    setEditingMonitor({
                      ...editingMonitor,
                      minCommentThreshold: Number(e.target.value) || 0,
                    })
                  }
                  className="h-9 w-full rounded-lg border border-gray-300 px-3 text-xs dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">
                  {t("labelOutreachTemplate")}
                </label>
                <textarea
                  rows={3}
                  value={editingMonitor.outreachTemplate}
                  onChange={(e) =>
                    setEditingMonitor({
                      ...editingMonitor,
                      outreachTemplate: e.target.value,
                    })
                  }
                  className="w-full rounded-lg border border-gray-300 p-2 text-xs font-mono dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-gray-300 dark:border-gray-800">
              <button
                type="button"
                onClick={() => setEditingMonitor(null)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300"
              >
                {tCommon("cancelBtn")}
              </button>
              <button
                type="button"
                onClick={() => {
                  updateLevel3GroupMonitor(editingMonitor.id, editingMonitor);
                  setEditingMonitor(null);
                }}
                className="rounded-lg bg-brand-500 px-4 py-2 text-xs font-semibold text-white hover:bg-brand-600 transition"
              >
                {tCommon("saveBtn")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
