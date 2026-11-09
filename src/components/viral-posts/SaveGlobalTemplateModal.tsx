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
  CheckCircle2
} from "lucide-react";
import type { DoryDocument } from "@doory/types/document";

interface SaveGlobalTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  document: DoryDocument | null;
  thumbnailUrl: string | null;
  dimensions: { width: number; height: number };
  aspectRatio: "4:5" | "1:1" | "1.91:1";
  authorName?: string;
  onSuccess?: (templateTitle: string) => void;
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
}: SaveGlobalTemplateModalProps) {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("thought-leadership");
  const [customCategory, setCustomCategory] = useState("");
  const [isCustomCategory, setIsCustomCategory] = useState(false);
  const [tagsInput, setTagsInput] = useState("b2b, linkedin, post");
  const [isFeatured, setIsFeatured] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedSuccess, setSavedSuccess] = useState(false);

  if (!isOpen) return null;

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

      setSavedSuccess(true);
      // Dispatch notification for all open components to reload templates
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("inhubflow:templates-updated"));
      }

      setTimeout(() => {
        if (onSuccess) onSuccess(title.trim());
        onClose();
        setSavedSuccess(false);
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
        className="bg-white rounded-2xl shadow-2xl border border-slate-200/80 w-full max-w-xl overflow-hidden flex flex-col transform transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header con insignia Super Admin */}
        <div className="px-6 py-4 bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 text-white flex items-center justify-between">
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
            <h4 className="text-lg font-bold text-slate-800">¡Plantilla Global Publicada!</h4>
            <p className="text-sm text-slate-500 max-w-sm mt-1">
              Todos los clientes ya pueden ver y utilizar esta plantilla en la pestaña &quot;Plantillas&quot; del Editor Visual.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSave} className="p-6 space-y-4">
            {error && (
              <div className="p-3 text-xs font-medium rounded-lg bg-red-50 text-red-700 border border-red-200 flex items-center gap-2">
                <span>{error}</span>
              </div>
            )}

            {/* Preview Card */}
            <div className="flex items-center gap-4 p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
              <div className="w-20 h-24 rounded-lg bg-slate-200 overflow-hidden flex-shrink-0 flex items-center justify-center border border-slate-300/60 shadow-inner">
                {thumbnailUrl ? (
                  <img
                    src={thumbnailUrl}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Layers size={24} className="text-slate-400" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider block">
                  Vista Previa del Lienzo
                </span>
                <p className="text-sm font-semibold text-slate-800 truncate mt-0.5">
                  {title.trim() || "Título sin definir..."}
                </p>
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-white border border-slate-200 text-slate-700">
                    {dimensions.width} &times; {dimensions.height} px
                  </span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-blue-50 border border-blue-200 text-blue-700">
                    {aspectRatio === "4:5" ? "4:5 Vertical" : aspectRatio === "1:1" ? "1:1 Cuadrada" : "1.91:1 Horizontal"}
                  </span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-600">
                    {document?.pages?.length || 1} página(s)
                  </span>
                </div>
              </div>
            </div>

            {/* Input Título */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Título de la Plantilla <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ej. Post de Autoridad B2B - Dark Minimal"
                required
                className="w-full px-3.5 py-2 rounded-xl text-sm border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all text-slate-800 placeholder-slate-400"
              />
            </div>

            {/* Categoría */}
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

            {isCustomCategory && (
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
                  Marcar como Plantilla Destacada (aparece arriba)
                </span>
              </label>
            </div>

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
                className="flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white shadow-md shadow-emerald-600/20 transition-all disabled:opacity-50 active:scale-95"
              >
                {isSaving ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>Guardando en Plataforma...</span>
                  </>
                ) : (
                  <>
                    <BookmarkCheck size={14} />
                    <span>Publicar Plantilla Global</span>
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
