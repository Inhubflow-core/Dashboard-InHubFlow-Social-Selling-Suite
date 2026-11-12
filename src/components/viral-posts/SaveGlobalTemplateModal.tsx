"use client";

import React, { useState } from "react";
import { 
  X, 
  BookmarkCheck, 
  Sparkles, 
  Loader2, 
  Layers, 
  Tag as TagIcon, 
  FolderPlus,
  ShieldCheck,
  CheckCircle2,
  FileText,
  CopyCheck,
  SlidersHorizontal,
  Check
} from "lucide-react";
import type { DoryDocument } from "@visual-studio/types/document";

interface SaveGlobalTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  document: DoryDocument | null;
  thumbnailUrl: string | null;
  dimensions: { width: number; height: number };
  aspectRatio: "4:5" | "1:1" | "4:3" | "1.91:1";
  authorName?: string;
  onSuccess?: (templateTitle: string) => void;
  pageThumbnails?: Record<string, string>;
  activePageId?: string;
  initialMode?: "split" | "single" | "all";
}

const CATEGORIES = [
  { slug: "thought-leadership", name: "Autoridad & Thought Leadership" },
  { slug: "verticals-carousels", name: "Carruseles & Slides Verticales" },
  { slug: "launches-offers", name: "Lanzamientos & Ofertas B2B" },
  { slug: "debates-questions", name: "Preguntas, Encuestas & Debates" },
  { slug: "frameworks-tips", name: "Consejos, Pasos & Frameworks" },
  { slug: "quotes-impact", name: "Citas & Frases de Impacto" },
  { slug: "general", name: "General B2B" },
];

export default function SaveGlobalTemplateModal({
  isOpen,
  onClose,
  document,
  thumbnailUrl,
  dimensions,
  aspectRatio,
  authorName,
  onSuccess,
  pageThumbnails = {},
  activePageId,
  initialMode,
}: SaveGlobalTemplateModalProps) {
  const totalPages = document?.pages?.length || 1;

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("thought-leadership");
  const [customCategory, setCustomCategory] = useState("");
  const [isCustomCategory, setIsCustomCategory] = useState(false);
  const [tagsInput, setTagsInput] = useState("b2b, linkedin, post");
  const [isFeatured, setIsFeatured] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Modos de guardado para documentos multipágina:
  // 'split'  = Guardar cada página por separado (N plantillas individuales)
  // 'single' = Guardar únicamente la página activa
  // 'all'    = Guardar como un solo carrusel completo con todas las páginas
  const [saveMode, setSaveMode] = useState<"split" | "single" | "all">(
    totalPages > 1 ? initialMode || "split" : "single"
  );

  const [selectedPages, setSelectedPages] = useState<string[]>(
    () => document?.pages?.map((p) => p.id) || []
  );

  const [targetSinglePageId, setTargetSinglePageId] = useState<string>(
    activePageId || document?.pages?.[0]?.id || ""
  );

  const [savingProgress, setSavingProgress] = useState<{
    current: number;
    total: number;
    title: string;
  } | null>(null);

  const [savedCount, setSavedCount] = useState<number>(1);

  if (!isOpen) return null;

  const togglePage = (id: string) => {
    setSelectedPages((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (!document?.pages) return;
    if (selectedPages.length === document.pages.length) {
      setSelectedPages([]);
    } else {
      setSelectedPages(document.pages.map((p) => p.id));
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError("Por favor ingresa un título para la plantilla global.");
      return;
    }

    if (!document || !document.pages || document.pages.length === 0) {
      setError("El documento de diseño no es válido.");
      return;
    }

    setIsSaving(true);
    setError(null);

    const selectedCat = CATEGORIES.find((c) => c.slug === category);
    const finalCategorySlug = isCustomCategory ? customCategory.toLowerCase().replace(/[^a-z0-9]+/g, "-") : category;
    const finalCategoryName = isCustomCategory ? customCategory : (selectedCat?.name || "General B2B");

    const tags = tagsInput
      .split(",")
      .map((t) => t.trim().toLowerCase())
      .filter((t) => t.length > 0);

    try {
      // 1. MODO: Guardar cada página por separado (Múltiples plantillas independientes)
      if (saveMode === "split" && totalPages > 1) {
        const pagesToSave = document.pages.filter((p) => selectedPages.includes(p.id));
        if (pagesToSave.length === 0) {
          setError("Selecciona al menos una página para guardar.");
          setIsSaving(false);
          return;
        }

        let successCount = 0;
        for (let i = 0; i < pagesToSave.length; i++) {
          const page = pagesToSave[i];
          const pageIdx = document.pages.indexOf(page);
          const pageName = page.name?.trim() || `Modelo ${pageIdx + 1}`;
          const finalItemTitle = pagesToSave.length > 1
            ? `${title.trim()} - ${pageName}`
            : title.trim();

          setSavingProgress({
            current: i + 1,
            total: pagesToSave.length,
            title: finalItemTitle,
          });

          const singleDoc: DoryDocument = {
            ...document,
            pages: [page],
          };

          const pageThumb = pageThumbnails[page.id] || thumbnailUrl || null;

          const response = await fetch("/api/templates", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              title: finalItemTitle,
              category: finalCategorySlug,
              categoryName: finalCategoryName,
              tags: tags.length > 0 ? tags : ["b2b", "plantilla"],
              width: dimensions.width,
              height: dimensions.height,
              orientation: aspectRatio === "4:5" ? "portrait" : aspectRatio === "1:1" ? "square" : "landscape",
              thumbnailUrl: pageThumb,
              document: singleDoc,
              createdBy: authorName || "Super Admin",
              isFeatured,
            }),
          });

          if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            console.warn(`[SaveGlobalTemplate] Error guardando página ${page.id}:`, errData);
          } else {
            successCount++;
          }
        }

        setSavedCount(successCount);
        setSavedSuccess(true);
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("inhubflow:templates-updated"));
        }

        setTimeout(() => {
          if (onSuccess) onSuccess(`${title.trim()} (${successCount} plantillas)`);
          onClose();
          setSavedSuccess(false);
          setTitle("");
          setSavingProgress(null);
        }, 1500);
        return;
      }

      // 2. MODO: Guardar solo la página activa
      if (saveMode === "single" && totalPages > 1) {
        const page = document.pages.find((p) => p.id === targetSinglePageId) || document.pages[0];
        const pageThumb = pageThumbnails[page.id] || thumbnailUrl || null;
        const singleDoc: DoryDocument = {
          ...document,
          pages: [page],
        };

        const response = await fetch("/api/templates", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: title.trim(),
            category: finalCategorySlug,
            categoryName: finalCategoryName,
            tags: tags.length > 0 ? tags : ["b2b", "plantilla"],
            width: dimensions.width,
            height: dimensions.height,
            orientation: aspectRatio === "4:5" ? "portrait" : aspectRatio === "1:1" ? "square" : "landscape",
            thumbnailUrl: pageThumb,
            document: singleDoc,
            createdBy: authorName || "Super Admin",
            isFeatured,
          }),
        });

        const resData = await response.json();
        if (!response.ok) {
          throw new Error(resData.error || "Error al guardar la plantilla.");
        }

        setSavedCount(1);
        setSavedSuccess(true);
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("inhubflow:templates-updated"));
        }

        setTimeout(() => {
          if (onSuccess) onSuccess(title.trim());
          onClose();
          setSavedSuccess(false);
          setTitle("");
        }, 1200);
        return;
      }

      // 3. MODO: Guardar carrusel completo / documento estándar
      const response = await fetch("/api/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          category: finalCategorySlug,
          categoryName: finalCategoryName,
          tags: tags.length > 0 ? tags : ["b2b", "plantilla"],
          width: dimensions.width,
          height: dimensions.height,
          orientation: aspectRatio === "4:5" ? "portrait" : aspectRatio === "1:1" ? "square" : "landscape",
          thumbnailUrl: thumbnailUrl || null,
          document,
          createdBy: authorName || "Super Admin",
          isFeatured,
        }),
      });

      const resData = await response.json();
      if (!response.ok) {
        throw new Error(resData.error || "Error al guardar la plantilla en la base de datos.");
      }

      setSavedCount(1);
      setSavedSuccess(true);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("inhubflow:templates-updated"));
      }

      setTimeout(() => {
        if (onSuccess) onSuccess(title.trim());
        onClose();
        setSavedSuccess(false);
        setTitle("");
      }, 1200);
    } catch (err: any) {
      console.error("[SaveGlobalTemplate] Error:", err);
      setError(err.message || "Ocurrió un error inesperado al guardar la plantilla.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div 
        className="bg-white rounded-2xl shadow-2xl border border-slate-200/80 w-full max-w-2xl max-h-[92vh] overflow-hidden flex flex-col transform transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header con insignia Super Admin */}
        <div className="px-6 py-4 bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 text-white flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-white/15 rounded-xl backdrop-blur-md">
              <ShieldCheck size={20} className="text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold tracking-tight">Guardar como Plantilla Global</h3>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-400 text-emerald-950 shadow-sm">
                  Super Admin
                </span>
              </div>
              <p className="text-xs text-emerald-100/90 font-medium">
                Disponible inmediatamente para todos los clientes en el Editor Visual
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {savedSuccess ? (
          <div className="p-10 flex flex-col items-center justify-center text-center animate-fadeIn">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mb-4">
              <CheckCircle2 size={36} />
            </div>
            <h4 className="text-lg font-bold text-slate-800">
              {savedCount > 1
                ? `¡${savedCount} Plantillas Globales Publicadas!`
                : "¡Plantilla Global Publicada!"}
            </h4>
            <p className="text-sm text-slate-500 max-w-sm mt-1">
              {savedCount > 1
                ? "Cada página se guardó como una plantilla independiente. Ya están disponibles en la pestaña 'Plantillas' para todos los clientes."
                : "Todos los clientes ya pueden ver y utilizar esta plantilla en la pestaña 'Plantillas' del Editor Visual."}
            </p>
          </div>
        ) : (
          <form onSubmit={handleSave} className="p-6 space-y-4 overflow-y-auto flex-1">
            {error && (
              <div className="p-3 text-xs font-medium rounded-lg bg-red-50 text-red-700 border border-red-200 flex items-center gap-2">
                <span>{error}</span>
              </div>
            )}

            {/* SECCIÓN MULTIPÁGINA: ¿Cómo guardar las páginas? */}
            {totalPages > 1 && (
              <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-50/80 to-teal-50/50 border border-emerald-200/90 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                    <Layers size={15} className="text-emerald-600" />
                    Diseño con {totalPages} páginas detectadas:
                  </span>
                  <span className="text-[11px] font-semibold text-emerald-700 bg-white px-2 py-0.5 rounded-full border border-emerald-200">
                    {totalPages} modelos
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {/* Opción 1: 1 por 1 separadas */}
                  <button
                    type="button"
                    onClick={() => setSaveMode("split")}
                    className={`p-3 rounded-xl border text-left flex flex-col gap-1 transition-all ${
                      saveMode === "split"
                        ? "bg-white border-emerald-600 shadow-md ring-2 ring-emerald-500/20 text-emerald-950"
                        : "bg-white/60 border-slate-200 hover:bg-white text-slate-700"
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="font-bold text-xs flex items-center gap-1">
                        <CopyCheck size={13} className="text-emerald-600" />
                        1 por 1 por separado
                      </span>
                      <span className="text-[9px] px-1.5 py-0.5 bg-emerald-100 text-emerald-800 rounded font-bold uppercase">
                        Ideal
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-tight">
                      Crea {selectedPages.length} plantillas globales independientes en la biblioteca.
                    </p>
                  </button>

                  {/* Opción 2: Solo la página actual */}
                  <button
                    type="button"
                    onClick={() => setSaveMode("single")}
                    className={`p-3 rounded-xl border text-left flex flex-col gap-1 transition-all ${
                      saveMode === "single"
                        ? "bg-white border-emerald-600 shadow-md ring-2 ring-emerald-500/20 text-emerald-950"
                        : "bg-white/60 border-slate-200 hover:bg-white text-slate-700"
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="font-bold text-xs flex items-center gap-1">
                        <FileText size={13} className="text-blue-600" />
                        Solo página actual
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-tight">
                      Guarda únicamente este slide específico como 1 plantilla global.
                    </p>
                  </button>

                  {/* Opción 3: Carrusel completo */}
                  <button
                    type="button"
                    onClick={() => setSaveMode("all")}
                    className={`p-3 rounded-xl border text-left flex flex-col gap-1 transition-all ${
                      saveMode === "all"
                        ? "bg-white border-emerald-600 shadow-md ring-2 ring-emerald-500/20 text-emerald-950"
                        : "bg-white/60 border-slate-200 hover:bg-white text-slate-700"
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="font-bold text-xs flex items-center gap-1">
                        <Layers size={13} className="text-purple-600" />
                        Carrusel completo
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-tight">
                      Guarda las {totalPages} páginas agrupadas en un solo archivo.
                    </p>
                  </button>
                </div>

                {/* Si saveMode === 'split': Selector de páginas con casillas de verificación */}
                {saveMode === "split" && (
                  <div className="pt-2 border-t border-emerald-200/60 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-700">
                        Selecciona los modelos a guardar ({selectedPages.length} de {totalPages}):
                      </span>
                      <button
                        type="button"
                        onClick={toggleSelectAll}
                        className="text-emerald-700 hover:text-emerald-800 font-bold underline text-[11px]"
                      >
                        {selectedPages.length === totalPages ? "Desmarcar todas" : "Seleccionar todas"}
                      </button>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 max-h-40 overflow-y-auto p-1.5 bg-white rounded-xl border border-slate-200">
                      {document.pages.map((p, idx) => {
                        const isChecked = selectedPages.includes(p.id);
                        const thumb = pageThumbnails[p.id] || thumbnailUrl;
                        const pName = p.name?.trim() || `Página ${idx + 1}`;
                        return (
                          <label
                            key={p.id}
                            className={`flex items-center gap-2 p-1.5 rounded-lg border cursor-pointer select-none transition-all ${
                              isChecked
                                ? "border-emerald-500 bg-emerald-50/60 text-slate-900 font-medium"
                                : "border-slate-200 opacity-60 hover:opacity-100 text-slate-600"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => togglePage(p.id)}
                              className="rounded text-emerald-600 focus:ring-emerald-500 w-3.5 h-3.5"
                            />
                            <div className="w-8 h-8 rounded bg-slate-100 overflow-hidden flex-shrink-0 border border-slate-200">
                              {thumb ? (
                                <img src={thumb} alt={pName} className="w-full h-full object-cover" />
                              ) : (
                                <span className="text-[9px] text-slate-400 flex items-center justify-center h-full">#{idx + 1}</span>
                              )}
                            </div>
                            <span className="text-[11px] truncate flex-1">{pName}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Input Título / Prefijo */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {saveMode === "split" && totalPages > 1
                  ? "Prefijo de Nombre para las Plantillas"
                  : "Título de la Plantilla"}{" "}
                <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={
                  saveMode === "split" && totalPages > 1
                    ? "Ej. Yervoy Farma B2B (se guardará como Yervoy Farma B2B - Página 1, etc.)"
                    : "Ej. Post de Autoridad B2B - Dark Minimal"
                }
                required
                className="w-full px-3.5 py-2 rounded-xl text-sm border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all text-slate-800 placeholder-slate-400"
              />
            </div>

            {/* Categoría y Etiquetas */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Categoría
                </label>
                <select
                  value={isCustomCategory ? "custom" : category}
                  onChange={(e) => {
                    if (e.target.value === "custom") {
                      setIsCustomCategory(true);
                    } else {
                      setIsCustomCategory(false);
                      setCategory(e.target.value);
                    }
                  }}
                  className="w-full px-3.5 py-2 rounded-xl text-sm border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white text-slate-800"
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat.slug} value={cat.slug}>
                      {cat.name}
                    </option>
                  ))}
                  <option value="custom">+ Otra Categoría Personalizada</option>
                </select>
              </div>

              {isCustomCategory ? (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nueva Categoría
                  </label>
                  <input
                    type="text"
                    value={customCategory}
                    onChange={(e) => setCustomCategory(e.target.value)}
                    placeholder="Nombre de la categoría..."
                    className="w-full px-3.5 py-2 rounded-xl text-sm border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-slate-800"
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Etiquetas (separadas por coma)
                  </label>
                  <input
                    type="text"
                    value={tagsInput}
                    onChange={(e) => setTagsInput(e.target.value)}
                    placeholder="b2b, linkedin, viral, marketing"
                    className="w-full px-3.5 py-2 rounded-xl text-sm border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-slate-800"
                  />
                </div>
              )}
            </div>

            {/* Destacado Toggle */}
            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isFeatured}
                  onChange={(e) => setIsFeatured(e.target.checked)}
                  className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300"
                />
                <span className="text-xs font-semibold text-slate-700">
                  Marcar como Plantilla Destacada (aparece arriba en la biblioteca)
                </span>
              </label>
            </div>

            {/* Progreso de guardado múltiple */}
            {savingProgress && (
              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-xs space-y-1.5 animate-fadeIn">
                <div className="flex items-center justify-between text-emerald-900 font-semibold">
                  <span>Guardando plantilla {savingProgress.current} de {savingProgress.total}...</span>
                  <span>{Math.round((savingProgress.current / savingProgress.total) * 100)}%</span>
                </div>
                <p className="text-[11px] text-emerald-700 truncate">{savingProgress.title}</p>
                <div className="w-full h-1.5 bg-emerald-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-emerald-600 transition-all duration-200" 
                    style={{ width: `${(savingProgress.current / savingProgress.total) * 100}%` }}
                  />
                </div>
              </div>
            )}

            {/* Footer buttons */}
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                disabled={isSaving}
                className="px-4 py-2 rounded-xl text-xs font-medium text-slate-600 hover:bg-slate-100 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white shadow-md shadow-emerald-600/20 transition-all disabled:opacity-50 active:scale-95"
              >
                {isSaving ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>Publicando en Plataforma...</span>
                  </>
                ) : (
                  <>
                    <BookmarkCheck size={14} />
                    <span>
                      {saveMode === "split" && totalPages > 1
                        ? `Publicar ${selectedPages.length} Plantillas Globales`
                        : "Publicar Plantilla Global"}
                    </span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
