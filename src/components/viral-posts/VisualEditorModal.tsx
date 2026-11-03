"use client";

import React, { useEffect, useRef, useState, useCallback, createContext, useContext } from "react";
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
  LayoutGrid,
  Shapes,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Square,
  Circle,
  Star,
  Minus,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
  Tag,
  Maximize2,
  ZoomIn,
  ZoomOut,
  SplitSquareVertical
} from "lucide-react";
import { toPng } from "html-to-image";
import { jsPDF } from "jspdf";

export type TemplateId =
  | "editorial"
  | "authority_quote"
  | "social_card"
  | "split_focus"
  | "big_metric"
  | "bold_highlighter";

export type AspectRatio = "4:5" | "1:1";
export type EditorMode = "single" | "carousel";
export type CanvaDockTab = "templates" | "text" | "elements" | "photos" | "backgrounds";

export interface TemplateDefinition {
  id: TemplateId;
  name: string;
  desc: string;
}

export const TEMPLATES: TemplateDefinition[] = [
  {
    id: "editorial",
    name: "Cinematic Editorial",
    desc: "Tarjeta de cristal oscuro + titular B2B de alto impacto.",
  },
  {
    id: "authority_quote",
    name: "Cita de Autoridad",
    desc: "Comillas gigantes y frase centralizada con tarjeta de autor.",
  },
  {
    id: "social_card",
    name: "Tarjeta Social / Feed",
    desc: "Formato publicación con avatar, check azul y métricas sociales.",
  },
  {
    id: "split_focus",
    name: "Split Focus (50/50)",
    desc: "Fotografía superior inmersiva + panel de datos inferior.",
  },
  {
    id: "big_metric",
    name: "Métrica de Alto Impacto",
    desc: "Número gigante validado (+340%) con titular explicativo.",
  },
  {
    id: "bold_highlighter",
    name: "Bold Highlighter B2B",
    desc: "Titular masivo con cinta violeta / highlight al estilo Pinterest.",
  },
];

export const BRAND_PRESETS = [
  { name: "InHubFlow Cyan", color: "#0099ff" },
  { name: "Indigo Tech", color: "#6366f1" },
  { name: "Esmeralda B2B", color: "#10b981" },
  { name: "Ámbar Viral", color: "#f59e0b" },
  { name: "Fucsia Creator", color: "#ec4899" },
  { name: "Violeta Canva", color: "#7058FE" },
  { name: "Blanco Puro", color: "#ffffff" },
];

export interface ElementFormatting {
  fontFamily?: string;
  fontSize?: number;
  color?: string;
  fontWeight?: string;
  fontStyle?: "normal" | "italic";
  textDecoration?: "none" | "underline" | "line-through";
  textTransform?: "none" | "uppercase" | "lowercase";
  textAlign?: "left" | "center" | "right";
  lineHeight?: number;
  letterSpacing?: number;
  bgColor?: string;
  borderColor?: string;
  borderWidth?: number;
  borderRadius?: number;
  opacity?: number;
}

export interface CustomCanvasElement {
  id: string;
  type:
    | "heading"
    | "subheading"
    | "text"
    | "highlight"
    | "badge"
    | "arrow"
    | "shape_rect"
    | "shape_circle"
    | "shape_star"
    | "shape_pill"
    | "shape_line";
  content?: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  scale?: number;
  color?: string;
  bgColor?: string;
  borderColor?: string;
  borderWidth?: number;
  borderRadius?: number;
  opacity?: number;
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: string;
  fontStyle?: "normal" | "italic";
  textDecoration?: "none" | "underline" | "line-through";
  textTransform?: "none" | "uppercase" | "lowercase";
  textAlign?: "left" | "center" | "right";
  lineHeight?: number;
  letterSpacing?: number;
}

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
  titlePrefix?: string;
  highlightText?: string;
  titleSuffix?: string;
  offsets?: Record<string, { x: number; y: number }>;
  scales?: Record<string, number>;
  hiddenElements?: Record<string, boolean>;
  customElements?: CustomCanvasElement[];
  elementStyles?: Record<string, ElementFormatting>;
}

/** Extrae de forma inteligente las tres partes del titular para la plantilla Bold Highlighter */
function getTitleParts(slide: CarouselSlideItem) {
  if (slide.highlightText) {
    return {
      prefix: slide.titlePrefix || "el 90% de los",
      highlight: slide.highlightText,
      suffix: slide.titleSuffix || "terminan en la papelera",
    };
  }
  const match = (slide.title || "").match(/^(.*?)\[(.*?)\](.*?)$/);
  if (match) {
    return {
      prefix: match[1].trim() || "el 90% de los",
      highlight: match[2].trim() || "mensajes b2b",
      suffix: match[3].trim().replace(/\.$/, "") || "terminan en la papelera",
    };
  }
  const words = (slide.title || "").split(" ").filter(Boolean);
  if (words.length >= 4) {
    return {
      prefix: words.slice(0, 2).join(" "),
      highlight: words.slice(2, 4).join(" "),
      suffix: words.slice(4).join(" ").replace(/\.$/, ""),
    };
  }
  return {
    prefix: "el 90% de los",
    highlight: "mensajes b2b",
    suffix: "terminan en la papelera",
  };
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
    id: "executive_tablet_night",
    name: "Ejecutivo B2B & Tablet",
    tags: ["ejecutivo", "tablet", "b2b", "oficina", "noche", "estrategia"],
    thumb: "https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=400&q=70",
    url: "https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=1200&q=85",
  },
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

  const ctx = useContext(SlideCanvasContext);
  const format = ctx?.currentSlide.elementStyles?.[elementKey];

  const computedStyle: React.CSSProperties = {
    ...style,
    ...(format?.fontFamily ? { fontFamily: format.fontFamily } : {}),
    ...(format?.fontSize ? { fontSize: `${format.fontSize}px` } : {}),
    ...(format?.color ? { color: format.color } : {}),
    ...(format?.fontWeight ? { fontWeight: format.fontWeight } : {}),
    ...(format?.fontStyle ? { fontStyle: format.fontStyle } : {}),
    ...(format?.textDecoration ? { textDecoration: format.textDecoration } : {}),
    ...(format?.textTransform ? { textTransform: format.textTransform } : {}),
    ...(format?.textAlign ? { textAlign: format.textAlign } : {}),
    ...(format?.lineHeight ? { lineHeight: format.lineHeight } : {}),
    ...(format?.letterSpacing !== undefined ? { letterSpacing: `${format.letterSpacing}px` } : {}),
    ...(format?.bgColor ? { backgroundColor: format.bgColor } : {}),
  };

  return (
    <Component
      ref={ref as any}
      contentEditable={!isExporting}
      suppressContentEditableWarning
      spellCheck={false}
      style={computedStyle}
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

/** Contexto de lienzo para sincronizar transformaciones, escalas y visibilidad */
interface SlideCanvasContextType {
  isFreeMode: boolean;
  isExporting: boolean;
  currentSlide: CarouselSlideItem;
  selectedElement: string | null;
  onSelectElement?: (id: string) => void;
  onOffsetChange?: (id: string, offset: { x: number; y: number }) => void;
  onScaleChange?: (id: string, scale: number) => void;
  onDeleteElement?: (id: string) => void;
  onDuplicateElement?: (id: string) => void;
  onStyleChange?: (id: string, styles: Partial<ElementFormatting>) => void;
}

const SlideCanvasContext = createContext<SlideCanvasContextType | null>(null);

/**
 * Componente envoltorio de Capa Arrastrable (Drag & Drop nativo con PointerEvents)
 * Permite mover, escalar con manijas de esquina (estilo Canva), duplicar y ocultar cualquier elemento
 */
interface DraggableWrapperProps {
  id: string;
  isFreeMode?: boolean;
  offset?: { x: number; y: number };
  onOffsetChange?: (id: string, newOffset: { x: number; y: number }) => void;
  scale?: number;
  onScaleChange?: (id: string, newScale: number) => void;
  isHidden?: boolean;
  onDelete?: (id: string) => void;
  onDuplicate?: (id: string) => void;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  isExporting?: boolean;
  label?: string;
  isSelected?: boolean;
  onSelect?: () => void;
}

function DraggableWrapper(props: DraggableWrapperProps) {
  const ctx = useContext(SlideCanvasContext);
  const id = props.id;
  const isFreeMode = props.isFreeMode ?? ctx?.isFreeMode ?? false;
  const isExporting = props.isExporting ?? ctx?.isExporting ?? false;
  const offset = props.offset ?? ctx?.currentSlide.offsets?.[id] ?? { x: 0, y: 0 };
  const scale = props.scale ?? ctx?.currentSlide.scales?.[id] ?? 1;
  const isHidden = props.isHidden ?? Boolean(ctx?.currentSlide.hiddenElements?.[id]);
  const onOffsetChange = props.onOffsetChange ?? ctx?.onOffsetChange;
  const onScaleChange = props.onScaleChange ?? ctx?.onScaleChange;
  const onDelete = props.onDelete ?? ctx?.onDeleteElement;
  const onDuplicate = props.onDuplicate ?? ctx?.onDuplicateElement;
  const onSelect = props.onSelect ?? (() => ctx?.onSelectElement?.(id));
  const isSelected = props.isSelected ?? (ctx?.selectedElement === id);

  const [isDragging, setIsDragging] = useState(false);
  const dragStartPos = useRef({ x: 0, y: 0 });
  const initialOffset = useRef({ x: 0, y: 0 });

  // Manijas de redimensionamiento en las esquinas estilo Canva
  const [resizingCorner, setResizingCorner] = useState<"nw" | "ne" | "se" | "sw" | null>(null);
  const resizeStartPos = useRef({ x: 0, y: 0 });
  const initialScaleRef = useRef(1);

  if (isHidden) {
    return null;
  }

  const handlePointerDown = (e: React.PointerEvent) => {
    if (!isFreeMode || isExporting) return;
    const target = e.target as HTMLElement;
    const isHandle = target.closest('[data-drag-handle="true"]');
    const isCorner = target.closest('[data-resize-corner="true"]');
    const isControl = target.closest("button") || target.tagName === "BUTTON";
    const isContent = target.isContentEditable;

    if (isControl || isCorner) return;

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
    onOffsetChange?.(id, {
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

  // Manejo de arrastre de esquinas para escalar el elemento (Estilo Canva)
  const handleCornerResizeDown = (corner: "nw" | "ne" | "se" | "sw", e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {}
    setResizingCorner(corner);
    onSelect?.();
    resizeStartPos.current = { x: e.clientX, y: e.clientY };
    initialScaleRef.current = scale ?? 1;
  };

  const handleCornerResizeMove = (e: React.PointerEvent) => {
    if (!resizingCorner) return;
    e.preventDefault();
    e.stopPropagation();
    const dx = e.clientX - resizeStartPos.current.x;
    const dy = e.clientY - resizeStartPos.current.y;

    let delta = 0;
    if (resizingCorner === "se") {
      delta = (dx + dy) / 2;
    } else if (resizingCorner === "nw") {
      delta = -(dx + dy) / 2;
    } else if (resizingCorner === "ne") {
      delta = (dx - dy) / 2;
    } else if (resizingCorner === "sw") {
      delta = -(dx - dy) / 2;
    }

    const nextScale = Math.max(0.3, Math.min(3.0, initialScaleRef.current + delta / 120));
    onScaleChange?.(id, Number(nextScale.toFixed(2)));
  };

  const handleCornerResizeUp = (e: React.PointerEvent) => {
    if (!resizingCorner) return;
    setResizingCorner(null);
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}
  };

  const posX = offset?.x || 0;
  const posY = offset?.y || 0;
  const currentScale = scale ?? 1;
  const hasMoved = posX !== 0 || posY !== 0;
  const hasScaled = currentScale !== 1;
  const positionClass = props.className?.includes("absolute") ? "" : "relative";
  const isCentered =
    props.className?.includes("center") ||
    props.className?.includes("mx-auto") ||
    props.className?.includes("items-center");

  const transformParts: string[] = [];
  if (hasMoved) {
    transformParts.push(`translate(${posX}px, ${posY}px)`);
  }
  if (hasScaled) {
    transformParts.push(`scale(${currentScale})`);
  }

  return (
    <div
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      style={{
        ...props.style,
        transform: transformParts.join(" ") || undefined,
        transformOrigin: isCentered ? "center center" : "top left",
        touchAction: isFreeMode ? "none" : undefined,
      }}
      className={`${positionClass} transition-transform duration-75 ${
        isFreeMode && !isExporting
          ? `group/drag ${
              isDragging
                ? "ring-2 ring-brand-400 bg-brand-500/10 shadow-2xl z-50 cursor-grabbing"
                : isSelected
                ? "ring-2 ring-brand-400 ring-offset-1 ring-offset-transparent z-40"
                : "hover:ring-1 hover:ring-brand-400/60 hover:bg-white/5 z-20"
            }`
          : ""
      } ${props.className || ""}`}
    >
      {/* 4 Manijas de Esquina estilo Canva para redimensionar arrastrando */}
      {isFreeMode && isSelected && !isExporting && id !== "bg-photo" && (
        <>
          <div
            data-resize-corner="true"
            onPointerDown={(e) => handleCornerResizeDown("nw", e)}
            onPointerMove={handleCornerResizeMove}
            onPointerUp={handleCornerResizeUp}
            title="Arrastra para redimensionar"
            className="absolute -top-1.5 -left-1.5 size-3 rounded-full bg-white border-2 border-brand-500 shadow-md cursor-nwse-resize z-50 hover:scale-125 transition-transform"
          />
          <div
            data-resize-corner="true"
            onPointerDown={(e) => handleCornerResizeDown("ne", e)}
            onPointerMove={handleCornerResizeMove}
            onPointerUp={handleCornerResizeUp}
            title="Arrastra para redimensionar"
            className="absolute -top-1.5 -right-1.5 size-3 rounded-full bg-white border-2 border-brand-500 shadow-md cursor-nesw-resize z-50 hover:scale-125 transition-transform"
          />
          <div
            data-resize-corner="true"
            onPointerDown={(e) => handleCornerResizeDown("se", e)}
            onPointerMove={handleCornerResizeMove}
            onPointerUp={handleCornerResizeUp}
            title="Arrastra para redimensionar"
            className="absolute -bottom-1.5 -right-1.5 size-3 rounded-full bg-white border-2 border-brand-500 shadow-md cursor-nwse-resize z-50 hover:scale-125 transition-transform"
          />
          <div
            data-resize-corner="true"
            onPointerDown={(e) => handleCornerResizeDown("sw", e)}
            onPointerMove={handleCornerResizeMove}
            onPointerUp={handleCornerResizeUp}
            title="Arrastra para redimensionar"
            className="absolute -bottom-1.5 -left-1.5 size-3 rounded-full bg-white border-2 border-brand-500 shadow-md cursor-nesw-resize z-50 hover:scale-125 transition-transform"
          />
        </>
      )}

      {/* Barra flotante contextual de Canva sobre el elemento */}
      {isFreeMode && !isExporting && (
        <div
          data-drag-handle="true"
          className={`absolute -top-9 left-1/2 -translate-x-1/2 px-2.5 py-1 rounded-xl bg-slate-950/95 border border-brand-400 text-white flex items-center gap-2 shadow-2xl select-none z-50 transition-all ${
            isSelected || isDragging
              ? "opacity-100 scale-100 pointer-events-auto"
              : "opacity-0 group-hover/drag:opacity-100 scale-95 pointer-events-none group-hover/drag:pointer-events-auto"
          }`}
        >
          <div className="flex items-center gap-1 cursor-grab active:cursor-grabbing text-brand-300 font-bold text-[10px]">
            <GripHorizontal className="size-3 text-brand-400" />
            <span>{props.label || "Elemento"}</span>
          </div>

          {/* Botones de tamaño (-10% / +10%) */}
          {onScaleChange && (
            <div className="flex items-center gap-0.5 border-l border-white/20 pl-1.5">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  const next = Math.max(0.3, Number((currentScale - 0.1).toFixed(2)));
                  onScaleChange(id, next);
                }}
                className="size-5 rounded hover:bg-white/20 flex items-center justify-center text-xs font-bold text-white hover:text-brand-300 transition"
                title="Achicar (-10%)"
              >
                -
              </button>
              <span className="text-[10px] font-mono text-brand-300 font-bold min-w-[32px] text-center">
                {Math.round(currentScale * 100)}%
              </span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  const next = Math.min(3.0, Number((currentScale + 0.1).toFixed(2)));
                  onScaleChange(id, next);
                }}
                className="size-5 rounded hover:bg-white/20 flex items-center justify-center text-xs font-bold text-white hover:text-brand-300 transition"
                title="Agrandar (+10%)"
              >
                +
              </button>
            </div>
          )}

          {/* Botón Duplicar (Canva Clone) */}
          {onDuplicate && id !== "bg-photo" && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDuplicate(id);
              }}
              className="size-5 rounded hover:bg-white/20 text-gray-300 hover:text-white flex items-center justify-center transition border-l border-white/20 pl-1 ml-0.5"
              title="Duplicar este elemento"
            >
              <Copy className="size-3" />
            </button>
          )}

          {/* Botón Eliminar */}
          {onDelete && id !== "bg-photo" && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(id);
              }}
              className="size-5 rounded hover:bg-red-500/30 text-gray-400 hover:text-red-400 flex items-center justify-center transition border-l border-white/20 pl-1 ml-0.5"
              title="Eliminar este elemento"
            >
              <Trash2 className="size-3" />
            </button>
          )}
        </div>
      )}
      {props.children}
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
  const [bgScale, setBgScale] = useState(1.15);
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
  const [activeDockTab, setActiveDockTab] = useState<CanvaDockTab>("templates");
  const [isDrawerOpen, setIsDrawerOpen] = useState(true);
  const [canvasZoom, setCanvasZoom] = useState(0.82);
  const [activeToolbarPopup, setActiveToolbarPopup] = useState<"color" | "spacing" | "shape_fill" | "shape_border" | null>(null);

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

  // Manejador de escala / tamaño para elementos individuales
  const handleScaleChange = (elementId: string, newScale: number) => {
    setSlides((prev) => {
      const next = [...prev];
      const current = next[currentSlideIndex];
      const prevScales = current.scales || {};
      next[currentSlideIndex] = {
        ...current,
        scales: {
          ...prevScales,
          [elementId]: newScale,
        },
      };
      return next;
    });
  };

  // Manejador para aplicar estilos / formato a cualquier elemento seleccionado (Texto o Formas)
  const handleStyleChange = (elementId: string, newStyles: Partial<ElementFormatting>) => {
    setSlides((prev) => {
      const next = [...prev];
      const cur = next[currentSlideIndex];
      const prevStyles = cur.elementStyles || {};
      const existing = prevStyles[elementId] || {};
      next[currentSlideIndex] = {
        ...cur,
        elementStyles: {
          ...prevStyles,
          [elementId]: {
            ...existing,
            ...newStyles,
          },
        },
      };
      return next;
    });

    // Si es un elemento personalizado, también sincronizamos sus propiedades directas
    setSlides((prev) => {
      const next = [...prev];
      const cur = next[currentSlideIndex];
      const custom = cur.customElements?.find((e) => e.id === elementId);
      if (custom) {
        const updatedList = (cur.customElements || []).map((el) => {
          if (el.id === elementId) {
            return {
              ...el,
              ...newStyles,
            };
          }
          return el;
        });
        next[currentSlideIndex] = {
          ...cur,
          customElements: updatedList,
        };
      }
      return next;
    });
  };

  // Manejador para añadir formas geométricas básicas (estilo Canva)
  const handleAddShape = (shapeType: "shape_rect" | "shape_circle" | "shape_star" | "shape_pill" | "shape_line") => {
    setIsFreeMode(true);
    const newId = `elem-${Date.now()}`;
    let newShape: CustomCanvasElement;

    if (shapeType === "shape_rect") {
      newShape = {
        id: newId,
        type: "shape_rect",
        x: 50,
        y: 150,
        width: 140,
        height: 90,
        scale: 1,
        bgColor: "rgba(255, 255, 255, 0.12)",
        borderColor: accentColor,
        borderWidth: 2,
        borderRadius: 16,
        opacity: 1,
      };
    } else if (shapeType === "shape_circle") {
      newShape = {
        id: newId,
        type: "shape_circle",
        x: 80,
        y: 150,
        width: 90,
        height: 90,
        scale: 1,
        bgColor: accentColor,
        borderColor: "rgba(255, 255, 255, 0.3)",
        borderWidth: 0,
        borderRadius: 9999,
        opacity: 0.9,
      };
    } else if (shapeType === "shape_star") {
      newShape = {
        id: newId,
        type: "shape_star",
        x: 90,
        y: 150,
        width: 64,
        height: 64,
        scale: 1,
        bgColor: "#f59e0b",
        borderColor: "transparent",
        borderWidth: 0,
        opacity: 1,
      };
    } else if (shapeType === "shape_pill") {
      newShape = {
        id: newId,
        type: "shape_pill",
        content: "DESTACADO B2B",
        x: 50,
        y: 120,
        width: 150,
        height: 38,
        scale: 1,
        bgColor: "rgba(255, 255, 255, 0.15)",
        borderColor: accentColor,
        borderWidth: 1,
        borderRadius: 9999,
        opacity: 1,
      };
    } else {
      newShape = {
        id: newId,
        type: "shape_line",
        x: 50,
        y: 200,
        width: 220,
        height: 3,
        scale: 1,
        bgColor: accentColor,
        borderWidth: 3,
        opacity: 0.8,
      };
    }

    setSlides((prev) => {
      const next = [...prev];
      const cur = next[currentSlideIndex];
      const curList = cur.customElements || [];
      next[currentSlideIndex] = {
        ...cur,
        customElements: [...curList, newShape],
      };
      return next;
    });
    setSelectedElement(newId);
  };

  // Manejador para añadir un nuevo elemento personalizado al lienzo (estilo Canva)
  const handleAddCustomElement = (type: CustomCanvasElement["type"]) => {
    setIsFreeMode(true);
    const newId = `elem-${Date.now()}`;
    let newElement: CustomCanvasElement;

    if (type === "heading") {
      newElement = {
        id: newId,
        type: "heading",
        content: "Nuevo Titular B2B",
        x: 35,
        y: 120,
        scale: 1,
        fontSize: 26,
        fontWeight: "bold",
        color: "#ffffff",
      };
    } else if (type === "subheading") {
      newElement = {
        id: newId,
        type: "subheading",
        content: "Subtítulo explicativo de alto impacto",
        x: 35,
        y: 180,
        scale: 1,
        fontSize: 17,
        fontWeight: "600",
        color: "#cbd5e1",
      };
    } else if (type === "text") {
      newElement = {
        id: newId,
        type: "text",
        content: "Escribe aquí una explicación, dato clave o reflexión para tu audiencia...",
        x: 35,
        y: 220,
        scale: 1,
        fontSize: 13,
        color: "#94a3b8",
      };
    } else if (type === "highlight") {
      newElement = {
        id: newId,
        type: "highlight",
        content: "PALABRA CLAVE",
        x: 35,
        y: 160,
        scale: 1,
        fontSize: 20,
        fontWeight: "bold",
        color: "#ffffff",
        bgColor: accentColor === "#0099ff" ? "#7058FE" : accentColor,
      };
    } else if (type === "badge") {
      newElement = {
        id: newId,
        type: "badge",
        content: "INSIGHT B2B",
        x: 35,
        y: 40,
        scale: 1,
        fontSize: 11,
        fontWeight: "bold",
        color: "#000000",
        bgColor: accentColor,
      };
    } else {
      newElement = {
        id: newId,
        type: "arrow",
        content: "DESLIZA",
        x: 280,
        y: 450,
        scale: 1,
        fontSize: 11,
        fontWeight: "bold",
        color: "#ffffff",
      };
    }

    setSlides((prev) => {
      const next = [...prev];
      const cur = next[currentSlideIndex];
      const curList = cur.customElements || [];
      next[currentSlideIndex] = {
        ...cur,
        customElements: [...curList, newElement],
      };
      return next;
    });
    setSelectedElement(newId);
  };

  // Manejador para actualizar las propiedades de un elemento personalizado
  const handleUpdateCustomElement = (elementId: string, fields: Partial<CustomCanvasElement>) => {
    setSlides((prev) => {
      const next = [...prev];
      const cur = next[currentSlideIndex];
      const curList = (cur.customElements || []).map((el) => {
        if (el.id === elementId) {
          return { ...el, ...fields };
        }
        return el;
      });
      next[currentSlideIndex] = {
        ...cur,
        customElements: curList,
      };
      return next;
    });
  };

  // Manejador para duplicar cualquier elemento en el lienzo (estilo Canva clone)
  const handleDuplicateElement = (elementId: string) => {
    setIsFreeMode(true);
    const newId = `elem-${Date.now()}`;
    const curSlide = slides[currentSlideIndex];
    const existingCustom = curSlide.customElements?.find((e) => e.id === elementId);

    if (existingCustom) {
      const prevOffset = curSlide.offsets?.[elementId] || { x: 0, y: 0 };
      const duplicated: CustomCanvasElement = {
        ...existingCustom,
        id: newId,
        x: existingCustom.x + 20,
        y: existingCustom.y + 20,
      };
      setSlides((prev) => {
        const next = [...prev];
        const cur = next[currentSlideIndex];
        const curList = cur.customElements || [];
        next[currentSlideIndex] = {
          ...cur,
          customElements: [...curList, duplicated],
          offsets: {
            ...(cur.offsets || {}),
            [newId]: { x: prevOffset.x + 20, y: prevOffset.y + 20 },
          },
          scales: {
            ...(cur.scales || {}),
            [newId]: cur.scales?.[elementId] ?? existingCustom.scale ?? 1,
          },
        };
        return next;
      });
      setSelectedElement(newId);
      return;
    }

    // Si es un elemento nativo de la plantilla, lo clonamos como elemento personalizado
    let duplicated: CustomCanvasElement | null = null;
    const currentScale = curSlide.scales?.[elementId] ?? 1;

    if (elementId.includes("title")) {
      duplicated = {
        id: newId,
        type: "heading",
        content: curSlide.title || "Copia de Titular",
        x: 40,
        y: 160,
        scale: currentScale,
      };
    } else if (elementId.includes("subtitle")) {
      duplicated = {
        id: newId,
        type: "text",
        content: curSlide.subtitle || "Copia de Subtítulo",
        x: 40,
        y: 240,
        scale: currentScale,
      };
    } else if (elementId.includes("tag")) {
      duplicated = {
        id: newId,
        type: "badge",
        content: curSlide.tag || "INSIGHT",
        x: 40,
        y: 70,
        scale: currentScale,
        bgColor: accentColor,
      };
    } else if (elementId.includes("highlight")) {
      duplicated = {
        id: newId,
        type: "highlight",
        content: curSlide.highlightText || "DESTACADO",
        x: 40,
        y: 180,
        scale: currentScale,
        bgColor: accentColor === "#0099ff" ? "#7058FE" : accentColor,
      };
    } else {
      duplicated = {
        id: newId,
        type: "text",
        content: "Elemento duplicado",
        x: 40,
        y: 200,
        scale: currentScale,
      };
    }

    if (duplicated) {
      setSlides((prev) => {
        const next = [...prev];
        const cur = next[currentSlideIndex];
        const curList = cur.customElements || [];
        next[currentSlideIndex] = {
          ...cur,
          customElements: [...curList, duplicated!],
        };
        return next;
      });
      setSelectedElement(newId);
    }
  };

  // Manejador para eliminar permanentemente un elemento personalizado
  const handleDeleteCustomElement = (elementId: string) => {
    setSlides((prev) => {
      const next = [...prev];
      const cur = next[currentSlideIndex];
      const curList = (cur.customElements || []).filter((e) => e.id !== elementId);
      next[currentSlideIndex] = {
        ...cur,
        customElements: curList,
      };
      return next;
    });
    if (selectedElement === elementId) {
      setSelectedElement(null);
    }
  };

  // Manejador para eliminar / ocultar elementos individuales
  const handleDeleteElement = (elementId: string) => {
    if (elementId.startsWith("elem-")) {
      handleDeleteCustomElement(elementId);
      return;
    }
    setSlides((prev) => {
      const next = [...prev];
      const current = next[currentSlideIndex];
      const prevHidden = current.hiddenElements || {};
      next[currentSlideIndex] = {
        ...current,
        hiddenElements: {
          ...prevHidden,
          [elementId]: true,
        },
      };
      return next;
    });
    if (selectedElement === elementId) {
      setSelectedElement(null);
    }
  };

  // Restaurar elementos que fueron eliminados u ocultados
  const handleRestoreHiddenElements = () => {
    updateCurrentSlide({ hiddenElements: {} });
  };

  // Restablecer todas las personalizaciones (posiciones, escalas y visibilidad)
  const handleResetSlideCustomizations = () => {
    updateCurrentSlide({
      offsets: {},
      scales: {},
      hiddenElements: {},
    });
  };

  const handleResetOffsets = () => {
    handleResetSlideCustomizations();
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

  // Helpers contextuales para la barra de herramientas superior estilo Canva
  const isCustom = Boolean(selectedElement?.startsWith("elem-"));
  const customElem = isCustom ? currentSlide.customElements?.find((e) => e.id === selectedElement) : null;
  const isShape = Boolean(
    customElem &&
    (customElem.type === "shape_rect" ||
      customElem.type === "shape_circle" ||
      customElem.type === "shape_star" ||
      customElem.type === "shape_pill" ||
      customElem.type === "shape_line")
  );
  const isText = Boolean(
    !isShape &&
    selectedElement &&
    selectedElement !== "background" &&
    selectedElement !== "brand" &&
    selectedElement !== "bg-photo" &&
    selectedElement !== "editorial-card" &&
    selectedElement !== "quote-card" &&
    selectedElement !== "feed-card"
  );
  const currentFormat: ElementFormatting = (selectedElement && currentSlide.elementStyles?.[selectedElement]) || {};
  const defaultFontSize = (
    selectedElement?.includes("title") ? 28 :
    selectedElement?.includes("subtitle") ? 18 :
    selectedElement?.includes("tag") ? 12 :
    selectedElement?.includes("metric") ? 42 :
    customElem?.fontSize ? customElem.fontSize :
    14
  );
  const currentFontSize = currentFormat.fontSize || defaultFontSize;

  return (
    <div className="fixed inset-0 z-50 w-screen h-screen overflow-hidden flex flex-col bg-slate-950 text-white select-none animate-in fade-in duration-150">
      
      {/* 1. BARRA SUPERIOR CANVA (HEADER SLIM - 48px) */}
      <header className="h-12 border-b border-slate-800 bg-slate-900/95 px-4 flex items-center justify-between shrink-0 select-none z-30">
        <div className="flex items-center gap-3">
          <div className="size-8 rounded-lg bg-gradient-to-tr from-brand-500 to-indigo-600 flex items-center justify-center text-white shadow-md">
            <Sparkles className="size-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-bold text-white tracking-wide">
                Estudio Gráfico InHubFlow
              </h1>
              <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-bold uppercase">
                MOTOR AUTO-LAYOUT HD
              </span>
            </div>
          </div>
        </div>

        {/* Switch Modo: Imagen Única vs Carrusel & Selector Aspecto */}
        <div className="flex items-center gap-2">
          <div className="flex items-center p-0.5 rounded-lg bg-slate-800 border border-slate-700">
            <button
              type="button"
              onClick={() => setEditorMode("single")}
              className={`px-3 py-1 rounded-md text-xs font-semibold transition ${
                editorMode === "single"
                  ? "bg-brand-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Imagen Única
            </button>
            <button
              type="button"
              onClick={() => setEditorMode("carousel")}
              className={`px-3 py-1 rounded-md text-xs font-semibold transition ${
                editorMode === "carousel"
                  ? "bg-brand-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Carrusel PDF ({slides.length})
            </button>
          </div>

          <div className="flex items-center p-0.5 rounded-lg bg-slate-800 border border-slate-700">
            <button
              type="button"
              onClick={() => setAspectRatio("4:5")}
              className={`px-2.5 py-1 rounded-md text-xs font-mono font-semibold transition ${
                aspectRatio === "4:5"
                  ? "bg-slate-700 text-white"
                  : "text-slate-400 hover:text-white"
              }`}
              title="Vertical 4:5 (1080 × 1350px) - Máxima visibilidad móvil"
            >
              Vertical 4:5
            </button>
            <button
              type="button"
              onClick={() => setAspectRatio("1:1")}
              className={`px-2.5 py-1 rounded-md text-xs font-mono font-semibold transition ${
                aspectRatio === "1:1"
                  ? "bg-slate-700 text-white"
                  : "text-slate-400 hover:text-white"
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
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs font-semibold border border-slate-700 transition"
            title="Descargar lámina como PNG de alta resolución"
          >
            <Download className="size-3.5 text-brand-400" />
            <span>Lámina PNG</span>
          </button>

          {editorMode === "carousel" && (
            <button
              type="button"
              disabled={isExporting}
              onClick={handleExportPdf}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs font-semibold border border-slate-700 transition"
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
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-brand-600 to-indigo-600 hover:brightness-110 text-white text-xs font-bold shadow-md transition"
            title="Adjuntar este diseño al post de LinkedIn en el compositor"
          >
            <Check className="size-4" />
            <span>Aplicar al Post</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition ml-1"
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

      {/* CUERPO PRINCIPAL DEL ESTUDIO GRÁFICO (HORIZONTAL: DOCK + DRAWER + STAGE) */}
      <div className="flex-1 flex overflow-hidden relative">
        
        {/* 1. DOCK VERTICAL IZQUIERDO DE ICONOS (ESTILO CANVA - 68px) */}
        <aside className="w-[68px] min-w-[68px] bg-slate-950 border-r border-slate-800 flex flex-col items-center py-3 gap-1 shrink-0 z-30 select-none">
          <button
            type="button"
            onClick={() => {
              if (activeDockTab === "templates" && isDrawerOpen) {
                setIsDrawerOpen(false);
              } else {
                setActiveDockTab("templates");
                setIsDrawerOpen(true);
              }
            }}
            className={`w-[54px] py-2.5 rounded-xl flex flex-col items-center justify-center gap-1 transition ${
              activeDockTab === "templates" && isDrawerOpen
                ? "bg-brand-600 text-white shadow-md font-bold"
                : "text-slate-400 hover:text-white hover:bg-slate-900"
            }`}
            title="Plantillas prediseñadas"
          >
            <Layers className="size-5" />
            <span className="text-[10px] tracking-tight">Templates</span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (activeDockTab === "text" && isDrawerOpen) {
                setIsDrawerOpen(false);
              } else {
                setActiveDockTab("text");
                setIsDrawerOpen(true);
              }
            }}
            className={`w-[54px] py-2.5 rounded-xl flex flex-col items-center justify-center gap-1 transition ${
              activeDockTab === "text" && isDrawerOpen
                ? "bg-brand-600 text-white shadow-md font-bold"
                : "text-slate-400 hover:text-white hover:bg-slate-900"
            }`}
            title="Tipografías y textos"
          >
            <Type className="size-5" />
            <span className="text-[10px] tracking-tight">Texto</span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (activeDockTab === "elements" && isDrawerOpen) {
                setIsDrawerOpen(false);
              } else {
                setActiveDockTab("elements");
                setIsDrawerOpen(true);
              }
            }}
            className={`w-[54px] py-2.5 rounded-xl flex flex-col items-center justify-center gap-1 transition ${
              activeDockTab === "elements" && isDrawerOpen
                ? "bg-brand-600 text-white shadow-md font-bold"
                : "text-slate-400 hover:text-white hover:bg-slate-900"
            }`}
            title="Formas y elementos geométricos"
          >
            <Shapes className="size-5" />
            <span className="text-[10px] tracking-tight">Elementos</span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (activeDockTab === "photos" && isDrawerOpen) {
                setIsDrawerOpen(false);
              } else {
                setActiveDockTab("photos");
                setIsDrawerOpen(true);
              }
            }}
            className={`w-[54px] py-2.5 rounded-xl flex flex-col items-center justify-center gap-1 transition ${
              activeDockTab === "photos" && isDrawerOpen
                ? "bg-brand-600 text-white shadow-md font-bold"
                : "text-slate-400 hover:text-white hover:bg-slate-900"
            }`}
            title="Galería de fotos curadas"
          >
            <ImageIcon className="size-5" />
            <span className="text-[10px] tracking-tight">Fotos</span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (activeDockTab === "backgrounds" && isDrawerOpen) {
                setIsDrawerOpen(false);
              } else {
                setActiveDockTab("backgrounds");
                setIsDrawerOpen(true);
              }
            }}
            className={`w-[54px] py-2.5 rounded-xl flex flex-col items-center justify-center gap-1 transition ${
              activeDockTab === "backgrounds" && isDrawerOpen
                ? "bg-brand-600 text-white shadow-md font-bold"
                : "text-slate-400 hover:text-white hover:bg-slate-900"
            }`}
            title="Fondos, degradados y colores de marca"
          >
            <Palette className="size-5" />
            <span className="text-[10px] tracking-tight">Fondos</span>
          </button>
        </aside>

        {/* 2. FLYOUT DRAWER DESPLEGABLE (ESTILO CANVA - 330px) */}
        <div
          className={`relative bg-slate-900 border-r border-slate-800 flex flex-col h-full shrink-0 z-20 transition-all duration-200 select-text ${
            isDrawerOpen ? "w-[330px] min-w-[330px]" : "w-0 min-w-0 overflow-hidden border-none"
          }`}
        >
          {/* Botón flotante para colapsar/desplegar el panel lateral */}
          <button
            type="button"
            onClick={() => setIsDrawerOpen(!isDrawerOpen)}
            className="absolute -right-3.5 top-1/2 -translate-y-1/2 z-40 size-7 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-600 shadow-xl flex items-center justify-center transition"
            title={isDrawerOpen ? "Ocultar panel lateral" : "Mostrar panel lateral"}
          >
            {isDrawerOpen ? <ChevronLeft className="size-4" /> : <ChevronRight className="size-4" />}
          </button>

          {/* CONTENIDO DEL DRAWER SEGÚN LA PESTAÑA ACTIVA */}
          <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4">
            
            {/* PESTAÑA 1: TEMPLATES */}
            {activeDockTab === "templates" && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-bold text-white">Plantillas para LinkedIn</h3>
                  <p className="text-xs text-slate-400">
                    Cambia la estructura visual. Tus textos y fotos se mantendrán intactos.
                  </p>
                </div>

                <div className="space-y-2">
                  {TEMPLATES.map((tpl) => (
                    <button
                      key={tpl.id}
                      type="button"
                      onClick={() => setSelectedTemplate(tpl.id)}
                      className={`w-full text-left p-3 rounded-xl border transition flex items-start gap-3 ${
                        selectedTemplate === tpl.id
                          ? "border-brand-500 bg-brand-500/15 shadow-sm ring-1 ring-brand-500/30"
                          : "border-slate-800 bg-slate-950/60 hover:bg-slate-800 hover:border-slate-700"
                      }`}
                    >
                      <div className="size-9 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-brand-400 shrink-0">
                        {tpl.id === "editorial" && <Layers className="size-4" />}
                        {tpl.id === "authority_quote" && <Quote className="size-4" />}
                        {tpl.id === "social_card" && <User className="size-4" />}
                        {tpl.id === "split_focus" && <SplitSquareVertical className="size-4" />}
                        {tpl.id === "big_metric" && <Sparkles className="size-4" />}
                        {tpl.id === "bold_highlighter" && <Tag className="size-4 text-purple-400" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-white text-xs">{tpl.name}</span>
                          {tpl.id === "bold_highlighter" && (
                            <span className="text-[9px] bg-purple-500/20 text-purple-300 px-1.5 py-0.2 rounded font-bold">NUEVO</span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400 line-clamp-2 mt-0.5 leading-relaxed">
                          {tpl.desc}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* PESTAÑA 2: TEXTO */}
            {activeDockTab === "text" && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-bold text-white">Añadir Texto al Diseño</h3>
                  <p className="text-xs text-slate-400">
                    Inserta nuevos titulares, párrafos o etiquetas de alto impacto con un clic.
                  </p>
                </div>

                {/* Botones de acción rápida estilo Canva Text Panel */}
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => handleAddCustomElement("heading")}
                    className="w-full py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-750 text-white font-extrabold text-left text-base border border-slate-700 hover:border-slate-600 transition shadow-sm flex items-center justify-between group"
                  >
                    <span>+ Añadir un título</span>
                    <Type className="size-4 text-slate-400 group-hover:text-white" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleAddCustomElement("subheading")}
                    className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 font-bold text-left text-sm border border-slate-700 hover:border-slate-600 transition shadow-sm flex items-center justify-between group"
                  >
                    <span>+ Añadir un subtítulo</span>
                    <Type className="size-3.5 text-slate-400 group-hover:text-white" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleAddCustomElement("text")}
                    className="w-full py-2 px-4 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 font-normal text-left text-xs border border-slate-700 hover:border-slate-600 transition shadow-sm flex items-center justify-between group"
                  >
                    <span>+ Añadir texto de párrafo</span>
                    <AlignLeft className="size-3.5 text-slate-400 group-hover:text-white" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleAddCustomElement("highlight")}
                    className="w-full py-2.5 px-4 rounded-xl bg-purple-950/40 hover:bg-purple-900/40 text-purple-200 font-bold text-left text-xs border border-purple-800/60 transition shadow-sm flex items-center justify-between group"
                  >
                    <span>+ Resaltador con fondo violeta</span>
                    <Tag className="size-3.5 text-purple-400" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleAddCustomElement("badge")}
                    className="w-full py-2 px-4 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 font-bold text-left text-xs border border-slate-700 transition flex items-center justify-between"
                  >
                    <span>+ Píldora / Etiqueta B2B</span>
                    <Sparkles className="size-3.5 text-brand-400" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleAddCustomElement("arrow")}
                    className="w-full py-2 px-4 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 font-bold text-left text-xs border border-slate-700 transition flex items-center justify-between"
                  >
                    <span>+ Flecha / Indicador "DESLIZA"</span>
                    <ArrowRight className="size-3.5 text-slate-400" />
                  </button>
                </div>

                {/* Tipografía Global del Diseño */}
                <div className="pt-3 border-t border-slate-800 space-y-2">
                  <label className="text-xs font-semibold text-slate-300">Tipografía Global de Lámina</label>
                  <select
                    value={selectedFont}
                    onChange={(e) => setSelectedFont(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-xs font-medium text-white focus:outline-none focus:border-brand-500"
                  >
                    {AVAILABLE_FONTS.map((font) => (
                      <option key={font.name} value={font.name}>
                        {font.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Firma de Autor */}
                <div className="pt-3 border-t border-slate-800 space-y-3">
                  <label className="text-xs font-semibold text-slate-300">Firma de Autor en Láminas</label>
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={nameText}
                      onChange={(e) => {
                        setNameText(e.target.value);
                        updateCurrentSlide({ authorName: e.target.value });
                      }}
                      placeholder="Nombre del autor"
                      className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none"
                    />
                    <input
                      type="text"
                      value={handleText}
                      onChange={(e) => {
                        setHandleText(e.target.value);
                        updateCurrentSlide({ authorHandle: e.target.value });
                      }}
                      placeholder="@usuario"
                      className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* PESTAÑA 3: ELEMENTOS */}
            {activeDockTab === "elements" && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-bold text-white">Formas y Elementos</h3>
                  <p className="text-xs text-slate-400">
                    Inserta figuras geométricas vectoriales y personaliza su relleno o bordes.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => handleAddShape("shape_rect")}
                    className="p-3.5 rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-700 hover:border-brand-500/50 flex flex-col items-center justify-center gap-2 group transition"
                  >
                    <Square className="size-7 text-slate-300 group-hover:text-brand-400 transition" />
                    <span className="text-xs font-semibold text-slate-200">Rectángulo</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleAddShape("shape_circle")}
                    className="p-3.5 rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-700 hover:border-brand-500/50 flex flex-col items-center justify-center gap-2 group transition"
                  >
                    <Circle className="size-7 text-slate-300 group-hover:text-brand-400 transition" />
                    <span className="text-xs font-semibold text-slate-200">Círculo</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleAddShape("shape_star")}
                    className="p-3.5 rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-700 hover:border-amber-500/50 flex flex-col items-center justify-center gap-2 group transition"
                  >
                    <Star className="size-7 text-amber-400 group-hover:scale-110 transition" />
                    <span className="text-xs font-semibold text-slate-200">Estrella</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleAddShape("shape_pill")}
                    className="p-3.5 rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-700 hover:border-brand-500/50 flex flex-col items-center justify-center gap-2 group transition"
                  >
                    <div className="w-10 h-4 rounded-full border border-brand-400 bg-brand-500/20" />
                    <span className="text-xs font-semibold text-slate-200">Píldora</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleAddShape("shape_line")}
                    className="col-span-2 p-3 rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-700 hover:border-brand-500/50 flex items-center justify-center gap-3 group transition"
                  >
                    <Minus className="size-5 text-brand-400" />
                    <span className="text-xs font-semibold text-slate-200">Línea Divisoria</span>
                  </button>
                </div>

                <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 text-[11px] text-slate-400 leading-relaxed">
                  💡 <strong className="text-slate-300">Tip Canva:</strong> Haz clic en cualquier forma en el lienzo para ajustar su relleno, grosor de borde, radio de esquinas u opacidad en la barra superior.
                </div>
              </div>
            )}

            {/* PESTAÑA 4: FOTOS */}
            {activeDockTab === "photos" && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-bold text-white">Fotografías Curadas</h3>
                  <p className="text-xs text-slate-400">
                    Selecciona una fotografía de fondo con estética corporativa de alto impacto.
                  </p>
                </div>

                {/* Buscador */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-slate-400" />
                  <input
                    type="text"
                    value={photoSearchQuery}
                    onChange={(e) => setPhotoSearchQuery(e.target.value)}
                    placeholder="Buscar fotos corporativas..."
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none"
                  />
                </div>

                {/* Filtros de Categoría */}
                <div className="flex flex-wrap gap-1">
                  {[
                    { id: "all", label: "Todas" },
                    { id: "office", label: "Oficina" },
                    { id: "meeting", label: "Reunión" },
                    { id: "founder", label: "Fundador" },
                    { id: "abstract", label: "Minimal" },
                  ].map((tag) => (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => setActivePhotoTag(tag.id)}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold transition ${
                        activePhotoTag === tag.id
                          ? "bg-brand-600 text-white"
                          : "bg-slate-800 text-slate-400 hover:text-white"
                      }`}
                    >
                      {tag.label}
                    </button>
                  ))}
                </div>

                {/* Grid de Fotos */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  {filteredPhotos.map((photo) => (
                    <button
                      key={photo.id}
                      type="button"
                      onClick={() => {
                        setSelectedBgUrl(photo.url);
                        updateCurrentSlide({ bgUrl: photo.url });
                      }}
                      className={`group relative aspect-[4/3] rounded-xl overflow-hidden border transition ${
                        selectedBgUrl === photo.url
                          ? "border-brand-500 ring-2 ring-brand-500/40"
                          : "border-slate-800 hover:border-slate-600"
                      }`}
                    >
                      <img
                        src={photo.url}
                        alt={photo.name}
                        crossOrigin="anonymous"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-1.5">
                        <span className="text-[10px] font-semibold text-white truncate drop-shadow">
                          {photo.name}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* PESTAÑA 5: FONDOS Y MARCA */}
            {activeDockTab === "backgrounds" && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-bold text-white">Fondos y Marca</h3>
                  <p className="text-xs text-slate-400">
                    Ajusta el modo de visualización, la opacidad del fondo y los colores de acento.
                  </p>
                </div>

                {/* Modo de Fondo */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">Modo de Fondo</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setOverlayMode("card")}
                      className={`py-2 px-3 rounded-xl text-xs font-semibold border transition ${
                        overlayMode === "card"
                          ? "bg-brand-600 text-white border-brand-500"
                          : "bg-slate-800 text-slate-400 border-slate-700 hover:text-white"
                      }`}
                    >
                      Modo Tarjeta
                    </button>
                    <button
                      type="button"
                      onClick={() => setOverlayMode("fullscreen")}
                      className={`py-2 px-3 rounded-xl text-xs font-semibold border transition ${
                        overlayMode === "fullscreen"
                          ? "bg-brand-600 text-white border-brand-500"
                          : "bg-slate-800 text-slate-400 border-slate-700 hover:text-white"
                      }`}
                    >
                      Pantalla Completa
                    </button>
                  </div>
                </div>

                {/* Opacidad del Fondo Oscuro */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="font-semibold text-slate-300">Opacidad Fondo Oscuro</span>
                    <span className="font-mono text-brand-400 font-bold">{Math.round(overlayOpacity * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.2"
                    max="0.95"
                    step="0.05"
                    value={overlayOpacity}
                    onChange={(e) => setOverlayOpacity(parseFloat(e.target.value))}
                    className="w-full accent-brand-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                  />
                </div>

                {/* Zoom de la Foto de Fondo */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="font-semibold text-slate-300">Escala Foto de Fondo</span>
                    <span className="font-mono text-brand-400 font-bold">{Math.round(bgScale * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="1.0"
                    max="2.5"
                    step="0.05"
                    value={bgScale}
                    onChange={(e) => setBgScale(parseFloat(e.target.value))}
                    className="w-full accent-brand-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                  />
                </div>

                {/* Colores de Acento de Marca */}
                <div className="space-y-2 pt-2 border-t border-slate-800">
                  <label className="text-xs font-semibold text-slate-300">Color de Acento de Marca</label>
                  <div className="grid grid-cols-3 gap-2">
                    {BRAND_PRESETS.map((p) => (
                      <button
                        key={p.name}
                        type="button"
                        onClick={() => setAccentColor(p.color)}
                        className={`p-2 rounded-xl border flex items-center gap-2 transition ${
                          accentColor === p.color
                            ? "border-white bg-slate-800 shadow-sm"
                            : "border-slate-800 bg-slate-950/60 hover:bg-slate-800"
                        }`}
                      >
                        <span className="size-4 rounded-full border border-white/20 shrink-0" style={{ backgroundColor: p.color }} />
                        <span className="text-[11px] font-semibold text-slate-200 truncate">{p.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 3. ESCENARIO CENTRAL DE DISEÑO (ESTILO CANVA) */}
        <main className="flex-1 flex flex-col bg-[#080c14] overflow-hidden relative min-w-0">
          
          {/* BARRA SUPERIOR DE HERRAMIENTAS CONTEXTUALES (CANVA TOOLBAR - 44px) */}
          <div className="h-11 bg-slate-900/95 border-b border-slate-800 px-4 flex items-center justify-between shrink-0 z-10 select-none text-xs gap-2">
            
            {/* HERRAMIENTAS CONTEXTUALES SEGÚN ELEMENTO SELECCIONADO */}
            <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar py-1">
              
              {/* CASO A: ELEMENTO DE TEXTO SELECCIONADO */}
              {isText && (
                <>
                  {/* Selector de Fuente para el elemento */}
                  <select
                    value={currentFormat.fontFamily || selectedFont}
                    onChange={(e) => handleStyleChange(selectedElement!, { fontFamily: e.target.value })}
                    className="h-7 px-2 bg-slate-800 text-slate-100 rounded-md border border-slate-700 text-xs font-medium focus:outline-none focus:border-brand-500 cursor-pointer max-w-[130px]"
                  >
                    {AVAILABLE_FONTS.map((f) => (
                      <option key={f.name} value={f.name}>
                        {f.label}
                      </option>
                    ))}
                  </select>

                  {/* Tamaño de Fuente - [size] + */}
                  <div className="flex items-center h-7 bg-slate-800 rounded-md border border-slate-700 overflow-hidden">
                    <button
                      type="button"
                      onClick={() => handleStyleChange(selectedElement!, { fontSize: Math.max(8, currentFontSize - 2) })}
                      className="px-2 h-full hover:bg-slate-700 text-slate-300 font-bold"
                      title="Achicar texto"
                    >
                      -
                    </button>
                    <span className="w-9 text-center font-mono text-xs font-bold text-white">
                      {currentFontSize}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleStyleChange(selectedElement!, { fontSize: Math.min(120, currentFontSize + 2) })}
                      className="px-2 h-full hover:bg-slate-700 text-slate-300 font-bold"
                      title="Agrandar texto"
                    >
                      +
                    </button>
                  </div>

                  {/* Color de Texto (A con barra de color) */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setActiveToolbarPopup(activeToolbarPopup === "color" ? null : "color")}
                      className={`h-7 px-2 rounded-md flex flex-col items-center justify-center transition border ${
                        activeToolbarPopup === "color"
                          ? "bg-slate-700 border-brand-500 text-white"
                          : "bg-slate-800 border-slate-700 text-slate-300 hover:text-white"
                      }`}
                      title="Color del texto"
                    >
                      <span className="font-extrabold text-[11px] leading-none">A</span>
                      <span
                        className="h-1 w-3 rounded-full mt-0.5"
                        style={{ backgroundColor: currentFormat.color || "#ffffff" }}
                      />
                    </button>

                    {activeToolbarPopup === "color" && (
                      <div className="absolute top-9 left-0 z-50 p-3 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-56 animate-in fade-in zoom-in-95">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Color de Texto</p>
                        <div className="grid grid-cols-6 gap-1.5 mb-3">
                          {["#ffffff", "#cbd5e1", "#94a3b8", "#000000", "#0099ff", "#7058FE", "#6366f1", "#10b981", "#f59e0b", "#ec4899", accentColor].map((c, i) => (
                            <button
                              key={i}
                              type="button"
                              onClick={() => {
                                handleStyleChange(selectedElement!, { color: c });
                                setActiveToolbarPopup(null);
                              }}
                              className="size-6 rounded-md border border-white/20 shadow-sm transition hover:scale-110"
                              style={{ backgroundColor: c }}
                            />
                          ))}
                        </div>
                        <div className="flex items-center gap-1.5 pt-2 border-t border-slate-800">
                          <span className="text-[10px] text-slate-400 font-mono">Hex:</span>
                          <input
                            type="text"
                            value={currentFormat.color || "#ffffff"}
                            onChange={(e) => handleStyleChange(selectedElement!, { color: e.target.value })}
                            className="flex-1 bg-slate-800 border border-slate-700 rounded px-2 py-0.5 text-xs font-mono text-white"
                          />
                          <input
                            type="color"
                            value={currentFormat.color || "#ffffff"}
                            onChange={(e) => handleStyleChange(selectedElement!, { color: e.target.value })}
                            className="size-6 rounded cursor-pointer bg-transparent border-0"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Negrita B */}
                  <button
                    type="button"
                    onClick={() => {
                      const isBold = currentFormat.fontWeight === "bold";
                      handleStyleChange(selectedElement!, { fontWeight: isBold ? "normal" : "bold" });
                    }}
                    className={`size-7 rounded-md flex items-center justify-center font-bold text-xs border transition ${
                      currentFormat.fontWeight === "bold"
                        ? "bg-brand-500/20 border-brand-500 text-brand-400"
                        : "bg-slate-800 border-slate-700 text-slate-300 hover:text-white"
                    }`}
                    title="Negrita (Bold)"
                  >
                    <Bold className="size-3.5" />
                  </button>

                  {/* Cursiva I */}
                  <button
                    type="button"
                    onClick={() => {
                      const isItalic = currentFormat.fontStyle === "italic";
                      handleStyleChange(selectedElement!, { fontStyle: isItalic ? "normal" : "italic" });
                    }}
                    className={`size-7 rounded-md flex items-center justify-center text-xs border transition ${
                      currentFormat.fontStyle === "italic"
                        ? "bg-brand-500/20 border-brand-500 text-brand-400"
                        : "bg-slate-800 border-slate-700 text-slate-300 hover:text-white"
                    }`}
                    title="Cursiva (Italic)"
                  >
                    <Italic className="size-3.5" />
                  </button>

                  {/* Subrayado U */}
                  <button
                    type="button"
                    onClick={() => {
                      const isUnder = currentFormat.textDecoration === "underline";
                      handleStyleChange(selectedElement!, { textDecoration: isUnder ? "none" : "underline" });
                    }}
                    className={`size-7 rounded-md flex items-center justify-center text-xs border transition ${
                      currentFormat.textDecoration === "underline"
                        ? "bg-brand-500/20 border-brand-500 text-brand-400"
                        : "bg-slate-800 border-slate-700 text-slate-300 hover:text-white"
                    }`}
                    title="Subrayado"
                  >
                    <Underline className="size-3.5" />
                  </button>

                  {/* Tachado S */}
                  <button
                    type="button"
                    onClick={() => {
                      const isStrike = currentFormat.textDecoration === "line-through";
                      handleStyleChange(selectedElement!, { textDecoration: isStrike ? "none" : "line-through" });
                    }}
                    className={`size-7 rounded-md flex items-center justify-center text-xs border transition ${
                      currentFormat.textDecoration === "line-through"
                        ? "bg-brand-500/20 border-brand-500 text-brand-400"
                        : "bg-slate-800 border-slate-700 text-slate-300 hover:text-white"
                    }`}
                    title="Tachado"
                  >
                    <Strikethrough className="size-3.5" />
                  </button>

                  {/* Mayúsculas aA */}
                  <button
                    type="button"
                    onClick={() => {
                      const isUpper = currentFormat.textTransform === "uppercase";
                      handleStyleChange(selectedElement!, { textTransform: isUpper ? "none" : "uppercase" });
                    }}
                    className={`h-7 px-1.5 rounded-md flex items-center justify-center text-xs font-semibold border transition ${
                      currentFormat.textTransform === "uppercase"
                        ? "bg-brand-500/20 border-brand-500 text-brand-400"
                        : "bg-slate-800 border-slate-700 text-slate-300 hover:text-white"
                    }`}
                    title="Alternar Mayúsculas (aA)"
                  >
                    aA
                  </button>

                  {/* Alineación */}
                  <div className="flex items-center bg-slate-800 rounded-md border border-slate-700 p-0.5">
                    <button
                      type="button"
                      onClick={() => handleStyleChange(selectedElement!, { textAlign: "left" })}
                      className={`size-6 rounded flex items-center justify-center transition ${
                        currentFormat.textAlign === "left" || !currentFormat.textAlign
                          ? "bg-slate-700 text-white"
                          : "text-slate-400 hover:text-white"
                      }`}
                      title="Alinear izquierda"
                    >
                      <AlignLeft className="size-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleStyleChange(selectedElement!, { textAlign: "center" })}
                      className={`size-6 rounded flex items-center justify-center transition ${
                        currentFormat.textAlign === "center"
                          ? "bg-slate-700 text-white"
                          : "text-slate-400 hover:text-white"
                      }`}
                      title="Centrar"
                    >
                      <AlignCenter className="size-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleStyleChange(selectedElement!, { textAlign: "right" })}
                      className={`size-6 rounded flex items-center justify-center transition ${
                        currentFormat.textAlign === "right"
                          ? "bg-slate-700 text-white"
                          : "text-slate-400 hover:text-white"
                      }`}
                      title="Alinear derecha"
                    >
                      <AlignRight className="size-3" />
                    </button>
                  </div>

                  {/* Interlineado y Espaciado Popover */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setActiveToolbarPopup(activeToolbarPopup === "spacing" ? null : "spacing")}
                      className={`size-7 rounded-md flex items-center justify-center border transition ${
                        activeToolbarPopup === "spacing"
                          ? "bg-slate-700 border-brand-500 text-white"
                          : "bg-slate-800 border-slate-700 text-slate-300 hover:text-white"
                      }`}
                      title="Espaciado e Interlineado"
                    >
                      <SlidersHorizontal className="size-3.5" />
                    </button>

                    {activeToolbarPopup === "spacing" && (
                      <div className="absolute top-9 left-0 z-50 p-4 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-60 animate-in fade-in zoom-in-95 space-y-3">
                        <div>
                          <div className="flex justify-between text-[11px] font-semibold text-slate-300 mb-1">
                            <span>Interlineado</span>
                            <span className="font-mono text-brand-400">
                              {(currentFormat.lineHeight ?? 1.2).toFixed(2)}
                            </span>
                          </div>
                          <input
                            type="range"
                            min="0.8"
                            max="2.5"
                            step="0.05"
                            value={currentFormat.lineHeight ?? 1.2}
                            onChange={(e) => handleStyleChange(selectedElement!, { lineHeight: parseFloat(e.target.value) })}
                            className="w-full accent-brand-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                          />
                        </div>

                        <div>
                          <div className="flex justify-between text-[11px] font-semibold text-slate-300 mb-1">
                            <span>Interletrado</span>
                            <span className="font-mono text-brand-400">
                              {currentFormat.letterSpacing ?? 0}px
                            </span>
                          </div>
                          <input
                            type="range"
                            min="-2"
                            max="12"
                            step="0.5"
                            value={currentFormat.letterSpacing ?? 0}
                            onChange={(e) => handleStyleChange(selectedElement!, { letterSpacing: parseFloat(e.target.value) })}
                            className="w-full accent-brand-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  <span className="h-4 w-px bg-slate-700 mx-1" />

                  {/* Duplicar y Eliminar */}
                  <button
                    type="button"
                    onClick={() => handleDuplicateElement(selectedElement!)}
                    className="size-7 rounded-md bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition"
                    title="Duplicar texto"
                  >
                    <Copy className="size-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDeleteElement(selectedElement!)}
                    className="size-7 rounded-md bg-slate-800 hover:bg-red-500/20 border border-slate-700 text-slate-400 hover:text-red-400 flex items-center justify-center transition"
                    title="Eliminar texto"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </>
              )}

              {/* CASO B: FORMA GEOMÉTRICA SELECCIONADA */}
              {isShape && (
                <>
                  {/* Relleno */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setActiveToolbarPopup(activeToolbarPopup === "shape_fill" ? null : "shape_fill")}
                      className="h-7 px-2 bg-slate-800 border border-slate-700 rounded-md flex items-center gap-1.5 text-xs text-slate-200 hover:text-white"
                      title="Color de relleno"
                    >
                      <div
                        className="size-3.5 rounded border border-white/20"
                        style={{ backgroundColor: customElem?.bgColor || "rgba(255, 255, 255, 0.2)" }}
                      />
                      <span>Relleno</span>
                    </button>
                    {activeToolbarPopup === "shape_fill" && (
                      <div className="absolute top-9 left-0 z-50 p-3 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-56">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Color de Relleno</p>
                        <div className="grid grid-cols-6 gap-1.5 mb-2">
                          {["rgba(255, 255, 255, 0.12)", "#0099ff", "#7058FE", "#6366f1", "#10b981", "#f59e0b", "#ec4899", "#ffffff", "#000000", "transparent", accentColor].map((c, i) => (
                            <button
                              key={i}
                              type="button"
                              onClick={() => {
                                handleUpdateCustomElement(selectedElement!, { bgColor: c });
                                handleStyleChange(selectedElement!, { bgColor: c });
                                setActiveToolbarPopup(null);
                              }}
                              className="size-6 rounded-md border border-white/20 shadow-sm"
                              style={{ backgroundColor: c }}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Borde */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setActiveToolbarPopup(activeToolbarPopup === "shape_border" ? null : "shape_border")}
                      className="h-7 px-2 bg-slate-800 border border-slate-700 rounded-md flex items-center gap-1.5 text-xs text-slate-200 hover:text-white"
                      title="Color de borde"
                    >
                      <div
                        className="size-3.5 rounded border-2"
                        style={{ borderColor: customElem?.borderColor || accentColor }}
                      />
                      <span>Borde</span>
                    </button>
                    {activeToolbarPopup === "shape_border" && (
                      <div className="absolute top-9 left-0 z-50 p-3 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-56">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Color de Borde</p>
                        <div className="grid grid-cols-6 gap-1.5 mb-2">
                          {["transparent", "#ffffff", "#0099ff", "#7058FE", "#6366f1", "#10b981", "#f59e0b", "#ec4899", accentColor].map((c, i) => (
                            <button
                              key={i}
                              type="button"
                              onClick={() => {
                                handleUpdateCustomElement(selectedElement!, { borderColor: c });
                                handleStyleChange(selectedElement!, { borderColor: c });
                                setActiveToolbarPopup(null);
                              }}
                              className="size-6 rounded-md border border-white/20 shadow-sm"
                              style={{ backgroundColor: c }}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Grosor de borde */}
                  <div className="flex items-center h-7 bg-slate-800 rounded-md border border-slate-700 overflow-hidden">
                    <span className="text-[10px] text-slate-400 px-1.5 font-semibold">Borde:</span>
                    <button
                      type="button"
                      onClick={() => {
                        const cur = customElem?.borderWidth ?? 2;
                        const next = Math.max(0, cur - 1);
                        handleUpdateCustomElement(selectedElement!, { borderWidth: next });
                        handleStyleChange(selectedElement!, { borderWidth: next });
                      }}
                      className="px-1.5 h-full hover:bg-slate-700 text-slate-300 font-bold"
                    >
                      -
                    </button>
                    <span className="w-7 text-center font-mono text-xs font-bold text-white">
                      {customElem?.borderWidth ?? 2}px
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const cur = customElem?.borderWidth ?? 2;
                        const next = Math.min(20, cur + 1);
                        handleUpdateCustomElement(selectedElement!, { borderWidth: next });
                        handleStyleChange(selectedElement!, { borderWidth: next });
                      }}
                      className="px-1.5 h-full hover:bg-slate-700 text-slate-300 font-bold"
                    >
                      +
                    </button>
                  </div>

                  {/* Radio de esquinas */}
                  {(customElem?.type === "shape_rect" || customElem?.type === "shape_pill") && (
                    <div className="flex items-center h-7 bg-slate-800 rounded-md border border-slate-700 overflow-hidden">
                      <span className="text-[10px] text-slate-400 px-1.5 font-semibold">Radio:</span>
                      <button
                        type="button"
                        onClick={() => {
                          const cur = customElem?.borderRadius ?? 16;
                          const next = Math.max(0, cur - 4);
                          handleUpdateCustomElement(selectedElement!, { borderRadius: next });
                          handleStyleChange(selectedElement!, { borderRadius: next });
                        }}
                        className="px-1.5 h-full hover:bg-slate-700 text-slate-300 font-bold"
                      >
                        -
                      </button>
                      <span className="w-7 text-center font-mono text-xs font-bold text-white">
                        {customElem?.borderRadius ?? 16}px
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          const cur = customElem?.borderRadius ?? 16;
                          const next = Math.min(60, cur + 4);
                          handleUpdateCustomElement(selectedElement!, { borderRadius: next });
                          handleStyleChange(selectedElement!, { borderRadius: next });
                        }}
                        className="px-1.5 h-full hover:bg-slate-700 text-slate-300 font-bold"
                      >
                        +
                      </button>
                    </div>
                  )}

                  <span className="h-4 w-px bg-slate-700 mx-1" />

                  {/* Duplicar y Eliminar Forma */}
                  <button
                    type="button"
                    onClick={() => handleDuplicateElement(selectedElement!)}
                    className="size-7 rounded-md bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition"
                    title="Duplicar forma"
                  >
                    <Copy className="size-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDeleteElement(selectedElement!)}
                    className="size-7 rounded-md bg-slate-800 hover:bg-red-500/20 border border-slate-700 text-slate-400 hover:text-red-400 flex items-center justify-center transition"
                    title="Eliminar forma"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </>
              )}

              {/* CASO C: FONDO O NADA SELECCIONADO */}
              {!isText && !isShape && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedElement("background");
                      setActiveDockTab("photos");
                      setIsDrawerOpen(true);
                    }}
                    className="flex items-center gap-1.5 px-2.5 h-7 rounded-md bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-medium transition"
                  >
                    <ImageIcon className="size-3 text-brand-400" />
                    <span>Cambiar Foto</span>
                  </button>

                  {/* Zoom Foto de Fondo */}
                  <div className="flex items-center h-7 bg-slate-800 rounded-md border border-slate-700 overflow-hidden">
                    <span className="text-[10px] text-slate-400 px-1.5 font-semibold">Zoom Foto:</span>
                    <button
                      type="button"
                      onClick={() => setBgScale(Math.max(1.0, Number((bgScale - 0.1).toFixed(2))))}
                      className="px-1.5 h-full hover:bg-slate-700 text-slate-300 font-bold"
                    >
                      -
                    </button>
                    <span className="w-10 text-center font-mono text-xs font-bold text-white">
                      {Math.round(bgScale * 100)}%
                    </span>
                    <button
                      type="button"
                      onClick={() => setBgScale(Math.min(2.5, Number((bgScale + 0.1).toFixed(2))))}
                      className="px-1.5 h-full hover:bg-slate-700 text-slate-300 font-bold"
                    >
                      +
                    </button>
                  </div>

                  {/* Opacidad Fondo Oscuro */}
                  <div className="flex items-center h-7 bg-slate-800 rounded-md border border-slate-700 overflow-hidden">
                    <span className="text-[10px] text-slate-400 px-1.5 font-semibold">Opacidad:</span>
                    <button
                      type="button"
                      onClick={() => setOverlayOpacity(Math.max(0.2, Number((overlayOpacity - 0.05).toFixed(2))))}
                      className="px-1.5 h-full hover:bg-slate-700 text-slate-300 font-bold"
                    >
                      -
                    </button>
                    <span className="w-10 text-center font-mono text-xs font-bold text-white">
                      {Math.round(overlayOpacity * 100)}%
                    </span>
                    <button
                      type="button"
                      onClick={() => setOverlayOpacity(Math.min(0.95, Number((overlayOpacity + 0.05).toFixed(2))))}
                      className="px-1.5 h-full hover:bg-slate-700 text-slate-300 font-bold"
                    >
                      +
                    </button>
                  </div>

                  {/* Restaurar elementos si hay alguno oculto */}
                  {Object.keys(currentSlide.hiddenElements || {}).length > 0 && (
                    <button
                      type="button"
                      onClick={handleRestoreHiddenElements}
                      className="flex items-center gap-1 px-2 h-7 rounded-md bg-red-950/60 hover:bg-red-900/60 text-red-300 text-[10px] font-semibold border border-red-500/30 transition"
                      title="Restaurar objetos eliminados"
                    >
                      <RotateCcw className="size-2.5 text-red-400" />
                      <span>Restaurar ({Object.keys(currentSlide.hiddenElements || {}).length})</span>
                    </button>
                  )}

                  {/* Restablecer si hay modificaciones */}
                  {(Object.keys(currentSlide.offsets || {}).length > 0 ||
                    Object.keys(currentSlide.scales || {}).length > 0 ||
                    Object.keys(currentSlide.hiddenElements || {}).length > 0) && (
                    <button
                      type="button"
                      onClick={handleResetSlideCustomizations}
                      className="flex items-center gap-1 px-2 h-7 rounded-md bg-slate-800 hover:bg-slate-700 text-amber-300 text-[10px] font-semibold border border-amber-500/30 transition"
                      title="Restablecer posición inicial"
                    >
                      <RotateCcw className="size-2.5" />
                      <span>Restablecer</span>
                    </button>
                  )}
                </>
              )}
            </div>

            {/* Selector de Modo: Auto-Layout vs Modo Libre */}
            <div className="flex items-center gap-1 shrink-0 ml-auto">
              <div className="flex items-center p-0.5 rounded-lg bg-slate-800 border border-slate-700">
                <button
                  type="button"
                  onClick={() => setIsFreeMode(false)}
                  className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold transition ${
                    !isFreeMode
                      ? "bg-brand-600 text-white shadow-xs"
                      : "text-slate-400 hover:text-white"
                  }`}
                  title="Alineación automática limpia y equilibrada por Flexbox"
                >
                  <LayoutGrid className="size-3" />
                  <span>Auto-Layout</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsFreeMode(true)}
                  className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold transition ${
                    isFreeMode
                      ? "bg-indigo-600 text-white shadow-xs"
                      : "text-slate-400 hover:text-white"
                  }`}
                  title="Arrastra cualquier elemento libremente con el ratón por la lámina"
                >
                  <Move className="size-3" />
                  <span>Modo Libre</span>
                </button>
              </div>
            </div>
          </div>

          {/* VIEWPORT DEL LIENZO CON ZOOM Y CENTRADO VISUAL (ZERO WINDOW SCROLL) */}
          <div className="flex-1 flex items-center justify-center overflow-hidden p-2 relative bg-[#080c14]">
            <div
              style={{
                transform: `scale(${canvasZoom})`,
                transformOrigin: "center center",
                transition: "transform 0.12s ease-out",
              }}
              className="shrink-0"
            >
            {/* CONTENEDOR DEL LIENZO MAQUETADO CON TAILWIND (EXPORTABLE 1:1 / 4:5) */}
            <div
              className={`relative shadow-2xl rounded-2xl border border-gray-800 bg-gray-950 overflow-hidden ring-1 ring-white/10 shrink-0 transition-all duration-300 ${
                aspectRatio === "4:5" ? "w-[420px] h-[525px]" : "w-[440px] h-[440px]"
              }`}
            >
              {/* Proveedor de Contexto para todas las Capas Arrastrables, Escalables y Eliminables */}
              <SlideCanvasContext.Provider
                value={{
                  isFreeMode,
                  isExporting,
                  currentSlide,
                  selectedElement,
                  onSelectElement: setSelectedElement,
                  onOffsetChange: handleOffsetChange,
                  onScaleChange: handleScaleChange,
                  onDeleteElement: handleDeleteElement,
                  onDuplicateElement: handleDuplicateElement,
                  onStyleChange: handleStyleChange,
                }}
              >
                {/* Elemento DOM exacto que se captura con html-to-image */}
                <div
                  ref={slideContainerRef}
                  style={{ fontFamily: selectedFont }}
                onClick={() => setSelectedElement("background")}
                className="relative w-full h-full flex flex-col justify-between overflow-hidden bg-slate-950 select-text"
              >
                {/* 1. FOTO DE FONDO (Capa independiente z-0, draggable y escalable con zoom) */}
                <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
                  <DraggableWrapper
                    id="bg-photo"
                    label="Foto de Fondo"
                    isFreeMode={isFreeMode}
                    offset={currentSlide.offsets?.["bg-photo"]}
                    onOffsetChange={handleOffsetChange}
                    isExporting={isExporting}
                    isSelected={selectedElement === "background"}
                    onSelect={() => setSelectedElement("background")}
                    className="absolute -inset-24 w-[calc(100%+192px)] h-[calc(100%+192px)] pointer-events-auto cursor-grab active:cursor-grabbing"
                  >
                    <div className="w-full h-full relative">
                      <img
                        src={selectedBgUrl}
                        alt="Background"
                        crossOrigin="anonymous"
                        style={{ transform: `scale(${bgScale})` }}
                        className="w-full h-full object-cover select-none pointer-events-none transition-transform duration-75"
                      />
                      {/* Filtro ambiental sutil de contraste */}
                      <div className="absolute inset-0 bg-slate-950/40 pointer-events-none" />
                    </div>
                  </DraggableWrapper>
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
                      <>
                        {/* Capa z-10: Fondo Tarjeta Transparente (Hermano independiente) */}
                        <div className="absolute inset-0 z-10 pointer-events-none p-5 flex flex-col justify-end">
                          <DraggableWrapper
                            id="editorial-card"
                            label="Fondo Tarjeta"
                            isFreeMode={isFreeMode}
                            offset={currentSlide.offsets?.["editorial-card"]}
                            onOffsetChange={handleOffsetChange}
                            isExporting={isExporting}
                            isSelected={selectedElement === "brand"}
                            onSelect={() => setSelectedElement("brand")}
                            className="w-full pointer-events-auto"
                          >
                            <div
                              style={{
                                backgroundColor: `rgba(9, 13, 24, ${overlayOpacity})`,
                              }}
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedElement("brand");
                              }}
                              className={`w-full border border-white/15 shadow-2xl backdrop-blur-md transition-all ${
                                overlayMode === "fullscreen"
                                  ? "h-[485px] rounded-none"
                                  : aspectRatio === "4:5"
                                  ? "h-[300px] rounded-3xl"
                                  : "h-[250px] rounded-3xl"
                              }`}
                            />
                          </DraggableWrapper>
                        </div>

                        {/* Capa z-20: Contenidos de Texto y Badges (Hermanos independientes) */}
                        <div className="absolute inset-0 z-20 pointer-events-none p-5 flex flex-col justify-end">
                          <div
                            className={`w-full flex flex-col justify-between transition-all p-6 ${
                              overlayMode === "fullscreen"
                                ? "h-[485px]"
                                : aspectRatio === "4:5"
                                ? "h-[300px]"
                                : "h-[250px]"
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
                                className="inline-block mb-3 pointer-events-auto"
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
                                className="pointer-events-auto"
                              >
                                <h1 className={`${getTitleSizeClass(titleSize)} font-extrabold text-white leading-tight break-words drop-shadow-md`}>
                                  <InlineEditableText
                                    elementKey="title"
                                    as="span"
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
                                className="pointer-events-auto"
                              >
                                <p className="text-xs sm:text-sm text-slate-200 mt-2.5 leading-relaxed font-normal">
                                  <InlineEditableText
                                    elementKey="subtitle"
                                    as="span"
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
                              className="pt-4 mt-3 border-t border-white/10 flex items-center justify-between pointer-events-auto"
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
                        </div>
                      </>
                    )}

                    {/* PLANTILLA 2: CITA DE AUTORIDAD */}
                    {selectedTemplate === "authority_quote" && (
                      <>
                        {/* Capa z-10: Fondo Tarjeta Transparente */}
                        <div className="absolute inset-0 z-10 pointer-events-none p-6">
                          <DraggableWrapper
                            id="quote-card"
                            label="Fondo Cita"
                            isFreeMode={isFreeMode}
                            offset={currentSlide.offsets?.["quote-card"]}
                            onOffsetChange={handleOffsetChange}
                            isExporting={isExporting}
                            isSelected={selectedElement === "brand"}
                            onSelect={() => setSelectedElement("brand")}
                            className="w-full h-full pointer-events-auto"
                          >
                            <div
                              style={{
                                backgroundColor: `rgba(9, 13, 24, ${overlayOpacity})`,
                              }}
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedElement("brand");
                              }}
                              className="w-full h-full rounded-3xl border border-white/15 shadow-2xl backdrop-blur-md"
                            />
                          </DraggableWrapper>
                        </div>

                        {/* Capa z-20: Contenidos de la Cita */}
                        <div className="absolute inset-0 z-20 pointer-events-none p-6">
                          <div className="w-full h-full p-6 flex flex-col justify-between items-center text-center">
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
                              className="pointer-events-auto"
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
                              className="my-auto px-2 pointer-events-auto"
                            >
                              <Quote
                                className="size-10 mx-auto mb-2 opacity-80"
                                style={{ color: accentColor }}
                              />
                              <h1 className={`${getTitleSizeClass(titleSize)} font-bold italic text-white leading-relaxed`}>
                                "
                                <InlineEditableText
                                  elementKey="title"
                                  as="span"
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
                                  as="span"
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
                              className="flex items-center gap-3 px-4 py-2 rounded-full bg-slate-900/90 border border-white/15 shadow-md pointer-events-auto"
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
                        </div>
                      </>
                    )}

                    {/* PLANTILLA 3: TARJETA SOCIAL / FEED */}
                    {selectedTemplate === "social_card" && (
                      <>
                        {/* Capa z-10: Fondo Tarjeta Social */}
                        <div className="absolute inset-0 z-10 pointer-events-none p-5 flex flex-col justify-center">
                          <DraggableWrapper
                            id="social-card"
                            label="Fondo Tarjeta"
                            isFreeMode={isFreeMode}
                            offset={currentSlide.offsets?.["social-card"]}
                            onOffsetChange={handleOffsetChange}
                            isExporting={isExporting}
                            isSelected={selectedElement === "brand"}
                            onSelect={() => setSelectedElement("brand")}
                            className="w-full pointer-events-auto"
                          >
                            <div
                              style={{
                                backgroundColor: `rgba(15, 23, 42, ${overlayOpacity})`,
                              }}
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedElement("brand");
                              }}
                              className={`w-full rounded-3xl border border-white/15 shadow-2xl backdrop-blur-md ${
                                aspectRatio === "4:5" ? "h-[390px]" : "h-[350px]"
                              }`}
                            />
                          </DraggableWrapper>
                        </div>

                        {/* Capa z-20: Contenidos Tarjeta Social */}
                        <div className="absolute inset-0 z-20 pointer-events-none p-5 flex flex-col justify-center">
                          <div
                            className={`w-full p-5 flex flex-col justify-between ${
                              aspectRatio === "4:5" ? "h-[390px]" : "h-[350px]"
                            }`}
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
                              className="flex items-center gap-3 pb-3 border-b border-white/10 pointer-events-auto"
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
                                className="inline-block pointer-events-auto"
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
                                className="pointer-events-auto"
                              >
                                <h1 className={`${getTitleSizeClass(titleSize)} font-bold text-white leading-snug`}>
                                  <InlineEditableText
                                    elementKey="title"
                                    as="span"
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
                                className="pointer-events-auto"
                              >
                                <div
                                  style={{ borderLeftColor: accentColor }}
                                  className="p-3 rounded-r-xl bg-white/5 border-l-4 text-xs text-slate-200"
                                >
                                  <InlineEditableText
                                    elementKey="subtitle"
                                    as="span"
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
                              className="pt-2.5 border-t border-white/10 flex items-center justify-between text-[11px] text-gray-400 font-medium pointer-events-auto"
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
                        </div>
                      </>
                    )}

                    {/* PLANTILLA 4: SPLIT FOCUS 50/50 */}
                    {selectedTemplate === "split_focus" && (
                      <>
                        {/* Capa z-10: Panel Inferior */}
                        <div className="absolute inset-0 z-10 pointer-events-none flex flex-col justify-end">
                          <DraggableWrapper
                            id="split-card"
                            label="Panel Inferior"
                            isFreeMode={isFreeMode}
                            offset={currentSlide.offsets?.["split-card"]}
                            onOffsetChange={handleOffsetChange}
                            isExporting={isExporting}
                            isSelected={selectedElement === "brand"}
                            onSelect={() => setSelectedElement("brand")}
                            className="w-full h-[52%] pointer-events-auto"
                          >
                            <div
                              style={{ borderTopColor: accentColor }}
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedElement("brand");
                              }}
                              className="h-full w-full bg-slate-950/95 border-t-4 backdrop-blur-md"
                            />
                          </DraggableWrapper>
                        </div>

                        {/* Capa z-20: Contenidos de Split Focus */}
                        <div className="absolute inset-0 z-20 pointer-events-none flex flex-col justify-end">
                          <div className="w-full h-[52%] p-5 flex flex-col justify-between">
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
                                className="inline-block mb-2 pointer-events-auto"
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
                                className="pointer-events-auto"
                              >
                                <h1 className={`${getTitleSizeClass(titleSize)} font-extrabold text-white leading-tight`}>
                                  <InlineEditableText
                                    elementKey="title"
                                    as="span"
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
                                className="pointer-events-auto"
                              >
                                <p className="text-xs text-slate-300 mt-2 font-normal line-clamp-3">
                                  <InlineEditableText
                                    elementKey="subtitle"
                                    as="span"
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
                              className="pt-2 border-t border-white/10 flex items-center justify-between text-xs text-gray-400 pointer-events-auto"
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
                        </div>
                      </>
                    )}

                    {/* PLANTILLA 5: MÉTRICA DE ALTO IMPACTO */}
                    {selectedTemplate === "big_metric" && (
                      <>
                        {/* Capa z-10: Fondo Tarjeta Métrica */}
                        <div className="absolute inset-0 z-10 pointer-events-none p-6">
                          <DraggableWrapper
                            id="metric-card"
                            label="Fondo Métrica"
                            isFreeMode={isFreeMode}
                            offset={currentSlide.offsets?.["metric-card"]}
                            onOffsetChange={handleOffsetChange}
                            isExporting={isExporting}
                            isSelected={selectedElement === "brand"}
                            onSelect={() => setSelectedElement("brand")}
                            className="w-full h-full pointer-events-auto"
                          >
                            <div
                              style={{
                                backgroundColor: `rgba(9, 13, 24, ${overlayOpacity})`,
                              }}
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedElement("brand");
                              }}
                              className="w-full h-full rounded-3xl border border-white/15 shadow-2xl backdrop-blur-md"
                            />
                          </DraggableWrapper>
                        </div>

                        {/* Capa z-20: Contenidos de Métrica */}
                        <div className="absolute inset-0 z-20 pointer-events-none p-6 text-center">
                          <div className="w-full h-full p-6 flex flex-col justify-between items-center">
                            <DraggableWrapper
                              id="metric-tag"
                              label="Etiqueta"
                              isFreeMode={isFreeMode}
                              offset={currentSlide.offsets?.["metric-tag"]}
                              onOffsetChange={handleOffsetChange}
                              isExporting={isExporting}
                              isSelected={selectedElement === "tag"}
                              onSelect={() => setSelectedElement("tag")}
                              className="pointer-events-auto"
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
                                className="pointer-events-auto"
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
                                className="pointer-events-auto"
                              >
                                <h1 className={`${getTitleSizeClass(titleSize)} font-bold text-white mt-3`}>
                                  <InlineEditableText
                                    elementKey="title"
                                    as="span"
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
                                    as="span"
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
                              className="text-xs text-gray-400 font-mono pointer-events-auto"
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
                        </div>
                      </>
                    )}

                    {/* PLANTILLA 6: BOLD HIGHLIGHTER B2B (Estilo Pinterest / Klowt) */}
                    {selectedTemplate === "bold_highlighter" && (() => {
                      const parts = getTitleParts(currentSlide);
                      const headlineSizeClass = (() => {
                        const isPortrait = aspectRatio === "4:5";
                        if (isPortrait) {
                          switch (titleSize) {
                            case "sm": return "text-xl sm:text-2xl";
                            case "md": return "text-2xl sm:text-[28px]";
                            case "lg": return "text-3xl sm:text-[34px]";
                            case "xl": return "text-3xl sm:text-[40px]";
                          }
                        }
                        switch (titleSize) {
                          case "sm": return "text-lg sm:text-xl";
                          case "md": return "text-xl sm:text-2xl";
                          case "lg": return "text-2xl sm:text-[26px]";
                          case "xl": return "text-2xl sm:text-3xl";
                        }
                      })();
                      return (
                        <>
                          {/* Capa z-10: Degradado inteligente lateral para lectura perfecta sobre fotos */}
                          <div className="absolute inset-0 z-10 pointer-events-none bg-gradient-to-r from-slate-950/95 via-slate-950/75 to-slate-950/20" />

                          {/* Capa z-20: Contenidos de la Lámina */}
                          <div className="absolute inset-0 z-20 pointer-events-none p-6 sm:p-7 flex flex-col justify-between">
                            {/* Cabecera Superior: Tag / Serie a la derecha */}
                            <div className="flex items-center justify-between w-full">
                              {/* Logo / Monograma Opcional Izquierda */}
                              <DraggableWrapper
                                id="bold-logo"
                                label="Isotipo / Monograma"
                                isFreeMode={isFreeMode}
                                offset={currentSlide.offsets?.["bold-logo"]}
                                onOffsetChange={handleOffsetChange}
                                isExporting={isExporting}
                                className="pointer-events-auto"
                              >
                                <span className="text-sm font-black font-mono text-white/80 tracking-wider">
                                  {nameText.charAt(0).toUpperCase()}.
                                </span>
                              </DraggableWrapper>

                              {/* Etiqueta de Serie Derecha */}
                              <DraggableWrapper
                                id="bold-tag"
                                label="Etiqueta / Serie"
                                isFreeMode={isFreeMode}
                                offset={currentSlide.offsets?.["bold-tag"]}
                                onOffsetChange={handleOffsetChange}
                                isExporting={isExporting}
                                isSelected={selectedElement === "tag"}
                                onSelect={() => setSelectedElement("tag")}
                                className="pointer-events-auto"
                              >
                                <div className="text-[11px] font-black tracking-[0.2em] text-white/90 uppercase drop-shadow-md">
                                  <InlineEditableText
                                    elementKey="tag"
                                    value={currentSlide.tag || "INSIGHTS B2B"}
                                    onChange={(val) => updateCurrentSlide({ tag: val })}
                                    selectedElement={selectedElement}
                                    onSelect={setSelectedElement}
                                    isExporting={isExporting}
                                    placeholder="INSIGHTS B2B"
                                  />
                                </div>
                              </DraggableWrapper>
                            </div>

                            {/* Bloque Central / Titular + Bajada */}
                            <div className="my-auto space-y-4 max-w-[340px]">
                              {/* Titular con Resaltador Violeta */}
                              <DraggableWrapper
                                id="bold-title"
                                label="Titular con Resaltador"
                                isFreeMode={isFreeMode}
                                offset={currentSlide.offsets?.["bold-title"]}
                                onOffsetChange={handleOffsetChange}
                                isExporting={isExporting}
                                isSelected={selectedElement === "title"}
                                onSelect={() => setSelectedElement("title")}
                                className="pointer-events-auto"
                              >
                                <div className="font-extrabold text-white tracking-tight leading-[1.08] select-text">
                                  {/* Prefijo en minúsculas */}
                                  <div className={`${headlineSizeClass} drop-shadow-md`}>
                                    <InlineEditableText
                                      elementKey="title-prefix"
                                      as="span"
                                      value={parts.prefix}
                                      onChange={(val) => {
                                        updateCurrentSlide({
                                          titlePrefix: val,
                                          title: `${val} [${parts.highlight}] ${parts.suffix}.`,
                                        });
                                      }}
                                      selectedElement={selectedElement}
                                      onSelect={setSelectedElement}
                                      isExporting={isExporting}
                                      placeholder="el 90% de los"
                                    />
                                  </div>

                                  {/* Cinta violeta resaltadora inclinada */}
                                  <div className="my-1.5 inline-block">
                                    <span
                                      style={{ backgroundColor: accentColor === "#0099ff" ? "#7058FE" : accentColor }}
                                      className="inline-block px-3.5 py-0.5 rounded-xl text-white font-extrabold italic shadow-2xl -rotate-[2deg] transform origin-left"
                                    >
                                      <span className={`${headlineSizeClass} tracking-tight`}>
                                        <InlineEditableText
                                          elementKey="title-highlight"
                                          as="span"
                                          value={parts.highlight}
                                          onChange={(val) => {
                                            updateCurrentSlide({
                                              highlightText: val,
                                              title: `${parts.prefix} [${val}] ${parts.suffix}.`,
                                            });
                                          }}
                                          selectedElement={selectedElement}
                                          onSelect={setSelectedElement}
                                          isExporting={isExporting}
                                          placeholder="mensajes b2b"
                                        />
                                      </span>
                                    </span>
                                  </div>

                                  {/* Sufijo con punto final magenta neón */}
                                  <div className={`${headlineSizeClass} drop-shadow-md flex items-baseline flex-wrap`}>
                                    <InlineEditableText
                                      elementKey="title-suffix"
                                      as="span"
                                      value={parts.suffix}
                                      onChange={(val) => {
                                        updateCurrentSlide({
                                          titleSuffix: val,
                                          title: `${parts.prefix} [${parts.highlight}] ${val}.`,
                                        });
                                      }}
                                      selectedElement={selectedElement}
                                      onSelect={setSelectedElement}
                                      isExporting={isExporting}
                                      placeholder="terminan en la papelera"
                                    />
                                    <span className="text-[#FF177D] font-black inline-block ml-0.5">.</span>
                                  </div>
                                </div>
                              </DraggableWrapper>

                              {/* Bajada / Subtítulo */}
                              <DraggableWrapper
                                id="bold-subtitle"
                                label="Subtítulo Explicativo"
                                isFreeMode={isFreeMode}
                                offset={currentSlide.offsets?.["bold-subtitle"]}
                                onOffsetChange={handleOffsetChange}
                                isExporting={isExporting}
                                isSelected={selectedElement === "subtitle"}
                                onSelect={() => setSelectedElement("subtitle")}
                                className="pointer-events-auto pt-2"
                              >
                                <p className="text-xs sm:text-[13px] text-slate-200/90 leading-relaxed font-normal drop-shadow-sm">
                                  <InlineEditableText
                                    elementKey="subtitle"
                                    as="span"
                                    value={currentSlide.subtitle || "El problema no es el volumen, es la falta de estrategia operativa. Menos ruido masivo, más automatización inteligente."}
                                    onChange={(val) => updateCurrentSlide({ subtitle: val })}
                                    selectedElement={selectedElement}
                                    onSelect={setSelectedElement}
                                    isExporting={isExporting}
                                    multiline={true}
                                    placeholder="El problema no es el volumen, es la falta de estrategia operativa..."
                                  />
                                </p>
                              </DraggableWrapper>
                            </div>

                            {/* Pie / Flecha de deslizamiento */}
                            <DraggableWrapper
                              id="bold-footer"
                              label="Indicador / Flecha"
                              isFreeMode={isFreeMode}
                              offset={currentSlide.offsets?.["bold-footer"]}
                              onOffsetChange={handleOffsetChange}
                              isExporting={isExporting}
                              className="pointer-events-auto self-end flex items-center gap-2"
                            >
                              <div className="flex items-center gap-2 text-white/80">
                                {editorMode === "carousel" && (
                                  <span className="text-[10px] font-bold uppercase tracking-wider text-white/60">Desliza</span>
                                )}
                                <ArrowRight className="size-5 text-white/90" />
                              </div>
                            </DraggableWrapper>
                          </div>
                        </>
                      );
                    })()}
                  </>
                ) : (
                  /* B) LÁMINAS INTERMEDIAS (PROBLEMA, SOLUCIÓN, CTA) */
                  <>
                    {/* Capa z-10: Fondo Tarjeta Intermedia */}
                    <div className="absolute inset-0 z-10 pointer-events-none p-6">
                      <DraggableWrapper
                        id="inter-card"
                        label="Fondo Tarjeta"
                        isFreeMode={isFreeMode}
                        offset={currentSlide.offsets?.["inter-card"]}
                        onOffsetChange={handleOffsetChange}
                        isExporting={isExporting}
                        isSelected={selectedElement === "brand"}
                        onSelect={() => setSelectedElement("brand")}
                        className="w-full h-full pointer-events-auto"
                      >
                        <div
                          style={{
                            backgroundColor: `rgba(15, 23, 42, ${overlayOpacity})`,
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedElement("brand");
                          }}
                          className="w-full h-full rounded-3xl border border-white/15 shadow-2xl backdrop-blur-md"
                        />
                      </DraggableWrapper>
                    </div>

                    {/* Capa z-20: Contenidos de la Lámina Intermedia */}
                    <div className="absolute inset-0 z-20 pointer-events-none p-6">
                      <div className="w-full h-full p-6 flex flex-col justify-between">
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
                            className="inline-block mb-2.5 pointer-events-auto"
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
                            className="pointer-events-auto"
                          >
                            <h2 className={`${getTitleSizeClass(titleSize)} font-bold text-white leading-snug`}>
                              <InlineEditableText
                                elementKey="title"
                                as="span"
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
                                as="span"
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
                            className="my-auto space-y-2.5 pointer-events-auto"
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
                            className="my-auto p-4 rounded-2xl bg-gradient-to-b from-white/10 to-transparent border border-white/15 text-center space-y-3 pointer-events-auto"
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
                          className="pt-3 border-t border-white/10 flex items-center justify-between text-xs text-gray-400 pointer-events-auto"
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
                    </div>
                  </>
                )}

                {/* 3. CAPAS DE ELEMENTOS PERSONALIZADOS ADICIONALES (ESTILO CANVA) */}
                {(currentSlide.customElements || []).map((elem) => {
                  const isSelected = selectedElement === elem.id;
                  const isHidden = Boolean(currentSlide.hiddenElements?.[elem.id]);
                  if (isHidden) return null;

                  return (
                    <DraggableWrapper
                      key={elem.id}
                      id={elem.id}
                      label={
                        elem.type === "heading"
                          ? "Titular Extra"
                          : elem.type === "text"
                          ? "Párrafo"
                          : elem.type === "highlight"
                          ? "Cinta Resaltador"
                          : elem.type === "badge"
                          ? "Badge B2B"
                          : "Flecha Swipe"
                      }
                      isFreeMode={isFreeMode}
                      offset={currentSlide.offsets?.[elem.id] || { x: elem.x, y: elem.y }}
                      onOffsetChange={handleOffsetChange}
                      scale={currentSlide.scales?.[elem.id] ?? elem.scale ?? 1}
                      onScaleChange={handleScaleChange}
                      onDelete={handleDeleteElement}
                      onDuplicate={handleDuplicateElement}
                      isExporting={isExporting}
                      isSelected={isSelected}
                      onSelect={() => setSelectedElement(elem.id)}
                      className="absolute z-30 pointer-events-auto"
                      style={{
                        left: 0,
                        top: 0,
                      }}
                    >
                      {elem.type === "heading" && (
                        <h2 className="text-2xl font-black text-white tracking-tight leading-tight select-text drop-shadow-md">
                          <InlineEditableText
                            elementKey={elem.id}
                            as="span"
                            value={elem.content}
                            onChange={(val) => handleUpdateCustomElement(elem.id, { content: val })}
                            selectedElement={selectedElement}
                            onSelect={setSelectedElement}
                            isExporting={isExporting}
                            multiline={true}
                            placeholder="Escribe titular..."
                          />
                        </h2>
                      )}

                      {elem.type === "subheading" && (
                        <h3 className="text-lg font-bold text-slate-200 tracking-tight leading-snug select-text drop-shadow-sm max-w-[340px]">
                          <InlineEditableText
                            elementKey={elem.id}
                            as="span"
                            value={elem.content}
                            onChange={(val) => handleUpdateCustomElement(elem.id, { content: val })}
                            selectedElement={selectedElement}
                            onSelect={setSelectedElement}
                            isExporting={isExporting}
                            multiline={true}
                            placeholder="Escribe subtítulo..."
                          />
                        </h3>
                      )}

                      {elem.type === "text" && (
                        <p className="text-sm text-slate-200 leading-relaxed font-normal select-text drop-shadow-sm max-w-[320px]">
                          <InlineEditableText
                            elementKey={elem.id}
                            as="span"
                            value={elem.content}
                            onChange={(val) => handleUpdateCustomElement(elem.id, { content: val })}
                            selectedElement={selectedElement}
                            onSelect={setSelectedElement}
                            isExporting={isExporting}
                            multiline={true}
                            placeholder="Escribe texto..."
                          />
                        </p>
                      )}

                      {elem.type === "shape_rect" && (
                        <div
                          style={{
                            width: `${elem.width || 140}px`,
                            height: `${elem.height || 90}px`,
                            backgroundColor: elem.bgColor || "rgba(255, 255, 255, 0.12)",
                            borderColor: elem.borderColor || accentColor,
                            borderWidth: `${elem.borderWidth ?? 2}px`,
                            borderStyle: "solid",
                            borderRadius: `${elem.borderRadius ?? 16}px`,
                            opacity: elem.opacity ?? 1,
                          }}
                          className="backdrop-blur-sm shadow-xl transition-all cursor-pointer"
                          onClick={() => setSelectedElement(elem.id)}
                        />
                      )}

                      {elem.type === "shape_circle" && (
                        <div
                          style={{
                            width: `${elem.width || 90}px`,
                            height: `${elem.height || 90}px`,
                            backgroundColor: elem.bgColor || accentColor,
                            borderColor: elem.borderColor || "rgba(255, 255, 255, 0.3)",
                            borderWidth: `${elem.borderWidth ?? 0}px`,
                            borderStyle: "solid",
                            borderRadius: "9999px",
                            opacity: elem.opacity ?? 0.9,
                          }}
                          className="shadow-xl transition-all cursor-pointer"
                          onClick={() => setSelectedElement(elem.id)}
                        />
                      )}

                      {elem.type === "shape_star" && (
                        <div
                          style={{
                            width: `${elem.width || 64}px`,
                            height: `${elem.height || 64}px`,
                            opacity: elem.opacity ?? 1,
                          }}
                          className="flex items-center justify-center transition-all cursor-pointer"
                          onClick={() => setSelectedElement(elem.id)}
                        >
                          <Star
                            style={{
                              color: elem.bgColor || "#f59e0b",
                              fill: elem.bgColor || "#f59e0b",
                            }}
                            className="size-full drop-shadow-lg"
                          />
                        </div>
                      )}

                      {elem.type === "shape_pill" && (
                        <div
                          style={{
                            backgroundColor: elem.bgColor || "rgba(255, 255, 255, 0.15)",
                            borderColor: elem.borderColor || accentColor,
                            borderWidth: `${elem.borderWidth ?? 1}px`,
                            borderStyle: "solid",
                            borderRadius: "9999px",
                            opacity: elem.opacity ?? 1,
                          }}
                          className="px-4 py-1.5 shadow-md flex items-center justify-center select-text cursor-pointer"
                        >
                          <InlineEditableText
                            elementKey={elem.id}
                            as="span"
                            value={elem.content}
                            onChange={(val) => handleUpdateCustomElement(elem.id, { content: val })}
                            selectedElement={selectedElement}
                            onSelect={setSelectedElement}
                            isExporting={isExporting}
                            placeholder="PÍLDORA B2B"
                          />
                        </div>
                      )}

                      {elem.type === "shape_line" && (
                        <div
                          style={{
                            width: `${elem.width || 220}px`,
                            height: `${elem.borderWidth ?? elem.height ?? 3}px`,
                            backgroundColor: elem.bgColor || accentColor,
                            opacity: elem.opacity ?? 0.8,
                          }}
                          className="rounded-full shadow-sm transition-all cursor-pointer"
                          onClick={() => setSelectedElement(elem.id)}
                        />
                      )}

                      {elem.type === "highlight" && (
                        <div className="inline-block select-text">
                          <span
                            style={{ backgroundColor: elem.bgColor || (accentColor === "#0099ff" ? "#7058FE" : accentColor) }}
                            className="inline-block px-3.5 py-1 rounded-xl text-white font-extrabold italic shadow-2xl -rotate-[2deg] transform origin-left"
                          >
                            <InlineEditableText
                              elementKey={elem.id}
                              as="span"
                              value={elem.content}
                              onChange={(val) => handleUpdateCustomElement(elem.id, { content: val })}
                              selectedElement={selectedElement}
                              onSelect={setSelectedElement}
                              isExporting={isExporting}
                              placeholder="PALABRA CLAVE"
                            />
                          </span>
                        </div>
                      )}

                      {elem.type === "badge" && (
                        <div className="inline-block select-text">
                          <span
                            style={{ backgroundColor: elem.bgColor || accentColor, color: elem.bgColor ? "#ffffff" : "#000000" }}
                            className="inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider shadow-sm"
                          >
                            <InlineEditableText
                              elementKey={elem.id}
                              as="span"
                              value={elem.content}
                              onChange={(val) => handleUpdateCustomElement(elem.id, { content: val })}
                              selectedElement={selectedElement}
                              onSelect={setSelectedElement}
                              isExporting={isExporting}
                              placeholder="INSIGHT B2B"
                            />
                          </span>
                        </div>
                      )}

                      {elem.type === "arrow" && (
                        <div className="flex items-center gap-2 text-white/90 drop-shadow-md select-text">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-white/70">
                            <InlineEditableText
                              elementKey={elem.id}
                              as="span"
                              value={elem.content}
                              onChange={(val) => handleUpdateCustomElement(elem.id, { content: val })}
                              selectedElement={selectedElement}
                              onSelect={setSelectedElement}
                              isExporting={isExporting}
                              placeholder="DESLIZA"
                            />
                          </span>
                          <ArrowRight className="size-4 text-white" />
                        </div>
                      )}
                    </DraggableWrapper>
                  );
                })}
              </div>
              </SlideCanvasContext.Provider>
            </div>
          </div>
        </div>

        {/* BARRA INFERIOR DE PÁGINAS Y ZOOM (CANVA STRIP - 48px) */}
        <footer className="h-12 bg-slate-900 border-t border-slate-800 px-4 flex items-center justify-between shrink-0 select-none z-20 text-xs">
          {/* Lado izquierdo: Pestañas de láminas (carrusel) */}
          <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar py-1">
            {editorMode === "carousel" ? (
              <>
                <span className="text-[11px] font-bold uppercase text-slate-400 shrink-0 flex items-center gap-1 mr-1">
                  <Layers className="size-3.5 text-brand-400" />
                  Láminas:
                </span>
                {slides.map((s, idx) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setCurrentSlideIndex(idx)}
                    className={`group relative flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs font-medium transition shrink-0 ${
                      currentSlideIndex === idx
                        ? "border-brand-500 bg-brand-500/20 text-white font-bold"
                        : "border-slate-800 bg-slate-950/60 text-slate-400 hover:text-white hover:bg-slate-800"
                    }`}
                  >
                    <span className="size-4 rounded-full bg-slate-800 text-[10px] font-bold flex items-center justify-center">
                      {idx + 1}
                    </span>
                    <span className="truncate max-w-[80px]">{s.label}</span>
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
                  className="flex items-center gap-1 px-2.5 py-1 rounded-md border border-dashed border-slate-700 bg-slate-800/40 hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold shrink-0 transition"
                >
                  <Plus className="size-3 text-brand-400" />
                  <span>Añadir</span>
                </button>
              </>
            ) : (
              <span className="text-xs text-slate-400 font-medium">
                Publicación con Imagen Única (Feed de LinkedIn)
              </span>
            )}
          </div>

          {/* Lado derecho: Control de Zoom Estilo Canva */}
          <div className="flex items-center gap-2 shrink-0 ml-auto">
            <button
              type="button"
              onClick={() => setCanvasZoom(Math.max(0.4, Number((canvasZoom - 0.05).toFixed(2))))}
              className="size-7 rounded hover:bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition"
              title="Reducir zoom"
            >
              <ZoomOut className="size-3.5" />
            </button>

            <input
              type="range"
              min="0.4"
              max="1.6"
              step="0.05"
              value={canvasZoom}
              onChange={(e) => setCanvasZoom(parseFloat(e.target.value))}
              className="w-24 accent-brand-500 h-1 bg-slate-700 rounded cursor-pointer"
            />

            <button
              type="button"
              onClick={() => setCanvasZoom(Math.min(1.6, Number((canvasZoom + 0.05).toFixed(2))))}
              className="size-7 rounded hover:bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition"
              title="Aumentar zoom"
            >
              <ZoomIn className="size-3.5" />
            </button>

            <span className="font-mono text-xs text-brand-400 font-bold min-w-[36px] text-center">
              {Math.round(canvasZoom * 100)}%
            </span>

            <button
              type="button"
              onClick={() => setCanvasZoom(aspectRatio === "4:5" ? 0.82 : 0.88)}
              className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white text-[11px] font-semibold border border-slate-700 transition"
              title="Ajustar tamaño a la pantalla"
            >
              Ajustar
            </button>
          </div>
        </footer>
      </main>
    </div>
  </div>
  );
}
