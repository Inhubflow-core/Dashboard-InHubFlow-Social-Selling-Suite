"use client";

import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { 
  X, 
  Check, 
  Smartphone, 
  Square as SquareIcon, 
  RectangleHorizontal,
  Loader2,
  BookmarkPlus,
  Download,
  FileText
} from "lucide-react";
import { jsPDF } from "jspdf";
import "@visual-studio/styles/tokens.css";
import { initContrast } from "@visual-studio/lib/contrast";
import { EditorApp } from "@visual-studio/editor/EditorApp";
import type { EditorHandle } from "@visual-studio/types/adapter";
import type { DoryDocument } from "@visual-studio/types/document";
import { createMemoryAdapter } from "@visual-studio/editor/dev/memoryAdapter";
import { createBlankDemo } from "@visual-studio/editor/dev/demoDocument";
import { newId } from "@visual-studio/lib/document";
import { useAuth } from "@/context/AuthContext";
import SaveGlobalTemplateModal from "./SaveGlobalTemplateModal";

export type LinkedInAspectRatio = "4:5" | "1:1" | "4:3" | "1.91:1";

export const DRAFT_STORAGE_KEY = "inhubflow_visual_editor_draft";

export interface LinkedInSizeConfig {
  ratio: LinkedInAspectRatio;
  label: string;
  name: string;
  width: number;
  height: number;
  ratioText: string;
  format: "PNG/JPEG";
  description: string;
}

export const LINKEDIN_SIZES: Record<LinkedInAspectRatio, LinkedInSizeConfig> = {
  "4:5": {
    ratio: "4:5",
    label: "Vertical",
    name: "Imagen de Publicación (Vertical)",
    width: 1200,
    height: 1500,
    ratioText: "4:5",
    format: "PNG/JPEG",
    description: "1200 × 1500 px · 4:5 · Máxima visibilidad móvil en LinkedIn",
  },
  "1:1": {
    ratio: "1:1",
    label: "Cuadrada",
    name: "Imagen de Publicación (Cuadrada)",
    width: 1200,
    height: 1200,
    ratioText: "1:1",
    format: "PNG/JPEG",
    description: "1200 × 1200 px · 1:1 · Formato cuadrado estándar universal",
  },
  "4:3": {
    ratio: "4:3",
    label: "Horizontal",
    name: "Imagen de Publicación (Horizontal 4:3)",
    width: 1200,
    height: 900,
    ratioText: "4:3",
    format: "PNG/JPEG",
    description: "1200 × 900 px · 4:3 · Formato editorial con mayor impacto visual en LinkedIn",
  },
  "1.91:1": {
    ratio: "1.91:1",
    label: "Panorámica",
    name: "Imagen de Publicación (Panorámica)",
    width: 1200,
    height: 627,
    ratioText: "1.91:1",
    format: "PNG/JPEG",
    description: "1200 × 627 px · 1.91:1 · Formato panorámico para desktop y artículos",
  },
};

export interface VisualStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode?: "single" | "carousel";
  initialTitle?: string;
  initialSubtitle?: string;
  initialHighlight?: string;
  initialCategory?: string;
  initialMetric?: string;
  authorName?: string;
  authorHandle?: string;
  authorAvatar?: string;
  onApplyImage?: (dataUrl: string) => void;
  onApplyCarousel?: (result: { pdfDataUrl: string; pageCount: number; thumbnail: string }) => void;
}

export default function VisualStudioModal({
  isOpen,
  onClose,
  mode = "single",
  initialTitle,
  initialSubtitle,
  initialHighlight,
  authorName,
  authorHandle,
  onApplyImage,
  onApplyCarousel,
}: VisualStudioModalProps) {
  const { isSuperAdmin, currentUser } = useAuth();
  const editorRef = useRef<EditorHandle>(null);
  
  // 3 Tamaños Principales Oficiales de Publicación en LinkedIn (recupera borrador previo si existe)
  const [aspectRatio, setAspectRatio] = useState<LinkedInAspectRatio>(() => {
    if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem(DRAFT_STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed?.aspectRatio && LINKEDIN_SIZES[parsed.aspectRatio as LinkedInAspectRatio]) {
            return parsed.aspectRatio as LinkedInAspectRatio;
          }
        }
      } catch {}
    }
    return "4:5";
  });
  const [isExporting, setIsExporting] = useState(false);
  const [docKey, setDocKey] = useState(0);

  // Estados para Guardar Plantilla Global (Super Admin)
  const [isSaveGlobalModalOpen, setIsSaveGlobalModalOpen] = useState(false);
  const [previewThumbnail, setPreviewThumbnail] = useState<string | null>(null);
  const [docSnapshot, setDocSnapshot] = useState<DoryDocument | null>(null);
  const [pageThumbnails, setPageThumbnails] = useState<Record<string, string>>({});
  const [targetPageId, setTargetPageId] = useState<string | undefined>(undefined);
  const [initialSaveMode, setInitialSaveMode] = useState<"split" | "single" | "all">("split");

  // Initialize Visual Studio contrast tokens once on mount
  useEffect(() => {
    initContrast();
  }, []);

  // Sincronización en memoria de gancho y subtítulo, e inyección de Google Fonts para Font Pairings
  useEffect(() => {
    if (typeof window !== "undefined") {
      if (initialTitle) sessionStorage.setItem("inhubflow_active_post_hook", initialTitle);
      if (initialSubtitle) sessionStorage.setItem("inhubflow_active_post_intro", initialSubtitle);
      if (initialHighlight) sessionStorage.setItem("inhubflow_active_post_highlight", initialHighlight);
    }
    if (typeof document !== "undefined") {
      const fontLinkId = "inhubflow-visual-studio-fonts";
      if (!document.getElementById(fontLinkId)) {
        if (!document.getElementById("inhubflow-font-preconnect-1")) {
          const pre1 = document.createElement("link");
          pre1.id = "inhubflow-font-preconnect-1";
          pre1.rel = "preconnect";
          pre1.href = "https://fonts.googleapis.com";
          document.head.appendChild(pre1);
        }
        if (!document.getElementById("inhubflow-font-preconnect-2")) {
          const pre2 = document.createElement("link");
          pre2.id = "inhubflow-font-preconnect-2";
          pre2.rel = "preconnect";
          pre2.href = "https://fonts.gstatic.com";
          pre2.crossOrigin = "anonymous";
          document.head.appendChild(pre2);
        }

        const link = document.createElement("link");
        link.id = fontLinkId;
        link.rel = "stylesheet";
        link.href =
          "https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Cormorant+Garamond:wght@400;600;700&family=DM+Sans:wght@400;500;700&family=Inter:wght@400;600;700&family=Lato:wght@400;700&family=Lora:wght@400;700&family=Montserrat:wght@400;600;800&family=Open+Sans:wght@400;600&family=Outfit:wght@400;600;700;800&family=Pacifico&family=Playfair+Display:wght@400;700&family=Plus+Jakarta+Sans:wght@400;600;700&family=Poppins:wght@400;600&family=Roboto:wght@400;500;700&display=swap";
        document.head.appendChild(link);
      }

      // Sincronización automática de métricas de Fabric en cuanto las fuentes web terminan de cargarse
      if ("fonts" in document) {
        (document.fonts as any).ready?.then(() => {
          const engine = editorRef.current?.getEngine?.();
          if (engine && typeof (engine as any).remeasureAllText === "function") {
            (engine as any).remeasureAllText();
          }
        });
      }
    }
  }, [initialTitle, initialSubtitle]);

  // Compute dimensions based on active LinkedIn ratio:
  // - Horizontal: 1200 x 627 px (1.91:1)
  // - Cuadrada: 1200 x 1200 px (1:1)
  // - Vertical: 1200 x 1500 px (4:5)
  const dimensions = useMemo(() => {
    return {
      width: LINKEDIN_SIZES[aspectRatio].width,
      height: LINKEDIN_SIZES[aspectRatio].height,
    };
  }, [aspectRatio]);

  // Create initial document (restaura borrador local íntegro en recarga o crea lienzo inicial)
  const initialDoc = useMemo<DoryDocument>(() => {
    if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem(DRAFT_STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed?.document?.pages && parsed.document.pages.length > 0) {
            return parsed.document;
          }
        }
      } catch (err) {
        console.warn("No se pudo cargar el borrador de localStorage:", err);
      }
    }

    const blank = createBlankDemo(dimensions.width, dimensions.height);
    
    // If we have an initial title, add a clean initial heading object adapted to the aspect ratio
    if (initialTitle && blank.pages[0]) {
      const page = blank.pages[0];
      const headingId = newId();
      const isHorizontal = aspectRatio === "4:3" || aspectRatio === "1.91:1";
      const isSquare = aspectRatio === "1:1";

      page.objects.push({
        id: headingId,
        type: "Textbox",
        kind: "text",
        name: "Título del Post",
        left: Math.round(dimensions.width / 2),
        top: Math.round(dimensions.height * (isHorizontal ? 0.22 : isSquare ? 0.24 : 0.26)),
        originX: "center",
        originY: "center",
        width: Math.round(dimensions.width * 0.8),
        height: isHorizontal ? 120 : 160,
        rotation: 0,
        flipX: false,
        flipY: false,
        opacity: 1,
        locked: false,
        text: initialTitle,
        fontFamily: "Outfit",
        fontSize: isHorizontal ? 44 : isSquare ? 52 : 56,
        fontWeight: "bold",
        fontStyle: "normal",
        fill: "#0f172a",
        textAlign: "center",
        lineHeight: 1.2,
        letterSpacing: 0,
        textTransform: "none",
        listStyle: "none",
        curveAmount: 0,
        autoFit: false,
        effects: null,
      } as any);

      if (initialSubtitle) {
        const subId = newId();
        page.objects.push({
          id: subId,
          type: "Textbox",
          kind: "text",
          name: "Subtítulo",
          left: Math.round(dimensions.width / 2),
          top: Math.round(dimensions.height * (isHorizontal ? 0.50 : isSquare ? 0.44 : 0.42)),
          originX: "center",
          originY: "center",
          width: Math.round(dimensions.width * 0.76),
          height: 100,
          rotation: 0,
          flipX: false,
          flipY: false,
          opacity: 0.9,
          locked: false,
          text: initialSubtitle,
          fontFamily: "Outfit",
          fontSize: isHorizontal ? 24 : isSquare ? 30 : 32,
          fontWeight: "normal",
          fontStyle: "normal",
          fill: "#475569",
          textAlign: "center",
          lineHeight: 1.35,
          letterSpacing: 0,
          textTransform: "none",
          listStyle: "none",
          curveAmount: 0,
          autoFit: false,
          effects: null,
        } as any);
      }

      // Si estamos en modo Carrusel y solo hay 1 página, agregar diapositivas iniciales de contenido y CTA
      if (mode === "carousel" && blank.pages.length === 1) {
        blank.pages.push({
          id: newId(),
          width: dimensions.width,
          height: dimensions.height,
          background: { type: "solid", color: "#f8fafc" },
          objects: [
            {
              id: newId(),
              type: "Textbox",
              kind: "text",
              name: "Paso 1",
              left: Math.round(dimensions.width / 2),
              top: Math.round(dimensions.height * 0.22),
              originX: "center",
              originY: "center",
              width: Math.round(dimensions.width * 0.8),
              height: 80,
              text: "1. El Diagnóstico",
              fontFamily: "Outfit",
              fontSize: isHorizontal ? 32 : isSquare ? 38 : 42,
              fontWeight: "bold",
              fill: "#0f172a",
              textAlign: "center",
            } as any,
            {
              id: newId(),
              type: "Textbox",
              kind: "text",
              name: "Contenido 1",
              left: Math.round(dimensions.width / 2),
              top: Math.round(dimensions.height * 0.46),
              originX: "center",
              originY: "center",
              width: Math.round(dimensions.width * 0.76),
              height: 160,
              text: "La mayoría de estrategias fallan al saltar directo al pitch comercial sin entender el dolor del decisor.",
              fontFamily: "Inter",
              fontSize: isHorizontal ? 20 : isSquare ? 24 : 26,
              fontWeight: "normal",
              fill: "#475569",
              textAlign: "center",
              lineHeight: 1.4,
            } as any,
          ],
        } as any);

        blank.pages.push({
          id: newId(),
          width: dimensions.width,
          height: dimensions.height,
          background: { type: "solid", color: "#ffffff" },
          objects: [
            {
              id: newId(),
              type: "Textbox",
              kind: "text",
              name: "Paso 2",
              left: Math.round(dimensions.width / 2),
              top: Math.round(dimensions.height * 0.22),
              originX: "center",
              originY: "center",
              width: Math.round(dimensions.width * 0.8),
              height: 80,
              text: "2. El Framework",
              fontFamily: "Outfit",
              fontSize: isHorizontal ? 32 : isSquare ? 38 : 42,
              fontWeight: "bold",
              fill: "#0f172a",
              textAlign: "center",
            } as any,
            {
              id: newId(),
              type: "Textbox",
              kind: "text",
              name: "Contenido 2",
              left: Math.round(dimensions.width / 2),
              top: Math.round(dimensions.height * 0.46),
              originX: "center",
              originY: "center",
              width: Math.round(dimensions.width * 0.76),
              height: 160,
              text: "Crea un activo de valor concreto (Playbook o Plantilla) que resuelva un problema real en menos de 10 minutos.",
              fontFamily: "Inter",
              fontSize: isHorizontal ? 20 : isSquare ? 24 : 26,
              fontWeight: "normal",
              fill: "#475569",
              textAlign: "center",
              lineHeight: 1.4,
            } as any,
          ],
        } as any);

        blank.pages.push({
          id: newId(),
          width: dimensions.width,
          height: dimensions.height,
          background: { type: "solid", color: "#0f172a" },
          objects: [
            {
              id: newId(),
              type: "Textbox",
              kind: "text",
              name: "CTA",
              left: Math.round(dimensions.width / 2),
              top: Math.round(dimensions.height * 0.35),
              originX: "center",
              originY: "center",
              width: Math.round(dimensions.width * 0.82),
              height: 120,
              text: "¿Quieres este recurso?",
              fontFamily: "Outfit",
              fontSize: isHorizontal ? 36 : isSquare ? 44 : 48,
              fontWeight: "bold",
              fill: "#ffffff",
              textAlign: "center",
            } as any,
            {
              id: newId(),
              type: "Textbox",
              kind: "text",
              name: "CTA Sub",
              left: Math.round(dimensions.width / 2),
              top: Math.round(dimensions.height * 0.58),
              originX: "center",
              originY: "center",
              width: Math.round(dimensions.width * 0.78),
              height: 80,
              text: "Deja un comentario con la palabra clave y te lo enviamos directamente por mensaje privado.",
              fontFamily: "Inter",
              fontSize: isHorizontal ? 18 : isSquare ? 22 : 24,
              fontWeight: "normal",
              fill: "#94a3b8",
              textAlign: "center",
              lineHeight: 1.4,
            } as any,
          ],
        } as any);
      }
    }

    return blank;
  }, [docKey, initialTitle, initialSubtitle, mode]);

  // Create in-memory adapter con auto-persistencia en localStorage para que no se pierda al recargar (F5)
  const adapterPackage = useMemo(() => {
    const memory = createMemoryAdapter({
      saveDelayMs: 0,
      account: false,
    });

    const originalSave = memory.adapter.save;
    memory.adapter.save = async (input) => {
      const res = await originalSave(input);
      if (typeof window !== "undefined" && input?.document) {
        try {
          localStorage.setItem(
            DRAFT_STORAGE_KEY,
            JSON.stringify({
              document: input.document,
              aspectRatio,
              updatedAt: Date.now(),
            })
          );
        } catch (err) {
          console.warn("Fallo al guardar borrador en localStorage:", err);
        }
      }
      return res;
    };

    return memory;
  }, [docKey, aspectRatio]);

  // Handle ratio change among the 3 LinkedIn formats (estilo Canva: redimensionamiento inteligente que preserva todos los objetos)
  const handleChangeRatio = (newRatio: LinkedInAspectRatio) => {
    if (newRatio === aspectRatio) return;

    const targetSize = LINKEDIN_SIZES[newRatio];
    const engine = editorRef.current?.getEngine?.();

    if (engine && engine.pages?.resize) {
      // Canva-style smart resize: recalcula posiciones relativas y escala sin perder textos, imágenes ni formas
      engine.pages.resize(targetSize.width, targetSize.height, "magic", { scope: "all" });
      setAspectRatio(newRatio);

      if (typeof window !== "undefined") {
        try {
          const doc = engine.getDocument?.();
          if (doc) {
            localStorage.setItem(
              DRAFT_STORAGE_KEY,
              JSON.stringify({
                document: doc,
                aspectRatio: newRatio,
                updatedAt: Date.now(),
              })
            );
          }
        } catch {}
      }
    } else {
      setAspectRatio(newRatio);
    }
  };

  // Sincroniza el selector de proporción si el documento cambia de tamaño (por ejemplo al cargar una plantilla o usar deshacer)
  useEffect(() => {
    if (!isOpen) return;

    let isSubscribed = true;
    let cleanup: (() => void) | undefined;

    const timer = setTimeout(() => {
      const engine = editorRef.current?.getEngine?.();
      if (!engine?.store || !isSubscribed) return;

      cleanup = engine.store.subscribe((state: any) => {
        const page = state.doc?.pages?.[0];
        const w = page?.width ?? state.doc?.width;
        const h = page?.height ?? state.doc?.height;
        if (w && h) {
          const ratio = w / h;
          if (Math.abs(ratio - 1200 / 900) < 0.1 || Math.abs(ratio - 1200 / 627) < 0.1) {
            setAspectRatio("4:3");
          } else if (Math.abs(ratio - 1) < 0.1) {
            setAspectRatio("1:1");
          } else if (Math.abs(ratio - 1200 / 1500) < 0.1) {
            setAspectRatio("4:5");
          }
        }
      });
    }, 150);

    return () => {
      isSubscribed = false;
      clearTimeout(timer);
      cleanup?.();
    };
  }, [isOpen]);

  // Helper to extract high-res PNG data URL from active canvas
  const getRenderedImageDataUrl = useCallback((): string | null => {
    try {
      const engine = editorRef.current?.getEngine?.();
      if (!engine) {
        // Fallback: search document DOM canvas
        const canvasEl = document.querySelector(".canvas-container canvas, .doory-canvas-container canvas") as HTMLCanvasElement;
        if (canvasEl) return canvasEl.toDataURL("image/png");
        return null;
      }
      
      const activePageId = engine.state.activePageId;
      const view = engine.viewOf(activePageId);
      if (view?.canvas) {
        return view.canvas.toDataURL({
          format: "png",
          multiplier: 1,
          quality: 1,
        });
      }
      return null;
    } catch (err) {
      console.error("Error exporting rendered canvas:", err);
      return null;
    }
  }, []);

  // Helper to extract multi-page PDF for carousel
  const generateCarouselPdf = useCallback(async (): Promise<{ pdfDataUrl: string; pageCount: number; thumbnail: string } | null> => {
    try {
      const engine = editorRef.current?.getEngine?.();
      const rawDoc = editorRef.current?.getDocument?.() || null;
      if (!rawDoc || !rawDoc.pages || rawDoc.pages.length === 0) return null;

      const pdf = new jsPDF({
        orientation: dimensions.width > dimensions.height ? "landscape" : "portrait",
        unit: "px",
        format: [dimensions.width, dimensions.height],
        hotfixes: ["px_scaling"],
      });

      let thumbnail = "";

      for (let i = 0; i < rawDoc.pages.length; i++) {
        const page = rawDoc.pages[i];
        let pageDataUrl: string | null = null;

        if (engine) {
          try {
            const view = engine.viewOf(page.id);
            if (view?.canvas) {
              pageDataUrl = view.canvas.toDataURL({
                format: "jpeg",
                quality: 0.92,
              });
            }
          } catch {}
        }

        if (!pageDataUrl) {
          const fallback = getRenderedImageDataUrl();
          if (fallback) pageDataUrl = fallback;
        }

        if (pageDataUrl) {
          if (i === 0) {
            thumbnail = pageDataUrl;
          }
          if (i > 0) {
            pdf.addPage([dimensions.width, dimensions.height]);
          }
          pdf.addImage(pageDataUrl, "JPEG", 0, 0, dimensions.width, dimensions.height);
        }
      }

      const pdfDataUrl = pdf.output("datauristring");
      return {
        pdfDataUrl,
        pageCount: rawDoc.pages.length,
        thumbnail: thumbnail || (getRenderedImageDataUrl() || ""),
      };
    } catch (err) {
      console.error("[VisualStudio] Error generando carrusel PDF:", err);
      return null;
    }
  }, [dimensions, getRenderedImageDataUrl]);

  // Handle Apply to LinkedIn Post (Single Image or Carousel PDF)
  const handleApplyToPost = useCallback(async () => {
    setIsExporting(true);
    try {
      if (mode === "carousel" && onApplyCarousel) {
        const result = await generateCarouselPdf();
        if (result) {
          if (typeof window !== "undefined") {
            localStorage.removeItem(DRAFT_STORAGE_KEY);
          }
          onApplyCarousel(result);
          onClose();
          return;
        } else {
          alert("No se pudo generar el carrusel en PDF. Por favor intenta de nuevo.");
        }
      } else {
        const dataUrl = getRenderedImageDataUrl();
        if (dataUrl && onApplyImage) {
          if (typeof window !== "undefined") {
            localStorage.removeItem(DRAFT_STORAGE_KEY);
          }
          onApplyImage(dataUrl);
          onClose();
          return;
        } else {
          alert("No se pudo exportar la imagen. Por favor intenta de nuevo.");
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsExporting(false);
    }
  }, [mode, onApplyCarousel, onApplyImage, generateCarouselPdf, getRenderedImageDataUrl, onClose]);

  // Handle Direct Download PDF
  const handleDownloadPdf = useCallback(async () => {
    setIsExporting(true);
    try {
      const result = await generateCarouselPdf();
      if (result) {
        const a = document.createElement("a");
        a.href = result.pdfDataUrl;
        const ratioSlug = aspectRatio === "4:5" ? "vertical-4x5" : aspectRatio === "1:1" ? "cuadrada-1x1" : "horizontal-191x1";
        a.download = `inhubflow-carrusel-${ratioSlug}-${result.pageCount}paginas-${Date.now()}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
    } catch (err) {
      console.error("Error al descargar PDF:", err);
    } finally {
      setIsExporting(false);
    }
  }, [generateCarouselPdf, aspectRatio]);

  // Handle Direct Download PNG
  const handleDownloadPng = useCallback(() => {
    const dataUrl = getRenderedImageDataUrl();
    if (!dataUrl) return;
    const a = document.createElement("a");
    a.href = dataUrl;
    const ratioSlug = aspectRatio === "4:5" ? "vertical-4x5" : aspectRatio === "1:1" ? "cuadrada-1x1" : "horizontal-191x1";
    a.download = `inhubflow-post-${ratioSlug}-${dimensions.width}x${dimensions.height}-${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }, [getRenderedImageDataUrl, aspectRatio, dimensions]);

  // Handle Open Save Global Template Modal (Strictly Super Admin)
  const handleOpenSaveGlobalModal = useCallback(async (specificPageId?: string, forcedMode?: "split" | "single" | "all") => {
    const thumb = getRenderedImageDataUrl();
    const rawDoc = editorRef.current?.getDocument?.() || null;
    const engine = editorRef.current?.getEngine?.();

    // Capturar thumbnails de todas las páginas del documento para la vista previa por página
    const perPageThumbs: Record<string, string> = {};
    if (engine && rawDoc?.pages) {
      for (const page of rawDoc.pages) {
        try {
          const view = engine.viewOf(page.id);
          if (view?.canvas) {
            perPageThumbs[page.id] = view.canvas.toDataURL({
              format: "png",
              multiplier: 0.5,
              quality: 0.85,
            });
          }
        } catch (err) {
          console.warn("[VisualStudio] Fallo al generar thumbnail de página:", page.id, err);
        }
      }
    }

    let portableDoc = rawDoc;
    if (rawDoc) {
      try {
        const cloned = structuredClone(rawDoc);
        const toDataUrl = async (url: string): Promise<string> => {
          const resolved = url.startsWith("idb://")
            ? await adapterPackage.adapter.resolveSrc(url)
            : url;
          if (!resolved.startsWith("blob:")) return resolved;
          const res = await fetch(resolved);
          const blob = await res.blob();
          return await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(typeof reader.result === "string" ? reader.result : resolved);
            reader.onerror = () => reject(reader.error);
            reader.readAsDataURL(blob);
          });
        };

        const resolveObjectUrls = async (obj: any): Promise<void> => {
          if (obj && typeof obj.src === "string" && (obj.src.startsWith("idb://") || obj.src.startsWith("blob:"))) {
            obj.src = await toDataUrl(obj.src);
          }
          if (Array.isArray(obj?.objects)) {
            for (const child of obj.objects) await resolveObjectUrls(child);
          }
        };

        for (const page of cloned.pages || []) {
          if (page.background?.type === "image" && typeof page.background.src === "string") {
            if (page.background.src.startsWith("idb://") || page.background.src.startsWith("blob:")) {
              page.background.src = await toDataUrl(page.background.src);
            }
          }
          for (const obj of page.objects || []) {
            await resolveObjectUrls(obj);
          }
        }
        portableDoc = cloned;
      } catch (err) {
        console.warn("[VisualStudio] No se pudieron incrustar recursos locales en la plantilla:", err);
      }
    }

    const activeId = specificPageId || engine?.state?.activePageId || rawDoc?.pages?.[0]?.id;
    setTargetPageId(activeId);
    setPageThumbnails(perPageThumbs);
    setInitialSaveMode(forcedMode || ((rawDoc?.pages?.length || 0) > 1 ? "split" : "single"));
    setPreviewThumbnail(thumb || (activeId && perPageThumbs[activeId]) || null);
    setDocSnapshot(portableDoc);
    setIsSaveGlobalModalOpen(true);
  }, [getRenderedImageDataUrl, adapterPackage]);

  // Listener para eventos de guardado rápido de página individual desde el header del artboard
  useEffect(() => {
    const handlePageTemplateEvent = (e: Event) => {
      const customEvt = e as CustomEvent<{ pageId?: string; mode?: "split" | "single" | "all" }>;
      handleOpenSaveGlobalModal(customEvt.detail?.pageId, customEvt.detail?.mode || "single");
    };
    window.addEventListener("inhubflow:open-save-page-template", handlePageTemplateEvent);
    return () => {
      window.removeEventListener("inhubflow:open-save-page-template", handlePageTemplateEvent);
    };
  }, [handleOpenSaveGlobalModal]);

  if (!isOpen) return null;

  // Custom unified topbar start: Icono de InHubFlow + Switcher de 3 Formatos Principales de LinkedIn
  const topBarStart = (
    <div className="flex items-center gap-2.5 pr-2.5 mr-1 border-r border-slate-200">
      <div className="flex items-center justify-center" title="InHubFlow Social Selling Suite">
        <img
          src="/images/logo/inhubflow-icon-dark.png"
          alt="InHubFlow"
          className="h-7 w-7 object-contain hover:scale-105 transition-transform"
        />
      </div>

      {/* Switcher de los 3 Tamaños Principales de LinkedIn: Horizontal, Cuadrada, Vertical */}
      <div className="inline-flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs">
        {/* Horizontal: 1200 x 900 px (4:3) */}
        <button
          type="button"
          onClick={() => handleChangeRatio("4:3")}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md font-medium whitespace-nowrap transition-all ${
            aspectRatio === "4:3" || aspectRatio === "1.91:1"
              ? "bg-[#0099ff] text-white shadow-sm"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
          }`}
          title="Imagen de Publicación (Horizontal) — 1200 × 900 px · 4:3 · PNG/JPEG"
        >
          <RectangleHorizontal size={13} />
          <span>Horizontal</span>
          <span className="text-[10px] opacity-75 hidden xl:inline font-mono">4:3</span>
        </button>

        {/* Cuadrada: 1200 x 1200 px (1:1) */}
        <button
          type="button"
          onClick={() => handleChangeRatio("1:1")}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md font-medium whitespace-nowrap transition-all ${
            aspectRatio === "1:1"
              ? "bg-[#0099ff] text-white shadow-sm"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
          }`}
          title="Imagen de Publicación (Cuadrada) — 1200 × 1200 px · 1:1 · PNG/JPEG"
        >
          <SquareIcon size={12} />
          <span>Cuadrada</span>
          <span className="text-[10px] opacity-75 hidden xl:inline font-mono">1:1</span>
        </button>

        {/* Vertical: 1200 x 1500 px (4:5) */}
        <button
          type="button"
          onClick={() => handleChangeRatio("4:5")}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md font-medium whitespace-nowrap transition-all ${
            aspectRatio === "4:5"
              ? "bg-[#0099ff] text-white shadow-sm"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
          }`}
          title="Imagen de Publicación (Vertical) — 1200 × 1500 px · 4:5 · PNG/JPEG"
        >
          <Smartphone size={12} />
          <span>Vertical</span>
          <span className="text-[10px] opacity-75 hidden xl:inline font-mono">4:5</span>
        </button>
      </div>
    </div>
  );

  // TopBar Actions: Botón Guardar Plantilla Global (Solo Super Admin) + Aplicar al Post
  const topBarAction = (
    <div className="flex items-center gap-2">
      {/* Botón exclusivo visible ÚNICAMENTE para Super Admin */}
      {isSuperAdmin && (
        <button
          type="button"
          onClick={handleOpenSaveGlobalModal}
          disabled={isExporting}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white shadow-sm shadow-emerald-600/20 transition-all active:scale-95 disabled:opacity-50"
          title="Guardar diseño actual como plantilla global para toda la plataforma (Solo Super Admin)"
        >
          <BookmarkPlus size={14} />
          <span>Guardar Plantilla Global</span>
        </button>
      )}

      {/* Botón de Descarga Directa (PNG o PDF) */}
      <button
        type="button"
        onClick={mode === "carousel" ? handleDownloadPdf : handleDownloadPng}
        disabled={isExporting}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 transition-all active:scale-95 disabled:opacity-50"
        title={mode === "carousel" ? "Descargar documento PDF del carrusel" : "Descargar imagen PNG en alta resolución"}
      >
        <Download size={14} />
        <span>{mode === "carousel" ? "Descargar PDF" : "Descargar PNG"}</span>
      </button>

      {/* Acción principal: "Aplicar al Post" */}
      <button
        type="button"
        onClick={handleApplyToPost}
        disabled={isExporting}
        className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold bg-[#0099ff] hover:bg-[#0082db] active:bg-[#006bb8] text-white shadow-sm shadow-blue-500/20 transition-all active:scale-95 disabled:opacity-50"
      >
        {isExporting ? (
          <Loader2 size={14} className="animate-spin" />
        ) : (
          <Check size={14} />
        )}
        <span>{mode === "carousel" ? "Aplicar Carrusel (PDF)" : "Aplicar al Post"}</span>
      </button>
    </div>
  );

  // Fin de la barra: Separador y botón de cierre (después de Share)
  const topBarEnd = (
    <div className="flex items-center">
      <div className="h-4 w-px bg-slate-200 ml-1 mr-2" />
      <button
        type="button"
        onClick={onClose}
        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
        title="Cerrar estudio"
      >
        <X size={18} />
      </button>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[99999] flex flex-col bg-[#d0d5dd] select-none overflow-hidden animate-fadeIn">
      {/* Área de Visual Studio — TopBar unificado */}
      <main className="flex-1 relative w-full h-full overflow-hidden visual-studio-modal-container">
        <EditorApp
          key={`visual-studio-${docKey}`}
          ref={editorRef}
          document={initialDoc}
          meta={{
            id: `inhubflow-design-${docKey}`,
            title: initialTitle || "Diseño Social InHubFlow",
            mode: "guest",
            postTitle: initialTitle,
            postSubtitle: initialSubtitle,
            postHighlight: initialHighlight,
            authorName: authorName,
            authorHandle: authorHandle,
          }}
          adapter={adapterPackage.adapter}
          topBarStart={topBarStart}
          topBarAction={topBarAction}
          topBarEnd={topBarEnd}
          showTitle={false}
        />
      </main>

      {/* Modal para Guardar Plantilla Global (Exclusivo Super Admin) */}
      {isSuperAdmin && (
        <SaveGlobalTemplateModal
          isOpen={isSaveGlobalModalOpen}
          onClose={() => setIsSaveGlobalModalOpen(false)}
          document={docSnapshot}
          thumbnailUrl={previewThumbnail}
          dimensions={dimensions}
          aspectRatio={aspectRatio}
          authorName={currentUser?.name || "Super Admin"}
          pageThumbnails={pageThumbnails}
          activePageId={targetPageId}
          initialMode={initialSaveMode}
          onSuccess={(templateTitle) => {
            console.log(`[VisualStudio] ¡Plantilla global guardada con éxito!: ${templateTitle}`);
          }}
        />
      )}
    </div>
  );
}
