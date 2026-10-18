"use client";

import ComponentCard from "@/components/common/ComponentCard";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import {
  getActiveAccountForUser,
  getVisibleAccountsForUser,
  setActiveAccountId,
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

export default function CreateViralPostPage() {
  const router = useRouter();
  const { currentUser } = useAuth();
  const { addPost } = useCreatedPosts();

  // Cuentas de LinkedIn disponibles
  const [accounts, setAccounts] = useState<UnipileAccount[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>("");

  const [format, setFormat] = useState<PostFormat>("text");
  const [topic, setTopic] = useState("Social Selling B2B");
  const [leadMagnetKeyword, setLeadMagnetKeyword] = useState("SISTEMA");
  const [tone, setTone] = useState("Autoridad B2B con llamada a la acción");
  const [content, setContent] = useState("");
  const [imagePrompt, setImagePrompt] = useState("");
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // Referencia original si vino de Radar Viral
  const [referenceHook, setReferenceHook] = useState("");
  const [referenceContent, setReferenceContent] = useState("");
  const [referenceAuthor, setReferenceAuthor] = useState("");

  // Estados de IA y Publicación
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
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
      title: "Cómo Convertir Comentarios en Clientes B2B",
      subtitle: "Framework Inbound de 4 Pasos para LinkedIn",
      content: ["InHubFlow Social Selling", `Por ${currentUser.name}`],
      footerText: `@${currentUser.name.toLowerCase().replace(/[^a-z0-9]/g, "")}`,
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
      setContent(`Construir un embudo inbound en LinkedIn solía tomar semanas.

Hoy, la combinación de contenido relevante y automatización relacional permite cerrar reuniones comerciales mientras duermes.

A continuación te comparto los 3 pasos esenciales:
1. Publica contenido con llamados a la acción basados en activos de alto valor.
2. Monitorea los comentarios con palabras clave activadoras.
3. Entrega el recurso de forma inmediata en mensaje privado.

Comenta "${leadMagnetKeyword}" abajo y te envío el framework completo en PDF sin costo.`);
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
        throw new Error(data.error || "No se pudo generar el contenido con IA.");
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
        message: "Publicación modelada con éxito integrando tu Base de Conocimiento Aprobada (RAG).",
      });
      setTimeout(() => setPublishFeedback(null), 5000);
    } catch (err: any) {
      console.error("[Generate AI Error]:", err);
      setPublishFeedback({
        type: "error",
        message: err.message || "Error al conectar con el motor de Inteligencia Artificial.",
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
  const handleSavePost = async (status: "draft" | "scheduled" | "published") => {
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
          }),
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || "Error al publicar en LinkedIn a través de Unipile.");
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
      carouselSlides: format === "carousel" ? slides : undefined,
      carouselTheme: format === "carousel" ? carouselTheme : undefined,
      leadMagnetKeyword,
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
    router.push("/viral-posts/list");
  };

  const currentSlide = slides[currentSlideIndex] || slides[0];
  const activeAccObj = accounts.find((a) => a.id === selectedAccountId);

  return (
    <div className="space-y-6">
      <PageBreadcrumb pageTitle="Modelador de Contenido con IA" />

      {/* Banner de Referencia si viene de Radar Viral */}
      {referenceAuthor && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-brand-50/70 border border-brand-200 dark:bg-brand-950/30 dark:border-brand-900/60">
          <div className="space-y-0.5">
            <span className="text-[10px] uppercase font-bold tracking-wider text-brand-600 dark:text-brand-400">
              Modelando desde Post Finder:
            </span>
            <p className="text-xs font-semibold text-gray-800 dark:text-white">
              Publicación original de {referenceAuthor}: &quot;{referenceHook.slice(0, 80)}...&quot;
            </p>
          </div>
          <button
            type="button"
            onClick={handleGenerateAi}
            disabled={isGeneratingAi}
            className="rounded-xl bg-brand-500 px-4 py-2 text-xs font-semibold text-white hover:bg-brand-600 transition flex items-center justify-center gap-2 shrink-0 disabled:opacity-50"
          >
            {isGeneratingAi ? (
              <>
                <span className="h-3 w-3 border-2 border-white/40 border-t-white rounded-full animate-spin"></span>
                Reescribiendo con Gemini...
              </>
            ) : (
              "Reescribir con IA (Gemini 3.6 Flash)"
            )}
          </button>
        </div>
      )}

      {publishFeedback && (
        <div
          className={`p-3.5 rounded-xl text-xs font-medium border ${
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
            title="Configurador de Publicación"
            desc="Personaliza la estructura y utiliza la IA para generar el copy perfecto antes de publicar en LinkedIn."
          >
            <div className="space-y-5">
              {/* Selector de Cuenta de LinkedIn Conectada */}
              {accounts.length > 0 && (
                <div className="p-3 rounded-xl bg-gray-50 border border-gray-200 dark:bg-gray-800/50 dark:border-gray-800">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="block text-[11px] font-semibold text-gray-500 uppercase">
                        Cuenta de LinkedIn para Publicar:
                      </span>
                      <p className="text-xs font-bold text-gray-900 dark:text-white mt-0.5">
                        {activeAccObj ? activeAccObj.name : "Seleccionar cuenta"}
                      </p>
                    </div>
                    {accounts.length > 1 && (
                      <select
                        value={selectedAccountId}
                        onChange={(e) => {
                          setSelectedAccountId(e.target.value);
                          setActiveAccountId(e.target.value);
                        }}
                        className="rounded-lg border border-gray-300 bg-white px-2.5 py-1 text-xs text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
                      >
                        {accounts.map((acc) => (
                          <option key={acc.id} value={acc.id}>
                            {acc.name} ({acc.status})
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>
              )}

              {/* Selector de 3 Formatos */}
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Formato de Salida
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => setFormat("text")}
                    className={`rounded-xl p-3.5 text-center transition ${
                      format === "text"
                        ? "border-2 border-brand-500 bg-brand-50/50 dark:bg-brand-950/30"
                        : "border border-gray-200 hover:border-gray-300 dark:border-gray-800"
                    }`}
                  >
                    <p className="font-semibold text-xs text-gray-900 dark:text-white">
                      1. Solo Texto
                    </p>
                    <p className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">
                      Storytelling & Gancho Viral
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormat("image")}
                    className={`rounded-xl p-3.5 text-center transition ${
                      format === "image"
                        ? "border-2 border-brand-500 bg-brand-50/50 dark:bg-brand-950/30"
                        : "border border-gray-200 hover:border-gray-300 dark:border-gray-800"
                    }`}
                  >
                    <p className="font-semibold text-xs text-gray-900 dark:text-white">
                      2. Texto + Imagen
                    </p>
                    <p className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">
                      Copy + Prompt para IA
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormat("carousel")}
                    className={`rounded-xl p-3.5 text-center transition ${
                      format === "carousel"
                        ? "border-2 border-brand-500 bg-brand-50/50 dark:bg-brand-950/30"
                        : "border border-gray-200 hover:border-gray-300 dark:border-gray-800"
                    }`}
                  >
                    <p className="font-semibold text-xs text-gray-900 dark:text-white">
                      3. Carrusel PDF
                    </p>
                    <p className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">
                      Diapositivas Vectoriales
                    </p>
                  </button>
                </div>
              </div>

              {/* Tema, Palabra Clave y Tono */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">
                    Tema del Post
                  </label>
                  <input
                    type="text"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="Tema principal..."
                    className="w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2 text-xs text-gray-800 focus:border-brand-500 focus:outline-hidden dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">
                    Palabra Clave (Lead Magnet)
                  </label>
                  <input
                    type="text"
                    value={leadMagnetKeyword}
                    onChange={(e) => setLeadMagnetKeyword(e.target.value.toUpperCase())}
                    placeholder="SISTEMA, GUIA, AUDITORIA..."
                    className="w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2 text-xs font-mono font-semibold text-brand-600 focus:border-brand-500 focus:outline-hidden dark:border-gray-700 dark:bg-gray-900 dark:text-brand-400"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">
                    Tono del Copy
                  </label>
                  <select
                    value={tone}
                    onChange={(e) => setTone(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs text-gray-800 focus:border-brand-500 focus:outline-hidden dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                  >
                    <option value="Autoridad B2B con llamada a la acción">Autoridad B2B</option>
                    <option value="Storytelling personal y de aprendizaje">Storytelling</option>
                    <option value="Educativo directo paso a paso">Educativo Paso a Paso</option>
                    <option value="Provocador y debate constructivo">Provocador / Debate</option>
                  </select>
                </div>
              </div>

              {/* Botón de Generación / Mejora con IA + Base de Conocimiento (RAG) */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border border-brand-200 bg-brand-50/40 dark:border-brand-900/60 dark:bg-brand-950/20">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-gray-900 dark:text-white">
                      Modelador de Copy B2B con IA & RAG
                    </span>
                    <span className="rounded-full bg-emerald-100 text-emerald-700 px-2 py-0.5 text-[10px] font-bold dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                      RAG Aprobado Activo
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                    Modela el post integrando automáticamente la propuesta de valor y documentos aprobados del Asistente SDR IA.
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
                      Modelando con IA & RAG...
                    </>
                  ) : (
                    "Generar con IA"
                  )}
                </button>
              </div>

              {/* Formato 2: Generador de Prompt Visual */}
              {format === "image" && (
                <div className="rounded-xl border border-gray-200 p-4 bg-gray-50/60 dark:border-gray-800 dark:bg-gray-900/40 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-brand-600">
                      Generador de Prompt Visual para Midjourney / Flux
                    </span>
                    <button
                      type="button"
                      onClick={handleCopyPrompt}
                      className="rounded-md bg-white border border-gray-300 px-2.5 py-1 text-[11px] font-semibold text-gray-700 hover:bg-gray-100 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200"
                    >
                      {copiedPrompt ? "Copiado al Portapapeles" : "Copiar Prompt"}
                    </button>
                  </div>
                  <textarea
                    rows={3}
                    value={imagePrompt}
                    onChange={(e) => setImagePrompt(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 bg-white p-2.5 text-xs font-mono text-gray-800 focus:border-brand-500 focus:outline-hidden dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                  />
                  <div className="pt-2">
                    <label className="block text-[11px] font-semibold uppercase text-gray-500 mb-1">
                      Subir Imagen Generada (Opcional)
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
                <div className="rounded-xl border border-gray-200 p-4 bg-gray-50/60 dark:border-gray-800 dark:bg-gray-900/40 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold uppercase tracking-wider text-brand-600">
                        Editor de Diapositiva ({currentSlideIndex + 1} de {slides.length})
                      </span>
                      <p className="text-[11px] text-gray-500">
                        {currentSlide.isCover
                          ? "Portada del Carrusel"
                          : currentSlide.isCta
                          ? "Diapositiva Final de CTA"
                          : "Diapositiva de Contenido"}
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

                  <div className="space-y-3 bg-white p-3.5 rounded-lg border border-gray-200 dark:bg-gray-900 dark:border-gray-800">
                    <div>
                      <label className="block text-[11px] font-semibold text-gray-500 uppercase mb-1">
                        Titular de Diapositiva
                      </label>
                      <input
                        type="text"
                        value={currentSlide.title}
                        onChange={(e) => {
                          const updated = [...slides];
                          updated[currentSlideIndex].title = e.target.value;
                          setSlides(updated);
                        }}
                        className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-xs text-gray-900 font-semibold focus:border-brand-500 focus:outline-hidden dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                      />
                    </div>

                    {currentSlide.subtitle !== undefined && (
                      <div>
                        <label className="block text-[11px] font-semibold text-gray-500 uppercase mb-1">
                          Subtítulo
                        </label>
                        <input
                          type="text"
                          value={currentSlide.subtitle}
                          onChange={(e) => {
                            const updated = [...slides];
                            updated[currentSlideIndex].subtitle = e.target.value;
                            setSlides(updated);
                          }}
                          className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-xs text-gray-800 focus:border-brand-500 focus:outline-hidden dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                        />
                      </div>
                    )}

                    <div>
                      <label className="block text-[11px] font-semibold text-gray-500 uppercase mb-1">
                        Puntos de Contenido (1 por línea)
                      </label>
                      <textarea
                        rows={3}
                        value={currentSlide.content.join("\n")}
                        onChange={(e) => {
                          const updated = [...slides];
                          updated[currentSlideIndex].content = e.target.value.split("\n");
                          setSlides(updated);
                        }}
                        className="w-full rounded-md border border-gray-300 p-2 text-xs font-mono text-gray-800 focus:border-brand-500 focus:outline-hidden dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Editor de Texto del Post de LinkedIn */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Cuerpo del Post (Copy de LinkedIn)
                  </label>
                  <span className="text-[11px] text-gray-500 dark:text-gray-400">
                    {content.length} caracteres (Recomendado: 500 - 1,200)
                  </span>
                </div>
                <textarea
                  rows={8}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white p-4 font-mono text-xs text-gray-800 leading-relaxed focus:border-brand-500 focus:outline-hidden dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                />
              </div>

              {/* Acciones Finales */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-gray-100 dark:border-gray-800">
                <button
                  type="button"
                  onClick={() => handleSavePost("draft")}
                  className="rounded-lg border border-gray-300 px-4 py-2.5 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/5"
                >
                  Guardar como Borrador
                </button>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => handleSavePost("scheduled")}
                    className="rounded-lg border border-brand-500 px-4 py-2.5 text-xs font-semibold text-brand-600 hover:bg-brand-50 dark:text-brand-400 dark:hover:bg-brand-950/20"
                  >
                    Programar Publicación
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
                      "Publicar Ahora en LinkedIn"
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
            title="Previsualización Exacta en LinkedIn"
            desc="Visualización exacta con formato de escritorio y encuadre del contenido."
          >
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
              {/* Cabecera de perfil */}
              <div className="flex items-center gap-3 mb-4">
                <div className="h-11 w-11 rounded-full bg-brand-500 text-white flex items-center justify-center font-bold text-sm">
                  {(activeAccObj?.name || currentUser.name)
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase()}
                </div>
                <div>
                  <h4 className="text-xs font-bold text-gray-900 dark:text-white">
                    {activeAccObj ? activeAccObj.name : currentUser.name}
                  </h4>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400">
                    {activeAccObj ? "Perfil de LinkedIn Conectado • 1er" : "B2B Growth & Lead Gen Specialist • 1er"}
                  </p>
                  <p className="text-[10px] text-gray-400">Ahora • Público</p>
                </div>
              </div>

              {/* Texto del post */}
              <div className="text-xs text-gray-800 leading-relaxed whitespace-pre-wrap dark:text-gray-200 mb-4 font-sans">
                {content}
              </div>

              {/* Adjunto Visual según Formato */}
              {format === "image" && (
                <div className="mb-4 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-800 bg-gray-100 dark:bg-gray-800">
                  {previewImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={previewImage}
                      alt="Preview del Post"
                      className="w-full h-56 object-cover"
                    />
                  ) : (
                    <div className="h-56 flex flex-col items-center justify-center p-6 text-center text-gray-400">
                      <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                        Espacio de Imagen Adjunta
                      </p>
                      <p className="text-[11px] mt-1 max-w-xs font-mono">
                        Prompt configurado para Midjourney
                      </p>
                    </div>
                  )}
                </div>
              )}

              {format === "carousel" && (
                <div className="mb-4 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-800 shadow-theme-xs">
                  {/* Vista fiel del Slide actual */}
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
                          className="text-[11px] font-bold uppercase tracking-wider"
                          style={{
                            color: currentSlide.isCover
                              ? "rgba(255,255,255,0.8)"
                              : carouselTheme.primaryColor,
                          }}
                        >
                          {currentSlide.isCover
                            ? "Portada"
                            : currentSlide.isCta
                            ? "Llamado a la Acción"
                            : `Slide ${currentSlide.slideNumber}`}
                        </span>
                        <span
                          className="text-[11px]"
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
                        {currentSlide.title}
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
                      className="pt-3 border-t flex justify-between text-[10px]"
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

                  {/* Barra de navegación de carrusel */}
                  <div className="flex items-center justify-between p-2.5 bg-gray-50 border-t border-gray-100 text-xs dark:bg-gray-800 dark:border-gray-700">
                    <span className="text-[11px] text-gray-500 dark:text-gray-400">
                      Documento PDF de LinkedIn
                    </span>
                    <div className="flex gap-1.5">
                      <button
                        type="button"
                        disabled={currentSlideIndex === 0}
                        onClick={() => setCurrentSlideIndex((p) => Math.max(0, p - 1))}
                        className="rounded px-2 py-0.5 text-xs bg-white border border-gray-200 disabled:opacity-40 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      >
                        &larr;
                      </button>
                      <button
                        type="button"
                        disabled={currentSlideIndex === slides.length - 1}
                        onClick={() => setCurrentSlideIndex((p) => Math.min(slides.length - 1, p + 1))}
                        className="rounded px-2 py-0.5 text-xs bg-white border border-gray-200 disabled:opacity-40 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      >
                        &rarr;
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Barra de interacción de LinkedIn */}
              <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500 dark:border-gray-800">
                <span className="hover:text-gray-900 cursor-pointer">Reaccionar</span>
                <span className="hover:text-gray-900 cursor-pointer">Comentar</span>
                <span className="hover:text-gray-900 cursor-pointer">Compartir</span>
                <span className="hover:text-gray-900 cursor-pointer">Enviar</span>
              </div>
            </div>
          </ComponentCard>
        </div>
      </div>
    </div>
  );
}
