"use client";

import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { 
  X, 
  Check, 
  Smartphone, 
  Square as SquareIcon, 
  RectangleHorizontal,
  Loader2,
  BookmarkPlus 
} from "lucide-react";
import "@doory/styles/tokens.css";
import { initContrast } from "@doory/lib/contrast";
import { EditorApp } from "@doory/editor/EditorApp";
import type { EditorHandle } from "@doory/types/adapter";
import type { DoryDocument } from "@doory/types/document";
import { createMemoryAdapter } from "@doory/editor/dev/memoryAdapter";
import { createBlankDemo } from "@doory/editor/dev/demoDocument";
import { newId } from "@doory/lib/document";
import { useAuth } from "@/context/AuthContext";
import SaveGlobalTemplateModal from "./SaveGlobalTemplateModal";

export type LinkedInAspectRatio = "4:5" | "1:1" | "1.91:1";

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
  "1.91:1": {
    ratio: "1.91:1",
    label: "Horizontal",
    name: "Imagen de Publicación (Horizontal)",
    width: 1200,
    height: 627,
    ratioText: "1.91:1",
    format: "PNG/JPEG",
    description: "1200 × 627 px · 1.91:1 · Formato panorámico para desktop y artículos",
  },
};

export interface DooryStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTitle?: string;
  initialSubtitle?: string;
  initialCategory?: string;
  initialMetric?: string;
  authorName?: string;
  authorHandle?: string;
  authorAvatar?: string;
  onApplyImage?: (dataUrl: string) => void;
}

export default function DooryStudioModal({
  isOpen,
  onClose,
  initialTitle,
  initialSubtitle,
  authorName,
  authorHandle,
  onApplyImage,
}: DooryStudioModalProps) {
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

  // Initialize Doory contrast tokens once on mount
  useEffect(() => {
    initContrast();
  }, []);

  // Sincronización en memoria de gancho y subtítulo, e inyección de Google Fonts para Font Pairings
  useEffect(() => {
    if (typeof window !== "undefined") {
      if (initialTitle) sessionStorage.setItem("inhubflow_active_post_hook", initialTitle);
      if (initialSubtitle) sessionStorage.setItem("inhubflow_active_post_intro", initialSubtitle);
    }
    if (typeof document !== "undefined") {
      const fontLinkId = "inhubflow-doory-fonts";
      if (!document.getElementById(fontLinkId)) {
        const link = document.createElement("link");
        link.id = fontLinkId;
        link.rel = "stylesheet";
        link.href =
          "https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Cormorant+Garamond:wght@400;600;700&family=DM+Sans:wght@400;500;700&family=Inter:wght@400;600;700&family=Lato:wght@400;700&family=Lora:wght@400;700&family=Montserrat:wght@400;600;800&family=Open+Sans:wght@400;600&family=Outfit:wght@400;600;700;800&family=Pacifico&family=Playfair+Display:wght@400;700&family=Plus+Jakarta+Sans:wght@400;600;700&family=Poppins:wght@400;600&family=Roboto:wght@400;500;700&display=swap";
        document.head.appendChild(link);
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
      const isHorizontal = aspectRatio === "1.91:1";
      const isSquare = aspectRatio === "1:1";

      page.objects.push({
        id: headingId,
        kind: "text",
        name: "Título del Post",
        x: Math.round(dimensions.width * 0.1),
        y: Math.round(dimensions.height * (isHorizontal ? 0.22 : isSquare ? 0.24 : 0.26)),
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
        align: "center",
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
          kind: "text",
          name: "Subtítulo",
          x: Math.round(dimensions.width * 0.12),
          y: Math.round(dimensions.height * (isHorizontal ? 0.50 : isSquare ? 0.44 : 0.42)),
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
          align: "center",
          lineHeight: 1.35,
          letterSpacing: 0,
          textTransform: "none",
          listStyle: "none",
          curveAmount: 0,
          autoFit: false,
          effects: null,
        } as any);
      }
    }

    return blank;
  }, [docKey, initialTitle, initialSubtitle]);

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
          if (Math.abs(ratio - 1200 / 627) < 0.1) {
            setAspectRatio("1.91:1");
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
        const canvasEl = document.querySelector(".doory-canvas-container canvas") as HTMLCanvasElement;
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

  // Handle Apply to LinkedIn Post
  const handleApplyToPost = useCallback(() => {
    setIsExporting(true);
    try {
      const dataUrl = getRenderedImageDataUrl();
      if (dataUrl && onApplyImage) {
        if (typeof window !== "undefined") {
          localStorage.removeItem(DRAFT_STORAGE_KEY);
        }
        onApplyImage(dataUrl);
        onClose();
      } else {
        alert("No se pudo exportar la imagen. Por favor intenta de nuevo.");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsExporting(false);
    }
  }, [getRenderedImageDataUrl, onApplyImage, onClose]);

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
  const handleOpenSaveGlobalModal = useCallback(() => {
    const thumb = getRenderedImageDataUrl();
    const doc = editorRef.current?.getDocument?.() || null;
    setPreviewThumbnail(thumb);
    setDocSnapshot(doc);
    setIsSaveGlobalModalOpen(true);
  }, [getRenderedImageDataUrl]);

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
        {/* Horizontal: 1200 x 627 px (1.91:1) */}
        <button
          type="button"
          onClick={() => handleChangeRatio("1.91:1")}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md font-medium whitespace-nowrap transition-all ${
            aspectRatio === "1.91:1"
              ? "bg-[#0099ff] text-white shadow-sm"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
          }`}
          title="Imagen de Publicación (Horizontal) — 1200 × 627 px · 1.91:1 · PNG/JPEG"
        >
          <RectangleHorizontal size={13} />
          <span>Horizontal</span>
          <span className="text-[10px] opacity-75 hidden xl:inline font-mono">1.91:1</span>
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
        <span>Aplicar al Post</span>
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
      {/* Área del Editor Doory — TopBar unificado */}
      <main className="flex-1 relative w-full h-full overflow-hidden doory-modal-container">
        <EditorApp
          key={`doory-${docKey}`}
          ref={editorRef}
          document={initialDoc}
          meta={{
            id: `inhubflow-design-${docKey}`,
            title: initialTitle || "Diseño Social InHubFlow",
            mode: "guest",
            postTitle: initialTitle,
            postSubtitle: initialSubtitle,
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
          onSuccess={(templateTitle) => {
            console.log(`[DooryStudio] ¡Plantilla global guardada con éxito!: ${templateTitle}`);
          }}
        />
      )}
    </div>
  );
}
