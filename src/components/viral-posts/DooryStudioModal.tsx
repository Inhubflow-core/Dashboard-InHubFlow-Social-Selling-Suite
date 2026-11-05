"use client";

import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { 
  X, 
  Check, 
  Sparkles, 
  Download, 
  Ratio, 
  Smartphone, 
  Square as SquareIcon, 
  Loader2,
  ExternalLink
} from "lucide-react";
import "@doory/styles/tokens.css";
import { initContrast } from "@doory/lib/contrast";
import { EditorApp } from "@doory/editor/EditorApp";
import type { EditorHandle } from "@doory/types/adapter";
import type { DoryDocument } from "@doory/types/document";
import { createMemoryAdapter } from "@doory/editor/dev/memoryAdapter";
import { createBlankDemo } from "@doory/editor/dev/demoDocument";
import { newId } from "@doory/lib/document";

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
  const editorRef = useRef<EditorHandle>(null);
  const [aspectRatio, setAspectRatio] = useState<"4:5" | "1:1">("4:5");
  const [isExporting, setIsExporting] = useState(false);
  const [docKey, setDocKey] = useState(0);

  // Initialize Doory contrast tokens once on mount
  useEffect(() => {
    initContrast();
  }, []);

  // Compute dimensions
  const dimensions = useMemo(() => {
    if (aspectRatio === "4:5") {
      return { width: 1080, height: 1350 };
    }
    return { width: 1080, height: 1080 };
  }, [aspectRatio]);

  // Create initial document
  const initialDoc = useMemo<DoryDocument>(() => {
    const blank = createBlankDemo(dimensions.width, dimensions.height);
    
    // If we have an initial title, add a clean initial heading object
    if (initialTitle && blank.pages[0]) {
      const page = blank.pages[0];
      const headingId = newId();
      page.objects.push({
        id: headingId,
        kind: "text",
        name: "Título del Post",
        x: Math.round(dimensions.width * 0.1),
        y: Math.round(dimensions.height * 0.25),
        width: Math.round(dimensions.width * 0.8),
        height: 160,
        rotation: 0,
        flipX: false,
        flipY: false,
        opacity: 1,
        locked: false,
        text: initialTitle,
        fontFamily: "Inter",
        fontSize: 54,
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
          y: Math.round(dimensions.height * 0.42),
          width: Math.round(dimensions.width * 0.76),
          height: 100,
          rotation: 0,
          flipX: false,
          flipY: false,
          opacity: 0.9,
          locked: false,
          text: initialSubtitle,
          fontFamily: "Inter",
          fontSize: 32,
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
  }, [dimensions, initialTitle, initialSubtitle, docKey]);

  // Create in-memory adapter
  const adapterPackage = useMemo(() => {
    return createMemoryAdapter({
      saveDelayMs: 0,
      account: true,
    });
  }, [docKey]);

  // Handle ratio change
  const handleChangeRatio = (newRatio: "4:5" | "1:1") => {
    if (newRatio === aspectRatio) return;
    setAspectRatio(newRatio);
    setDocKey((k) => k + 1);
  };

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
    a.download = `inhubflow-post-${aspectRatio === "4:5" ? "vertical-4x5" : "cuadrado-1x1"}-${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }, [getRenderedImageDataUrl, aspectRatio]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[99999] flex flex-col bg-[#0b0f19] text-slate-100 select-none overflow-hidden animate-fadeIn">
      {/* Barra de Navegación Superior InHubFlow */}
      <header className="h-14 bg-[#0f172a] border-b border-slate-800 px-4 flex items-center justify-between shrink-0 shadow-md">
        {/* Izquierda: Marca y Selector de Formato */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 via-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-sm">
              <Sparkles size={18} />
            </div>
            <div>
              <span className="font-bold text-sm tracking-tight text-white block leading-none">
                Estudio Gráfico InHubFlow
              </span>
              <span className="text-[10px] text-slate-400 font-mono tracking-wider">
                DOORY CANVAS ENGINE v7
              </span>
            </div>
          </div>

          <div className="h-5 w-px bg-slate-800 hidden sm:block" />

          {/* Switcher 4:5 vs 1:1 */}
          <div className="inline-flex items-center bg-slate-900/90 p-0.5 rounded-lg border border-slate-700/60 text-xs">
            <button
              type="button"
              onClick={() => handleChangeRatio("4:5")}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md font-medium transition-all ${
                aspectRatio === "4:5"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Smartphone size={13} />
              <span>Vertical 4:5</span>
            </button>
            <button
              type="button"
              onClick={() => handleChangeRatio("1:1")}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md font-medium transition-all ${
                aspectRatio === "1:1"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <SquareIcon size={13} />
              <span>Cuadrado 1:1</span>
            </button>
          </div>
        </div>

        {/* Centro: Atribución legal de Doory */}
        <div className="hidden lg:flex items-center gap-1.5 text-xs text-slate-400 bg-slate-900/60 px-3 py-1 rounded-full border border-slate-800">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Motor gráfico: </span>
          <a
            href="https://github.com/shaongitbd/doory"
            target="_blank"
            rel="noopener noreferrer"
            className="text-indigo-400 hover:text-indigo-300 font-medium underline inline-flex items-center gap-0.5"
          >
            Doory (by Siam)
            <ExternalLink size={10} />
          </a>
        </div>

        {/* Derecha: Botones de Acción */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleDownloadPng}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
            title="Descargar lámina en alta resolución PNG"
          >
            <Download size={14} />
            <span className="hidden sm:inline">Descargar PNG</span>
          </button>

          <button
            type="button"
            onClick={handleApplyToPost}
            disabled={isExporting}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-md shadow-blue-500/20 transition-all active:scale-95 disabled:opacity-50"
          >
            {isExporting ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Check size={14} />
            )}
            <span>Aplicar al Post</span>
          </button>

          <div className="h-5 w-px bg-slate-800" />

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Cerrar estudio"
          >
            <X size={18} />
          </button>
        </div>
      </header>

      {/* Área del Editor Doory (100% Pantalla) */}
      <main className="flex-1 relative w-full h-[calc(100vh-56px)] overflow-hidden doory-modal-container">
        <EditorApp
          key={`doory-${docKey}-${aspectRatio}`}
          ref={editorRef}
          document={initialDoc}
          meta={{
            id: `inhubflow-design-${docKey}`,
            title: initialTitle || "Diseño Social InHubFlow",
            mode: "guest",
          }}
          adapter={adapterPackage.adapter}
        />
      </main>
    </div>
  );
}
