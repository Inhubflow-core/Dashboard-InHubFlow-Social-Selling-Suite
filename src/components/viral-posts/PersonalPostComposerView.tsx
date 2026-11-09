"use client";

import React, { useState, useEffect } from "react";
import ComponentCard from "@/components/common/ComponentCard";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import {
  Sparkles,
  PenTool,
  Image as ImageIcon,
  Calendar,
  Send,
  Eye,
  CheckCircle2,
  AlertCircle,
  Copy,
  Trash2,
  RefreshCw,
  Hash,
  List,
  Smile,
  FileText,
  Sliders,
  ExternalLink,
  Bot
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import {
  getActiveAccountForUser,
  getVisibleAccountsForUser,
  accountMatchesUser,
} from "@/lib/unipile/store";
import type { UnipileAccount } from "@/lib/unipile/types";
import { useCreatedPosts } from "@/lib/viral-posts/store";
import type { CreatedPost, PostFormat } from "@/lib/viral-posts/types";
import DooryStudioModal from "./DooryStudioModal";

export default function PersonalPostComposerView({
  onTabChange,
  hideBreadcrumb,
}: {
  onTabChange?: (tab: string) => void;
  hideBreadcrumb?: boolean;
} = {}) {
  const { currentUser } = useAuth();
  const { addPost } = useCreatedPosts();

  // Cuentas de LinkedIn
  const [accounts, setAccounts] = useState<UnipileAccount[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>("");

  // Modo de composiciÃ³n: 'scratch' (desde cero) o 'external' (modelar texto ajeno)
  const [compositionMode, setCompositionMode] = useState<"scratch" | "external">("scratch");
  const [externalPastedText, setExternalPastedText] = useState("");
  const [isAiPolishing, setIsAiPolishing] = useState(false);

  // Campos del post
  const [title, setTitle] = useState("");
  const [bodyText, setBodyText] = useState(
    `La mayorÃ­a de lÃ­deres B2B cometen el mismo error al prospectar en LinkedIn:

Hablan de su producto antes de entender el dolor del decisor.

AquÃ­ tienes el framework exacto que usamos para cerrar reuniones cualificadas:

1. Identifica una seÃ±al de compra real (contrataciones, cambios de puesto).
2. Abre con un diagnÃ³stico personalizado en lugar de un pitch en frÃ­o.
3. Entrega un activo de valor concreto (plantilla, guÃ­a o cÃ¡lculo).

Â¿CuÃ¡l ha sido tu mayor reto de prospecciÃ³n este trimestre? Te leo en los comentarios.`
  );
  const [attachedImage, setAttachedImage] = useState<string | null>(null);

  // Modal de Estudio Visual (Canva / Fabric.js)
  const [isVisualStudioOpen, setIsVisualStudioOpen] = useState(false);

  // Estados de Inbound Lead Magnet & Auto-DM (Feature #1)
  const [autoDmEnabled, setAutoDmEnabled] = useState(true);
  const [leadMagnetKeyword, setLeadMagnetKeyword] = useState("SISTEMA");
  const [autoLikeComment, setAutoLikeComment] = useState(true);
  const [autoDmMessage, setAutoDmMessage] = useState(
    `Â¡Hola {nombre}! Vi que comentaste '{palabra_clave}' en mi publicaciÃ³n. AquÃ­ tienes el documento completo con el framework accionable en PDF. Â¿En quÃ© reto comercial estÃ¡s enfocado este trimestre?`
  );

  // Estados de publicaciÃ³n
  const [isPublishing, setIsPublishing] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduledDate, setScheduledDate] = useState(() => {
    const tomorrow = new Date(Date.now() + 86400000);
    return tomorrow.toISOString().split("T")[0];
  });
  const [scheduledTime, setScheduledTime] = useState("09:30");
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Cargar cuentas del usuario
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
      setAccounts(accountsList as any);
      if (active) {
        setSelectedAccountId(active.id);
      } else if (accountsList.length > 0) {
        setSelectedAccountId(accountsList[0].id);
      }
    };

    syncAccounts();
    window.addEventListener("storage", syncAccounts);
    return () => window.removeEventListener("storage", syncAccounts);
  }, [currentUser]);

  // Contadores y mÃ©tricas de LinkedIn
  const charCount = bodyText.length;
  const maxChars = 3000;
  const foldCutoff = 190; // Caracteres antes del botÃ³n "ver mÃ¡s..." de LinkedIn

  // Pulir o transformar texto externo con IA
  const handlePolishWithAi = async (instruction: "reformat_b2b" | "strong_hook" | "bullet_points") => {
    const textToProcess = compositionMode === "external" ? externalPastedText : bodyText;
    if (!textToProcess.trim()) return;

    setIsAiPolishing(true);
    setFeedback(null);

    try {
      const res = await fetch("/api/ai/model-post", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          originalContent: textToProcess,
          topic: title || "Social Selling & Liderazgo B2B",
          format: "text",
          tone:
            instruction === "strong_hook"
              ? "Gancho provocador con apertura de bucle"
              : instruction === "bullet_points"
              ? "Estructura accionable paso a paso con puntos"
              : "Autoridad B2B concisa y profesional",
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo optimizar el texto con IA.");

      if (data.result?.content) {
        setBodyText(data.result.content);
        setCompositionMode("scratch"); // Pasar al editor principal
        setFeedback({
          type: "success",
          message: "Â¡Texto optimizado y formateado para el feed de LinkedIn con Ã©xito!",
        });
        setTimeout(() => setFeedback(null), 4000);
      }
    } catch (err: any) {
      setFeedback({
        type: "error",
        message: err.message || "Error al procesar el texto con IA.",
      });
    } finally {
      setIsAiPolishing(false);
    }
  };

  // Guardar o Publicar post
  const handleSaveOrPublish = async (status: "published" | "scheduled" | "draft") => {
    if (!bodyText.trim()) {
      setFeedback({ type: "error", message: "El contenido del post no puede estar vacÃ­o." });
      return;
    }

    setFeedback(null);

    if (status === "published") {
      setIsPublishing(true);
      try {
        const res = await fetch("/api/unipile/posts/publish", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            account_id: selectedAccountId,
            text: bodyText,
          }),
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "Error al publicar directamente en LinkedIn.");
        }
      } catch (err: any) {
        setFeedback({
          type: "error",
          message: err.message || "No se pudo publicar en LinkedIn. Revisa el estado de la cuenta.",
        });
        setIsPublishing(false);
        return;
      } finally {
        setIsPublishing(false);
      }
    }

    const postFormat: PostFormat = attachedImage ? "image" : "text";

    const newPost: CreatedPost = {
      id: `post-personal-${Date.now()}`,
      title: title.trim() || bodyText.split("\n")[0].substring(0, 70),
      format: postFormat,
      content: bodyText,
      mediaUrl: attachedImage || undefined,
      leadMagnetKeyword: autoDmEnabled ? leadMagnetKeyword : undefined,
      autoDmEnabled,
      autoDmMessage: autoDmEnabled ? autoDmMessage : undefined,
      autoLikeComment: autoDmEnabled ? autoLikeComment : undefined,
      status,
      targetAccountId: selectedAccountId,
      scheduledAt: status === "scheduled" ? `${scheduledDate}T${scheduledTime}:00` : undefined,
      publishedAt: status === "published" ? new Date().toISOString() : undefined,
      createdAt: new Date().toISOString(),
      metrics: {
        likes: 0,
        comments: 0,
        impressions: 0,
        leadsCaptured: 0,
      },
    };

    addPost(newPost);
    setShowScheduleModal(false);

    setFeedback({
      type: "success",
      message:
        status === "published"
          ? "Â¡PublicaciÃ³n emitida con Ã©xito en tu feed de LinkedIn!"
          : status === "scheduled"
          ? `Â¡PublicaciÃ³n agendada para el ${scheduledDate} a las ${scheduledTime}!`
          : "Borrador guardado exitosamente.",
    });

    setTimeout(() => {
      if (onTabChange) onTabChange("list");
    }, 1500);
  };

  // Insertar emojis o viÃ±etas rÃ¡pidas
  const insertTextSnippet = (snippet: string) => {
    setBodyText((prev) => prev + snippet);
  };

  const activeAccount = accounts.find((a) => a.id === selectedAccountId);

  return (
    <div className="w-full space-y-6">
      {!hideBreadcrumb && <PageBreadcrumb pageTitle="Post Personal & CreaciÃ³n Libre" />}

      {/* Alerta de Feedback */}
      {feedback && (
        <div
          className={`flex items-center gap-3 p-4 rounded-xl text-xs font-semibold border transition ${
            feedback.type === "success"
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
              : "bg-red-500/10 border-red-500/30 text-red-400"
          }`}
        >
          {feedback.type === "success" ? (
            <CheckCircle2 className="size-4 shrink-0" />
          ) : (
            <AlertCircle className="size-4 shrink-0" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      <div className="grid grid-cols-12 gap-6">
        {/* PANEL IZQUIERDO: COMPOSITOR Y HERRAMIENTAS */}
        <div className="col-span-12 xl:col-span-7 space-y-6">
          <ComponentCard
            title="CreaciÃ³n Libre de Publicaciones"
            desc="Escribe de tu propia inspiraciÃ³n o pega un borrador externo para optimizarlo y complementarlo con grÃ¡ficos de alto impacto."
          >
            <div className="space-y-5">
              {/* Selector de Modo: Escribir vs Modelar Texto Externo */}
              <div className="flex items-center p-1 bg-gray-100 dark:bg-gray-800/80 rounded-xl border border-gray-200 dark:border-gray-700/60">
                <button
                  type="button"
                  onClick={() => setCompositionMode("scratch")}
                  className={`flex-1 py-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-2 transition ${
                    compositionMode === "scratch"
                      ? "bg-white dark:bg-gray-900 text-brand-600 dark:text-brand-400 shadow-xs"
                      : "text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                  }`}
                >
                  <PenTool className="size-3.5" />
                  <span>Escribir Mi Propio Post</span>
                </button>
                <button
                  type="button"
                  onClick={() => setCompositionMode("external")}
                  className={`flex-1 py-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-2 transition ${
                    compositionMode === "external"
                      ? "bg-white dark:bg-gray-900 text-brand-600 dark:text-brand-400 shadow-xs"
                      : "text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                  }`}
                >
                  <Copy className="size-3.5" />
                  <span>Pegar Post / InspiraciÃ³n Externa</span>
                </button>
              </div>

              {/* Si estÃ¡ en modo Externo: Caja de pegado con botones rÃ¡pidos de IA */}
              {compositionMode === "external" && (
                <div className="p-4 rounded-xl border border-brand-200 bg-brand-50/50 dark:border-brand-900/60 dark:bg-brand-950/20 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-brand-600 dark:text-brand-400 flex items-center gap-1.5">
                      <Sparkles className="size-3.5" /> Asistente de TransformaciÃ³n IA
                    </span>
                    <span className="text-[11px] text-gray-500">
                      Pega aquÃ­ cualquier publicaciÃ³n que te haya gustado
                    </span>
                  </div>

                  <textarea
                    rows={4}
                    value={externalPastedText}
                    onChange={(e) => setExternalPastedText(e.target.value)}
                    placeholder="Pega aquÃ­ el texto de un post de LinkedIn, artÃ­culo o apunte personal para modelarlo con tu voz..."
                    className="w-full rounded-lg border border-gray-300 bg-white p-3 text-xs text-gray-800 focus:border-brand-500 focus:outline-hidden dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                  />

                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <button
                      type="button"
                      disabled={isAiPolishing || !externalPastedText.trim()}
                      onClick={() => handlePolishWithAi("reformat_b2b")}
                      className="rounded-lg bg-brand-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-600 transition flex items-center gap-1.5 disabled:opacity-40"
                    >
                      {isAiPolishing ? (
                        <>
                          <RefreshCw className="size-3 animate-spin" />
                          <span>Procesando...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="size-3" />
                          <span>Reescribir con Tono B2B</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      disabled={isAiPolishing || !externalPastedText.trim()}
                      onClick={() => handlePolishWithAi("strong_hook")}
                      className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 transition disabled:opacity-40"
                    >
                      Crear Gancho MagnÃ©tico
                    </button>

                    <button
                      type="button"
                      disabled={isAiPolishing || !externalPastedText.trim()}
                      onClick={() => handlePolishWithAi("bullet_points")}
                      className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 transition disabled:opacity-40"
                    >
                      Estructurar en 3 Puntos
                    </button>
                  </div>
                </div>
              )}

              {/* TÃ­tulo o Concepto Central (Opcional) */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">
                  Idea Central o Tema Principal
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ej. 5 Errores al prospectar en LinkedIn / CÃ³mo vender en frÃ­o..."
                  className="w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-xs text-gray-900 font-semibold focus:border-brand-500 focus:outline-hidden dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                />
              </div>

              {/* Editor Principal del Post */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                    Cuerpo de la PublicaciÃ³n
                  </label>

                  {/* Barra rÃ¡pida de inserciÃ³n */}
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => insertTextSnippet("\nâ€¢ ")}
                      className="rounded px-2 py-0.5 text-[11px] font-medium bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300"
                      title="Insertar viÃ±eta"
                    >
                      â€¢ Lista
                    </button>
                    <button
                      type="button"
                      onClick={() => insertTextSnippet(" ðŸš€ ")}
                      className="rounded px-1.5 py-0.5 text-xs bg-gray-100 hover:bg-gray-200 dark:bg-gray-800"
                    >
                      ðŸš€
                    </button>
                    <button
                      type="button"
                      onClick={() => insertTextSnippet(" ðŸ‘‡ ")}
                      className="rounded px-1.5 py-0.5 text-xs bg-gray-100 hover:bg-gray-200 dark:bg-gray-800"
                    >
                      ðŸ‘‡
                    </button>
                    <button
                      type="button"
                      onClick={() => insertTextSnippet(" ðŸ’¡ ")}
                      className="rounded px-1.5 py-0.5 text-xs bg-gray-100 hover:bg-gray-200 dark:bg-gray-800"
                    >
                      ðŸ’¡
                    </button>
                  </div>
                </div>

                <textarea
                  rows={10}
                  value={bodyText}
                  onChange={(e) => setBodyText(e.target.value)}
                  placeholder="Escribe tu publicaciÃ³n aquÃ­..."
                  className="custom-scrollbar w-full rounded-xl border border-gray-300 bg-white p-4 text-xs font-normal leading-relaxed text-gray-900 focus:border-brand-500 focus:outline-hidden dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
                />

                {/* Contador de caracteres */}
                <div className="flex items-center justify-between mt-2 px-1 text-xs text-gray-500">
                  <span className="font-mono">
                    {charCount} / {maxChars} caracteres
                  </span>
                </div>
              </div>

              {/* SECCIÃ“N DE IMAGEN / ESTUDIO VISUAL */}
              <div className="rounded-xl border border-gray-200 dark:border-gray-800 p-4 bg-gray-50/70 dark:bg-gray-900/40 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wide text-gray-800 dark:text-white flex items-center gap-2">
                      <ImageIcon className="size-4 text-brand-500" />
                      <span>Recurso Visual para este Post</span>
                    </h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      Agrega una portada editorial o carrusel para multiplicar el alcance en el feed.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsVisualStudioOpen(true)}
                    className="rounded-lg bg-gradient-to-r from-brand-500 to-brand-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:brightness-110 transition flex items-center gap-2 shrink-0"
                  >
                    <Sparkles className="size-3.5" />
                    <span>{attachedImage ? "Editar en Editor Visual" : "Crear Imagen en Editor Visual"}</span>
                  </button>
                </div>

                {/* Vista previa de imagen adjunta si existe */}
                {Boolean(attachedImage && attachedImage.trim() !== "") && (
                  <div className="relative rounded-xl overflow-hidden border border-gray-300 dark:border-gray-700 bg-gray-950 p-2 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <img
                        src={attachedImage || undefined}
                        alt="Recurso adjunto"
                        className="size-16 rounded-lg object-cover border border-gray-700"
                      />
                      <div>
                        <p className="text-xs font-bold text-white">Imagen de Portada Adjunta</p>
                        <p className="text-[11px] text-emerald-400">
                          DiseÃ±ada con resoluciÃ³n nÃ­tida para LinkedIn
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setIsVisualStudioOpen(true)}
                        className="px-3 py-1.5 text-xs font-semibold text-gray-300 bg-gray-800 hover:bg-gray-700 rounded-lg transition"
                      >
                        Ajustar
                      </button>
                      <button
                        type="button"
                        onClick={() => setAttachedImage(null)}
                        className="p-1.5 text-red-400 hover:bg-red-500/10 rounded-lg transition"
                        title="Eliminar imagen"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* SECCIÃ“N CENTINELA INBOUND LEAD MAGNET & AUTO-DM (Feature #1) */}
              <div className="rounded-xl border border-brand-500/30 bg-brand-500/5 p-4 space-y-3.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="size-8 rounded-lg bg-brand-500/20 text-brand-500 flex items-center justify-center shrink-0">
                      <Bot className="size-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wide flex items-center gap-1.5">
                        <span>Centinela Inbound & Despacho Auto-DM</span>
                        <span className="bg-emerald-500/10 text-emerald-400 text-[10px] px-1.5 py-0.5 rounded-sm font-semibold">
                          ConversiÃ³n B2B
                        </span>
                      </h4>
                      <p className="text-[11px] text-gray-500 dark:text-gray-400">
                        Monitorea los comentarios del post y envÃ­a el recurso por DM a quien comente la palabra clave.
                      </p>
                    </div>
                  </div>

                  {/* Toggle Activado / Desactivado */}
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={autoDmEnabled}
                      onChange={(e) => setAutoDmEnabled(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-gray-300 dark:bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-brand-500"></div>
                  </label>
                </div>

                {autoDmEnabled && (
                  <div className="space-y-3 pt-2 border-t border-brand-500/20">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-1">
                          Palabra Clave de ActivaciÃ³n
                        </label>
                        <input
                          type="text"
                          value={leadMagnetKeyword}
                          onChange={(e) => setLeadMagnetKeyword(e.target.value.toUpperCase())}
                          placeholder="Ej. SISTEMA, GUIA, PLAYBOOK"
                          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-mono font-bold text-gray-900 placeholder:text-gray-400 focus:border-brand-500 focus:outline-hidden shadow-xs"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-1">
                          Algoritmo LinkedIn
                        </label>
                        <label className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-300 bg-white cursor-pointer shadow-xs">
                          <input
                            type="checkbox"
                            checked={autoLikeComment}
                            onChange={(e) => setAutoLikeComment(e.target.checked)}
                            className="accent-brand-500 rounded"
                          />
                          <span className="text-xs font-medium text-gray-800 truncate">Dar Like automÃ¡tico al comentario</span>
                        </label>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-1">
                        Mensaje de Entrega en Mensaje Privado (DM)
                      </label>
                      <textarea
                        rows={2}
                        value={autoDmMessage}
                        onChange={(e) => setAutoDmMessage(e.target.value)}
                        className="w-full rounded-lg border border-gray-300 bg-white p-2.5 text-xs font-medium text-gray-900 placeholder:text-gray-400 focus:border-brand-500 focus:outline-hidden leading-relaxed shadow-xs"
                      />
                      <p className="text-[10px] text-gray-500 mt-1">
                        InHubFlow reemplaza automÃ¡ticamente: {'{nombre}'}, {'{palabra_clave}'} e inicia el chat en el CRM.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Acciones Finales */}
              <div className="pt-2 border-t border-gray-200 dark:border-gray-800 flex items-center justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => handleSaveOrPublish("draft")}
                    className="rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 transition"
                  >
                    Borrador
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowScheduleModal(true)}
                    className="rounded-lg border border-brand-200 bg-brand-50/70 px-3.5 py-2.5 text-xs font-semibold text-brand-700 hover:bg-brand-100 dark:border-brand-900/60 dark:bg-brand-950/40 dark:text-brand-300 transition flex items-center gap-1.5"
                  >
                    <Calendar className="size-3.5" />
                    <span>Programar</span>
                  </button>

                  <button
                    type="button"
                    disabled={isPublishing}
                    onClick={() => handleSaveOrPublish("published")}
                    className="rounded-lg bg-brand-500 px-5 py-2.5 text-xs font-semibold text-white hover:bg-brand-600 disabled:opacity-50 transition flex items-center gap-2 shadow-xs"
                  >
                    {isPublishing ? (
                      <>
                        <RefreshCw className="size-3.5 animate-spin" />
                        <span>Publicando...</span>
                      </>
                    ) : (
                      <>
                        <Send className="size-3.5" />
                        <span>Publicar Ahora</span>
                      </>
                    )}
                  </button>
              </div>
            </div>
          </ComponentCard>
        </div>

        {/* PANEL DERECHO: PREVISUALIZACIÃ“N FIEL DE LINKEDIN */}
        <div className="col-span-12 xl:col-span-5 space-y-6">
          <ComponentCard
            title="Vista Previa en Feed de LinkedIn"
            desc="AsÃ­ verÃ¡n tu publicaciÃ³n los decisores y tu red de contactos."
          >
            <div className="rounded-xl border border-gray-300 bg-white shadow-xs dark:border-gray-800 dark:bg-gray-900 overflow-hidden">
              {/* Header de LinkedIn */}
              <div suppressHydrationWarning className="p-4 flex items-center gap-3">
                <div
                  suppressHydrationWarning
                  className="size-11 rounded-full bg-brand-500/20 text-brand-500 flex items-center justify-center font-bold text-base shrink-0 border border-brand-500/30"
                >
                  {currentUser.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p
                      suppressHydrationWarning
                      className="text-xs font-bold text-gray-900 dark:text-white truncate"
                    >
                      {activeAccount?.name || currentUser.name}
                    </p>
                    <span className="text-[10px] text-gray-400">â€¢ 1Âº</span>
                  </div>
                  <p
                    suppressHydrationWarning
                    className="text-[11px] text-gray-500 dark:text-gray-400 truncate"
                  >
                    {(activeAccount as any)?.headline || "LÃ­der B2B â€¢ Social Selling & AutomatizaciÃ³n de Demanda"}
                  </p>
                  <p className="text-[10px] text-gray-400 flex items-center gap-1 mt-0.5">
                    <span>Ahora</span>
                    <span>â€¢</span>
                    <span>ðŸŒ</span>
                  </p>
                </div>
              </div>

              {/* Texto de la PublicaciÃ³n */}
              <div className="px-4 pb-3">
                <p className="text-xs text-gray-800 dark:text-gray-200 whitespace-pre-wrap leading-relaxed">
                  {bodyText}
                </p>
              </div>

              {/* Recurso Visual Adjunto (si existe) */}
              {Boolean(attachedImage && attachedImage.trim() !== "") && (
                <div className="w-full bg-black/90 border-y border-gray-200 dark:border-gray-800 overflow-hidden flex items-center justify-center">
                  <img
                    src={attachedImage || undefined}
                    alt="Arte de la publicaciÃ³n"
                    className="w-full max-h-[460px] object-contain"
                  />
                </div>
              )}

              {/* Barra de InteracciÃ³n Social de LinkedIn */}
              <div className="p-3 border-t border-gray-200 dark:border-gray-800 flex items-center justify-around text-xs font-semibold text-gray-600 dark:text-gray-400">
                <span className="flex items-center gap-1.5 hover:text-brand-500 cursor-pointer">
                  ðŸ‘ Recomendar
                </span>
                <span className="flex items-center gap-1.5 hover:text-brand-500 cursor-pointer">
                  ðŸ’¬ Comentar
                </span>
                <span className="flex items-center gap-1.5 hover:text-brand-500 cursor-pointer">
                  ðŸ”„ Compartir
                </span>
                <span className="flex items-center gap-1.5 hover:text-brand-500 cursor-pointer">
                  âœˆï¸ Enviar
                </span>
              </div>
            </div>
          </ComponentCard>
        </div>
      </div>

      {/* MODAL DE ESTUDIO VISUAL INTEGRADO */}
      <DooryStudioModal
        isOpen={isVisualStudioOpen}
        onClose={() => setIsVisualStudioOpen(false)}
        initialTitle={title || bodyText.split("\n")[0] || "Tu Titular de Alto Impacto"}
        initialSubtitle={bodyText.split("\n").filter((l) => l.trim().length > 10)[1] || "Framework B2B"}
        authorName={activeAccount?.name || currentUser.name}
        authorHandle={`@${(activeAccount?.name || currentUser.name).toLowerCase().replace(/[^a-z0-9]/g, "")}`}
        onApplyImage={(dataUrl) => {
          setAttachedImage(dataUrl);
          setFeedback({
            type: "success",
            message: "¡Diseño aplicado con éxito a tu post desde el Editor Visual!",
          });
          setTimeout(() => setFeedback(null), 3000);
        }}
      />

      {/* Modal de ProgramaciÃ³n en Calendario */}
      {showScheduleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-gray-900 p-6 border border-gray-200 dark:border-gray-800 shadow-xl space-y-4">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white">
              Programar PublicaciÃ³n en Calendario
            </h3>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1">
                  Fecha
                </label>
                <input
                  type="date"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white p-2 text-xs text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1">
                  Hora
                </label>
                <input
                  type="time"
                  value={scheduledTime}
                  onChange={(e) => setScheduledTime(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white p-2 text-xs text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3">
              <button
                type="button"
                onClick={() => setShowScheduleModal(false)}
                className="rounded-lg border border-gray-300 px-3 py-2 text-xs font-semibold text-gray-700 dark:border-gray-700 dark:text-gray-300"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => handleSaveOrPublish("scheduled")}
                className="rounded-lg bg-brand-500 px-4 py-2 text-xs font-semibold text-white hover:bg-brand-600 transition"
              >
                Confirmar y Agendar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
