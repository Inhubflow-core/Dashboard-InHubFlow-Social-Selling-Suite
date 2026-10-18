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
import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";

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
  const [scanFeedback, setScanFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

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
      const res = await fetch(
        `/api/unipile/signals?postId=${encodeURIComponent(mon.postUrl)}&accountId=${activeAccount?.id || ""}`
      );
      const data = await res.json();
      const rawComments = Array.isArray(data.comments) ? data.comments : [];

      const kw = mon.keyword.toUpperCase();
      const matchingComments = rawComments.filter((c: any) => {
        const text = String(c.text || "").toUpperCase();
        return text.includes(kw);
      });

      const newLeadsToAdd: SignalLeadItem[] = matchingComments.map((c: any, idx: number) => ({
        id: `sig-lead-${Date.now()}-${idx}`,
        monitorId: mon.id,
        fullName: c.author?.name || "Prospecto de LinkedIn",
        headline: c.author?.headline || "Profesional B2B",
        company: "Empresa detectada",
        location: "España / Latam",
        linkedinUrl: c.author?.public_identifier
          ? `https://www.linkedin.com/in/${c.author.public_identifier}`
          : "https://www.linkedin.com",
        avatarUrl: c.author?.profile_picture_url,
        connectionDegree: "2nd",
        intentLevel: "very_high",
        signalSnippet: `Comentó: "${c.text}"`,
        detectedAt: new Date().toISOString(),
        status: "dm_sent",
        attachedResource: mon.attachedPdfName,
      }));

      const added = recordDiscoveredLeads(newLeadsToAdd);
      const newTotalScanned = Math.max(mon.scannedCommentsCount, rawComments.length);
      const newCapturedCount = mon.leadsCapturedCount + added.length;

      updateLevel1Monitor(mon.id, {
        scannedCommentsCount: newTotalScanned,
        leadsCapturedCount: newCapturedCount,
        lastScanAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      });

      setScanFeedback({
        type: "success",
        text: `Escaneo completado: ${rawComments.length} comentarios analizados, ${added.length} nuevos leads captados con la palabra clave "${mon.keyword}".`,
      });
    } catch (err: any) {
      setScanFeedback({
        type: "error",
        text: `Error al escanear publicación: ${err.message || "Verifica la conexión con LinkedIn"}`,
      });
    } finally {
      setIsScanningId(null);
    }
  };

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
      signalSnippet: `Comentó: "${mon.keyword} por favor, me interesa mucho el framework!"`,
      detectedAt: new Date().toISOString(),
      status: "dm_sent",
      attachedResource: mon.attachedPdfName,
    };
    const added = recordDiscoveredLeads([simulatedLead]);
    if (added.length > 0) {
      updateLevel1Monitor(mon.id, {
        scannedCommentsCount: mon.scannedCommentsCount + 1,
        leadsCapturedCount: mon.leadsCapturedCount + 1,
        lastScanAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      });
      setScanFeedback({
        type: "success",
        text: `Comentario simulado con éxito: ${simulatedLead.fullName} activó la entrega automática del recurso "${mon.attachedPdfName}".`,
      });
    }
  };

  const getMonitorLeads = (monitorId: string): SignalLeadItem[] => {
    return leads.filter((l) => l.monitorId === monitorId);
  };

  const currentDisplayName = activeAccount?.name || currentUser.name || "Cuenta Principal de LinkedIn";

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
              : "Escaneando comentarios cada 5 min"}
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
          {isCreatingMonitor ? "Cerrar Configurador" : "+ Conectar Nuevo Post"}
        </button>
      </div>

      {/* Formulario de Creación de Monitor */}
      {isCreatingMonitor && (
        <ComponentCard
          title="Configurador de Monitor Nivel 1"
          desc="Ingresa los datos de tu publicacion o selecciona un post creado en la plataforma para autocompletar titulo, palabra clave y URL."
        >
          <form onSubmit={handleCreateMonitor} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Buscador Inteligente con Dropdown desde /viral-posts/list */}
              <div className="relative">
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold uppercase text-gray-500">
                    Titulo Descriptivo del Post
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
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs text-gray-800 focus:border-brand-500 focus:outline-hidden dark:border-gray-700 dark:bg-gray-900 dark:text-white pr-7"
                  />
                  {selectedCreatedPost && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedCreatedPost(null);
                        setNewPostTitle("");
                        setNewPostUrl("");
                      }}
                      className="absolute right-2.5 top-2 text-xs font-bold text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                      title="Desvincular post seleccionado"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Dropdown de Sugerencias de /viral-posts/list */}
                {isDropdownOpen && createdPosts.length > 0 && (
                  <div
                    className="absolute z-50 left-0 right-0 mt-1 max-h-60 overflow-y-auto rounded-xl border border-gray-200 bg-white p-2 shadow-theme-lg dark:border-gray-800 dark:bg-gray-900 text-xs"
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

                {selectedCreatedPost && (
                  <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-emerald-700 dark:text-emerald-400 font-medium">
                    <span>✓ Post vinculado:</span>
                    <span className="font-bold truncate max-w-[200px]">{selectedCreatedPost.title}</span>
                  </div>
                )}
              </div>

              {/* URL o Badge Inteligente si está Pendiente de Publicación */}
              <div>
                <label className="block text-xs font-semibold uppercase text-gray-500 mb-1">
                  URL o URN del Post en LinkedIn
                </label>

                {isPostPendingPublish ? (
                  <div className="rounded-lg border border-amber-200 bg-amber-50/70 p-2.5 dark:border-amber-900/50 dark:bg-amber-950/20 text-xs space-y-1">
                    <div className="flex items-center gap-1.5 font-bold text-amber-800 dark:text-amber-300">
                      <span>⏳ Post {selectedCreatedPost?.status === "scheduled" ? "Programado" : "en Borrador"}</span>
                      {selectedCreatedPost?.scheduledAt && (
                        <span className="font-normal text-[11px] text-amber-700 dark:text-amber-400">
                          • Previsto para: {new Date(selectedCreatedPost.scheduledAt).toLocaleDateString([], { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-amber-700 dark:text-amber-400">
                      Aún no tiene URL en LinkedIn. Se creará como <b>Monitor Pre-Configurado</b> y se activará automáticamente al publicarse.
                    </p>
                  </div>
                ) : (
                  <input
                    type="url"
                    value={newPostUrl}
                    onChange={(e) => setNewPostUrl(e.target.value)}
                    placeholder="https://www.linkedin.com/feed/update/urn:li:activity:..."
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs text-gray-800 focus:border-brand-500 focus:outline-hidden dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                  />
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-gray-500 mb-1">
                  Palabra Clave Activadora
                </label>
                <input
                  type="text"
                  required
                  value={newKeyword}
                  onChange={(e) => setNewKeyword(e.target.value.toUpperCase())}
                  placeholder="SISTEMA, GUIA, PLANTILLA..."
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs font-mono font-bold text-brand-600 focus:border-brand-500 focus:outline-hidden dark:border-gray-700 dark:bg-gray-900 dark:text-brand-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-gray-500 mb-1">
                  Recurso Adjunto (PDF Lead Magnet)
                </label>
                <input
                  type="text"
                  value={newAttachedPdf}
                  onChange={(e) => setNewAttachedPdf(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs text-gray-800 focus:border-brand-500 focus:outline-hidden dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                />
              </div>

              <div className="flex items-center pt-5">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-gray-700 dark:text-gray-300">
                  <input
                    type="checkbox"
                    checked={newAutoLike}
                    onChange={(e) => setNewAutoLike(e.target.checked)}
                    className="rounded border-gray-300 text-brand-500 focus:ring-brand-500"
                  />
                  <span>Dar Like automatico al comentario del lead</span>
                </label>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-gray-500 mb-1">
                  Paso A: Respuesta Publica en el Post
                </label>
                <input
                  type="text"
                  value={newPublicReply}
                  onChange={(e) => setNewPublicReply(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs text-gray-800 focus:border-brand-500 focus:outline-hidden dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-gray-500 mb-1">
                  Paso B: Nota de Invitacion si no estan conectados
                </label>
                <input
                  type="text"
                  value={newConnectionNote}
                  onChange={(e) => setNewConnectionNote(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs text-gray-800 focus:border-brand-500 focus:outline-hidden dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                />
              </div>
            </div>

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
                className={`rounded-lg px-5 py-2 text-xs font-semibold text-white transition ${
                  isPostPendingPublish
                    ? "bg-amber-500 hover:bg-amber-600"
                    : "bg-brand-500 hover:bg-brand-600"
                }`}
              >
                {isPostPendingPublish
                  ? "Pre-Configurar Monitor (En Espera)"
                  : "Activar Monitor en LinkedIn"}
              </button>
            </div>
          </form>
        </ComponentCard>
      )}


      {/* Barra de Cuenta Conectada & Estado de Escucha */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl bg-white border border-gray-200 dark:bg-gray-900 dark:border-gray-800 text-xs">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-gray-600 dark:text-gray-400">
            Cuenta de LinkedIn activa para captación:
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
          <button
            type="button"
            onClick={() => setScanFeedback(null)}
            className="text-xs font-bold hover:underline px-2"
          >
            ✕
          </button>
        </div>
      )}

      {/* Listado de Monitores Activos */}
      <ComponentCard title={`Monitores de Publicaciones Propias (${l1Monitors.length})`}>
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
                  <th className="px-4 py-3 min-w-[240px]">Publicación / Lead Magnet</th>
                  <th className="px-4 py-3 whitespace-nowrap">Palabra Clave</th>
                  <th className="px-4 py-3 whitespace-nowrap">Leads Captados</th>
                  <th className="px-4 py-3 whitespace-nowrap">Último Escaneo</th>
                  <th className="px-4 py-3 whitespace-nowrap">Estado</th>
                  <th className="px-4 py-3 text-right whitespace-nowrap">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-xs dark:divide-gray-800">
                {l1Monitors.map((mon) => (
                  <tr key={mon.id} className="hover:bg-gray-50/50 dark:hover:bg-white/2 transition">
                    <td className="px-4 py-3.5 max-w-xs">
                      <p className="font-semibold text-gray-900 dark:text-white truncate">
                        {mon.postTitle}
                      </p>
                      <p className="text-[11px] text-gray-400 truncate">
                        Adjunto: {mon.attachedPdfName}
                      </p>
                      {mon.status === "pending_publish" ? (
                        <div className="mt-1 flex items-center gap-1.5 text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                          <span>⏳ Pendiente de Publicación</span>
                          {mon.scheduledAt && (
                            <span>• {new Date(mon.scheduledAt).toLocaleDateString([], { day: "2-digit", month: "short" })}</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-[10px] text-brand-600 dark:text-brand-400 truncate block">
                          {mon.postUrl}
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <span className="rounded bg-brand-50 px-2.5 py-1 font-mono font-bold text-xs text-brand-600 dark:bg-brand-950 dark:text-brand-300">
                        {mon.keyword}
                      </span>
                    </td>

                    <td className="px-4 py-3.5 whitespace-nowrap font-bold text-brand-600 dark:text-brand-400">
                      {mon.leadsCapturedCount} leads
                    </td>

                    <td className="px-4 py-3.5 whitespace-nowrap text-gray-500 dark:text-gray-400">
                      {mon.lastScanAt}
                    </td>

                    <td className="px-4 py-3.5 whitespace-nowrap">
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

                    <td className="px-4 py-3.5 text-right space-x-1.5 whitespace-nowrap">
                      {/* Botón de Escaneo o Vincular URL si está en espera */}
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
                          className="rounded-md bg-brand-500 px-2.5 py-1 text-white hover:bg-brand-600 font-medium text-xs transition disabled:opacity-50 inline-flex items-center gap-1"
                          title="Escanear comentarios de la publicación en LinkedIn"
                        >
                          {isScanningId === mon.id ? (
                            <>
                              <span className="h-3 w-3 rounded-full border-2 border-white/40 border-t-white animate-spin"></span>
                              Escaneando...
                            </>
                          ) : (
                            "Escanear Ahora"
                          )}
                        </button>
                      )}

                      {/* Botón de Ver Leads */}
                      <button
                        type="button"
                        onClick={() => setSelectedMonitorForLeads(mon)}
                        className="rounded-md border border-brand-500 px-2.5 py-1 text-brand-600 hover:bg-brand-50 dark:text-brand-400 dark:hover:bg-brand-950/20 font-medium text-xs"
                      >
                        Ver Leads ({getMonitorLeads(mon.id).length})
                      </button>


                      {/* Botón Eliminar */}
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm(`¿Eliminar monitor de "${mon.postTitle}"?`)) {
                            deleteLevel1Monitor(mon.id);
                          }
                        }}
                        className="rounded-md border border-red-200 px-2 py-1 text-red-600 hover:bg-red-50 dark:border-red-900/40 dark:text-red-400 text-xs"
                        title="Eliminar monitor"
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
                  Al vincular la URL, el monitor pasará inmediatamente al estado Activo y comenzará a auditar los comentarios con la palabra clave &quot;{linkingUrlModalMonitor.keyword}&quot;.
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
    </div>
  );
}
