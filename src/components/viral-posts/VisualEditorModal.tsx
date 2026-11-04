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
  UploadCloud,
  Video,
  Music,
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
  RotateCw,
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
  SplitSquareVertical,
  Sun,
  BookmarkPlus,
  Bookmark,
  Wand2,
  Loader2,
  Key,
  ExternalLink,
  RefreshCw,
  Pencil,
  Crown,
  FolderPlus,
  AlertCircle
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useVisualTemplates, type CustomVisualTemplate } from "@/lib/viral-posts/visual-templates-store";
import { removeImageBackground } from "@/lib/viral-posts/bg-remover";
import {
  fetchPixabayResources,
  getStoredPixabayKey,
  setStoredPixabayKey,
  testPixabayKey,
  type PixabayItem,
} from "@/lib/viral-posts/pixabay-client";
import { toPng } from "html-to-image";
import { jsPDF } from "jspdf";

export type TemplateId =
  | "blank"
  | "editorial"
  | "authority_quote"
  | "social_card"
  | "split_focus"
  | "big_metric"
  | "bold_highlighter";

export type AspectRatio = "4:5" | "1:1";
export type EditorMode = "single" | "carousel";
export type CanvaDockTab = "templates" | "text" | "elements" | "photos" | "backgrounds" | "videos" | "shape_edit" | "shape_color" | "shape_border_color" | "uploads";

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
  borderStyle?: "none" | "solid" | "dashed" | "dotted";
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
    | "shape_line"
    | "image"
    | "video";
  content?: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  scale?: number;
  rotation?: number;
  color?: string;
  bgColor?: string;
  borderColor?: string;
  borderWidth?: number;
  borderStyle?: "none" | "solid" | "dashed" | "dotted";
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
  metricLabel?: string;
  ctaPrompt?: string;
  swipeText?: string;
  titlePrefix?: string;
  highlightText?: string;
  titleSuffix?: string;
  offsets?: Record<string, { x: number; y: number }>;
  scales?: Record<string, number>;
  rotations?: Record<string, number>;
  dimensions?: Record<string, { width?: number; height?: number }>;
  hiddenElements?: Record<string, boolean>;
  customElements?: CustomCanvasElement[];
  elementStyles?: Record<string, ElementFormatting>;
}

/** Descompone y gestiona degradados lineales hacia transparente para figuras y fondos */
function parseGradientOrColor(bg?: string): { isGradient: boolean; direction: string; color: string } {
  if (!bg) return { isGradient: false, direction: "to bottom", color: "#ffffff" };
  if (bg.startsWith("linear-gradient")) {
    const match = bg.match(/linear-gradient\(\s*([^,]+),\s*([^,]+),\s*transparent\s*\)/i);
    if (match) {
      return {
        isGradient: true,
        direction: match[1].trim(),
        color: match[2].trim(),
      };
    }
    return { isGradient: true, direction: "to bottom", color: "#ffffff" };
  }
  return { isGradient: false, direction: "to bottom", color: bg };
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


export interface CutoutPresetItem {
  id: string;
  name: string;
  url: string;
  category: string;
  defaultWidth?: number;
  defaultHeight?: number;
}

// Catálogo curado de sujetos y personajes sin fondo (PNG transparente listos para Canva)
export const CUTOUT_PRESETS: CutoutPresetItem[] = [
  {
    id: "cutout-vr-girl",
    name: "Innovación VR & Tech",
    category: "Tech",
    url: "https://images.rawpixel.com/image_png_800/czNmcy1wcml2YXRlL3Jhd3BpeGVsX2ltYWdlcy93ZWJzaXRlX2NvbnRlbnQvczkzLXBtLTA2OC10ZWNoLTAwMi5wbmc.png",
    defaultWidth: 220,
    defaultHeight: 250,
  },
  {
    id: "cutout-exec-laptop",
    name: "Ejecutivo B2B Laptop",
    category: "Negocios",
    url: "https://images.rawpixel.com/image_png_800/czNmcy1wcml2YXRlL3Jhd3BpeGVsX2ltYWdlcy93ZWJzaXRlX2NvbnRlbnQvczkzLXBtLTA2OC10ZWNoLTAwMS5wbmc.png",
    defaultWidth: 210,
    defaultHeight: 250,
  },
  {
    id: "cutout-leader-point",
    name: "Líder Señalando Arriba",
    category: "Liderazgo",
    url: "https://images.rawpixel.com/image_png_800/czNmcy1wcml2YXRlL3Jhd3BpeGVsX2ltYWdlcy93ZWJzaXRlX2NvbnRlbnQvczkzLXBtLTA2OC10ZWNoLTAwMy5wbmc.png",
    defaultWidth: 200,
    defaultHeight: 260,
  },
  {
    id: "cutout-target-3d",
    name: "Diana 3D Resultados",
    category: "3D",
    url: "https://images.rawpixel.com/image_png_800/czNmcy1wcml2YXRlL3Jhd3BpeGVsX2ltYWdlcy93ZWJzaXRlX2NvbnRlbnQvczkzLXBtLTA2OC10ZWNoLTAwNC5wbmc.png",
    defaultWidth: 160,
    defaultHeight: 160,
  },
  {
    id: "cutout-rocket-3d",
    name: "Cohete 3D Escala",
    category: "3D",
    url: "https://images.rawpixel.com/image_png_800/czNmcy1wcml2YXRlL3Jhd3BpeGVsX2ltYWdlcy93ZWJzaXRlX2NvbnRlbnQvczkzLXBtLTA2OC10ZWNoLTAwNS5wbmc.png",
    defaultWidth: 170,
    defaultHeight: 170,
  },
];

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
  const ctx = useContext(SlideCanvasContext);
  const isEditing = Boolean(ctx?.editingElementKey === elementKey && !isExporting);

  // Sincronizar el contenido visual si el usuario no está activamente tecleando en él
  useEffect(() => {
    if (ref.current && !isEditingRef.current) {
      if (ref.current.innerText !== (value || "")) {
        ref.current.innerText = value || "";
      }
    }
  }, [value]);

  // Enfocar y seleccionar texto automáticamente al entrar en modo edición
  useEffect(() => {
    if (isEditing && ref.current) {
      isEditingRef.current = true;
      ref.current.focus();
      try {
        const range = document.createRange();
        range.selectNodeContents(ref.current);
        const sel = window.getSelection();
        sel?.removeAllRanges();
        sel?.addRange(range);
      } catch {}
    } else {
      isEditingRef.current = false;
    }
  }, [isEditing]);

  const format = ctx?.currentSlide.elementStyles?.[elementKey];
  const customElem = ctx?.currentSlide.customElements?.find((e) => e.id === elementKey);

  const computedStyle: React.CSSProperties = {
    ...style,
    ...(format?.fontFamily ? { fontFamily: format.fontFamily } : {}),
    ...(format?.fontSize ? { fontSize: `${format.fontSize}px` } : {}),
    ...(format?.color || customElem?.color ? { color: format?.color || customElem?.color } : {}),
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
      contentEditable={isEditing}
      suppressContentEditableWarning
      spellCheck={false}
      style={computedStyle}
      data-element={elementKey}
      onClick={(e: React.MouseEvent) => {
        if (!isEditing) {
          onSelect(elementKey);
        }
      }}
      onDoubleClick={(e: React.MouseEvent) => {
        e.stopPropagation();
        onSelect(elementKey);
        ctx?.setEditingElementKey?.(elementKey);
      }}
      onFocus={() => {
        isEditingRef.current = true;
      }}
      onBlur={(e: React.FocusEvent<HTMLElement>) => {
        isEditingRef.current = false;
        ctx?.setEditingElementKey?.(null);
        const newText = e.currentTarget.innerText.trim();
        onChange(newText || value);
      }}
      onKeyDown={(e: React.KeyboardEvent) => {
        if (e.key === "Escape") {
          e.preventDefault();
          (e.target as HTMLElement).blur();
        } else if (!multiline && e.key === "Enter") {
          e.preventDefault();
          (e.target as HTMLElement).blur();
        }
      }}
      className={`transition-all duration-150 outline-hidden ${
        isEditing ? "select-text cursor-text ring-2 ring-brand-400 bg-brand-500/20" : "select-none cursor-grab"
      } ${
        isExporting
          ? ""
          : isSelected && !isEditing
          ? "rounded px-1.5 -mx-1.5"
          : !isEditing
          ? "hover:ring-1 hover:ring-brand-400/40 rounded px-1.5 -mx-1.5"
          : "rounded px-1.5 -mx-1.5 shadow-sm"
      } ${className}`}
      title={
        isExporting
          ? undefined
          : isEditing
          ? "Escribe tu texto • Pulsa Enter o Esc para terminar"
          : "1 clic para mover • Doble clic para editar texto"
      }
    >
      {value || placeholder}
    </Component>
  );
}

/** Contexto de lienzo para sincronizar transformaciones, escalas y visibilidad */
interface SlideCanvasContextType {
  isFreeMode: boolean;
  isExporting: boolean;
  canvasZoom: number;
  currentSlide: CarouselSlideItem;
  selectedElement: string | null;
  editingElementKey?: string | null;
  setEditingElementKey?: (key: string | null) => void;
  onSelectElement?: (id: string) => void;
  onOffsetChange?: (id: string, offset: { x: number; y: number }) => void;
  onScaleChange?: (id: string, scale: number) => void;
  onRotationChange?: (id: string, rotation: number) => void;
  onSizeChange?: (id: string, newSize: { width?: number; height?: number }, newOffset?: { x: number; y: number }) => void;
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
  rotation?: number;
  onScaleChange?: (id: string, newScale: number) => void;
  onRotationChange?: (id: string, newRotation: number) => void;
  width?: number;
  height?: number;
  onSizeChange?: (
    id: string,
    newSize: { width?: number; height?: number },
    newOffset?: { x: number; y: number }
  ) => void;
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
  isText?: boolean;
  elementKey?: string;
  onStyleChange?: (id: string, styles: Partial<ElementFormatting>) => void;
}

type CanvaResizeHandle = "nw" | "ne" | "se" | "sw" | "n" | "s" | "e" | "w";

function DraggableWrapper(props: DraggableWrapperProps) {
  const ctx = useContext(SlideCanvasContext);
  const id = props.id;
  const isFreeMode = props.isFreeMode ?? ctx?.isFreeMode ?? false;
  const isExporting = props.isExporting ?? ctx?.isExporting ?? false;
  const offset = props.offset ?? ctx?.currentSlide.offsets?.[id] ?? { x: 0, y: 0 };
  const scale = props.scale ?? ctx?.currentSlide.scales?.[id] ?? 1;
  const isHidden = props.isHidden ?? Boolean(
    ctx?.currentSlide.hiddenElements?.[id] ||
    (props.elementKey && ctx?.currentSlide.hiddenElements?.[props.elementKey]) ||
    (id.includes("title") && ctx?.currentSlide.hiddenElements?.["title"]) ||
    (id.includes("subtitle") && ctx?.currentSlide.hiddenElements?.["subtitle"]) ||
    (id.includes("tag") && ctx?.currentSlide.hiddenElements?.["tag"]) ||
    (id.includes("metric") && (ctx?.currentSlide.hiddenElements?.["metric"] || ctx?.currentSlide.hiddenElements?.["title"])) ||
    (id.includes("card") && (ctx?.currentSlide.hiddenElements?.["brand"] || ctx?.currentSlide.hiddenElements?.[id])) ||
    (id.includes("footer") && (ctx?.currentSlide.hiddenElements?.["author-name"] || ctx?.currentSlide.hiddenElements?.[id] || ctx?.currentSlide.hiddenElements?.["footer"])) ||
    (id.includes("author") && (ctx?.currentSlide.hiddenElements?.["author-name"] || ctx?.currentSlide.hiddenElements?.[id])) ||
    (id.includes("bullets") && (ctx?.currentSlide.hiddenElements?.["bullets"] || ctx?.currentSlide.hiddenElements?.[id])) ||
    (id.includes("cta") && (ctx?.currentSlide.hiddenElements?.["cta"] || ctx?.currentSlide.hiddenElements?.[id])) ||
    (id.includes("stats") && (ctx?.currentSlide.hiddenElements?.["social-stats"] || ctx?.currentSlide.hiddenElements?.[id])) ||
    (id.includes("logo") && (ctx?.currentSlide.hiddenElements?.["bold-logo"] || ctx?.currentSlide.hiddenElements?.[id]))
  );
  const onOffsetChange = props.onOffsetChange ?? ctx?.onOffsetChange;
  const onScaleChange = props.onScaleChange ?? ctx?.onScaleChange;
  const onSizeChange = props.onSizeChange ?? ctx?.onSizeChange;
  const onStyleChange = props.onStyleChange ?? ctx?.onStyleChange;
  const onDelete = props.onDelete ?? ctx?.onDeleteElement;
  const onDuplicate = props.onDuplicate ?? ctx?.onDuplicateElement;
  const onSelect = props.onSelect ?? (() => ctx?.onSelectElement?.(id));
  const isSelected = props.isSelected ?? (ctx?.selectedElement === id);

  const isTextElement = Boolean(
    props.isText ||
    id.includes("title") ||
    id.includes("subtitle") ||
    id.includes("tag") ||
    id.includes("body") ||
    id.includes("quote") ||
    id.includes("footer") ||
    id.includes("metric") ||
    id.includes("bullets") ||
    id.includes("cta") ||
    id === "heading" ||
    id === "subheading" ||
    id === "text" ||
    (ctx?.currentSlide.customElements?.some((e) => e.id === id && ["heading", "subheading", "text"].includes(e.type)))
  );

  const getTargetKey = (): string => {
    if (props.elementKey) return props.elementKey;
    if (ctx?.selectedElement && isSelected) return ctx.selectedElement;
    if (id.includes("title")) return "title";
    if (id.includes("subtitle")) return "subtitle";
    if (id.includes("tag")) return "tag";
    if (id.includes("body") || id.includes("quote")) return "quote";
    if (id.includes("author") || id.includes("footer")) return "author";
    if (id.includes("metric")) return "metric";
    if (id.includes("bullets")) return "bullets";
    if (id.includes("cta")) return "cta";
    return id;
  };

  const wrapperRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const isPointerDownRef = useRef(false);
  const hasMovedRef = useRef(false);
  const dragStartPos = useRef({ x: 0, y: 0 });
  const initialOffset = useRef({ x: 0, y: 0 });
  const lastPointerDownTimeRef = useRef(0);

  // Rotación libre estilo Canva
  const [isRotating, setIsRotating] = useState(false);
  const rotateCenterRef = useRef({ x: 0, y: 0 });
  const initialAngleRef = useRef(0);
  const startRotationRef = useRef(0);
  const currentRotation = props.rotation ?? ctx?.currentSlide.rotations?.[id] ?? 0;
  const onRotationChange = props.onRotationChange ?? ctx?.onRotationChange;

  // 8 Manijas de redimensionamiento estilo Canva (4 esquinas circulares + 4 barras/píldoras laterales)
  const [activeHandle, setActiveHandle] = useState<CanvaResizeHandle | null>(null);
  const resizeStartPos = useRef({ x: 0, y: 0 });
  const initialDimsRef = useRef({ width: 100, height: 60 });
  const initialOffsetRef = useRef({ x: 0, y: 0 });
  const initialFontSizeRef = useRef(28);
  const anchorVRef = useRef<"top" | "bottom" | "center">("top");

  if (isHidden) {
    return null;
  }

  // 1 Clic para seleccionar y mover a voluntad • Doble clic para editar texto directamente
  const handlePointerDown = (e: React.PointerEvent) => {
    if (!isFreeMode || isExporting) return;
    const target = e.target as HTMLElement;
    const isResize = target.closest('[data-resize-handle="true"]');
    const isRotate = target.closest('[data-rotate-handle="true"]');
    const isControl = target.closest("button") || target.tagName === "BUTTON";
    const isContent = target.isContentEditable;

    if (isControl || isResize || isRotate) return;

    // Si ya está activamente escribiendo dentro del contenido, permitir selección de texto estándar
    if (isContent && document.activeElement === target) {
      return;
    }

    // Detección instantánea de doble clic para editar texto (estilo Canva)
    const now = Date.now();
    const timeSinceLast = now - lastPointerDownTimeRef.current;
    if (isTextElement && timeSinceLast > 0 && timeSinceLast < 380) {
      lastPointerDownTimeRef.current = 0;
      isPointerDownRef.current = false;
      hasMovedRef.current = false;
      setIsDragging(false);
      onSelect?.();
      ctx?.setEditingElementKey?.(getTargetKey());
      return;
    }
    lastPointerDownTimeRef.current = now;

    // Preparar estado de arrastre con 1 clic
    isPointerDownRef.current = true;
    hasMovedRef.current = false;
    dragStartPos.current = { x: e.clientX, y: e.clientY };
    initialOffset.current = { x: offset?.x || 0, y: offset?.y || 0 };
    onSelect?.();
  };

  // Manejador específico para la manito de mover (move handle knob)
  const handleMoveHandleDown = (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {}
    isPointerDownRef.current = true;
    hasMovedRef.current = true;
    setIsDragging(true);
    onSelect?.();
    dragStartPos.current = { x: e.clientX, y: e.clientY };
    initialOffset.current = { x: offset?.x || 0, y: offset?.y || 0 };
  };

  // Manejo de giro / rotación libre con PointerEvents (Estilo Canva)
  const handleRotateDown = (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {}
    setIsRotating(true);
    onSelect?.();

    if (wrapperRef.current) {
      const rect = wrapperRef.current.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      rotateCenterRef.current = { x: cx, y: cy };
      const startRad = Math.atan2(e.clientY - cy, e.clientX - cx);
      initialAngleRef.current = startRad * (180 / Math.PI);
      startRotationRef.current = currentRotation;
    }
  };

  const handleRotateMove = (e: React.PointerEvent) => {
    if (!isRotating) return;
    e.preventDefault();
    e.stopPropagation();

    const cx = rotateCenterRef.current.x;
    const cy = rotateCenterRef.current.y;
    const currentRad = Math.atan2(e.clientY - cy, e.clientX - cx);
    const currentDeg = currentRad * (180 / Math.PI);

    const deltaDeg = currentDeg - initialAngleRef.current;
    let newDeg = Math.round((startRotationRef.current + deltaDeg) % 360);
    if (newDeg > 180) newDeg -= 360;
    if (newDeg < -180) newDeg += 360;

    // Snapping magnético inteligente (Canva style: 0°, 45°, 90°, etc.)
    const snapAngles = [0, 45, 90, 135, 180, -45, -90, -135, -180];
    for (const snap of snapAngles) {
      if (Math.abs(newDeg - snap) <= 3) {
        newDeg = snap;
        break;
      }
    }

    onRotationChange?.(id, newDeg);
  };

  const handleRotateUp = (e: React.PointerEvent) => {
    if (!isRotating) return;
    e.stopPropagation();
    setIsRotating(false);
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}
    onSelect?.();
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isPointerDownRef.current) return;

    const dxRaw = e.clientX - dragStartPos.current.x;
    const dyRaw = e.clientY - dragStartPos.current.y;
    const dist = Math.hypot(dxRaw, dyRaw);

    // Umbral de 3px para distinguir clic simple de arrastre
    if (!hasMovedRef.current && dist > 3) {
      hasMovedRef.current = true;
      setIsDragging(true);
      try {
        (wrapperRef.current as HTMLElement)?.setPointerCapture(e.pointerId);
      } catch {}
    }

    if (hasMovedRef.current) {
      e.preventDefault();
      const zoom = ctx?.canvasZoom || 1;
      const dx = dxRaw / zoom;
      const dy = dyRaw / zoom;
      onOffsetChange?.(id, {
        x: Math.round(initialOffset.current.x + dx),
        y: Math.round(initialOffset.current.y + dy),
      });
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isPointerDownRef.current) return;
    isPointerDownRef.current = false;

    if (hasMovedRef.current) {
      e.stopPropagation();
      setIsDragging(false);
      try {
        (wrapperRef.current as HTMLElement)?.releasePointerCapture(e.pointerId);
      } catch {}
    }
  };

  // Manejo de arrastre de cualquiera de las 8 manijas estilo Canva
  const handleResizeDown = (handle: CanvaResizeHandle, e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {}
    setActiveHandle(handle);
    onSelect?.();
    resizeStartPos.current = { x: e.clientX, y: e.clientY };

    const zoom = (ctx?.canvasZoom || 1);
    const scaleZoom = zoom * (scale ?? 1);
    const domRect = wrapperRef.current ? wrapperRef.current.getBoundingClientRect() : null;
    const domW = domRect ? domRect.width / scaleZoom : 120;
    const domH = domRect ? domRect.height / scaleZoom : 80;

    const resolvedW = props.width ?? ctx?.currentSlide.dimensions?.[id]?.width ?? domW;
    const resolvedH = props.height ?? ctx?.currentSlide.dimensions?.[id]?.height ?? domH;

    initialDimsRef.current = {
      width: resolvedW,
      height: resolvedH,
    };
    initialOffsetRef.current = {
      x: offset?.x || 0,
      y: offset?.y || 0,
    };

    // Detectar anclaje vertical del elemento en su contenedor padre
    const parent = wrapperRef.current?.parentElement;
    let anchorV: "top" | "bottom" | "center" = "top";

    if (id === "editorial-card" || id === "split-card") {
      anchorV = "bottom";
    } else if (id === "social-card") {
      anchorV = "center";
    } else if (parent) {
      const pStyle = window.getComputedStyle(parent);
      const isCol = pStyle.flexDirection === "column" || pStyle.flexDirection === "column-reverse";
      if (isCol) {
        if (pStyle.justifyContent === "flex-end" || pStyle.justifyContent === "end") {
          anchorV = "bottom";
        } else if (pStyle.justifyContent === "center") {
          anchorV = "center";
        }
      } else {
        if (pStyle.alignItems === "flex-end" || pStyle.alignItems === "end") {
          anchorV = "bottom";
        } else if (pStyle.alignItems === "center") {
          anchorV = "center";
        }
      }
    }
    anchorVRef.current = anchorV;

    if (isTextElement) {
      const targetKey = getTargetKey();
      const currentFormat = ctx?.currentSlide.elementStyles?.[targetKey] || {};
      const customElem = ctx?.currentSlide.customElements?.find((el) => el.id === id);

      const defaultFontSize = (
        targetKey.includes("metric") ? 42 :
        targetKey.includes("title") ? 28 :
        targetKey.includes("subtitle") ? 18 :
        targetKey.includes("tag") ? 12 :
        customElem?.fontSize ? customElem.fontSize :
        16
      );

      initialFontSizeRef.current = currentFormat.fontSize || defaultFontSize;
    }
  };

  const handleResizeMove = (e: React.PointerEvent) => {
    if (!activeHandle) return;
    e.preventDefault();
    e.stopPropagation();

    const zoom = ctx?.canvasZoom || 1;
    const dx = (e.clientX - resizeStartPos.current.x) / zoom;
    const dy = (e.clientY - resizeStartPos.current.y) / zoom;

    const isCorner = activeHandle === "nw" || activeHandle === "ne" || activeHandle === "se" || activeHandle === "sw";

    // Si es un elemento de texto y se redimensiona desde cualquiera de las 4 esquinas:
    // ESCALAR EL TAMAÑO DE LA FUENTE EN TIEMPO REAL (Estilo Canva nativo)
    if (isTextElement && isCorner) {
      const targetKey = getTargetKey();
      let delta = 0;
      if (activeHandle === "se") {
        delta = (dx + dy) / 2;
      } else if (activeHandle === "nw") {
        delta = -(dx + dy) / 2;
      } else if (activeHandle === "ne") {
        delta = (dx - dy) / 2;
      } else if (activeHandle === "sw") {
        delta = -(dx - dy) / 2;
      }

      // Factor de redimensionamiento proporcional
      const factor = Math.max(0.25, Math.min(3.5, 1 + delta / 120));
      const nextFontSize = Math.max(8, Math.min(120, Math.round(initialFontSizeRef.current * factor)));

      // 1. Modificar el tamaño de fuente inmediatamente
      onStyleChange?.(targetKey, { fontSize: nextFontSize });

      // 2. Modificar el ancho de la caja de texto proporcionalmente (mantiene el salto de línea perfecto)
      const nextW = Math.max(40, Math.round(initialDimsRef.current.width * factor));

      let newX = initialOffsetRef.current.x;
      let newY = initialOffsetRef.current.y;
      if (activeHandle === "nw" || activeHandle === "sw") {
        newX = initialOffsetRef.current.x + (initialDimsRef.current.width - nextW);
      }

      onSizeChange?.(
        id,
        { width: nextW },
        { x: Math.round(newX), y: Math.round(newY) }
      );
      return;
    }

    // Redimensionamiento estándar de ancho/alto (para manijas laterales y formas no-texto)
    const minW = 20;
    const minH = 15;

    let newW = initialDimsRef.current.width;
    let newH = initialDimsRef.current.height;
    let newX = initialOffsetRef.current.x;
    let newY = initialOffsetRef.current.y;

    const hasE = activeHandle.includes("e");
    const hasW = activeHandle.includes("w");
    const hasN = activeHandle.includes("n");
    const hasS = activeHandle.includes("s");

    // Horizontal (ancho / X)
    if (hasE) {
      newW = Math.max(minW, initialDimsRef.current.width + dx);
    } else if (hasW) {
      const tentativeW = initialDimsRef.current.width - dx;
      const actualW = Math.max(minW, tentativeW);
      const clampedDx = initialDimsRef.current.width - actualW;
      newW = actualW;
      newX = initialOffsetRef.current.x + clampedDx;
    }

    // Vertical (alto / Y) respetando el punto de anclaje (top, bottom, center)
    const anchorV = anchorVRef.current;
    if (hasN) {
      const tentativeH = initialDimsRef.current.height - dy;
      const actualH = Math.max(minH, tentativeH);
      const clampedDy = initialDimsRef.current.height - actualH;
      newH = actualH;

      if (anchorV === "bottom") {
        // Elemento anclado abajo (ej. fondo de tarjeta editorial):
        // En flexbox justify-end, aumentar o reducir la altura mueve naturalmente el borde superior
        // 1:1 con el cursor del mouse, sin tocar el offset Y (el borde inferior permanece intacto).
        newY = initialOffsetRef.current.y;
      } else if (anchorV === "center") {
        // Elemento centrado: la expansión de flexbox distribuye la mitad arriba y la mitad abajo.
        newY = initialOffsetRef.current.y + clampedDy / 2;
      } else {
        // Elemento estándar anclado arriba: el desplazamiento dy compensa la posición para fijar el fondo.
        newY = initialOffsetRef.current.y + clampedDy;
      }
    } else if (hasS) {
      const tentativeH = initialDimsRef.current.height + dy;
      const actualH = Math.max(minH, tentativeH);
      const clampedDy = actualH - initialDimsRef.current.height;
      newH = actualH;

      if (anchorV === "bottom") {
        // Elemento anclado abajo: para expandir hacia abajo sin mover el borde superior,
        // se traslada el offset Y junto con la altura.
        newY = initialOffsetRef.current.y + clampedDy;
      } else if (anchorV === "center") {
        newY = initialOffsetRef.current.y + clampedDy / 2;
      } else {
        // Elemento anclado arriba: el borde superior está fijo, el inferior crece naturalmente.
        newY = initialOffsetRef.current.y;
      }
    }

    onSizeChange?.(
      id,
      { width: Math.round(newW), height: Math.round(newH) },
      { x: Math.round(newX), y: Math.round(newY) }
    );
  };

  const handleResizeUp = (e: React.PointerEvent) => {
    if (!activeHandle) return;
    e.stopPropagation();
    setActiveHandle(null);
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}
    onSelect?.();
  };

  const posX = offset?.x || 0;
  const posY = offset?.y || 0;
  const currentScale = scale ?? 1;
  const hasMoved = posX !== 0 || posY !== 0;
  const hasRotated = currentRotation !== 0;
  const hasScaled = currentScale !== 1;
  const positionClass = props.className?.includes("absolute") ? "" : "relative";

  const resolvedWidth = props.width ?? ctx?.currentSlide.dimensions?.[id]?.width;
  const resolvedHeight = !isTextElement ? (props.height ?? ctx?.currentSlide.dimensions?.[id]?.height) : undefined;
  const isTransforming = isDragging || isRotating || Boolean(activeHandle);

  const transformParts: string[] = [];
  if (hasMoved) {
    transformParts.push(`translate(${posX}px, ${posY}px)`);
  }
  if (hasRotated) {
    transformParts.push(`rotate(${currentRotation}deg)`);
  }
  if (hasScaled) {
    transformParts.push(`scale(${currentScale})`);
  }

  return (
    <div
      ref={wrapperRef}
      onClick={(e) => {
        e.stopPropagation();
        onSelect?.();
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      style={{
        ...props.style,
        ...(resolvedWidth ? { width: `${resolvedWidth}px` } : {}),
        ...(resolvedHeight ? { height: `${resolvedHeight}px` } : {}),
        transform: transformParts.join(" ") || undefined,
        transformOrigin: "center center",
        touchAction: isFreeMode ? "none" : undefined,
      }}
      className={`${positionClass} ${isTransforming ? "" : "transition-transform duration-75"} ${
        isFreeMode && !isExporting
          ? `group/drag select-none ${
              isDragging
                ? `ring-2 ring-brand-400 ${id === "bg-photo" ? "" : "bg-brand-500/10"} shadow-2xl z-50 cursor-grabbing`
                : isSelected
                ? "ring-2 ring-brand-400 ring-offset-1 ring-offset-transparent z-40 cursor-grab"
                : `hover:ring-1 hover:ring-brand-400/60 ${id === "bg-photo" ? "" : "hover:bg-white/5"} z-20 cursor-grab`
            }`
          : ""
      } ${props.className || ""}`}
    >
      {/* 8 Manijas de redimensionamiento estilo Canva: 4 esquinas circulares + 4 barras/píldoras laterales */}
      {isFreeMode && isSelected && !isExporting && (
        <>
          {/* 4 Esquinas circulares (redimensionamiento 2D libre) */}
          <div
            data-resize-handle="true"
            onPointerDown={(e) => handleResizeDown("nw", e)}
            onPointerMove={handleResizeMove}
            onPointerUp={handleResizeUp}
            title="Arrastra para redimensionar (esquina sup-izq)"
            className="absolute -top-1.5 -left-1.5 size-3 rounded-full bg-white border-2 border-brand-500 shadow-md cursor-nwse-resize z-50 hover:scale-125 transition-transform"
          />
          <div
            data-resize-handle="true"
            onPointerDown={(e) => handleResizeDown("ne", e)}
            onPointerMove={handleResizeMove}
            onPointerUp={handleResizeUp}
            title="Arrastra para redimensionar (esquina sup-der)"
            className="absolute -top-1.5 -right-1.5 size-3 rounded-full bg-white border-2 border-brand-500 shadow-md cursor-nesw-resize z-50 hover:scale-125 transition-transform"
          />
          <div
            data-resize-handle="true"
            onPointerDown={(e) => handleResizeDown("se", e)}
            onPointerMove={handleResizeMove}
            onPointerUp={handleResizeUp}
            title="Arrastra para redimensionar (esquina inf-der)"
            className="absolute -bottom-1.5 -right-1.5 size-3 rounded-full bg-white border-2 border-brand-500 shadow-md cursor-nwse-resize z-50 hover:scale-125 transition-transform"
          />
          <div
            data-resize-handle="true"
            onPointerDown={(e) => handleResizeDown("sw", e)}
            onPointerMove={handleResizeMove}
            onPointerUp={handleResizeUp}
            title="Arrastra para redimensionar (esquina inf-izq)"
            className="absolute -bottom-1.5 -left-1.5 size-3 rounded-full bg-white border-2 border-brand-500 shadow-md cursor-nesw-resize z-50 hover:scale-125 transition-transform"
          />

          {/* 4 Píldoras/Barras laterales estilo Canva para ancho y alto independientes */}
          {/* Borde Superior (n) - cápsula horizontal */}
          <div
            data-resize-handle="true"
            onPointerDown={(e) => handleResizeDown("n", e)}
            onPointerMove={handleResizeMove}
            onPointerUp={handleResizeUp}
            title="Arrastra para cambiar altura (superior)"
            className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-5 h-2 rounded-full bg-white border border-brand-500 shadow-md cursor-ns-resize z-50 hover:scale-125 transition-transform"
          />
          {/* Borde Inferior (s) - cápsula horizontal */}
          <div
            data-resize-handle="true"
            onPointerDown={(e) => handleResizeDown("s", e)}
            onPointerMove={handleResizeMove}
            onPointerUp={handleResizeUp}
            title="Arrastra para cambiar altura (inferior)"
            className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-5 h-2 rounded-full bg-white border border-brand-500 shadow-md cursor-ns-resize z-50 hover:scale-125 transition-transform"
          />
          {/* Borde Izquierdo (w) - cápsula vertical */}
          <div
            data-resize-handle="true"
            onPointerDown={(e) => handleResizeDown("w", e)}
            onPointerMove={handleResizeMove}
            onPointerUp={handleResizeUp}
            title="Arrastra para cambiar anchura (izquierda)"
            className="absolute left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-5 rounded-full bg-white border border-brand-500 shadow-md cursor-ew-resize z-50 hover:scale-125 transition-transform"
          />
          {/* Borde Derecho (e) - cápsula vertical */}
          <div
            data-resize-handle="true"
            onPointerDown={(e) => handleResizeDown("e", e)}
            onPointerMove={handleResizeMove}
            onPointerUp={handleResizeUp}
            title="Arrastra para cambiar anchura (derecha)"
            className="absolute right-0 top-1/2 translate-x-1/2 -translate-y-1/2 w-2 h-5 rounded-full bg-white border border-brand-500 shadow-md cursor-ew-resize z-50 hover:scale-125 transition-transform"
          />

          {/* BARRA DE ACCIONES FLOTANTE ESTILO CANVA (GIRAR + MOVER CON MANITO) */}
          <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 flex items-center gap-1.5 z-50 pointer-events-auto">
            {/* 1. Manija de Rotación Libre Estilo Canva */}
            <div
              data-rotate-handle="true"
              onPointerDown={handleRotateDown}
              onPointerMove={handleRotateMove}
              onPointerUp={handleRotateUp}
              title={`Girar objeto (${Math.round(currentRotation)}°) - Arrastra en círculo para rotar`}
              className="size-7 rounded-full bg-white border border-brand-500 shadow-xl flex items-center justify-center cursor-grab active:cursor-grabbing hover:bg-brand-50 hover:scale-110 transition-transform select-none"
            >
              <RotateCw className="size-3.5 text-brand-600" />
            </div>

            {/* 2. Manija de Mover con la Manito Estilo Canva */}
            <div
              data-move-handle="true"
              onPointerDown={handleMoveHandleDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              title="Mover objeto (Arrastra con la manito)"
              className="size-7 rounded-full bg-white border border-brand-500 shadow-xl flex items-center justify-center cursor-grab active:cursor-grabbing hover:bg-brand-50 hover:scale-110 transition-transform select-none"
            >
              <Move className="size-3.5 text-brand-600" />
            </div>

            {/* Tooltip con ángulo en vivo durante rotación */}
            {isRotating && (
              <div className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-slate-900 text-white text-[10px] font-mono font-bold shadow-xl border border-white/20 whitespace-nowrap pointer-events-none z-50 animate-in fade-in">
                {Math.round(currentRotation)}°
              </div>
            )}
          </div>
        </>
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
  const [editingElementKey, setEditingElementKey] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateId>("blank");
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>("4:5");
  const [selectedBgUrl, setSelectedBgUrl] = useState<string>("");
  const [bgScale, setBgScale] = useState(1.15);
  const [bgDimming, setBgDimming] = useState(0);

  const handleBgZoomChange = (delta: number) => {
    setBgScale((prev) => Math.min(3, Math.max(1, +(prev + delta).toFixed(2))));
  };
  const [accentColor, setAccentColor] = useState("#0099ff");
  const [overlayOpacity, setOverlayOpacity] = useState(0.8);
  const [overlayMode, setOverlayMode] = useState<"card" | "fullscreen">("card");
  const [selectedFont, setSelectedFont] = useState(AVAILABLE_FONTS[0].name);

  // Estados de interactividad directa y formato en el lienzo
  const [selectedElement, setSelectedElement] = useState<string | null>("title");
  const [titleSize, setTitleSize] = useState<"sm" | "md" | "lg" | "xl">("lg");

  // Modo Híbrido: Auto-Layout (false) vs Modo Libre Arrastrable (true)
  // Modo Libre activo permanentemente (estilo Canva nativo)
  const [isFreeMode, setIsFreeMode] = useState(true);
  const [isCanvasDragOver, setIsCanvasDragOver] = useState(false);

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

  // Hook de autenticación para rol SuperAdmin
  const { isSuperAdmin, currentUser } = useAuth();

  // Hook del gestor de plantillas personalizadas (Biblioteca)
  const {
    templates: customTemplates,
    saveTemplate,
    deleteTemplate,
    updateMeta,
  } = useVisualTemplates();

  // Seguimiento de plantilla activa cargada en lienzo
  const [activeCustomTemplateId, setActiveCustomTemplateId] = useState<string | null>(null);

  // Modales de Gestión de Templates
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [saveForm, setSaveForm] = useState<{
    name: string;
    desc: string;
    category: string;
    saveAsNew: boolean;
  }>({
    name: "",
    desc: "",
    category: "B2B",
    saveAsNew: true,
  });

  const [editingTemplate, setEditingTemplate] = useState<CustomVisualTemplate | null>(null);
  const [editMetaForm, setEditMetaForm] = useState<{
    name: string;
    desc: string;
    category: string;
    overwriteWithCurrentCanvas: boolean;
  }>({
    name: "",
    desc: "",
    category: "B2B",
    overwriteWithCurrentCanvas: false,
  });

  const [templateToDelete, setTemplateToDelete] = useState<CustomVisualTemplate | null>(null);

  // Estados de Búsqueda y Filtros de Plantillas (Estilo Canva)
  const [templateSearchQuery, setTemplateSearchQuery] = useState("");
  const [templateCategoryFilter, setTemplateCategoryFilter] = useState<string>("all");

  // Estados del Motor Magic BG Remover (Quitar Fondo con IA)
  const [isRemovingBg, setIsRemovingBg] = useState(false);
  const [bgRemoverProgress, setBgRemoverProgress] = useState<{ message: string; percent: number } | null>(null);
  const [bgRemoverTargetId, setBgRemoverTargetId] = useState<string | null>(null);

  // Remueve el fondo de un elemento de imagen en el lienzo
  const handleRemoveBackgroundFromElement = async (elementId: string) => {
    const elem = currentSlide.customElements?.find((e) => e.id === elementId);
    if (!elem || (elem.type !== "image" && elem.type !== "video") || !elem.content) return;

    setIsRemovingBg(true);
    setBgRemoverTargetId(elementId);
    setBgRemoverProgress({ message: "Iniciando motor de segmentación...", percent: 15 });

    try {
      const cutoutDataUrl = await removeImageBackground(elem.content, (prog) => {
        setBgRemoverProgress({ message: prog.message, percent: prog.percent });
      });

      handleUpdateCustomElement(elementId, {
        content: cutoutDataUrl,
        bgColor: "transparent",
        borderWidth: 0,
        borderRadius: 0,
      });

      setExportFeedback("¡Fondo removido con éxito! Sujeto recortado en PNG transparente.");
      setTimeout(() => setExportFeedback(null), 3500);
    } catch (err: any) {
      console.error("Error al quitar fondo:", err);
      setExportFeedback("No se pudo remover el fondo de esta foto.");
      setTimeout(() => setExportFeedback(null), 3500);
    } finally {
      setIsRemovingBg(false);
      setBgRemoverTargetId(null);
      setBgRemoverProgress(null);
    }
  };

  // Remueve el fondo de la foto de fondo del lienzo con IA (Magic BG Remover)
  const handleRemoveBackgroundFromBgPhoto = async () => {
    if (!selectedBgUrl) return;

    setIsRemovingBg(true);
    setBgRemoverTargetId("bg-photo");
    setBgRemoverProgress({ message: "Segmentando sujeto principal de la foto...", percent: 20 });

    try {
      const cutoutDataUrl = await removeImageBackground(selectedBgUrl, (prog) => {
        setBgRemoverProgress({ message: prog.message, percent: prog.percent });
      });

      // Insertamos el sujeto recortado como elemento interactivo sobre el lienzo
      setIsFreeMode(true);
      const newId = `elem-${Date.now()}`;
      const cutoutElem: CustomCanvasElement = {
        id: newId,
        type: "image",
        content: cutoutDataUrl,
        x: 60,
        y: 80,
        width: 260,
        height: 280,
        scale: 1,
        bgColor: "transparent",
        borderWidth: 0,
        borderRadius: 0,
      };

      setSlides((prev) => {
        const next = [...prev];
        const current = next[currentSlideIndex];
        const prevCustom = current.customElements || [];
        next[currentSlideIndex] = {
          ...current,
          customElements: [...prevCustom, cutoutElem],
        };
        return next;
      });

      setSelectedElement(newId);
      setExportFeedback("¡Fondo removido! Sujeto recortado listo para mover y redimensionar.");
      setTimeout(() => setExportFeedback(null), 3500);
    } catch (err: any) {
      console.error("Error al quitar fondo de la foto:", err);
      setExportFeedback("No se pudo remover el fondo de esta foto.");
      setTimeout(() => setExportFeedback(null), 3500);
    } finally {
      setIsRemovingBg(false);
      setBgRemoverTargetId(null);
      setBgRemoverProgress(null);
    }
  };

  // Inserta una foto directamente como sujeto recortado en el lienzo
  const handleInsertPhotoAsCutout = async (photoUrl: string) => {
    setIsRemovingBg(true);
    setBgRemoverTargetId("new");
    setBgRemoverProgress({ message: "Procesando sujeto con IA...", percent: 20 });

    try {
      const cutoutDataUrl = await removeImageBackground(photoUrl, (prog) => {
        setBgRemoverProgress({ message: prog.message, percent: prog.percent });
      });

      setIsFreeMode(true);
      const newId = `elem-${Date.now()}`;
      const cutoutElem: CustomCanvasElement = {
        id: newId,
        type: "image",
        content: cutoutDataUrl,
        x: 60,
        y: 100,
        width: 220,
        height: 240,
        scale: 1,
        bgColor: "transparent",
        borderWidth: 0,
        borderRadius: 0,
        opacity: 1,
      };

      setSlides((prev) => {
        const next = [...prev];
        const cur = next[currentSlideIndex];
        next[currentSlideIndex] = {
          ...cur,
          customElements: [...(cur.customElements || []), cutoutElem],
        };
        return next;
      });

      setSelectedElement(newId);
      setExportFeedback("¡Sujeto recortado insertado en el lienzo!");
      setTimeout(() => setExportFeedback(null), 3500);
    } catch (err: any) {
      console.error("Error al recortar e insertar:", err);
      setExportFeedback("Error al procesar el recorte de la foto");
      setTimeout(() => setExportFeedback(null), 3500);
    } finally {
      setIsRemovingBg(false);
      setBgRemoverTargetId(null);
      setBgRemoverProgress(null);
    }
  };

  // Remueve el fondo de un item de la galería de Uploads
  const handleRemoveBackgroundFromUploadItem = async (item: { id: string; name: string; url: string }) => {
    setIsRemovingBg(true);
    setBgRemoverTargetId(item.id);
    setBgRemoverProgress({ message: "Recortando imagen subida...", percent: 20 });

    try {
      const cutoutDataUrl = await removeImageBackground(item.url, (prog) => {
        setBgRemoverProgress({ message: prog.message, percent: prog.percent });
      });

      const newCutoutId = `cutout-${Date.now()}`;
      const newUploadItem = {
        id: newCutoutId,
        name: `[Sin Fondo] ${item.name}`,
        type: "image" as const,
        url: cutoutDataUrl,
        format: "PNG",
        uploadedAt: Date.now(),
      };

      setUploadedMedia((prev) => [newUploadItem, ...prev]);

      // También lo insertamos en el lienzo de trabajo
      setIsFreeMode(true);
      const newElemId = `elem-${Date.now()}`;
      const cutoutElem: CustomCanvasElement = {
        id: newElemId,
        type: "image",
        content: cutoutDataUrl,
        x: 60,
        y: 100,
        width: 220,
        height: 240,
        scale: 1,
        bgColor: "transparent",
        borderWidth: 0,
        borderRadius: 0,
        opacity: 1,
      };

      setSlides((prev) => {
        const next = [...prev];
        const cur = next[currentSlideIndex];
        next[currentSlideIndex] = {
          ...cur,
          customElements: [...(cur.customElements || []), cutoutElem],
        };
        return next;
      });

      setSelectedElement(newElemId);
      setExportFeedback("¡Foto recortada y agregada a tus archivos!");
      setTimeout(() => setExportFeedback(null), 3500);
    } catch (err: any) {
      console.error("Error al recortar item:", err);
      setExportFeedback("Error al remover el fondo del archivo");
      setTimeout(() => setExportFeedback(null), 3500);
    } finally {
      setIsRemovingBg(false);
      setBgRemoverTargetId(null);
      setBgRemoverProgress(null);
    }
  };

  // Handlers de Guardado, Edición y Eliminación de Templates
  const handleOpenSaveModal = () => {
    const activeTpl = customTemplates.find((t) => t.id === activeCustomTemplateId);
    const defaultName = slides[0]?.title
      ? slides[0].title.slice(0, 32).trim()
      : "Plantilla Personalizada B2B";

    setSaveForm({
      name: activeTpl ? activeTpl.name : defaultName,
      desc: activeTpl?.desc || "",
      category: activeTpl?.category || "B2B",
      saveAsNew: !activeTpl,
    });
    setIsSaveModalOpen(true);
  };

  const handleConfirmSaveTemplate = async () => {
    if (!saveForm.name.trim()) return;

    // Generar captura de miniatura limpia sin manijas de seleccion (modo limpio estilo Canva)
    let thumbnailDataUrl: string | undefined = undefined;
    if (slideContainerRef.current) {
      try {
        setIsExporting(true);
        // Espera corta para que React renderice el estado limpio sin cajas azules ni manijas
        await new Promise((r) => setTimeout(r, 65));
        thumbnailDataUrl = await toPng(slideContainerRef.current, {
          pixelRatio: 0.35,
          quality: 0.65,
        });
      } catch (err) {
        console.warn("No se pudo generar miniatura automática:", err);
      } finally {
        setIsExporting(false);
      }
    }

    const targetId = !saveForm.saveAsNew && activeCustomTemplateId
      ? activeCustomTemplateId
      : undefined;

    const saved = saveTemplate({
      id: targetId,
      name: saveForm.name.trim(),
      desc: saveForm.desc.trim() || undefined,
      category: saveForm.category.trim() || "B2B",
      authorName: currentUser?.name || "SuperAdmin",
      baseTemplate: selectedTemplate,
      aspectRatio,
      editorMode,
      selectedBgUrl,
      bgDim: bgDimming / 100,
      bgBlur: 0,
      brandColor: accentColor,
      fontFamily: selectedFont,
      slides: JSON.parse(JSON.stringify(slides)),
      thumbnail: thumbnailDataUrl,
    });

    setActiveCustomTemplateId(saved.id);
    setIsSaveModalOpen(false);
    setExportFeedback(`Plantilla "${saved.name}" guardada con éxito en la biblioteca`);
    setTimeout(() => setExportFeedback(null), 3500);

    setActiveDockTab("templates");
    setIsDrawerOpen(true);
  };

    // Aplica plantilla oficial con fotografias y textos curados segun estilo
  const applyOfficialTemplate = (templateId: TemplateId) => {
    setSelectedTemplate(templateId);
    setActiveCustomTemplateId(null);

    // Asignar fondo curado si no habia uno seleccionado
    if (!selectedBgUrl) {
      if (templateId === "editorial") setSelectedBgUrl(CURATED_BACKGROUNDS[0].url);
      else if (templateId === "authority_quote") setSelectedBgUrl(CURATED_BACKGROUNDS[1]?.url || CURATED_BACKGROUNDS[0].url);
      else if (templateId === "social_card") setSelectedBgUrl(CURATED_BACKGROUNDS[2]?.url || CURATED_BACKGROUNDS[0].url);
      else if (templateId === "split_focus") setSelectedBgUrl(CURATED_BACKGROUNDS[3]?.url || CURATED_BACKGROUNDS[0].url);
      else if (templateId === "big_metric") setSelectedBgUrl(CURATED_BACKGROUNDS[0].url);
      else if (templateId === "bold_highlighter") setSelectedBgUrl(CURATED_BACKGROUNDS[0].url);
    }

    // Si la lamina estaba en blanco, poblar textos clave del estilo oficial
    setSlides((prev) => {
      const next = [...prev];
      const cur = next[currentSlideIndex];
      if (!cur.title || cur.title.trim() === "") {
        if (templateId === "editorial") {
          cur.title = "El error #1 que frena las conversiones de tu equipo en LinkedIn:";
          cur.subtitle = "No es el algoritmo. Es hablar del producto antes de validar el dolor.";
          cur.tag = "ESTRATEGIA B2B";
        } else if (templateId === "authority_quote") {
          cur.title = "«La personalización contextual es la única ventaja que la IA no puede copiar.»";
          cur.subtitle = "Si tu prospección suena como un mensaje masivo, será tratada como spam.";
          cur.tag = "LIDERAZGO B2B";
        } else if (templateId === "social_card") {
          cur.title = "Las 3 palancas para prospectar en frío en LinkedIn sin quemar cuentas.";
          cur.subtitle = "Paso a paso de lo que aprendimos analizando 50,000 interacciones.";
          cur.tag = "INSIGHT VIRAL";
        } else if (templateId === "split_focus") {
          cur.title = "Cómo los líderes B2B cierran reuniones en 2026";
          cur.subtitle = "El framework 50/50 de prospección consultiva.";
          cur.tag = "MÉTODO 50/50";
        } else if (templateId === "big_metric") {
          cur.title = "Tasa de respuesta validada en secuencias multicanal";
          cur.subtitle = "Comparado con el promedio de la industria del 2.4%";
          cur.metric = "+340%";
          cur.tag = "MÉTRICA VALIDADA";
        } else if (templateId === "bold_highlighter") {
          cur.title = "el 90% de los [mensajes b2b] terminan en la papelera";
          cur.subtitle = "El problema no es el volumen, es la falta de estrategia operativa...";
          cur.tag = "VIRAL B2B";
          cur.highlightText = "mensajes b2b";
        }
      }
      return next;
    });

    const targetDef = TEMPLATES.find((t) => t.id === templateId);
    setExportFeedback(`Plantilla "${targetDef?.name || templateId}" aplicada`);
    setTimeout(() => setExportFeedback(null), 2500);
  };

  // Restablece el lienzo a blanco limpio (Estilo Canva desde cero)
  const handleResetToBlankCanvas = () => {
    setSelectedTemplate("blank");
    setActiveCustomTemplateId(null);
    setSelectedBgUrl("");
    setSlides([
      {
        id: `slide-${Date.now()}`,
        slideNumber: 1,
        type: "cover",
        label: "Página 1",
        title: "",
        subtitle: "",
        tag: "",
        customElements: [],
        offsets: {},
        scales: {},
        dimensions: {},
        hiddenElements: {},
      },
    ]);
    setCurrentSlideIndex(0);
    setSelectedElement(null);
    setExportFeedback("Lienzo en blanco creado (Estilo Canva)");
    setTimeout(() => setExportFeedback(null), 2500);
  };

  const handleApplyCustomTemplate = (tpl: CustomVisualTemplate) => {
    setSelectedTemplate(tpl.baseTemplate);
    setAspectRatio(tpl.aspectRatio);
    setEditorMode(tpl.editorMode);
    if (tpl.selectedBgUrl) setSelectedBgUrl(tpl.selectedBgUrl);
    if (typeof tpl.bgDim === "number") setBgDimming(Math.round(tpl.bgDim * 100));
    if (tpl.brandColor) setAccentColor(tpl.brandColor);
    if (tpl.fontFamily) setSelectedFont(tpl.fontFamily);
    if (tpl.slides && tpl.slides.length > 0) {
      setSlides(JSON.parse(JSON.stringify(tpl.slides)));
      setCurrentSlideIndex(0);
    }
    setActiveCustomTemplateId(tpl.id);
    setExportFeedback(`Plantilla "${tpl.name}" aplicada al lienzo`);
    setTimeout(() => setExportFeedback(null), 3000);
  };

  const handleConfirmDeleteTemplate = () => {
    if (!templateToDelete) return;
    deleteTemplate(templateToDelete.id);
    if (activeCustomTemplateId === templateToDelete.id) {
      setActiveCustomTemplateId(null);
    }
    setExportFeedback(`Plantilla "${templateToDelete.name}" eliminada`);
    setTimeout(() => setExportFeedback(null), 3000);
    setTemplateToDelete(null);
  };

  const handleConfirmEditMeta = async () => {
    if (!editingTemplate || !editMetaForm.name.trim()) return;

    if (editMetaForm.overwriteWithCurrentCanvas) {
      let thumbnailDataUrl: string | undefined = editingTemplate.thumbnail;
      if (slideContainerRef.current) {
        try {
          setIsExporting(true);
          await new Promise((r) => setTimeout(r, 65));
          thumbnailDataUrl = await toPng(slideContainerRef.current, {
            pixelRatio: 0.35,
            quality: 0.65,
          });
        } catch (err) {
          console.warn("No se pudo capturar nueva miniatura:", err);
        } finally {
          setIsExporting(false);
        }
      }

      saveTemplate({
        id: editingTemplate.id,
        name: editMetaForm.name.trim(),
        desc: editMetaForm.desc.trim() || undefined,
        category: editMetaForm.category.trim() || "B2B",
        authorName: currentUser?.name || editingTemplate.authorName || "SuperAdmin",
        baseTemplate: selectedTemplate,
        aspectRatio,
        editorMode,
        selectedBgUrl,
        bgDim: bgDimming / 100,
        bgBlur: 0,
        brandColor: accentColor,
        fontFamily: selectedFont,
        slides: JSON.parse(JSON.stringify(slides)),
        thumbnail: thumbnailDataUrl,
      });
    } else {
      updateMeta(editingTemplate.id, {
        name: editMetaForm.name.trim(),
        desc: editMetaForm.desc.trim() || undefined,
        category: editMetaForm.category.trim() || undefined,
      });
    }
    setExportFeedback(`Plantilla "${editMetaForm.name}" actualizada`);
    setTimeout(() => setExportFeedback(null), 3000);
    setEditingTemplate(null);
  };
  const [canvasZoom, setCanvasZoom] = useState(0.82);
  const [activeToolbarPopup, setActiveToolbarPopup] = useState<
    "color" | "spacing" | "shape_edit" | "shape_fill" | "shape_border" | "shape_stroke" | "shape_corner" | "shape_transparency" | "shape_gradient" | null
  >(null);

  // Estados de autor
  const [nameText, setNameText] = useState(authorName);
  const [handleText, setHandleText] = useState(authorHandle);

  // Estados de exportación
  const [isExporting, setIsExporting] = useState(false);
  const [exportFeedback, setExportFeedback] = useState<string | null>(null);

  // Estados HD API Engine
  const [pixabayKey, setPixabayKey] = useState<string>("");
  const [isPixabayModalOpen, setIsPixabayModalOpen] = useState(false);
  const [pixabayKeyInput, setPixabayKeyInput] = useState("");
  const [pixabayTestState, setPixabayTestState] = useState<{ loading: boolean; ok?: boolean; message?: string } | null>(null);

  // Estados de Fotos Pixabay
  const [pixabayPhotos, setPixabayPhotos] = useState<PixabayItem[]>([]);
  const [isLoadingPhotos, setIsLoadingPhotos] = useState(false);
  const [photoSearchQuery, setPhotoSearchQuery] = useState("");
  const [activePhotoTag, setActivePhotoTag] = useState("all");
  const [photoOrientation, setPhotoOrientation] = useState<"all" | "horizontal" | "vertical">("all");
  const [totalPhotos, setTotalPhotos] = useState(0);

  // Estados de Elementos Pixabay (Vectores e Ilustraciones)
  const [elementsSubTab, setElementsSubTab] = useState<"shapes" | "vectors" | "illustrations">("shapes");
  const [pixabayElements, setPixabayElements] = useState<PixabayItem[]>([]);
  const [isLoadingElements, setIsLoadingElements] = useState(false);
  const [elementSearchQuery, setElementSearchQuery] = useState("");
  const [activeElementTag, setActiveElementTag] = useState("all");

  // Estados de Fondos Pixabay
  const [pixabayBackgrounds, setPixabayBackgrounds] = useState<PixabayItem[]>([]);
  const [isLoadingBackgrounds, setIsLoadingBackgrounds] = useState(false);
  const [bgSearchQuery, setBgSearchQuery] = useState("");
  const [activeBgTag, setActiveBgTag] = useState("all");

  // Estados de Videos Pixabay
  const [pixabayVideos, setPixabayVideos] = useState<PixabayItem[]>([]);
  const [isLoadingVideos, setIsLoadingVideos] = useState(false);
  const [videoSearchQuery, setVideoSearchQuery] = useState("");
  const [activeVideoTag, setActiveVideoTag] = useState("all");

  // Carga inicial de API Key HD
  useEffect(() => {
    const k = getStoredPixabayKey();
    if (k) {
      setPixabayKey(k);
      setPixabayKeyInput(k);
    }
  }, []);

  // Función para consultar Fotos Pixabay
  const loadPixabayPhotos = useCallback(async (query: string, tag: string, orientation: "all" | "horizontal" | "vertical") => {
    setIsLoadingPhotos(true);
    try {
      const q = query.trim() || (tag !== "all" ? tag : "business executive office");
      const res = await fetchPixabayResources({
        resource: "photos",
        query: q,
        orientation,
        category: tag !== "all" && ["business", "computer", "people", "buildings", "industry"].includes(tag) ? tag : undefined,
        apiKey: pixabayKey,
      });
      setPixabayPhotos(res.items || []);
      setTotalPhotos(res.total || 0);
    } catch (err) {
      console.error("Error al cargar fotos HD:", err);
    } finally {
      setIsLoadingPhotos(false);
    }
  }, [pixabayKey]);

  // Función para consultar Elementos Pixabay (Vectores o Ilustraciones)
  const loadPixabayElements = useCallback(async (type: "vectors" | "illustrations", query: string, tag: string) => {
    setIsLoadingElements(true);
    try {
      const q = query.trim() || (tag !== "all" ? tag : (type === "vectors" ? "icon badge graphic" : "business illustration infographic"));
      const res = await fetchPixabayResources({
        resource: type,
        query: q,
        apiKey: pixabayKey,
      });
      setPixabayElements(res.items || []);
    } catch (err) {
      console.error("Error al cargar elementos HD:", err);
    } finally {
      setIsLoadingElements(false);
    }
  }, [pixabayKey]);

  // Función para consultar Fondos Pixabay
  const loadPixabayBackgrounds = useCallback(async (query: string, tag: string) => {
    setIsLoadingBackgrounds(true);
    try {
      const q = query.trim() || (tag !== "all" ? `${tag} background texture` : "dark minimal gradient texture");
      const res = await fetchPixabayResources({
        resource: "backgrounds",
        query: q,
        apiKey: pixabayKey,
      });
      setPixabayBackgrounds(res.items || []);
    } catch (err) {
      console.error("Error al cargar fondos HD:", err);
    } finally {
      setIsLoadingBackgrounds(false);
    }
  }, [pixabayKey]);

  // Función para consultar Videos Pixabay
  const loadPixabayVideos = useCallback(async (query: string, tag: string) => {
    setIsLoadingVideos(true);
    try {
      const q = query.trim() || (tag !== "all" ? tag : "technology particles business motion");
      const res = await fetchPixabayResources({
        resource: "videos",
        query: q,
        apiKey: pixabayKey,
      });
      setPixabayVideos(res.items || []);
    } catch (err) {
      console.error("Error al cargar videos HD:", err);
    } finally {
      setIsLoadingVideos(false);
    }
  }, [pixabayKey]);

  // Disparar carga reactiva al abrir pestañas o cambiar filtros
  useEffect(() => {
    if (!isOpen) return;

    if (activeDockTab === "photos") {
      const timer = setTimeout(() => {
        loadPixabayPhotos(photoSearchQuery, activePhotoTag, photoOrientation);
      }, 300);
      return () => clearTimeout(timer);
    }

    if (activeDockTab === "elements" && (elementsSubTab === "vectors" || elementsSubTab === "illustrations")) {
      const timer = setTimeout(() => {
        loadPixabayElements(elementsSubTab, elementSearchQuery, activeElementTag);
      }, 300);
      return () => clearTimeout(timer);
    }

    if (activeDockTab === "backgrounds") {
      const timer = setTimeout(() => {
        loadPixabayBackgrounds(bgSearchQuery, activeBgTag);
      }, 300);
      return () => clearTimeout(timer);
    }

    if (activeDockTab === "videos") {
      const timer = setTimeout(() => {
        loadPixabayVideos(videoSearchQuery, activeVideoTag);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [
    isOpen,
    activeDockTab,
    elementsSubTab,
    photoSearchQuery,
    activePhotoTag,
    photoOrientation,
    elementSearchQuery,
    activeElementTag,
    bgSearchQuery,
    activeBgTag,
    videoSearchQuery,
    activeVideoTag,
    loadPixabayPhotos,
    loadPixabayElements,
    loadPixabayBackgrounds,
    loadPixabayVideos,
  ]);

  // Manejador para aplicar foto o fondo HD como background del lienzo
  const handleApplyPixabayAsBg = (item: PixabayItem) => {
    setSelectedBgUrl(item.regularUrl);
    updateCurrentSlide({ bgUrl: item.regularUrl });
    setSelectedElement("background");
    setExportFeedback(`Fondo actualizado: ${item.title}`);
    setTimeout(() => setExportFeedback(null), 2500);
  };

  // Manejador para insertar recurso HD como elemento libre en el lienzo
  const handleInsertPixabayAsElement = (item: PixabayItem) => {
    setIsFreeMode(true);
    const newId = `elem-${Date.now()}`;
    const isVid = item.type === "video";
    const newElement: CustomCanvasElement = {
      id: newId,
      type: isVid ? "video" : "image",
      content: isVid ? (item.videoUrl || item.regularUrl) : item.regularUrl,
      x: 70,
      y: 90,
      width: isVid ? 260 : (item.type === "vector" ? 140 : 180),
      height: isVid ? 170 : (item.type === "vector" ? 140 : 180),
      scale: 1,
      borderRadius: item.type === "vector" ? 0 : 8,
      opacity: 1,
      bgColor: "transparent",
      borderWidth: 0,
    };

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
    setExportFeedback(`${item.type === "vector" ? "Vector" : isVid ? "Video" : "Elemento"} insertado en el lienzo`);
    setTimeout(() => setExportFeedback(null), 2500);
  };

  // Manejador para probar API Key HD
  const handleTestPixabayKey = async () => {
    if (!pixabayKeyInput.trim()) {
      setPixabayTestState({ loading: false, ok: false, message: "Ingresa tu API Key antes de probar" });
      return;
    }
    setPixabayTestState({ loading: true });
    const res = await testPixabayKey(pixabayKeyInput.trim());
    if (res.ok) {
      setPixabayTestState({
        loading: false,
        ok: true,
        message: `¡Conexión exitosa! Más de ${res.totalHits?.toLocaleString() || "4.3M"} recursos disponibles.`,
      });
    } else {
      setPixabayTestState({
        loading: false,
        ok: false,
        message: res.message || "No se pudo validar la clave. Verifica que sea correcta.",
      });
    }
  };

  // Manejador para guardar API Key HD
  const handleSavePixabayKey = () => {
    const trimmed = pixabayKeyInput.trim();
    setStoredPixabayKey(trimmed);
    setPixabayKey(trimmed);
    setIsPixabayModalOpen(false);
    setExportFeedback(trimmed ? "¡API Key HD guardada y activada!" : "API Key removida. Usando catálogo base.");
    setTimeout(() => setExportFeedback(null), 3000);
    // Recargar pestaña activa
    if (activeDockTab === "photos") loadPixabayPhotos(photoSearchQuery, activePhotoTag, photoOrientation);
    if (activeDockTab === "elements") loadPixabayElements(elementsSubTab === "illustrations" ? "illustrations" : "vectors", elementSearchQuery, activeElementTag);
    if (activeDockTab === "backgrounds") loadPixabayBackgrounds(bgSearchQuery, activeBgTag);
    if (activeDockTab === "videos") loadPixabayVideos(videoSearchQuery, activeVideoTag);
  };
    const [colorSearchQuery, setColorSearchQuery] = useState("");

  // Estado para galería de Uploads (Imágenes, Videos y Audios)
  const [uploadedMedia, setUploadedMedia] = useState<Array<{
    id: string;
    name: string;
    type: "image" | "video" | "audio";
    url: string;
    format: string;
    uploadedAt: number;
  }>>([
    {
      id: "sample-logo-1",
      name: "Google Verified Partner.png",
      type: "image",
      url: "https://images.unsplash.com/photo-1573164713988-8665fc963095?auto=format&fit=crop&w=400&q=80",
      format: "PNG",
      uploadedAt: Date.now() - 3600000,
    },
    {
      id: "sample-badge-2",
      name: "Medalla B2B Executive.png",
      type: "image",
      url: "https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=400&q=80",
      format: "PNG",
      uploadedAt: Date.now() - 7200000,
    }
  ]);
  const [activeUploadTab, setActiveUploadTab] = useState<"images" | "videos" | "audio">("images");
  const [uploadSearchQuery, setUploadSearchQuery] = useState("");
  const fileUploadInputRef = useRef<HTMLInputElement>(null);

  // Manejador general de subida de archivos multimediales (Persistencia DataURL y Auto-inserción)
  const handleFileUpload = (files: FileList | null, autoInsert: boolean = true) => {
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      const ext = file.name.split(".").pop()?.toUpperCase() || "FILE";
      let mediaType: "image" | "video" | "audio" = "image";
      if (file.type.startsWith("video/") || ["MP4", "MOV", "WEBM", "MKV"].includes(ext)) {
        mediaType = "video";
      } else if (file.type.startsWith("audio/") || ["MP3", "WAV", "OGG", "M4A"].includes(ext)) {
        mediaType = "audio";
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        const fileUrl = (event.target?.result as string) || URL.createObjectURL(file);
        const item = {
          id: `upload-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          name: file.name,
          type: mediaType,
          url: fileUrl,
          format: ext,
          uploadedAt: Date.now(),
        };

        setUploadedMedia((prev) => [item, ...prev]);

        // Auto-inserción inteligente en el lienzo
        if (autoInsert && mediaType === "image") {
          if (!selectedBgUrl) {
            setSelectedBgUrl(fileUrl);
            updateCurrentSlide({ bgUrl: fileUrl });
            setSelectedElement("background");
            setExportFeedback(`¡Foto "${file.name}" colocada como fondo!`);
          } else {
            handleInsertUploadedElement(item);
            setExportFeedback(`¡Foto "${file.name}" insertada en el lienzo!`);
          }
        } else if (autoInsert && mediaType === "video") {
          handleInsertUploadedElement(item);
          setExportFeedback(`¡Video "${file.name}" insertado en el lienzo!`);
        } else {
          setExportFeedback(`¡Archivo "${file.name}" subido a tu galería!`);
        }
        setTimeout(() => setExportFeedback(null), 3000);
      };

      if (mediaType === "image") {
        reader.readAsDataURL(file);
      } else {
        const fileUrl = URL.createObjectURL(file);
        const item = {
          id: `upload-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          name: file.name,
          type: mediaType,
          url: fileUrl,
          format: ext,
          uploadedAt: Date.now(),
        };
        setUploadedMedia((prev) => [item, ...prev]);
        if (autoInsert) handleInsertUploadedElement(item);
      }

      if (mediaType === "video") setActiveUploadTab("videos");
      else if (mediaType === "audio") setActiveUploadTab("audio");
      else setActiveUploadTab("images");
    });

    // Resetear valor para permitir seleccionar el mismo archivo si se desea
    if (fileUploadInputRef.current) {
      fileUploadInputRef.current.value = "";
    }
  };

  // Insertar archivo subido en el lienzo como elemento independiente
  const handleInsertUploadedElement = (item: { url: string; type: "image" | "video" | "audio"; name: string }) => {
    setIsFreeMode(true);
    const newId = `elem-${Date.now()}`;
    const newElement: CustomCanvasElement = {
      id: newId,
      type: item.type === "video" ? "video" : "image",
      content: item.url,
      x: 80,
      y: 120,
      width: item.type === "video" ? 240 : 160,
      height: item.type === "video" ? 160 : 160,
      scale: 1,
      borderRadius: 12,
      opacity: 1,
    };

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

  // Diapositivas (Lienzo en blanco inicial estilo Canva)
  const [slides, setSlides] = useState<CarouselSlideItem[]>([
    {
      id: "slide-1",
      slideNumber: 1,
      type: "cover",
      label: "Página 1",
      title: initialTitle || "",
      subtitle: initialSubtitle || "",
      tag: initialCategory || "",
      metric: initialMetric || "",
      customElements: [],
      offsets: {},
      scales: {},
      dimensions: {},
      hiddenElements: {},
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

  // Manejador de rotación libre / giro estilo Canva
  const handleRotationChange = (elementId: string, newRotation: number) => {
    let normalized = Math.round(newRotation % 360);
    if (normalized > 180) normalized -= 360;
    if (normalized < -180) normalized += 360;

    setSlides((prev) => {
      const next = [...prev];
      const cur = next[currentSlideIndex];
      const prevRotations = cur.rotations || {};

      const updatedCustom = (cur.customElements || []).map((el) => {
        if (el.id === elementId) {
          return { ...el, rotation: normalized };
        }
        return el;
      });

      next[currentSlideIndex] = {
        ...cur,
        rotations: {
          ...prevRotations,
          [elementId]: normalized,
        },
        customElements: updatedCustom,
      };
      return next;
    });
  };

  // Manejador de redimensionamiento libre (ancho y alto independientes + offset) estilo Canva
  const handleSizeChange = (
    elementId: string,
    newSize: { width?: number; height?: number },
    newOffset?: { x: number; y: number }
  ) => {
    setSlides((prev) => {
      const next = [...prev];
      const cur = next[currentSlideIndex];
      const isCustom = (cur.customElements || []).some((e) => e.id === elementId);

      if (isCustom) {
        const updatedList = (cur.customElements || []).map((el) => {
          if (el.id === elementId) {
            return {
              ...el,
              width: newSize.width ?? el.width,
              height: newSize.height ?? el.height,
              ...(newOffset ? { x: newOffset.x, y: newOffset.y } : {}),
            };
          }
          return el;
        });

        const nextOffsets = newOffset
          ? { ...(cur.offsets || {}), [elementId]: newOffset }
          : cur.offsets;

        next[currentSlideIndex] = {
          ...cur,
          customElements: updatedList,
          offsets: nextOffsets,
        };
        return next;
      }

      // Elemento de plantilla (tarjetas, citas, cajas, etc.)
      const nextDims = {
        ...(cur.dimensions || {}),
        [elementId]: {
          ...(cur.dimensions?.[elementId] || {}),
          ...newSize,
        },
      };
      const nextOffsets = newOffset
        ? { ...(cur.offsets || {}), [elementId]: newOffset }
        : cur.offsets;

      next[currentSlideIndex] = {
        ...cur,
        dimensions: nextDims,
        offsets: nextOffsets,
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
        bgColor: "#ffffff",
        borderColor: "transparent",
        borderWidth: 0,
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
        bgColor: "#ffffff",
        borderColor: "transparent",
        borderWidth: 0,
        borderRadius: 9999,
        opacity: 1,
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
        bgColor: "#ffffff",
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
        bgColor: "#ffffff",
        color: "#0f172a",
        borderColor: "transparent",
        borderWidth: 0,
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
        bgColor: "#ffffff",
        borderWidth: 3,
        opacity: 1,
      };
    }

    setSlides((prev) => {
      const next = [...prev];
      const cur = next[currentSlideIndex];
      const currentList = cur.customElements || [];
      next[currentSlideIndex] = {
        ...cur,
        customElements: [...currentList, newShape],
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

    const isWhiteCanvas = selectedTemplate === "blank" && !selectedBgUrl;
    const defaultHeadColor = isWhiteCanvas ? "#0f172a" : "#ffffff";
    const defaultSubColor = isWhiteCanvas ? "#334155" : "#cbd5e1";
    const defaultTextColor = isWhiteCanvas ? "#475569" : "#94a3b8";

    if (type === "heading") {
      newElement = {
        id: newId,
        type: "heading",
        content: "Nuevo Titular B2B",
        x: 35,
        y: 120,
        scale: 1,
        rotation: 0,
        fontSize: 26,
        fontWeight: "bold",
        color: defaultHeadColor,
      };
    } else if (type === "subheading") {
      newElement = {
        id: newId,
        type: "subheading",
        content: "Subtítulo explicativo de alto impacto",
        x: 35,
        y: 180,
        scale: 1,
        rotation: 0,
        fontSize: 17,
        fontWeight: "600",
        color: defaultSubColor,
      };
    } else if (type === "text") {
      newElement = {
        id: newId,
        type: "text",
        content: "Escribe aquí una explicación, dato clave o reflexión para tu audiencia...",
        x: 35,
        y: 220,
        scale: 1,
        rotation: 0,
        fontSize: 13,
        color: defaultTextColor,
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

    // Si es la foto de fondo, la clonamos como objeto de imagen interactivo en el lienzo
    if (elementId === "background" || elementId === "bg-photo") {
      if (!selectedBgUrl) return;
      const duplicatedPhoto: CustomCanvasElement = {
        id: newId,
        type: "image",
        content: selectedBgUrl,
        x: 40,
        y: 60,
        width: 260,
        height: 260,
        scale: bgScale,
        bgColor: "transparent",
        borderWidth: 0,
        borderRadius: 8,
      };
      setSlides((prev) => {
        const next = [...prev];
        const cur = next[currentSlideIndex];
        const curList = cur.customElements || [];
        next[currentSlideIndex] = {
          ...cur,
          customElements: [...curList, duplicatedPhoto],
        };
        return next;
      });
      setSelectedElement(newId);
      setExportFeedback("Foto duplicada como elemento interactivo");
      setTimeout(() => setExportFeedback(null), 2500);
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

  // Manejador para eliminar / ocultar elementos individuales (Plantillas predefinidas y capas libres)
  const handleDeleteElement = (elementId: string) => {
    if (!elementId) return;

    // Si es la foto de fondo, se elimina inmediatamente limpiando el estado
    if (elementId === "background" || elementId === "bg-photo") {
      setSelectedBgUrl("");
      setSelectedElement(null);
      setExportFeedback("Foto de fondo eliminada");
      setTimeout(() => setExportFeedback(null), 2500);
      return;
    }

    if (elementId.startsWith("elem-")) {
      handleDeleteCustomElement(elementId);
      if (selectedElement === elementId) {
        setSelectedElement(null);
      }
      return;
    }

    // Mapeo bidireccional entre IDs de DraggableWrapper y selectedElement de plantillas
    const idMap: Record<string, string[]> = {
      title: ["editorial-title", "social-title", "split-title", "bold-title", "inter-title", "metric-text", "title"],
      subtitle: ["editorial-subtitle", "social-subtitle", "split-subtitle", "bold-subtitle", "subtitle"],
      tag: ["editorial-tag", "quote-tag", "social-tag", "split-tag", "metric-tag", "bold-tag", "inter-tag", "tag"],
      brand: ["editorial-card", "quote-card", "social-card", "split-card", "metric-card", "inter-card", "bold-logo", "brand"],
      "editorial-card": ["editorial-card", "brand"],
      "quote-card": ["quote-card", "brand"],
      "social-card": ["social-card", "brand"],
      "split-card": ["split-card", "brand"],
      "metric-card": ["metric-card", "brand"],
      "inter-card": ["inter-card", "brand"],
      "editorial-title": ["editorial-title", "title"],
      "social-title": ["social-title", "title"],
      "split-title": ["split-title", "title"],
      "bold-title": ["bold-title", "title"],
      "inter-title": ["inter-title", "title"],
      "metric-text": ["metric-text", "title"],
      "editorial-subtitle": ["editorial-subtitle", "subtitle"],
      "social-subtitle": ["social-subtitle", "subtitle"],
      "split-subtitle": ["split-subtitle", "subtitle"],
      "bold-subtitle": ["bold-subtitle", "subtitle"],
      "editorial-tag": ["editorial-tag", "tag"],
      "quote-tag": ["quote-tag", "tag"],
      "social-tag": ["social-tag", "tag"],
      "split-tag": ["split-tag", "tag"],
      "metric-tag": ["metric-tag", "tag"],
      "bold-tag": ["bold-tag", "tag"],
      "inter-tag": ["inter-tag", "tag"],
      "editorial-footer": ["editorial-footer", "author-name", "author"],
      "quote-author": ["quote-author", "author-name", "author"],
      "social-header": ["social-header", "author-name", "author"],
      "split-footer": ["split-footer", "author-name", "author"],
      "metric-author": ["metric-author", "author-name", "author"],
      "inter-footer": ["inter-footer", "author-name", "author"],
      "author-name": ["editorial-footer", "quote-author", "social-header", "split-footer", "metric-author", "inter-footer", "author-name"],
      "quote-body": ["quote-body", "title", "quote"],
      "metric-number": ["metric-number", "metric"],
      metric: ["metric-number", "metric"],
      "social-stats": ["social-stats", "stats"],
      stats: ["social-stats", "stats"],
      "inter-bullets": ["inter-bullets", "bullets"],
      bullets: ["inter-bullets", "bullets"],
      "inter-cta": ["inter-cta", "cta"],
      cta: ["inter-cta", "cta"],
      "bold-logo": ["bold-logo", "brand"],
      "bold-footer": ["bold-footer", "footer"],
    };

    const keysToHide = idMap[elementId] || [elementId];

    setSlides((prev) => {
      const next = [...prev];
      const current = next[currentSlideIndex];
      const prevHidden = current.hiddenElements || {};
      const newHidden = { ...prevHidden };
      keysToHide.forEach((k) => {
        newHidden[k] = true;
      });
      next[currentSlideIndex] = {
        ...current,
        hiddenElements: newHidden,
      };
      return next;
    });

    if (selectedElement === elementId || keysToHide.includes(selectedElement || "")) {
      setSelectedElement(null);
    }
  };

  // Restaurar elementos que fueron eliminados u ocultados
  const handleRestoreHiddenElements = () => {
    updateCurrentSlide({ hiddenElements: {} });
  };

  // Restablecer todas las personalizaciones (posiciones, escalas y visibilidad)
  // Atajo de teclado: Eliminar elemento seleccionado con tecla Delete o Backspace (estilo Canva)
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === "Delete" || e.key === "Backspace") && selectedElement) {
        const activeEl = document.activeElement;
        const isEditing =
          activeEl?.tagName === "INPUT" ||
          activeEl?.tagName === "TEXTAREA" ||
          (activeEl as HTMLElement)?.isContentEditable;
        if (!isEditing) {
          e.preventDefault();
          handleDeleteElement(selectedElement);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, selectedElement, handleDeleteElement]);

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
  const handleBgImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
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
  const isImage = Boolean(
    (customElem && (customElem.type === "image" || customElem.type === "video")) ||
    ((selectedElement === "background" || selectedElement === "bg-photo") && Boolean(selectedBgUrl && selectedBgUrl.trim() !== ""))
  );
  const isText = Boolean(
    !isShape &&
    !isImage &&
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
      {/* Input de subida de archivos permanente para todo el editor */}
      <input
        ref={fileUploadInputRef}
        type="file"
        multiple
        accept="image/*,video/*,audio/*,.png,.jpg,.jpeg,.webp,.svg,.gif,.mp4,.mov,.webm,.mp3,.wav"
        onChange={(e) => handleFileUpload(e.target.files, true)}
        className="hidden"
      />
      
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
              if (
                (activeDockTab === "elements" ||
                  activeDockTab === "shape_edit" ||
                  activeDockTab === "shape_color" ||
                  activeDockTab === "shape_border_color") &&
                isDrawerOpen
              ) {
                setIsDrawerOpen(false);
              } else {
                setActiveDockTab("elements");
                setIsDrawerOpen(true);
              }
            }}
            className={`w-[54px] py-2.5 rounded-xl flex flex-col items-center justify-center gap-1 transition ${
              (activeDockTab === "elements" ||
                activeDockTab === "shape_edit" ||
                activeDockTab === "shape_color" ||
                activeDockTab === "shape_border_color") &&
              isDrawerOpen
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

          {/* BOTÓN VIDEOS (PIXABAY MOTION) */}
          <button
            type="button"
            onClick={() => {
              if (activeDockTab === "videos" && isDrawerOpen) {
                setIsDrawerOpen(false);
              } else {
                setActiveDockTab("videos");
                setIsDrawerOpen(true);
              }
            }}
            className={`w-[54px] py-2.5 rounded-xl flex flex-col items-center justify-center gap-1 transition ${
              activeDockTab === "videos" && isDrawerOpen
                ? "bg-brand-600 text-white shadow-md font-bold"
                : "text-slate-400 hover:text-white hover:bg-slate-900"
            }`}
            title="Videos corporativos y motion clips HD"
          >
            <Video className="size-5" />
            <span className="text-[10px] tracking-tight">Videos</span>
          </button>

          {/* BOTÓN UPLOADS DEBAJO DE FONDOS (ESTILO CANVA) */}
          <button
            type="button"
            onClick={() => {
              if (activeDockTab === "uploads" && isDrawerOpen) {
                setIsDrawerOpen(false);
              } else {
                setActiveDockTab("uploads");
                setIsDrawerOpen(true);
              }
            }}
            className={`w-[54px] py-2.5 rounded-xl flex flex-col items-center justify-center gap-1 transition ${
              activeDockTab === "uploads" && isDrawerOpen
                ? "bg-brand-600 text-white shadow-md font-bold"
                : "text-slate-400 hover:text-white hover:bg-slate-900"
            }`}
            title="Subir archivos, fotos y videos (Uploads)"
          >
            <UploadCloud className="size-5" />
            <span className="text-[10px] tracking-tight">Uploads</span>
          </button>
        </aside>

        {/* 2. FLYOUT DRAWER DESPLEGABLE (ESTILO CANVA - 330px) */}
        <div
          className={`relative bg-slate-900 border-r border-slate-800 flex flex-col h-full shrink-0 z-20 transition-all duration-200 select-text ${
            isDrawerOpen ? "w-[360px] min-w-[360px]" : "w-0 min-w-0 overflow-hidden border-none"
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
            
            {/* PESTAÑA 1: TEMPLATES (GALERIA VISUAL EN 2 COLUMNAS ESTILO CANVA) */}
            {activeDockTab === "templates" && (() => {
              const query = templateSearchQuery.trim().toLowerCase();

              const filteredCustom = customTemplates.filter((t) => {
                const matchSearch = !query ||
                  t.name.toLowerCase().includes(query) ||
                  (t.category && t.category.toLowerCase().includes(query)) ||
                  (t.desc && t.desc.toLowerCase().includes(query));
                const matchCat = templateCategoryFilter === "all" ||
                  templateCategoryFilter === "custom" ||
                  (templateCategoryFilter === "official" ? false : t.category?.toLowerCase() === templateCategoryFilter.toLowerCase());
                return matchSearch && matchCat;
              });

              const filteredOfficial = TEMPLATES.filter((t) => {
                if (templateCategoryFilter === "custom") return false;
                const matchSearch = !query ||
                  t.name.toLowerCase().includes(query) ||
                  t.desc.toLowerCase().includes(query);
                const matchCat = templateCategoryFilter === "all" ||
                  templateCategoryFilter === "official";
                return matchSearch && matchCat;
              });

              // Helper para renderizar la miniatura visual exacta estilo Canva
              const renderTemplateMiniature = (tpl: any, isCustomTpl: boolean) => {
                if (tpl.thumbnail && tpl.thumbnail.trim() !== "") {
                  return (
                    <img
                      src={tpl.thumbnail || undefined}
                      alt={tpl.name}
                      className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  );
                }

                // Si no tiene captura thumbnail, renderizar miniatura CSS rica de la plantilla
                const templateType = isCustomTpl ? tpl.baseTemplate : tpl.id;

                if (templateType === "editorial") {
                  return (
                    <div className="absolute inset-0 bg-slate-950 flex flex-col justify-between p-2.5 overflow-hidden">
                      <img
                        src="https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=400&q=70"
                        alt="bg"
                        className="absolute inset-0 w-full h-full object-cover opacity-25"
                      />
                      <div className="absolute inset-0 bg-gradient-to-b from-slate-950/70 via-slate-950/80 to-slate-950" />
                      <div className="relative z-10 flex items-center justify-between">
                        <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                          B2B STRATEGY
                        </span>
                      </div>
                      <div className="relative z-10 p-2 rounded-lg bg-white/5 border border-white/10 backdrop-blur-xs space-y-1 my-auto">
                        <div className="text-[9px] font-extrabold text-white line-clamp-2 leading-tight">
                          {tpl.name}
                        </div>
                        <div className="h-1 w-full bg-slate-400/40 rounded-full" />
                        <div className="h-1 w-3/4 bg-slate-400/30 rounded-full" />
                      </div>
                      <div className="relative z-10 flex items-center gap-1 pt-1 border-t border-white/10">
                        <div className="size-3.5 rounded-full bg-brand-500/80 flex items-center justify-center text-[7px] text-white font-bold">
                          IH
                        </div>
                        <span className="text-[8px] text-slate-300 font-medium truncate">InHubFlow</span>
                      </div>
                    </div>
                  );
                }

                if (templateType === "authority_quote") {
                  return (
                    <div className="absolute inset-0 bg-gradient-to-br from-amber-950/40 via-slate-950 to-slate-950 flex flex-col justify-between p-2.5 overflow-hidden">
                      <div className="relative z-10 text-amber-400/80 text-xl font-serif leading-none">“</div>
                      <div className="relative z-10 my-auto text-center space-y-1 px-1">
                        <p className="text-[9px] font-serif italic text-amber-100/90 leading-tight line-clamp-3">
                          «La personalización contextual es la única ventaja que la IA no puede copiar.»
                        </p>
                      </div>
                      <div className="relative z-10 flex items-center justify-center gap-1 pt-1 border-t border-amber-500/20">
                        <div className="size-3 rounded-full bg-amber-500 text-[6px] font-bold text-black flex items-center justify-center">
                          A
                        </div>
                        <span className="text-[8px] text-amber-200/90 font-bold">Autoridad B2B</span>
                      </div>
                    </div>
                  );
                }

                if (templateType === "social_card") {
                  return (
                    <div className="absolute inset-0 bg-slate-950 flex flex-col justify-between p-2.5 overflow-hidden">
                      <div className="relative z-10 flex items-center gap-1.5 pb-1 border-b border-white/5">
                        <div className="size-4 rounded-full bg-blue-500 text-[8px] font-bold text-white flex items-center justify-center">
                          P
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="h-1.5 w-12 bg-white/90 rounded-sm" />
                          <div className="h-1 w-8 bg-slate-500 rounded-sm mt-0.5" />
                        </div>
                      </div>
                      <div className="relative z-10 my-auto space-y-1.5 py-1">
                        <div className="text-[9px] font-bold text-white line-clamp-2 leading-tight">
                          {tpl.name}
                        </div>
                        <div className="h-1 w-full bg-slate-400/50 rounded-sm" />
                        <div className="h-1 w-3/4 bg-slate-400/30 rounded-sm" />
                      </div>
                      <div className="relative z-10 flex items-center justify-between text-[7px] text-slate-400 pt-1 border-t border-white/10">
                        <span className="text-blue-400 font-medium">👍 1.4k</span>
                        <span>💬 92</span>
                        <span>🔁 45</span>
                      </div>
                    </div>
                  );
                }

                if (templateType === "split_focus") {
                  return (
                    <div className="absolute inset-0 bg-slate-950 flex flex-col overflow-hidden">
                      <div className="h-1/2 w-full relative overflow-hidden">
                        <img
                          src="https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&w=400&q=70"
                          alt="split"
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent" />
                      </div>
                      <div className="h-1/2 p-2 flex flex-col justify-between bg-slate-950">
                        <div className="space-y-1">
                          <span className="text-[7px] font-bold text-brand-400 uppercase">Focus 50/50</span>
                          <div className="text-[8px] font-bold text-white line-clamp-1 leading-tight">
                            {tpl.name}
                          </div>
                          <div className="h-1 w-3/4 bg-slate-500 rounded-full" />
                        </div>
                        <div className="h-2.5 w-14 bg-brand-500/30 rounded flex items-center justify-center text-[6px] text-brand-300 font-bold">
                          Desliza →
                        </div>
                      </div>
                    </div>
                  );
                }

                if (templateType === "big_metric") {
                  return (
                    <div className="absolute inset-0 bg-gradient-to-b from-emerald-950/40 via-slate-950 to-slate-950 flex flex-col justify-between p-2.5 overflow-hidden text-center">
                      <div className="relative z-10">
                        <span className="text-[8px] font-extrabold px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          METRICA
                        </span>
                      </div>
                      <div className="relative z-10 my-auto">
                        <div className="text-2xl font-black bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent leading-none">
                          +340%
                        </div>
                        <div className="text-[8px] text-slate-300 font-semibold mt-1 leading-tight line-clamp-1">
                          Conversion B2B
                        </div>
                      </div>
                      <div className="relative z-10 text-[7px] text-slate-500">
                        Validado InHubFlow
                      </div>
                    </div>
                  );
                }

                if (templateType === "bold_highlighter") {
                  return (
                    <div className="absolute inset-0 bg-slate-950 flex flex-col justify-between p-2.5 overflow-hidden">
                      <div className="relative z-10">
                        <span className="text-[7px] font-black px-1.5 py-0.5 rounded bg-purple-600 text-white uppercase tracking-wider">
                          VIRAL B2B
                        </span>
                      </div>
                      <div className="relative z-10 my-auto space-y-1">
                        <div className="text-[9px] font-black text-white leading-tight">
                          EL 90% DE LOS
                        </div>
                        <div className="inline-block px-1.5 py-0.5 rounded bg-gradient-to-r from-purple-500 to-pink-500 text-white font-black text-[9px] leading-tight shadow-md">
                          LIDERES B2B
                        </div>
                        <div className="text-[8px] font-bold text-slate-400 leading-tight">
                          cometen este error.
                        </div>
                      </div>
                      <div className="relative z-10 flex items-center justify-between text-[7px] text-slate-400">
                        <span>Desliza</span>
                        <span className="text-purple-400 font-bold">→</span>
                      </div>
                    </div>
                  );
                }

                // Generico fallback
                return (
                  <div className="absolute inset-0 bg-gradient-to-b from-slate-900 via-slate-950 to-black p-2.5 flex flex-col justify-between">
                    <span className="text-[7px] font-bold px-1.5 py-0.5 rounded bg-brand-500/20 text-brand-300 self-start">
                      {tpl.category || "B2B"}
                    </span>
                    <div className="my-auto space-y-1 text-center">
                      <p className="text-[9px] font-extrabold text-white line-clamp-2 leading-tight">
                        {tpl.name}
                      </p>
                      <p className="text-[7px] text-slate-400 line-clamp-1">{tpl.desc || "Plantilla personalizada"}</p>
                    </div>
                    <div className="text-[7px] text-slate-500 flex items-center justify-between">
                      <span>{tpl.aspectRatio || "4:5"}</span>
                      <span className="text-brand-400 font-semibold">InHubFlow</span>
                    </div>
                  </div>
                );
              };

              // Helper para renderizar cada tarjeta de plantilla en la grilla visual de 2 columnas estilo Canva
              const renderVisualCard = (tpl: any, isCustomTpl: boolean) => {
                const isActive = isCustomTpl
                  ? activeCustomTemplateId === tpl.id
                  : selectedTemplate === tpl.id && !activeCustomTemplateId;

                const applyThisTemplate = () => {
                  if (isCustomTpl) {
                    handleApplyCustomTemplate(tpl);
                  } else {
                    applyOfficialTemplate(tpl.id);
                  }
                };

                return (
                  <div
                    key={tpl.id}
                    draggable={true}
                    onDragStart={(e) => {
                      e.dataTransfer.setData(
                        "application/json",
                        JSON.stringify({
                          type: "template",
                          id: tpl.id,
                          isCustom: isCustomTpl,
                        })
                      );
                      e.dataTransfer.effectAllowed = "copy";
                    }}
                    onClick={applyThisTemplate}
                    onDoubleClick={applyThisTemplate}
                    title="Haz clic, doble clic o arrastra al lienzo para aplicar esta plantilla"
                    className={`group relative rounded-2xl overflow-hidden border cursor-grab active:cursor-grabbing transition-all duration-200 aspect-[4/5] flex flex-col justify-between shadow-sm hover:shadow-xl hover:-translate-y-0.5 select-none ${
                      isActive
                        ? "border-amber-400 ring-2 ring-amber-400/50 shadow-amber-500/20"
                        : "border-slate-800 bg-slate-950 hover:border-brand-500 hover:ring-2 hover:ring-brand-500/30"
                    }`}
                  >
                    {/* 1. Miniatura visual de fondo (Screenshot real o render miniatura estilo Canva) */}
                    <div className="absolute inset-0 z-0">
                      {renderTemplateMiniature(tpl, isCustomTpl)}
                    </div>

                    {/* 2. Capa de oscurecimiento hover suave */}
                    <div className="absolute inset-0 bg-slate-950/20 group-hover:bg-slate-950/40 transition-colors z-[1]" />

                    {/* 3. Header de la tarjeta: Badge activo y acciones de hover */}
                    <div className="relative z-10 p-2 flex items-start justify-between gap-1">
                      {isActive ? (
                        <span className="px-1.5 py-0.5 rounded-md bg-amber-500 text-black font-extrabold text-[9px] shadow-md flex items-center gap-1">
                          <Check className="size-2.5 stroke-[3]" /> ACTIVA
                        </span>
                      ) : (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-slate-950/70 text-slate-300 border border-slate-700/60 backdrop-blur-xs">
                          {isCustomTpl ? (tpl.category || "Custom") : (tpl.id === "bold_highlighter" ? "Nuevo" : "Oficial")}
                        </span>
                      )}

                      {/* Botones de acción contextual (Editar / Eliminar) para templates personalizados */}
                      {isCustomTpl ? (
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingTemplate(tpl);
                              setEditMetaForm({
                                name: tpl.name,
                                desc: tpl.desc || "",
                                category: tpl.category || "B2B",
                                overwriteWithCurrentCanvas: false,
                              });
                            }}
                            className="p-1 rounded-md bg-slate-900/90 hover:bg-slate-800 text-slate-200 border border-slate-700/80 shadow-md transition"
                            title="Editar plantilla o actualizar miniatura"
                          >
                            <Pencil className="size-3" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setTemplateToDelete(tpl);
                            }}
                            className="p-1 rounded-md bg-slate-900/90 hover:bg-red-500/20 text-slate-200 hover:text-red-400 border border-slate-700/80 shadow-md transition"
                            title="Eliminar plantilla"
                          >
                            <Trash2 className="size-3" />
                          </button>
                        </div>
                      ) : (
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                          <span className="p-1 rounded-md bg-slate-900/90 text-amber-400 border border-slate-700/80 shadow-md flex items-center justify-center">
                            <Crown className="size-3" />
                          </span>
                        </div>
                      )}
                    </div>

                    {/* 4. Footer con degradado y título legible estilo Canva */}
                    <div className="relative z-10 bg-gradient-to-t from-slate-950 via-slate-950/80 to-transparent p-2.5 pt-4">
                      <p className="text-[11px] font-bold text-white leading-tight line-clamp-1 group-hover:text-amber-300 transition">
                        {tpl.name}
                      </p>
                      <div className="flex items-center justify-between text-[9px] text-slate-400 mt-0.5">
                        <span className="font-mono text-slate-400">{tpl.aspectRatio || "4:5"}</span>
                        <span className="text-amber-400/90 font-medium truncate max-w-[80px]">
                          {isCustomTpl ? (tpl.authorName || "Creado") : "InHubFlow"}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              };

              return (
                <div className="space-y-4">
                  {/* Botón: Empezar con Lienzo en Blanco (Estilo Canva desde cero) */}
                  <button
                    type="button"
                    onClick={handleResetToBlankCanvas}
                    className={`w-full py-2.5 px-3 rounded-xl border text-xs font-bold flex items-center justify-between transition shadow-sm group ${
                      selectedTemplate === "blank" && !activeCustomTemplateId
                        ? "bg-brand-500/15 border-brand-500 text-brand-300 ring-1 ring-brand-500/30"
                        : "bg-slate-950/70 hover:bg-slate-800 border-slate-800 text-slate-300 hover:text-white"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className="size-6 rounded-lg bg-white text-slate-900 flex items-center justify-center shadow-xs">
                        <Plus className="size-3.5 stroke-[3]" />
                      </div>
                      <span>Lienzo en Blanco (Desde Cero)</span>
                    </div>
                    {selectedTemplate === "blank" && !activeCustomTemplateId && (
                      <span className="text-[9px] bg-brand-500 text-white font-extrabold px-1.5 py-0.5 rounded">
                        ACTUAL
                      </span>
                    )}
                  </button>

                  {/* Buscador de plantillas estilo Canva */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-slate-400" />
                    <input
                      type="text"
                      value={templateSearchQuery}
                      onChange={(e) => setTemplateSearchQuery(e.target.value)}
                      placeholder="Buscar plantillas LinkedIn..."
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-8 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition"
                    />
                    {templateSearchQuery && (
                      <button
                        type="button"
                        onClick={() => setTemplateSearchQuery("")}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                      >
                        <X className="size-3" />
                      </button>
                    )}
                  </div>

                  {/* Chips de Categorías estilo Canva */}
                  <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar pb-1 text-[11px]">
                    {[
                      { id: "all", label: "Todas" },
                      { id: "custom", label: `Mis Templates (${customTemplates.length})` },
                      { id: "B2B", label: "B2B" },
                      { id: "Citas", label: "Citas" },
                      { id: "official", label: "Oficiales" },
                    ].map((chip) => {
                      const isChipActive = templateCategoryFilter === chip.id;
                      return (
                        <button
                          key={chip.id}
                          type="button"
                          onClick={() => setTemplateCategoryFilter(chip.id)}
                          className={`px-2.5 py-1 rounded-full whitespace-nowrap font-medium transition border ${
                            isChipActive
                              ? "bg-brand-500 text-white border-brand-400 shadow-sm"
                              : "bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700 hover:text-white"
                          }`}
                        >
                          {chip.label}
                        </button>
                      );
                    })}
                  </div>

                  {/* Botón Destacado: Guardar diseño actual como Template con captura automática */}
                  <button
                    type="button"
                    onClick={handleOpenSaveModal}
                    className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-amber-500/20 via-orange-500/20 to-amber-600/20 hover:from-amber-500/30 hover:to-orange-500/30 text-amber-300 border border-amber-500/40 text-xs font-bold flex items-center justify-center gap-2 transition shadow-sm group"
                  >
                    <BookmarkPlus className="size-4 text-amber-400 group-hover:scale-110 transition" />
                    <span>+ Guardar diseño actual como Template</span>
                  </button>

                  {/* SECCIÓN 1: MIS PLANTILLAS CREADAS (GRILLA VISUAL DE 2 COLUMNAS ESTILO CANVA) */}
                  {(templateCategoryFilter === "all" || templateCategoryFilter === "custom" || templateCategoryFilter === "B2B" || templateCategoryFilter === "Citas") && (
                    <div className="space-y-2 pt-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                          <Sparkles className="size-3 text-amber-400" />
                          Mis Plantillas ({filteredCustom.length})
                        </span>
                        {activeCustomTemplateId && (
                          <span className="text-[10px] text-amber-300 font-semibold bg-amber-500/15 px-1.5 py-0.5 rounded">
                            1 Activa
                          </span>
                        )}
                      </div>

                      {filteredCustom.length === 0 ? (
                        <div className="p-4 rounded-xl border border-dashed border-slate-800 bg-slate-950/40 text-center space-y-1.5">
                          <Bookmark className="size-5 text-slate-500 mx-auto" />
                          <p className="text-xs font-semibold text-slate-300">No hay plantillas guardadas</p>
                          <p className="text-[10px] text-slate-400 leading-tight">
                            Guarda tu diseño actual para verlo en esta galería visual con captura miniatura automática.
                          </p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 gap-2.5">
                          {filteredCustom.map((tpl) => renderVisualCard(tpl, true))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* SECCIÓN 2: PLANTILLAS OFICIALES PREDISEÑADAS (GRILLA VISUAL DE 2 COLUMNAS ESTILO CANVA) */}
                  {(templateCategoryFilter === "all" || templateCategoryFilter === "official") && (
                    <div className="space-y-2 pt-2 border-t border-slate-800">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                          <Layers className="size-3 text-brand-400" />
                          Plantillas Oficiales InHubFlow ({filteredOfficial.length})
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2.5">
                        {filteredOfficial.map((tpl) => renderVisualCard(tpl, false))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

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
              <div className="space-y-4 select-none">
                <div>
                  <h3 className="text-sm font-bold text-white">Elementos & Gráficos</h3>
                  <p className="text-xs text-slate-400">
                    Formas geométricas, vectores, iconos e ilustraciones en alta definición.
                  </p>
                </div>

                {/* Subselector Segmented: Formas | Vectores | Ilustraciones */}
                <div className="grid grid-cols-3 gap-1 p-1 bg-slate-900 border border-slate-800 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setElementsSubTab("shapes")}
                    className={`py-1.5 px-2 rounded-lg text-xs font-semibold transition ${
                      elementsSubTab === "shapes"
                        ? "bg-brand-600 text-white shadow-xs"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    🔷 Formas
                  </button>
                  <button
                    type="button"
                    onClick={() => setElementsSubTab("vectors")}
                    className={`py-1.5 px-2 rounded-lg text-xs font-semibold transition ${
                      elementsSubTab === "vectors"
                        ? "bg-brand-600 text-white shadow-xs"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    🚀 Vectores
                  </button>
                  <button
                    type="button"
                    onClick={() => setElementsSubTab("illustrations")}
                    className={`py-1.5 px-2 rounded-lg text-xs font-semibold transition ${
                      elementsSubTab === "illustrations"
                        ? "bg-brand-600 text-white shadow-xs"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    🎨 Gráficos
                  </button>
                </div>

                {/* CASO A: FORMAS GEOMÉTRICAS BÁSICAS */}
                {elementsSubTab === "shapes" && (
                  <div className="space-y-4">
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
                        className="p-3.5 rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-700 hover:border-white/50 flex flex-col items-center justify-center gap-2 group transition"
                      >
                        <div className="w-10 h-4 rounded-full bg-white shadow-sm" />
                        <span className="text-xs font-semibold text-slate-200">Píldora</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleAddShape("shape_line")}
                        className="col-span-2 p-3 rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-700 hover:border-white/50 flex items-center justify-center gap-3 group transition"
                      >
                        <Minus className="size-5 text-white" />
                        <span className="text-xs font-semibold text-slate-200">Línea Divisoria</span>
                      </button>
                    </div>

                    {/* Acabados rápidos */}
                    <div className="pt-2 border-t border-slate-800 space-y-2">
                      <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block">Acabados Rápidos</span>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => handleAddShape("shape_rect")}
                          className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-700 hover:border-white/50 flex items-center gap-2 transition text-left"
                        >
                          <div className="size-5 rounded-md bg-white border border-white/40 shadow-xs shrink-0" />
                          <div>
                            <span className="text-xs font-bold text-white block leading-tight">Blanco Sólido</span>
                            <span className="text-[10px] text-slate-400">100% Opaco</span>
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setIsFreeMode(true);
                            const newId = `elem-${Date.now()}`;
                            const glassShape: CustomCanvasElement = {
                              id: newId,
                              type: "shape_rect",
                              x: 50,
                              y: 150,
                              width: 140,
                              height: 90,
                              scale: 1,
                              bgColor: "rgba(255, 255, 255, 0.15)",
                              borderColor: "rgba(255, 255, 255, 0.35)",
                              borderWidth: 1,
                              borderStyle: "solid",
                              borderRadius: 16,
                              opacity: 1,
                            };
                            setSlides((prev) => {
                              const next = [...prev];
                              const cur = next[currentSlideIndex];
                              next[currentSlideIndex] = {
                                ...cur,
                                customElements: [...(cur.customElements || []), glassShape],
                              };
                              return next;
                            });
                            setSelectedElement(newId);
                          }}
                          className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-700 hover:border-brand-500/50 flex items-center gap-2 transition text-left"
                        >
                          <div className="size-5 rounded-md bg-white/20 border border-white/40 shadow-xs shrink-0 backdrop-blur-sm" />
                          <div>
                            <span className="text-xs font-bold text-brand-300 block leading-tight">Efecto Vidrio</span>
                            <span className="text-[10px] text-slate-400">Glassmorphism</span>
                          </div>
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* CASO B: VECTORES E ICONOS O ILUSTRACIONES DE PIXABAY */}
                {(elementsSubTab === "vectors" || elementsSubTab === "illustrations") && (
                  <div className="space-y-3">
                    {/* Buscador */}
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-slate-400" />
                      <input
                        type="text"
                        value={elementSearchQuery}
                        onChange={(e) => setElementSearchQuery(e.target.value)}
                        placeholder={elementsSubTab === "vectors" ? "Buscar vectores (ej. flecha, cohete, icono)..." : "Buscar ilustraciones (ej. dashboard, tech)..."}
                        className="w-full pl-9 pr-8 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-500 transition"
                      />
                      {elementSearchQuery && (
                        <button
                          type="button"
                          onClick={() => setElementSearchQuery("")}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs"
                        >
                          <X className="size-3.5" />
                        </button>
                      )}
                    </div>

                    {/* Chips rápidos */}
                    <div className="flex flex-wrap gap-1">
                      {(elementsSubTab === "vectors"
                        ? [
                            { id: "all", label: "Todos" },
                            { id: "rocket", label: "Cohete" },
                            { id: "chart", label: "Gráfico" },
                            { id: "shield", label: "Escudo" },
                            { id: "arrow", label: "Flecha" },
                            { id: "medal", label: "Insignia" },
                            { id: "idea", label: "Idea" },
                          ]
                        : [
                            { id: "all", label: "Todos" },
                            { id: "dashboard", label: "Dashboard" },
                            { id: "social", label: "Social Media" },
                            { id: "ai", label: "Inteligencia Artificial" },
                            { id: "business", label: "B2B" },
                          ]
                      ).map((chip) => (
                        <button
                          key={chip.id}
                          type="button"
                          onClick={() => {
                            setActiveElementTag(chip.id);
                            if (chip.id !== "all") setElementSearchQuery(chip.label);
                            else setElementSearchQuery("");
                          }}
                          className={`px-2 py-0.5 rounded-lg text-[10px] font-semibold transition ${
                            activeElementTag === chip.id
                              ? "bg-brand-600 text-white"
                              : "bg-slate-800 text-slate-400 hover:text-white"
                          }`}
                        >
                          {chip.label}
                        </button>
                      ))}
                    </div>

                    {/* Grid de Vectores/Ilustraciones */}
                    {isLoadingElements ? (
                      <div className="py-12 flex flex-col items-center justify-center gap-2 text-slate-400">
                        <Loader2 className="size-6 animate-spin text-brand-400" />
                        <span className="text-xs">Cargando recursos en alta definición...</span>
                      </div>
                    ) : pixabayElements.length === 0 ? (
                      <div className="py-10 text-center text-slate-400">
                        <p className="text-xs">No se encontraron elementos para "{elementSearchQuery}".</p>
                        <button
                          type="button"
                          onClick={() => {
                            setElementSearchQuery("");
                            setActiveElementTag("all");
                          }}
                          className="mt-2 text-xs text-brand-400 hover:underline"
                        >
                          Restablecer búsqueda
                        </button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-2 max-h-[440px] overflow-y-auto pr-1">
                        {pixabayElements.map((elem) => (
                          <button
                            key={elem.id}
                            type="button"
                            onClick={() => handleInsertPixabayAsElement(elem)}
                            className="group relative aspect-square p-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-brand-500 flex flex-col items-center justify-center transition hover:scale-102 hover:shadow-lg"
                            title="Haz clic para insertar en el lienzo"
                          >
                            <img
                              src={elem.previewUrl}
                              alt={elem.title}
                              crossOrigin="anonymous"
                              className="max-h-[85%] max-w-[85%] object-contain select-none group-hover:scale-105 transition-transform"
                            />
                            <div className="absolute bottom-1 inset-x-1 text-center">
                              <span className="text-[9px] text-slate-400 group-hover:text-white truncate block font-medium">
                                {elem.title}
                              </span>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {activeDockTab === "photos" && (
              <div className="space-y-4 select-none">
                <div>
                  <h3 className="text-sm font-bold text-white">Fotografías HD</h3>
                  <p className="text-xs text-slate-400">
                    Millones de fotografías de alta resolución o sube las tuyas propias.
                  </p>
                </div>

                {/* Botón Destacado: Subir foto desde el ordenador */}
                <button
                  type="button"
                  onClick={() => fileUploadInputRef.current?.click()}
                  className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-purple-600/20 transition hover:scale-[1.01] active:scale-[0.99]"
                >
                  <UploadCloud className="size-4" />
                  <span>Subir Foto desde mi Ordenador</span>
                </button>

                {/* Buscador de Fotos */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-slate-400" />
                  <input
                    type="text"
                    value={photoSearchQuery}
                    onChange={(e) => setPhotoSearchQuery(e.target.value)}
                    placeholder="Buscar fotos (ej. business, oficina, tech)..."
                    className="w-full pl-9 pr-8 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-500 transition"
                  />
                  {photoSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setPhotoSearchQuery("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs"
                    >
                      <X className="size-3.5" />
                    </button>
                  )}
                </div>

                {/* Filtros de Categoría y Orientación */}
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-1">
                    {[
                      { id: "all", label: "Todas" },
                      { id: "business", label: "Negocios" },
                      { id: "computer", label: "Tecnología" },
                      { id: "office", label: "Oficina" },
                      { id: "people", label: "Líderes" },
                      { id: "buildings", label: "Arquitectura" },
                    ].map((tag) => (
                      <button
                        key={tag.id}
                        type="button"
                        onClick={() => setActivePhotoTag(tag.id)}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold transition ${
                          activePhotoTag === tag.id
                            ? "bg-brand-600 text-white shadow-xs"
                            : "bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-750"
                        }`}
                      >
                        {tag.label}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-2 pt-1 border-t border-slate-800/80">
                    <span className="text-[10px] text-slate-400 font-semibold">Orientación:</span>
                    {(["all", "horizontal", "vertical"] as const).map((ori) => (
                      <button
                        key={ori}
                        type="button"
                        onClick={() => setPhotoOrientation(ori)}
                        className={`text-[10px] px-2 py-0.5 rounded transition capitalize ${
                          photoOrientation === ori
                            ? "bg-slate-700 text-white font-bold"
                            : "text-slate-400 hover:text-white"
                        }`}
                      >
                        {ori === "all" ? "Todas" : ori === "horizontal" ? "Horizontal" : "Vertical"}
                      </button>
                    ))}
                  </div>
                </div>



                {/* Grid de Fotos Pixabay */}
                {isLoadingPhotos ? (
                  <div className="py-12 flex flex-col items-center justify-center gap-2 text-slate-400">
                    <Loader2 className="size-6 animate-spin text-brand-400" />
                    <span className="text-xs">Cargando fotos en alta definición...</span>
                  </div>
                ) : pixabayPhotos.length === 0 ? (
                  <div className="py-10 text-center text-slate-400">
                    <p className="text-xs">No se encontraron fotos para "{photoSearchQuery}".</p>
                    <button
                      type="button"
                      onClick={() => {
                        setPhotoSearchQuery("");
                        setActivePhotoTag("all");
                      }}
                      className="mt-2 text-xs text-brand-400 hover:underline"
                    >
                      Restablecer filtros
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2 pt-1 max-h-[460px] overflow-y-auto pr-1">
                    {pixabayPhotos.map((photo) => (
                      <div
                        key={photo.id}
                        className={`group relative aspect-[4/3] rounded-xl overflow-hidden border transition bg-slate-900 cursor-pointer ${
                          selectedBgUrl === photo.regularUrl
                            ? "border-brand-500 ring-2 ring-brand-500/40"
                            : "border-slate-800 hover:border-slate-600"
                        }`}
                        onClick={() => handleApplyPixabayAsBg(photo)}
                      >
                        <img
                          src={photo.previewUrl}
                          alt={photo.title}
                          crossOrigin="anonymous"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200 select-none"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent opacity-80 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-1.5">
                          {/* Acciones flotantes en hover */}
                          <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleInsertPixabayAsElement(photo);
                              }}
                              className="size-6 rounded-md bg-black/70 hover:bg-brand-600 text-white flex items-center justify-center shadow-md transition"
                              title="Añadir como elemento en el lienzo"
                            >
                              <Plus className="size-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleInsertPhotoAsCutout(photo.regularUrl);
                              }}
                              className="size-6 rounded-md bg-black/70 hover:bg-amber-600 text-white flex items-center justify-center shadow-md transition"
                              title="Quitar fondo con IA y añadir sujeto"
                            >
                              <Sparkles className="size-3 text-amber-300" />
                            </button>
                          </div>

                          <div>
                            <span className="text-[10px] font-semibold text-white block truncate drop-shadow">
                              {photo.title}
                            </span>
                            <span className="text-[8px] text-slate-300 block truncate drop-shadow">
                              por {photo.author}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeDockTab === "backgrounds" && (
              <div className="space-y-4 select-none">
                <div>
                  <h3 className="text-sm font-bold text-white">Fondos & Marca</h3>
                  <p className="text-xs text-slate-400">
                    Configura el modo de fondo, opacidad y biblioteca de fondos HD.
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
                    <span className="font-semibold text-slate-300">Opacidad Filtro Oscuro</span>
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

                {/* SECCIÓN NUEVA: GALERÍA DE FONDOS PIXABAY */}
                <div className="pt-3 border-t border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white uppercase tracking-wider block">Galería de Fondos HD</span>
                    <span className="text-[9px] font-mono text-emerald-400 font-bold">HD</span>
                  </div>

                  {/* Buscador de Fondos */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-slate-400" />
                    <input
                      type="text"
                      value={bgSearchQuery}
                      onChange={(e) => setBgSearchQuery(e.target.value)}
                      placeholder="Buscar fondos (gradientes, texturas)..."
                      className="w-full pl-9 pr-8 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-500 transition"
                    />
                    {bgSearchQuery && (
                      <button
                        type="button"
                        onClick={() => setBgSearchQuery("")}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs"
                      >
                        <X className="size-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Chips rápidos */}
                  <div className="flex flex-wrap gap-1">
                    {[
                      { id: "all", label: "Todos" },
                      { id: "gradient", label: "Gradientes" },
                      { id: "dark", label: "Dark B2B" },
                      { id: "minimal", label: "Minimal" },
                      { id: "abstract", label: "Abstracto" },
                    ].map((chip) => (
                      <button
                        key={chip.id}
                        type="button"
                        onClick={() => {
                          setActiveBgTag(chip.id);
                          if (chip.id !== "all") setBgSearchQuery(chip.label);
                          else setBgSearchQuery("");
                        }}
                        className={`px-2 py-0.5 rounded-lg text-[10px] font-semibold transition ${
                          activeBgTag === chip.id
                            ? "bg-brand-600 text-white"
                            : "bg-slate-800 text-slate-400 hover:text-white"
                        }`}
                      >
                        {chip.label}
                      </button>
                    ))}
                  </div>

                  {/* Grid de Fondos */}
                  {isLoadingBackgrounds ? (
                    <div className="py-8 flex flex-col items-center justify-center gap-2 text-slate-400">
                      <Loader2 className="size-5 animate-spin text-brand-400" />
                      <span className="text-[11px]">Cargando fondos...</span>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2 max-h-[300px] overflow-y-auto pr-1">
                      {pixabayBackgrounds.map((bgItem) => (
                        <button
                          key={bgItem.id}
                          type="button"
                          onClick={() => handleApplyPixabayAsBg(bgItem)}
                          className={`group relative aspect-[4/3] rounded-xl overflow-hidden border transition bg-slate-900 ${
                            selectedBgUrl === bgItem.regularUrl
                              ? "border-brand-500 ring-2 ring-brand-500/40"
                              : "border-slate-800 hover:border-slate-600"
                          }`}
                        >
                          <img
                            src={bgItem.previewUrl}
                            alt={bgItem.title}
                            crossOrigin="anonymous"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-1.5">
                            <span className="text-[9px] font-semibold text-white truncate drop-shadow">
                              {bgItem.title}
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* PESTAÑA NUEVA: VIDEOS Y MOTION PIXABAY */}
            {activeDockTab === "videos" && (
              <div className="space-y-4 select-none">
                <div>
                  <h3 className="text-sm font-bold text-white">Videos & Motion HD</h3>
                  <p className="text-xs text-slate-400">
                    Clips de video corporativo y fondos animados en alta definición.
                  </p>
                </div>

                {/* Buscador de Videos */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-slate-400" />
                  <input
                    type="text"
                    value={videoSearchQuery}
                    onChange={(e) => setVideoSearchQuery(e.target.value)}
                    placeholder="Buscar videos (ej. technology, particles)..."
                    className="w-full pl-9 pr-8 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-500 transition"
                  />
                  {videoSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setVideoSearchQuery("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs"
                    >
                      <X className="size-3.5" />
                    </button>
                  )}
                </div>

                {/* Chips rápidos */}
                <div className="flex flex-wrap gap-1">
                  {[
                    { id: "all", label: "Todos" },
                    { id: "technology", label: "Tecnología" },
                    { id: "particles", label: "Partículas" },
                    { id: "business", label: "Negocios" },
                    { id: "city", label: "Ciudad" },
                  ].map((chip) => (
                    <button
                      key={chip.id}
                      type="button"
                      onClick={() => {
                        setActiveVideoTag(chip.id);
                        if (chip.id !== "all") setVideoSearchQuery(chip.label);
                        else setVideoSearchQuery("");
                      }}
                      className={`px-2 py-0.5 rounded-lg text-[10px] font-semibold transition ${
                        activeVideoTag === chip.id
                          ? "bg-brand-600 text-white"
                          : "bg-slate-800 text-slate-400 hover:text-white"
                      }`}
                    >
                      {chip.label}
                    </button>
                  ))}
                </div>

                {/* Grid de Videos */}
                {isLoadingVideos ? (
                  <div className="py-12 flex flex-col items-center justify-center gap-2 text-slate-400">
                    <Loader2 className="size-6 animate-spin text-brand-400" />
                    <span className="text-xs">Cargando clips en alta definición...</span>
                  </div>
                ) : pixabayVideos.length === 0 ? (
                  <div className="py-10 text-center text-slate-400">
                    <p className="text-xs">No se encontraron videos para "{videoSearchQuery}".</p>
                    <button
                      type="button"
                      onClick={() => {
                        setVideoSearchQuery("");
                        setActiveVideoTag("all");
                      }}
                      className="mt-2 text-xs text-brand-400 hover:underline"
                    >
                      Restablecer búsqueda
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2 max-h-[460px] overflow-y-auto pr-1">
                    {pixabayVideos.map((vid) => (
                      <button
                        key={vid.id}
                        type="button"
                        onClick={() => handleInsertPixabayAsElement(vid)}
                        className="group relative aspect-video rounded-xl overflow-hidden border border-slate-800 hover:border-brand-500 bg-slate-900 transition flex flex-col justify-between p-1.5 text-left"
                        title="Haz clic para añadir video interactivo al lienzo"
                      >
                        <img
                          src={vid.previewUrl}
                          alt={vid.title}
                          crossOrigin="anonymous"
                          className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-between p-2">
                          <div className="flex justify-end">
                            <span className="p-1 rounded bg-black/60 text-white">
                              <Video className="size-3 text-brand-400" />
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] font-semibold text-white block truncate drop-shadow">
                              {vid.title}
                            </span>
                            <span className="text-[8px] text-slate-300 block truncate drop-shadow">
                              por {vid.author}
                            </span>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeDockTab === "uploads" && (
              <div className="space-y-4 animate-in fade-in duration-150">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <UploadCloud className="size-4 text-brand-400" />
                    <h3 className="text-sm font-bold text-white">Uploads</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsDrawerOpen(false)}
                    className="size-7 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition"
                    title="Cerrar panel"
                  >
                    <X className="size-4" />
                  </button>
                </div>

                {/* Buscador de archivos subidos */}
                <div className="relative">
                  <Search className="size-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Buscar archivos, etiquetas..."
                    value={uploadSearchQuery}
                    onChange={(e) => setUploadSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-brand-500 font-sans"
                  />
                </div>

                {/* Botón Principal Púrpura Estilo Canva: [ Upload files ] */}
                <div>
                  <button
                    type="button"
                    onClick={() => fileUploadInputRef.current?.click()}
                    className="w-full py-2.5 px-4 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-purple-600/25 transition hover:scale-[1.01] active:scale-[0.99]"
                  >
                    <UploadCloud className="size-4" />
                    <span>Upload files (Subir archivos)</span>
                  </button>
                  <p className="text-[10px] text-slate-400 text-center mt-1.5">
                    Soporta PNG transparente, JPG, SVG, WebP, GIF, MP4, MOV, WebM, MP3.
                  </p>
                </div>

                {/* Subpestañas: Images | Videos | Audio */}
                <div className="flex items-center gap-1 p-1 bg-slate-950/80 rounded-xl border border-slate-800">
                  <button
                    type="button"
                    onClick={() => setActiveUploadTab("images")}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
                      activeUploadTab === "images"
                        ? "bg-slate-800 text-white shadow-xs"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    <ImageIcon className="size-3.5" />
                    <span>Images</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveUploadTab("videos")}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
                      activeUploadTab === "videos"
                        ? "bg-slate-800 text-white shadow-xs"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    <Video className="size-3.5" />
                    <span>Videos</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveUploadTab("audio")}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
                      activeUploadTab === "audio"
                        ? "bg-slate-800 text-white shadow-xs"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    <Music className="size-3.5" />
                    <span>Audio</span>
                  </button>
                </div>

                {/* Zona de Drop & Arrastre */}
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (e.dataTransfer.files) {
                      handleFileUpload(e.dataTransfer.files);
                    }
                  }}
                  onClick={() => fileUploadInputRef.current?.click()}
                  className="p-3 border-2 border-dashed border-slate-700 hover:border-purple-500/60 rounded-xl bg-slate-950/40 hover:bg-purple-500/5 cursor-pointer text-center transition group"
                >
                  <Upload className="size-5 mx-auto text-slate-400 group-hover:text-purple-400 mb-1 transition-colors" />
                  <p className="text-[11px] text-slate-300 font-semibold">Arrastra archivos aquí para subirlos</p>
                  <p className="text-[9px] text-slate-500">Haz clic o suelta cualquier imagen o video</p>
                </div>

                {/* Galería de Archivos Subidos */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span className="font-semibold text-slate-300">Tus Archivos</span>
                    <span className="text-[10px]">
                      {uploadedMedia.filter((m) => m.type === activeUploadTab).length} elementos
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5 max-h-[340px] overflow-y-auto custom-scrollbar pr-0.5">
                    {uploadedMedia
                      .filter((m) => {
                        const matchesTab = m.type === activeUploadTab;
                        const matchesQuery = uploadSearchQuery
                          ? m.name.toLowerCase().includes(uploadSearchQuery.toLowerCase())
                          : true;
                        return matchesTab && matchesQuery;
                      })
                      .map((item) => (
                        <div
                          key={item.id}
                          className="group/item relative rounded-xl overflow-hidden border border-slate-800 bg-slate-950/70 hover:border-purple-500/60 transition shadow-md flex flex-col justify-between"
                        >
                          {/* Miniatura visual con fondo de cuadrícula para PNG transparentes */}
                          <div
                            onClick={() => handleInsertUploadedElement(item)}
                            className="aspect-square w-full relative flex items-center justify-center p-2 cursor-pointer bg-[linear-gradient(45deg,#1e293b_25%,transparent_25%),linear-gradient(-45deg,#1e293b_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#1e293b_75%),linear-gradient(-45deg,transparent_75%,#1e293b_75%)] bg-[size:16px_16px] bg-[position:0_0,0_8px,8px_-8px,-8px_0]"
                            title="Haz clic para insertar en el lienzo"
                          >
                            {item.type === "image" && (
                              <img
                                src={item.url}
                                alt={item.name}
                                className="w-full h-full object-contain select-none drop-shadow-md group-hover/item:scale-105 transition-transform"
                              />
                            )}
                            {item.type === "video" && (
                              <div className="w-full h-full relative rounded overflow-hidden bg-black flex items-center justify-center">
                                <video
                                  src={item.url}
                                  className="w-full h-full object-cover"
                                  muted
                                  playsInline
                                />
                                <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                                  <Video className="size-6 text-white drop-shadow" />
                                </div>
                              </div>
                            )}
                            {item.type === "audio" && (
                              <div className="w-full h-full flex flex-col items-center justify-center text-purple-400 gap-1 bg-slate-900 rounded">
                                <Music className="size-8" />
                                <span className="text-[10px] font-mono font-bold text-slate-300">AUDIO</span>
                              </div>
                            )}

                            {/* Badge de formato */}
                            <span className="absolute top-1.5 left-1.5 px-1 py-0.5 rounded bg-slate-950/80 backdrop-blur-sm text-[8px] font-mono font-bold text-slate-300 border border-white/10 uppercase">
                              {item.format}
                            </span>
                          </div>

                          {/* Barra de acciones al pie */}
                          <div className="p-1.5 bg-slate-900 border-t border-slate-800 flex items-center justify-between text-[10px]">
                            <span className="truncate max-w-[85px] text-slate-300 font-medium" title={item.name}>
                              {item.name}
                            </span>
                            <div className="flex items-center gap-1">
                              {item.type === "image" && (
                                <>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedBgUrl(item.url);
                                    }}
                                    className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-brand-600 text-slate-300 hover:text-white transition font-bold text-[9px]"
                                    title="Establecer como fondo de la lámina"
                                  >
                                    Fondo
                                  </button>
                                  <button
                                    type="button"
                                    disabled={isRemovingBg}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleRemoveBackgroundFromUploadItem(item);
                                    }}
                                    className="px-1.5 py-0.5 rounded bg-purple-600/30 hover:bg-purple-600 text-purple-200 hover:text-white transition font-bold text-[9px] flex items-center gap-0.5"
                                    title="Remover fondo con IA y dejar solo el sujeto"
                                  >
                                    <Wand2 className="size-2.5 text-amber-300" />
                                    <span>Sin Fondo</span>
                                  </button>
                                </>
                              )}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setUploadedMedia((prev) => prev.filter((m) => m.id !== item.id));
                                }}
                                className="size-5 rounded hover:bg-red-500/20 text-slate-400 hover:text-red-400 flex items-center justify-center transition"
                                title="Eliminar archivo"
                              >
                                <Trash2 className="size-3" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>

                  {uploadedMedia.filter((m) => m.type === activeUploadTab).length === 0 && (
                    <div className="py-8 text-center text-slate-500 text-xs">
                      No hay {activeUploadTab} subidos todavía.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* PESTAÑA: COLOR DE FORMA O BORDE (ESTILO CANVA SCREENSHOT 3) */}
            {(activeDockTab === "shape_color" || activeDockTab === "shape_border_color") && isShape && (
              <div className="space-y-4 animate-in fade-in duration-150">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <Palette className="size-4 text-brand-400" />
                    <h3 className="text-sm font-bold text-white">
                      {activeDockTab === "shape_color" ? "Color de Forma" : "Color del Trazo"}
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveDockTab("elements")}
                    className="size-7 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition"
                    title="Volver a Elementos"
                  >
                    <X className="size-4" />
                  </button>
                </div>

                {/* Buscador de Color estilo Canva */}
                <div className="relative">
                  <Search className="size-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Prueba 'azul', 'indigo' o '#00c4cc'"
                    value={colorSearchQuery}
                    onChange={(e) => setColorSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-brand-500 font-sans"
                  />
                </div>

                {/* Colores de la Forma (Shape colors) */}
                <div>
                  <span className="text-xs font-bold text-slate-300 block mb-2">Acabado y Color</span>
                  {activeDockTab === "shape_color" && (
                    <div className="space-y-2.5 mb-3">
                      <div className="grid grid-cols-3 gap-1.5">
                        {/* 1. Blanco Sólido */}
                        <button
                          type="button"
                          onClick={() => {
                            const curColor = parseGradientOrColor(customElem?.bgColor).color || "#ffffff";
                            handleUpdateCustomElement(selectedElement!, {
                              bgColor: curColor,
                              borderColor: "transparent",
                              borderWidth: 0,
                              opacity: 1,
                            });
                            handleStyleChange(selectedElement!, {
                              bgColor: curColor,
                              borderColor: "transparent",
                              borderWidth: 0,
                              opacity: 1,
                            });
                          }}
                          className={`py-1.5 px-1.5 rounded-lg border text-[11px] font-semibold flex items-center justify-center gap-1.5 transition ${
                            !customElem?.bgColor?.includes("linear-gradient") && !customElem?.bgColor?.includes("rgba(255, 255, 255, 0.15)")
                              ? "bg-slate-700 border-white/40 text-white font-bold ring-1 ring-white/30"
                              : "bg-slate-800 border-slate-700 text-slate-300 hover:text-white hover:bg-slate-750"
                          }`}
                          title="Color plano sólido"
                        >
                          <span className="size-3 rounded-full bg-white border border-slate-400 shrink-0" />
                          <span className="truncate">Sólido</span>
                        </button>

                        {/* 2. Efecto Vidrio */}
                        <button
                          type="button"
                          onClick={() => {
                            handleUpdateCustomElement(selectedElement!, {
                              bgColor: "rgba(255, 255, 255, 0.15)",
                              borderColor: "rgba(255, 255, 255, 0.35)",
                              borderWidth: 1,
                              borderStyle: "solid",
                              opacity: 1,
                            });
                            handleStyleChange(selectedElement!, {
                              bgColor: "rgba(255, 255, 255, 0.15)",
                              borderColor: "rgba(255, 255, 255, 0.35)",
                              borderWidth: 1,
                              borderStyle: "solid",
                              opacity: 1,
                            });
                          }}
                          className={`py-1.5 px-1.5 rounded-lg border text-[11px] font-semibold flex items-center justify-center gap-1.5 transition ${
                            customElem?.bgColor?.includes("rgba(255, 255, 255, 0.15)")
                              ? "bg-brand-500/25 border-brand-400 text-brand-300 font-bold ring-1 ring-brand-400/40"
                              : "bg-slate-800 border-slate-700 text-slate-300 hover:text-white hover:bg-slate-750"
                          }`}
                          title="Efecto de vidrio translúcido con desenfoque"
                        >
                          <span className="size-3 rounded-full bg-white/20 border border-white/60 backdrop-blur-sm shrink-0" />
                          <span className="truncate">Vidrio</span>
                        </button>

                        {/* 3. Degradado a Transparente */}
                        <button
                          type="button"
                          onClick={() => {
                            const curColor = parseGradientOrColor(customElem?.bgColor).color || "#ffffff";
                            const newBg = `linear-gradient(to bottom, ${curColor}, transparent)`;
                            handleUpdateCustomElement(selectedElement!, {
                              bgColor: newBg,
                              borderColor: "transparent",
                              borderWidth: 0,
                              opacity: 1,
                            });
                            handleStyleChange(selectedElement!, {
                              bgColor: newBg,
                              borderColor: "transparent",
                              borderWidth: 0,
                              opacity: 1,
                            });
                          }}
                          className={`py-1.5 px-1.5 rounded-lg border text-[11px] font-semibold flex items-center justify-center gap-1.5 transition ${
                            customElem?.bgColor?.includes("linear-gradient")
                              ? "bg-amber-500/20 border-amber-400 text-amber-300 font-bold ring-1 ring-amber-400/40"
                              : "bg-slate-800 border-slate-700 text-slate-300 hover:text-white hover:bg-slate-750"
                          }`}
                          title="Degradado suave del color original a transparente"
                        >
                          <span
                            className="size-3 rounded-full border border-white/40 shrink-0"
                            style={{ background: "linear-gradient(to bottom, #ffffff, transparent)" }}
                          />
                          <span className="truncate">Degradado</span>
                        </button>
                      </div>

                      {/* Selector de 4 direcciones cuando el degradado está activo */}
                      {customElem?.bgColor?.includes("linear-gradient") && (
                        <div className="p-2 rounded-xl bg-slate-900 border border-slate-800 space-y-1.5 animate-in fade-in">
                          <span className="text-[10px] text-amber-300/90 font-semibold block">
                            Dirección hacia transparente:
                          </span>
                          <div className="grid grid-cols-4 gap-1">
                            {[
                              { dir: "to bottom", label: "Abajo", icon: "↓" },
                              { dir: "to top", label: "Arriba", icon: "↑" },
                              { dir: "to right", label: "Derecha", icon: "→" },
                              { dir: "to left", label: "Izquierda", icon: "←" },
                            ].map((d) => {
                              const curInfo = parseGradientOrColor(customElem?.bgColor);
                              const isCurrentDir = curInfo.direction === d.dir;
                              return (
                                <button
                                  key={d.dir}
                                  type="button"
                                  onClick={() => {
                                    const newBg = `linear-gradient(${d.dir}, ${curInfo.color}, transparent)`;
                                    handleUpdateCustomElement(selectedElement!, { bgColor: newBg });
                                    handleStyleChange(selectedElement!, { bgColor: newBg });
                                  }}
                                  className={`py-1 rounded-lg border text-xs font-mono font-bold flex flex-col items-center justify-center transition ${
                                    isCurrentDir
                                      ? "bg-amber-500 text-black border-amber-400 shadow-sm font-black"
                                      : "bg-slate-800 border-slate-700 text-slate-300 hover:text-white hover:bg-slate-750"
                                  }`}
                                  title={`Degradado hacia ${d.label}`}
                                >
                                  <span className="text-sm leading-none">{d.icon}</span>
                                  <span className="text-[8px] font-sans font-medium mt-0.5">{d.label}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    {/* Selector Nativo (+) */}
                    <label className="size-8 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 flex items-center justify-center cursor-pointer transition relative group shrink-0" title="Añadir color personalizado">
                      <Plus className="size-4 text-brand-400 group-hover:scale-110 transition-transform" />
                      <input
                        type="color"
                        value={
                          activeDockTab === "shape_color"
                            ? parseGradientOrColor(customElem?.bgColor).color || "#ffffff"
                            : (customElem?.borderColor && customElem.borderColor !== "transparent" ? customElem.borderColor : "#ffffff")
                        }
                        onChange={(e) => {
                          const picked = e.target.value;
                          if (activeDockTab === "shape_color") {
                            const curInfo = parseGradientOrColor(customElem?.bgColor);
                            const newBg = curInfo.isGradient
                              ? `linear-gradient(${curInfo.direction}, ${picked}, transparent)`
                              : picked;
                            handleUpdateCustomElement(selectedElement!, { bgColor: newBg });
                            handleStyleChange(selectedElement!, { bgColor: newBg });
                          } else {
                            handleUpdateCustomElement(selectedElement!, { borderColor: picked });
                            handleStyleChange(selectedElement!, { borderColor: picked });
                          }
                        }}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                      />
                    </label>

                    {/* Sin Color / Transparente (⊘) */}
                    <button
                      type="button"
                      onClick={() => {
                        if (activeDockTab === "shape_color") {
                          handleUpdateCustomElement(selectedElement!, { bgColor: "transparent" });
                          handleStyleChange(selectedElement!, { bgColor: "transparent" });
                        } else {
                          handleUpdateCustomElement(selectedElement!, { borderColor: "transparent" });
                          handleStyleChange(selectedElement!, { borderColor: "transparent" });
                        }
                      }}
                      className={`size-8 rounded-lg border flex items-center justify-center font-black text-sm shrink-0 transition ${
                        (activeDockTab === "shape_color" ? customElem?.bgColor : customElem?.borderColor) === "transparent"
                          ? "border-red-500 bg-red-500/20 text-red-400 ring-2 ring-red-500/30"
                          : "border-slate-700 bg-slate-800 text-slate-400 hover:text-red-400 hover:bg-slate-700"
                      }`}
                      title="Sin color (Transparente)"
                    >
                      ⊘
                    </button>

                    {/* Muestra del color actual */}
                    <div
                      className="size-8 rounded-lg border-2 border-white/60 shadow-md flex items-center justify-center shrink-0"
                      style={{
                        backgroundColor:
                          activeDockTab === "shape_color"
                            ? (customElem?.bgColor && customElem.bgColor !== "transparent" ? customElem.bgColor : "transparent")
                            : (customElem?.borderColor && customElem.borderColor !== "transparent" ? customElem.borderColor : "transparent"),
                      }}
                      title="Color activo"
                    >
                      {(activeDockTab === "shape_color" ? customElem?.bgColor : customElem?.borderColor) === "transparent" && (
                        <span className="text-red-400 font-bold text-xs">⊘</span>
                      )}
                    </div>

                    {/* Código Hex en vivo */}
                    <div className="flex-1 flex items-center bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 min-w-0">
                      <span className="text-[10px] text-slate-400 font-mono mr-1 shrink-0">HEX</span>
                      <input
                        type="text"
                        value={
                          activeDockTab === "shape_color"
                            ? (customElem?.bgColor || "")
                            : (customElem?.borderColor || "")
                        }
                        placeholder="#0099ff"
                        onChange={(e) => {
                          const val = e.target.value;
                          if (activeDockTab === "shape_color") {
                            handleUpdateCustomElement(selectedElement!, { bgColor: val });
                            handleStyleChange(selectedElement!, { bgColor: val });
                          } else {
                            handleUpdateCustomElement(selectedElement!, { borderColor: val });
                            handleStyleChange(selectedElement!, { borderColor: val });
                          }
                        }}
                        className="w-full bg-transparent text-xs font-mono text-white focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Colores en este diseño */}
                <div>
                  <span className="text-xs font-bold text-slate-300 block mb-2">Colores en este diseño</span>
                  <div className="grid grid-cols-7 gap-2">
                    {[
                      accentColor,
                      "#0099ff",
                      "#6366f1",
                      "#10b981",
                      "#f59e0b",
                      "#ec4899",
                      "#ffffff",
                    ].map((c, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => {
                          if (activeDockTab === "shape_color") {
                            const curInfo = parseGradientOrColor(customElem?.bgColor);
                            const newBg = curInfo.isGradient
                              ? `linear-gradient(${curInfo.direction}, ${c}, transparent)`
                              : c;
                            handleUpdateCustomElement(selectedElement!, { bgColor: newBg });
                            handleStyleChange(selectedElement!, { bgColor: newBg });
                          } else {
                            handleUpdateCustomElement(selectedElement!, { borderColor: c });
                            handleStyleChange(selectedElement!, { borderColor: c });
                          }
                        }}
                        className="size-8 rounded-full border border-white/20 shadow-sm transition hover:scale-110 hover:ring-2 hover:ring-white/40"
                        style={{ backgroundColor: c }}
                        title={c}
                      />
                    ))}
                  </div>
                </div>

                {/* Kit de Marca B2B (Brand Kit) */}
                <div className="pt-2 border-t border-slate-800">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-300">Brand Kit</span>
                    <span className="text-[10px] text-brand-400 font-semibold cursor-pointer">B2B Suite</span>
                  </div>
                  <div className="grid grid-cols-7 gap-2">
                    {[
                      "#0099ff",
                      "#4f46e5",
                      "#059669",
                      "#d97706",
                      "#db2777",
                      "#0f172a",
                      "#1e293b",
                      "#334155",
                      "#475569",
                      "#94a3b8",
                      "#cbd5e1",
                      "#f8fafc",
                      "#ffffff",
                      "#000000",
                    ].map((c, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => {
                          if (activeDockTab === "shape_color") {
                            handleUpdateCustomElement(selectedElement!, { bgColor: c });
                            handleStyleChange(selectedElement!, { bgColor: c });
                          } else {
                            handleUpdateCustomElement(selectedElement!, { borderColor: c });
                            handleStyleChange(selectedElement!, { borderColor: c });
                          }
                        }}
                        className="size-8 rounded-full border border-white/10 shadow-sm transition hover:scale-110 hover:ring-2 hover:ring-brand-400"
                        style={{ backgroundColor: c }}
                        title={c}
                      />
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
          <div className="h-11 bg-slate-900/95 border-b border-slate-800 px-4 flex items-center justify-between shrink-0 z-30 select-none text-xs gap-2 relative">
            
            {/* HERRAMIENTAS CONTEXTUALES SEGÚN ELEMENTO SELECCIONADO */}
            <div className="flex items-center gap-1.5 py-1">
              
              {/* CASO A: ELEMENTO DE TEXTO SELECCIONADO */}
              {isText && (
                <>
                  {/* Botón Editar Texto */}
                  <button
                    type="button"
                    onClick={() => {
                      setEditingElementKey(selectedElement);
                    }}
                    className={`h-7 px-2.5 rounded-md flex items-center gap-1.5 text-xs font-semibold border transition ${
                      editingElementKey === selectedElement
                        ? "bg-brand-500 text-white border-brand-500 shadow-sm"
                        : "bg-slate-800 border-slate-700 text-slate-200 hover:text-white hover:bg-slate-700"
                    }`}
                    title="Editar texto directamente en el lienzo (o haz doble clic)"
                  >
                    <Pencil className="size-3 text-brand-400" />
                    <span>Editar</span>
                  </button>

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

              {/* CASO B: FORMA GEOMÉTRICA SELECCIONADA (ESTILO CANVA) */}
              {isShape && (
                <>
                  {/* 1. EDIT (Abre panel lateral izquierdo - Canva Screenshot 2) */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => {
                        setActiveToolbarPopup(null);
                        if (activeDockTab === "shape_edit" && isDrawerOpen) {
                          setIsDrawerOpen(false);
                        } else {
                          setActiveDockTab("shape_edit");
                          setIsDrawerOpen(true);
                        }
                      }}
                      className={`h-7 px-2.5 rounded-md flex items-center gap-1.5 text-xs font-semibold border transition ${
                        activeDockTab === "shape_edit" && isDrawerOpen
                          ? "bg-brand-600 border-brand-500 text-white shadow-sm font-bold"
                          : "bg-slate-800 border-slate-700 text-slate-200 hover:text-white hover:bg-slate-750"
                      }`}
                      title="Abrir panel de edición de forma (Transformar)"
                    >
                      <Shapes className="size-3.5 text-brand-400" />
                      <span>Edit</span>
                      {activeDockTab === "shape_edit" && isDrawerOpen && (
                        <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse ml-0.5" />
                      )}
                    </button>
                  </div>

                  {/* 2. COLOR (Relleno / Fill - Abre panel lateral izquierdo - Canva Screenshot 3) */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => {
                        setActiveToolbarPopup(null);
                        if (activeDockTab === "shape_color" && isDrawerOpen) {
                          setIsDrawerOpen(false);
                        } else {
                          setActiveDockTab("shape_color");
                          setIsDrawerOpen(true);
                        }
                      }}
                      className={`size-7 rounded-md flex items-center justify-center transition border ${
                        activeDockTab === "shape_color" && isDrawerOpen
                          ? "border-brand-500 bg-slate-700 ring-2 ring-brand-500 ring-offset-1 ring-offset-slate-900"
                          : "border-slate-700 bg-slate-800 hover:border-slate-600"
                      }`}
                      title="Color de relleno (abre panel lateral)"
                    >
                      <span
                        className="size-4.5 rounded-full border border-white/30 shadow-xs flex items-center justify-center"
                        style={{ backgroundColor: customElem?.bgColor && customElem.bgColor !== "transparent" ? customElem.bgColor : "transparent" }}
                      >
                        {(!customElem?.bgColor || customElem.bgColor === "transparent") && (
                          <span className="text-red-400 font-bold text-[9px] leading-none">⊘</span>
                        )}
                      </span>
                    </button>
                  </div>

                  {/* 3. STROKE COLOR (Color del Borde - Abre panel lateral izquierdo) */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => {
                        setActiveToolbarPopup(null);
                        if (activeDockTab === "shape_border_color" && isDrawerOpen) {
                          setIsDrawerOpen(false);
                        } else {
                          setActiveDockTab("shape_border_color");
                          setIsDrawerOpen(true);
                        }
                      }}
                      className={`size-7 rounded-md flex items-center justify-center transition border ${
                        activeDockTab === "shape_border_color" && isDrawerOpen
                          ? "border-brand-500 bg-slate-700 ring-2 ring-brand-500 ring-offset-1 ring-offset-slate-900"
                          : "border-slate-700 bg-slate-800 hover:border-slate-600"
                      }`}
                      title="Color del trazo / borde (abre panel lateral)"
                    >
                      <span
                        className="size-4.5 rounded-full border-2 border-dashed shadow-xs flex items-center justify-center"
                        style={{ borderColor: customElem?.borderColor || accentColor }}
                      >
                        {customElem?.borderColor === "transparent" && (
                          <span className="text-red-400 font-bold text-[9px] leading-none">⊘</span>
                        )}
                      </span>
                    </button>
                  </div>

                  {/* 4. STROKE STYLE & WEIGHT (Canva Screenshot 4) */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setActiveToolbarPopup(activeToolbarPopup === "shape_stroke" ? null : "shape_stroke")}
                      className={`size-7 rounded-md flex items-center justify-center transition border ${
                        activeToolbarPopup === "shape_stroke"
                          ? "border-brand-500 bg-slate-700 text-white shadow-sm"
                          : "border-slate-700 bg-slate-800 text-slate-300 hover:text-white hover:border-slate-600"
                      }`}
                      title="Estilo y grosor del trazo (Stroke style)"
                    >
                      <svg className="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round">
                        <line x1="3" y1="6" x2="21" y2="6" strokeWidth="4" />
                        <line x1="3" y1="12" x2="21" y2="12" strokeWidth="2.5" />
                        <line x1="3" y1="18" x2="21" y2="18" strokeWidth="1" />
                      </svg>
                    </button>

                    {activeToolbarPopup === "shape_stroke" && (
                      <div className="absolute top-9 left-0 z-50 p-4 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-64 animate-in fade-in zoom-in-95 select-none space-y-4">
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                            Tipo de Trazo
                          </p>
                          <div className="grid grid-cols-4 gap-1.5 p-1 rounded-lg bg-slate-950 border border-slate-800">
                            <button
                              type="button"
                              onClick={() => {
                                handleUpdateCustomElement(selectedElement!, { borderStyle: "none" });
                                handleStyleChange(selectedElement!, { borderStyle: "none" });
                              }}
                              className={`h-8 rounded flex items-center justify-center transition ${
                                customElem?.borderStyle === "none"
                                  ? "bg-brand-500/20 text-brand-400 border border-brand-500 font-bold"
                                  : "text-slate-400 hover:text-white hover:bg-slate-800"
                              }`}
                              title="Sin trazo"
                            >
                              ⊘
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                handleUpdateCustomElement(selectedElement!, {
                                  borderStyle: "solid",
                                  borderWidth: customElem?.borderWidth || 2,
                                });
                                handleStyleChange(selectedElement!, {
                                  borderStyle: "solid",
                                  borderWidth: customElem?.borderWidth || 2,
                                });
                              }}
                              className={`h-8 rounded flex items-center justify-center transition ${
                                customElem?.borderStyle === "solid" || (!customElem?.borderStyle && (customElem?.borderWidth || 0) > 0)
                                  ? "bg-brand-500/20 text-brand-400 border border-brand-500"
                                  : "text-slate-400 hover:text-white hover:bg-slate-800"
                              }`}
                              title="Línea continua"
                            >
                              <span className="w-4 h-0.5 bg-current rounded-full" />
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                handleUpdateCustomElement(selectedElement!, {
                                  borderStyle: "dashed",
                                  borderWidth: customElem?.borderWidth || 2,
                                });
                                handleStyleChange(selectedElement!, {
                                  borderStyle: "dashed",
                                  borderWidth: customElem?.borderWidth || 2,
                                });
                              }}
                              className={`h-8 rounded flex items-center justify-center transition ${
                                customElem?.borderStyle === "dashed"
                                  ? "bg-brand-500/20 text-brand-400 border border-brand-500"
                                  : "text-slate-400 hover:text-white hover:bg-slate-800"
                              }`}
                              title="Línea de guiones"
                            >
                              <span className="text-[11px] font-mono tracking-tighter">- - -</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                handleUpdateCustomElement(selectedElement!, {
                                  borderStyle: "dotted",
                                  borderWidth: customElem?.borderWidth || 2,
                                });
                                handleStyleChange(selectedElement!, {
                                  borderStyle: "dotted",
                                  borderWidth: customElem?.borderWidth || 2,
                                });
                              }}
                              className={`h-8 rounded flex items-center justify-center transition ${
                                customElem?.borderStyle === "dotted"
                                  ? "bg-brand-500/20 text-brand-400 border border-brand-500"
                                  : "text-slate-400 hover:text-white hover:bg-slate-800"
                              }`}
                              title="Línea de puntos"
                            >
                              <span className="text-xs font-mono tracking-tight font-black leading-none">····</span>
                            </button>
                          </div>
                        </div>

                        <div>
                          <div className="flex justify-between items-center text-xs font-semibold text-slate-300 mb-1.5">
                            <span>Stroke weight (Grosor)</span>
                            <span className="w-8 py-0.5 rounded bg-slate-800 text-center font-mono text-brand-400 font-bold border border-slate-700">
                              {customElem?.borderWidth ?? 2}
                            </span>
                          </div>
                          <input
                            type="range"
                            min="0"
                            max="40"
                            step="1"
                            value={customElem?.borderWidth ?? 2}
                            onChange={(e) => {
                              const val = parseInt(e.target.value, 10);
                              handleUpdateCustomElement(selectedElement!, {
                                borderWidth: val,
                                borderStyle: val === 0 ? "none" : (customElem?.borderStyle && customElem.borderStyle !== "none" ? customElem.borderStyle : "solid"),
                              });
                              handleStyleChange(selectedElement!, {
                                borderWidth: val,
                                borderStyle: val === 0 ? "none" : (customElem?.borderStyle && customElem.borderStyle !== "none" ? customElem.borderStyle : "solid"),
                              });
                            }}
                            className="w-full accent-brand-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 5. CORNER (Redondeo de Esquinas - Canva Screenshot 5) */}
                  {(customElem?.type === "shape_rect" || customElem?.type === "shape_pill") && (
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setActiveToolbarPopup(activeToolbarPopup === "shape_corner" ? null : "shape_corner")}
                        className={`size-7 rounded-md flex items-center justify-center transition border ${
                          activeToolbarPopup === "shape_corner"
                            ? "border-brand-500 bg-slate-700 text-white shadow-sm"
                            : "border-slate-700 bg-slate-800 text-slate-300 hover:text-white hover:border-slate-600"
                        }`}
                        title="Redondeo de esquinas (Corner rounding)"
                      >
                        <svg className="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M4 20V10a6 6 0 0 1 6-6h10" />
                        </svg>
                      </button>

                      {activeToolbarPopup === "shape_corner" && (
                        <div className="absolute top-9 left-0 z-50 p-4 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-60 animate-in fade-in zoom-in-95 select-none space-y-3">
                          <div className="flex justify-between items-center text-xs font-semibold text-slate-300 mb-1">
                            <span>Corner rounding</span>
                            <span className="w-9 py-0.5 rounded bg-slate-800 text-center font-mono text-brand-400 font-bold border border-slate-700">
                              {customElem?.borderRadius ?? 16}
                            </span>
                          </div>
                          <input
                            type="range"
                            min="0"
                            max="60"
                            step="1"
                            value={customElem?.borderRadius ?? 16}
                            onChange={(e) => {
                              const val = parseInt(e.target.value, 10);
                              handleUpdateCustomElement(selectedElement!, { borderRadius: val });
                              handleStyleChange(selectedElement!, { borderRadius: val });
                            }}
                            className="w-full accent-brand-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {/* 6. TRANSPARENCY (Opacidad / Transparencia - Canva Screenshot 1) */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setActiveToolbarPopup(activeToolbarPopup === "shape_transparency" ? null : "shape_transparency")}
                      className={`size-7 rounded-md flex items-center justify-center transition border ${
                        activeToolbarPopup === "shape_transparency"
                          ? "border-brand-500 bg-slate-700 text-white shadow-sm"
                          : "border-slate-700 bg-slate-800 text-slate-300 hover:text-white hover:border-slate-600"
                      }`}
                      title="Transparencia / Opacidad"
                    >
                      <svg className="size-3.5" viewBox="0 0 24 24" fill="currentColor">
                        <rect x="2" y="2" width="5" height="5" opacity="0.4" />
                        <rect x="7" y="2" width="5" height="5" opacity="0.9" />
                        <rect x="12" y="2" width="5" height="5" opacity="0.4" />
                        <rect x="17" y="2" width="5" height="5" opacity="0.9" />
                        <rect x="2" y="7" width="5" height="5" opacity="0.9" />
                        <rect x="7" y="7" width="5" height="5" opacity="0.4" />
                        <rect x="12" y="7" width="5" height="5" opacity="0.9" />
                        <rect x="17" y="7" width="5" height="5" opacity="0.4" />
                        <rect x="2" y="12" width="5" height="5" opacity="0.4" />
                        <rect x="7" y="12" width="5" height="5" opacity="0.9" />
                        <rect x="12" y="12" width="5" height="5" opacity="0.4" />
                        <rect x="17" y="12" width="5" height="5" opacity="0.9" />
                        <rect x="2" y="17" width="5" height="5" opacity="0.9" />
                        <rect x="7" y="17" width="5" height="5" opacity="0.4" />
                        <rect x="12" y="17" width="5" height="5" opacity="0.9" />
                        <rect x="17" y="17" width="5" height="5" opacity="0.4" />
                      </svg>
                    </button>

                    {activeToolbarPopup === "shape_transparency" && (
                      <div className="absolute top-9 left-0 z-50 p-4 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-60 animate-in fade-in zoom-in-95 select-none space-y-3">
                        <div className="flex justify-between items-center text-xs font-semibold text-slate-300 mb-1">
                          <span>Transparencia</span>
                          <span className="w-12 py-0.5 rounded bg-slate-800 text-center font-mono text-brand-400 font-bold border border-slate-700">
                            {Math.round((customElem?.opacity ?? 1) * 100)}%
                          </span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          step="1"
                          value={Math.round((customElem?.opacity ?? 1) * 100)}
                          onChange={(e) => {
                            const val = Number((parseInt(e.target.value, 10) / 100).toFixed(2));
                            handleUpdateCustomElement(selectedElement!, { opacity: val });
                            handleStyleChange(selectedElement!, { opacity: val });
                          }}
                          className="w-full accent-brand-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                        />
                        <div className="flex items-center gap-1.5 pt-2 border-t border-slate-800">
                          <button
                            type="button"
                            onClick={() => {
                              handleUpdateCustomElement(selectedElement!, { opacity: 1, bgColor: "#ffffff" });
                              handleStyleChange(selectedElement!, { opacity: 1, bgColor: "#ffffff" });
                            }}
                            className="flex-1 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-[10px] font-semibold text-slate-300 hover:text-white transition"
                          >
                            100% Sólido
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              handleUpdateCustomElement(selectedElement!, {
                                bgColor: "rgba(255, 255, 255, 0.15)",
                                borderColor: "rgba(255, 255, 255, 0.35)",
                                borderWidth: 1,
                                borderStyle: "solid",
                                opacity: 1,
                              });
                              handleStyleChange(selectedElement!, {
                                bgColor: "rgba(255, 255, 255, 0.15)",
                                borderColor: "rgba(255, 255, 255, 0.35)",
                                borderWidth: 1,
                                borderStyle: "solid",
                                opacity: 1,
                              });
                            }}
                            className="flex-1 py-1 rounded-md bg-brand-500/20 hover:bg-brand-500/30 text-[10px] font-semibold text-brand-300 border border-brand-500/40 transition"
                          >
                            ✨ Efecto Vidrio
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  <span className="h-4 w-px bg-slate-700 mx-1" />

                  {/* 7. DUPLICAR Y ELIMINAR */}
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

              {/* CASO C: FOTOS, IMÁGENES Y OBJETOS (HERRAMIENTAS ESTILO CANVA) */}
              {isImage && (
                <>
                  {/* 1. MAGIC BG REMOVER (Quitar Fondo con IA) */}
                  <button
                    type="button"
                    disabled={isRemovingBg}
                    onClick={() => {
                      if (selectedElement === "background" || selectedElement === "bg-photo") {
                        handleRemoveBackgroundFromBgPhoto();
                      } else if (selectedElement) {
                        handleRemoveBackgroundFromElement(selectedElement);
                      }
                    }}
                    className="flex items-center gap-1.5 px-3 h-7 rounded-md bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white text-xs font-semibold shadow-sm transition disabled:opacity-50"
                    title="Remover fondo con IA y recortar el sujeto en PNG transparente"
                  >
                    {isRemovingBg && (bgRemoverTargetId === "bg-photo" || bgRemoverTargetId === selectedElement) ? (
                      <>
                        <Loader2 className="size-3.5 animate-spin" />
                        <span>Recortando IA...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="size-3.5 text-amber-300" />
                        <span>Quitar Fondo (IA)</span>
                      </>
                    )}
                  </button>

                  {/* 2. CAMBIAR FOTO / REEMPLAZAR */}
                  <button
                    type="button"
                    onClick={() => {
                      if (selectedElement !== "background" && selectedElement !== "bg-photo") {
                        setSelectedElement("background");
                      }
                      setActiveDockTab("photos");
                      setIsDrawerOpen(true);
                    }}
                    className="flex items-center gap-1.5 px-2.5 h-7 rounded-md bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold transition"
                    title="Reemplazar por otra foto de la biblioteca o Unsplash"
                  >
                    <ImageIcon className="size-3.5 text-brand-400" />
                    <span>Cambiar Foto</span>
                  </button>

                  <span className="h-4 w-px bg-slate-700 mx-1" />

                  {/* 3. TAMAÑO Y ZOOM */}
                  <div className="flex items-center h-7 bg-slate-800 rounded-md border border-slate-700 overflow-hidden">
                    <span className="text-[10px] text-slate-400 px-2 font-semibold">Tamaño:</span>
                    <button
                      type="button"
                      onClick={() => {
                        if (selectedElement === "background" || selectedElement === "bg-photo") {
                          handleBgZoomChange(-0.1);
                        } else if (customElem) {
                          const curScale = currentSlide.scales?.[selectedElement!] ?? customElem.scale ?? 1;
                          const nextScale = Math.max(0.2, +(curScale - 0.1).toFixed(2));
                          handleScaleChange(selectedElement!, nextScale);
                        }
                      }}
                      className="size-7 hover:bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-300"
                      title="Reducir tamaño"
                    >
                      -
                    </button>
                    <span className="text-[10px] font-mono font-bold text-white px-1.5 min-w-[36px] text-center">
                      {selectedElement === "background" || selectedElement === "bg-photo"
                        ? `${Math.round(bgScale * 100)}%`
                        : `${Math.round((currentSlide.scales?.[selectedElement!] ?? customElem?.scale ?? 1) * 100)}%`}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        if (selectedElement === "background" || selectedElement === "bg-photo") {
                          handleBgZoomChange(0.1);
                        } else if (customElem) {
                          const curScale = currentSlide.scales?.[selectedElement!] ?? customElem.scale ?? 1;
                          const nextScale = Math.min(3.5, +(curScale + 0.1).toFixed(2));
                          handleScaleChange(selectedElement!, nextScale);
                        }
                      }}
                      className="size-7 hover:bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-300"
                      title="Aumentar tamaño"
                    >
                      +
                    </button>
                  </div>

                  {/* 4. FILTRO DE CONTRASTE / BRILLO / OPACIDAD */}
                  <div className="flex items-center gap-1.5 h-7 bg-slate-800 rounded-md border border-slate-700 px-2">
                    <Sun className="size-3 text-amber-400 shrink-0" />
                    <span className="text-[10px] text-slate-400 font-semibold">
                      {selectedElement === "background" || selectedElement === "bg-photo" ? "Filtro:" : "Opacidad:"}
                    </span>
                    {selectedElement === "background" || selectedElement === "bg-photo" ? (
                      <input
                        type="range"
                        min="0"
                        max="80"
                        step="5"
                        value={bgDimming}
                        onChange={(e) => setBgDimming(Number(e.target.value))}
                        className="w-16 accent-amber-400 h-1 bg-slate-700 rounded-lg cursor-pointer"
                        title="Filtro de contraste para legibilidad de textos"
                      />
                    ) : (
                      <input
                        type="range"
                        min="0"
                        max="100"
                        step="5"
                        value={Math.round((customElem?.opacity ?? 1) * 100)}
                        onChange={(e) => {
                          const val = Number((parseInt(e.target.value, 10) / 100).toFixed(2));
                          handleUpdateCustomElement(selectedElement!, { opacity: val });
                        }}
                        className="w-16 accent-brand-500 h-1 bg-slate-700 rounded-lg cursor-pointer"
                        title="Opacidad de la imagen"
                      />
                    )}
                  </div>

                  <span className="h-4 w-px bg-slate-700 mx-1" />

                  {/* 5. DUPLICAR */}
                  <button
                    type="button"
                    onClick={() => handleDuplicateElement(selectedElement!)}
                    className="flex items-center gap-1.5 px-2.5 h-7 rounded-md bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold transition"
                    title="Duplicar foto"
                  >
                    <Copy className="size-3.5 text-brand-400" />
                    <span>Duplicar</span>
                  </button>

                  {/* 6. ELIMINAR */}
                  <button
                    type="button"
                    onClick={() => handleDeleteElement(selectedElement!)}
                    className="flex items-center gap-1.5 px-2.5 h-7 rounded-md bg-slate-800 hover:bg-red-500/20 border border-slate-700 text-slate-300 hover:text-red-400 text-xs font-semibold transition"
                    title="Eliminar foto (o pulsa tecla Supr/Backspace)"
                  >
                    <Trash2 className="size-3.5" />
                    <span>Eliminar</span>
                  </button>
                </>
              )}

              {/* CASO D: ELEMENTOS GENÉRICOS DE PLANTILLA (TARJETAS, CITAS, BLOQUES) */}
              {!isText && !isShape && !isImage && (
                <>
                  {selectedElement && selectedElement !== "background" ? (
                    <>
                      <button
                        type="button"
                        onClick={() => handleDuplicateElement(selectedElement!)}
                        className="flex items-center gap-1.5 px-2.5 h-7 rounded-md bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold transition"
                        title="Duplicar elemento"
                      >
                        <Copy className="size-3 text-brand-400" />
                        <span>Duplicar</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteElement(selectedElement!)}
                        className="flex items-center gap-1.5 px-2.5 h-7 rounded-md bg-slate-800 hover:bg-red-500/20 border border-slate-700 text-slate-300 hover:text-red-400 text-xs font-semibold transition"
                        title="Eliminar elemento"
                      >
                        <Trash2 className="size-3" />
                        <span>Eliminar</span>
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedElement("background");
                          setActiveDockTab("photos");
                          setIsDrawerOpen(true);
                        }}
                        className="flex items-center gap-1.5 px-3 h-7 rounded-md bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold shadow-sm transition"
                        title="Elegir foto de fondo para el lienzo"
                      >
                        <ImageIcon className="size-3.5" />
                        <span>+ Agregar Foto de Fondo</span>
                      </button>
                    </>
                  )}
                </>
              )}

              {/* CONTROLES DE GIRO / ROTACIÓN ESTILO CANVA (PARA CUALQUIER OBJETO ACTIVO) */}
              {selectedElement && selectedElement !== "background" && selectedElement !== "bg-photo" && (
                <>
                  <span className="h-4 w-px bg-slate-700 mx-1" />
                  <div className="flex items-center gap-1 bg-slate-800 rounded-md border border-slate-700 h-7 px-1.5" title="Girar elemento (estilo Canva)">
                    <button
                      type="button"
                      onClick={() => {
                        const curRot = currentSlide.rotations?.[selectedElement!] ?? customElem?.rotation ?? 0;
                        handleRotationChange(selectedElement!, curRot - 90);
                      }}
                      className="p-1 hover:bg-slate-700 text-slate-300 hover:text-white rounded transition"
                      title="Girar -90° (Hacia la izquierda)"
                    >
                      <RotateCcw className="size-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        handleRotationChange(selectedElement!, 0);
                      }}
                      className="px-1 text-[11px] font-mono font-bold text-slate-300 hover:text-white hover:underline min-w-[34px] text-center"
                      title="Restablecer giro a 0°"
                    >
                      {Math.round(currentSlide.rotations?.[selectedElement!] ?? customElem?.rotation ?? 0)}°
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const curRot = currentSlide.rotations?.[selectedElement!] ?? customElem?.rotation ?? 0;
                        handleRotationChange(selectedElement!, curRot + 90);
                      }}
                      className="p-1 hover:bg-slate-700 text-slate-300 hover:text-white rounded transition"
                      title="Girar +90° (Hacia la derecha)"
                    >
                      <RotateCw className="size-3.5" />
                    </button>
                  </div>
                </>
              )}
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
                  canvasZoom,
                  currentSlide,
                  selectedElement,
                  editingElementKey,
                  setEditingElementKey,
                  onSelectElement: setSelectedElement,
                  onOffsetChange: handleOffsetChange,
                  onScaleChange: handleScaleChange,
                  onRotationChange: handleRotationChange,
                  onSizeChange: handleSizeChange,
                  onDeleteElement: handleDeleteElement,
                  onDuplicateElement: handleDuplicateElement,
                  onStyleChange: handleStyleChange,
                }}
              >
                {/* Elemento DOM exacto que se captura con html-to-image */}
                <div
                  ref={slideContainerRef}
                  style={{ fontFamily: selectedFont }}
                  onClick={(e) => {
                    if (e.target === e.currentTarget) {
                      setSelectedElement("background");
                    }
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = "copy";
                    if (!isCanvasDragOver) setIsCanvasDragOver(true);
                  }}
                  onDragLeave={(e) => {
                    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
                    setIsCanvasDragOver(false);
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsCanvasDragOver(false);

                    // 1. Archivos arrastrados directamente desde el ordenador
                    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                      handleFileUpload(e.dataTransfer.files, true);
                      return;
                    }

                    // 2. Plantillas arrastradas desde el dock
                    try {
                      const dataStr = e.dataTransfer.getData("application/json");
                      if (!dataStr) return;
                      const data = JSON.parse(dataStr);
                      if (data.type === "template") {
                        if (data.isCustom) {
                          const found = customTemplates.find((t) => t.id === data.id);
                          if (found) handleApplyCustomTemplate(found);
                        } else {
                          applyOfficialTemplate(data.id);
                        }
                      }
                    } catch (err) {
                      console.warn("Error al aplicar plantilla arrastrada:", err);
                    }
                  }}
                  className={`relative w-full h-full flex flex-col justify-between overflow-hidden select-text transition-colors duration-200 ${
                    selectedTemplate === "blank" && !selectedBgUrl
                      ? "bg-white text-slate-900"
                      : "bg-slate-950 text-white"
                  }`}
                >
                {/* 1. FOTO DE FONDO (Tratada como objeto Canva de primera clase con manijas y herramientas) */}
                {Boolean(selectedBgUrl && selectedBgUrl.trim() !== "") && (
                  <div className="absolute inset-0 z-0 overflow-visible pointer-events-none">
                    <DraggableWrapper
                      id="bg-photo"
                      label="Foto de Fondo"
                      isFreeMode={isFreeMode}
                      offset={currentSlide.offsets?.["bg-photo"]}
                      onOffsetChange={handleOffsetChange}
                      onSizeChange={handleSizeChange}
                      scale={currentSlide.scales?.["bg-photo"] ?? bgScale}
                      onScaleChange={(newScale) => {
                        handleScaleChange("bg-photo", newScale);
                        setBgScale(newScale);
                      }}
                      isExporting={isExporting}
                      isSelected={selectedElement === "background" || selectedElement === "bg-photo"}
                      onSelect={() => setSelectedElement("background")}
                      className="absolute inset-0 w-full h-full pointer-events-auto cursor-grab active:cursor-grabbing"
                    >
                      <div className="w-full h-full relative">
                        <img
                          src={selectedBgUrl || undefined}
                          alt="Background"
                          crossOrigin="anonymous"
                          style={{ transform: `scale(${bgScale})` }}
                          className="w-full h-full object-cover select-none pointer-events-none transition-transform duration-75"
                        />
                        {/* Filtro ambiental sutil (100% transparente y limpio por defecto, sólo si bgDimming > 0) */}
                        {bgDimming > 0 && (
                          <div
                            style={{ backgroundColor: `rgba(2, 6, 23, ${bgDimming / 100})` }}
                            className="absolute inset-0 pointer-events-none transition-colors duration-150"
                          />
                        )}
                      </div>
                    </DraggableWrapper>
                  </div>
                )}



                {/* OVERLAY DE DROPZONE AL ARRASTRAR PLANTILLA ESTILO CANVA */}
                {isCanvasDragOver && (
                  <div className="absolute inset-0 z-50 bg-brand-600/30 border-4 border-dashed border-brand-400 rounded-2xl flex flex-col items-center justify-center p-6 backdrop-blur-xs animate-in fade-in duration-150 pointer-events-none">
                    <div className="size-16 rounded-2xl bg-brand-500 text-white shadow-2xl flex items-center justify-center mb-3 scale-110 animate-bounce">
                      <Sparkles className="size-8" />
                    </div>
                    <p className="text-base font-extrabold text-white drop-shadow-md">
                      Suelta la plantilla aquí
                    </p>
                    <p className="text-xs text-brand-100 font-medium mt-1">
                      Se aplicará instantáneamente a tu diseño
                    </p>
                  </div>
                )}

                {/* WATERMARK / GUÍA DE LIENZO EN BLANCO ESTILO CANVA (Oculto al exportar o tener contenido) */}
                {selectedTemplate === "blank" &&
                  !selectedBgUrl &&
                  (currentSlide.customElements || []).length === 0 &&
                  !currentSlide.title &&
                  !isExporting && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center pointer-events-none select-none">
                      <div className="size-16 rounded-3xl bg-slate-100 border border-slate-200/80 flex items-center justify-center text-slate-400 mb-3.5 shadow-xs">
                        <LayoutGrid className="size-8 text-slate-400" />
                      </div>
                      <h3 className="text-sm font-bold text-slate-800">
                        Lienzo en Blanco
                      </h3>
                      <p className="text-xs text-slate-400 max-w-[240px] mt-1.5 leading-relaxed">
                        Arrastra una plantilla desde la izquierda, haz doble clic, o añade textos y figuras desde los paneles.
                      </p>
                      <div className="flex items-center gap-2 mt-4 text-[11px] text-slate-500 font-medium">
                        <span className="px-2.5 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-600">
                          Arrastrar plantilla
                        </span>
                        <span>o</span>
                        <span className="px-2.5 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-600">
                          Doble clic
                        </span>
                      </div>
                    </div>
                  )}

                {/* 2. RENDERIZADO POR PLANTILLA O TIPO DE LÁMINA */}
                {selectedTemplate !== "blank" && (
                  isCover ? (
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
                            height={
                              currentSlide.dimensions?.["editorial-card"]?.height ??
                              (overlayMode === "fullscreen" ? 485 : aspectRatio === "4:5" ? 300 : 250)
                            }
                            width={currentSlide.dimensions?.["editorial-card"]?.width}
                            onSizeChange={handleSizeChange}
                            scale={currentSlide.scales?.["editorial-card"]}
                            onScaleChange={handleScaleChange}
                            onDelete={handleDeleteElement}
                            onDuplicate={handleDuplicateElement}
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
                              className={`w-full h-full border border-white/15 shadow-2xl backdrop-blur-md ${
                                overlayMode === "fullscreen"
                                  ? "rounded-none"
                                  : "rounded-3xl"
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
                            height={
                              currentSlide.dimensions?.["social-card"]?.height ??
                              (aspectRatio === "4:5" ? 390 : 350)
                            }
                            width={currentSlide.dimensions?.["social-card"]?.width}
                            onSizeChange={handleSizeChange}
                            scale={currentSlide.scales?.["social-card"]}
                            onScaleChange={handleScaleChange}
                            onDelete={handleDeleteElement}
                            onDuplicate={handleDuplicateElement}
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
                              className="w-full h-full rounded-3xl border border-white/15 shadow-2xl backdrop-blur-md"
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
                                  <span className="flex items-center gap-1">
                                    •
                                    <InlineEditableText
                                      elementKey="social-role"
                                      as="span"
                                      value={currentSlide.titlePrefix || "LinkedIn Creator"}
                                      onChange={(val) => updateCurrentSlide({ titlePrefix: val })}
                                      selectedElement={selectedElement}
                                      onSelect={setSelectedElement}
                                      isExporting={isExporting}
                                      placeholder="LinkedIn Creator"
                                    />
                                  </span>
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
                              scale={currentSlide.scales?.["social-stats"]}
                              onScaleChange={handleScaleChange}
                              isSelected={selectedElement === "social-stats"}
                              onSelect={() => setSelectedElement("social-stats")}
                              onDelete={handleDeleteElement}
                              onDuplicate={handleDuplicateElement}
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
                                  <InlineEditableText
                                    elementKey="metric-label"
                                    as="span"
                                    value={currentSlide.metricLabel || "RESULTADO COMPROBADO EN CONVERSIONES"}
                                    onChange={(val) => updateCurrentSlide({ metricLabel: val })}
                                    selectedElement={selectedElement}
                                    onSelect={setSelectedElement}
                                    isExporting={isExporting}
                                    placeholder="RESULTADO COMPROBADO EN CONVERSIONES"
                                  />
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
                                scale={currentSlide.scales?.["bold-logo"]}
                                onScaleChange={handleScaleChange}
                                isSelected={selectedElement === "bold-logo"}
                                onSelect={() => setSelectedElement("bold-logo")}
                                onDelete={handleDeleteElement}
                                onDuplicate={handleDuplicateElement}
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
                              scale={currentSlide.scales?.["bold-footer"]}
                              onScaleChange={handleScaleChange}
                              isSelected={selectedElement === "bold-footer"}
                              onSelect={() => setSelectedElement("bold-footer")}
                              onDelete={handleDeleteElement}
                              onDuplicate={handleDuplicateElement}
                              isExporting={isExporting}
                              className="pointer-events-auto self-end flex items-center gap-2"
                            >
                              <div className="flex items-center gap-2 text-white/80">
                                {editorMode === "carousel" && (
                                  <InlineEditableText
                                    elementKey="bold-swipe"
                                    as="span"
                                    value={currentSlide.swipeText || "Desliza"}
                                    onChange={(val) => updateCurrentSlide({ swipeText: val })}
                                    selectedElement={selectedElement}
                                    onSelect={setSelectedElement}
                                    isExporting={isExporting}
                                    placeholder="Desliza"
                                    className="text-[10px] font-bold uppercase tracking-wider text-white/60"
                                  />
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
                            scale={currentSlide.scales?.["inter-bullets"]}
                            onScaleChange={handleScaleChange}
                            isSelected={selectedElement === "bullets" || selectedElement === "inter-bullets"}
                            onSelect={() => setSelectedElement("bullets")}
                            onDelete={handleDeleteElement}
                            onDuplicate={handleDuplicateElement}
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
                            scale={currentSlide.scales?.["inter-cta"]}
                            onScaleChange={handleScaleChange}
                            isSelected={selectedElement === "cta" || selectedElement === "inter-cta"}
                            onSelect={() => setSelectedElement("cta")}
                            onDelete={handleDeleteElement}
                            onDuplicate={handleDuplicateElement}
                            isExporting={isExporting}
                            className="my-auto p-4 rounded-2xl bg-gradient-to-b from-white/10 to-transparent border border-white/15 text-center space-y-3 pointer-events-auto"
                          >
                            <p className="text-xs text-slate-200 font-medium">
                              <InlineEditableText
                                elementKey="cta-prompt"
                                as="span"
                                value={currentSlide.ctaPrompt || "Comenta abajo para enviarte el activo completo por mensaje directo:"}
                                onChange={(val) => updateCurrentSlide({ ctaPrompt: val })}
                                selectedElement={selectedElement}
                                onSelect={setSelectedElement}
                                isExporting={isExporting}
                                multiline={true}
                                placeholder="Comenta abajo para enviarte el activo completo..."
                              />
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
                )
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
                          : elem.type === "shape_rect"
                          ? "Rectángulo"
                          : elem.type === "shape_circle"
                          ? "Círculo"
                          : elem.type === "shape_star"
                          ? "Estrella"
                          : elem.type === "shape_pill"
                          ? "Píldora"
                          : elem.type === "shape_line"
                          ? "Línea"
                          : "Elemento"
                      }
                      isFreeMode={isFreeMode}
                      offset={currentSlide.offsets?.[elem.id] || { x: elem.x, y: elem.y }}
                      onOffsetChange={handleOffsetChange}
                      scale={currentSlide.scales?.[elem.id] ?? elem.scale ?? 1}
                      onScaleChange={handleScaleChange}
                      width={elem.width}
                      height={elem.height}
                      onSizeChange={handleSizeChange}
                      rotation={currentSlide.rotations?.[elem.id] ?? elem.rotation ?? 0}
                      onRotationChange={handleRotationChange}
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
                        <h2 className={`text-2xl font-black ${selectedTemplate === "blank" && !selectedBgUrl ? "text-slate-900" : "text-white"} tracking-tight leading-tight select-none drop-shadow-md`}>
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
                        <h3 className={`text-lg font-bold ${selectedTemplate === "blank" && !selectedBgUrl ? "text-slate-800" : "text-slate-200"} tracking-tight leading-snug select-none drop-shadow-sm max-w-[340px]`}>
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
                        <p className={`text-sm ${selectedTemplate === "blank" && !selectedBgUrl ? "text-slate-700" : "text-slate-200"} leading-relaxed font-normal select-none drop-shadow-sm max-w-[320px]`}>
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
                            backgroundColor: elem.bgColor || "#ffffff",
                            borderColor: elem.borderColor || "transparent",
                            borderWidth: elem.borderStyle === "none" ? "0px" : `${elem.borderWidth ?? 0}px`,
                            borderStyle: elem.borderStyle === "none" ? "solid" : (elem.borderStyle || "solid"),
                            borderRadius: `${elem.borderRadius ?? 16}px`,
                            opacity: elem.opacity ?? 1,
                          }}
                          className={`shadow-xl transition-all cursor-pointer ${
                            (elem.bgColor?.includes("rgba") || (elem.opacity ?? 1) < 1) ? "backdrop-blur-md" : ""
                          }`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedElement(elem.id);
                          }}
                        />
                      )}

                      {elem.type === "shape_circle" && (
                        <div
                          style={{
                            width: `${elem.width || 90}px`,
                            height: `${elem.height || 90}px`,
                            backgroundColor: elem.bgColor || "#ffffff",
                            borderColor: elem.borderColor || "transparent",
                            borderWidth: elem.borderStyle === "none" ? "0px" : `${elem.borderWidth ?? 0}px`,
                            borderStyle: elem.borderStyle === "none" ? "solid" : (elem.borderStyle || "solid"),
                            borderRadius: "9999px",
                            opacity: elem.opacity ?? 1,
                          }}
                          className={`shadow-xl transition-all cursor-pointer ${
                            (elem.bgColor?.includes("rgba") || (elem.opacity ?? 1) < 1) ? "backdrop-blur-md" : ""
                          }`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedElement(elem.id);
                          }}
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
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedElement(elem.id);
                          }}
                        >
                          <Star
                            style={{
                              color: elem.borderStyle === "none" ? "transparent" : (elem.borderColor || "#f59e0b"),
                              fill: elem.bgColor || "#ffffff",
                              strokeWidth: elem.borderStyle === "none" ? 0 : (elem.borderWidth ?? 2),
                            }}
                            className="size-full drop-shadow-lg"
                          />
                        </div>
                      )}

                      {elem.type === "shape_pill" && (
                        <div
                          style={{
                            width: elem.width ? `${elem.width}px` : undefined,
                            height: elem.height ? `${elem.height}px` : undefined,
                            backgroundColor: elem.bgColor || "#ffffff",
                            borderColor: elem.borderColor || "transparent",
                            borderWidth: elem.borderStyle === "none" ? "0px" : `${elem.borderWidth ?? 0}px`,
                            borderStyle: elem.borderStyle === "none" ? "solid" : (elem.borderStyle || "solid"),
                            borderRadius: `${elem.borderRadius ?? 9999}px`,
                            opacity: elem.opacity ?? 1,
                            color: elem.color || (elem.bgColor === "#ffffff" || !elem.bgColor || elem.bgColor === "#fff" ? "#0f172a" : "#ffffff"),
                          }}
                          className={`px-4 py-1.5 shadow-md flex items-center justify-center select-text cursor-pointer ${
                            (elem.bgColor?.includes("rgba") || (elem.opacity ?? 1) < 1) ? "backdrop-blur-md" : ""
                          }`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedElement(elem.id);
                          }}
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
                            height: `${elem.borderWidth ?? 3}px`,
                            backgroundColor: elem.borderStyle === "none" ? "transparent" : (elem.bgColor || accentColor),
                            borderTop:
                              elem.borderStyle === "dashed"
                                ? `${elem.borderWidth ?? 3}px dashed ${elem.borderColor || accentColor}`
                                : elem.borderStyle === "dotted"
                                ? `${elem.borderWidth ?? 3}px dotted ${elem.borderColor || accentColor}`
                                : "none",
                            opacity: elem.opacity ?? 0.8,
                          }}
                          className="rounded-full shadow-sm transition-all cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedElement(elem.id);
                          }}
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

                      {elem.type === "image" && elem.content && elem.content.trim() !== "" && (
                        <div
                          style={{
                            width: `${elem.width || 180}px`,
                            height: `${elem.height || 180}px`,
                            borderRadius: `${elem.borderRadius ?? 8}px`,
                            opacity: elem.opacity ?? 1,
                          }}
                          className="overflow-hidden shadow-2xl transition-all cursor-pointer relative flex items-center justify-center bg-transparent group/img"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedElement(elem.id);
                          }}
                        >
                          <img
                            src={elem.content || undefined}
                            alt="Uploaded element"
                            className="w-full h-full object-contain pointer-events-none select-none drop-shadow-md"
                          />
                        </div>
                      )}

                      {elem.type === "video" && (
                        <div
                          style={{
                            width: `${elem.width || 240}px`,
                            height: `${elem.height || 160}px`,
                            borderRadius: `${elem.borderRadius ?? 12}px`,
                            opacity: elem.opacity ?? 1,
                          }}
                          className="overflow-hidden shadow-2xl transition-all cursor-pointer relative bg-black flex items-center justify-center border border-white/20"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedElement(elem.id);
                          }}
                        >
                          <video
                            src={elem.content || undefined}
                            autoPlay
                            loop
                            muted
                            playsInline
                            className="w-full h-full object-cover pointer-events-none select-none"
                          />
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

    {/* ============================================================ */}
    {/* MODAL 1: GUARDAR COMO TEMPLATE */}
    {/* ============================================================ */}
    {isSaveModalOpen && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in select-none">
        <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-6 space-y-5 animate-in zoom-in-95">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="size-8 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                <BookmarkPlus className="size-4" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white leading-tight">
                  Guardar como Template
                </h3>
                <p className="text-xs text-slate-400">
                  Crea una plantilla reutilizable en tu biblioteca
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsSaveModalOpen(false)}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <X className="size-5" />
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                Nombre de la Plantilla <span className="text-amber-400">*</span>
              </label>
              <input
                type="text"
                value={saveForm.name}
                onChange={(e) => setSaveForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="Ej. Pitch B2B Minimalista, Carrusel High-Ticket"
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-amber-400 transition"
                autoFocus
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                Categoría
              </label>
              <div className="flex items-center gap-1.5 flex-wrap mb-2">
                {["B2B", "Citas", "Métricas", "Lead Magnet", "Educativo", "Oferta"].map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSaveForm((prev) => ({ ...prev, category: cat }))}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition ${
                      saveForm.category === cat
                        ? "bg-amber-500 text-black border-amber-400 font-bold"
                        : "bg-slate-800 text-slate-300 border-slate-700 hover:border-slate-600"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                Descripción (opcional)
              </label>
              <input
                type="text"
                value={saveForm.desc}
                onChange={(e) => setSaveForm((prev) => ({ ...prev, desc: e.target.value }))}
                placeholder="Ej. Ideal para carruseles de métricas de crecimiento"
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:border-amber-400 transition"
              />
            </div>

            {/* Resumen de elementos a guardar */}
            <div className="p-3 rounded-xl bg-slate-850 border border-slate-800 text-xs text-slate-400 space-y-1.5">
              <span className="font-bold text-slate-300 block text-[11px] uppercase tracking-wider">
                Resumen del diseño a guardar:
              </span>
              <div className="flex items-center gap-2 flex-wrap text-[11px]">
                <span className="bg-slate-800 px-2 py-0.5 rounded border border-slate-700 text-slate-200">
                  Formato: {aspectRatio}
                </span>
                <span className="bg-slate-800 px-2 py-0.5 rounded border border-slate-700 text-slate-200">
                  {slides.length} {slides.length === 1 ? "lámina" : "láminas"}
                </span>
                <span className="bg-slate-800 px-2 py-0.5 rounded border border-slate-700 text-slate-200 capitalize">
                  Base: {selectedTemplate.replace("_", " ")}
                </span>
              </div>
            </div>

            {/* Opción si ya había una plantilla activa */}
            {activeCustomTemplateId && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 space-y-2">
                <span className="text-xs font-bold text-amber-300 block">
                  Ya estabas trabajando sobre una plantilla existente:
                </span>
                <div className="space-y-1.5 text-xs text-slate-300">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="saveMode"
                      checked={!saveForm.saveAsNew}
                      onChange={() => setSaveForm((prev) => ({ ...prev, saveAsNew: false }))}
                      className="accent-amber-400"
                    />
                    <span>Actualizar plantilla actual ("{customTemplates.find(t => t.id === activeCustomTemplateId)?.name || 'Activa'}")</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="saveMode"
                      checked={saveForm.saveAsNew}
                      onChange={() => setSaveForm((prev) => ({ ...prev, saveAsNew: true }))}
                      className="accent-amber-400"
                    />
                    <span>Guardar como una NUEVA plantilla independiente</span>
                  </label>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsSaveModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={!saveForm.name.trim()}
              onClick={handleConfirmSaveTemplate}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:brightness-110 text-black text-xs font-extrabold shadow-md transition disabled:opacity-50"
            >
              Guardar en Biblioteca
            </button>
          </div>
        </div>
      </div>
    )}

    {/* ============================================================ */}
    {/* MODAL 2: EDITAR METADATOS O ACTUALIZAR PLANTILLA */}
    {/* ============================================================ */}
    {editingTemplate && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in select-none">
        <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-6 space-y-5 animate-in zoom-in-95">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="size-8 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-200">
                <Pencil className="size-4" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white leading-tight">
                  Editar Plantilla
                </h3>
                <p className="text-xs text-slate-400">
                  Modifica el nombre o actualiza el diseño visual
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setEditingTemplate(null)}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <X className="size-5" />
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                Nombre de la Plantilla <span className="text-amber-400">*</span>
              </label>
              <input
                type="text"
                value={editMetaForm.name}
                onChange={(e) => setEditMetaForm((prev) => ({ ...prev, name: e.target.value }))}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-amber-400 transition"
                autoFocus
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                Categoría
              </label>
              <input
                type="text"
                value={editMetaForm.category}
                onChange={(e) => setEditMetaForm((prev) => ({ ...prev, category: e.target.value }))}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:border-amber-400 transition"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                Descripción
              </label>
              <input
                type="text"
                value={editMetaForm.desc}
                onChange={(e) => setEditMetaForm((prev) => ({ ...prev, desc: e.target.value }))}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:border-amber-400 transition"
              />
            </div>

            <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700 text-xs space-y-1.5">
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editMetaForm.overwriteWithCurrentCanvas}
                  onChange={(e) => setEditMetaForm((prev) => ({ ...prev, overwriteWithCurrentCanvas: e.target.checked }))}
                  className="mt-0.5 accent-amber-400 rounded"
                />
                <span className="text-slate-300 leading-tight">
                  <strong className="text-white block font-semibold mb-0.5">Sobrescribir también diseño visual</strong>
                  Reemplazar las láminas y figuras de esta plantilla con el diseño actual del lienzo.
                </span>
              </label>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setEditingTemplate(null)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={!editMetaForm.name.trim()}
              onClick={handleConfirmEditMeta}
              className="px-5 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold shadow-md transition disabled:opacity-50"
            >
              Guardar Cambios
            </button>
          </div>
        </div>
      </div>
    )}

    {/* ============================================================ */}
    {/* MODAL 3: CONFIRMACIÓN PARA ELIMINAR PLANTILLA */}
    {/* ============================================================ */}
    {templateToDelete && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in select-none">
        <div className="w-full max-w-sm bg-slate-900 border border-red-500/40 rounded-2xl shadow-2xl p-6 space-y-4 animate-in zoom-in-95">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-xl bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-400 shrink-0">
              <Trash2 className="size-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">¿Eliminar Plantilla?</h3>
              <p className="text-xs text-slate-400">Esta acción no se puede revertir</p>
            </div>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed">
            Se eliminará definitivamente la plantilla <strong className="text-white font-bold">"{templateToDelete.name}"</strong> de tu biblioteca de templates.
          </p>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setTemplateToDelete(null)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleConfirmDeleteTemplate}
              className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition shadow-md"
            >
              Eliminar Plantilla
            </button>
          </div>
        </div>
      </div>
    )}
  </div>
  );
}
