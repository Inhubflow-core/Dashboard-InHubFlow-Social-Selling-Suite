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
import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useTranslations } from "next-intl";
import {
  Sparkles,
  Image as ImageIcon,
  Bot,
  Upload,
  Layout,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Palette,
  Check,
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

  // Cuentas de LinkedIn disponibles
  const [accounts, setAccounts] = useState<UnipileAccount[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>("");

  const [format, setFormat] = useState<PostFormat>("text");
  const [topic, setTopic] = useState("Social Selling B2B");
  const [leadMagnetKeyword, setLeadMagnetKeyword] = useState("SISTEMA");
  const [autoDmEnabled, setAutoDmEnabled] = useState(true);
  const [autoLikeComment, setAutoLikeComment] = useState(true);
  const [autoDmMessage, setAutoDmMessage] = useState(
    `¡Hola {nombre}! Vi que comentaste '{palabra_clave}' en mi publicación. Aquí tienes el documento completo con el framework accionable. ¿En qué reto comercial estás enfocado este trimestre?`
  );
  const [tone, setTone] = useState("Autoridad B2B con llamada a la acción");
  const [content, setContent] = useState("");
  const [imagePrompt, setImagePrompt] = useState("");
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isVisualStudioOpen, setIsVisualStudioOpen] = useState(false);

  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const shouldBeOpen = params.get("editor") === "open" || sessionStorage.getItem("inhubflow_visual_studio_open") === "true";
      if (shouldBeOpen) {
        setIsVisualStudioOpen(true);
      }
    } catch {}
  }, []);

  useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      const shouldBeOpen = params.get("editor") === "open";
      setIsVisualStudioOpen(shouldBeOpen);
      if (!shouldBeOpen) {
        sessionStorage.removeItem("inhubflow_visual_studio_open");
      }
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
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

  // Referencia original si vino de Radar Viral
  const [referenceHook, setReferenceHook] = useState("");
  const [referenceContent, setReferenceContent] = useState("");
  const [referenceAuthor, setReferenceAuthor] = useState("");

  // Estados de IA y Publicación
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduledDate, setScheduledDate] = useState(() => {
    const tomorrow = new Date(Date.now() + 86400000);
    return tomorrow.toISOString().split("T")[0];
  });
  const [scheduledTime, setScheduledTime] = useState("09:30");
  const [publishFeedback, setPublishFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Carrusel slides state
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [carouselTheme, setCarouselTheme] = useState(() => ({
    primaryColor: "#0099ff",
    fontFamily: "Outfit",
    authorName: currentUser.name,
    authorHandle: `@${currentUser.name.toLowerCase().replace(/[^a-z0-9]/g, "")}`,
  }));

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
      title: "El Problema del Mensaje en Frío",
      content: [
        "El decisor percibe spam antes de entender tu propuesta.",
        "Tasa de respuesta inferior al 3% en frío tradicional.",
        "Bloqueo comercial de tu perfil personal.",
      ],
      footerText: "Paso 1: Diagnóstico",
    },
    {
      slideNumber: 3,
      title: "La Alternativa Inbound",
      content: [
        "Crea un activo de valor concreto (Plantilla o Playbook).",
        "Publica mostrando los resultados tangibles.",
        "Pide una palabra clave de activación en los comentarios.",
      ],
      footerText: "Paso 2: Activación",
    },
    {
      slideNumber: 4,
      title: "Entrega Instantánea en DM",
      content: [
        "El monitor detecta el comentario con la palabra clave.",
        "Valida el estado de conexión en LinkedIn.",
        "Despacha el PDF directamente al chat privado.",
      ],
      footerText: "Paso 3: Automatización",
    },
    {
      slideNumber: 5,
      isCta: true,
      title: "¿Quieres Implementar Este Sistema?",
      subtitle: "Recibe el documento de trabajo completo en PDF",
      content: [
        "Comenta SISTEMA en esta publicación",
        "Te envío la guía por mensaje privado hoy mismo.",
      ],
      footerText: "InHubFlow Social Selling",
    },
  ]);

  // Cargar cuentas de LinkedIn conectadas reactivamente
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
        setCarouselTheme((prev) => ({
          ...prev,
          authorName: active.name || currentUser.name,
          authorHandle: `@${(active.name || currentUser.name).toLowerCase().replace(/[^a-z0-9]/g, "")}`,
        }));
      }
    };

    syncAccounts();
    window.addEventListener("storage", syncAccounts);
    return () => window.removeEventListener("storage", syncAccounts);
  }, [currentUser]);

  // Al cargar, verificar si venimos con un post seleccionado del Radar Viral
  useEffect(() => {
    const selected = getSelectedTemplateForModeling();
    if (selected) {
      setFormat(selected.format);
      setTopic(selected.topic || "Social Selling B2B");
      setReferenceHook(selected.hook || "");
      setReferenceContent(selected.fullContent || "");
      setReferenceAuthor(selected.author || "");

      if (selected.format === "text") {
        setContent(`Construir autoridad en LinkedIn requiere consistencia y un gancho probado:

${selected.hook}

1. Entiende el dolor antes de proponer tu oferta.
2. Comparte frameworks accionables en cada publicación.
3. Genera conversación genuina con preguntas directas.

Comenta "${leadMagnetKeyword}" abajo si deseas recibir nuestro playbook completo.`);
      } else if (selected.format === "image") {
        setContent(`La claridad en tu propuesta comercial es la mejor inversión que puedes hacer este mes:

${selected.hook}

Revisa los puntos clave en la imagen adjunta y aplícalos hoy.`);
        setImagePrompt(
          selected.imagePrompt ||
            "Minimalist executive desk setup with laptop showing pipeline growth chart, warm ambient corporate blue tones, hyper-realistic 8k."
        );
      } else if (selected.format === "carousel") {
        setContent(`Desliza el carrusel completo para ver la guía detallada:

${selected.hook}

Comenta "${leadMagnetKeyword}" para enviarte la plantilla oficial en PDF por mensaje privado.`);
        if (selected.carouselSlides && selected.carouselSlides.length > 0) {
          setSlides(selected.carouselSlides);
        }
      }
    } else {
      setContent(t("samplePostContent", { keyword: leadMagnetKeyword }));
      setImagePrompt(
        "Modern corporate laptop showing analytics dashboard on glass desk, subtle blue backlighting, photorealistic style, 8k resolution."
      );
    }
  }, [leadMagnetKeyword]);

  // Modelar / Re-generar con IA + Base de Conocimiento Aprobada (RAG)
  const handleGenerateAi = async () => {
    setIsGeneratingAi(true);
    setPublishFeedback(null);

    try {
      const approvedKnowledge = getStoredKnowledgeSources().filter(
        (k) => k.status === "approved"
      );

      const res = await fetch("/api/ai/model-post", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hook: referenceHook,
          originalContent: referenceContent || content,
          topic,
          format,
          leadMagnetKeyword,
          tone,
          knowledgeSources: approvedKnowledge,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || t("feedbackAiFail"));
      }

      const generated = data.result;

      if (generated.content) {
        setContent(generated.content);
      }

      if (format === "image" && generated.imagePrompt) {
        setImagePrompt(generated.imagePrompt);
      }

      if (format === "carousel" && Array.isArray(generated.slides) && generated.slides.length > 0) {
        setSlides(generated.slides);
      }

      setPublishFeedback({
        type: "success",
        message: t("feedbackAiSuccess"),
      });
      setTimeout(() => setPublishFeedback(null), 5000);
    } catch (err: any) {
      console.error("[Generate AI Error]:", err);
      setPublishFeedback({
        type: "error",
        message: err.message || t("feedbackAiError"),
      });
    } finally {
      setIsGeneratingAi(false);
    }
  };

  const handleCopyPrompt = () => {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(imagePrompt);
      setCopiedPrompt(true);
      setTimeout(() => setCopiedPrompt(false), 2500);
    }
  };

  const handleDownloadPdf = async () => {
    await exportCarouselToPdf(slides, {
      primaryColor: carouselTheme.primaryColor,
      authorName: carouselTheme.authorName,
      authorHandle: carouselTheme.authorHandle,
      filename: `Carrusel_${topic.replace(/\s+/g, "_")}.pdf`,
    });
  };

  // Guardar post (Borrador, Programado o Publicación Real)
  const handleSavePost = async (status: "draft" | "scheduled" | "published", customScheduledAt?: string) => {
    setPublishFeedback(null);

    let linkedinPostId: string | undefined = undefined;

    // Si es publicación inmediata, llamar a la API de Unipile
    if (status === "published") {
      setIsPublishing(true);
      try {
        const res = await fetch("/api/unipile/posts/publish", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            account_id: selectedAccountId,
            text: content,
            attachments: previewImage
              ? [
                  {
                    content: previewImage,
                    filename: "post-cover.png",
                    content_type: "image/png",
                  },
                ]
              : undefined,
          }),
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || "Error al publicar en LinkedIn a través del motor InHubFlow.");
        }

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
      title: content.split("\n")[0].substring(0, 70) || `Post sobre ${topic}`,
      format,
      content,
      imagePrompt: format === "image" ? imagePrompt : undefined,
      mediaUrl: previewImage || undefined,
      coverLayout: format === "carousel" ? slides[0]?.coverLayout : undefined,
      coverImage: format === "carousel" ? slides[0]?.backgroundImageUrl : undefined,
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
        status === "scheduled" ? new Date(Date.now() + 86400000).toISOString() : undefined,
      publishedAt: status === "published" ? new Date().toISOString() : undefined,
      createdAt: new Date().toISOString(),
      metrics:
        status === "published"
          ? { likes: 0, comments: 0, impressions: 0, leadsCaptured: 0 }
          : undefined,
    };

    addPost(newPost);
    setSelectedTemplateForModeling(null);
    if (onTabChange) {
      onTabChange("list");
    } else {
      router.push("/viral-posts/list");
    }
  };

  const currentSlide = slides[currentSlideIndex] || slides[0];
  const activeAccObj = accounts.find((a) => a.id === selectedAccountId);

  return (
    <div className="w-full space-y-6">
      {!hideBreadcrumb && <PageBreadcrumb pageTitle={t("pageTitle")} />}

      {/* Banner de Referencia si viene de Radar Viral */}
      {referenceAuthor && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-lg bg-brand-50/70 border border-brand-200 dark:bg-brand-950/30 dark:border-brand-900/60">
          <div className="space-y-0.5">
            <span className="text-xs uppercase font-bold tracking-wider text-brand-600 dark:text-brand-400">
              {t("modelingFromRadar")}
            </span>
            <p className="text-xs font-semibold text-gray-800 dark:text-white">
              {t("originalPostBy", { author: referenceAuthor, hook: referenceHook.slice(0, 80) })}
            </p>
          </div>
          <button
            type="button"
            onClick={handleGenerateAi}
            disabled={isGeneratingAi}
            className="rounded-lg bg-brand-500 px-4 py-2 text-xs font-semibold text-white hover:bg-brand-600 transition flex items-center justify-center gap-2 shrink-0 disabled:opacity-50"
          >
            {isGeneratingAi ? (
              <>
                <span className="h-3 w-3 border-2 border-white/40 border-t-white rounded-full animate-spin"></span>
                {t("rewritingWithAi")}
              </>
            ) : (
              t("rewriteWithAiBtn")
            )}
          </button>
        </div>
      )}

      {publishFeedback && (
        <div
          className={`p-3.5 rounded-lg text-xs font-medium border ${
            publishFeedback.type === "success"
              ? "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-900/50 dark:text-emerald-300"
              : "bg-red-50 text-red-800 border-red-200 dark:bg-red-950/40 dark:border-red-900/50 dark:text-red-300"
          }`}
        >
          {publishFeedback.message}
        </div>
      )}

      <div className="grid grid-cols-12 gap-6">
        {/* Panel Izquierdo: Editor y Controles */}
        <div className="col-span-12 xl:col-span-7 space-y-6">
          <ComponentCard
            title={t("cardTitle")}
            desc={t("cardDesc")}
          >
            <div className="space-y-5">
              {/* Selector de 3 Formatos */}
              <div>
                <label className="mb-2 block text-xs leading-5 font-normal tracking-normal uppercase text-gray-400">
                  {t("outputFormat")}
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => setFormat("text")}
                    className={`rounded-lg p-3.5 text-center transition ${
                      format === "text"
                        ? "border-2 border-brand-500 bg-brand-50/50 dark:bg-brand-950/30"
                        : "border border-gray-200 hover:border-gray-300 dark:border-gray-800"
                    }`}
                  >
                    <p className="text-base font-medium text-gray-800 dark:text-white/90">
                      {t("format1Text")}
                    </p>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      {t("format1Desc")}
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormat("image")}
                    className={`rounded-lg p-3.5 text-center transition ${
                      format === "image"
                        ? "border-2 border-brand-500 bg-brand-50/50 dark:bg-brand-950/30"
                        : "border border-gray-200 hover:border-gray-300 dark:border-gray-800"
                    }`}
                  >
                    <p className="text-base font-medium text-gray-800 dark:text-white/90">
                      {t("format2Image")}
                    </p>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      {t("format2Desc")}
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormat("carousel")}
                    className={`rounded-lg p-3.5 text-center transition ${
                      format === "carousel"
                        ? "border-2 border-brand-500 bg-brand-50/50 dark:bg-brand-950/30"
                        : "border border-gray-200 hover:border-gray-300 dark:border-gray-800"
                    }`}
                  >
                    <p className="text-base font-medium text-gray-800 dark:text-white/90">
                      {t("format3Carousel")}
                    </p>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      {t("format3Desc")}
                    </p>
                  </button>
                </div>
              </div>

              {/* Tema, Palabra Clave y Tono */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="mb-1.5 block text-xs leading-5 font-normal tracking-normal uppercase text-gray-400">
                    {t("topicLabel")}
                  </label>
                  <input
                    type="text"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder={t("topicPlaceholder")}
                    className="w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2 text-xs text-gray-800 focus:border-brand-500 focus:outline-hidden dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs leading-5 font-normal tracking-normal uppercase text-gray-400">
                    {t("leadMagnetLabel")}
                  </label>
                  <input
                    type="text"
                    value={leadMagnetKeyword}
                    onChange={(e) => setLeadMagnetKeyword(e.target.value.toUpperCase())}
                    placeholder={t("leadMagnetPlaceholder")}
                    className="w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2 text-xs font-mono font-semibold text-brand-600 focus:border-brand-500 focus:outline-hidden dark:border-gray-700 dark:bg-gray-900 dark:text-brand-400"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs leading-5 font-normal tracking-normal uppercase text-gray-400">
                    {t("toneLabel")}
                  </label>
                  <select
                    value={tone}
                    onChange={(e) => setTone(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs text-gray-800 focus:border-brand-500 focus:outline-hidden dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                  >
                    <option value="Autoridad B2B con llamada a la acción">{t("toneB2BAuthority")}</option>
                    <option value="Storytelling personal y de aprendizaje">{t("toneStorytelling")}</option>
                    <option value="Educativo directo paso a paso">{t("toneStepByStep")}</option>
                    <option value="Provocador y debate constructivo">{t("toneProvocative")}</option>
                  </select>
                </div>
              </div>

              {/* SECCIÓN CENTINELA INBOUND LEAD MAGNET & AUTO-DM */}
              <div className="rounded-xl border border-brand-500/30 bg-brand-500/5 p-3.5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="size-7 rounded-lg bg-brand-500/20 text-brand-500 flex items-center justify-center shrink-0">
                      <Bot className="size-3.5" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wide flex items-center gap-1.5">
                        <span>Auto-DM de Comentarios Inbound</span>
                        <span className="bg-emerald-500/10 text-emerald-400 text-[10px] px-1.5 py-0.2 rounded-sm font-semibold">
                          Activo
                        </span>
                      </p>
                      <p className="text-[11px] text-gray-500 dark:text-gray-400">
                        Envía automáticamente el recurso por mensaje privado a quien comente &quot;{leadMagnetKeyword}&quot;.
                      </p>
                    </div>
                  </div>

                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={autoDmEnabled}
                      onChange={(e) => setAutoDmEnabled(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-8 h-4.5 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-brand-500"></div>
                  </label>
                </div>

                {autoDmEnabled && (
                  <div className="pt-2 border-t border-brand-500/20 space-y-2">
                    <label className="block text-[11px] font-semibold text-gray-400 uppercase">
                      Mensaje Automático en DM de LinkedIn:
                    </label>
                    <textarea
                      rows={2}
                      value={autoDmMessage}
                      onChange={(e) => setAutoDmMessage(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 bg-white p-2 text-xs text-gray-800 dark:border-gray-700 dark:bg-gray-900 dark:text-white focus:border-brand-500 focus:outline-hidden"
                    />
                  </div>
                )}
              </div>

              {/* Botón de Generación / Mejora con IA + Base de Conocimiento (RAG) */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-lg border border-brand-200 bg-brand-50/40 dark:border-brand-900/60 dark:bg-brand-950/20">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-base font-medium text-gray-800 dark:text-white/90">
                      {t("aiModelerTitle")}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    {t("aiModelerDesc")}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={isGeneratingAi}
                  onClick={handleGenerateAi}
                  className="rounded-lg bg-brand-500 px-4 py-2 text-xs font-semibold text-white hover:bg-brand-600 transition flex items-center gap-2 shrink-0 disabled:opacity-50 shadow-xs"
                >
                  {isGeneratingAi ? (
                    <>
                      <span className="h-3 w-3 border-2 border-white/40 border-t-white rounded-full animate-spin"></span>
                      {t("modelingAi")}
                    </>
                  ) : (
                    t("generateAiBtn")
                  )}
                </button>
              </div>

              {/* Formato 2: Generador de Prompt Visual y Estudio Gráfico */}
              {format === "image" && (
                <div className="rounded-lg border border-gray-300 p-4 bg-gray-50/60 dark:border-gray-800 dark:bg-gray-900/40 space-y-4">
                  {/* Banner Destacado del Estudio Visual */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-brand-500/10 border border-brand-500/20">
                    <div className="flex items-center gap-2.5">
                      <div className="size-8 rounded-lg bg-brand-500/20 flex items-center justify-center text-brand-500 shrink-0">
                        <Sparkles className="size-4" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-gray-900 dark:text-white">
                          Editor Visual (Suite Creativa)
                        </p>
                        <p className="text-[11px] text-gray-500 dark:text-gray-400">
                          Diseña tu imagen con plantillas virales, fotos de stock y degradé de alto impacto.
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleOpenVisualStudio}
                      className="rounded-lg bg-brand-500 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-brand-600 transition flex items-center justify-center gap-1.5 shrink-0 shadow-xs"
                    >
                      <Sparkles className="size-3.5" />
                      <span>{previewImage ? "Editar en Estudio" : "Diseñar con Estudio"}</span>
                    </button>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-xs leading-5 font-normal tracking-normal uppercase text-gray-400">
                      {t("visualPromptTitle")}
                    </span>
                    <button
                      type="button"
                      onClick={handleCopyPrompt}
                      className="rounded-lg bg-white border border-gray-300 px-2.5 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-100 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200"
                    >
                      {copiedPrompt ? t("copiedToClipboard") : t("copyPromptBtn")}
                    </button>
                  </div>
                  <textarea
                    rows={2}
                    value={imagePrompt}
                    onChange={(e) => setImagePrompt(e.target.value)}
                    className="custom-scrollbar w-full rounded-lg border border-gray-300 bg-white p-2.5 text-xs font-mono text-gray-800 focus:border-brand-500 focus:outline-hidden dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                  />
                  <div className="pt-1">
                    <label className="block text-xs leading-5 font-normal tracking-normal uppercase text-gray-400 mb-1">
                      {t("uploadImageLabel")}
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = () => setPreviewImage(reader.result as string);
                          reader.readAsDataURL(file);
                        }
                      }}
                      className="text-xs text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-brand-50 file:text-brand-700 dark:file:bg-brand-950 dark:file:text-brand-300 cursor-pointer"
                    />
                  </div>
                </div>
              )}

              {/* Formato 3: Editor de Diapositivas del Carrusel */}
              {format === "carousel" && (
                <div className="rounded-lg border border-gray-300 p-4 bg-gray-50/60 dark:border-gray-800 dark:bg-gray-900/40 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs leading-5 font-normal tracking-normal uppercase text-gray-400">
                        {t("slideEditorTitle", { current: currentSlideIndex + 1, total: slides.length })}
                      </span>
                      <p className="text-xs text-gray-500">
                        {currentSlide.isCover
                          ? t("slideCover")
                          : currentSlide.isCta
                          ? t("slideCta")
                          : t("slideContent")}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        disabled={currentSlideIndex === 0}
                        onClick={() => setCurrentSlideIndex((prev) => Math.max(0, prev - 1))}
                        className="rounded-lg border border-gray-300 px-2.5 py-1 text-xs font-medium text-gray-700 disabled:opacity-40 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300"
                      >
                        Anterior
                      </button>
                      <button
                        type="button"
                        disabled={currentSlideIndex === slides.length - 1}
                        onClick={() =>
                          setCurrentSlideIndex((prev) => Math.min(slides.length - 1, prev + 1))
                        }
                        className="rounded-lg border border-gray-300 px-2.5 py-1 text-xs font-medium text-gray-700 disabled:opacity-40 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300"
                      >
                        Siguiente
                      </button>
                      <button
                        type="button"
                        onClick={handleDownloadPdf}
                        className="rounded-lg bg-brand-500 px-3 py-1 text-xs font-semibold text-white hover:bg-brand-600 transition"
                      >
                        Descargar PDF
                      </button>
                    </div>
                  </div>

                                    {/* Selector especial cuando estamos en la diapositiva de portada (Slide 1) */}
                  {currentSlide.isCover && (
                    <div className="space-y-4 rounded-xl border border-brand-200 bg-brand-50/40 p-4 dark:border-brand-900/50 dark:bg-brand-950/20">
                      {/* 1. Selector de Composición (3 Presets 1-Clic) */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label className="text-xs font-bold uppercase tracking-wider text-brand-800 dark:text-brand-300 flex items-center gap-1.5">
                            <Layout className="size-3.5" />
                            Composición de Portada (1 Clic)
                          </label>
                          <span className="text-[11px] text-brand-600 dark:text-brand-400 font-medium">
                            Presets Virales LinkedIn
                          </span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              const updated = [...slides];
                              updated[currentSlideIndex].coverLayout = "bottom";
                              setSlides(updated);
                            }}
                            className={`flex items-center justify-center gap-2 p-2.5 rounded-lg border text-xs font-semibold transition ${
                              (currentSlide.coverLayout || "bottom") === "bottom"
                                ? "border-brand-500 bg-brand-500 text-white shadow-xs"
                                : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"
                            }`}
                          >
                            <AlignCenter className="size-4 shrink-0" />
                            <span>Inferior / Pie</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              const updated = [...slides];
                              updated[currentSlideIndex].coverLayout = "split_left";
                              setSlides(updated);
                            }}
                            className={`flex items-center justify-center gap-2 p-2.5 rounded-lg border text-xs font-semibold transition ${
                              currentSlide.coverLayout === "split_left"
                                ? "border-brand-500 bg-brand-500 text-white shadow-xs"
                                : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"
                            }`}
                          >
                            <AlignLeft className="size-4 shrink-0" />
                            <span>Split Izquierdo</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              const updated = [...slides];
                              updated[currentSlideIndex].coverLayout = "split_right";
                              setSlides(updated);
                            }}
                            className={`flex items-center justify-center gap-2 p-2.5 rounded-lg border text-xs font-semibold transition ${
                              currentSlide.coverLayout === "split_right"
                                ? "border-brand-500 bg-brand-500 text-white shadow-xs"
                                : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"
                            }`}
                          >
                            <AlignRight className="size-4 shrink-0" />
                            <span>Split Derecho</span>
                          </button>
                        </div>
                      </div>

                      {/* 2. Selector de Fotografía de Fondo B2B */}
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-brand-800 dark:text-brand-300 mb-2">
                          Foto Ejecutiva B2B de Fondo
                        </label>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-2">
                          {SAMPLE_B2B_BACKGROUNDS.map((bg) => {
                            const isSelected = currentSlide.backgroundImageUrl === bg.url;
                            return (
                              <button
                                key={bg.id}
                                type="button"
                                onClick={() => {
                                  const updated = [...slides];
                                  updated[currentSlideIndex].backgroundImageUrl = bg.url;
                                  setSlides(updated);
                                }}
                                className={`relative group h-16 rounded-lg overflow-hidden border-2 transition ${
                                  isSelected
                                    ? "border-brand-500 ring-2 ring-brand-500/30 scale-[0.98]"
                                    : "border-transparent hover:border-gray-300 dark:hover:border-gray-700 opacity-80 hover:opacity-100"
                                }`}
                              >
                                <img
                                  src={bg.url}
                                  alt={bg.name}
                                  className="w-full h-full object-cover"
                                />
                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center p-1">
                                  <span className="text-[10px] text-white font-medium text-center leading-tight line-clamp-2">
                                    {bg.name}
                                  </span>
                                </div>
                                {isSelected && (
                                  <div className="absolute top-1 right-1 bg-brand-500 text-white rounded-full p-0.5">
                                    <Check className="size-3" />
                                  </div>
                                )}
                              </button>
                            );
                          })}
                        </div>

                        {/* Subir foto propia o URL */}
                        <div className="flex flex-col sm:flex-row items-center gap-2 pt-1">
                          <label className="flex items-center justify-center gap-1.5 w-full sm:w-auto px-3 py-1.5 rounded-lg border border-gray-300 bg-white text-xs font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 cursor-pointer shrink-0">
                            <Upload className="size-3.5" />
                            <span>Subir Foto Propia</span>
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  const reader = new FileReader();
                                  reader.onload = () => {
                                    const updated = [...slides];
                                    updated[currentSlideIndex].backgroundImageUrl = reader.result as string;
                                    setSlides(updated);
                                  };
                                  reader.readAsDataURL(file);
                                }
                              }}
                            />
                          </label>

                          <input
                            type="text"
                            placeholder="O pega URL de imagen (https://...)"
                            value={currentSlide.backgroundImageUrl || ""}
                            onChange={(e) => {
                              const updated = [...slides];
                              updated[currentSlideIndex].backgroundImageUrl = e.target.value;
                              setSlides(updated);
                            }}
                            className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-xs text-gray-800 focus:border-brand-500 focus:outline-hidden dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                          />
                        </div>
                      </div>

                      {/* 3. Color de Resalto de Palabras Clave */}
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="text-xs font-bold uppercase tracking-wider text-brand-800 dark:text-brand-300 flex items-center gap-1.5">
                            <Palette className="size-3.5" />
                            Color de Resalto para **palabra**
                          </label>
                          <span className="text-[11px] font-mono text-gray-500">
                            {currentSlide.highlightColor || "#f97316"}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          {[
                            { name: "Naranja Viral", hex: "#f97316" },
                            { name: "Amarillo Foco", hex: "#facc15" },
                            { name: "Azul Eléctrico", hex: "#38bdf8" },
                            { name: "Verde Éxito", hex: "#34d399" },
                            { name: "Blanco Puro", hex: "#ffffff" },
                          ].map((col) => {
                            const isSelected = (currentSlide.highlightColor || "#f97316") === col.hex;
                            return (
                              <button
                                key={col.hex}
                                type="button"
                                title={col.name}
                                onClick={() => {
                                  const updated = [...slides];
                                  updated[currentSlideIndex].highlightColor = col.hex;
                                  setSlides(updated);
                                }}
                                className={`size-6 rounded-full border-2 transition ${
                                  isSelected
                                    ? "ring-2 ring-brand-500 scale-110 border-white shadow-xs"
                                    : "border-gray-300 hover:scale-105"
                                }`}
                                style={{ backgroundColor: col.hex }}
                              />
                            );
                          })}
                          <span className="text-[11px] text-gray-500 ml-2">
                            Usa <code className="text-brand-600 dark:text-brand-400 font-bold">**palabra**</code> en el título para iluminarla.
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

<div className="space-y-3 bg-white p-3.5 rounded-lg border border-gray-300 dark:bg-gray-900 dark:border-gray-800">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs leading-5 font-normal tracking-normal text-gray-400 uppercase">
                          {t("slideTitleLabel")}
                        </label>
                        {currentSlide.isCover && (
                          <span className="text-[11px] text-brand-600 dark:text-brand-400 font-medium">
                            Tip: Rodear con **asteriscos** para resaltar
                          </span>
                        )}
                      </div>
                      <input
                        type="text"
                        value={currentSlide.title}
                        onChange={(e) => {
                          const updated = [...slides];
                          updated[currentSlideIndex].title = e.target.value;
                          setSlides(updated);
                        }}
                        className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-xs text-gray-900 font-semibold focus:border-brand-500 focus:outline-hidden dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                      />
                    </div>

                    {currentSlide.subtitle !== undefined && (
                      <div>
                        <label className="block text-xs leading-5 font-normal tracking-normal text-gray-400 uppercase mb-1">
                          {t("slideSubtitleLabel")}
                        </label>
                        <input
                          type="text"
                          value={currentSlide.subtitle}
                          onChange={(e) => {
                            const updated = [...slides];
                            updated[currentSlideIndex].subtitle = e.target.value;
                            setSlides(updated);
                          }}
                          className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-xs text-gray-800 focus:border-brand-500 focus:outline-hidden dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                        />
                      </div>
                    )}

                    <div>
                      <label className="block text-xs leading-5 font-normal tracking-normal text-gray-400 uppercase mb-1">
                        {t("slideBulletsLabel")}
                      </label>
                      <textarea
                        rows={3}
                        value={currentSlide.content.join("\n")}
                        onChange={(e) => {
                          const updated = [...slides];
                          updated[currentSlideIndex].content = e.target.value.split("\n");
                          setSlides(updated);
                        }}
                        className="custom-scrollbar w-full rounded-lg border border-gray-300 p-2 text-xs font-mono text-gray-800 focus:border-brand-500 focus:outline-hidden dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Editor de Texto del Post de LinkedIn */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs leading-5 font-normal tracking-normal uppercase text-gray-400">
                    {t("postBodyLabel")}
                  </label>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {t("charCountRecommendation", { count: content.length })}
                  </span>
                </div>
                <textarea
                  rows={8}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="custom-scrollbar w-full rounded-lg border border-gray-300 bg-white p-4 font-sans text-sm text-gray-800 leading-relaxed focus:border-brand-500 focus:outline-hidden dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                />
              </div>

              {/* Acciones Finales */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-gray-300 dark:border-gray-800">
                <button
                  type="button"
                  onClick={() => handleSavePost("draft")}
                  className="rounded-lg border border-gray-300 px-4 py-2.5 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/5"
                >
                  {t("saveDraft")}
                </button>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => handleSavePost("scheduled")}
                    className="rounded-lg border border-brand-500 px-4 py-2.5 text-xs font-semibold text-brand-600 hover:bg-brand-50 dark:text-brand-400 dark:hover:bg-brand-950/20"
                  >
                    {t("schedulePost")}
                  </button>
                  <button
                    type="button"
                    disabled={isPublishing}
                    onClick={() => handleSavePost("published")}
                    className="rounded-lg bg-brand-500 px-5 py-2.5 text-xs font-semibold text-white hover:bg-brand-600 disabled:opacity-50 transition flex items-center gap-2"
                  >
                    {isPublishing ? (
                      <>
                        <span className="h-3.5 w-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin"></span>
                        Publicando en LinkedIn...
                      </>
                    ) : (
                      t("publishNow")
                    )}
                  </button>
                </div>
              </div>
            </div>
          </ComponentCard>
        </div>

        {/* Panel Derecho: Previsualización Fiel a LinkedIn */}
        <div className="col-span-12 xl:col-span-5 space-y-6">
          <ComponentCard
            title={t("exactPreviewTitle")}
            desc={t("exactPreviewDesc")}
          >
            <div className="rounded-lg border border-gray-300 bg-white p-5 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
              {/* Cabecera de perfil */}
              <div suppressHydrationWarning className="flex items-center gap-3 mb-4">
                <div
                  suppressHydrationWarning
                  className="h-11 w-11 rounded-full bg-brand-500 text-white flex items-center justify-center font-bold text-sm"
                >
                  {(activeAccObj?.name || currentUser.name)
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase()}
                </div>
                <div suppressHydrationWarning>
                  <h4 suppressHydrationWarning className="text-xs font-bold text-gray-900 dark:text-white">
                    {activeAccObj ? activeAccObj.name : currentUser.name}
                  </h4>
                  <p suppressHydrationWarning className="text-xs text-gray-500 dark:text-gray-400">
                    {activeAccObj ? t("connectedProfileBadge") : t("defaultProfileBadge")}
                  </p>
                  <p className="text-xs text-gray-400">{t("nowPublic")}</p>
                </div>
              </div>

              {/* Texto del post */}
              <div className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap dark:text-gray-200 mb-4 font-sans">
                {content}
              </div>

              {/* Adjunto Visual según Formato */}
              {format === "image" && (
                <div className="mb-4 rounded-lg overflow-hidden border border-gray-300 dark:border-gray-800 bg-gray-100 dark:bg-gray-800">
                  {previewImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={previewImage}
                      alt={t("previewImageAlt")}
                      className="w-full h-56 object-cover"
                    />
                  ) : (
                    <div className="h-56 flex flex-col items-center justify-center p-6 text-center text-gray-400">
                      <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                        {t("attachedImagePlaceholder")}
                      </p>
                      <p className="text-xs mt-1 max-w-xs font-mono">
                        {t("midjourneyConfiguredPrompt")}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {format === "carousel" && (
                <div className="mb-4 rounded-lg overflow-hidden border border-gray-300 dark:border-gray-800 shadow-theme-xs">
                  {/* Vista fiel del Slide actual */}
                  {currentSlide.isCover && currentSlide.backgroundImageUrl ? (
                    // Portada de Alto Impacto B2B con Foto + Degradé Dinámico
                    <div
                      className="aspect-square w-full relative overflow-hidden bg-gray-950 text-white flex flex-col justify-between"
                      style={{
                        backgroundImage: `url(${currentSlide.backgroundImageUrl})`,
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                      }}
                    >
                      {/* Capa de degradé según coverLayout */}
                      <div
                        className="absolute inset-0 pointer-events-none"
                        style={{
                          background:
                            currentSlide.coverLayout === "split_left"
                              ? "linear-gradient(to right, rgba(10, 18, 42, 0.96) 0%, rgba(10, 18, 42, 0.88) 45%, rgba(10, 18, 42, 0.25) 75%, transparent 100%)"
                              : currentSlide.coverLayout === "split_right"
                              ? "linear-gradient(to left, rgba(10, 18, 42, 0.96) 0%, rgba(10, 18, 42, 0.88) 45%, rgba(10, 18, 42, 0.25) 75%, transparent 100%)"
                              : "linear-gradient(to top, rgba(10, 18, 42, 0.97) 0%, rgba(10, 18, 42, 0.82) 48%, rgba(10, 18, 42, 0.15) 78%, transparent 100%)",
                        }}
                      />

                      {/* Header de la diapositiva */}
                      <div className="relative z-10 flex items-center justify-between p-5 pb-0">
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/20 backdrop-blur-xs text-white">
                          {t("badgeCover")}
                        </span>
                        <span className="text-xs text-white/80 font-medium">
                          {currentSlideIndex + 1} / {slides.length}
                        </span>
                      </div>

                      {/* Contenido según coverLayout */}
                      <div
                        className={`relative z-10 p-5 ${
                          currentSlide.coverLayout === "split_left"
                            ? "max-w-[70%] my-auto text-left"
                            : currentSlide.coverLayout === "split_right"
                            ? "max-w-[70%] ml-auto my-auto text-left"
                            : "mt-auto text-center max-w-sm mx-auto"
                        }`}
                      >
                        <h3 className="text-base sm:text-lg font-extrabold text-white leading-snug drop-shadow-xs">
                          {parseHighlightedTitle(
                            currentSlide.title,
                            currentSlide.highlightColor || "#f97316"
                          )}
                        </h3>

                        {currentSlide.subtitle && (
                          <p className="text-xs text-gray-200 mt-2 leading-relaxed drop-shadow-xs">
                            {currentSlide.subtitle}
                          </p>
                        )}
                      </div>

                      {/* Footer con branding */}
                      <div className="relative z-10 p-5 pt-0">
                        <div className="pt-2.5 border-t border-white/20 flex justify-between text-[11px] text-white/80">
                          <span>{carouselTheme.authorName}</span>
                          <span>{carouselTheme.authorHandle}</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    // Diapositiva interior, CTA o portada estándar plana
                    <div
                      className="aspect-square w-full p-6 flex flex-col justify-between"
                      style={{
                        backgroundColor: currentSlide.isCover
                          ? carouselTheme.primaryColor
                          : currentSlide.isCta
                          ? "#f5faff"
                          : "#ffffff",
                        color: currentSlide.isCover ? "#ffffff" : "#101828",
                      }}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-4">
                          <span
                            className="text-xs font-bold uppercase tracking-wider"
                            style={{
                              color: currentSlide.isCover
                                ? "rgba(255,255,255,0.8)"
                                : carouselTheme.primaryColor,
                            }}
                          >
                            {currentSlide.isCover
                              ? t("badgeCover")
                              : currentSlide.isCta
                              ? t("badgeCta")
                              : t("badgeSlide", { number: currentSlide.slideNumber })}
                          </span>
                          <span
                            className="text-xs"
                            style={{
                              color: currentSlide.isCover ? "rgba(255,255,255,0.7)" : "#94a3b8",
                            }}
                          >
                            {currentSlideIndex + 1} / {slides.length}
                          </span>
                        </div>

                        <h3
                          className="text-base font-bold mb-2 leading-snug"
                          style={{
                            color: currentSlide.isCover
                              ? "#ffffff"
                              : currentSlide.isCta
                              ? carouselTheme.primaryColor
                              : "#101828",
                          }}
                        >
                          {currentSlide.isCover
                            ? parseHighlightedTitle(
                                currentSlide.title,
                                currentSlide.highlightColor || "#f97316"
                              )
                            : currentSlide.title}
                        </h3>

                        {currentSlide.subtitle && (
                          <p
                            className="text-xs mb-4"
                            style={{
                              color: currentSlide.isCover ? "rgba(255,255,255,0.9)" : "#475467",
                            }}
                          >
                            {currentSlide.subtitle}
                          </p>
                        )}

                        <div className="space-y-2 mt-4">
                          {currentSlide.content.map((c, i) => (
                            <div key={i} className="flex items-start gap-2">
                              {!currentSlide.isCover && (
                                <span
                                  className="mt-1 h-1.5 w-1.5 rounded-full shrink-0"
                                  style={{
                                    backgroundColor: currentSlide.isCta
                                      ? carouselTheme.primaryColor
                                      : "#0099ff",
                                  }}
                                ></span>
                              )}
                              <p
                                className="text-xs leading-relaxed"
                                style={{
                                  color: currentSlide.isCover ? "rgba(255,255,255,0.9)" : "#334155",
                                }}
                              >
                                {c}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div
                        className="pt-3 border-t flex justify-between text-xs"
                        style={{
                          borderColor: currentSlide.isCover
                            ? "rgba(255,255,255,0.2)"
                            : "rgba(0,0,0,0.06)",
                          color: currentSlide.isCover ? "rgba(255,255,255,0.8)" : "#94a3b8",
                        }}
                      >
                        <span>{carouselTheme.authorName}</span>
                        <span>{carouselTheme.authorHandle}</span>
                      </div>
                    </div>
                  )}

                  {/* Barra de navegación de carrusel */}
                  <div className="flex items-center justify-between p-2.5 bg-gray-50 border-t border-gray-300 text-xs dark:bg-gray-800 dark:border-gray-700">
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {t("linkedinPdfDocument")}
                    </span>
                    <div className="flex gap-1.5">
                      <button
                        type="button"
                        disabled={currentSlideIndex === 0}
                        onClick={() => setCurrentSlideIndex((p) => Math.max(0, p - 1))}
                        className="rounded-lg px-2 py-0.5 text-xs bg-white border border-gray-200 disabled:opacity-40 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      >
                        &larr;
                      </button>
                      <button
                        type="button"
                        disabled={currentSlideIndex === slides.length - 1}
                        onClick={() => setCurrentSlideIndex((p) => Math.min(slides.length - 1, p + 1))}
                        className="rounded-lg px-2 py-0.5 text-xs bg-white border border-gray-200 disabled:opacity-40 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      >
                        &rarr;
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Barra de interacción de LinkedIn */}
              <div className="pt-3 border-t border-gray-300 flex items-center justify-between text-xs text-gray-500 dark:border-gray-800">
                <span className="hover:text-gray-900 cursor-pointer">{t("linkedinLike")}</span>
                <span className="hover:text-gray-900 cursor-pointer">{t("linkedinComment")}</span>
                <span className="hover:text-gray-900 cursor-pointer">{t("linkedinShare")}</span>
                <span className="hover:text-gray-900 cursor-pointer">{t("linkedinSend")}</span>
              </div>
            </div>
          </ComponentCard>
        </div>
      </div>

      {/* Modal de Estudio Visual Integrado */}
      <VisualStudioModal
        isOpen={isVisualStudioOpen}
        onClose={handleCloseVisualStudio}
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
            message: "¡Diseño visual aplicado con éxito a la publicación!",
          });
          setTimeout(() => setPublishFeedback(null), 3000);
        }}
      />
    </div>
  );
}
