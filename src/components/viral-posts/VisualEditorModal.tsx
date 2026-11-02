"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  X,
  Download,
  Check,
  Sparkles,
  Image as ImageIcon,
  Type,
  Palette,
  Layers,
  FileDown,
  Upload,
  User,
  Plus,
  Trash2,
  Copy,
  Search,
  Sliders,
  CheckCircle2,
  Quote,
  TrendingUp,
  ArrowRight,
  Heart,
  MessageCircle,
  Repeat2,
  Move,
  GripHorizontal,
  RotateCcw,
  LayoutGrid
} from "lucide-react";
import { toPng } from "html-to-image";
import { jsPDF } from "jspdf";

export type TemplateId =
  | "editorial"
  | "authority_quote"
  | "social_card"
  | "split_focus"
  | "big_metric";

export type AspectRatio = "4:5" | "1:1";
export type EditorMode = "single" | "carousel";

export interface CarouselSlideItem {
  id: string;
  slideNumber: number;
  type: "cover" | "problem" | "solution" | "cta";
  label: string;
  title: string;
  subtitle: string;
  tag: string;
  bullets?: string[];
  ctaKeyword?: string;
  metric?: string;
  offsets?: Record<string, { x: number; y: number }>;
}

export interface VisualEditorModalProps {
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

// Tipografías modernas disponibles
const AVAILABLE_FONTS = [
  { name: "Outfit, sans-serif", label: "Outfit (Moderna B2B)" },
  { name: "Inter, sans-serif", label: "Inter (Tech Minimalista)" },
  { name: "Montserrat, sans-serif", label: "Montserrat (Impacto Bold)" },
  { name: "Georgia, serif", label: "Georgia (Cita de Autoridad)" },
];

export interface UnsplashPhotoItem {
  id: string;
  name: string;
  tags: string[];
  thumb: string;
  url: string;
}

// Catálogo curado de fondos de alta resolución
const CURATED_BACKGROUNDS: UnsplashPhotoItem[] = [
  {
    id: "executive_office",
    name: "Oficina Ejecutiva",
    tags: ["oficina", "reunión", "corporativo", "ejecutivo", "moderno"],
    thumb: "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=400&q=70",
    url: "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1200&q=85",
  },
  {
    id: "glass_meeting_room",
    name: "Sala de Juntas de Cristal",
    tags: ["oficina", "sala", "cristal", "estrategia"],
    thumb: "https://images.unsplash.com/photo-1497215728101-856f4ea42174?auto=format&fit=crop&w=400&q=70",
    url: "https://images.unsplash.com/photo-1497215728101-856f4ea42174?auto=format&fit=crop&w=1200&q=85",
  },
  {
    id: "dark_modern_lounge",
    name: "Lounge Corporativo Dark",
    tags: ["oficina", "dark", "elegante", "lujo"],
    thumb: "https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&w=400&q=70",
    url: "https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&w=1200&q=85",
  },
  {
    id: "tech_desk",
    name: "Setup Tecnológico Pro",
    tags: ["laptop", "computadora", "tech", "datos"],
    thumb: "https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=400&q=70",
    url: "https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=1200&q=85",
  },
  {
    id: "analytics_charts",
    name: "Gráficos & Crecimiento",
    tags: ["datos", "charts", "analytics", "saas"],
    thumb: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=400&q=70",
    url: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1200&q=85",
  },
  {
    id: "architecture_clean",
    name: "Rascacielos & Vidrio",
    tags: ["ciudad", "rascacielos", "finanzas", "b2b"],
    thumb: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=400&q=70",
    url: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1200&q=85",
  },
  {
    id: "dark_gradient_ambient",
    name: "Gradiente Corporativo Azul",
    tags: ["gradiente", "degradé", "dark", "azul"],
    thumb: "https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&w=400&q=70",
    url: "https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&w=1200&q=85",
  },
  {
    id: "team_brainstorm",
    name: "Equipo Estratégico",
    tags: ["equipo", "brainstorm", "startup", "colaboración"],
    thumb: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=400&q=70",
    url: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1200&q=85",
  },
];

const BRAND_COLORS = [
  { name: "InHubFlow Cyan", hex: "#0099ff" },
  { name: "Indigo Tech", hex: "#6366f1" },
  { name: "Esmeralda B2B", hex: "#10b981" },
  { name: "Ámbar Viral", hex: "#f59e0b" },
  { name: "Fucsia Creator", hex: "#ec4899" },
  { name: "Blanco Puro", hex: "#ffffff" },
];

/**
 * Componente de texto interactivo editable directamente en el lienzo (WYSIWYG)
 * Permite hacer clic, escribir directamente y se sincroniza en vivo con el estado
 */
interface InlineEditableTextProps {
  value: string;
  onChange: (val: string) => void;
  className?: string;
  style?: React.CSSProperties;
  as?: "h1" | "h2" | "h3" | "p" | "span" | "div";
  placeholder?: string;
  elementKey: string;
  selectedElement: string | null;
  onSelect: (key: string) => void;
  isExporting: boolean;
  multiline?: boolean;
}

function InlineEditableText({
  value,
  onChange,
  className = "",
  style,
  as: Component = "span",
  placeholder = "Escribe aquí...",
  elementKey,
  selectedElement,
  onSelect,
  isExporting,
  multiline = false,
}: InlineEditableTextProps) {
  const ref = useRef<HTMLElement>(null);
  const isEditingRef = useRef(false);
  const isSelected = selectedElement === elementKey && !isExporting;

  // Sincronizar el contenido visual si el usuario no está activamente tecleando en él
  useEffect(() => {
    if (ref.current && !isEditingRef.current) {
      if (ref.current.innerText !== (value || "")) {
        ref.current.innerText = value || "";
      }
    }
  }, [value]);

  return (
    <Component
      ref={ref as any}
      contentEditable={!isExporting}
      suppressContentEditableWarning
      spellCheck={false}
      style={style}
      data-element={elementKey}
      onClick={(e: React.MouseEvent) => {
        e.stopPropagation();
        onSelect(elementKey);
      }}
      onFocus={() => {
        isEditingRef.current = true;
        onSelect(elementKey);
      }}
      onBlur={(e: React.FocusEvent<HTMLElement>) => {
        isEditingRef.current = false;
        const newText = e.currentTarget.innerText.trim();
        onChange(newText || value);
      }}
      onKeyDown={(e: React.KeyboardEvent) => {
        if (!multiline && e.key === "Enter") {
          e.preventDefault();
          (e.target as HTMLElement).blur();
        }
      }}
      className={`transition-all duration-150 outline-hidden select-text ${
        isExporting
          ? ""
          : isSelected
          ? "ring-2 ring-brand-400 bg-brand-500/20 rounded px-1.5 -mx-1.5 shadow-sm"
          : "hover:ring-1 hover:ring-brand-400/60 hover:bg-white/10 rounded px-1.5 -mx-1.5 cursor-text"
      } ${className}`}
      title={isExporting ? undefined : "Haz clic para editar este texto directamente"}
    >
      {value || placeholder}
    </Component>
  );
}

/**
 * Componente envoltorio de Capa Arrastrable (Drag & Drop nativo con PointerEvents)
 * Permite mover cualquier elemento o caja libremente por el lienzo
 */
interface DraggableWrapperProps {
  id: string;
  isFreeMode: boolean;
  offset?: { x: number; y: number };
  onOffsetChange: (id: string, newOffset: { x: number; y: number }) => void;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  isExporting?: boolean;
  label?: string;
  isSelected?: boolean;
  onSelect?: () => void;
}

function DraggableWrapper({
  id,
  isFreeMode,
  offset = { x: 0, y: 0 },
  onOffsetChange,
  children,
  className = "",
  style,
  isExporting = false,
  label,
  isSelected,
  onSelect,
}: DraggableWrapperProps) {
  const [isDragging, setIsDragging] = useState(false);
  const dragStartPos = useRef({ x: 0, y: 0 });
  const initialOffset = useRef({ x: 0, y: 0 });

  const handlePointerDown = (e: React.PointerEvent) => {
    if (!isFreeMode || isExporting) return;
    const target = e.target as HTMLElement;
    const isHandle = target.closest('[data-drag-handle="true"]');
    const isContent = target.isContentEditable;

    // Si el usuario hace clic dentro de un texto contentEditable sin usar el asa, permitimos edición de texto
    if (isContent && !isHandle) {
      onSelect?.();
      return;
    }

    e.preventDefault();
    e.stopPropagation();
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {}
    setIsDragging(true);
    onSelect?.();
    dragStartPos.current = { x: e.clientX, y: e.clientY };
    initialOffset.current = { x: offset?.x || 0, y: offset?.y || 0 };
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    e.preventDefault();
    const dx = e.clientX - dragStartPos.current.x;
    const dy = e.clientY - dragStartPos.current.y;
    onOffsetChange(id, {
      x: initialOffset.current.x + dx,
      y: initialOffset.current.y + dy,
    });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isDragging) return;
    setIsDragging(false);
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}
  };

  const posX = offset?.x || 0;
  const posY = offset?.y || 0;
  const hasMoved = posX !== 0 || posY !== 0;

  return (
    <div
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      style={{
        ...style,
        transform: hasMoved ? `translate(${posX}px, ${posY}px)` : undefined,
        touchAction: isFreeMode ? "none" : undefined,
      }}
      className={`relative transition-transform duration-75 ${
        isFreeMode && !isExporting
          ? `group/drag ${
              isDragging
                ? "ring-2 ring-brand-400 bg-brand-500/10 shadow-2xl z-50 cursor-grabbing"
                : isSelected
                ? "ring-1.5 ring-brand-400/80 hover:ring-brand-400 z-30"
                : "hover:ring-1 hover:ring-brand-400/50 hover:bg-white/5 z-20"
            }`
          : ""
      } ${className}`}
    >
      {/* Asa de arrastre visible solo en modo libre */}
      {isFreeMode && !isExporting && (
        <div
          data-drag-handle="true"
          title="Arrastra para mover este elemento libremente por la lámina"
          className={`absolute -top-3 left-2 px-2 py-0.5 rounded-full bg-slate-900/95 border border-brand-400/80 text-[9px] font-bold text-brand-300 flex items-center gap-1 shadow-lg cursor-grab active:cursor-grabbing select-none transition-all z-40 ${
            isSelected || isDragging
              ? "opacity-100 scale-100 ring-1 ring-brand-400"
              : "opacity-0 group-hover/drag:opacity-100 scale-95 hover:scale-100"
          }`}
        >
          <GripHorizontal className="size-2.5 text-brand-400" />
          <span>{label || "Mover"}</span>
        </div>
      )}
      {children}
    </div>
  );
}

export default function VisualEditorModal({
  isOpen,
  onClose,
  initialTitle = "5 Errores que Arruinan tus Conversiones en LinkedIn",
  initialSubtitle = "Framework probado para líderes B2B y fundadores de alto impacto",
  initialCategory = "SOCIAL SELLING B2B",
  initialMetric = "+340%",
  authorName = "Roberto InHubFlow",
  authorHandle = "@roberto.b2b",
  authorAvatar,
  onApplyImage,
}: VisualEditorModalProps) {
  const slideContainerRef = useRef<HTMLDivElement | null>(null);

  // Estados del editor
  const [editorMode, setEditorMode] = useState<EditorMode>("carousel");
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateId>("editorial");
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>("4:5");
  const [selectedBgUrl, setSelectedBgUrl] = useState<string>(CURATED_BACKGROUNDS[0].url);
  const [accentColor, setAccentColor] = useState("#0099ff");
  const [overlayOpacity, setOverlayOpacity] = useState(0.8);
  const [overlayMode, setOverlayMode] = useState<"card" | "fullscreen">("card");
  const [selectedFont, setSelectedFont] = useState(AVAILABLE_FONTS[0].name);

  // Estados de interactividad directa y formato en el lienzo
  const [selectedElement, setSelectedElement] = useState<string | null>("title");
  const [titleSize, setTitleSize] = useState<"sm" | "md" | "lg" | "xl">("lg");

  // Modo Híbrido: Auto-Layout (false) vs Modo Libre Arrastrable (true)
  const [isFreeMode, setIsFreeMode] = useState(false);

  const getTitleSizeClass = (size: "sm" | "md" | "lg" | "xl") => {
    switch (size) {
      case "sm":
        return "text-base sm:text-lg";
      case "md":
        return "text-lg sm:text-xl";
      case "lg":
        return "text-xl sm:text-2xl";
      case "xl":
        return "text-2xl sm:text-3xl";
      default:
        return "text-xl sm:text-2xl";
    }
  };
  const [activeTab, setActiveTab] = useState<"templates" | "content" | "backgrounds" | "brand">("templates");

  // Estados de autor
  const [nameText, setNameText] = useState(authorName);
  const [handleText, setHandleText] = useState(authorHandle);

  // Estados de exportación
  const [isExporting, setIsExporting] = useState(false);
  const [exportFeedback, setExportFeedback] = useState<string | null>(null);

  // Búsqueda de fotos
  const [photoSearchQuery, setPhotoSearchQuery] = useState("");
  const [activePhotoTag, setActivePhotoTag] = useState("all");

  // Diapositivas
  const [slides, setSlides] = useState<CarouselSlideItem[]>([
    {
      id: "slide-1",
      slideNumber: 1,
      type: "cover",
      label: "Portada",
      title: initialTitle,
      subtitle: initialSubtitle,
      tag: initialCategory,
      metric: initialMetric,
    },
    {
      id: "slide-2",
      slideNumber: 2,
      type: "problem",
      label: "Problema",
      title: "El Gran Error en Frío",
      subtitle: "Lo que el 90% hace mal al prospectar",
      tag: "PASO 01 / DIAGNÓSTICO",
      bullets: [
        "El decisor percibe spam antes de entender la propuesta.",
        "Tasa de respuesta inferior al 3% en mensajes genéricos.",
        "Quemas tu cuenta personal sin construir autoridad.",
      ],
    },
    {
      id: "slide-3",
      slideNumber: 3,
      type: "solution",
      label: "Solución",
      title: "El Framework Inbound",
      subtitle: "Cómo convertir comentarios en clientes",
      tag: "PASO 02 / ESTRATEGIA",
      bullets: [
        "Crea un activo de valor concreto (guía, plantilla o playbook).",
        "Publica mostrando resultados tangibles y pide una palabra clave.",
        "Automatiza la entrega en DM y cualifica la conversación.",
      ],
    },
    {
      id: "slide-4",
      slideNumber: 4,
      type: "cta",
      label: "CTA Final",
      title: "¿Quieres Este Sistema?",
      subtitle: "Recibe el documento de trabajo completo en PDF",
      tag: "ACCIÓN INMEDIATA",
      ctaKeyword: "SISTEMA",
    },
  ]);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);

  // Sincronizar props
  useEffect(() => {
    if (initialTitle) {
      setSlides((prev) => {
        const next = [...prev];
        next[0].title = initialTitle;
        if (initialSubtitle) next[0].subtitle = initialSubtitle;
        if (initialCategory) next[0].tag = initialCategory;
        if (initialMetric) next[0].metric = initialMetric;
        return next;
      });
    }
    if (authorName) setNameText(authorName);
    if (authorHandle) setHandleText(authorHandle);
  }, [initialTitle, initialSubtitle, initialCategory, initialMetric, authorName, authorHandle]);

  // Manejar edición de la lámina actual
  const updateCurrentSlide = (fields: Partial<CarouselSlideItem>) => {
    setSlides((prev) => {
      const next = [...prev];
      next[currentSlideIndex] = { ...next[currentSlideIndex], ...fields };
      return next;
    });
  };

  // Manejador de posición arrastrable para elementos en Modo Libre
  const handleOffsetChange = (elementId: string, newOffset: { x: number; y: number }) => {
    setSlides((prev) => {
      const next = [...prev];
      const current = next[currentSlideIndex];
      const prevOffsets = current.offsets || {};
      next[currentSlideIndex] = {
        ...current,
        offsets: {
          ...prevOffsets,
          [elementId]: newOffset,
        },
      };
      return next;
    });
  };

  const handleResetOffsets = () => {
    updateCurrentSlide({ offsets: {} });
  };

  const handleAddSlide = () => {
    const newSlideNum = slides.length + 1;
    const newSlide: CarouselSlideItem = {
      id: `slide-${Date.now()}`,
      slideNumber: newSlideNum,
      type: "solution",
      label: `Lámina ${newSlideNum}`,
      title: `Paso ${newSlideNum - 1}: Recomendación Clave`,
      subtitle: "Describe aquí el método o insight accionable",
      tag: `PASO 0${newSlideNum - 1} / ACCIÓN`,
      bullets: [
        "Aplica esta acción de inmediato en tu proceso comercial.",
        "Mide la tasa de apertura y respuesta cada semana.",
      ],
    };
    const updated = [...slides, newSlide];
    setSlides(updated);
    setCurrentSlideIndex(updated.length - 1);
  };

  const handleDeleteSlide = (idx: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (slides.length <= 1) return;
    const updated = slides.filter((_, i) => i !== idx);
    setSlides(updated);
    setCurrentSlideIndex(Math.max(0, idx - 1));
  };

  const handleDuplicateSlide = (idx: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const target = slides[idx];
    const newSlide: CarouselSlideItem = {
      ...target,
      id: `slide-${Date.now()}`,
      label: `${target.label} (Copia)`,
      slideNumber: slides.length + 1,
    };
    const updated = [...slides];
    updated.splice(idx + 1, 0, newSlide);
    setSlides(updated);
    setCurrentSlideIndex(idx + 1);
  };

  // Subir imagen personalizada
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string") {
          setSelectedBgUrl(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // EXPORTAR IMAGEN PNG EN ALTA DEFINICIÓN (1080px)
  const handleExportPng = async () => {
    if (!slideContainerRef.current) return;
    setIsExporting(true);
    setExportFeedback("Generando PNG en alta resolución...");
    try {
      const dataUrl = await toPng(slideContainerRef.current, {
        cacheBust: true,
        pixelRatio: 2.5,
      });
      const link = document.createElement("a");
      link.download = `inhubflow-publicacion-${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
      setExportFeedback("¡PNG descargado con éxito!");
      setTimeout(() => setExportFeedback(null), 3000);
    } catch (err) {
      console.error("Error al exportar PNG:", err);
      setExportFeedback("Error al generar la imagen");
      setTimeout(() => setExportFeedback(null), 3000);
    } finally {
      setIsExporting(false);
    }
  };

  // APLICAR IMAGEN DIRECTAMENTE AL POST DRAFT
  const handleApplyToPost = async () => {
    if (!slideContainerRef.current) return;
    setIsExporting(true);
    setExportFeedback("Aplicando diseño a tu publicación...");
    try {
      const dataUrl = await toPng(slideContainerRef.current, {
        cacheBust: true,
        pixelRatio: 2,
      });
      if (onApplyImage) {
        onApplyImage(dataUrl);
      }
      onClose();
    } catch (err) {
      console.error("Error al aplicar imagen:", err);
      setExportFeedback("Error al aplicar");
      setTimeout(() => setExportFeedback(null), 3000);
    } finally {
      setIsExporting(false);
    }
  };

  // EXPORTAR CARRUSEL COMPLETO A PDF PARA LINKEDIN
  const handleExportPdf = async () => {
    if (!slideContainerRef.current) return;
    setIsExporting(true);
    setExportFeedback("Preparando carrusel en PDF...");

    const originalIdx = currentSlideIndex;
    const pdfWidth = 1080;
    const pdfHeight = aspectRatio === "4:5" ? 1350 : 1080;

    const pdf = new jsPDF({
      orientation: aspectRatio === "4:5" ? "portrait" : "landscape",
      unit: "px",
      format: [pdfWidth, pdfHeight],
    });

    try {
      for (let i = 0; i < slides.length; i++) {
        setCurrentSlideIndex(i);
        setExportFeedback(`Renderizando lámina ${i + 1} de ${slides.length}...`);
        // Pequeño timeout para permitir que React pinte la lámina en el DOM
        await new Promise((r) => setTimeout(r, 200));

        if (slideContainerRef.current) {
          const imgData = await toPng(slideContainerRef.current, {
            cacheBust: true,
            pixelRatio: 2,
          });
          if (i > 0) pdf.addPage([pdfWidth, pdfHeight]);
          pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
        }
      }

      pdf.save(`carrusel-inhubflow-${Date.now()}.pdf`);
      setExportFeedback("¡Carrusel PDF descargado con éxito!");
      setTimeout(() => setExportFeedback(null), 3000);
    } catch (err) {
      console.error("Error al exportar PDF:", err);
      setExportFeedback("Error al exportar carrusel");
      setTimeout(() => setExportFeedback(null), 3000);
    } finally {
      setCurrentSlideIndex(originalIdx);
      setIsExporting(false);
    }
  };

  if (!isOpen) return null;

  const currentSlide = slides[currentSlideIndex];
  const isCover = currentSlide.type === "cover";

  const filteredPhotos = CURATED_BACKGROUNDS.filter((photo) => {
    const matchesTag = activePhotoTag === "all" || photo.tags.includes(activePhotoTag);
    const query = photoSearchQuery.toLowerCase().trim();
    const matchesQuery =
      !query ||
      photo.name.toLowerCase().includes(query) ||
      photo.tags.some((t) => t.toLowerCase().includes(query));
    return matchesTag && matchesQuery;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-2 sm:p-4 animate-in fade-in duration-200">
      <div className="flex flex-col h-[95vh] w-full max-w-7xl rounded-2xl bg-gray-950 border border-gray-800 shadow-2xl overflow-hidden">
        
        {/* BARRA SUPERIOR DE CONTROL */}
        <header className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 border-b border-gray-800 bg-gray-900/90 shrink-0">
          <div className="flex items-center gap-3">
            <div className="size-9 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-600 flex items-center justify-center text-white shadow-md">
              <Sparkles className="size-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-white tracking-wide">
                  Estudio Gráfico InHubFlow
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-bold uppercase">
                  MOTOR AUTO-LAYOUT HD
                </span>
              </div>
              <p className="text-[11px] text-gray-400">
                {editorMode === "single"
                  ? "Publicación con Imagen Única (Feed de LinkedIn)"
                  : `Carrusel Activo (${slides.length} láminas) • Listo para PDF o PNG`}
              </p>
            </div>
          </div>

          {/* Switch Modo: Imagen Única vs Carrusel */}
          <div className="flex items-center gap-2">
            <div className="flex items-center p-1 rounded-xl bg-gray-800/80 border border-gray-700/60">
              <button
                type="button"
                onClick={() => setEditorMode("single")}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                  editorMode === "single"
                    ? "bg-brand-600 text-white shadow-sm"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                Imagen Única
              </button>
              <button
                type="button"
                onClick={() => setEditorMode("carousel")}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                  editorMode === "carousel"
                    ? "bg-brand-600 text-white shadow-sm"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                Carrusel PDF ({slides.length})
              </button>
            </div>

            {/* Selector de Relación de Aspecto */}
            <div className="flex items-center p-1 rounded-xl bg-gray-800/80 border border-gray-700/60">
              <button
                type="button"
                onClick={() => setAspectRatio("4:5")}
                className={`px-2.5 py-1 rounded-lg text-xs font-mono font-semibold transition ${
                  aspectRatio === "4:5"
                    ? "bg-gray-700 text-white"
                    : "text-gray-400 hover:text-white"
                }`}
                title="Vertical 4:5 (1080 × 1350px) - Máxima visibilidad en feed móvil"
              >
                Vertical 4:5
              </button>
              <button
                type="button"
                onClick={() => setAspectRatio("1:1")}
                className={`px-2.5 py-1 rounded-lg text-xs font-mono font-semibold transition ${
                  aspectRatio === "1:1"
                    ? "bg-gray-700 text-white"
                    : "text-gray-400 hover:text-white"
                }`}
                title="Cuadrado 1:1 (1080 × 1080px)"
              >
                Cuadrado 1:1
              </button>
            </div>
          </div>

          {/* Acciones de Exportación */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={isExporting}
              onClick={handleExportPng}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs font-semibold border border-gray-700 transition"
              title="Descargar lámina actual como PNG de alta resolución"
            >
              <Download className="size-3.5 text-brand-400" />
              <span>Lámina PNG</span>
            </button>

            {editorMode === "carousel" && (
              <button
                type="button"
                disabled={isExporting}
                onClick={handleExportPdf}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs font-semibold border border-gray-700 transition"
                title="Descargar carrusel completo en PDF para LinkedIn"
              >
                <FileDown className="size-3.5 text-indigo-400" />
                <span>Exportar PDF</span>
              </button>
            )}

            <button
              type="button"
              disabled={isExporting}
              onClick={handleApplyToPost}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-gradient-to-r from-brand-600 to-indigo-600 hover:brightness-110 text-white text-xs font-bold shadow-md transition"
              title="Adjuntar este diseño al post de LinkedIn en el compositor"
            >
              <Check className="size-4" />
              <span>Aplicar al Post</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition"
            >
              <X className="size-5" />
            </button>
          </div>
        </header>

        {/* FEEDBACK TEMPORAL DE EXPORTACIÓN */}
        {exportFeedback && (
          <div className="bg-brand-500/20 border-b border-brand-500/30 px-5 py-1.5 text-center text-xs font-semibold text-brand-300 animate-pulse">
            {exportFeedback}
          </div>
        )}

        {/* CUERPO DEL EDITOR */}
        <div className="flex-1 grid grid-cols-12 overflow-hidden">
          
          {/* PANEL LATERAL DE PERSONALIZACIÓN */}
          <aside className="col-span-12 lg:col-span-4 xl:col-span-3 border-r border-gray-800 bg-gray-900/60 flex flex-col h-full overflow-hidden">
            {/* Pestañas laterales */}
            <div className="grid grid-cols-4 border-b border-gray-800 bg-gray-950/70 p-1 gap-1 text-xs font-medium shrink-0">
              <button
                type="button"
                onClick={() => setActiveTab("templates")}
                className={`py-2 px-1 text-center rounded-lg flex flex-col items-center gap-1 transition ${
                  activeTab === "templates"
                    ? "bg-brand-600 text-white shadow-sm font-bold"
                    : "text-gray-400 hover:text-white hover:bg-gray-800/60"
                }`}
              >
                <Layers className="size-4" />
                <span className="text-[10px]">Plantillas</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("content")}
                className={`py-2 px-1 text-center rounded-lg flex flex-col items-center gap-1 transition ${
                  activeTab === "content"
                    ? "bg-brand-600 text-white shadow-sm font-bold"
                    : "text-gray-400 hover:text-white hover:bg-gray-800/60"
                }`}
              >
                <Type className="size-4" />
                <span className="text-[10px]">Lámina</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("backgrounds")}
                className={`py-2 px-1 text-center rounded-lg flex flex-col items-center gap-1 transition ${
                  activeTab === "backgrounds"
                    ? "bg-brand-600 text-white shadow-sm font-bold"
                    : "text-gray-400 hover:text-white hover:bg-gray-800/60"
                }`}
              >
                <ImageIcon className="size-4" />
                <span className="text-[10px]">Fotos</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("brand")}
                className={`py-2 px-1 text-center rounded-lg flex flex-col items-center gap-1 transition ${
                  activeTab === "brand"
                    ? "bg-brand-600 text-white shadow-sm font-bold"
                    : "text-gray-400 hover:text-white hover:bg-gray-800/60"
                }`}
              >
                <Palette className="size-4" />
                <span className="text-[10px]">Marca</span>
              </button>
            </div>

            {/* Contenido de cada pestaña */}
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-4">
              
              {/* TAB 1: PLANTILLAS PREDISEÑADAS */}
              {activeTab === "templates" && (
                <div className="space-y-3">
                  <div className="text-xs text-gray-400 font-medium pb-1">
                    Selecciona un estilo. Tus textos y fotos se mantendrán intactos:
                  </div>

                  {/* 1. Cinematic Editorial */}
                  <button
                    type="button"
                    onClick={() => setSelectedTemplate("editorial")}
                    className={`w-full text-left p-3 rounded-xl border transition flex items-start gap-3 ${
                      selectedTemplate === "editorial"
                        ? "border-brand-500 bg-brand-500/10 ring-1 ring-brand-500"
                        : "border-gray-800 bg-gray-900/50 hover:bg-gray-800"
                    }`}
                  >
                    <div className="size-11 rounded-lg bg-gradient-to-tr from-slate-900 to-slate-800 border border-gray-700 flex flex-col justify-end p-1.5 shrink-0">
                      <div className="h-1.5 w-6 rounded-full bg-brand-400 mb-1"></div>
                      <div className="h-1 w-4 rounded-full bg-gray-400"></div>
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white">Cinematic Editorial</div>
                      <div className="text-[11px] text-gray-400 mt-0.5">
                        Tarjeta de cristal oscuro + titular B2B de alto impacto.
                      </div>
                    </div>
                  </button>

                  {/* 2. Cita de Autoridad */}
                  <button
                    type="button"
                    onClick={() => setSelectedTemplate("authority_quote")}
                    className={`w-full text-left p-3 rounded-xl border transition flex items-start gap-3 ${
                      selectedTemplate === "authority_quote"
                        ? "border-brand-500 bg-brand-500/10 ring-1 ring-brand-500"
                        : "border-gray-800 bg-gray-900/50 hover:bg-gray-800"
                    }`}
                  >
                    <div className="size-11 rounded-lg bg-gradient-to-tr from-slate-900 to-indigo-950 border border-gray-700 flex items-center justify-center shrink-0">
                      <Quote className="size-5 text-indigo-400" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white">Cita de Autoridad</div>
                      <div className="text-[11px] text-gray-400 mt-0.5">
                        Comillas gigantes y frase centralizada con tarjeta de autor.
                      </div>
                    </div>
                  </button>

                  {/* 3. Tarjeta Social / Feed */}
                  <button
                    type="button"
                    onClick={() => setSelectedTemplate("social_card")}
                    className={`w-full text-left p-3 rounded-xl border transition flex items-start gap-3 ${
                      selectedTemplate === "social_card"
                        ? "border-brand-500 bg-brand-500/10 ring-1 ring-brand-500"
                        : "border-gray-800 bg-gray-900/50 hover:bg-gray-800"
                    }`}
                  >
                    <div className="size-11 rounded-lg bg-gradient-to-tr from-slate-900 to-blue-950 border border-gray-700 flex flex-col items-center justify-center shrink-0">
                      <div className="size-3.5 rounded-full bg-blue-500 mb-1"></div>
                      <div className="h-1 w-6 rounded-full bg-gray-400"></div>
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white">Tarjeta Social / Feed</div>
                      <div className="text-[11px] text-gray-400 mt-0.5">
                        Formato publicación con avatar, check azul y métricas sociales.
                      </div>
                    </div>
                  </button>

                  {/* 4. Split Focus 50/50 */}
                  <button
                    type="button"
                    onClick={() => setSelectedTemplate("split_focus")}
                    className={`w-full text-left p-3 rounded-xl border transition flex items-start gap-3 ${
                      selectedTemplate === "split_focus"
                        ? "border-brand-500 bg-brand-500/10 ring-1 ring-brand-500"
                        : "border-gray-800 bg-gray-900/50 hover:bg-gray-800"
                    }`}
                  >
                    <div className="size-11 rounded-lg bg-gray-900 border border-gray-700 flex flex-col overflow-hidden shrink-0">
                      <div className="h-1/2 bg-blue-900/70"></div>
                      <div className="h-1/2 bg-slate-950 p-1 flex items-center">
                        <div className="h-1 w-4 rounded-full bg-white"></div>
                      </div>
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white">Split Focus (50/50)</div>
                      <div className="text-[11px] text-gray-400 mt-0.5">
                        Fotografía superior inmersiva + panel de datos inferior.
                      </div>
                    </div>
                  </button>

                  {/* 5. Métrica de Alto Impacto */}
                  <button
                    type="button"
                    onClick={() => setSelectedTemplate("big_metric")}
                    className={`w-full text-left p-3 rounded-xl border transition flex items-start gap-3 ${
                      selectedTemplate === "big_metric"
                        ? "border-brand-500 bg-brand-500/10 ring-1 ring-brand-500"
                        : "border-gray-800 bg-gray-900/50 hover:bg-gray-800"
                    }`}
                  >
                    <div className="size-11 rounded-lg bg-gradient-to-tr from-slate-900 to-amber-950 border border-gray-700 flex items-center justify-center shrink-0">
                      <span className="text-[10px] font-mono font-bold text-amber-400">+340%</span>
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white">Métrica de Alto Impacto</div>
                      <div className="text-[11px] text-gray-400 mt-0.5">
                        Número gigante validado (+340%) con titular explicativo.
                      </div>
                    </div>
                  </button>
                </div>
              )}

              {/* TAB 2: CONTENIDO DE LA LÁMINA */}
              {activeTab === "content" && (
                <div className="space-y-4">
                  {/* Tipo de Lámina */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-300 uppercase mb-1.5">
                      Tipo de Lámina
                    </label>
                    <select
                      value={currentSlide.type}
                      onChange={(e) => updateCurrentSlide({ type: e.target.value as any })}
                      className="w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-xs text-white font-medium focus:border-brand-500 focus:outline-hidden"
                    >
                      <option value="cover">Portada Principal</option>
                      <option value="problem">Problema / Diagnóstico (Viñetas)</option>
                      <option value="solution">Solución / Framework (Puntos de Acción)</option>
                      <option value="cta">CTA Final (Palabra Clave Sentinel)</option>
                    </select>
                  </div>

                  {/* Etiqueta / Categoría */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-300 uppercase mb-1.5">
                      Categoría / Tag
                    </label>
                    <input
                      type="text"
                      value={currentSlide.tag}
                      onChange={(e) => updateCurrentSlide({ tag: e.target.value })}
                      className="w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-xs text-white focus:border-brand-500 focus:outline-hidden"
                      placeholder="Ej. SOCIAL SELLING B2B"
                    />
                  </div>

                  {/* Titular */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-300 uppercase mb-1.5">
                      Titular Principal
                    </label>
                    <textarea
                      rows={3}
                      value={currentSlide.title}
                      onChange={(e) => updateCurrentSlide({ title: e.target.value })}
                      className="w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-xs text-white font-medium focus:border-brand-500 focus:outline-hidden"
                      placeholder="Escribe el gancho o título de alto impacto..."
                    />
                  </div>

                  {/* Subtítulo */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-300 uppercase mb-1.5">
                      Subtítulo / Contexto
                    </label>
                    <textarea
                      rows={3}
                      value={currentSlide.subtitle}
                      onChange={(e) => updateCurrentSlide({ subtitle: e.target.value })}
                      className="w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-xs text-gray-300 focus:border-brand-500 focus:outline-hidden"
                      placeholder="Agrega el framework o valor complementario..."
                    />
                  </div>

                  {/* Métrica para template de Métrica */}
                  {selectedTemplate === "big_metric" && isCover && (
                    <div>
                      <label className="block text-xs font-semibold text-gray-300 uppercase mb-1.5">
                        Número de Métrica
                      </label>
                      <input
                        type="text"
                        value={currentSlide.metric || "+340%"}
                        onChange={(e) => updateCurrentSlide({ metric: e.target.value })}
                        className="w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-xs text-brand-400 font-mono font-bold focus:border-brand-500 focus:outline-hidden"
                        placeholder="+340% o $1.2M"
                      />
                    </div>
                  )}

                  {/* Viñetas para láminas de problema o solución */}
                  {(currentSlide.type === "problem" || currentSlide.type === "solution") && (
                    <div>
                      <label className="block text-xs font-semibold text-gray-300 uppercase mb-1.5">
                        Puntos Clave (Viñetas)
                      </label>
                      <div className="space-y-2">
                        {(currentSlide.bullets || ["Punto 1", "Punto 2", "Punto 3"]).map((b, bIdx) => (
                          <div key={bIdx} className="flex items-center gap-2">
                            <span className="size-6 rounded-full bg-brand-500/20 text-brand-400 font-bold text-xs flex items-center justify-center shrink-0">
                              {bIdx + 1}
                            </span>
                            <input
                              type="text"
                              value={b}
                              onChange={(e) => {
                                const newBullets = [...(currentSlide.bullets || [])];
                                newBullets[bIdx] = e.target.value;
                                updateCurrentSlide({ bullets: newBullets });
                              }}
                              className="w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-1.5 text-xs text-white focus:border-brand-500 focus:outline-hidden"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Palabra Clave para CTA Final */}
                  {currentSlide.type === "cta" && (
                    <div>
                      <label className="block text-xs font-semibold text-gray-300 uppercase mb-1.5">
                        Palabra Clave de Activación (Inbound Sentinel)
                      </label>
                      <input
                        type="text"
                        value={currentSlide.ctaKeyword || "SISTEMA"}
                        onChange={(e) => updateCurrentSlide({ ctaKeyword: e.target.value })}
                        className="w-full rounded-lg border border-brand-500/50 bg-gray-900 px-3 py-2 text-xs text-brand-400 font-mono font-bold uppercase focus:border-brand-500 focus:outline-hidden"
                        placeholder="SISTEMA"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: FOTOGRAFÍAS Y FONDOS */}
              {activeTab === "backgrounds" && (
                <div className="space-y-4">
                  {/* Buscador de fotos */}
                  <div className="relative">
                    <Search className="size-3.5 absolute left-3 top-2.5 text-gray-400" />
                    <input
                      type="text"
                      value={photoSearchQuery}
                      onChange={(e) => setPhotoSearchQuery(e.target.value)}
                      placeholder="Buscar oficina, tech, datos, equipo..."
                      className="w-full rounded-lg border border-gray-700 bg-gray-900 pl-8 pr-3 py-1.5 text-xs text-white placeholder-gray-500 focus:border-brand-500 focus:outline-hidden"
                    />
                  </div>

                  {/* Subir foto propia */}
                  <label className="flex items-center justify-center gap-2 p-2.5 rounded-xl border border-dashed border-gray-700 bg-gray-900/60 hover:bg-gray-800 text-gray-300 text-xs font-semibold cursor-pointer transition">
                    <Upload className="size-4 text-brand-400" />
                    <span>Subir mi propia foto o imagen</span>
                    <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                  </label>

                  {/* Filtro rápido por categoría */}
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { id: "all", label: "Todas" },
                      { id: "oficina", label: "Oficina" },
                      { id: "tech", label: "Tech & IA" },
                      { id: "datos", label: "Datos" },
                      { id: "ciudad", label: "Ciudad" },
                      { id: "equipo", label: "Equipo" },
                    ].map((tag) => (
                      <button
                        key={tag.id}
                        type="button"
                        onClick={() => setActivePhotoTag(tag.id)}
                        className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition ${
                          activePhotoTag === tag.id
                            ? "bg-brand-600 text-white"
                            : "bg-gray-800 text-gray-400 hover:text-white"
                        }`}
                      >
                        {tag.label}
                      </button>
                    ))}
                  </div>

                  {/* Grid de fotos curadas */}
                  <div className="grid grid-cols-2 gap-2">
                    {filteredPhotos.map((photo) => (
                      <button
                        key={photo.id}
                        type="button"
                        onClick={() => setSelectedBgUrl(photo.url)}
                        className={`group relative aspect-video rounded-lg overflow-hidden border transition ${
                          selectedBgUrl === photo.url
                            ? "border-brand-500 ring-2 ring-brand-500"
                            : "border-gray-800 hover:border-gray-600"
                        }`}
                      >
                        <img
                          src={photo.thumb}
                          alt={photo.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-1.5">
                          <span className="text-[10px] text-white font-medium truncate">
                            {photo.name}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 4: MARCA Y ESTILO */}
              {activeTab === "brand" && (
                <div className="space-y-4">
                  {/* Color de Acento */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-300 uppercase mb-2">
                      Color de Acento de Marca
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {BRAND_COLORS.map((c) => (
                        <button
                          key={c.hex}
                          type="button"
                          onClick={() => setAccentColor(c.hex)}
                          className={`flex items-center gap-1.5 p-2 rounded-lg border transition ${
                            accentColor === c.hex
                              ? "border-brand-500 bg-gray-800"
                              : "border-gray-800 bg-gray-900/60 hover:bg-gray-800"
                          }`}
                        >
                          <span
                            className="size-3.5 rounded-full border border-white/20 shrink-0"
                            style={{ backgroundColor: c.hex }}
                          ></span>
                          <span className="text-[11px] text-gray-200 truncate">{c.name.split(" ")[0]}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Tipografía */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-300 uppercase mb-2">
                      Tipografía Principal
                    </label>
                    <select
                      value={selectedFont}
                      onChange={(e) => setSelectedFont(e.target.value)}
                      className="w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-xs text-white font-medium focus:border-brand-500 focus:outline-hidden"
                    >
                      {AVAILABLE_FONTS.map((f) => (
                        <option key={f.name} value={f.name}>
                          {f.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Nivel de Transparencia del Fondo Oscuro */}
                  <div className="p-3 rounded-xl border border-gray-800 bg-gray-900/60 space-y-2.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-300 font-semibold uppercase flex items-center gap-1.5">
                        <span className="size-2 rounded-full" style={{ backgroundColor: accentColor }}></span>
                        Opacidad Fondo Oscuro
                      </span>
                      <span className="text-brand-400 font-mono font-bold">
                        {Math.round(overlayOpacity * 100)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0.1}
                      max={0.95}
                      step={0.05}
                      value={overlayOpacity}
                      onChange={(e) => setOverlayOpacity(parseFloat(e.target.value))}
                      className="w-full accent-brand-500 cursor-pointer"
                    />

                    {/* Modo Tarjeta vs Pantalla Completa */}
                    <div className="grid grid-cols-2 gap-1.5 pt-1">
                      <button
                        type="button"
                        onClick={() => setOverlayMode("card")}
                        className={`px-2 py-1.5 rounded-lg border text-[11px] font-semibold transition ${
                          overlayMode === "card"
                            ? "border-brand-500 bg-brand-500/20 text-white"
                            : "border-gray-700 bg-gray-800 text-gray-400 hover:text-white"
                        }`}
                      >
                        Modo Tarjeta
                      </button>
                      <button
                        type="button"
                        onClick={() => setOverlayMode("fullscreen")}
                        className={`px-2 py-1.5 rounded-lg border text-[11px] font-semibold transition ${
                          overlayMode === "fullscreen"
                            ? "border-brand-500 bg-brand-500/20 text-white"
                            : "border-gray-700 bg-gray-800 text-gray-400 hover:text-white"
                        }`}
                      >
                        Pantalla Completa
                      </button>
                    </div>
                  </div>

                  {/* Autor y Firma */}
                  <div className="space-y-2 pt-2 border-t border-gray-800">
                    <label className="block text-xs font-semibold text-gray-300 uppercase">
                      Firma de Autor
                    </label>
                    <input
                      type="text"
                      value={nameText}
                      onChange={(e) => setNameText(e.target.value)}
                      placeholder="Nombre del Autor"
                      className="w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-1.5 text-xs text-white"
                    />
                    <input
                      type="text"
                      value={handleText}
                      onChange={(e) => setHandleText(e.target.value)}
                      placeholder="@handle"
                      className="w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-1.5 text-xs text-gray-400"
                    />
                  </div>
                </div>
              )}
            </div>
          </aside>

          {/* ESCENARIO CENTRAL DE VISUALIZACIÓN WYSIWYG */}
          <main className="col-span-12 lg:col-span-8 xl:col-span-9 flex flex-col items-center justify-center p-4 sm:p-6 bg-slate-950/80 relative overflow-hidden">
            
            {/* BARRA DE HERRAMIENTAS CONTEXTUAL WYSIWYG (SOBRE EL LIENZO) */}
            <div className="mb-3 w-full max-w-2xl flex flex-wrap items-center justify-between gap-2 px-3.5 py-1.5 rounded-xl bg-gray-900/90 border border-gray-800 shadow-xl backdrop-blur-md text-xs">
              
              {/* Selector de Modo: Auto-Layout vs Modo Libre */}
              <div className="flex items-center gap-1.5">
                <div className="flex items-center p-0.5 rounded-lg bg-gray-800 border border-gray-700">
                  <button
                    type="button"
                    onClick={() => setIsFreeMode(false)}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold transition ${
                      !isFreeMode
                        ? "bg-brand-600 text-white shadow-xs"
                        : "text-gray-400 hover:text-white"
                    }`}
                    title="Alineación automática limpia y equilibrada por Flexbox"
                  >
                    <LayoutGrid className="size-3" />
                    <span>Auto-Layout</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsFreeMode(true)}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold transition ${
                      isFreeMode
                        ? "bg-indigo-600 text-white shadow-xs"
                        : "text-gray-400 hover:text-white"
                    }`}
                    title="Arrastra cualquier elemento libremente con el ratón por la lámina"
                  >
                    <Move className="size-3" />
                    <span>Modo Libre</span>
                  </button>
                </div>

                {/* Botón Restablecer si se movieron elementos */}
                {Object.keys(currentSlide.offsets || {}).length > 0 && (
                  <button
                    type="button"
                    onClick={handleResetOffsets}
                    className="flex items-center gap-1 px-2 py-1 rounded-lg bg-gray-800/80 hover:bg-gray-700 text-amber-300 text-[10px] font-semibold border border-amber-500/30 transition"
                    title="Restablecer posiciones al orden inicial"
                  >
                    <RotateCcw className="size-2.5" />
                    <span>Restablecer</span>
                  </button>
                )}
              </div>

              {/* Indicador de elemento seleccionado */}
              <div className="flex items-center gap-2">
                <span className="size-2 rounded-full bg-emerald-400 animate-pulse shrink-0"></span>
                <span className="font-semibold text-white truncate max-w-[170px]">
                  {selectedElement === "title"
                    ? "Titular Principal"
                    : selectedElement === "subtitle"
                    ? "Subtítulo"
                    : selectedElement === "tag"
                    ? "Categoría / Tag"
                    : selectedElement === "metric"
                    ? "Métrica de Impacto"
                    : selectedElement === "author-name"
                    ? "Nombre de Autor"
                    : selectedElement === "author-handle"
                    ? "Handle (@)"
                    : selectedElement?.startsWith("bullet")
                    ? "Viñeta"
                    : selectedElement === "cta-keyword"
                    ? "Palabra Sentinel"
                    : selectedElement === "background"
                    ? "Foto de Fondo"
                    : selectedElement === "brand"
                    ? "Fondo Oscuro"
                    : isFreeMode
                    ? "Arrastra elementos"
                    : "Haz clic para editar texto"}
                </span>
              </div>

              {/* Controles rápidos contextuales */}
              <div className="flex items-center gap-1.5 ml-auto">
                {selectedElement === "title" && (
                  <div className="flex items-center gap-1 bg-gray-800/90 px-1.5 py-0.5 rounded-lg border border-gray-700">
                    <span className="text-[10px] text-gray-400 font-semibold">Tamaño:</span>
                    {(["sm", "md", "lg", "xl"] as const).map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setTitleSize(s)}
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase transition ${
                          titleSize === s
                            ? "bg-brand-500 text-white"
                            : "text-gray-400 hover:text-white"
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setSelectedElement("background");
                    setActiveTab("backgrounds");
                  }}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-200 text-[11px] font-medium border border-gray-700 transition"
                  title="Cambiar fotografía de fondo"
                >
                  <ImageIcon className="size-3 text-brand-400" />
                  <span>Foto</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedElement("brand");
                    setActiveTab("brand");
                  }}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-200 text-[11px] font-medium border border-gray-700 transition"
                  title="Ajustar opacidad y estilo del fondo oscuro"
                >
                  <Sliders className="size-3 text-indigo-400" />
                  <span>{Math.round(overlayOpacity * 100)}%</span>
                </button>
              </div>
            </div>

            {/* CONTENEDOR DEL LIENZO MAQUETADO CON TAILWIND (EXPORTABLE 1:1 / 4:5) */}
            <div
              className={`relative shadow-2xl rounded-2xl border border-gray-800 bg-gray-950 overflow-hidden ring-1 ring-white/10 shrink-0 transition-all duration-300 ${
                aspectRatio === "4:5" ? "w-[420px] h-[525px]" : "w-[440px] h-[440px]"
              }`}
            >
              {/* Elemento DOM exacto que se captura con html-to-image */}
              <div
                ref={slideContainerRef}
                style={{ fontFamily: selectedFont }}
                onClick={() => setSelectedElement("background")}
                className="relative w-full h-full flex flex-col justify-between overflow-hidden bg-slate-950 select-text"
              >
                {/* 1. FOTO DE FONDO CON OBJECT-FIT COVER */}
                <div className="absolute inset-0 z-0">
                  <img
                    src={selectedBgUrl}
                    alt="Background"
                    crossOrigin="anonymous"
                    className="w-full h-full object-cover pointer-events-none"
                  />
                  {/* Filtro ambiental sutil de contraste */}
                  <div className="absolute inset-0 bg-slate-950/40 pointer-events-none"></div>
                </div>

                {/* BOTÓN FLOTANTE: CAMBIAR FOTO (Oculto al exportar) */}
                {!isExporting && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedElement("background");
                      setActiveTab("backgrounds");
                    }}
                    className="absolute top-3 right-3 z-30 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-950/80 hover:bg-black text-white text-xs font-semibold border border-white/20 shadow-xl backdrop-blur-md transition hover:scale-105"
                    title="Cambiar fotografía de fondo"
                  >
                    <ImageIcon className="size-3.5 text-brand-400" />
                    <span>Cambiar Foto</span>
                  </button>
                )}

                {/* 2. RENDERIZADO POR PLANTILLA O TIPO DE LÁMINA */}

                {/* A) LÁMINA TIPO PORTADA SEGÚN PLANTILLA SELECCIONADA */}
                {isCover ? (
                  <>
                    {/* PLANTILLA 1: CINEMATIC EDITORIAL */}
                    {selectedTemplate === "editorial" && (
                      <div className="relative z-10 w-full h-full flex flex-col justify-end p-5">
                        <DraggableWrapper
                          id="editorial-card"
                          label="Panel Tarjeta"
                          isFreeMode={isFreeMode}
                          offset={currentSlide.offsets?.["editorial-card"]}
                          onOffsetChange={handleOffsetChange}
                          isExporting={isExporting}
                          isSelected={selectedElement === "brand"}
                          onSelect={() => setSelectedElement("brand")}
                          className="w-full"
                        >
                          <div
                            style={{
                              backgroundColor: `rgba(9, 13, 24, ${overlayOpacity})`,
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedElement("brand");
                            }}
                            className={`relative w-full border border-white/15 shadow-2xl backdrop-blur-md flex flex-col justify-between transition-all ${
                              overlayMode === "fullscreen"
                                ? "h-full rounded-none p-6"
                                : "rounded-3xl p-6"
                            }`}
                          >
                            <div>
                              {/* Píldora de Categoría */}
                              <DraggableWrapper
                                id="editorial-tag"
                                label="Categoría"
                                isFreeMode={isFreeMode}
                                offset={currentSlide.offsets?.["editorial-tag"]}
                                onOffsetChange={handleOffsetChange}
                                isExporting={isExporting}
                                isSelected={selectedElement === "tag"}
                                onSelect={() => setSelectedElement("tag")}
                                className="inline-block mb-3"
                              >
                                <span
                                  style={{ backgroundColor: accentColor }}
                                  className="inline-block px-3 py-1 rounded-md text-[11px] font-bold text-black uppercase tracking-wider shadow-sm"
                                >
                                  <InlineEditableText
                                    elementKey="tag"
                                    value={currentSlide.tag || "B2B"}
                                    onChange={(val) => updateCurrentSlide({ tag: val })}
                                    selectedElement={selectedElement}
                                    onSelect={setSelectedElement}
                                    isExporting={isExporting}
                                    placeholder="CATEGORÍA"
                                  />
                                </span>
                              </DraggableWrapper>

                              {/* Titular */}
                              <DraggableWrapper
                                id="editorial-title"
                                label="Titular"
                                isFreeMode={isFreeMode}
                                offset={currentSlide.offsets?.["editorial-title"]}
                                onOffsetChange={handleOffsetChange}
                                isExporting={isExporting}
                                isSelected={selectedElement === "title"}
                                onSelect={() => setSelectedElement("title")}
                              >
                                <h1 className={`${getTitleSizeClass(titleSize)} font-extrabold text-white leading-tight break-words drop-shadow-md`}>
                                  <InlineEditableText
                                    elementKey="title"
                                    as="h1"
                                    value={currentSlide.title}
                                    onChange={(val) => updateCurrentSlide({ title: val })}
                                    selectedElement={selectedElement}
                                    onSelect={setSelectedElement}
                                    isExporting={isExporting}
                                    multiline={true}
                                    placeholder="Escribe tu titular aquí..."
                                  />
                                </h1>
                              </DraggableWrapper>

                              {/* Subtítulo */}
                              <DraggableWrapper
                                id="editorial-subtitle"
                                label="Subtítulo"
                                isFreeMode={isFreeMode}
                                offset={currentSlide.offsets?.["editorial-subtitle"]}
                                onOffsetChange={handleOffsetChange}
                                isExporting={isExporting}
                                isSelected={selectedElement === "subtitle"}
                                onSelect={() => setSelectedElement("subtitle")}
                              >
                                <p className="text-xs sm:text-sm text-slate-200 mt-2.5 leading-relaxed font-normal">
                                  <InlineEditableText
                                    elementKey="subtitle"
                                    as="p"
                                    value={currentSlide.subtitle}
                                    onChange={(val) => updateCurrentSlide({ subtitle: val })}
                                    selectedElement={selectedElement}
                                    onSelect={setSelectedElement}
                                    isExporting={isExporting}
                                    multiline={true}
                                    placeholder="Escribe el subtítulo aquí..."
                                  />
                                </p>
                              </DraggableWrapper>
                            </div>

                            {/* Pie con Swipe Badge y Autor */}
                            <DraggableWrapper
                              id="editorial-footer"
                              label="Firma / Pie"
                              isFreeMode={isFreeMode}
                              offset={currentSlide.offsets?.["editorial-footer"]}
                              onOffsetChange={handleOffsetChange}
                              isExporting={isExporting}
                              isSelected={selectedElement === "author-name"}
                              onSelect={() => setSelectedElement("author-name")}
                              className="pt-4 mt-3 border-t border-white/10 flex items-center justify-between"
                            >
                              <div className="flex items-center gap-2">
                                <div
                                  style={{ backgroundColor: accentColor }}
                                  className="size-6 rounded-full flex items-center justify-center text-[10px] font-bold text-black"
                                >
                                  {nameText.substring(0, 2).toUpperCase()}
                                </div>
                                <span className="text-xs font-bold text-white">
                                  <InlineEditableText
                                    elementKey="author-name"
                                    value={nameText}
                                    onChange={setNameText}
                                    selectedElement={selectedElement}
                                    onSelect={setSelectedElement}
                                    isExporting={isExporting}
                                    placeholder="Tu Nombre"
                                  />
                                </span>
                              </div>

                              {editorMode === "carousel" && (
                                <div
                                  style={{ borderColor: accentColor, color: accentColor }}
                                  className="px-3 py-1 rounded-full border text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 bg-white/5"
                                >
                                  <span>DESLIZA</span>
                                  <ArrowRight className="size-3" />
                                </div>
                              )}
                            </DraggableWrapper>
                          </div>
                        </DraggableWrapper>
                      </div>
                    )}

                    {/* PLANTILLA 2: CITA DE AUTORIDAD */}
                    {selectedTemplate === "authority_quote" && (
                      <div className="relative z-10 w-full h-full flex flex-col justify-between p-6">
                        <DraggableWrapper
                          id="quote-card"
                          label="Panel Cita"
                          isFreeMode={isFreeMode}
                          offset={currentSlide.offsets?.["quote-card"]}
                          onOffsetChange={handleOffsetChange}
                          isExporting={isExporting}
                          isSelected={selectedElement === "brand"}
                          onSelect={() => setSelectedElement("brand")}
                          className="w-full h-full"
                        >
                          <div
                            style={{
                              backgroundColor: `rgba(9, 13, 24, ${overlayOpacity})`,
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedElement("brand");
                            }}
                            className="relative w-full h-full rounded-3xl border border-white/15 p-6 shadow-2xl backdrop-blur-md flex flex-col justify-between items-center text-center"
                          >
                            {/* Tag superior */}
                            <DraggableWrapper
                              id="quote-tag"
                              label="Categoría"
                              isFreeMode={isFreeMode}
                              offset={currentSlide.offsets?.["quote-tag"]}
                              onOffsetChange={handleOffsetChange}
                              isExporting={isExporting}
                              isSelected={selectedElement === "tag"}
                              onSelect={() => setSelectedElement("tag")}
                            >
                              <span
                                style={{ borderColor: accentColor, color: accentColor }}
                                className="px-3 py-1 rounded-full border text-[11px] font-bold uppercase tracking-wider bg-white/5 inline-block"
                              >
                                <InlineEditableText
                                  elementKey="tag"
                                  value={currentSlide.tag || "CITA DE AUTORIDAD"}
                                  onChange={(val) => updateCurrentSlide({ tag: val })}
                                  selectedElement={selectedElement}
                                  onSelect={setSelectedElement}
                                  isExporting={isExporting}
                                  placeholder="CITA DE AUTORIDAD"
                                />
                              </span>
                            </DraggableWrapper>

                            {/* Frase entre comillas */}
                            <DraggableWrapper
                              id="quote-body"
                              label="Cita y Texto"
                              isFreeMode={isFreeMode}
                              offset={currentSlide.offsets?.["quote-body"]}
                              onOffsetChange={handleOffsetChange}
                              isExporting={isExporting}
                              isSelected={selectedElement === "title"}
                              onSelect={() => setSelectedElement("title")}
                              className="my-auto px-2"
                            >
                              <Quote
                                className="size-10 mx-auto mb-2 opacity-80"
                                style={{ color: accentColor }}
                              />
                              <h1 className={`${getTitleSizeClass(titleSize)} font-bold italic text-white leading-relaxed`}>
                                "
                                <InlineEditableText
                                  elementKey="title"
                                  as="h1"
                                  value={currentSlide.title}
                                  onChange={(val) => updateCurrentSlide({ title: val })}
                                  selectedElement={selectedElement}
                                  onSelect={setSelectedElement}
                                  isExporting={isExporting}
                                  multiline={true}
                                  placeholder="Escribe la frase memorable aquí..."
                                />
                                "
                              </h1>
                              <p className="text-xs text-slate-300 mt-3 font-normal">
                                <InlineEditableText
                                  elementKey="subtitle"
                                  as="p"
                                  value={currentSlide.subtitle}
                                  onChange={(val) => updateCurrentSlide({ subtitle: val })}
                                  selectedElement={selectedElement}
                                  onSelect={setSelectedElement}
                                  isExporting={isExporting}
                                  multiline={true}
                                  placeholder="Contexto o explicación de la cita..."
                                />
                              </p>
                            </DraggableWrapper>

                            {/* Tarjeta de autor */}
                            <DraggableWrapper
                              id="quote-author"
                              label="Tarjeta de Autor"
                              isFreeMode={isFreeMode}
                              offset={currentSlide.offsets?.["quote-author"]}
                              onOffsetChange={handleOffsetChange}
                              isExporting={isExporting}
                              isSelected={selectedElement === "author-name"}
                              onSelect={() => setSelectedElement("author-name")}
                              className="flex items-center gap-3 px-4 py-2 rounded-full bg-slate-900/90 border border-white/15 shadow-md"
                            >
                              <div
                                style={{ backgroundColor: accentColor }}
                                className="size-7 rounded-full flex items-center justify-center text-xs font-bold text-black shrink-0"
                              >
                                {nameText.substring(0, 2).toUpperCase()}
                              </div>
                              <div className="text-left">
                                <div className="text-xs font-bold text-white leading-tight">
                                  <InlineEditableText
                                    elementKey="author-name"
                                    value={nameText}
                                    onChange={setNameText}
                                    selectedElement={selectedElement}
                                    onSelect={setSelectedElement}
                                    isExporting={isExporting}
                                    placeholder="Tu Nombre"
                                  />
                                </div>
                                <div className="text-[10px] text-brand-400 font-mono leading-tight">
                                  <InlineEditableText
                                    elementKey="author-handle"
                                    value={handleText}
                                    onChange={setHandleText}
                                    selectedElement={selectedElement}
                                    onSelect={setSelectedElement}
                                    isExporting={isExporting}
                                    placeholder="@handle"
                                  />
                                </div>
                              </div>
                            </DraggableWrapper>
                          </div>
                        </DraggableWrapper>
                      </div>
                    )}

                    {/* PLANTILLA 3: TARJETA SOCIAL / FEED */}
                    {selectedTemplate === "social_card" && (
                      <div className="relative z-10 w-full h-full flex flex-col justify-center p-5">
                        <DraggableWrapper
                          id="social-card"
                          label="Tarjeta Social"
                          isFreeMode={isFreeMode}
                          offset={currentSlide.offsets?.["social-card"]}
                          onOffsetChange={handleOffsetChange}
                          isExporting={isExporting}
                          isSelected={selectedElement === "brand"}
                          onSelect={() => setSelectedElement("brand")}
                          className="w-full"
                        >
                          <div
                            style={{
                              backgroundColor: `rgba(15, 23, 42, ${overlayOpacity})`,
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedElement("brand");
                            }}
                            className="relative w-full rounded-3xl border border-white/15 p-5 shadow-2xl backdrop-blur-md flex flex-col justify-between"
                          >
                            {/* Cabecera estilo LinkedIn */}
                            <DraggableWrapper
                              id="social-header"
                              label="Perfil Creador"
                              isFreeMode={isFreeMode}
                              offset={currentSlide.offsets?.["social-header"]}
                              onOffsetChange={handleOffsetChange}
                              isExporting={isExporting}
                              isSelected={selectedElement === "author-name"}
                              onSelect={() => setSelectedElement("author-name")}
                              className="flex items-center gap-3 pb-3 border-b border-white/10"
                            >
                              <div
                                style={{ backgroundColor: accentColor }}
                                className="size-9 rounded-full flex items-center justify-center text-xs font-bold text-black shrink-0"
                              >
                                {nameText.substring(0, 2).toUpperCase()}
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-xs font-bold text-white">
                                    <InlineEditableText
                                      elementKey="author-name"
                                      value={nameText}
                                      onChange={setNameText}
                                      selectedElement={selectedElement}
                                      onSelect={setSelectedElement}
                                      isExporting={isExporting}
                                      placeholder="Tu Nombre"
                                    />
                                  </span>
                                  <CheckCircle2 className="size-3.5 text-blue-400 shrink-0" />
                                </div>
                                <div className="text-[10px] text-gray-400 flex items-center gap-1">
                                  <InlineEditableText
                                    elementKey="author-handle"
                                    value={handleText}
                                    onChange={setHandleText}
                                    selectedElement={selectedElement}
                                    onSelect={setSelectedElement}
                                    isExporting={isExporting}
                                    placeholder="@handle"
                                  />
                                  <span>• LinkedIn Creator</span>
                                </div>
                              </div>
                            </DraggableWrapper>

                            {/* Contenido del post */}
                            <div className="py-3.5 space-y-2.5">
                              <DraggableWrapper
                                id="social-tag"
                                label="Etiqueta"
                                isFreeMode={isFreeMode}
                                offset={currentSlide.offsets?.["social-tag"]}
                                onOffsetChange={handleOffsetChange}
                                isExporting={isExporting}
                                isSelected={selectedElement === "tag"}
                                onSelect={() => setSelectedElement("tag")}
                                className="inline-block"
                              >
                                <span
                                  style={{ borderColor: accentColor, color: accentColor }}
                                  className="inline-block px-2.5 py-0.5 rounded text-[10px] font-bold uppercase border bg-white/5"
                                >
                                  <InlineEditableText
                                    elementKey="tag"
                                    value={currentSlide.tag || "B2B"}
                                    onChange={(val) => updateCurrentSlide({ tag: val })}
                                    selectedElement={selectedElement}
                                    onSelect={setSelectedElement}
                                    isExporting={isExporting}
                                    placeholder="B2B"
                                  />
                                </span>
                              </DraggableWrapper>

                              <DraggableWrapper
                                id="social-title"
                                label="Titular"
                                isFreeMode={isFreeMode}
                                offset={currentSlide.offsets?.["social-title"]}
                                onOffsetChange={handleOffsetChange}
                                isExporting={isExporting}
                                isSelected={selectedElement === "title"}
                                onSelect={() => setSelectedElement("title")}
                              >
                                <h1 className={`${getTitleSizeClass(titleSize)} font-bold text-white leading-snug`}>
                                  <InlineEditableText
                                    elementKey="title"
                                    as="h1"
                                    value={currentSlide.title}
                                    onChange={(val) => updateCurrentSlide({ title: val })}
                                    selectedElement={selectedElement}
                                    onSelect={setSelectedElement}
                                    isExporting={isExporting}
                                    multiline={true}
                                    placeholder="Escribe el titular aquí..."
                                  />
                                </h1>
                              </DraggableWrapper>

                              <DraggableWrapper
                                id="social-subtitle"
                                label="Caja de Texto"
                                isFreeMode={isFreeMode}
                                offset={currentSlide.offsets?.["social-subtitle"]}
                                onOffsetChange={handleOffsetChange}
                                isExporting={isExporting}
                                isSelected={selectedElement === "subtitle"}
                                onSelect={() => setSelectedElement("subtitle")}
                              >
                                <div
                                  style={{ borderLeftColor: accentColor }}
                                  className="p-3 rounded-r-xl bg-white/5 border-l-4 text-xs text-slate-200"
                                >
                                  <InlineEditableText
                                    elementKey="subtitle"
                                    as="p"
                                    value={currentSlide.subtitle}
                                    onChange={(val) => updateCurrentSlide({ subtitle: val })}
                                    selectedElement={selectedElement}
                                    onSelect={setSelectedElement}
                                    isExporting={isExporting}
                                    multiline={true}
                                    placeholder="Desarrollo o cuerpo del post..."
                                  />
                                </div>
                              </DraggableWrapper>
                            </div>

                            {/* Estadísticas de interacción social */}
                            <DraggableWrapper
                              id="social-stats"
                              label="Métricas Sociales"
                              isFreeMode={isFreeMode}
                              offset={currentSlide.offsets?.["social-stats"]}
                              onOffsetChange={handleOffsetChange}
                              isExporting={isExporting}
                              className="pt-2.5 border-t border-white/10 flex items-center justify-between text-[11px] text-gray-400 font-medium"
                            >
                              <span className="flex items-center gap-1">
                                <Heart className="size-3 text-rose-400" /> 1,428
                              </span>
                              <span className="flex items-center gap-1">
                                <MessageCircle className="size-3 text-blue-400" /> 189
                              </span>
                              <span className="flex items-center gap-1">
                                <Repeat2 className="size-3 text-emerald-400" /> 54
                              </span>
                            </DraggableWrapper>
                          </div>
                        </DraggableWrapper>
                      </div>
                    )}

                    {/* PLANTILLA 4: SPLIT FOCUS 50/50 */}
                    {selectedTemplate === "split_focus" && (
                      <div className="relative z-10 w-full h-full flex flex-col justify-end">
                        <DraggableWrapper
                          id="split-card"
                          label="Panel Inferior"
                          isFreeMode={isFreeMode}
                          offset={currentSlide.offsets?.["split-card"]}
                          onOffsetChange={handleOffsetChange}
                          isExporting={isExporting}
                          isSelected={selectedElement === "brand"}
                          onSelect={() => setSelectedElement("brand")}
                          className="w-full h-[52%]"
                        >
                          <div
                            style={{ borderTopColor: accentColor }}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedElement("brand");
                            }}
                            className="relative h-full w-full bg-slate-950/95 border-t-4 p-5 flex flex-col justify-between backdrop-blur-md"
                          >
                            <div>
                              <DraggableWrapper
                                id="split-tag"
                                label="Etiqueta"
                                isFreeMode={isFreeMode}
                                offset={currentSlide.offsets?.["split-tag"]}
                                onOffsetChange={handleOffsetChange}
                                isExporting={isExporting}
                                isSelected={selectedElement === "tag"}
                                onSelect={() => setSelectedElement("tag")}
                                className="inline-block mb-2"
                              >
                                <span
                                  style={{ backgroundColor: accentColor }}
                                  className="inline-block px-2.5 py-1 rounded text-[10px] font-bold text-black uppercase"
                                >
                                  <InlineEditableText
                                    elementKey="tag"
                                    value={currentSlide.tag || "B2B"}
                                    onChange={(val) => updateCurrentSlide({ tag: val })}
                                    selectedElement={selectedElement}
                                    onSelect={setSelectedElement}
                                    isExporting={isExporting}
                                    placeholder="B2B"
                                  />
                                </span>
                              </DraggableWrapper>

                              <DraggableWrapper
                                id="split-title"
                                label="Titular"
                                isFreeMode={isFreeMode}
                                offset={currentSlide.offsets?.["split-title"]}
                                onOffsetChange={handleOffsetChange}
                                isExporting={isExporting}
                                isSelected={selectedElement === "title"}
                                onSelect={() => setSelectedElement("title")}
                              >
                                <h1 className={`${getTitleSizeClass(titleSize)} font-extrabold text-white leading-tight`}>
                                  <InlineEditableText
                                    elementKey="title"
                                    as="h1"
                                    value={currentSlide.title}
                                    onChange={(val) => updateCurrentSlide({ title: val })}
                                    selectedElement={selectedElement}
                                    onSelect={setSelectedElement}
                                    isExporting={isExporting}
                                    multiline={true}
                                    placeholder="Escribe el titular aquí..."
                                  />
                                </h1>
                              </DraggableWrapper>

                              <DraggableWrapper
                                id="split-subtitle"
                                label="Subtítulo"
                                isFreeMode={isFreeMode}
                                offset={currentSlide.offsets?.["split-subtitle"]}
                                onOffsetChange={handleOffsetChange}
                                isExporting={isExporting}
                                isSelected={selectedElement === "subtitle"}
                                onSelect={() => setSelectedElement("subtitle")}
                              >
                                <p className="text-xs text-slate-300 mt-2 font-normal line-clamp-3">
                                  <InlineEditableText
                                    elementKey="subtitle"
                                    as="p"
                                    value={currentSlide.subtitle}
                                    onChange={(val) => updateCurrentSlide({ subtitle: val })}
                                    selectedElement={selectedElement}
                                    onSelect={setSelectedElement}
                                    isExporting={isExporting}
                                    multiline={true}
                                    placeholder="Escribe el subtítulo aquí..."
                                  />
                                </p>
                              </DraggableWrapper>
                            </div>

                            <DraggableWrapper
                              id="split-footer"
                              label="Pie / Autor"
                              isFreeMode={isFreeMode}
                              offset={currentSlide.offsets?.["split-footer"]}
                              onOffsetChange={handleOffsetChange}
                              isExporting={isExporting}
                              isSelected={selectedElement === "author-name"}
                              onSelect={() => setSelectedElement("author-name")}
                              className="pt-2 border-t border-white/10 flex items-center justify-between text-xs text-gray-400"
                            >
                              <span className="font-bold text-white">
                                <InlineEditableText
                                  elementKey="author-name"
                                  value={nameText}
                                  onChange={setNameText}
                                  selectedElement={selectedElement}
                                  onSelect={setSelectedElement}
                                  isExporting={isExporting}
                                  placeholder="Tu Nombre"
                                />
                              </span>
                              {editorMode === "carousel" && (
                                <span style={{ color: accentColor }} className="font-bold flex items-center gap-1">
                                  Desliza <ArrowRight className="size-3" />
                                </span>
                              )}
                            </DraggableWrapper>
                          </div>
                        </DraggableWrapper>
                      </div>
                    )}

                    {/* PLANTILLA 5: MÉTRICA DE ALTO IMPACTO */}
                    {selectedTemplate === "big_metric" && (
                      <div className="relative z-10 w-full h-full flex flex-col justify-center p-6 text-center">
                        <DraggableWrapper
                          id="metric-card"
                          label="Panel Métrica"
                          isFreeMode={isFreeMode}
                          offset={currentSlide.offsets?.["metric-card"]}
                          onOffsetChange={handleOffsetChange}
                          isExporting={isExporting}
                          isSelected={selectedElement === "brand"}
                          onSelect={() => setSelectedElement("brand")}
                          className="w-full h-full"
                        >
                          <div
                            style={{
                              backgroundColor: `rgba(9, 13, 24, ${overlayOpacity})`,
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedElement("brand");
                            }}
                            className="relative w-full h-full rounded-3xl border border-white/15 p-6 shadow-2xl backdrop-blur-md flex flex-col justify-between items-center"
                          >
                            <DraggableWrapper
                              id="metric-tag"
                              label="Etiqueta"
                              isFreeMode={isFreeMode}
                              offset={currentSlide.offsets?.["metric-tag"]}
                              onOffsetChange={handleOffsetChange}
                              isExporting={isExporting}
                              isSelected={selectedElement === "tag"}
                              onSelect={() => setSelectedElement("tag")}
                            >
                              <span
                                style={{ borderColor: accentColor, color: accentColor }}
                                className="px-3 py-1 rounded-full border text-[10px] font-bold uppercase tracking-wider bg-white/5 inline-block"
                              >
                                <InlineEditableText
                                  elementKey="tag"
                                  value={currentSlide.tag || "MÉTRICA VALIDADA"}
                                  onChange={(val) => updateCurrentSlide({ tag: val })}
                                  selectedElement={selectedElement}
                                  onSelect={setSelectedElement}
                                  isExporting={isExporting}
                                  placeholder="MÉTRICA VALIDADA"
                                />
                              </span>
                            </DraggableWrapper>

                            <div className="my-auto">
                              <DraggableWrapper
                                id="metric-number"
                                label="Número Grande"
                                isFreeMode={isFreeMode}
                                offset={currentSlide.offsets?.["metric-number"]}
                                onOffsetChange={handleOffsetChange}
                                isExporting={isExporting}
                                isSelected={selectedElement === "metric"}
                                onSelect={() => setSelectedElement("metric")}
                              >
                                <div
                                  style={{ color: accentColor }}
                                  className="text-5xl sm:text-6xl font-black tracking-tight font-mono drop-shadow-lg"
                                >
                                  <InlineEditableText
                                    elementKey="metric"
                                    as="div"
                                    value={currentSlide.metric || initialMetric || "+340%"}
                                    onChange={(val) => updateCurrentSlide({ metric: val })}
                                    selectedElement={selectedElement}
                                    onSelect={setSelectedElement}
                                    isExporting={isExporting}
                                    placeholder="+340%"
                                  />
                                </div>
                                <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mt-1">
                                  RESULTADO COMPROBADO EN CONVERSIONES
                                </div>
                              </DraggableWrapper>

                              <DraggableWrapper
                                id="metric-text"
                                label="Titular y Subtítulo"
                                isFreeMode={isFreeMode}
                                offset={currentSlide.offsets?.["metric-text"]}
                                onOffsetChange={handleOffsetChange}
                                isExporting={isExporting}
                                isSelected={selectedElement === "title"}
                                onSelect={() => setSelectedElement("title")}
                              >
                                <h1 className={`${getTitleSizeClass(titleSize)} font-bold text-white mt-3`}>
                                  <InlineEditableText
                                    elementKey="title"
                                    as="h1"
                                    value={currentSlide.title}
                                    onChange={(val) => updateCurrentSlide({ title: val })}
                                    selectedElement={selectedElement}
                                    onSelect={setSelectedElement}
                                    isExporting={isExporting}
                                    multiline={true}
                                    placeholder="Explicación del resultado..."
                                  />
                                </h1>
                                <p className="text-xs text-slate-300 mt-1 font-normal">
                                  <InlineEditableText
                                    elementKey="subtitle"
                                    as="p"
                                    value={currentSlide.subtitle}
                                    onChange={(val) => updateCurrentSlide({ subtitle: val })}
                                    selectedElement={selectedElement}
                                    onSelect={setSelectedElement}
                                    isExporting={isExporting}
                                    multiline={true}
                                    placeholder="Contexto o método utilizado..."
                                  />
                                </p>
                              </DraggableWrapper>
                            </div>

                            <DraggableWrapper
                              id="metric-author"
                              label="Firma / Autor"
                              isFreeMode={isFreeMode}
                              offset={currentSlide.offsets?.["metric-author"]}
                              onOffsetChange={handleOffsetChange}
                              isExporting={isExporting}
                              isSelected={selectedElement === "author-name"}
                              onSelect={() => setSelectedElement("author-name")}
                              className="text-xs text-gray-400 font-mono"
                            >
                              <InlineEditableText
                                elementKey="author-name"
                                value={nameText}
                                onChange={setNameText}
                                selectedElement={selectedElement}
                                onSelect={setSelectedElement}
                                isExporting={isExporting}
                                placeholder="Tu Nombre"
                              />
                              {" • "}
                              <span style={{ color: accentColor }}>
                                <InlineEditableText
                                  elementKey="author-handle"
                                  value={handleText}
                                  onChange={setHandleText}
                                  selectedElement={selectedElement}
                                  onSelect={setSelectedElement}
                                  isExporting={isExporting}
                                  placeholder="@handle"
                                />
                              </span>
                            </DraggableWrapper>
                          </div>
                        </DraggableWrapper>
                      </div>
                    )}
                  </>
                ) : (
                  /* B) LÁMINAS INTERMEDIAS (PROBLEMA, SOLUCIÓN, CTA) */
                  <div className="relative z-10 w-full h-full p-6 flex flex-col justify-between">
                    <DraggableWrapper
                      id="inter-card"
                      label="Tarjeta de Contenido"
                      isFreeMode={isFreeMode}
                      offset={currentSlide.offsets?.["inter-card"]}
                      onOffsetChange={handleOffsetChange}
                      isExporting={isExporting}
                      isSelected={selectedElement === "brand"}
                      onSelect={() => setSelectedElement("brand")}
                      className="w-full h-full"
                    >
                      <div
                        style={{
                          backgroundColor: `rgba(15, 23, 42, ${overlayOpacity})`,
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedElement("brand");
                        }}
                        className="relative w-full h-full rounded-3xl border border-white/15 p-6 shadow-2xl backdrop-blur-md flex flex-col justify-between"
                      >
                        {/* Cabecera de la lámina */}
                        <div>
                          <DraggableWrapper
                            id="inter-tag"
                            label="Etiqueta Paso"
                            isFreeMode={isFreeMode}
                            offset={currentSlide.offsets?.["inter-tag"]}
                            onOffsetChange={handleOffsetChange}
                            isExporting={isExporting}
                            isSelected={selectedElement === "tag"}
                            onSelect={() => setSelectedElement("tag")}
                            className="inline-block mb-2.5"
                          >
                            <span
                              style={{ borderColor: accentColor, color: accentColor }}
                              className="inline-block px-3 py-0.5 rounded-full border text-[10px] font-bold uppercase tracking-wider bg-white/5"
                            >
                              <InlineEditableText
                                elementKey="tag"
                                value={currentSlide.tag || "PASO ACCIONABLE"}
                                onChange={(val) => updateCurrentSlide({ tag: val })}
                                selectedElement={selectedElement}
                                onSelect={setSelectedElement}
                                isExporting={isExporting}
                                placeholder="PASO ACCIONABLE"
                              />
                            </span>
                          </DraggableWrapper>

                          <DraggableWrapper
                            id="inter-title"
                            label="Titular"
                            isFreeMode={isFreeMode}
                            offset={currentSlide.offsets?.["inter-title"]}
                            onOffsetChange={handleOffsetChange}
                            isExporting={isExporting}
                            isSelected={selectedElement === "title"}
                            onSelect={() => setSelectedElement("title")}
                          >
                            <h2 className={`${getTitleSizeClass(titleSize)} font-bold text-white leading-snug`}>
                              <InlineEditableText
                                elementKey="title"
                                as="h2"
                                value={currentSlide.title}
                                onChange={(val) => updateCurrentSlide({ title: val })}
                                selectedElement={selectedElement}
                                onSelect={setSelectedElement}
                                isExporting={isExporting}
                                multiline={true}
                                placeholder="Título de la lámina..."
                              />
                            </h2>
                            <p className="text-xs text-slate-300 mt-1">
                              <InlineEditableText
                                elementKey="subtitle"
                                as="p"
                                value={currentSlide.subtitle}
                                onChange={(val) => updateCurrentSlide({ subtitle: val })}
                                selectedElement={selectedElement}
                                onSelect={setSelectedElement}
                                isExporting={isExporting}
                                multiline={true}
                                placeholder="Subtítulo descriptivo..."
                              />
                            </p>
                          </DraggableWrapper>
                        </div>

                        {/* Cuerpo de viñetas para problema o solución */}
                        {(currentSlide.type === "problem" || currentSlide.type === "solution") && (
                          <DraggableWrapper
                            id="inter-bullets"
                            label="Bloque de Viñetas"
                            isFreeMode={isFreeMode}
                            offset={currentSlide.offsets?.["inter-bullets"]}
                            onOffsetChange={handleOffsetChange}
                            isExporting={isExporting}
                            className="my-auto space-y-2.5"
                          >
                            {(currentSlide.bullets || ["Punto 1", "Punto 2", "Punto 3"]).map((bullet, idx) => (
                              <div key={idx} className="flex items-start gap-3 p-2.5 rounded-xl bg-white/5 border border-white/5">
                                <span
                                  style={{ backgroundColor: accentColor }}
                                  className="size-5 rounded-full text-[11px] font-black text-black flex items-center justify-center shrink-0 mt-0.5"
                                >
                                  {idx + 1}
                                </span>
                                <div className="flex-1 text-xs text-slate-200 leading-relaxed font-medium">
                                  <InlineEditableText
                                    elementKey={`bullet-${idx}`}
                                    value={bullet}
                                    onChange={(val) => {
                                      const newBullets = [...(currentSlide.bullets || [])];
                                      newBullets[idx] = val;
                                      updateCurrentSlide({ bullets: newBullets });
                                    }}
                                    selectedElement={selectedElement}
                                    onSelect={setSelectedElement}
                                    isExporting={isExporting}
                                    multiline={true}
                                    placeholder={`Punto ${idx + 1}...`}
                                  />
                                </div>
                              </div>
                            ))}
                          </DraggableWrapper>
                        )}

                        {/* Cuerpo de CTA Final */}
                        {currentSlide.type === "cta" && (
                          <DraggableWrapper
                            id="inter-cta"
                            label="Caja de Acción CTA"
                            isFreeMode={isFreeMode}
                            offset={currentSlide.offsets?.["inter-cta"]}
                            onOffsetChange={handleOffsetChange}
                            isExporting={isExporting}
                            className="my-auto p-4 rounded-2xl bg-gradient-to-b from-white/10 to-transparent border border-white/15 text-center space-y-3"
                          >
                            <p className="text-xs text-slate-200 font-medium">
                              Comenta abajo para enviarte el activo completo por mensaje directo:
                            </p>
                            <div
                              style={{ backgroundColor: accentColor }}
                              className="p-3 rounded-xl text-black font-mono font-black text-sm tracking-wider shadow-lg"
                            >
                              COMUNICAR "
                              <InlineEditableText
                                elementKey="cta-keyword"
                                value={currentSlide.ctaKeyword || "SISTEMA"}
                                onChange={(val) => updateCurrentSlide({ ctaKeyword: val })}
                                selectedElement={selectedElement}
                                onSelect={setSelectedElement}
                                isExporting={isExporting}
                                placeholder="SISTEMA"
                              />
                              "
                            </div>
                          </DraggableWrapper>
                        )}

                        {/* Pie de lámina */}
                        <DraggableWrapper
                          id="inter-footer"
                          label="Firma / Número"
                          isFreeMode={isFreeMode}
                          offset={currentSlide.offsets?.["inter-footer"]}
                          onOffsetChange={handleOffsetChange}
                          isExporting={isExporting}
                          isSelected={selectedElement === "author-name"}
                          onSelect={() => setSelectedElement("author-name")}
                          className="pt-3 border-t border-white/10 flex items-center justify-between text-xs text-gray-400"
                        >
                          <span className="font-bold text-white">
                            <InlineEditableText
                              elementKey="author-name"
                              value={nameText}
                              onChange={setNameText}
                              selectedElement={selectedElement}
                              onSelect={setSelectedElement}
                              isExporting={isExporting}
                              placeholder="Tu Nombre"
                            />
                          </span>
                          <span className="font-mono text-[10px]">
                            Lámina {currentSlideIndex + 1} / {slides.length}
                          </span>
                        </DraggableWrapper>
                      </div>
                    </DraggableWrapper>
                  </div>
                )}
              </div>
            </div>

            {/* BARRA INFERIOR DE NAVEGACIÓN Y CARRUSEL MULTIDIAPOSITIVA */}
            {editorMode === "carousel" && (
              <div className="w-full max-w-2xl mt-4 px-4 py-2.5 rounded-xl border border-gray-800 bg-gray-900/80 backdrop-blur-md flex items-center gap-3 overflow-x-auto custom-scrollbar z-20">
                <span className="text-[11px] font-bold uppercase text-gray-400 shrink-0 flex items-center gap-1.5">
                  <Layers className="size-3.5 text-brand-400" />
                  Láminas:
                </span>

                {slides.map((s, idx) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setCurrentSlideIndex(idx)}
                    className={`group relative flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium transition shrink-0 ${
                      currentSlideIndex === idx
                        ? "border-brand-500 bg-brand-500/20 text-white"
                        : "border-gray-800 bg-gray-950/60 text-gray-400 hover:text-white hover:bg-gray-800"
                    }`}
                  >
                    <span className="size-4 rounded-full bg-gray-800 text-[10px] font-bold flex items-center justify-center">
                      {idx + 1}
                    </span>
                    <span className="truncate max-w-[90px]">{s.label}</span>

                    {/* Acciones rápidas en miniatura */}
                    {slides.length > 1 && (
                      <span
                        onClick={(e) => handleDeleteSlide(idx, e)}
                        className="opacity-0 group-hover:opacity-100 hover:text-red-400 p-0.5 rounded transition"
                        title="Eliminar lámina"
                      >
                        <Trash2 className="size-3" />
                      </span>
                    )}
                  </button>
                ))}

                <button
                  type="button"
                  onClick={handleAddSlide}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-dashed border-gray-700 bg-gray-800/40 hover:bg-gray-800 text-gray-300 hover:text-white text-xs font-semibold shrink-0 transition"
                >
                  <Plus className="size-3.5 text-brand-400" />
                  <span>Añadir</span>
                </button>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
