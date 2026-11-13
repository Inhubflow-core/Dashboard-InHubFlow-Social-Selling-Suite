"use client";

import { parsePostHeader } from '@/lib/viral-posts/hookHighlighter';

import ComponentCard from "@/components/common/ComponentCard";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import {
  getActiveAccountForUser,
  getVisibleAccountsForUser,
  accountMatchesUser,
} from "@/lib/unipile/store";
import type { UnipileAccount } from "@/lib/unipile/types";
import { exportCarouselToPdf } from "@/lib/viral-posts/carousel-exporter";
import { getStoredKnowledgeSources } from "@/lib/sdr/store";
import {
  getSelectedTemplateForModeling,
  setSelectedTemplateForModeling,
  useCreatedPosts,
} from "@/lib/viral-posts/store";
import type { CarouselSlide, CreatedPost, PostFormat } from "@/lib/viral-posts/types";
import { useRouter } from "next/navigation";
import { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import { useTranslations } from "next-intl";
import {
  Sparkles,
  Image as ImageIcon,
  Bot,
  Upload,
  Layout,
  AlignCenter,
  AlignLeft,
  AlignRight,
  Palette,
  Check,
  Flame,
  Copy,
  PenTool,
  FileText,
  Layers,
  Download,
  Calendar,
  Send,
  Eye,
  Trash2,
  RefreshCw,
  Sliders,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  HelpCircle,
  Clock,
  Type,
  ListOrdered
} from "lucide-react";
import VisualStudioModal from "./VisualStudioModal";

export const SAMPLE_B2B_BACKGROUNDS = [
  {
    id: "exec-team",
    name: "Reunión Ejecutiva B2B",
    url: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1200&q=85",
  },
  {
    id: "tech-meeting",
    name: "Líderes de Negocio",
    url: "https://images.unsplash.com/photo-1556761175-5973dc0f32e7?auto=format&fit=crop&w=1200&q=85",
  },
  {
    id: "strategy-office",
    name: "Estrategia Corporativa",
    url: "https://images.unsplash.com/photo-1542744173-8e7e53415bb0?auto=format&fit=crop&w=1200&q=85",
  },
  {
    id: "boardroom",
    name: "Sala de Juntas",
    url: "https://images.unsplash.com/photo-1497215728101-856f4ea42174?auto=format&fit=crop&w=1200&q=85",
  },
];

const HIGHLIGHT_SPLIT_REGEX = new RegExp('(\\*\\*.*?\\*\\*|__.*?__|\\{.*?\\})', 'g');

export function parseHighlightedTitle(title: string, highlightColor: string = "#f97316") {
  if (!title) return null;
  const parts = title.split(HIGHLIGHT_SPLIT_REGEX);
  return parts.map((part, index) => {
    if (
      (part.startsWith("**") && part.endsWith("**")) ||
      (part.startsWith("__") && part.endsWith("__"))
    ) {
      return (
        <span
          key={index}
          style={{ color: highlightColor }}
          className="font-extrabold"
        >
          {part.slice(2, -2)}
        </span>
      );
    }
    if (part.startsWith("{") && part.endsWith("}")) {
      return (
        <span
          key={index}
          style={{ color: highlightColor }}
          className="font-extrabold"
        >
          {part.slice(1, -1)}
        </span>
      );
    }
    return part;
  });
}

function toUnicodeBold(text: string): string {
  return text.replace(/[A-Za-z0-9]/g, (char) => {
    const code = char.charCodeAt(0);
    if (code >= 65 && code <= 90) return String.fromCodePoint(0x1d400 + code - 65);
    if (code >= 97 && code <= 122) return String.fromCodePoint(0x1d41a + code - 97);
    if (code >= 48 && code <= 57) return String.fromCodePoint(0x1d7ce + code - 48);
    return char;
  });
}

export default function CreateViralPostView({
  onTabChange,
  hideBreadcrumb,
}: {
  onTabChange?: (tab: string) => void;
  hideBreadcrumb?: boolean;
} = {}) {
  const t = useTranslations("viralPosts.create");
  const router = useRouter();
  const { currentUser } = useAuth();
  const { addPost } = useCreatedPosts();

  // 1. Selector de 3 Vías de Entrada (Origen del Post)
  const [sourceMode, setSourceMode] = useState<"viral" | "external" | "scratch">(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get("tab")?.toLowerCase();
      if (tab === "personal" || tab === "scratch") return "scratch";
      if (tab === "external") return "external";
    }
    const selected = getSelectedTemplateForModeling();
    return selected ? "viral" : "scratch";
  });

  // 2. Selector de 3 Formatos de Salida (Modelos de Post)
  const [format, setFormat] = useState<PostFormat>("text"); // "text" | "image" | "carousel"

  // Cuentas de LinkedIn disponibles
  const [accounts, setAccounts] = useState<UnipileAccount[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>("");

  // Datos principales del Post
  const [topic, setTopic] = useState("Social Selling B2B");
  const [tone, setTone] = useState("Autoridad B2B con llamada a la acción");
  const [content, setContent] = useState("");
  const [externalText, setExternalText] = useState("");

  // Centinela Inbound & Auto-DM
  const [leadMagnetKeyword, setLeadMagnetKeyword] = useState("SISTEMA");
  const [autoDmEnabled, setAutoDmEnabled] = useState(true);
  const [autoLikeComment, setAutoLikeComment] = useState(true);
  const [autoDmMessage, setAutoDmMessage] = useState(
    `¡Hola {nombre}! Vi que comentaste '{palabra_clave}' en mi publicación. Aquí tienes el documento completo con el framework accionable. ¿En qué reto comercial estás enfocado este trimestre?`
  );

  // Recurso Visual: Imagen Individual (Modelo 2)
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [imagePrompt, setImagePrompt] = useState("");

  // Recurso Visual: Carrusel Multipágina PDF (Modelo 3)
  const [carouselPdfUrl, setCarouselPdfUrl] = useState<string | null>(null);
  const [carouselPageCount, setCarouselPageCount] = useState<number>(0);
  const [carouselThumbnail, setCarouselThumbnail] = useState<string | null>(null);
  const [carouselPreviewSlide, setCarouselPreviewSlide] = useState(0);

  // Modal del Editor Visual
  const [isVisualStudioOpen, setIsVisualStudioOpen] = useState(false);

  // Referencia original si vino del Radar Viral
  const [referenceHook, setReferenceHook] = useState("");
  const [referenceContent, setReferenceContent] = useState("");
  const [referenceAuthor, setReferenceAuthor] = useState("");

  // Estados de IA, Feedback y Publicación
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduledDate, setScheduledDate] = useState(() => {
    const tomorrow = new Date(Date.now() + 86400000);
    return tomorrow.toISOString().split("T")[0];
  });
  const [scheduledTime, setScheduledTime] = useState("09:30");
  const [publishFeedback, setPublishFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [isExpandedPreview, setIsExpandedPreview] = useState(false);

  // Compatibilidad con estructura legacy de slides si se requiere
  const [slides, setSlides] = useState<CarouselSlide[]>([
    {
      slideNumber: 1,
      isCover: true,
      title: "La mayoría de líderes B2B cometen **el mismo error** al prospectar en LinkedIn",
      subtitle: "Hablan de su producto antes de entender el dolor del decisor.",
      content: ["InHubFlow Social Selling", `Por ${currentUser.name}`],
      footerText: `@${currentUser.name.toLowerCase().replace(/[^a-z0-9]/g, "")}`,
      coverLayout: "bottom",
      backgroundImageUrl: SAMPLE_B2B_BACKGROUNDS[0].url,
      highlightColor: "#f97316",
    },
    {
      slideNumber: 2,
      title: "El Diagnóstico",
      content: ["Paso 1: Identifica el dolor real", "Evita el pitch comercial en frío", "Genera contexto de valor"],
      footerText: "Paso 1: Diagnóstico",
    },
    {
      slideNumber: 3,
      isCta: true,
      title: "¿Quieres Implementar Este Sistema?",
      subtitle: "Recibe el documento de trabajo completo en PDF",
      content: ["Comenta SISTEMA en esta publicación", "Te envío la guía por mensaje privado."],
      footerText: "InHubFlow Social Selling",
    },
  ]);

  const [carouselTheme, setCarouselTheme] = useState(() => ({
    primaryColor: "#0099ff",
    fontFamily: "Outfit",
    authorName: currentUser.name,
    authorHandle: `@${currentUser.name.toLowerCase().replace(/[^a-z0-9]/g, "")}`,
  }));

  // Cargar cuentas conectadas de LinkedIn
  useEffect(() => {
    const syncAccounts = () => {
      const visible = getVisibleAccountsForUser(currentUser);
      setAccounts(visible);
      const active = getActiveAccountForUser(currentUser);
      if (active) {
        setSelectedAccountId(active.id);
      } else if (visible.length > 0 && !selectedAccountId) {
        setSelectedAccountId(visible[0].id);
      }
    };
    syncAccounts();
    window.addEventListener("storage", syncAccounts);
    return () => window.removeEventListener("storage", syncAccounts);
  }, [currentUser]);

  // Carga inicial según plantilla de Radar o borrador previo
  useEffect(() => {
    const selected = getSelectedTemplateForModeling();
    if (selected) {
      setSourceMode("viral");
      setFormat(selected.format || "text");
      setTopic(selected.topic || "Social Selling B2B");
      setReferenceHook(selected.hook || "");
      setReferenceContent(selected.fullContent || "");
      setReferenceAuthor(selected.author || "");

      if (selected.format === "text") {
        setContent(`Construir autoridad en LinkedIn requiere consistencia y un gancho probado:

${selected.hook}

1. Entiende el dolor del decisor antes de proponer tu oferta.
2. Comparte frameworks accionables en cada publicación.
3. Genera conversación genuina con preguntas directas.

¿Cuál es tu mayor desafío de prospección este mes? Comenta "${leadMagnetKeyword}" para enviarte nuestro playbook.`);
      } else if (selected.format === "image") {
        setContent(`La claridad en tu propuesta comercial es la mejor inversión que puedes hacer:

${selected.hook}

Revisa los puntos clave en la imagen adjunta y aplícalos en tu estrategia hoy.`);
      } else if (selected.format === "carousel") {
        setContent(`Desliza el carrusel completo para ver la guía detallada paso a paso:

${selected.hook}

Comenta "${leadMagnetKeyword}" para enviarte la plantilla oficial en PDF directamente por mensaje privado.`);
      }
    } else if (!content) {
      setContent(`La mayoría de líderes B2B cometen el mismo error al prospectar en LinkedIn:

Hablan de su producto antes de entender el dolor del decisor.

Aquí tienes el framework exacto que usamos para cerrar reuniones cualificadas:

1. Identifica una señal de compra real (contrataciones, cambios de puesto).
2. Abre con un diagnóstico personalizado en lugar de un pitch en frío.
3. Entrega un activo de valor concreto (plantilla, guía o cálculo).

¿Cuál ha sido tu mayor reto de prospección este trimestre? Comenta "${leadMagnetKeyword}" y te envío el recurso completo.`);
    }
  }, [leadMagnetKeyword]);

  // Manejo de apertura / cierre del Editor Visual sincronizado con URL
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const shouldBeOpen = params.get("editor") === "open" || sessionStorage.getItem("inhubflow_visual_studio_open") === "true";
      if (shouldBeOpen) setIsVisualStudioOpen(true);
    } catch {}
  }, []);

  const handleOpenVisualStudio = () => {
    setIsVisualStudioOpen(true);
    if (typeof window !== "undefined") {
      sessionStorage.setItem("inhubflow_visual_studio_open", "true");
      const url = new URL(window.location.href);
      url.searchParams.set("editor", "open");
      window.history.replaceState(null, "", url.toString());
    }
  };

  const handleCloseVisualStudio = () => {
    setIsVisualStudioOpen(false);
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("inhubflow_visual_studio_open");
      const url = new URL(window.location.href);
      url.searchParams.delete("editor");
      window.history.replaceState(null, "", url.toString());
    }
  };

  // Re-generar / Modelar con IA + RAG de la Empresa
  const handleGenerateAi = async (overrideText?: string) => {
    setIsGeneratingAi(true);
    setPublishFeedback(null);

    try {
      const approvedKnowledge = getStoredKnowledgeSources().filter((k) => k.status === "approved");
      const targetOriginal = overrideText || (sourceMode === "external" ? externalText : referenceContent) || content;

      const res = await fetch("/api/ai/model-post", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hook: referenceHook,
          originalContent: targetOriginal,
          topic,
          format,
          leadMagnetKeyword,
          tone,
          knowledgeSources: approvedKnowledge,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo generar el contenido con IA.");

      const generated = data.result;
      if (generated.content) setContent(generated.content);
      if (format === "image" && generated.imagePrompt) setImagePrompt(generated.imagePrompt);

      setPublishFeedback({
        type: "success",
        message: "¡Contenido modelado exitosamente con IA y adaptado a tu marca!",
      });
      setTimeout(() => setPublishFeedback(null), 4000);
    } catch (err: any) {
      console.error("[Generate AI Error]:", err);
      setPublishFeedback({
        type: "error",
        message: err.message || "Error al conectar con el motor de IA.",
      });
    } finally {
      setIsGeneratingAi(false);
    }
  };

  // Formateadores rápidos para composición libre
  const applyBoldToSelection = () => {
    const el = document.getElementById("post-content-textarea") as HTMLTextAreaElement;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    if (start === end) return;
    const selected = content.slice(start, end);
    const converted = toUnicodeBold(selected);
    const updated = content.slice(0, start) + converted + content.slice(end);
    setContent(updated);
  };

  const insertBulletList = () => {
    const prefix = "\n• ";
    setContent((prev) => prev + prefix);
  };

  // Descarga directa del PDF del carrusel si fue generado
  const handleDownloadPdf = () => {
    if (carouselPdfUrl) {
      const a = document.createElement("a");
      a.href = carouselPdfUrl;
      a.download = `carrusel-${topic.replace(/\s+/g, "_")}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      return;
    }
    // Fallback: exporter de slides si no se generó por Visual Studio
    void exportCarouselToPdf(slides, {
      primaryColor: carouselTheme.primaryColor,
      authorName: carouselTheme.authorName,
      authorHandle: carouselTheme.authorHandle,
      filename: `Carrusel_${topic.replace(/\s+/g, "_")}.pdf`,
    });
  };

  // Guardar post (Borrador, Programado o Publicación Inmediata en LinkedIn)
  const handleSavePost = async (status: "draft" | "scheduled" | "published", customScheduledAt?: string) => {
    setPublishFeedback(null);
    let linkedinPostId: string | undefined = undefined;

    // Despacho directo a Unipile
    if (status === "published") {
      setIsPublishing(true);
      try {
        let attachments: any[] | undefined = undefined;

        if (format === "carousel" && carouselPdfUrl) {
          attachments = [
            {
              content: carouselPdfUrl,
              filename: "carrusel.pdf",
              content_type: "application/pdf",
            },
          ];
        } else if (format === "image" && previewImage) {
          attachments = [
            {
              content: previewImage,
              filename: "portada.png",
              content_type: "image/png",
            },
          ];
        }

        const res = await fetch("/api/unipile/posts/publish", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            account_id: selectedAccountId,
            text: content,
            attachments,
          }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Error al publicar en LinkedIn a través del motor InHubFlow.");
        linkedinPostId = data.postId;
      } catch (err: any) {
        console.error("[Publish Post Error]:", err);
        setPublishFeedback({
          type: "error",
          message: err.message || "No se pudo emitir el post en LinkedIn. Revisa el estado de la cuenta.",
        });
        setIsPublishing(false);
        return;
      } finally {
        setIsPublishing(false);
      }
    }

    const newPost: CreatedPost = {
      id: `post-${Date.now()}`,
      title: content.split("\n")[0].substring(0, 70) || `Publicación sobre ${topic}`,
      format,
      content,
      sourceMode,
      imagePrompt: format === "image" ? imagePrompt : undefined,
      mediaUrl: previewImage || undefined,
      coverImage: previewImage || carouselThumbnail || undefined,
      carouselPdfUrl: format === "carousel" ? (carouselPdfUrl || undefined) : undefined,
      carouselPageCount: format === "carousel" ? (carouselPageCount || 4) : undefined,
      carouselThumbnail: format === "carousel" ? (carouselThumbnail || undefined) : undefined,
      carouselSlides: format === "carousel" ? slides : undefined,
      carouselTheme: format === "carousel" ? carouselTheme : undefined,
      leadMagnetKeyword: autoDmEnabled ? leadMagnetKeyword : undefined,
      autoDmEnabled,
      autoDmMessage: autoDmEnabled ? autoDmMessage : undefined,
      autoLikeComment: autoDmEnabled ? autoLikeComment : undefined,
      status,
      targetAccountId: selectedAccountId,
      linkedinPostId,
      scheduledAt:
        status === "scheduled" ? (customScheduledAt || new Date(Date.now() + 86400000).toISOString()) : undefined,
      publishedAt: status === "published" ? new Date().toISOString() : undefined,
      createdAt: new Date().toISOString(),
      metrics:
        status === "published" ? { likes: 0, comments: 0, impressions: 0, leadsCaptured: 0 } : undefined,
    };

    addPost(newPost);
    setSelectedTemplateForModeling(null);

    if (onTabChange) {
      onTabChange("list");
    } else {
      router.push("/viral-posts?tab=list");
    }
  };

  const activeAccObj = accounts.find((a) => a.id === selectedAccountId);
  const charCount = content.length;
  const estimatedReadingTimeMin = Math.max(1, Math.ceil(content.split(/\s+/).length / 200));

  return (
    <div className="w-full space-y-6">
      {!hideBreadcrumb && <PageBreadcrumb pageTitle="Creador de Publicaciones LinkedIn" />}

      {/* Alerta de Feedback */}
      {publishFeedback && (
        <div
          className={`p-3.5 rounded-xl text-xs font-semibold border shadow-xs transition-all ${
            publishFeedback.type === "success"
              ? "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-900/50 dark:text-emerald-300"
              : "bg-red-50 text-red-800 border-red-200 dark:bg-red-950/40 dark:border-red-900/50 dark:text-red-300"
          }`}
        >
          {publishFeedback.message}
        </div>
      )}

      {/* 1. Selector Superior de las 3 Vías de Entrada (Origen del Post) */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400 pl-1">Origen:</span>
          <div className="flex p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700/60">
            <button
              type="button"
              onClick={() => setSourceMode("viral")}
              className={`flex items-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-semibold transition-all ${
                sourceMode === "viral"
                  ? "bg-white dark:bg-slate-900 text-[#0099ff] shadow-xs font-bold"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <Flame className="size-3.5" />
              <span>Desde Post Viral</span>
            </button>

            <button
              type="button"
              onClick={() => setSourceMode("external")}
              className={`flex items-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-semibold transition-all ${
                sourceMode === "external"
                  ? "bg-white dark:bg-slate-900 text-[#0099ff] shadow-xs font-bold"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <Copy className="size-3.5" />
              <span>Pegar Texto</span>
            </button>

            <button
              type="button"
              onClick={() => setSourceMode("scratch")}
              className={`flex items-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-semibold transition-all ${
                sourceMode === "scratch"
                  ? "bg-white dark:bg-slate-900 text-[#0099ff] shadow-xs font-bold"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <PenTool className="size-3.5" />
              <span>Escribir Libre</span>
            </button>
          </div>
        </div>

        {/* Cuenta LinkedIn Conectada */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <span className="text-xs font-medium text-slate-500">Publicar como:</span>
          <select
            value={selectedAccountId}
            onChange={(e) => setSelectedAccountId(e.target.value)}
            className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-800 dark:text-white focus:outline-hidden focus:border-[#0099ff]"
          >
            {accounts.map((acc) => (
              <option key={acc.id} value={acc.id}>
                {acc.name} ({acc.status === "OK" ? "Conectada" : "Desconectada"})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Banner Informativo / Asistente según la Vía de Entrada Seleccionada */}
      {sourceMode === "viral" && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-blue-50/70 border border-blue-200 dark:bg-blue-950/30 dark:border-blue-900/60">
          <div className="space-y-0.5">
            <span className="text-[11px] uppercase font-bold tracking-wider text-[#0099ff]">
              🔥 Modo Inspiración Viral
            </span>
            <p className="text-xs font-semibold text-slate-800 dark:text-white">
              {referenceAuthor ? (
                <>Inspirado en publicación viral de <strong>{referenceAuthor}</strong>: &quot;{referenceHook.slice(0, 75)}...&quot;</>
              ) : (
                <>Usa un post del radar para modelar su estructura ganadora con IA.</>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {referenceAuthor ? (
              <button
                type="button"
                onClick={() => handleGenerateAi()}
                disabled={isGeneratingAi}
                className="rounded-lg bg-[#0099ff] px-3.5 py-2 text-xs font-bold text-white hover:bg-[#0082db] transition flex items-center gap-2 shadow-xs disabled:opacity-50"
              >
                {isGeneratingAi ? (
                  <>
                    <RefreshCw className="size-3.5 animate-spin" />
                    <span>Reescribiendo...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="size-3.5" />
                    <span>Re-modelar con IA</span>
                  </>
                )}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onTabChange?.("radar")}
                className="rounded-lg bg-[#0099ff] px-3.5 py-2 text-xs font-bold text-white hover:bg-[#0082db] transition flex items-center gap-1.5 shadow-xs"
              >
                <Flame className="size-3.5" />
                <span>Explorar Radar Viral</span>
              </button>
            )}
          </div>
        </div>
      )}

      {sourceMode === "external" && (
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <Copy className="size-3.5 text-[#0099ff]" />
              Pega aquí el texto de otro post o artículo:
            </span>
            <button
              type="button"
              onClick={async () => {
                try {
                  const text = await navigator.clipboard.readText();
                  if (text) setExternalText(text);
                } catch {}
              }}
              className="text-[11px] font-semibold text-[#0099ff] hover:underline"
            >
              Pegar del portapapeles
            </button>
          </div>
          <textarea
            rows={3}
            value={externalText}
            onChange={(e) => setExternalText(e.target.value)}
            placeholder="Pega el contenido ajeno para reestructurarlo con tu propia voz de marca..."
            className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-2.5 text-xs text-slate-800 dark:text-white focus:outline-hidden focus:border-[#0099ff]"
          />
          <div className="flex items-center gap-2 justify-end">
            <button
              type="button"
              disabled={!externalText.trim() || isGeneratingAi}
              onClick={() => handleGenerateAi(externalText)}
              className="px-3.5 py-1.5 rounded-lg bg-[#0099ff] text-white text-xs font-bold hover:bg-[#0082db] disabled:opacity-50 transition flex items-center gap-1.5"
            >
              {isGeneratingAi ? <RefreshCw className="size-3 animate-spin" /> : <Sparkles className="size-3" />}
              <span>Reestructurar con IA</span>
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-12 gap-6">
        {/* Panel Izquierdo: Configuración del Formato y Redacción */}
        <div className="col-span-12 xl:col-span-7 space-y-5">
          <ComponentCard title="Editor y Formato de Publicación">
            <div className="space-y-5">
              {/* 2. Selector de los 3 Modelos de Post */}
              <div>
                <label className="mb-2 block text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Modelo de Publicación en LinkedIn:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => setFormat("text")}
                    className={`rounded-xl p-3.5 text-left border-2 transition-all ${
                      format === "text"
                        ? "border-[#0099ff] bg-blue-50/40 dark:bg-blue-950/20 shadow-xs"
                        : "border-slate-200 dark:border-slate-800 hover:border-slate-300 bg-white dark:bg-slate-900"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <FileText className={`size-4 ${format === "text" ? "text-[#0099ff]" : "text-slate-400"}`} />
                      <span className="font-bold text-xs text-slate-800 dark:text-white">1. Sin Imagen</span>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-tight">Solo texto persuasivo y de lectura rápida</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormat("image")}
                    className={`rounded-xl p-3.5 text-left border-2 transition-all ${
                      format === "image"
                        ? "border-[#0099ff] bg-blue-50/40 dark:bg-blue-950/20 shadow-xs"
                        : "border-slate-200 dark:border-slate-800 hover:border-slate-300 bg-white dark:bg-slate-900"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <ImageIcon className={`size-4 ${format === "image" ? "text-[#0099ff]" : "text-slate-400"}`} />
                      <span className="font-bold text-xs text-slate-800 dark:text-white">2. Con Imagen</span>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-tight">Portada editorial o infografía (4:5 / 1:1)</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormat("carousel")}
                    className={`rounded-xl p-3.5 text-left border-2 transition-all ${
                      format === "carousel"
                        ? "border-[#0099ff] bg-blue-50/40 dark:bg-blue-950/20 shadow-xs"
                        : "border-slate-200 dark:border-slate-800 hover:border-slate-300 bg-white dark:bg-slate-900"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Layers className={`size-4 ${format === "carousel" ? "text-[#0099ff]" : "text-slate-400"}`} />
                      <span className="font-bold text-xs text-slate-800 dark:text-white">3. Carrusel (PDF)</span>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-tight">Documento multipágina deslizable en PDF</p>
                  </button>
                </div>
              </div>

              {/* Parámetros Temáticos y Tono */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Tema / Nicho B2B:
                  </label>
                  <input
                    type="text"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="Ej: Social Selling, Liderazgo B2B..."
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs text-slate-800 dark:text-white focus:outline-hidden focus:border-[#0099ff]"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Tono de Autoridad:
                  </label>
                  <select
                    value={tone}
                    onChange={(e) => setTone(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs text-slate-800 dark:text-white focus:outline-hidden focus:border-[#0099ff]"
                  >
                    <option value="Autoridad B2B con llamada a la acción">Autoridad B2B con llamada a la acción</option>
                    <option value="Historia personal de aprendizaje">Historia personal de aprendizaje</option>
                    <option value="Opinión contraria / Pensamiento crítico">Opinión contraria / Pensamiento crítico</option>
                    <option value="Paso a paso técnico y accionable">Paso a paso técnico y accionable</option>
                  </select>
                </div>
              </div>

              {/* Área de Redacción del Post */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Copia del Post (Texto LinkedIn):
                  </label>
                  <div className="flex items-center gap-3 text-[11px] text-slate-500">
                    <span>{charCount} caracteres</span>
                    <span>·</span>
                    <span className="flex items-center gap-1">
                      <Clock className="size-3" />
                      {estimatedReadingTimeMin} min de lectura
                    </span>
                  </div>
                </div>

                {/* Barra de Formateo Rápido */}
                <div className="flex items-center gap-2 mb-2 p-1.5 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700/60">
                  <button
                    type="button"
                    onClick={applyBoldToSelection}
                    className="px-2 py-1 rounded-md text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center gap-1"
                    title="Convertir texto seleccionado a negrita Unicode de LinkedIn"
                  >
                    <Type className="size-3.5" />
                    <span>Negrita</span>
                  </button>
                  <button
                    type="button"
                    onClick={insertBulletList}
                    className="px-2 py-1 rounded-md text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center gap-1"
                    title="Insertar viñeta limpia"
                  >
                    <ListOrdered className="size-3.5" />
                    <span>Viñeta</span>
                  </button>
                  <div className="h-3 w-px bg-slate-300 dark:bg-slate-700 mx-1" />
                  <span className="text-[10px] text-slate-400">
                    Tip: Los primeros 140 caracteres definen el gancho antes de &quot;...ver más&quot;
                  </span>
                </div>

                <textarea
                  id="post-content-textarea"
                  rows={9}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Escribe o afina el texto de tu publicación..."
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-3.5 text-xs text-slate-900 dark:text-white leading-relaxed focus:outline-hidden focus:border-[#0099ff] font-sans"
                />
              </div>

              {/* 3. Contenedor de Recurso Visual (Solo para Modelo 2: Con Imagen o Modelo 3: Carrusel) */}
              {format === "image" && (
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 dark:text-white flex items-center gap-2">
                      <ImageIcon className="size-4 text-[#0099ff]" />
                      Recurso Visual para Portada (Modelo con Imagen)
                    </span>
                    {previewImage && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-semibold">
                        Portada Lista
                      </span>
                    )}
                  </div>

                  {previewImage ? (
                    <div className="flex items-center justify-between p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                      <div className="flex items-center gap-3">
                        <img src={previewImage} alt="Portada" className="h-14 w-12 object-cover rounded-md border" />
                        <div>
                          <p className="text-xs font-bold text-slate-800 dark:text-white">Portada de LinkedIn Diseñada</p>
                          <p className="text-[11px] text-slate-500">Formato vertical 4:5 optimizado para feed</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={handleOpenVisualStudio}
                          className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-800"
                        >
                          Ajustar en Editor
                        </button>
                        <button
                          type="button"
                          onClick={() => setPreviewImage(null)}
                          className="p-1.5 text-slate-400 hover:text-red-500 transition"
                          title="Quitar imagen"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col sm:flex-row items-center gap-2.5">
                      <button
                        type="button"
                        onClick={handleOpenVisualStudio}
                        className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-[#0099ff] hover:bg-[#0082db] text-white text-xs font-bold transition flex items-center justify-center gap-2 shadow-xs"
                      >
                        <Sparkles className="size-3.5" />
                        <span>Diseñar Portada en Editor Visual</span>
                      </button>
                      <label className="w-full sm:w-auto px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 text-xs font-semibold hover:bg-slate-50 transition flex items-center justify-center gap-1.5 cursor-pointer">
                        <Upload className="size-3.5" />
                        <span>Subir Imagen Propia</span>
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/webp"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onload = () => setPreviewImage(reader.result as string);
                              reader.readAsDataURL(file);
                            }
                          }}
                        />
                      </label>
                    </div>
                  )}
                </div>
              )}

              {format === "carousel" && (
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-blue-50/30 dark:bg-blue-950/20 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 dark:text-white flex items-center gap-2">
                      <Layers className="size-4 text-[#0099ff]" />
                      Documento Carrusel Multipágina en PDF
                    </span>
                    {carouselPdfUrl && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 font-semibold">
                        PDF Compilado ({carouselPageCount || 4} diapositivas)
                      </span>
                    )}
                  </div>

                  {carouselPdfUrl ? (
                    <div className="flex items-center justify-between p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                      <div className="flex items-center gap-3">
                        {carouselThumbnail ? (
                          <img src={carouselThumbnail} alt="Portada Carrusel" className="h-14 w-12 object-cover rounded-md border" />
                        ) : (
                          <div className="h-14 w-12 rounded-md bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs">
                            PDF
                          </div>
                        )}
                        <div>
                          <p className="text-xs font-bold text-slate-800 dark:text-white">Carrusel PDF de LinkedIn Listo</p>
                          <p className="text-[11px] text-slate-500">{carouselPageCount || 4} diapositivas vectoriales preparadas para deslizar</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={handleOpenVisualStudio}
                          className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-800"
                        >
                          Editar Carrusel
                        </button>
                        <button
                          type="button"
                          onClick={handleDownloadPdf}
                          className="px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 text-xs font-semibold flex items-center gap-1"
                          title="Descargar archivo PDF"
                        >
                          <Download className="size-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setCarouselPdfUrl(null);
                            setCarouselThumbnail(null);
                          }}
                          className="p-1.5 text-slate-400 hover:text-red-500 transition"
                          title="Quitar carrusel"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col sm:flex-row items-center gap-2.5">
                      <button
                        type="button"
                        onClick={handleOpenVisualStudio}
                        className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-[#0099ff] hover:bg-[#0082db] text-white text-xs font-bold transition flex items-center justify-center gap-2 shadow-xs"
                      >
                        <Layers className="size-3.5" />
                        <span>Diseñar Carrusel en Editor Visual</span>
                      </button>
                      <label className="w-full sm:w-auto px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 text-xs font-semibold hover:bg-slate-50 transition flex items-center justify-center gap-1.5 cursor-pointer">
                        <Upload className="size-3.5" />
                        <span>Subir PDF Existente</span>
                        <input
                          type="file"
                          accept="application/pdf"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onload = () => {
                                setCarouselPdfUrl(reader.result as string);
                                setCarouselPageCount(5);
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                        />
                      </label>
                    </div>
                  )}

                  {/* Presets de Composición de Portada (1 Clic) para Carruseles B2B */}
                  <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                        <Layout className="size-3 text-[#0099ff]" />
                        Presets de Composición de Portada (1 Clic)
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          const updated = [...slides];
                          updated[0].coverLayout = "bottom";
                          setSlides(updated);
                        }}
                        className={`p-1.5 rounded-lg border text-[11px] font-semibold text-center transition flex items-center justify-center gap-1 ${
                          (slides[0]?.coverLayout || "bottom") === "bottom"
                            ? "border-[#0099ff] bg-blue-50 dark:bg-blue-950 text-[#0099ff]"
                            : "border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400"
                        }`}
                      >
                        <AlignCenter className="size-3" />
                        <span>Inferior / Pie</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const updated = [...slides];
                          updated[0].coverLayout = "split_left";
                          setSlides(updated);
                        }}
                        className={`p-1.5 rounded-lg border text-[11px] font-semibold text-center transition flex items-center justify-center gap-1 ${
                          slides[0]?.coverLayout === "split_left"
                            ? "border-[#0099ff] bg-blue-50 dark:bg-blue-950 text-[#0099ff]"
                            : "border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400"
                        }`}
                      >
                        <AlignLeft className="size-3" />
                        <span>Split Izquierdo</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const updated = [...slides];
                          updated[0].coverLayout = "split_right";
                          setSlides(updated);
                        }}
                        className={`p-1.5 rounded-lg border text-[11px] font-semibold text-center transition flex items-center justify-center gap-1 ${
                          slides[0]?.coverLayout === "split_right"
                            ? "border-[#0099ff] bg-blue-50 dark:bg-blue-950 text-[#0099ff]"
                            : "border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400"
                        }`}
                      >
                        <AlignRight className="size-3" />
                        <span>Split Derecho</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* 4. Centinela Inbound & Despacho Auto-DM */}
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold text-slate-800 dark:text-white flex items-center gap-2">
                      <Bot className="size-4 text-[#0099ff]" />
                      Centinela Inbound & Despacho Auto-DM
                    </span>
                    <p className="text-[11px] text-slate-500">
                      Monitorea comentarios con la palabra clave y despacha tu recurso por DM.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={autoDmEnabled}
                    onChange={(e) => setAutoDmEnabled(e.target.checked)}
                    className="size-4 accent-[#0099ff] rounded cursor-pointer"
                  />
                </div>

                {autoDmEnabled && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                    <div>
                      <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Palabra Clave:
                      </label>
                      <input
                        type="text"
                        value={leadMagnetKeyword}
                        onChange={(e) => setLeadMagnetKeyword(e.target.value.toUpperCase())}
                        placeholder="Ej: SISTEMA, GUIA..."
                        className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs font-bold text-[#0099ff] focus:outline-hidden"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Mensaje Automatizado por DM:
                      </label>
                      <input
                        type="text"
                        value={autoDmMessage}
                        onChange={(e) => setAutoDmMessage(e.target.value)}
                        className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs text-slate-800 dark:text-white focus:outline-hidden"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Botones de Acción */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => handleSavePost("draft")}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                >
                  Guardar Borrador
                </button>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => setShowScheduleModal(true)}
                    className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl border border-[#0099ff] text-[#0099ff] text-xs font-bold hover:bg-blue-50 dark:hover:bg-blue-950/30 transition flex items-center justify-center gap-1.5"
                  >
                    <Calendar className="size-3.5" />
                    <span>Programar</span>
                  </button>

                  <button
                    type="button"
                    disabled={isPublishing || !content.trim()}
                    onClick={() => handleSavePost("published")}
                    className="flex-1 sm:flex-initial px-5 py-2.5 rounded-xl bg-[#0099ff] hover:bg-[#0082db] text-white text-xs font-bold transition flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
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
            </div>
          </ComponentCard>
        </div>

        {/* Panel Derecho: Previsualizador Realista de LinkedIn (Live Feed Preview) */}
        <div className="col-span-12 xl:col-span-5 space-y-4">
          <div className="sticky top-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Previsualización en LinkedIn
              </span>
              <span className="text-[10px] font-semibold text-slate-400 flex items-center gap-1">
                <Eye className="size-3" />
                Feed Desktop & Móvil
              </span>
            </div>

            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden text-slate-900 dark:text-white">
              {/* Header de Autor */}
              <div className="p-3.5 flex items-start justify-between border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2.5">
                  <div className="size-10 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-500 text-white flex items-center justify-center font-bold text-sm shrink-0">
                    {(activeAccObj?.name || currentUser.name).charAt(0)}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold leading-tight">{activeAccObj?.name || currentUser.name}</h4>
                    <p className="text-[10px] text-slate-500 leading-tight line-clamp-1">
                      Líder B2B · Fundador & Estratega de Crecimiento
                    </p>
                    <span className="text-[9px] text-slate-400 flex items-center gap-1 mt-0.5">
                      Ahora · 🌐
                    </span>
                  </div>
                </div>
                <span className="text-xs font-bold text-[#0077b5]">in</span>
              </div>

              {/* Texto del Post con Gancho y Plegado */}
              <div className="p-3.5 text-xs leading-relaxed whitespace-pre-wrap font-sans">
                {isExpandedPreview ? (
                  content
                ) : (
                  <>
                    {content.slice(0, 160)}
                    {content.length > 160 && (
                      <button
                        type="button"
                        onClick={() => setIsExpandedPreview(true)}
                        className="text-slate-500 hover:text-[#0099ff] font-semibold ml-1 cursor-pointer"
                      >
                        ...ver más
                      </button>
                    )}
                  </>
                )}
              </div>

              {/* Adjunto Visual según Modelo */}
              {format === "image" && (
                <div className="bg-slate-100 dark:bg-slate-800/80 border-t border-slate-100 dark:border-slate-800 flex items-center justify-center overflow-hidden">
                  {previewImage ? (
                    <img src={previewImage} alt="Vista previa de portada" className="w-full max-h-[380px] object-contain" />
                  ) : (
                    <div className="py-12 px-4 text-center">
                      <ImageIcon className="size-8 text-slate-400 mx-auto mb-2 opacity-60" />
                      <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">Sin portada adjunta aún</p>
                      <button
                        type="button"
                        onClick={handleOpenVisualStudio}
                        className="mt-2 text-xs font-bold text-[#0099ff] hover:underline"
                      >
                        + Diseñar portada en Editor Visual
                      </button>
                    </div>
                  )}
                </div>
              )}

              {format === "carousel" && (
                <div className="bg-slate-100 dark:bg-slate-800/80 border-t border-slate-100 dark:border-slate-800 overflow-hidden relative">
                  {carouselThumbnail || carouselPdfUrl ? (
                    <div>
                      <div className="relative aspect-4/5 w-full bg-slate-900 flex items-center justify-center">
                        <img
                          src={carouselThumbnail || previewImage || ""}
                          alt="Diapositiva carrusel"
                          className="w-full h-full object-contain"
                        />
                        {/* Badge de Documento PDF */}
                        <div className="absolute top-2.5 right-2.5 bg-black/70 text-white text-[10px] font-bold px-2 py-0.5 rounded-md backdrop-blur-xs flex items-center gap-1">
                          <Layers className="size-3" />
                          <span>1 / {carouselPageCount || 4}</span>
                        </div>
                      </div>
                      <div className="p-2 bg-slate-50 dark:bg-slate-800 flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-300 px-3">
                        <span className="font-semibold line-clamp-1">Documento PDF · Carrusel LinkedIn</span>
                        <button
                          type="button"
                          onClick={handleOpenVisualStudio}
                          className="text-[#0099ff] font-bold hover:underline shrink-0"
                        >
                          Editar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div
                      className="relative aspect-4/5 w-full flex flex-col justify-between p-5 text-white"
                      style={{
                        backgroundImage: `url(${slides[0]?.backgroundImageUrl || SAMPLE_B2B_BACKGROUNDS[0].url})`,
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                      }}
                    >
                      {/* Capa de degradé dinámico según coverLayout */}
                      <div
                        className="absolute inset-0 pointer-events-none"
                        style={{
                          background:
                            slides[0]?.coverLayout === "split_left"
                              ? "linear-gradient(to right, rgba(10, 18, 42, 0.96) 0%, rgba(10, 18, 42, 0.88) 45%, rgba(10, 18, 42, 0.25) 75%, transparent 100%)"
                              : slides[0]?.coverLayout === "split_right"
                              ? "linear-gradient(to left, rgba(10, 18, 42, 0.96) 0%, rgba(10, 18, 42, 0.88) 45%, rgba(10, 18, 42, 0.25) 75%, transparent 100%)"
                              : "linear-gradient(to top, rgba(10, 18, 42, 0.97) 0%, rgba(10, 18, 42, 0.82) 48%, rgba(10, 18, 42, 0.15) 78%, transparent 100%)",
                        }}
                      />
                      <div className="relative z-10 flex items-center justify-between">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/20 backdrop-blur-xs">
                          PORTADA B2B
                        </span>
                        <button
                          type="button"
                          onClick={handleOpenVisualStudio}
                          className="text-xs font-bold text-white bg-[#0099ff] hover:bg-[#0082db] px-2.5 py-1 rounded-md transition shadow-xs flex items-center gap-1"
                        >
                          <Layers className="size-3" />
                          <span>Abrir en Editor Visual</span>
                        </button>
                      </div>
                      <div className="relative z-10 space-y-1">
                        <h4 className="text-sm font-extrabold leading-snug">
                          {parseHighlightedTitle(slides[0]?.title || title, slides[0]?.highlightColor || "#f97316")}
                        </h4>
                        <p className="text-[11px] text-white/80">{slides[0]?.subtitle}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Barra de Reacciones LinkedIn */}
              <div className="p-2.5 px-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500 font-semibold">
                <span className="hover:text-slate-900 cursor-pointer">👍 Reaccionar</span>
                <span className="hover:text-slate-900 cursor-pointer">💬 Comentar</span>
                <span className="hover:text-slate-900 cursor-pointer">🔁 Repostear</span>
                <span className="hover:text-slate-900 cursor-pointer">📤 Enviar</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de Programación */}
      {showScheduleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-slate-900 p-5 shadow-xl space-y-4">
            <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <Calendar className="size-4 text-[#0099ff]" />
              Programar Publicación en LinkedIn
            </h3>
            <div className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Fecha:</label>
                <input
                  type="date"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2 text-xs"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Hora:</label>
                <input
                  type="time"
                  value={scheduledTime}
                  onChange={(e) => setScheduledTime(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2 text-xs"
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowScheduleModal(false)}
                className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-800"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  const combined = new Date(`${scheduledDate}T${scheduledTime}:00`).toISOString();
                  setShowScheduleModal(false);
                  void handleSavePost("scheduled", combined);
                }}
                className="px-4 py-1.5 rounded-lg bg-[#0099ff] text-white text-xs font-bold"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Estudio Visual Integrado (Portada o Carrusel PDF) */}
      <VisualStudioModal
        isOpen={isVisualStudioOpen}
        onClose={handleCloseVisualStudio}
        mode={format === "carousel" ? "carousel" : "single"}
        initialTitle={parsePostHeader(content, referenceHook || topic).hook}
        initialSubtitle={parsePostHeader(content, referenceHook || topic).subtitle}
        initialHighlight={parsePostHeader(content, referenceHook || topic).highlight}
        authorName={activeAccObj?.name || currentUser.name}
        authorHandle={`@${(activeAccObj?.name || currentUser.name).toLowerCase().replace(/[^a-z0-9]/g, "")}`}
        onApplyImage={(dataUrl) => {
          setPreviewImage(dataUrl);
          handleCloseVisualStudio();
          setPublishFeedback({
            type: "success",
            message: "¡Portada visual aplicada con éxito a la publicación!",
          });
          setTimeout(() => setPublishFeedback(null), 3000);
        }}
        onApplyCarousel={(result) => {
          setCarouselPdfUrl(result.pdfDataUrl);
          setCarouselPageCount(result.pageCount);
          setCarouselThumbnail(result.thumbnail);
          handleCloseVisualStudio();
          setPublishFeedback({
            type: "success",
            message: `¡Carrusel de ${result.pageCount} páginas en PDF generado y adjuntado con éxito!`,
          });
          setTimeout(() => setPublishFeedback(null), 3000);
        }}
      />
    </div>
  );
}
