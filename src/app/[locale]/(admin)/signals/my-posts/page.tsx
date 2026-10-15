"use client";

import ComponentCard from "@/components/common/ComponentCard";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { useSignalRadar } from "@/lib/signals/store";
import type { Level1Monitor, SignalLeadItem } from "@/lib/signals/types";
import { getStoredAccounts } from "@/lib/unipile/store";
import type { UnipileAccount } from "@/lib/unipile/types";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function MyPostsSignalRadarPage() {
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

  const handleCreateMonitor = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPostTitle.trim()) return;

    const newMonitor: Level1Monitor = {
      id: `mon-l1-${Date.now()}`,
      postTitle: newPostTitle,
      postUrl: newPostUrl || "https://www.linkedin.com/feed/update/urn:li:activity:custom",
      keyword: newKeyword.toUpperCase(),
      status: "active",
      autoLikeComment: newAutoLike,
      publicReplyTemplate: newPublicReply,
      nonConnectedNoteTemplate: newConnectionNote,
      attachedPdfName: newAttachedPdf,
      scannedCommentsCount: 0,
      leadsCapturedCount: 0,
      lastScanAt: "Recien creado",
      createdAt: new Date().toISOString(),
    };

    addLevel1Monitor(newMonitor);
    setIsCreatingMonitor(false);
    setNewPostTitle("");
    setNewPostUrl("");
    setScanFeedback({
      type: "success",
      text: `Monitor para "${newMonitor.postTitle}" creado y escuchando la palabra clave "${newMonitor.keyword}".`,
    });
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

  const currentDisplayName = activeAccount?.name || "Cuenta Principal de LinkedIn";

  return (
    <div className="space-y-6">
      <PageBreadcrumb pageTitle="Signal Radar - Nivel 01: Mis Posts (Lead Magnet)" />

      {/* Métricas del Nivel 1 */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
            Monitores Nivel 1 Activos
          </span>
          <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
            {activeMonitorsCount} Publicaciones
          </p>
          <span className="text-xs font-semibold text-brand-600 dark:text-brand-400">
            Escaneando comentarios cada 5 min
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
            Mecanica de Automatizacion de Lead Magnet en LinkedIn (Nivel 1)
          </h4>
          <p className="text-xs text-brand-700 dark:text-brand-300 mt-1 max-w-2xl">
            Al detectar la palabra clave en tu post: (1) Da Like al comentario, (2) Responde un mensaje publico de confirmacion, y (3) Valida conexion para enviar el PDF adjunto de forma instantanea por mensaje privado.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsCreatingMonitor(!isCreatingMonitor)}
          className="rounded-lg bg-brand-500 px-4 py-2.5 text-xs font-semibold text-white hover:bg-brand-600 transition"
        >
          {isCreatingMonitor ? "Cerrar Configurador" : "+ Conectar Nuevo Post"}
        </button>
      </div>

      {/* Formulario de Creación de Monitor */}
      {isCreatingMonitor && (
        <ComponentCard
          title="Configurador de Monitor Nivel 1"
          desc="Ingresa los datos de tu publicacion de LinkedIn para activar la escucha de comentarios y auto-respuesta."
        >
          <form onSubmit={handleCreateMonitor} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-gray-500 mb-1">
                  Titulo Descriptivo del Post
                </label>
                <input
                  type="text"
                  required
                  value={newPostTitle}
                  onChange={(e) => setNewPostTitle(e.target.value)}
                  placeholder="Ej. Carrusel sobre Prospeccion B2B con IA..."
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs text-gray-800 focus:border-brand-500 focus:outline-hidden dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-gray-500 mb-1">
                  URL o URN del Post en LinkedIn
                </label>
                <input
                  type="url"
                  value={newPostUrl}
                  onChange={(e) => setNewPostUrl(e.target.value)}
                  placeholder="https://www.linkedin.com/feed/update/urn:li:activity:..."
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs text-gray-800 focus:border-brand-500 focus:outline-hidden dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                />
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
                onClick={() => setIsCreatingMonitor(false)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="rounded-lg bg-brand-500 px-5 py-2 text-xs font-semibold text-white hover:bg-brand-600 transition"
              >
                Activar Monitor en LinkedIn
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
              <thead className="border-b border-gray-100 text-xs font-semibold uppercase text-gray-400 dark:border-gray-800">
                <tr>
                  <th className="pb-3">Publicacion / Lead Magnet</th>
                  <th className="pb-3">Palabra Clave</th>
                  <th className="pb-3">Comentarios</th>
                  <th className="pb-3">Leads Captados</th>
                  <th className="pb-3">Ultima Deteccion</th>
                  <th className="pb-3">Estado</th>
                  <th className="pb-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-xs dark:divide-gray-800">
                {l1Monitors.map((mon) => (
                  <tr key={mon.id} className="hover:bg-gray-50/50 dark:hover:bg-white/2 transition">
                    <td className="py-4 max-w-xs">
                      <p className="font-semibold text-gray-900 dark:text-white truncate">
                        {mon.postTitle}
                      </p>
                      <p className="text-[11px] text-gray-400 truncate">
                        Adjunto: {mon.attachedPdfName}
                      </p>
                      <span className="text-[10px] text-brand-600 dark:text-brand-400 truncate block">
                        {mon.postUrl}
                      </span>
                    </td>

                    <td className="py-4">
                      <span className="rounded bg-brand-50 px-2.5 py-1 font-mono font-bold text-xs text-brand-600 dark:bg-brand-950 dark:text-brand-300">
                        {mon.keyword}
                      </span>
                    </td>

                    <td className="py-4 text-gray-700 dark:text-gray-300 font-medium">
                      {mon.scannedCommentsCount}
                    </td>

                    <td className="py-4 font-bold text-brand-600 dark:text-brand-400">
                      {mon.leadsCapturedCount} leads
                    </td>

                    <td className="py-4 text-gray-500 dark:text-gray-400">
                      {mon.lastScanAt}
                    </td>

                    <td className="py-4">
                      <button
                        type="button"
                        onClick={() => toggleLevel1Status(mon.id)}
                        className={`rounded-full px-2.5 py-0.5 font-semibold text-[11px] transition ${
                          mon.status === "active"
                            ? "bg-green-50 text-green-700 hover:bg-green-100 dark:bg-green-950/40 dark:text-green-400"
                            : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300"
                        }`}
                      >
                        {mon.status === "active" ? "Activo (Escuchando)" : "Pausado"}
                      </button>
                    </td>

                    <td className="py-4 text-right space-x-1.5 whitespace-nowrap">
                      {/* Botón de Escaneo en Vivo */}
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

                      {/* Botón de Ver Leads */}
                      <button
                        type="button"
                        onClick={() => setSelectedMonitorForLeads(mon)}
                        className="rounded-md border border-brand-500 px-2.5 py-1 text-brand-600 hover:bg-brand-50 dark:text-brand-400 dark:hover:bg-brand-950/20 font-medium text-xs"
                      >
                        Ver Leads ({getMonitorLeads(mon.id).length})
                      </button>

                      {/* Enlace a Campañas */}
                      <Link
                        href="/campaigns"
                        className="rounded-md border border-gray-200 px-2.5 py-1 text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 text-xs inline-block"
                      >
                        Secuencia
                      </Link>

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
    </div>
  );
}
