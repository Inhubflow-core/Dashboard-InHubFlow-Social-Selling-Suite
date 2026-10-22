"use client";

import ComponentCard from "@/components/common/ComponentCard";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { useSignalRadar } from "@/lib/signals/store";
import type { Level1Monitor, SignalLeadItem } from "@/lib/signals/types";
import {
  getActiveAccountForUser,
  getVisibleAccountsForUser,
  setActiveAccountId,
  accountMatchesUser,
} from "@/lib/unipile/store";
import type { UnipileAccount } from "@/lib/unipile/types";
import { useCreatedPosts } from "@/lib/viral-posts/store";
import type { CreatedPost } from "@/lib/viral-posts/types";
import { Link } from "@/i18n/navigation";
import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useLeadsStore } from "@/lib/leads/store";
import { Pencil, X, Link2, ExternalLink } from "lucide-react";

function parseCommentAuthor(c: any) {
  const rawAuthor = c.author;
  const authorDetails = c.author_details || {};
  const authorObj = typeof rawAuthor === "object" && rawAuthor !== null ? rawAuthor : {};
  const rawAuthorStr = typeof rawAuthor === "string" ? rawAuthor.trim() : "";

  // 1. Nombre completo
  const fullName =
    rawAuthorStr ||
    authorDetails.name ||
    authorObj.name ||
    [authorDetails.first_name || authorObj.first_name, authorDetails.last_name || authorObj.last_name]
      .filter(Boolean)
      .join(" ") ||
    authorDetails.display_name ||
    authorObj.display_name ||
    authorDetails.fullName ||
    authorObj.fullName ||
    "Decisor en LinkedIn";

  // 2. Titular / Cargo
  const headline =
    authorDetails.headline ||
    authorObj.headline ||
    authorDetails.title ||
    authorObj.title ||
    authorDetails.occupation ||
    authorObj.occupation ||
    "Profesional B2B en LinkedIn";

  // 3. URL de LinkedIn (nunca dejar genérico si existe identificador)
  let linkedinUrl =
    authorDetails.profile_url ||
    authorObj.profile_url ||
    authorDetails.linkedin_url ||
    authorObj.linkedin_url ||
    authorDetails.url ||
    authorObj.url ||
    "";

  if (!linkedinUrl) {
    const pubId =
      authorDetails.public_identifier ||
      authorObj.public_identifier ||
      authorDetails.vanity_name ||
      authorObj.vanity_name;
    if (pubId && typeof pubId === "string" && pubId.trim()) {
      linkedinUrl = pubId.startsWith("http") ? pubId : `https://www.linkedin.com/in/${pubId.trim()}`;
    }
  }

  if (!linkedinUrl) {
    const rawId = authorDetails.id || authorObj.id || c.author_id;
    if (rawId && typeof rawId === "string") {
      const cleanId = rawId.replace(/^urn:li:(member|person):/, "").trim();
      if (cleanId && !cleanId.includes("http")) {
        linkedinUrl = `https://www.linkedin.com/in/${cleanId}`;
      } else if (cleanId.startsWith("http")) {
        linkedinUrl = cleanId;
      }
    }
  }

  // 4. Foto de perfil
  const rawPic =
    authorDetails.profile_picture_url ||
    authorObj.profile_picture_url ||
    authorDetails.picture_url ||
    authorObj.picture_url ||
    authorDetails.avatar_url ||
    authorObj.avatar_url;

  const avatarUrl =
    rawPic && typeof rawPic === "string" && !rawPic.includes("unsplash.com")
      ? rawPic
      : undefined;

  // 5. Empresa
  let company = authorDetails.company || authorObj.company || "";
  if (!company && headline) {
    const match = headline.match(/(?:en|at|@)\s+([^|•,\n]+)/i);
    if (match && match[1]) {
      company = match[1].trim();
    } else {
      company = "Empresa en LinkedIn";
    }
  }

  // 6. Grado de conexión
  const connectionDegree =
    authorDetails.network_distance === "DISTANCE_1" || authorObj.network_distance === "DISTANCE_1"
      ? "1st"
      : authorDetails.network_distance === "DISTANCE_3" || authorObj.network_distance === "DISTANCE_3"
      ? "3rd"
      : "2nd";

  return {
    fullName,
    headline,
    linkedinUrl,
    avatarUrl,
    company: company || "Empresa en LinkedIn",
    connectionDegree,
  };
}

export default function MyPostsSignalRadarPage() {
  const { currentUser } = useAuth();
  const {
    l1Monitors,
    leads,
    isLoaded,
    addLevel1Monitor,
    updateLevel1Monitor,
    deleteLevel1Monitor,
    toggleLevel1Status,
    recordDiscoveredLeads,
  } = useSignalRadar();

  const {
    lists: allLeadLists,
    leads: crmLeads,
    importSignalLeads,
    getOrCreateLevel1List,
    deleteList,
    markListMonitorAsDeleted,
  } = useLeadsStore();

  const [editingMonitor, setEditingMonitor] = useState<Level1Monitor | null>(null);
  const [expandedMonitorsPosts, setExpandedMonitorsPosts] = useState<Record<string, boolean>>({});
  const [selectedBatchSize, setSelectedBatchSize] = useState<Record<string, 25 | 50 | 100>>({});

  // Auto-sincronización única al montar monitores hacia sus listas inteligentes y CRM
  const hasAutoSyncedRef = useRef(false);
  useEffect(() => {
    if (!isLoaded || l1Monitors.length === 0 || hasAutoSyncedRef.current) return;
    hasAutoSyncedRef.current = true;
    for (const mon of l1Monitors) {
      getOrCreateLevel1List({
        monitorId: mon.id,
        postTitle: mon.postTitle,
        keyword: mon.keyword,
      });
    }
  }, [isLoaded, l1Monitors, getOrCreateLevel1List]);

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

  const { posts: createdPosts } = useCreatedPosts();
  const [selectedCreatedPost, setSelectedCreatedPost] = useState<CreatedPost | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [linkingUrlModalMonitor, setLinkingUrlModalMonitor] = useState<Level1Monitor | null>(null);
  const [manualLinkedInUrlInput, setManualLinkedInUrlInput] = useState("");

  const [isCreatingMonitor, setIsCreatingMonitor] = useState(false);
  const [selectedMonitorForLeads, setSelectedMonitorForLeads] = useState<Level1Monitor | null>(null);
  const [isScanningId, setIsScanningId] = useState<string | null>(null);
  const [scanFeedback, setScanFeedback] = useState<{ type: "success" | "error"; text: string; listId?: string } | null>(null);

  const getEffectiveLevel1LeadCount = useCallback(
    (mon: Level1Monitor) => {
      const targetList = allLeadLists.find(
        (l) => l.sourceMonitorId === mon.id || l.id === `list-sig-n1-${mon.id}`
      );
      const monLeads = leads.filter((l) => l.monitorId === mon.id);
      const listMatchingLeads = targetList
        ? crmLeads.filter(
            (l) =>
              l.listId === targetList.id ||
              (l as any).monitorId === mon.id
          )
        : [];
      const effectiveCount = Math.max(
        targetList?.leadsCount || 0,
        listMatchingLeads.length,
        mon.leadsCapturedCount || 0,
        monLeads.length
      );
      return {
        count: effectiveCount,
        targetList,
        targetListId: targetList?.id || `list-sig-n1-${mon.id}`,
      };
    },
    [allLeadLists, crmLeads, leads]
  );

  // Form states
  const [newPostTitle, setNewPostTitle] = useState("");
  const [newPostUrl, setNewPostUrl] = useState("");
  const [newKeyword, setNewKeyword] = useState("SISTEMA");
  const [newAutoLike, setNewAutoLike] = useState(true);
  const [newPublicReply, setNewPublicReply] = useState(
    "Te lo acabo de enviar por privado, revisa tus mensajes"
  );
  const [newConnectionNote, setNewConnectionNote] = useState(
    "Hola {{first_name}}, vi que comentaste en mi post. Te envio la invitacion para entregarte el recurso por privado."
  );
  const [newAttachedPdf, setNewAttachedPdf] = useState("Guia_Oficial_Social_Selling.pdf");

  // Métricas agregadas
  const totalComments = l1Monitors.reduce((acc, m) => acc + m.scannedCommentsCount, 0);
  const totalLeadsCaptured = l1Monitors.reduce((acc, m) => acc + m.leadsCapturedCount, 0);
  const activeMonitorsCount = l1Monitors.filter((m) => m.status === "active").length;
  const pendingMonitorsCount = l1Monitors.filter((m) => m.status === "pending_publish").length;

  const isPostPendingPublish =
    selectedCreatedPost !== null && selectedCreatedPost.status !== "published";

  const handleSelectCreatedPost = (post: CreatedPost) => {
    setSelectedCreatedPost(post);
    setNewPostTitle(post.title);
    setIsDropdownOpen(false);

    if (post.leadMagnetKeyword && post.leadMagnetKeyword.trim()) {
      setNewKeyword(post.leadMagnetKeyword.toUpperCase());
    }

    if (post.status === "published") {
      if (post.linkedinPostId) {
        const url = post.linkedinPostId.startsWith("http")
          ? post.linkedinPostId
          : `https://www.linkedin.com/feed/update/urn:li:activity:${post.linkedinPostId}`;
        setNewPostUrl(url);
      } else {
        setNewPostUrl("");
      }
    } else {
      setNewPostUrl("");
    }
  };

  const handleCreateMonitor = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPostTitle.trim()) return;

    const isPending = isPostPendingPublish;

    const newMonitor: Level1Monitor = {
      id: `mon-l1-${Date.now()}`,
      postTitle: newPostTitle,
      postUrl: isPending
        ? ""
        : newPostUrl || "https://www.linkedin.com/feed/update/urn:li:activity:custom",
      keyword: newKeyword.toUpperCase(),
      status: isPending ? "pending_publish" : "active",
      autoLikeComment: newAutoLike,
      publicReplyTemplate: newPublicReply,
      nonConnectedNoteTemplate: newConnectionNote,
      attachedPdfName: newAttachedPdf,
      scannedCommentsCount: 0,
      leadsCapturedCount: 0,
      lastScanAt: isPending ? "En espera de publicación" : "Recién creado",
      lastScanAtIso: isPending ? undefined : new Date().toISOString(),
      scanFrequency: "daily",
      createdAt: new Date().toISOString(),
      originPostId: selectedCreatedPost?.id,
      originPostStatus: selectedCreatedPost?.status,
      scheduledAt: selectedCreatedPost?.scheduledAt,
    };

    addLevel1Monitor(newMonitor);
    setIsCreatingMonitor(false);
    setSelectedCreatedPost(null);
    setNewPostTitle("");
    setNewPostUrl("");
    setScanFeedback({
      type: "success",
      text: isPending
        ? `Monitor pre-configurado para "${newMonitor.postTitle}". Se activará automáticamente cuando la publicación salga en LinkedIn.`
        : `Monitor para "${newMonitor.postTitle}" creado y escuchando la palabra clave "${newMonitor.keyword}".`,
    });
  };

  const handleSaveManualUrl = (e: React.FormEvent) => {
    e.preventDefault();
    if (!linkingUrlModalMonitor || !manualLinkedInUrlInput.trim()) return;

    updateLevel1Monitor(linkingUrlModalMonitor.id, {
      postUrl: manualLinkedInUrlInput.trim(),
      status: "active",
      lastScanAt: "Listo para escanear",
    });

    setScanFeedback({
      type: "success",
      text: `URL de LinkedIn vinculada con éxito. Monitor activado para "${linkingUrlModalMonitor.postTitle}".`,
    });
    setLinkingUrlModalMonitor(null);
    setManualLinkedInUrlInput("");
  };

  const handleScanMonitor = async (mon: Level1Monitor) => {
    setIsScanningId(mon.id);
    setScanFeedback(null);
    try {
      const rawAccId = (activeAccount as any)?.unipileAccountId || activeAccount?.id || "";
      const res = await fetch(
        `/api/unipile/signals?postId=${encodeURIComponent(mon.postUrl)}&accountId=${encodeURIComponent(rawAccId)}`
      );
      const data = await res.json();
      const rawComments = Array.isArray(data.comments) ? data.comments : [];

      const kw = mon.keyword.toUpperCase();
      const matchingComments = rawComments.filter((c: any) => {
        const text = String(c.text || "").toUpperCase();
        return text.includes(kw);
      });

      const newLeadsToAdd: SignalLeadItem[] = matchingComments.map((c: any, idx: number) => {
        const parsed = parseCommentAuthor(c);

        return {
          id: `sig-lead-${Date.now()}-${idx}`,
          monitorId: mon.id,
          fullName: parsed.fullName,
          headline: parsed.headline,
          company: parsed.company,
          location: "España / Latam",
          linkedinUrl: parsed.linkedinUrl,
          avatarUrl: parsed.avatarUrl,
          connectionDegree: parsed.connectionDegree,
          intentLevel: "very_high",
          intentScore: 100,
          signalType: "keyword",
          signalLevel: "level_1",
          signalSnippet: `Comentó: "${c.text}"`,
          detectedAt: new Date().toISOString(),
          status: "dm_sent",
          attachedResource: mon.attachedPdfName,
          sourcePostId: mon.postUrl,
          sourcePostUrl: mon.postUrl,
          sourcePostTitle: mon.postTitle,
        };
      });

      const targetList = getOrCreateLevel1List({
        monitorId: mon.id,
        postTitle: mon.postTitle,
        keyword: mon.keyword,
      });

      const added = recordDiscoveredLeads(newLeadsToAdd);
      importSignalLeads(targetList, newLeadsToAdd);

      const newTotalScanned = Math.max(mon.scannedCommentsCount, rawComments.length);
      const newCapturedCount = Math.max(mon.leadsCapturedCount, added.length, newLeadsToAdd.length);

      updateLevel1Monitor(mon.id, {
        scannedCommentsCount: newTotalScanned,
        leadsCapturedCount: newCapturedCount,
        lastScanAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        lastScanAtIso: new Date().toISOString(),
      });

      if (rawComments.length === 0) {
        setScanFeedback({
          type: "success",
          text: `Auditoría en LinkedIn completada. El post aún no refleja comentarios indexados en la API de LinkedIn. (Nota: LinkedIn demora de 2 a 5 minutos en sincronizar comentarios nuevos hacia la API).`,
          listId: targetList.id,
        });
      } else if (matchingComments.length === 0) {
        setScanFeedback({
          type: "success",
          text: `Auditoría completada: Se analizaron ${rawComments.length} comentarios en LinkedIn, pero ninguno contiene aún la palabra clave exacta "${mon.keyword}".`,
          listId: targetList.id,
        });
      } else {
        setScanFeedback({
          type: "success",
          text: `¡Auditoría exitosa! Se detectaron ${matchingComments.length} comentarios con la palabra clave "${mon.keyword}" (${newLeadsToAdd.length} leads captados e incorporados al CRM).`,
          listId: targetList.id,
        });
      }
    } catch (err: any) {
      setScanFeedback({
        type: "error",
        text: `Error al escanear publicación: ${err.message || "Verifica la conexión con LinkedIn"}`,
      });
    } finally {
      setIsScanningId(null);
    }
  };

  // Auto-auditoría diaria en segundo plano (cada 24 horas por monitor activo)
  const hasAutoAuditedRef = useRef(false);
  useEffect(() => {
    if (!isLoaded || l1Monitors.length === 0 || hasAutoAuditedRef.current) return;
    if (!activeAccount || (activeAccount.status !== "OK" && activeAccount.status !== "CONNECTED")) return;

    hasAutoAuditedRef.current = true;
    const now = Date.now();
    const ONE_DAY_MS = 24 * 60 * 60 * 1000;

    const monitorsToAutoAudit = l1Monitors.filter((mon) => {
      if (mon.status !== "active") return false;
      if (!mon.postUrl || !mon.postUrl.startsWith("http")) return false;
      if (!mon.lastScanAtIso) return false;

      const lastScanTime = new Date(mon.lastScanAtIso).getTime();
      if (isNaN(lastScanTime)) return false;

      return now - lastScanTime >= ONE_DAY_MS;
    });

    if (monitorsToAutoAudit.length === 0) return;

    monitorsToAutoAudit.forEach((mon, index) => {
      setTimeout(() => {
        handleScanMonitor(mon);
      }, (index + 1) * 5000);
    });
  }, [isLoaded, l1Monitors.length, activeAccount?.id]);

  const handleSimulateCommentLead = (mon: Level1Monitor) => {
    const sampleNames = [
      { name: "Mariana Costa", headline: "Directora de Operaciones B2B en TechLatam", id: "mariana-costa-tech" },
      { name: "Carlos Benitez", headline: "VP de Ventas & Expansión en FinScale", id: "carlos-benitez-sales" },
      { name: "Lucía Fernández", headline: "Head of Growth en SaaS Studio", id: "lucia-fernandez-growth" },
    ];
    const pick = sampleNames[Math.floor(Math.random() * sampleNames.length)];
    const simulatedLead: SignalLeadItem = {
      id: `sig-lead-${Date.now()}`,
      monitorId: mon.id,
      fullName: pick.name,
      headline: pick.headline,
      company: "Empresa B2B",
      location: "Madrid, España",
      linkedinUrl: `https://www.linkedin.com/in/${pick.id}`,
      connectionDegree: "2nd",
      intentLevel: "very_high",
      intentScore: 100,
      signalType: "keyword",
      signalLevel: "level_1",
      signalSnippet: `Comentó: "${mon.keyword} por favor, me interesa mucho el framework!"`,
      detectedAt: new Date().toISOString(),
      status: "dm_sent",
      attachedResource: mon.attachedPdfName,
    };
    const added = recordDiscoveredLeads([simulatedLead]);
    const targetList = getOrCreateLevel1List({
      monitorId: mon.id,
      postTitle: mon.postTitle,
      keyword: mon.keyword,
    });
    importSignalLeads(targetList, [simulatedLead]);

    if (added.length > 0) {
      updateLevel1Monitor(mon.id, {
        scannedCommentsCount: mon.scannedCommentsCount + 1,
        leadsCapturedCount: mon.leadsCapturedCount + 1,
        lastScanAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      });
      setScanFeedback({
        type: "success",
        text: `Comentario simulado con éxito: ${simulatedLead.fullName} activó la entrega automática del recurso "${mon.attachedPdfName}".`,
        listId: targetList.id,
      });
    }
  };

  const getMonitorLeads = (monitorId: string): SignalLeadItem[] => {
    return leads.filter((l) => l.monitorId === monitorId);
  };

  const currentDisplayName = activeAccount?.name || currentUser.name || "Cuenta Principal de LinkedIn";
  const currentUserPhoto =
    activeAccount?.profilePictureUrl ||
    (activeAccount as any)?.avatarUrl ||
    currentUser?.avatarUrl ||
    "https://media.licdn.com/dms/image/v2/D4E03AQETqM_x3Dg7UA/profile-displayphoto-shrink_800_800/B4EZkzyXuFGwAc-/0/1757510466710?e=1793836800&v=beta&t=ti_Vff5L4ZlFHs8iYo8trtcyT1hKT4EikEtlwieUi0U";
  const currentUserProfileUrl =
    activeAccount?.publicProfileUrl || "https://www.linkedin.com/in/robertoorse-agencia";

  return (
    <div className="space-y-6">
      <PageBreadcrumb pageTitle="Signal Radar - Nivel 01: Mis Posts (Lead Magnet)" />

      {/* Métricas del Nivel 1 */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
            Monitores Nivel 1
          </span>
          <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
            {activeMonitorsCount} Activos
          </p>
          <span className="text-xs font-semibold text-brand-600 dark:text-brand-400">
            {pendingMonitorsCount > 0
              ? `${pendingMonitorsCount} en espera de publicación`
              : "Escaneo diario automático (cada 24h)"}
          </span>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
            Comentarios Analizados
          </span>
          <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
            {totalComments} Comentarios
          </p>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            Filtrados por palabra clave activadora
          </span>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
            Leads Captados & DMs Enviados
          </span>
          <p className="mt-2 text-2xl font-bold text-brand-600 dark:text-brand-400">
            {totalLeadsCaptured} Prospectos
          </p>
          <span className="text-xs font-semibold text-green-600 dark:text-green-400">
            Intención Muy Alta (Lead Magnet)
          </span>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
            Tasa de Conversion de Post
          </span>
          <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
            {totalComments > 0 ? ((totalLeadsCaptured / totalComments) * 100).toFixed(1) : 0}%
          </p>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            De comentario a conversacion directa
          </span>
        </div>
      </div>

      {/* Botón de Creación y Explicación del Mecanismo */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-5 rounded-2xl border border-brand-200 bg-brand-25/40 dark:border-brand-900 dark:bg-brand-950/20">
        <div>
          <h4 className="text-sm font-bold text-brand-900 dark:text-brand-200">
            Mecánica de Automatización de Lead Magnet en LinkedIn (Nivel 1)
          </h4>
          <p className="text-xs text-brand-700 dark:text-brand-300 mt-1 max-w-2xl">
            Al detectar la palabra clave en tu post: (1) Da Like al comentario, (2) Responde un mensaje público de confirmación, y (3) Valida conexión para enviar el PDF adjunto de forma instantánea por mensaje privado.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setIsCreatingMonitor(!isCreatingMonitor);
            setIsDropdownOpen(false);
          }}
          className="rounded-lg bg-brand-500 px-4 py-2.5 text-xs font-semibold text-white hover:bg-brand-600 transition"
        >
          {isCreatingMonitor ? "Cerrar Configurador" : "+ Agregar nuevo Monitor"}
        </button>
      </div>

      {/* Formulario de Creación de Monitor */}
      {isCreatingMonitor && (
        <ComponentCard
          title="Configurador de Monitor de Publicaciones Propias"
          desc="Ingresa los datos de tu publicación o selecciona un post creado en la plataforma para autocompletar título, palabra clave y recurso descargable."
        >
          <form onSubmit={handleCreateMonitor} className="space-y-4">
            {/* Fila 1: Título de la Publicación y URL o URN */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Buscador Inteligente con Dropdown desde /viral-posts/list */}
              <div className="relative">
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold uppercase text-gray-500">
                    Título Descriptivo del Post
                  </label>
                  {createdPosts.length > 0 && (
                    <span className="text-[10px] text-brand-600 dark:text-brand-400 font-medium">
                      {createdPosts.length} posts disponibles
                    </span>
                  )}
                </div>

                <div className="relative">
                  <input
                    type="text"
                    required
                    value={newPostTitle}
                    onFocus={() => setIsDropdownOpen(true)}
                    onChange={(e) => {
                      setNewPostTitle(e.target.value);
                      setIsDropdownOpen(true);
                      if (selectedCreatedPost && e.target.value !== selectedCreatedPost.title) {
                        setSelectedCreatedPost(null);
                      }
                    }}
                    placeholder="Escribe o selecciona una publicación de tu lista..."
                    className="h-10 w-full rounded-lg border border-gray-300 px-3 text-xs text-gray-800 focus:border-brand-500 focus:outline-hidden dark:border-gray-700 dark:bg-gray-900 dark:text-white pr-7"
                  />
                  {selectedCreatedPost && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedCreatedPost(null);
                        setNewPostTitle("");
                        setNewPostUrl("");
                      }}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                      title="Desvincular post seleccionado"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Dropdown de Sugerencias de /viral-posts/list */}
                {isDropdownOpen && createdPosts.length > 0 && (
                  <div
                    className="absolute z-50 left-0 right-0 mt-1 max-h-60 overflow-y-auto rounded-xl border border-gray-200 bg-white p-2 shadow-xl dark:border-gray-800 dark:bg-gray-900 text-xs"
                    onMouseDown={(e) => e.preventDefault()}
                  >
                    <div className="flex items-center justify-between px-2 py-1 border-b border-gray-100 dark:border-gray-800 mb-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                        Publicaciones en tu Base de Datos (/viral-posts/list)
                      </span>
                      <button
                        type="button"
                        onClick={() => setIsDropdownOpen(false)}
                        className="text-[10px] text-gray-400 hover:text-gray-600 font-bold"
                      >
                        ✕
                      </button>
                    </div>

                    <div className="space-y-1">
                      {createdPosts
                        .filter((p) =>
                          p.title.toLowerCase().includes(newPostTitle.toLowerCase().trim())
                        )
                        .slice(0, 8)
                        .map((post) => (
                          <div
                            key={post.id}
                            onClick={() => handleSelectCreatedPost(post)}
                            className="cursor-pointer rounded-lg p-2 hover:bg-brand-50/50 dark:hover:bg-brand-950/20 transition flex items-center justify-between gap-2 border border-transparent hover:border-brand-200 dark:hover:border-brand-800/40"
                          >
                            <div className="min-w-0 flex-1">
                              <p className="font-semibold text-gray-900 dark:text-white truncate">
                                {post.title}
                              </p>
                              <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-gray-500 dark:text-gray-400">
                                <span className="capitalize">{post.format}</span>
                                {post.leadMagnetKeyword && (
                                  <>
                                    <span>•</span>
                                    <span className="text-brand-600 dark:text-brand-400 font-mono font-bold">
                                      Trigger: {post.leadMagnetKeyword}
                                    </span>
                                  </>
                                )}
                                {post.scheduledAt && post.status === "scheduled" && (
                                  <>
                                    <span>•</span>
                                    <span>{new Date(post.scheduledAt).toLocaleDateString([], { day: "2-digit", month: "short" })}</span>
                                  </>
                                )}
                              </div>
                            </div>

                            <span
                              className={`rounded-full px-2 py-0.5 text-[10px] font-bold shrink-0 ${
                                post.status === "published"
                                  ? "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300"
                                  : post.status === "scheduled"
                                  ? "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                                  : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300"
                              }`}
                            >
                              {post.status === "published"
                                ? "Publicado"
                                : post.status === "scheduled"
                                ? "Programado"
                                : "Borrador"}
                            </span>
                          </div>
                        ))}

                      {createdPosts.filter((p) =>
                        p.title.toLowerCase().includes(newPostTitle.toLowerCase().trim())
                      ).length === 0 && (
                        <p className="p-2 text-center text-gray-400 text-xs">
                          No hay publicaciones que coincidan con &quot;{newPostTitle}&quot;. Puedes ingresar un título libre.
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {selectedCreatedPost ? (
                  <div className="mt-2 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50/70 p-2 text-xs text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-300 font-medium">
                    <span className="font-bold">✓ Publicación vinculada:</span>
                    <span className="font-semibold underline truncate max-w-[200px]">{selectedCreatedPost.title}</span>
                    <span className="ml-1.5 inline-block text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200 capitalize">
                      {selectedCreatedPost.status === "published" ? "Publicada" : selectedCreatedPost.status === "scheduled" ? "Programada" : "Borrador"}
                    </span>
                  </div>
                ) : (
                  <span className="text-[10px] text-gray-400 mt-1 block">
                    Selecciona una publicación creada o escribe un título personalizado.
                  </span>
                )}
              </div>

              {/* URL o Badge Inteligente si está Pendiente de Publicación */}
              <div>
                <label className="block text-xs font-semibold uppercase text-gray-500 mb-1">
                  URL o URN del Post en LinkedIn
                </label>

                {isPostPendingPublish ? (
                  <>
                    <div className="h-10 flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50/80 px-3 text-xs text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200">
                      <div className="flex items-center gap-1.5 truncate">
                        <span className="font-bold">Post {selectedCreatedPost?.status === "scheduled" ? "Programado" : "en Borrador"}</span>
                        {selectedCreatedPost?.scheduledAt && (
                          <span className="text-[11px] text-amber-700 dark:text-amber-300 truncate">
                            • {new Date(selectedCreatedPost.scheduledAt).toLocaleDateString([], { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                          </span>
                        )}
                      </div>
                      <span className="shrink-0 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300">
                        Pre-Configurado
                      </span>
                    </div>
                    <span className="text-[10px] text-amber-600 dark:text-amber-400 mt-1 block">
                      Se activará automáticamente en LinkedIn cuando la publicación sea lanzada.
                    </span>
                  </>
                ) : (
                  <>
                    <input
                      type="url"
                      value={newPostUrl}
                      onChange={(e) => setNewPostUrl(e.target.value)}
                      placeholder="https://www.linkedin.com/feed/update/urn:li:activity:..."
                      className="h-10 w-full rounded-lg border border-gray-300 px-3 text-xs text-gray-800 focus:border-brand-500 focus:outline-hidden dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                    />
                    <span className="text-[10px] text-gray-400 mt-1 block">
                      Enlace directo a la publicación para escuchar comentarios en vivo.
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Fila 2: Lead Magnet Trigger y Recurso Adjunto */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-gray-500 mb-1">
                  Palabra Clave Activadora (Trigger)
                </label>
                <input
                  type="text"
                  required
                  value={newKeyword}
                  onChange={(e) => setNewKeyword(e.target.value.toUpperCase())}
                  placeholder="SISTEMA, GUIA, PLANTILLA..."
                  className="h-10 w-full rounded-lg border border-gray-300 px-3 text-xs font-mono font-bold text-brand-600 focus:border-brand-500 focus:outline-hidden dark:border-gray-700 dark:bg-gray-900 dark:text-brand-400"
                />
                <span className="text-[10px] text-gray-400 mt-1 block">
                  Palabra que el usuario debe comentar en el post para activar la automatización.
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-gray-500 mb-1">
                  Recurso Adjunto (PDF o Enlace del Lead Magnet)
                </label>
                <input
                  type="text"
                  value={newAttachedPdf}
                  onChange={(e) => setNewAttachedPdf(e.target.value)}
                  placeholder="Ej. /downloads/guia-prospeccion.pdf o enlace externo..."
                  className="h-10 w-full rounded-lg border border-gray-300 px-3 text-xs text-gray-800 focus:border-brand-500 focus:outline-hidden dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                />
                <span className="text-[10px] text-gray-400 mt-1 block">
                  Enlace descargable o recurso de valor que se entregará al lead.
                </span>
              </div>
            </div>

            {/* Fila 3: Smart Automation Card - Reacción Automática */}
            <div className="flex items-center p-3.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50">
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={newAutoLike}
                  onChange={(e) => setNewAutoLike(e.target.checked)}
                  className="mt-0.5 rounded border-gray-300 text-brand-500 focus:ring-brand-500"
                />
                <div>
                  <span className="text-xs font-semibold text-gray-800 dark:text-gray-200 block">
                    Dar Like automático al comentario del lead
                  </span>
                  <span className="text-[11px] text-gray-500 dark:text-gray-400 block mt-0.5">
                    Aumenta el algoritmo orgánico de tu post y confirma al usuario que su comentario ha sido recibido.
                  </span>
                </div>
              </label>
            </div>

            {/* Fila 4: Pasos de Automatización Relacional */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-gray-500 mb-1">
                  Paso A: Respuesta Pública en el Post
                </label>
                <textarea
                  rows={3}
                  value={newPublicReply}
                  onChange={(e) => setNewPublicReply(e.target.value)}
                  placeholder="¡Hola {name}, te lo acabo de enviar por mensaje privado! Revisa tu bandeja"
                  className="w-full rounded-lg border border-gray-300 p-2.5 text-xs text-gray-800 font-mono focus:border-brand-500 focus:outline-hidden dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                />
                <span className="text-[10px] text-gray-400 mt-1 block">
                  Respuesta automática visible en el hilo del comentario en LinkedIn.
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-gray-500 mb-1">
                  Paso B: Nota de Invitación si no están conectados
                </label>
                <textarea
                  rows={3}
                  value={newConnectionNote}
                  onChange={(e) => setNewConnectionNote(e.target.value)}
                  placeholder="Hola {name}, aquí tienes el acceso a {pdf_url} que comentaste en mi publicación..."
                  className="w-full rounded-lg border border-gray-300 p-2.5 text-xs text-gray-800 font-mono focus:border-brand-500 focus:outline-hidden dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                />
                <span className="text-[10px] text-gray-400 mt-1 block">
                  Mensaje directo entregando el recurso prometido junto al enlace.
                </span>
              </div>
            </div>

            {/* Fila 5: Botones de Acción */}
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setIsCreatingMonitor(false);
                  setIsDropdownOpen(false);
                }}
                className="rounded-lg border border-gray-300 px-4 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className={`rounded-lg px-5 py-2 text-xs font-semibold text-white transition shadow-xs flex items-center gap-1.5 ${
                  isPostPendingPublish
                    ? "bg-amber-500 hover:bg-amber-600"
                    : "bg-brand-500 hover:bg-brand-600"
                }`}
              >
                <span>
                  {isPostPendingPublish
                    ? "Pre-Configurar Monitor (En Espera)"
                    : "Activar Monitor en LinkedIn"}
                </span>
              </button>
            </div>
          </form>
        </ComponentCard>
      )}

      {/* Barra de Cuenta Conectada & Estado de Escucha */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl bg-white border border-gray-200 dark:bg-gray-900 dark:border-gray-800 text-xs" suppressHydrationWarning>
        <div className="flex items-center gap-2">
          <span className="font-semibold text-gray-600 dark:text-gray-400">
            Cuenta de LinkedIn activa para escaneo:
          </span>
          <span className="font-bold text-gray-900 dark:text-white" suppressHydrationWarning>
            {currentDisplayName}
          </span>
          <span
            suppressHydrationWarning
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
      </div>

      {/* Banner de Feedback de Escaneo o Acciones */}
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

      {/* Listado de Monitores Activos */}
      <ComponentCard title={`Monitores de Señales: Publicaciones Propias (${l1Monitors.length})`}>
        {!isLoaded ? (
          <p className="text-xs text-gray-400 py-4">Cargando monitores...</p>
        ) : l1Monitors.length === 0 ? (
          <div className="py-12 text-center space-y-3">
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              No tienes publicaciones conectadas en Signal Radar Nivel 1.
            </p>
            <p className="text-xs text-gray-400 max-w-md mx-auto">
              Conecta una publicación de LinkedIn donde ofrezcas una guía, plantilla o recurso a cambio de una palabra clave (ej. &quot;SISTEMA&quot;).
            </p>
            <button
              type="button"
              onClick={() => setIsCreatingMonitor(true)}
              className="rounded-lg bg-brand-500 px-4 py-2 text-xs font-semibold text-white hover:bg-brand-600 transition"
            >
              + Conectar Primer Post
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-gray-100 text-[11px] font-bold uppercase tracking-wider text-gray-600 dark:border-gray-800 dark:text-gray-300">
                <tr>
                  <th className="px-4 py-3 min-w-[260px]">Cuenta / Publicación</th>
                  <th className="px-4 py-3 min-w-[140px]">Palabra Clave</th>
                  <th className="px-4 py-3 whitespace-nowrap">Leads Captados</th>
                  <th className="px-4 py-3 whitespace-nowrap">Último Escaneo</th>
                  <th className="px-4 py-3 whitespace-nowrap">Estado</th>
                  <th className="px-4 py-3 text-right whitespace-nowrap min-w-[350px]">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-xs dark:divide-gray-800">
                {l1Monitors.map((mon) => {
                  const isExpanded = Boolean(expandedMonitorsPosts[mon.id]);
                  const activeBatch = selectedBatchSize[mon.id] || 50;
                  const { count: effectiveCount, targetListId } = getEffectiveLevel1LeadCount(mon);

                  return (
                    <Fragment key={mon.id}>
                      <tr className="hover:bg-gray-50/50 dark:hover:bg-white/2 transition align-top">
                        {/* 1. Cuenta / Publicación */}
                        <td className="px-4 py-3.5 align-top">
                          <div className="flex items-start gap-2.5">
                            {/* Avatar con foto real de perfil de LinkedIn */}
                            {currentUserPhoto ? (
                              <img
                                src={currentUserPhoto}
                                alt={currentDisplayName}
                                className="h-8 w-8 object-cover rounded-full bg-white border border-gray-100 p-0.5 shadow-xs dark:border-gray-800 shrink-0 mt-0.5"
                                onError={(e) => {
                                  (e.target as HTMLElement).style.display = "none";
                                  const fb = (e.target as HTMLElement).nextElementSibling;
                                  if (fb) (fb as HTMLElement).style.display = "flex";
                                }}
                              />
                            ) : null}
                            <div
                              style={{ display: currentUserPhoto ? "none" : "flex" }}
                              className="h-8 w-8 text-white font-bold items-center justify-center shrink-0 text-xs shadow-xs rounded-full bg-purple-600 mt-0.5"
                            >
                              {currentDisplayName.charAt(0).toUpperCase()}
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <p className="font-semibold text-gray-900 dark:text-white">
                                  {currentDisplayName}
                                </p>
                                <span className="rounded-full px-1.5 py-0.2 text-[9px] font-bold bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                                  Mi Cuenta
                                </span>
                                <span className="rounded-full px-1.5 py-0.2 text-[9px] font-bold bg-brand-50 text-brand-700 dark:bg-brand-950/60 dark:text-brand-300 border border-brand-200 dark:border-brand-800">
                                  Lead Magnet
                                </span>
                                {mon.status === "pending_publish" && (
                                  <span className="rounded-full px-1.5 py-0.2 text-[9px] font-medium bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/60 dark:border-amber-800 dark:text-amber-300">
                                    En Espera de Publicar
                                  </span>
                                )}
                              </div>

                              <a
                                href={currentUserProfileUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="text-[11px] text-brand-600 hover:underline dark:text-brand-400 truncate block max-w-xs mt-0.5"
                              >
                                {currentUserProfileUrl}
                              </a>

                              {/* Botón para desplegar / ocultar publicación monitoreada */}
                              <button
                                type="button"
                                onClick={() =>
                                  setExpandedMonitorsPosts((prev) => ({
                                    ...prev,
                                    [mon.id]: !isExpanded,
                                  }))
                                }
                                className="inline-flex items-center gap-1.5 mt-1.5 text-[11px] font-semibold text-brand-600 dark:text-brand-400 hover:text-brand-700 hover:underline transition"
                                title={isExpanded ? "Ocultar la publicación monitoreada" : "Ver detalles de la publicación"}
                              >
                                <span>🔗</span>
                                <span>
                                  {isExpanded ? "Ocultar Publicación" : "Ver Publicación Monitoreada (1)"}
                                </span>
                                <span className="text-[10px]">{isExpanded ? "▴" : "▾"}</span>
                              </button>
                            </div>
                          </div>
                        </td>

                        {/* 2. Palabra Clave */}
                        <td className="px-4 py-3.5 align-top">
                          <span className="rounded bg-brand-50 border border-brand-200/60 px-2.5 py-1 font-mono font-bold text-xs text-brand-700 dark:bg-brand-950/60 dark:border-brand-900 dark:text-brand-300 inline-block">
                            {mon.keyword}
                          </span>
                        </td>

                        {/* 3. Leads Captados */}
                        <td className="px-4 py-3.5 whitespace-nowrap align-top">
                          <span className="font-bold text-brand-600 dark:text-brand-400">
                            {effectiveCount} leads
                          </span>
                        </td>

                        {/* 4. Último Escaneo */}
                        <td className="px-4 py-3.5 whitespace-nowrap text-gray-500 dark:text-gray-400 align-top">
                          <span className="font-medium text-gray-800 dark:text-gray-200">{mon.lastScanAt}</span>
                        </td>

                        {/* 5. Estado */}
                        <td className="px-4 py-3.5 whitespace-nowrap align-top">
                          {mon.status === "pending_publish" ? (
                            <span className="inline-block rounded-full bg-amber-50 px-2.5 py-0.5 font-semibold text-[11px] text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                              ⏳ En Espera
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => toggleLevel1Status(mon.id)}
                              className={`rounded-full px-2.5 py-0.5 font-semibold text-[11px] transition ${
                                mon.status === "active"
                                  ? "bg-green-50 text-green-700 hover:bg-green-100 dark:bg-green-950/40 dark:text-green-400"
                                  : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300"
                              }`}
                            >
                              {mon.status === "active" ? "Activo" : "Pausado"}
                            </button>
                          )}
                        </td>

                        {/* 6. Acciones */}
                        <td className="px-4 py-3.5 text-right whitespace-nowrap align-top min-w-[350px]">
                          <div className="inline-flex items-center justify-end gap-1.5 flex-nowrap shrink-0">
                            {/* Selector rápido de pastillas de lote [ 25 | 50 | 100 ] */}
                            <div
                              className="inline-flex items-center rounded-md border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/80 p-0.5 text-[10px] font-semibold"
                              title="Seleccionar tamaño de lote para la auditoría"
                            >
                              {([25, 50, 100] as const).map((batchVal) => {
                                const isSelected = activeBatch === batchVal;
                                return (
                                  <button
                                    key={batchVal}
                                    type="button"
                                    disabled={isScanningId === mon.id}
                                    onClick={() =>
                                      setSelectedBatchSize((prev) => ({
                                        ...prev,
                                        [mon.id]: batchVal,
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

                            {/* Botón de Auditoría / Vincular URL */}
                            {mon.status === "pending_publish" ? (
                              <button
                                type="button"
                                onClick={() => {
                                  setLinkingUrlModalMonitor(mon);
                                  setManualLinkedInUrlInput("");
                                }}
                                className="rounded-md bg-amber-500 hover:bg-amber-600 px-2.5 py-1 text-white font-medium text-xs transition inline-flex items-center gap-1 shadow-xs"
                                title="Vincular URL oficial de LinkedIn para activar este monitor"
                              >
                                🔗 Vincular URL
                              </button>
                            ) : (
                              <button
                                type="button"
                                disabled={isScanningId === mon.id}
                                onClick={() => handleScanMonitor(mon)}
                                className="rounded-md bg-brand-500 px-2.5 py-1 text-white hover:bg-brand-600 font-medium text-xs transition disabled:opacity-50 inline-flex items-center gap-1 shadow-2xs"
                                title={`Escanear comentarios con lote seguro de ${activeBatch}`}
                              >
                                {isScanningId === mon.id ? (
                                  <>
                                    <span className="h-3 w-3 rounded-full border-2 border-white/40 border-t-white animate-spin"></span>
                                    Escaneando ({activeBatch})...
                                  </>
                                ) : (
                                  <>
                                    <span>Escanear</span>
                                    <span className="rounded bg-brand-600/80 px-1 py-0.2 text-[10px] font-bold">
                                      {activeBatch}
                                    </span>
                                  </>
                                )}
                              </button>
                            )}

                            {/* Botón Ver Lista / Leads */}
                            <Link
                              href={`/leads/lists?listId=${encodeURIComponent(targetListId)}`}
                              className="rounded-md border border-brand-500 px-2.5 py-1 text-brand-600 hover:bg-brand-50 dark:text-brand-400 dark:hover:bg-brand-950/20 font-medium text-xs inline-flex items-center gap-1.5 transition"
                              title={`Abrir lista inteligente de "${mon.postTitle}"`}
                            >
                              <span>Ver Leads ({effectiveCount})</span>
                              <span aria-hidden="true">&rarr;</span>
                            </Link>

                            {/* Botón Editar Monitor */}
                            <button
                              type="button"
                              onClick={() => setEditingMonitor(mon)}
                              className="h-[26px] w-[26px] rounded-md border border-gray-200 text-gray-600 hover:border-brand-500 hover:text-brand-600 hover:bg-brand-50 dark:border-gray-700 dark:text-gray-300 dark:hover:border-brand-500 dark:hover:text-brand-400 dark:hover:bg-brand-950/20 inline-flex items-center justify-center transition shrink-0"
                              title="Editar monitor"
                            >
                              <Pencil className="size-3.5" />
                            </button>

                            {/* Botón Eliminar */}
                            <button
                              type="button"
                              onClick={() => {
                                if (effectiveCount === 0) {
                                  if (
                                    confirm(
                                      `¿Eliminar monitor de "${mon.postTitle}"?\n\nLa lista asociada no tiene prospectos (0 leads) y también será limpiada automáticamente.`
                                    )
                                  ) {
                                    deleteLevel1Monitor(mon.id);
                                    if (targetListId) deleteList(targetListId);
                                  }
                                } else {
                                  if (
                                    confirm(
                                      `¿Eliminar monitor de "${mon.postTitle}"?\n\nLos ${effectiveCount} prospectos ya captados se conservarán en tu lista de leads con la etiqueta "Monitor de Señales eliminado".`
                                    )
                                  ) {
                                    deleteLevel1Monitor(mon.id);
                                    markListMonitorAsDeleted(mon.id);
                                    markListMonitorAsDeleted(mon.postTitle);
                                  }
                                }
                              }}
                              className="h-[26px] w-[26px] rounded-md border border-red-200 text-red-600 hover:bg-red-50 dark:border-red-900/40 dark:text-red-400 inline-flex items-center justify-center transition shrink-0"
                              title="Eliminar monitor"
                            >
                              <X className="size-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Card de Ancho Completo para la Publicación Monitoreada (Estilo Nivel 2 con Fondo #E9F0F7) */}
                      {isExpanded && (
                        <tr key={`${mon.id}-posts-card`} className="border-t-0">
                          <td colSpan={6} className="px-4 pb-4 pt-0 border-t-0">
                            <div className="w-full rounded-xl border border-blue-200/80 bg-[#E9F0F7] p-3.5 dark:border-blue-900/40 dark:bg-gray-800/60 shadow-xs">
                              <div className="flex items-center justify-between mb-2.5">
                                <span className="text-xs font-bold text-gray-800 dark:text-blue-200 flex items-center gap-1.5">
                                  <Link2 className="size-3.5 text-brand-600 dark:text-brand-400" />
                                  <span>Publicación(es) de LinkedIn Monitoreada(s): Mis propios Posts (1)</span>
                                </span>
                                <span className="text-[11px] font-semibold text-brand-600 dark:text-brand-400">
                                  Publicado por {currentDisplayName}
                                </span>
                              </div>

                              <div className="text-xs bg-white dark:bg-gray-900 p-3.5 rounded-lg border border-blue-200/60 dark:border-gray-700 shadow-2xs flex items-center justify-between gap-4">
                                <div className="min-w-0 flex-1">
                                  <p className="font-semibold text-gray-900 dark:text-white leading-snug">
                                    <span className="font-bold text-gray-900 dark:text-white mr-1.5">
                                      {currentDisplayName}:
                                    </span>
                                    &ldquo;{mon.postTitle}&rdquo;
                                  </p>
                                  <div className="flex items-center gap-2 text-[11px] text-gray-500 dark:text-gray-400 mt-1 flex-wrap">
                                    <span className="font-bold text-brand-600">
                                      Palabra clave: &quot;{mon.keyword}&quot;
                                    </span>
                                    <span>•</span>
                                    <span>Recurso: {mon.attachedPdfName}</span>
                                    <span>•</span>
                                    <span>{mon.scannedCommentsCount} comentarios analizados</span>
                                    <span>•</span>
                                    <span className="text-emerald-600 font-semibold">{mon.leadsCapturedCount} leads calificados</span>
                                  </div>
                                </div>

                                {mon.postUrl ? (
                                  <a
                                    href={mon.postUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="shrink-0 inline-flex items-center gap-1.5 rounded-lg bg-brand-500 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-brand-600 transition shadow-xs"
                                  >
                                    <span>Ver Post</span>
                                    <ExternalLink className="size-3" />
                                  </a>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setLinkingUrlModalMonitor(mon);
                                      setManualLinkedInUrlInput("");
                                    }}
                                    className="shrink-0 inline-flex items-center gap-1.5 rounded-lg bg-amber-500 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-amber-600 transition shadow-xs"
                                  >
                                    <span>Vincular URL</span>
                                    <Link2 className="size-3" />
                                  </button>
                                )}
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

      {/* Modal para Visualizar Leads Captados por un Monitor Específico */}
      {selectedMonitorForLeads && (
        <div className="fixed inset-0 z-99999 flex items-center justify-center bg-black/60 p-4">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-6 shadow-theme-xl dark:bg-gray-900 border border-gray-200 dark:border-gray-800">
            <div className="flex items-start justify-between border-b border-gray-100 pb-4 dark:border-gray-800">
              <div>
                <span className="rounded bg-brand-50 px-2 py-0.5 text-xs font-mono font-bold text-brand-600 dark:bg-brand-950 dark:text-brand-300">
                  Palabra: {selectedMonitorForLeads.keyword}
                </span>
                <h3 className="mt-2 text-base font-bold text-gray-900 dark:text-white">
                  Leads Captados: {selectedMonitorForLeads.postTitle}
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Prospectos que comentaron la palabra clave y activaron la entrega del recurso &quot;{selectedMonitorForLeads.attachedPdfName}&quot;.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedMonitorForLeads(null)}
                className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 font-bold"
              >
                Cerrar
              </button>
            </div>

            <div className="my-4 divide-y divide-gray-100 dark:divide-gray-800">
              {getMonitorLeads(selectedMonitorForLeads.id).length === 0 ? (
                <div className="py-8 text-center space-y-3">
                  <p className="text-xs text-gray-500">
                    Aún no hay comentarios detectados con la palabra clave &quot;{selectedMonitorForLeads.keyword}&quot; en esta publicación.
                  </p>
                  <div className="flex items-center justify-center gap-3 pt-2">
                    <button
                      type="button"
                      disabled={isScanningId === selectedMonitorForLeads.id}
                      onClick={() => handleScanMonitor(selectedMonitorForLeads)}
                      className="rounded-lg bg-brand-500 px-4 py-1.5 text-xs font-semibold text-white hover:bg-brand-600 transition"
                    >
                      {isScanningId === selectedMonitorForLeads.id ? "Escaneando..." : "Escanear Publicación Ahora"}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSimulateCommentLead(selectedMonitorForLeads)}
                      className="rounded-lg border border-gray-300 px-3.5 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300"
                    >
                      + Simular Comentario de Prueba
                    </button>
                  </div>
                </div>
              ) : (
                getMonitorLeads(selectedMonitorForLeads.id).map((lead) => (
                  <div key={lead.id} className="py-3.5 flex items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-bold text-gray-900 dark:text-white">
                          {lead.fullName}
                        </h4>
                        <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-semibold text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                          Grado {lead.connectionDegree}
                        </span>
                        <span className="rounded bg-green-50 px-1.5 py-0.5 text-[10px] font-bold text-green-700 dark:bg-green-950 dark:text-green-400">
                          Intencion Muy Alta
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-500 dark:text-gray-400">
                        {lead.headline} • {lead.location}
                      </p>
                      <p className="text-xs text-brand-700 italic dark:text-brand-300 font-medium">
                        {lead.signalSnippet}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                        {lead.status === "dm_sent"
                          ? "DM Entregado con PDF"
                          : lead.status === "connected"
                          ? "Conectado"
                          : "Invitacion Enviada"}
                      </span>
                      <Link
                        href="/inbox"
                        className="rounded-lg bg-brand-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-600 transition"
                      >
                        Abrir Chat
                      </Link>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-800">
              <button
                type="button"
                onClick={() => handleSimulateCommentLead(selectedMonitorForLeads)}
                className="text-xs font-semibold text-brand-600 hover:underline dark:text-brand-400"
              >
                + Simular Comentario de Prueba
              </button>
              <div className="flex items-center gap-2">
                {(() => {
                  const { targetListId } = getEffectiveLevel1LeadCount(selectedMonitorForLeads);
                  return (
                    <Link
                      href={`/leads/lists?listId=${encodeURIComponent(targetListId)}`}
                      className="rounded-lg bg-brand-500 px-4 py-2 text-xs font-semibold text-white hover:bg-brand-600 transition inline-flex items-center gap-1.5"
                    >
                      <span>Abrir Lista Dinámica en CRM</span>
                      <span aria-hidden="true">&rarr;</span>
                    </Link>
                  );
                })()}
                <button
                  type="button"
                  onClick={() => setSelectedMonitorForLeads(null)}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal para Vincular URL de LinkedIn Manualmente */}
      {linkingUrlModalMonitor && (
        <div className="fixed inset-0 z-99999 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-theme-xl dark:bg-gray-900 border border-gray-200 dark:border-gray-800">
            <div className="flex items-start justify-between border-b border-gray-100 pb-3 dark:border-gray-800">
              <div>
                <h3 className="text-base font-bold text-gray-900 dark:text-white">
                  Vincular Publicación de LinkedIn
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate max-w-sm">
                  {linkingUrlModalMonitor.postTitle}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setLinkingUrlModalMonitor(null)}
                className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveManualUrl} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-gray-500 mb-1">
                  Pega la URL o URN del post publicado en LinkedIn
                </label>
                <input
                  type="url"
                  required
                  value={manualLinkedInUrlInput}
                  onChange={(e) => setManualLinkedInUrlInput(e.target.value)}
                  placeholder="https://www.linkedin.com/feed/update/urn:li:activity:7251892837461928371/"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs text-gray-800 focus:border-brand-500 focus:outline-hidden dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                />
                <p className="mt-1 text-[11px] text-gray-400">
                  Al vincular la URL, el monitor pasará inmediatamente al estado Activo y comenzará a escanear los comentarios con la palabra clave &quot;{linkingUrlModalMonitor.keyword}&quot;.
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-gray-100 dark:border-gray-800">
                <button
                  type="button"
                  onClick={() => setLinkingUrlModalMonitor(null)}
                  className="rounded-lg border border-gray-300 px-4 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-brand-500 px-4 py-1.5 text-xs font-semibold text-white hover:bg-brand-600 transition"
                >
                  Guardar y Activar Monitor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal para Editar Monitor Nivel 1 */}
      {editingMonitor && (
        <div className="fixed inset-0 z-99999 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="relative w-full max-w-xl rounded-3xl border border-gray-200 bg-white p-6 shadow-2xl dark:border-gray-800 dark:bg-gray-900 my-8">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3 dark:border-gray-800">
              <div className="flex items-center gap-2.5">
                <div className="flex size-9 items-center justify-center rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-400">
                  <Pencil className="size-4.5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-gray-900 dark:text-white leading-tight">
                    Editar Monitor de Publicación (Nivel 1)
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Ajusta la palabra clave, enlaces o plantillas relacionales de este monitor.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingMonitor(null)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                title="Cerrar"
              >
                <X className="size-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const form = e.currentTarget;
                const postTitle = (form.elements.namedItem("postTitle") as HTMLInputElement).value;
                const postUrl = (form.elements.namedItem("postUrl") as HTMLInputElement).value;
                const keyword = (form.elements.namedItem("keyword") as HTMLInputElement).value.toUpperCase().trim();
                const attachedPdfName = (form.elements.namedItem("attachedPdfName") as HTMLInputElement).value;
                const publicReplyTemplate = (form.elements.namedItem("publicReplyTemplate") as HTMLTextAreaElement).value;
                const nonConnectedNoteTemplate = (form.elements.namedItem("nonConnectedNoteTemplate") as HTMLTextAreaElement).value;
                const autoLikeComment = (form.elements.namedItem("autoLikeComment") as HTMLInputElement).checked;

                updateLevel1Monitor(editingMonitor.id, {
                  postTitle,
                  postUrl,
                  keyword,
                  attachedPdfName,
                  publicReplyTemplate,
                  nonConnectedNoteTemplate,
                  autoLikeComment,
                });

                setEditingMonitor(null);
                setScanFeedback({
                  type: "success",
                  text: `Monitor "${postTitle}" actualizado exitosamente.`,
                });
              }}
              className="mt-4 space-y-4"
            >
              <div>
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 pb-1 block">
                  Título de la Publicación / Lead Magnet
                </label>
                <input
                  name="postTitle"
                  type="text"
                  defaultValue={editingMonitor.postTitle}
                  required
                  className="h-9 w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 text-xs text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 pb-1 block">
                  URL Oficial de LinkedIn
                </label>
                <input
                  name="postUrl"
                  type="text"
                  defaultValue={editingMonitor.postUrl}
                  placeholder="https://www.linkedin.com/feed/update/urn:li:activity:..."
                  className="h-9 w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 text-xs text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 pb-1 block">
                    Palabra Clave de Activación
                  </label>
                  <input
                    name="keyword"
                    type="text"
                    defaultValue={editingMonitor.keyword}
                    required
                    className="h-9 w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 text-xs font-mono font-bold text-brand-600 dark:text-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 uppercase"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 pb-1 block">
                    Recurso Adjunto (PDF / Guía)
                  </label>
                  <input
                    name="attachedPdfName"
                    type="text"
                    defaultValue={editingMonitor.attachedPdfName}
                    required
                    className="h-9 w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 text-xs text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 pb-1 block">
                  Respuesta Pública al Comentario
                </label>
                <textarea
                  name="publicReplyTemplate"
                  rows={2}
                  defaultValue={editingMonitor.publicReplyTemplate}
                  className="w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 p-2.5 text-xs text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 pb-1 block">
                  Plantilla de Mensaje Privado / Nota
                </label>
                <textarea
                  name="nonConnectedNoteTemplate"
                  rows={2}
                  defaultValue={editingMonitor.nonConnectedNoteTemplate}
                  className="w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 p-2.5 text-xs text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 font-mono"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  name="autoLikeComment"
                  type="checkbox"
                  id="editAutoLike"
                  defaultChecked={editingMonitor.autoLikeComment}
                  className="h-4 w-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500 cursor-pointer"
                />
                <label htmlFor="editAutoLike" className="text-xs text-gray-700 dark:text-gray-300 cursor-pointer font-medium">
                  Auto-dar like al comentario del prospecto
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100 dark:border-gray-800">
                <button
                  type="button"
                  onClick={() => setEditingMonitor(null)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-brand-500 hover:bg-brand-600 text-white shadow-xs transition cursor-pointer"
                >
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
