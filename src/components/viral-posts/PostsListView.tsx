"use client";

import ComponentCard from "@/components/common/ComponentCard";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { useCreatedPosts } from "@/lib/viral-posts/store";
import type { CreatedPost, PostFormat, PostStatus } from "@/lib/viral-posts/types";
import { useSignalRadar } from "@/lib/signals/store";
import type { SignalLeadItem } from "@/lib/signals/types";
import { useLeadsStore } from "@/lib/leads/store";
import { useAuth } from "@/context/AuthContext";
import { useTranslations } from "next-intl";
import { getActiveAccountForUser } from "@/lib/unipile/store";
import { Link } from "@/i18n/navigation";
import { ExternalLink, Pencil, RefreshCw, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

function parseCommentAuthor(c: any) {
  const authorDetails = c.author_details || {};
  const authorObj = typeof c.author === "object" && c.author !== null ? c.author : {};
  const rawAuthor = typeof c.author === "string" ? c.author : "";

  const fullName =
    authorDetails.name ||
    authorObj.name ||
    rawAuthor ||
    [authorDetails.first_name || authorObj.first_name, authorDetails.last_name || authorObj.last_name].filter(Boolean).join(" ") ||
    "Prospecto en LinkedIn";

  const headline =
    authorDetails.headline ||
    authorObj.headline ||
    authorDetails.title ||
    authorObj.title ||
    "Profesional B2B en LinkedIn";

  let linkedinUrl =
    authorDetails.profile_url ||
    authorObj.profile_url ||
    authorDetails.linkedin_url ||
    authorObj.linkedin_url ||
    "";

  if (!linkedinUrl) {
    const pubId = authorDetails.public_identifier || authorObj.public_identifier;
    if (pubId && typeof pubId === "string" && pubId.trim()) {
      linkedinUrl = pubId.startsWith("http") ? pubId : `https://www.linkedin.com/in/${pubId.trim()}`;
    }
  }

  const rawPic =
    authorDetails.profile_picture_url ||
    authorObj.profile_picture_url ||
    authorDetails.picture_url ||
    authorObj.picture_url;
  const avatarUrl = rawPic && typeof rawPic === "string" && !rawPic.includes("unsplash.com") ? rawPic : undefined;

  let company = authorDetails.company || authorObj.company || "";
  if (!company && headline) {
    const match = headline.match(/(?:en|at|@)\s+([^|•,\n]+)/i);
    if (match && match[1]) {
      company = match[1].trim();
    } else {
      company = "Empresa en LinkedIn";
    }
  }

  return { fullName, headline, linkedinUrl, avatarUrl, company };
}

function getLinkedInPostUrl(post: CreatedPost, matchedMonitorUrl?: string): string | null {
  if (post.postUrl && post.postUrl.startsWith("http")) return post.postUrl;
  if (matchedMonitorUrl && matchedMonitorUrl.startsWith("http")) return matchedMonitorUrl;
  const rawId = post.linkedinPostId;
  if (!rawId) return null;
  if (rawId.startsWith("http")) return rawId;
  const cleanId = rawId.replace(/^urn:li:activity:/, "").trim();
  if (!cleanId) return null;
  return `https://www.linkedin.com/feed/update/urn:li:activity:${cleanId}`;
}

export default function PostsListView({
  onTabChange,
  hideBreadcrumb,
}: {
  onTabChange?: (tab: string) => void;
  hideBreadcrumb?: boolean;
} = {}) {
  const t = useTranslations("viralPosts.list");
  const { posts, isLoaded, updatePost, deletePost } = useCreatedPosts();
  const { l1Monitors, updateLevel1Monitor, recordDiscoveredLeads } = useSignalRadar();
  const { lists: allLeadLists, leads: crmLeads, importSignalLeads, getOrCreateLevel1List } = useLeadsStore();
  const { currentUser } = useAuth();

  const [filterStatus, setFilterStatus] = useState<"all" | PostStatus>("all");
  const [filterFormat, setFilterFormat] = useState<"all" | PostFormat>("all");
  const [publishingId, setPublishingId] = useState<string | null>(null);
  const [isSyncingMetrics, setIsSyncingMetrics] = useState(false);
  const [feedback, setFeedback] = useState<{ id: string; type: "success" | "error"; message: string } | null>(null);

  // Estados para modal de edición
  const [editingPost, setEditingPost] = useState<CreatedPost | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editKeyword, setEditKeyword] = useState("");
  const [editContent, setEditContent] = useState("");

  const handleOpenEdit = (post: CreatedPost) => {
    setEditingPost(post);
    setEditTitle(post.title || "");
    setEditKeyword(post.leadMagnetKeyword || "");
    setEditContent(post.content || "");
  };

  const handleSaveEditPost = () => {
    if (!editingPost) return;
    updatePost(editingPost.id, {
      title: editTitle.trim(),
      leadMagnetKeyword: editKeyword.trim().toUpperCase(),
      content: editContent.trim(),
    });
    setEditingPost(null);
    setFeedback({
      id: editingPost.id,
      type: "success",
      message: t("updatedSuccess"),
    });
  };

  const syncAllPublishedPostsMetrics = useCallback(
    async (forcedPosts?: CreatedPost[]) => {
      setIsSyncingMetrics(true);
      const targetPosts = forcedPosts || posts;
      const published = targetPosts.filter(
        (p) =>
          p.status === "published" &&
          (p.linkedinPostId || l1Monitors.some((m) => m.postTitle.toLowerCase() === p.title.toLowerCase()))
      );

      const activeAcc = getActiveAccountForUser(currentUser);
      const rawAccId = (activeAcc as any)?.unipileAccountId || activeAcc?.id || "";

      await Promise.allSettled(
        published.map(async (p) => {
          try {
            const matchedMon = l1Monitors.find((m) => {
              const cleanPostId = (p.linkedinPostId || "").replace(/^urn:li:activity:/, "").trim();
              if (cleanPostId && m.postUrl?.includes(cleanPostId)) return true;
              if (m.postTitle && p.title && m.postTitle.trim().toLowerCase() === p.title.trim().toLowerCase()) return true;
              return false;
            });

            const cleanId = (p.linkedinPostId || "").replace(/^urn:li:activity:/, "").trim();
            const targetUrl =
              matchedMon?.postUrl ||
              (cleanId ? `https://www.linkedin.com/feed/update/urn:li:activity:${cleanId}` : "");
            if (!targetUrl) return;

            const res = await fetch(
              `/api/unipile/signals?postId=${encodeURIComponent(targetUrl)}&accountId=${encodeURIComponent(rawAccId)}`
            );
            if (!res.ok) return;
            const data = await res.json();

            if (data.ok) {
              const commentsCount = Math.max(
                data.comments?.length || 0,
                data.post?.comment_counter || 0,
                matchedMon?.scannedCommentsCount || 0
              );
              const likesCount = data.post?.reaction_counter ?? (p.metrics?.likes || 0);
              const impressionsCount = data.post?.impressions_counter ?? (p.metrics?.impressions || 0);
              const postShareUrl = data.post?.share_url || p.postUrl || targetUrl;

              // Identificar comentarios que coincidan con la palabra clave
              const matchingComments = (data.comments || []).filter((c: any) => {
                const kw = (p.leadMagnetKeyword || matchedMon?.keyword || "").toUpperCase();
                if (!kw) return false;
                return String(c.text || "").toUpperCase().includes(kw);
              });

              // Lista inteligente destino en CRM
              const monitorId = matchedMon?.id || `mon-l1-${p.id}`;
              const targetList =
                allLeadLists.find(
                  (l) => l.sourceMonitorId === monitorId || l.id === `list-sig-n1-${monitorId}`
                ) ||
                getOrCreateLevel1List({
                  monitorId,
                  postTitle: p.title,
                  keyword: p.leadMagnetKeyword || "SISTEMA",
                });

              // Si hay comentarios coincidentes no capturados aún, incorporarlos a Signal Radar y CRM
              let newlyImportedCount = 0;
              if (matchingComments.length > 0 && targetList) {
                const discoveredLeads: SignalLeadItem[] = matchingComments.map((c: any, idx: number) => {
                  const author = parseCommentAuthor(c);
                  return {
                    id: `sig-lead-${Date.now()}-${idx}`,
                    monitorId,
                    fullName: author.fullName,
                    headline: author.headline,
                    company: author.company,
                    location: "España / Latam",
                    linkedinUrl: author.linkedinUrl,
                    avatarUrl: author.avatarUrl,
                    connectionDegree: "1st",
                    intentLevel: "very_high",
                    intentScore: 100,
                    signalType: "keyword",
                    signalLevel: "level_1",
                    signalSnippet: `Comentó: "${c.text}"`,
                    detectedAt: new Date().toISOString(),
                    status: "dm_sent",
                    attachedResource: matchedMon?.attachedPdfName || "Framework-Prospeccion-B2B.pdf",
                    sourcePostId: targetUrl,
                    sourcePostUrl: targetUrl,
                    sourcePostTitle: p.title,
                  };
                });

                recordDiscoveredLeads(discoveredLeads);
                importSignalLeads(targetList, discoveredLeads);
                newlyImportedCount = discoveredLeads.length;
              }

              const leadsInCrm = targetList
                ? crmLeads.filter((l) => l.listId === targetList.id || (l as any).monitorId === monitorId).length
                : 0;

              const leadsCount = Math.max(
                matchedMon?.leadsCapturedCount || 0,
                leadsInCrm,
                matchingComments.length,
                newlyImportedCount,
                p.metrics?.leadsCaptured || 0
              );

              updatePost(p.id, {
                postUrl: postShareUrl,
                metrics: {
                  likes: likesCount,
                  comments: commentsCount,
                  impressions: impressionsCount,
                  leadsCaptured: leadsCount,
                },
              });

              if (matchedMon) {
                updateLevel1Monitor(matchedMon.id, {
                  scannedCommentsCount: Math.max(matchedMon.scannedCommentsCount, commentsCount),
                  leadsCapturedCount: Math.max(matchedMon.leadsCapturedCount, leadsCount),
                  postUrl: matchedMon.postUrl || postShareUrl,
                });
              }
            }
          } catch (err) {
            console.warn("[syncMetrics] Error sincronizando métricas de post:", p.title, err);
          }
        })
      );

      setIsSyncingMetrics(false);
    },
    [posts, l1Monitors, allLeadLists, crmLeads, currentUser, updatePost, updateLevel1Monitor, recordDiscoveredLeads, importSignalLeads, getOrCreateLevel1List]
  );

  const hasAutoSyncedRef = useRef(false);
  useEffect(() => {
    if (!isLoaded || posts.length === 0 || hasAutoSyncedRef.current) return;
    hasAutoSyncedRef.current = true;
    syncAllPublishedPostsMetrics();
  }, [isLoaded, posts.length, syncAllPublishedPostsMetrics]);

  const filteredPosts = posts.filter((p) => {
    const matchesStatus = filterStatus === "all" || p.status === filterStatus;
    const matchesFormat = filterFormat === "all" || p.format === filterFormat;
    return matchesStatus && matchesFormat;
  });

  const getFormatBadge = (fmt: PostFormat) => {
    switch (fmt) {
      case "text":
        return { label: t("formatText"), color: "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300" };
      case "image":
        return { label: t("formatImage"), color: "bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300" };
      case "carousel":
        return { label: t("formatCarousel"), color: "bg-brand-50 text-brand-600 dark:bg-brand-950/40 dark:text-brand-300" };
      case "video":
        return { label: t("formatVideo"), color: "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300" };
      default:
        return { label: "Solo Texto", color: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300" };
    }
  };

  const getStatusBadge = (status: PostStatus) => {
    switch (status) {
      case "published":
        return { label: t("statusPublished"), color: "bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-400" };
      case "scheduled":
        return { label: t("statusScheduled"), color: "bg-brand-50 text-brand-600 dark:bg-brand-950/40 dark:text-brand-300" };
      case "draft":
        return { label: t("statusDraft"), color: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300" };
      case "failed":
        return { label: "Error", color: "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400" };
    }
  };

  const handlePublishNow = async (post: CreatedPost) => {
    setPublishingId(post.id);
    setFeedback(null);

    try {
      const res = await fetch("/api/unipile/posts/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          account_id: post.targetAccountId,
          text: post.content,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "No se pudo despachar el post a LinkedIn.");
      }

      updatePost(post.id, {
        status: "published",
        publishedAt: new Date().toISOString(),
        linkedinPostId: data.postId,
        metrics: { likes: 0, comments: 0, impressions: 0, leadsCaptured: 0 },
      });

      setFeedback({
        id: post.id,
        type: "success",
        message: t("publishSuccess"),
      });
      setTimeout(() => setFeedback(null), 4000);
    } catch (err: any) {
      console.error("[Publish Now Error]:", err);
      setFeedback({
        id: post.id,
        type: "error",
        message: err.message || t("publishError"),
      });
    } finally {
      setPublishingId(null);
    }
  };

  return (
    <div className="w-full space-y-6">
      {!hideBreadcrumb && <PageBreadcrumb pageTitle={t("pageTitle")} />}

      <div className="w-full rounded-lg border border-gray-300 bg-white dark:border-gray-800 dark:bg-white/3">
        <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-5">
          <div>
            <h3 className="text-base font-medium text-gray-800 dark:text-white/90">
              {t("headerTitle")}
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {t("headerDesc")}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              disabled={isSyncingMetrics}
              onClick={() => syncAllPublishedPostsMetrics()}
              className="rounded-lg border border-gray-200 bg-white px-3.5 py-2.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 transition shadow-xs flex items-center gap-1.5 disabled:opacity-50"
              title={t("syncMetricsTooltip")}
            >
              <RefreshCw className={`size-3.5 ${isSyncingMetrics ? "animate-spin text-brand-500" : ""}`} />
              <span>{isSyncingMetrics ? t("syncingMetrics") : t("syncMetricsBtn")}</span>
            </button>
            <a
              href="/viral-posts?tab=create" onClick={(e) => { if (onTabChange) { e.preventDefault(); onTabChange("create"); } }}
              className="rounded-lg bg-brand-500 px-4 py-2.5 text-xs font-semibold text-white hover:bg-brand-600 transition shadow-theme-xs"
            >
              {t("createPostBtn")}
            </a>
          </div>
        </div>

        {/* Filtros */}
        <div className="border-t border-gray-300 px-6 py-5 sm:p-6 dark:border-gray-800">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium text-gray-500 mr-2">{t("statusFilterLabel")}</span>
              {[
                { id: "all", label: t("filterAll") },
                { id: "scheduled", label: t("filterScheduled") },
                { id: "published", label: t("filterPublished") },
                { id: "draft", label: t("filterDraft") },
              ].map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setFilterStatus(s.id as "all" | PostStatus)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                    filterStatus === s.id
                      ? "bg-brand-500 text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium text-gray-500 mr-2">{t("formatFilterLabel")}</span>
              {[
                { id: "all", label: t("filterAll") },
                { id: "text", label: t("formatFilterText") },
                { id: "image", label: t("formatFilterImage") },
                { id: "carousel", label: t("formatFilterCarousel") },
              ].map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFilterFormat(f.id as "all" | PostFormat)}
                  className={`rounded-lg px-2.5 py-1 text-xs font-medium transition ${
                    filterFormat === f.id
                      ? "border border-brand-500 text-brand-600 bg-brand-50 dark:bg-brand-950 dark:text-brand-300"
                      : "text-gray-500 hover:text-gray-900 dark:text-gray-400"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <ComponentCard
        title={t("postsCountTitle", { count: filteredPosts.length })}
        desc={t("cardDesc")}
      >
        {!isLoaded ? (
          <p className="text-xs text-gray-400 py-4">{t("loadingPosts")}</p>
        ) : filteredPosts.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
              {t("noFilteredPosts")}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              {t("noFilteredPostsDesc")}
            </p>
            <div className="mt-4 flex items-center justify-center gap-3">
              <a
                href="/viral-posts?tab=radar" onClick={(e) => { if (onTabChange) { e.preventDefault(); onTabChange("radar"); } }}
                className="rounded-lg border border-gray-300 px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300"
              >
                {t("exploreRadar")}
              </a>
              <a
                href="/viral-posts?tab=create" onClick={(e) => { if (onTabChange) { e.preventDefault(); onTabChange("create"); } }}
                className="rounded-lg bg-brand-500 px-4 py-2 text-xs font-semibold text-white hover:bg-brand-600 transition"
              >
                {t("createWithAi")}
              </a>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredPosts.map((post) => {
              const formatBadge = getFormatBadge(post.format);
              const statusBadge = getStatusBadge(post.status);
              const isCurrentlyPublishing = publishingId === post.id;
              const postFeedback = feedback?.id === post.id ? feedback : null;

              const matchedMonitor = l1Monitors.find((m) => {
                const cleanPostId = (post.linkedinPostId || "").replace(/^urn:li:activity:/, "").trim();
                if (cleanPostId && m.postUrl?.includes(cleanPostId)) return true;
                if (m.postTitle && post.title && m.postTitle.trim().toLowerCase() === post.title.trim().toLowerCase()) return true;
                return false;
              });

              const targetList = matchedMonitor
                ? allLeadLists.find((l) => l.sourceMonitorId === matchedMonitor.id || l.id === `list-sig-n1-${matchedMonitor.id}`)
                : null;

              const leadsInCrm = targetList
                ? crmLeads.filter((l) => l.listId === targetList.id || (l as any).monitorId === matchedMonitor?.id).length
                : 0;

              const effectiveLikes = post.metrics?.likes ?? 0;
              const effectiveComments = Math.max(
                post.metrics?.comments || 0,
                matchedMonitor?.scannedCommentsCount || 0
              );
              const effectiveImpressions = post.metrics?.impressions ?? 0;
              const effectiveLeadsCaptured = Math.max(
                post.metrics?.leadsCaptured || 0,
                matchedMonitor?.leadsCapturedCount || 0,
                leadsInCrm
              );

              const linkedInUrl = getLinkedInPostUrl(post, matchedMonitor?.postUrl);

              return (
                <div
                  key={post.id}
                  className="rounded-lg border border-gray-300 bg-white p-4 hover:border-brand-500/60 transition shadow-theme-xs dark:border-gray-800 dark:bg-gray-900/60"
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${formatBadge.color}`}>
                          {formatBadge.label}
                        </span>
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusBadge.color}`}>
                          {statusBadge.label}
                        </span>
                        {post.leadMagnetKeyword && (
                          <span className="rounded-lg bg-brand-50 px-2 py-0.5 text-xs font-mono font-semibold text-brand-700 dark:bg-brand-950 dark:text-brand-300">
                            Keyword: {post.leadMagnetKeyword}
                          </span>
                        )}
                        <span className="text-xs text-gray-400">
                          {post.scheduledAt
                            ? `${t("scheduledPrefix")}: ${new Date(post.scheduledAt).toLocaleDateString()} ${new Date(post.scheduledAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
                            : post.publishedAt
                            ? `${t("publishedPrefix")}: ${new Date(post.publishedAt).toLocaleDateString()}`
                            : `${t("createdPrefix")}: ${new Date(post.createdAt).toLocaleDateString()}`}
                        </span>
                      </div>

                      <h4 className="text-base font-medium text-gray-800 dark:text-white/90" title={post.title}>
                        {post.title}
                      </h4>

                      {postFeedback && (
                        <div
                          className={`p-1.5 rounded-lg text-xs font-medium border ${
                            postFeedback.type === "success"
                              ? "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300"
                              : "bg-red-50 text-red-800 border-red-200 dark:bg-red-950/40 dark:text-red-300"
                          }`}
                        >
                          {postFeedback.message}
                        </div>
                      )}

                      {post.status === "published" && (
                        <div className="flex flex-wrap items-center gap-4 pt-1 text-xs text-gray-500">
                          <span>
                            <strong className="text-gray-900 dark:text-white">{effectiveLikes}</strong> {t("likesLabel")}
                          </span>
                          <span>
                            <strong className="text-gray-900 dark:text-white">{effectiveComments}</strong> {effectiveComments === 1 ? t("commentsLabelSingle") : t("commentsLabelPlural")}
                          </span>
                          <span>
                            <strong className="text-gray-900 dark:text-white">{effectiveImpressions}</strong> {t("impressionsLabel")}
                          </span>
                          {effectiveLeadsCaptured > 0 ? (
                            <Link
                              href={targetList ? `/leads?list=${targetList.id}` : "/leads"}
                              className="inline-flex items-center gap-1 font-semibold text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300 underline"
                            >
                              <span><strong className="text-brand-700 dark:text-brand-300">{effectiveLeadsCaptured}</strong> {effectiveLeadsCaptured === 1 ? t("leadCapturedSingle", { count: effectiveLeadsCaptured }) : t("leadCapturedPlural", { count: effectiveLeadsCaptured })}</span>
                            </Link>
                          ) : (
                            <span className="text-brand-600 font-semibold dark:text-brand-400">
                              <strong>{effectiveLeadsCaptured}</strong> {t("leadCapturedPlural", { count: effectiveLeadsCaptured })}
                            </span>
                          )}
                          {post.linkedinPostId && (
                            linkedInUrl ? (
                              <a
                                href={linkedInUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-brand-600 font-mono transition"
                                title={t("viewOriginalOnLinkedIn")}
                              >
                                <span>ID: {post.linkedinPostId.replace(/^urn:li:activity:/, "")}</span>
                                <ExternalLink className="size-3" />
                              </a>
                            ) : (
                              <span className="text-xs text-gray-400 font-mono">
                                ID: {post.linkedinPostId}
                              </span>
                            )
                          )}
                        </div>
                      )}
                    </div>

                    {/* Botonera estilo Monitores: Azul (Publicar/LinkedIn), Blanco (Calendario), Cuadrado Editar, Cuadrado Eliminar */}
                    <div className="flex items-center gap-2 shrink-0 self-start lg:self-center">
                      {post.status === "published" && linkedInUrl ? (
                        <a
                          href={linkedInUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded-lg bg-brand-500 px-3 py-1.5 text-white hover:bg-brand-600 font-medium text-xs transition inline-flex items-center gap-1.5 shadow-2xs shrink-0"
                          title={t("viewOnLinkedIn")}
                        >
                          <span>{t("viewOnLinkedIn")}</span>
                          <ExternalLink className="size-3.5" />
                        </a>
                      ) : post.status !== "published" ? (
                        <button
                          type="button"
                          disabled={isCurrentlyPublishing}
                          onClick={() => handlePublishNow(post)}
                          className="rounded-lg bg-brand-500 px-3 py-1.5 text-white hover:bg-brand-600 font-medium text-xs transition inline-flex items-center gap-1.5 shadow-2xs shrink-0 disabled:opacity-50"
                          title={t("publishNowOnLinkedIn")}
                        >
                          {isCurrentlyPublishing ? (
                            <>
                              <span className="h-3 w-3 border-2 border-white/40 border-t-white rounded-full animate-spin"></span>
                              <span>{t("publishing")}</span>
                            </>
                          ) : (
                            <span>{t("actionPublishNow")}</span>
                          )}
                        </button>
                      ) : null}

                      <a
                        href="/viral-posts?tab=calendar" onClick={(e) => { if (onTabChange) { e.preventDefault(); onTabChange("calendar"); } }}
                        className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 hover:border-brand-500 hover:text-brand-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:border-brand-500 dark:hover:text-brand-400 transition inline-flex items-center shrink-0"
                        title={t("viewInCalendar")}
                      >
                        <span>{t("viewInCalendar")}</span>
                      </a>

                      <button
                        type="button"
                        onClick={() => handleOpenEdit(post)}
                        className="h-[30px] w-[30px] rounded-lg border border-gray-200 bg-white text-gray-600 hover:border-brand-500 hover:text-brand-600 hover:bg-brand-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:border-brand-500 dark:hover:text-brand-400 inline-flex items-center justify-center transition shrink-0"
                        title={t("editPostTooltip")}
                      >
                        <Pencil className="size-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          if (confirm(t("confirmDeleteNamed", { title: post.title }))) {
                            deletePost(post.id);
                          }
                        }}
                        className="h-[30px] w-[30px] rounded-lg border border-red-200 bg-red-50/50 text-red-600 hover:bg-red-50 hover:border-red-300 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-400 inline-flex items-center justify-center transition shrink-0"
                        title={t("deletePostTooltip")}
                      >
                        <X className="size-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </ComponentCard>

      {/* Modal para {t("editModalTitle")} */}
      {editingPost && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl dark:bg-gray-900 border border-gray-300 dark:border-gray-800 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-300 pb-3 dark:border-gray-800">
              <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                {t("editModalTitle")}
              </h3>
              <button
                type="button"
                onClick={() => setEditingPost(null)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  {t("editTitleLabel")}
                </label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs focus:border-brand-500 focus:outline-hidden dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  {t("editKeywordLabel")}
                </label>
                <input
                  type="text"
                  value={editKeyword}
                  onChange={(e) => setEditKeyword(e.target.value.toUpperCase())}
                  placeholder={t("editKeywordPlaceholder")}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs font-mono font-semibold focus:border-brand-500 focus:outline-hidden dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  {t("editContentLabel")}
                </label>
                <textarea
                  rows={5}
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="custom-scrollbar w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-sans leading-relaxed focus:border-brand-500 focus:outline-hidden dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-300 dark:border-gray-800">
              <button
                type="button"
                onClick={() => setEditingPost(null)}
                className="rounded-lg border border-gray-300 px-3.5 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveEditPost}
                className="rounded-lg bg-brand-500 px-4 py-1.5 text-xs font-semibold text-white hover:bg-brand-600 transition"
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
