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
  RefreshCw,
  Upload,
  User,
  Plus,
  Trash2,
  Copy,
  Bold,
  Italic,
  Underline,
  AlignLeft,
  AlignCenter,
  AlignRight,
  ArrowUp,
  ArrowDown,
  Highlighter,
  Sliders,
  Search,
  Bot
} from "lucide-react";
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
  canvasData?: any;
  thumbnailData?: string;
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

// Tipografías modernas disponibles en el editor estilo Canva
const AVAILABLE_FONTS = [
  { name: "Outfit", label: "Outfit (Moderna B2B)" },
  { name: "Inter", label: "Inter (Tech Minimalista)" },
  { name: "Montserrat", label: "Montserrat (Impacto Bold)" },
  { name: "Playfair Display", label: "Playfair (Elegante Editorial)" },
  { name: "Bebas Neue", label: "Bebas Neue (Titular Gigante)" },
  { name: "Georgia", label: "Georgia (Cita Clásica)" },
];

// Interfaz de foto curada con etiquetas de búsqueda
export interface UnsplashPhotoItem {
  id: string;
  name: string;
  tags: string[];
  thumb: string;
  url: string;
}

// Catálogo ampliado y categorizado de fotos de alta resolución de Unsplash
const CURATED_BACKGROUNDS: UnsplashPhotoItem[] = [
  // Oficina & Juntas
  {
    id: "executive_office",
    name: "Oficina Ejecutiva",
    tags: ["oficina", "oficinas", "reunion", "reunión", "boardroom", "corporativo", "ejecutivo", "moderno"],
    thumb: "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=400&q=70",
    url: "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1200&q=85",
  },
  {
    id: "glass_meeting_room",
    name: "Sala de Juntas de Cristal",
    tags: ["oficina", "sala", "cristal", "reunion", "reunión", "equipo", "estrategia"],
    thumb: "https://images.unsplash.com/photo-1497215728101-856f4ea42174?auto=format&fit=crop&w=400&q=70",
    url: "https://images.unsplash.com/photo-1497215728101-856f4ea42174?auto=format&fit=crop&w=1200&q=85",
  },
  {
    id: "dark_modern_lounge",
    name: "Lounge Corporativo Dark",
    tags: ["oficina", "lounge", "dark", "elegante", "lujo", "arquitectura"],
    thumb: "https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&w=400&q=70",
    url: "https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&w=1200&q=85",
  },
  // Laptops, Datos & Dashboards
  {
    id: "tech_desk",
    name: "Setup Tecnológico Pro",
    tags: ["laptop", "computadora", "tech", "datos", "escritorio", "pantallas"],
    thumb: "https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=400&q=70",
    url: "https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=1200&q=85",
  },
  {
    id: "analytics_charts",
    name: "Gráficos & Crecimiento",
    tags: ["datos", "charts", "analytics", "graficos", "ventas", "crecimiento", "metricas", "métricas", "saas"],
    thumb: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=400&q=70",
    url: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1200&q=85",
  },
  {
    id: "coding_screens",
    name: "Pantallas de Código & IA",
    tags: ["tech", "ia", "codigo", "código", "desarrollo", "software", "pantallas", "futuro"],
    thumb: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=400&q=70",
    url: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=1200&q=85",
  },
  // Ciudad, Rascacielos & Arquitectura
  {
    id: "architecture_clean",
    name: "Rascacielos & Vidrio",
    tags: ["ciudad", "rascacielos", "edificios", "arquitectura", "finanzas", "b2b", "moderno"],
    thumb: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=400&q=70",
    url: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1200&q=85",
  },
  {
    id: "skyline_night",
    name: "Skyline Nocturno",
    tags: ["ciudad", "noche", "skyline", "luces", "rascacielos", "metropolis", "vision"],
    thumb: "https://images.unsplash.com/photo-1514565131-fce0801e5785?auto=format&fit=crop&w=400&q=70",
    url: "https://images.unsplash.com/photo-1514565131-fce0801e5785?auto=format&fit=crop&w=1200&q=85",
  },
  {
    id: "urban_minimal_geometric",
    name: "Geometría Urbana",
    tags: ["ciudad", "arquitectura", "minimal", "concreto", "lineas", "diseño"],
    thumb: "https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=400&q=70",
    url: "https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1200&q=85",
  },
  // Gradientes, 3D & Dark Luxury
  {
    id: "dark_gradient_ambient",
    name: "Gradiente Corporativo Azul",
    tags: ["gradiente", "degradé", "dark", "azul", "abstracto", "fondo", "minimalista"],
    thumb: "https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&w=400&q=70",
    url: "https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&w=1200&q=85",
  },
  {
    id: "abstract_3d",
    name: "Ondas 3D Noir",
    tags: ["3d", "abstracto", "ondas", "oscuro", "noir", "textura", "futuro"],
    thumb: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=400&q=70",
    url: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=85",
  },
  {
    id: "cyber_neon_dark",
    name: "Ambiente Cyber Dark",
    tags: ["cyber", "neon", "oscuro", "tecnologia", "tecnología", "redes", "abstracto"],
    thumb: "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=400&q=70",
    url: "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=1200&q=85",
  },
  // Equipo & Negociación B2B
  {
    id: "team_brainstorm",
    name: "Equipo en Sesión Estratégica",
    tags: ["equipo", "brainstorm", "personas", "reunion", "reunión", "startup", "estrategia", "colaboracion"],
    thumb: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=400&q=70",
    url: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1200&q=85",
  },
  {
    id: "handshake_deal",
    name: "Cierre de Negocios",
    tags: ["ventas", "negocio", "acuerdo", "cierre", "partnership", "confianza", "b2b"],
    thumb: "https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=400&q=70",
    url: "https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=1200&q=85",
  },
  {
    id: "workspace_coffee",
    name: "Espacio Creativo & Café",
    tags: ["cafe", "café", "escritorio", "minimal", "laptop", "libreta", "mañana", "trabajo"],
    thumb: "https://images.unsplash.com/photo-1499750310107-5fef28a66643?auto=format&fit=crop&w=400&q=70",
    url: "https://images.unsplash.com/photo-1499750310107-5fef28a66643?auto=format&fit=crop&w=1200&q=85",
  },
  {
    id: "conference_stage",
    name: "Escenario de Conferencia",
    tags: ["conferencia", "evento", "autoridad", "orador", "escenario", "liderazgo"],
    thumb: "https://images.unsplash.com/photo-1475721027785-f74eccf877e2?auto=format&fit=crop&w=400&q=70",
    url: "https://images.unsplash.com/photo-1475721027785-f74eccf877e2?auto=format&fit=crop&w=1200&q=85",
  },
];

// Colores de acento recomendados para LinkedIn
const BRAND_COLORS = [
  { name: "InHubFlow Cyan", hex: "#0099ff" },
  { name: "Indigo Tech", hex: "#6366f1" },
  { name: "Esmeralda B2B", hex: "#10b981" },
  { name: "Ámbar Viral", hex: "#f59e0b" },
  { name: "Fucsia Creator", hex: "#ec4899" },
  { name: "Blanco Puro", hex: "#ffffff" },
];

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
  const canvasElRef = useRef<HTMLCanvasElement | null>(null);
  const fabricCanvasRef = useRef<any>(null);

  // Modo del editor: Imagen Única vs Carrusel
  const [editorMode, setEditorMode] = useState<EditorMode>("carousel");
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateId>("editorial");
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>("4:5");
  const [selectedBgUrl, setSelectedBgUrl] = useState<string>(CURATED_BACKGROUNDS[0].url);
  const [accentColor, setAccentColor] = useState("#0099ff");
  const [overlayOpacity, setOverlayOpacity] = useState(0.75);
  const [activeTab, setActiveTab] = useState<"templates" | "content" | "backgrounds" | "brand">("templates");

  // Buscador de Fotos de Unsplash en Vivo (Feature #4)
  const [photoSearchQuery, setPhotoSearchQuery] = useState("");
  const [activePhotoTag, setActivePhotoTag] = useState("all");

  const filteredPhotos = CURATED_BACKGROUNDS.filter((photo) => {
    const matchesTag = activePhotoTag === "all" || photo.tags.includes(activePhotoTag);
    const query = photoSearchQuery.toLowerCase().trim();
    const matchesQuery =
      !query ||
      photo.name.toLowerCase().includes(query) ||
      photo.tags.some((t) => t.toLowerCase().includes(query));
    return matchesTag && matchesQuery;
  });

  // Diapositivas del Carrusel (Punto 3: Navegador Multidiapositiva)
  const [slides, setSlides] = useState<CarouselSlideItem[]>([
    {
      id: "slide-1",
      slideNumber: 1,
      type: "cover",
      label: "Portada",
      title: initialTitle,
      subtitle: initialSubtitle,
      tag: initialCategory,
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

  // Estado del objeto seleccionado en el lienzo (Punto 2: Barra Flotante Contextual)
  const [selectedObjectInfo, setSelectedObjectInfo] = useState<{
    isText: boolean;
    fontFamily: string;
    fontSize: number;
    fontWeight: string;
    fontStyle: string;
    textAlign: string;
    fill: string;
    underline: boolean;
    hasHighlight: boolean;
  } | null>(null);

  // Estados de autor y render
  const [nameText, setNameText] = useState(authorName);
  const [handleText, setHandleText] = useState(authorHandle);
  const [isRendering, setIsRendering] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  // Sincronizar props entrantes
  useEffect(() => {
    if (initialTitle) {
      setSlides((prev) => {
        const next = [...prev];
        next[0].title = initialTitle;
        if (initialSubtitle) next[0].subtitle = initialSubtitle;
        if (initialCategory) next[0].tag = initialCategory;
        return next;
      });
    }
    if (authorName) setNameText(authorName);
    if (authorHandle) setHandleText(authorHandle);
  }, [initialTitle, initialSubtitle, initialCategory, authorName, authorHandle]);

  // Dimensiones nativas de alta resolución
  const canvasWidth = 1080;
  const canvasHeight = aspectRatio === "4:5" ? 1350 : 1080;

  // Escuchar selecciones en Fabric.js para activar la Barra Flotante Contextual (Punto 2)
  const bindCanvasEvents = useCallback((canvas: any) => {
    const handleSelection = () => {
      const active = canvas.getActiveObject();
      if (!active) {
        setSelectedObjectInfo(null);
        return;
      }

      const isText = active.type === "textbox" || active.type === "i-text" || active.text !== undefined;
      if (isText) {
        setSelectedObjectInfo({
          isText: true,
          fontFamily: active.fontFamily || "Outfit",
          fontSize: Math.round(active.fontSize || 40),
          fontWeight: active.fontWeight || "normal",
          fontStyle: active.fontStyle || "normal",
          textAlign: active.textAlign || "left",
          fill: typeof active.fill === "string" ? active.fill : "#ffffff",
          underline: Boolean(active.underline),
          hasHighlight: Boolean(active.backgroundColor && active.backgroundColor !== ""),
        });
      } else {
        setSelectedObjectInfo({
          isText: false,
          fontFamily: "",
          fontSize: 0,
          fontWeight: "normal",
          fontStyle: "normal",
          textAlign: "left",
          fill: typeof active.fill === "string" ? active.fill : "#ffffff",
          underline: false,
          hasHighlight: false,
        });
      }
    };

    canvas.on("selection:created", handleSelection);
    canvas.on("selection:updated", handleSelection);
    canvas.on("selection:cleared", () => setSelectedObjectInfo(null));
  }, []);

  // Inicializar Canvas
  useEffect(() => {
    if (!isOpen || !canvasElRef.current) return;

    let isMounted = true;

    import("fabric").then((fabric) => {
      if (!isMounted || !canvasElRef.current) return;

      if (fabricCanvasRef.current) {
        try {
          fabricCanvasRef.current.dispose();
        } catch {}
      }

      const canvas = new fabric.Canvas(canvasElRef.current, {
        width: canvasWidth,
        height: canvasHeight,
        selection: true,
        preserveObjectStacking: true,
        backgroundColor: "#090d16",
      });

      fabricCanvasRef.current = canvas;
      bindCanvasEvents(canvas);

      renderSlideOnCanvas(slides[currentSlideIndex], canvas, fabric);
    });

    return () => {
      isMounted = false;
      if (fabricCanvasRef.current) {
        try {
          fabricCanvasRef.current.dispose();
          fabricCanvasRef.current = null;
        } catch {}
      }
    };
  }, [isOpen, aspectRatio]);

  // Renderizar una diapositiva en el lienzo de Fabric.js
  const renderSlideOnCanvas = useCallback(
    async (slideItem: CarouselSlideItem, canvasInstance?: any, fabricModule?: any) => {
      const canvas = canvasInstance || fabricCanvasRef.current;
      if (!canvas) return;

      const fabric = fabricModule || (await import("fabric"));
      setIsRendering(true);

      canvas.clear();
      canvas.backgroundColor = "#090d16";

      const currentW = canvas.width || canvasWidth;
      const currentH = canvas.height || canvasHeight;

      try {
        // 1. CARGA DE FONDO (FOTO DE STOCK)
        try {
          const img = await fabric.FabricImage.fromURL(selectedBgUrl, {
            crossOrigin: "anonymous",
          });
          const imgW = img.width || 1;
          const imgH = img.height || 1;
          const scale = Math.max(currentW / imgW, currentH / imgH);

          img.set({
            scaleX: scale,
            scaleY: scale,
            originX: "center",
            originY: "center",
            left: currentW / 2,
            top: currentH / 2,
            selectable: false,
            evented: false,
          });
          canvas.add(img);
        } catch (err) {
          console.warn("Fondo fallback:", err);
        }

        // 2. CAPA DEGRADÉ DE ALTO CONTRASTE (Para lectura perfecta)
        const gradientRect = new fabric.Rect({
          left: 0,
          top: 0,
          width: currentW,
          height: currentH,
          selectable: false,
          evented: false,
          fill: new fabric.Gradient({
            type: "linear",
            coords: { x1: 0, y1: 0, x2: 0, y2: currentH },
            colorStops: [
              { offset: 0, color: "rgba(5, 10, 20, 0.3)" },
              { offset: 0.45, color: `rgba(5, 10, 20, ${overlayOpacity * 0.75})` },
              { offset: 0.85, color: `rgba(5, 10, 20, ${overlayOpacity})` },
              { offset: 1, color: `rgba(5, 10, 20, ${Math.min(1, overlayOpacity + 0.15)})` },
            ],
          }),
        });
        canvas.add(gradientRect);

        // 3. RENDER SEGÚN EL TIPO DE DIAPOSITIVA (Portada, Desarrollo, o CTA)
        if (slideItem.type === "cover") {
          // --- PORTADA VIRAL ---
          // Badge Superior de Categoría
          const tagBg = new fabric.Rect({
            left: 70,
            top: currentH - 580,
            rx: 8,
            ry: 8,
            fill: accentColor,
            width: Math.min((slideItem.tag || "B2B").length * 14 + 32, 450),
            height: 38,
            selectable: true,
          });
          const tagText = new fabric.Textbox((slideItem.tag || "B2B").toUpperCase(), {
            left: 86,
            top: currentH - 572,
            fontSize: 18,
            fontWeight: "bold",
            fill: accentColor === "#ffffff" ? "#000000" : "#ffffff",
            fontFamily: "Inter, sans-serif",
            selectable: true,
          });
          canvas.add(tagBg, tagText);

          // Gran Titular Gancho
          const titleObj = new fabric.Textbox(slideItem.title, {
            left: 70,
            top: currentH - 510,
            width: currentW - 140,
            fontSize: 54,
            lineHeight: 1.15,
            fontWeight: "bold",
            fill: "#ffffff",
            fontFamily: "Outfit, sans-serif",
            shadow: new fabric.Shadow({
              color: "rgba(0,0,0,0.85)",
              blur: 20,
              offsetX: 0,
              offsetY: 6,
            }),
          });
          canvas.add(titleObj);

          // Subtítulo
          const subObj = new fabric.Textbox(slideItem.subtitle, {
            left: 70,
            top: currentH - 260,
            width: currentW - 140,
            fontSize: 26,
            lineHeight: 1.35,
            fill: "rgba(226, 232, 240, 0.95)",
            fontFamily: "Inter, sans-serif",
          });
          canvas.add(subObj);

          // Insignia "DESLIZA ➔" (Badge de Carrusel)
          if (editorMode === "carousel") {
            const swipeBadge = new fabric.Rect({
              left: currentW - 250,
              top: currentH - 120,
              width: 180,
              height: 42,
              rx: 21,
              ry: 21,
              fill: "rgba(255, 255, 255, 0.12)",
              stroke: accentColor,
              strokeWidth: 1.5,
              selectable: true,
            });
            const swipeText = new fabric.Textbox("DESLIZA  ➔", {
              left: currentW - 225,
              top: currentH - 110,
              fontSize: 18,
              fontWeight: "bold",
              fill: accentColor,
              fontFamily: "Inter, sans-serif",
              selectable: true,
            });
            canvas.add(swipeBadge, swipeText);
          }
        } else if (slideItem.type === "problem" || slideItem.type === "solution") {
          // --- LÁMINA INTERMEDIA CON PUNTOS ACCIONABLES ---
          // Tag de Paso
          const stepTag = new fabric.Textbox((slideItem.tag || "PASO ACCIONABLE").toUpperCase(), {
            left: 70,
            top: 100,
            fontSize: 20,
            fontWeight: "bold",
            fill: accentColor,
            fontFamily: "Inter, sans-serif",
          });
          canvas.add(stepTag);

          // Titular de la Diapositiva
          const slideTitle = new fabric.Textbox(slideItem.title, {
            left: 70,
            top: 150,
            width: currentW - 140,
            fontSize: 48,
            lineHeight: 1.2,
            fontWeight: "bold",
            fill: "#ffffff",
            fontFamily: "Outfit, sans-serif",
          });
          canvas.add(slideTitle);

          // Contenedor / Tarjeta de Puntos Clave
          const cardY = 320;
          const cardH = currentH - 460;
          const contentCard = new fabric.Rect({
            left: 70,
            top: cardY,
            width: currentW - 140,
            height: cardH,
            rx: 20,
            ry: 20,
            fill: "rgba(15, 23, 42, 0.75)",
            stroke: "rgba(255, 255, 255, 0.12)",
            strokeWidth: 1.5,
          });
          canvas.add(contentCard);

          // Lista de Bullets
          const bullets = slideItem.bullets || ["Punto clave número 1", "Punto clave número 2", "Punto clave número 3"];
          let bulletY = cardY + 40;
          bullets.forEach((bText, idx) => {
            const numCircle = new fabric.Rect({
              left: 105,
              top: bulletY,
              width: 36,
              height: 36,
              rx: 18,
              ry: 18,
              fill: accentColor,
            });
            const numText = new fabric.Textbox(String(idx + 1), {
              left: 118,
              top: bulletY + 6,
              fontSize: 20,
              fontWeight: "bold",
              fill: accentColor === "#ffffff" ? "#000000" : "#ffffff",
              fontFamily: "Inter, sans-serif",
              selectable: false,
            });
            const bulletBody = new fabric.Textbox(bText, {
              left: 160,
              top: bulletY + 2,
              width: currentW - 320,
              fontSize: 26,
              lineHeight: 1.35,
              fill: "#f8fafc",
              fontFamily: "Inter, sans-serif",
            });
            canvas.add(numCircle, numText, bulletBody);
            bulletY += 115;
          });
        } else if (slideItem.type === "cta") {
          // --- LÁMINA FINAL DE LLAMADA A LA ACCIÓN (CTA) ---
          const ctaCardW = currentW - 140;
          const ctaCardH = currentH - 300;
          const ctaCard = new fabric.Rect({
            left: 70,
            top: 150,
            width: ctaCardW,
            height: ctaCardH,
            rx: 24,
            ry: 24,
            fill: "rgba(10, 15, 26, 0.85)",
            stroke: accentColor,
            strokeWidth: 2,
          });
          canvas.add(ctaCard);

          const ctaTag = new fabric.Textbox("LLAMADA A LA ACCIÓN", {
            left: 110,
            top: 200,
            fontSize: 20,
            fontWeight: "bold",
            fill: accentColor,
            fontFamily: "Inter, sans-serif",
          });

          const ctaTitle = new fabric.Textbox(slideItem.title, {
            left: 110,
            top: 250,
            width: ctaCardW - 80,
            fontSize: 48,
            lineHeight: 1.2,
            fontWeight: "bold",
            fill: "#ffffff",
            fontFamily: "Outfit, sans-serif",
          });

          const ctaSub = new fabric.Textbox(slideItem.subtitle, {
            left: 110,
            top: 400,
            width: ctaCardW - 80,
            fontSize: 28,
            lineHeight: 1.4,
            fill: "rgba(226, 232, 240, 0.95)",
            fontFamily: "Inter, sans-serif",
          });

          // Caja de la Palabra Clave
          const keywordBox = new fabric.Rect({
            left: 110,
            top: currentH - 450,
            width: ctaCardW - 80,
            height: 90,
            rx: 16,
            ry: 16,
            fill: accentColor,
          });
          const keywordText = new fabric.Textbox(
            `Comenta "${slideItem.ctaKeyword || "SISTEMA"}" abajo`,
            {
              left: 140,
              top: currentH - 425,
              width: ctaCardW - 140,
              fontSize: 32,
              textAlign: "center",
              fontWeight: "900",
              fill: accentColor === "#ffffff" ? "#000000" : "#ffffff",
              fontFamily: "Outfit, sans-serif",
            }
          );
          canvas.add(ctaCard, ctaTag, ctaTitle, ctaSub, keywordBox, keywordText);
        }

        // 4. PIE DE AUTOR COMÚN (En todas las láminas)
        const authorLine = new fabric.Rect({
          left: 70,
          top: currentH - 75,
          width: currentW - 140,
          height: 1.5,
          fill: "rgba(255, 255, 255, 0.15)",
          selectable: false,
        });
        const authorFooterName = new fabric.Textbox(nameText, {
          left: 70,
          top: currentH - 60,
          fontSize: 20,
          fontWeight: "bold",
          fill: "#ffffff",
          fontFamily: "Inter, sans-serif",
        });
        const authorFooterHandle = new fabric.Textbox(handleText, {
          left: currentW - 280,
          top: currentH - 60,
          fontSize: 18,
          fill: accentColor,
          fontFamily: "Inter, sans-serif",
        });
        canvas.add(authorLine, authorFooterName, authorFooterHandle);

        canvas.renderAll();
      } catch (err) {
        console.error("Error al renderizar lámina en Fabric:", err);
      } finally {
        setIsRendering(false);
      }
    },
    [selectedBgUrl, overlayOpacity, accentColor, nameText, handleText, canvasWidth, canvasHeight, editorMode]
  );

  // Manejar cambio de lámina en la tira inferior (Punto 3)
  const handleSelectSlide = async (index: number) => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || index === currentSlideIndex) return;

    // Guardar estado de la lámina actual
    try {
      const updatedSlides = [...slides];
      updatedSlides[currentSlideIndex].canvasData = canvas.toJSON();
      updatedSlides[currentSlideIndex].thumbnailData = canvas.toDataURL({
        format: "png",
        multiplier: 0.25,
      });
      setSlides(updatedSlides);
    } catch (e) {
      console.warn("No se pudo cachear estado de la lámina", e);
    }

    setCurrentSlideIndex(index);

    // Cargar o generar la nueva lámina
    const targetSlide = slides[index];
    if (targetSlide.canvasData) {
      canvas.loadFromJSON(targetSlide.canvasData).then(() => {
        canvas.renderAll();
      });
    } else {
      renderSlideOnCanvas(targetSlide);
    }
  };

  // Añadir nueva lámina al carrusel
  const handleAddSlide = () => {
    const newSlideNum = slides.length + 1;
    const newSlide: CarouselSlideItem = {
      id: `slide-${Date.now()}`,
      slideNumber: newSlideNum,
      type: "solution",
      label: `Paso ${newSlideNum - 1}`,
      title: `Paso ${newSlideNum - 1}: Estrategia Accionable`,
      subtitle: "Detalla aquí la recomendación clave",
      tag: `PASO 0${newSlideNum - 1} / IMPLEMENTACIÓN`,
      bullets: [
        "Aplica esta acción de inmediato en tu proceso comercial.",
        "Mide la tasa de apertura y respuesta cada semana.",
      ],
    };

    const updated = [...slides, newSlide];
    setSlides(updated);
    handleSelectSlide(updated.length - 1);
  };

  // Eliminar lámina
  const handleDeleteSlide = (indexToDelete: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (slides.length <= 1) return;

    const filtered = slides.filter((_, idx) => idx !== indexToDelete);
    setSlides(filtered);
    const nextIdx = Math.max(0, indexToDelete - 1);
    setCurrentSlideIndex(nextIdx);
    renderSlideOnCanvas(filtered[nextIdx]);
  };

  // --- CONTROLES DE LA BARRA FLOTANTE CONTEXTUAL (Punto 2) ---
  const applyTextProperty = (property: string, value: any) => {
    const canvas = fabricCanvasRef.current;
    const active = canvas?.getActiveObject();
    if (!active) return;

    active.set({ [property]: value });
    canvas.requestRenderAll();

    setSelectedObjectInfo((prev: any) => (prev ? { ...prev, [property]: value } : null));
  };

  const handleDuplicateSelected = () => {
    const canvas = fabricCanvasRef.current;
    const active = canvas?.getActiveObject();
    if (!active) return;

    active.clone().then((cloned: any) => {
      cloned.set({
        left: (active.left || 0) + 30,
        top: (active.top || 0) + 30,
      });
      canvas.add(cloned);
      canvas.setActiveObject(cloned);
      canvas.requestRenderAll();
    });
  };

  const handleDeleteSelected = () => {
    const canvas = fabricCanvasRef.current;
    const active = canvas?.getActiveObject();
    if (!active) return;

    canvas.remove(active);
    canvas.discardActiveObject();
    canvas.requestRenderAll();
    setSelectedObjectInfo(null);
  };

  const handleBringForward = () => {
    const canvas = fabricCanvasRef.current;
    const active = canvas?.getActiveObject();
    if (active) {
      canvas.bringObjectToFront(active);
      canvas.requestRenderAll();
    }
  };

  const handleSendBackward = () => {
    const canvas = fabricCanvasRef.current;
    const active = canvas?.getActiveObject();
    if (active) {
      canvas.sendObjectToBack(active);
      canvas.requestRenderAll();
    }
  };

  // Exportar PNG de la lámina actual
  const handleDownloadPng = () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    const dataUrl = canvas.toDataURL({ format: "png", multiplier: 1 });
    const link = document.createElement("a");
    link.download = `InHubFlow_Lamina_${currentSlideIndex + 1}_${Date.now()}.png`;
    link.href = dataUrl;
    link.click();
  };

  // Exportar Carrusel PDF multipágina completo (Punto 3)
  const handleExportFullPdfCarousel = async () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    setIsExportingPdf(true);

    try {
      // Dimensiones en mm (200x200 para 1:1, o 160x200 para 4:5 vertical)
      const isPortrait = aspectRatio === "4:5";
      const docW = isPortrait ? 160 : 200;
      const docH = 200;

      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: [docW, docH],
      });

      // Capturar la diapositiva actual en memoria
      const currentSnap = canvas.toDataURL({ format: "png", multiplier: 1 });
      const renderedSnaps: string[] = [];

      for (let i = 0; i < slides.length; i++) {
        if (i === currentSlideIndex) {
          renderedSnaps.push(currentSnap);
        } else if (slides[i].canvasData) {
          await canvas.loadFromJSON(slides[i].canvasData);
          canvas.renderAll();
          renderedSnaps.push(canvas.toDataURL({ format: "png", multiplier: 1 }));
        } else {
          await renderSlideOnCanvas(slides[i]);
          renderedSnaps.push(canvas.toDataURL({ format: "png", multiplier: 1 }));
        }
      }

      // Reconstruir el PDF con cada página
      renderedSnaps.forEach((dataUrl, idx) => {
        if (idx > 0) doc.addPage([docW, docH]);
        doc.addImage(dataUrl, "PNG", 0, 0, docW, docH);
      });

      doc.save(`InHubFlow_Carrusel_LinkedIn_${slides.length}_Paginas.pdf`);

      // Restaurar la lámina en la que estábamos
      renderSlideOnCanvas(slides[currentSlideIndex]);
    } catch (err) {
      console.error("Error al exportar carrusel PDF:", err);
    } finally {
      setIsExportingPdf(false);
    }
  };

  // Aplicar diseño a la publicación
  const handleApplyToPost = () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    const dataUrl = canvas.toDataURL({ format: "png", multiplier: 1 });
    if (onApplyImage) {
      onApplyImage(dataUrl);
    }
    onClose();
  };

  // Subir imagen local
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-2 sm:p-4 overflow-hidden">
      {/* Cargar Tipografías Google Fonts para el Lienzo */}
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Inter:wght@400;600;800&family=Montserrat:wght@400;700;900&family=Outfit:wght@400;600;800;900&family=Playfair+Display:ital,wght@0,600;1,600&display=swap"
      />

      <div className="relative flex flex-col w-full max-w-[1520px] h-[95vh] rounded-2xl bg-gray-900 border border-gray-800 shadow-2xl overflow-hidden">
        {/* BARRA SUPERIOR (HEADER ESTILO CANVA) */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-800 bg-gray-950/90">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-xl bg-brand-500/20 text-brand-400 border border-brand-500/30">
              <Sparkles className="size-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-white">Estudio Gráfico InHubFlow</h2>
                <span className="rounded-full bg-brand-500/10 border border-brand-500/20 px-2 py-0.5 text-[10px] font-semibold text-brand-400 uppercase">
                  Canva Pro Engine
                </span>
              </div>
              <p className="text-[11px] text-gray-400">
                {editorMode === "carousel"
                  ? `Carrusel Activo (${slides.length} láminas) • Listo para exportar a PDF`
                  : "Imagen Individual de Alto Impacto para LinkedIn"}
              </p>
            </div>
          </div>

          {/* Selector de Modo: Imagen Única vs Carrusel */}
          <div className="flex items-center gap-1 bg-gray-900 border border-gray-800 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setEditorMode("single")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                editorMode === "single"
                  ? "bg-brand-500 text-white shadow-xs"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              Imagen Única
            </button>
            <button
              type="button"
              onClick={() => setEditorMode("carousel")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition flex items-center gap-1.5 ${
                editorMode === "carousel"
                  ? "bg-brand-500 text-white shadow-xs"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              <FileDown className="size-3.5" />
              <span>Carrusel PDF ({slides.length})</span>
            </button>
          </div>

          {/* Selector de Relación de Aspecto (4:5 vs 1:1) */}
          <div className="hidden md:flex items-center gap-1 bg-gray-900 border border-gray-800 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setAspectRatio("4:5")}
              className={`px-2.5 py-1 text-xs font-medium rounded-lg transition ${
                aspectRatio === "4:5"
                  ? "bg-gray-800 text-brand-400 font-bold"
                  : "text-gray-400 hover:text-gray-200"
              }`}
            >
              Vertical 4:5
            </button>
            <button
              type="button"
              onClick={() => setAspectRatio("1:1")}
              className={`px-2.5 py-1 text-xs font-medium rounded-lg transition ${
                aspectRatio === "1:1"
                  ? "bg-gray-800 text-brand-400 font-bold"
                  : "text-gray-400 hover:text-gray-200"
              }`}
            >
              Cuadrado 1:1
            </button>
          </div>

          {/* Acciones Finales */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDownloadPng}
              className="flex items-center gap-1.5 rounded-lg border border-gray-700 bg-gray-800/80 px-3 py-1.5 text-xs font-medium text-gray-200 hover:bg-gray-700 transition"
              title="Descargar lámina actual en PNG"
            >
              <Download className="size-3.5" />
              <span>Lámina PNG</span>
            </button>

            {editorMode === "carousel" && (
              <button
                type="button"
                onClick={handleExportFullPdfCarousel}
                disabled={isExportingPdf}
                className="flex items-center gap-1.5 rounded-lg border border-brand-500/40 bg-brand-500/10 px-3 py-1.5 text-xs font-bold text-brand-400 hover:bg-brand-500/20 transition disabled:opacity-50"
              >
                <FileDown className="size-3.5" />
                <span>{isExportingPdf ? "Compilando PDF..." : "Exportar PDF"}</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleApplyToPost}
              className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-brand-500 to-brand-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-md hover:brightness-110 transition"
            >
              <Check className="size-4" />
              <span>Aplicar al Post</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-800 hover:text-white transition"
            >
              <X className="size-5" />
            </button>
          </div>
        </div>

        {/* CUERPO PRINCIPAL DEL EDITOR */}
        <div className="grid grid-cols-12 flex-1 min-h-0 overflow-hidden">
          {/* PANEL LATERAL IZQUIERDO */}
          <div className="col-span-12 lg:col-span-4 xl:col-span-3 flex flex-col border-r border-gray-800 bg-gray-950/70 overflow-y-auto custom-scrollbar">
            {/* Pestañas del Panel */}
            <div className="flex border-b border-gray-800 bg-gray-900/60 sticky top-0 z-10">
              <button
                type="button"
                onClick={() => setActiveTab("templates")}
                className={`flex-1 py-3 text-xs font-semibold flex items-center justify-center gap-1.5 border-b-2 transition ${
                  activeTab === "templates"
                    ? "border-brand-500 text-brand-400"
                    : "border-transparent text-gray-400 hover:text-gray-200"
                }`}
              >
                <Layers className="size-3.5" />
                <span>Plantillas</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("content")}
                className={`flex-1 py-3 text-xs font-semibold flex items-center justify-center gap-1.5 border-b-2 transition ${
                  activeTab === "content"
                    ? "border-brand-500 text-brand-400"
                    : "border-transparent text-gray-400 hover:text-gray-200"
                }`}
              >
                <Type className="size-3.5" />
                <span>Lámina</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("backgrounds")}
                className={`flex-1 py-3 text-xs font-semibold flex items-center justify-center gap-1.5 border-b-2 transition ${
                  activeTab === "backgrounds"
                    ? "border-brand-500 text-brand-400"
                    : "border-transparent text-gray-400 hover:text-gray-200"
                }`}
              >
                <ImageIcon className="size-3.5" />
                <span>Fotos</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("brand")}
                className={`flex-1 py-3 text-xs font-semibold flex items-center justify-center gap-1.5 border-b-2 transition ${
                  activeTab === "brand"
                    ? "border-brand-500 text-brand-400"
                    : "border-transparent text-gray-400 hover:text-gray-200"
                }`}
              >
                <Palette className="size-3.5" />
                <span>Marca</span>
              </button>
            </div>

            <div className="p-4 space-y-4">
              {/* CONTENIDO DE LA PESTAÑA 1: PLANTILLAS */}
              {activeTab === "templates" && (
                <div className="space-y-3">
                  <p className="text-xs text-gray-400">
                    Selecciona un estilo base. Tus textos se mantendrán intactos al alternar:
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedTemplate("editorial");
                      renderSlideOnCanvas(slides[currentSlideIndex]);
                    }}
                    className={`w-full text-left p-3 rounded-xl border transition flex items-center gap-3 ${
                      selectedTemplate === "editorial"
                        ? "border-brand-500 bg-brand-500/10 ring-1 ring-brand-500"
                        : "border-gray-800 bg-gray-900/60 hover:bg-gray-800/40"
                    }`}
                  >
                    <div className="size-12 rounded-lg bg-gradient-to-t from-gray-950 to-blue-900/50 border border-gray-700 p-1 flex flex-col justify-end">
                      <div className="h-1.5 w-5 bg-brand-400 rounded-xs mb-1"></div>
                      <div className="h-1 w-8 bg-white rounded-xs"></div>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white">Cinematic Editorial</p>
                      <p className="text-[11px] text-gray-400">Degradé oscuro + foto envolvente</p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedTemplate("authority_quote");
                      renderSlideOnCanvas(slides[currentSlideIndex]);
                    }}
                    className={`w-full text-left p-3 rounded-xl border transition flex items-center gap-3 ${
                      selectedTemplate === "authority_quote"
                        ? "border-brand-500 bg-brand-500/10 ring-1 ring-brand-500"
                        : "border-gray-800 bg-gray-900/60 hover:bg-gray-800/40"
                    }`}
                  >
                    <div className="size-12 rounded-lg bg-gray-950 border border-gray-700 flex items-center justify-center text-brand-400 font-serif text-2xl">
                      “
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white">Cita de Autoridad</p>
                      <p className="text-[11px] text-gray-400">Comillas grandes + frase centrada</p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedTemplate("social_card");
                      renderSlideOnCanvas(slides[currentSlideIndex]);
                    }}
                    className={`w-full text-left p-3 rounded-xl border transition flex items-center gap-3 ${
                      selectedTemplate === "social_card"
                        ? "border-brand-500 bg-brand-500/10 ring-1 ring-brand-500"
                        : "border-gray-800 bg-gray-900/60 hover:bg-gray-800/40"
                    }`}
                  >
                    <div className="size-12 rounded-lg bg-gray-900 border border-gray-700 flex flex-col items-center justify-center p-1">
                      <div className="size-3 rounded-full bg-brand-400 mb-1"></div>
                      <div className="h-1 w-6 bg-gray-400 rounded-xs"></div>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white">Tarjeta Social / Feed</p>
                      <p className="text-[11px] text-gray-400">Bordes redondeados + check azul</p>
                    </div>
                  </button>
                </div>
              )}

              {/* CONTENIDO DE LA PESTAÑA 2: CONTENIDO DE LA LÁMINA */}
              {activeTab === "content" && (
                <div className="space-y-3.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase text-brand-400">
                      Editando: {slides[currentSlideIndex].label} (Lámina {currentSlideIndex + 1})
                    </span>
                    <span className="text-[10px] text-gray-400">
                      Tipo: {slides[currentSlideIndex].type}
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-300 uppercase mb-1">
                      Tag / Categoría
                    </label>
                    <input
                      type="text"
                      value={slides[currentSlideIndex].tag}
                      onChange={(e) => {
                        const updated = [...slides];
                        updated[currentSlideIndex].tag = e.target.value;
                        setSlides(updated);
                        renderSlideOnCanvas(updated[currentSlideIndex]);
                      }}
                      className="w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-1.5 text-xs text-white focus:border-brand-500 focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-300 uppercase mb-1">
                      Titular Principal
                    </label>
                    <textarea
                      rows={2}
                      value={slides[currentSlideIndex].title}
                      onChange={(e) => {
                        const updated = [...slides];
                        updated[currentSlideIndex].title = e.target.value;
                        setSlides(updated);
                        renderSlideOnCanvas(updated[currentSlideIndex]);
                      }}
                      className="w-full rounded-lg border border-gray-700 bg-gray-900 p-2.5 text-xs text-white font-medium focus:border-brand-500 focus:outline-hidden"
                    />
                  </div>

                  {slides[currentSlideIndex].bullets && (
                    <div>
                      <label className="block text-xs font-semibold text-gray-300 uppercase mb-1">
                        Puntos Clave (uno por línea)
                      </label>
                      <textarea
                        rows={4}
                        value={slides[currentSlideIndex].bullets?.join("\n")}
                        onChange={(e) => {
                          const updated = [...slides];
                          updated[currentSlideIndex].bullets = e.target.value.split("\n");
                          setSlides(updated);
                          renderSlideOnCanvas(updated[currentSlideIndex]);
                        }}
                        className="w-full rounded-lg border border-gray-700 bg-gray-900 p-2.5 text-xs text-gray-200 focus:border-brand-500 focus:outline-hidden"
                      />
                    </div>
                  )}

                  {slides[currentSlideIndex].type === "cta" && (
                    <div>
                      <label className="block text-xs font-semibold text-gray-300 uppercase mb-1">
                        Palabra Clave de Activación
                      </label>
                      <input
                        type="text"
                        value={slides[currentSlideIndex].ctaKeyword || "SISTEMA"}
                        onChange={(e) => {
                          const updated = [...slides];
                          updated[currentSlideIndex].ctaKeyword = e.target.value.toUpperCase();
                          setSlides(updated);
                          renderSlideOnCanvas(updated[currentSlideIndex]);
                        }}
                        className="w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-1.5 text-xs font-bold text-brand-400 focus:border-brand-500 focus:outline-hidden"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* CONTENIDO DE LA PESTAÑA 3: FOTOS Y FONDOS CON BUSCADOR EN VIVO (Feature #4) */}
              {activeTab === "backgrounds" && (
                <div className="space-y-3.5">
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-gray-300">
                      Buscador de Fotos de Stock (Unsplash)
                    </h3>
                    <p className="text-[11px] text-gray-400 mt-0.5">
                      Busca instantáneamente por temática o selecciona una categoría:
                    </p>
                  </div>

                  {/* Barra de Búsqueda en Tiempo Real */}
                  <div className="relative">
                    <Search className="absolute left-3 top-2.5 size-3.5 text-gray-400" />
                    <input
                      type="text"
                      value={photoSearchQuery}
                      onChange={(e) => setPhotoSearchQuery(e.target.value)}
                      placeholder="Buscar: oficina, laptop, datos, reunión..."
                      className="w-full rounded-xl border border-gray-700 bg-gray-900 pl-8 pr-3 py-1.5 text-xs text-white placeholder-gray-500 focus:border-brand-500 focus:outline-hidden"
                    />
                  </div>

                  {/* Chips de Categorías Populares */}
                  <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar pb-1">
                    {[
                      { id: "all", label: "Todas" },
                      { id: "oficina", label: "🏢 Oficina" },
                      { id: "laptop", label: "💻 Laptops" },
                      { id: "datos", label: "📊 Datos" },
                      { id: "ciudad", label: "🏙️ Ciudad" },
                      { id: "ia", label: "🧠 Tech / IA" },
                      { id: "equipo", label: "👥 Equipo" },
                      { id: "cafe", label: "☕ Café" },
                    ].map((chip) => (
                      <button
                        key={chip.id}
                        type="button"
                        onClick={() => setActivePhotoTag(chip.id)}
                        className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg shrink-0 transition ${
                          activePhotoTag === chip.id
                            ? "bg-brand-500 text-white"
                            : "bg-gray-800 text-gray-400 hover:text-white"
                        }`}
                      >
                        {chip.label}
                      </button>
                    ))}
                  </div>

                  {/* Resultados de la Búsqueda */}
                  <div className="flex items-center justify-between text-[11px] text-gray-400">
                    <span>{filteredPhotos.length} fotos encontradas</span>
                    {photoSearchQuery && (
                      <button
                        type="button"
                        onClick={() => setPhotoSearchQuery("")}
                        className="text-brand-400 hover:underline"
                      >
                        Limpiar búsqueda
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2 max-h-[320px] overflow-y-auto custom-scrollbar pr-1">
                    {filteredPhotos.map((bg) => (
                      <button
                        key={bg.id}
                        type="button"
                        onClick={() => {
                          setSelectedBgUrl(bg.url);
                          renderSlideOnCanvas(slides[currentSlideIndex]);
                        }}
                        className={`group relative rounded-xl overflow-hidden border aspect-video transition ${
                          selectedBgUrl === bg.url
                            ? "border-brand-500 ring-2 ring-brand-500"
                            : "border-gray-800 hover:border-gray-600"
                        }`}
                      >
                        <img
                          src={bg.thumb}
                          alt={bg.name}
                          className="size-full object-cover group-hover:scale-105 transition duration-300"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent flex items-end p-1.5">
                          <span className="text-[10px] font-semibold text-white leading-tight drop-shadow-xs truncate">
                            {bg.name}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>

                  {/* Subir Foto Propia */}
                  <div className="pt-2 border-t border-gray-800">
                    <label className="flex flex-col items-center justify-center border-2 border-dashed border-gray-700 rounded-xl p-3 cursor-pointer hover:border-brand-500/70 transition">
                      <Upload className="size-4 text-gray-400 mb-1" />
                      <span className="text-[11px] text-gray-300">O sube tu propia fotografía (PNG / JPG)</span>
                      <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                    </label>
                  </div>
                </div>
              )}

              {/* CONTENIDO DE LA PESTAÑA 4: ESTILO Y MARCA */}
              {activeTab === "brand" && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-300 uppercase mb-2">
                      Color de Acento
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {BRAND_COLORS.map((c) => (
                        <button
                          key={c.hex}
                          type="button"
                          onClick={() => {
                            setAccentColor(c.hex);
                            renderSlideOnCanvas(slides[currentSlideIndex]);
                          }}
                          className={`flex items-center gap-1.5 p-1.5 rounded-lg border transition ${
                            accentColor === c.hex
                              ? "border-brand-500 bg-gray-800"
                              : "border-gray-800 bg-gray-900"
                          }`}
                        >
                          <span
                            className="size-3.5 rounded-full border border-white/20"
                            style={{ backgroundColor: c.hex }}
                          ></span>
                          <span className="text-[11px] text-gray-200 truncate">{c.name.split(" ")[0]}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-300 font-semibold uppercase">Opacidad de Sombra</span>
                      <span className="text-brand-400 font-mono">{Math.round(overlayOpacity * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min={0.3}
                      max={0.95}
                      step={0.05}
                      value={overlayOpacity}
                      onChange={(e) => {
                        setOverlayOpacity(parseFloat(e.target.value));
                        renderSlideOnCanvas(slides[currentSlideIndex]);
                      }}
                      className="w-full accent-brand-500"
                    />
                  </div>

                  <div className="pt-2 border-t border-gray-800 space-y-2">
                    <label className="block text-xs font-semibold text-gray-300 uppercase">
                      Autor de Marca
                    </label>
                    <input
                      type="text"
                      value={nameText}
                      onChange={(e) => {
                        setNameText(e.target.value);
                        renderSlideOnCanvas(slides[currentSlideIndex]);
                      }}
                      className="w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-1.5 text-xs text-white"
                      placeholder="Nombre"
                    />
                    <input
                      type="text"
                      value={handleText}
                      onChange={(e) => {
                        setHandleText(e.target.value);
                        renderSlideOnCanvas(slides[currentSlideIndex]);
                      }}
                      className="w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-1.5 text-xs text-gray-400"
                      placeholder="@handle"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ÁREA CENTRAL: LIENZO WYSIWYG + BARRA FLOTANTE CONTEXTUAL + NAVEGADOR DE CARRUSEL */}
          <div className="col-span-12 lg:col-span-8 xl:col-span-9 flex flex-col bg-slate-950 relative overflow-hidden">
            {/* PUNTO 2: BARRA DE HERRAMIENTAS FLOTANTE CONTEXTUAL (ESTILO CANVA) */}
            <div className="w-full px-4 py-2 border-b border-gray-800 bg-gray-900/90 backdrop-blur-md flex items-center justify-between min-h-[48px] z-20">
              {selectedObjectInfo?.isText ? (
                /* Controles cuando hay un Texto Seleccionado */
                <div className="flex flex-wrap items-center gap-2">
                  {/* Selector de Fuente */}
                  <select
                    value={selectedObjectInfo.fontFamily}
                    onChange={(e) => applyTextProperty("fontFamily", e.target.value)}
                    className="rounded-lg border border-gray-700 bg-gray-800 px-2.5 py-1 text-xs text-white font-medium focus:border-brand-500 focus:outline-hidden"
                  >
                    {AVAILABLE_FONTS.map((f) => (
                      <option key={f.name} value={f.name}>
                        {f.label}
                      </option>
                    ))}
                  </select>

                  {/* Tamaño de Fuente - / + */}
                  <div className="flex items-center border border-gray-700 rounded-lg overflow-hidden bg-gray-800">
                    <button
                      type="button"
                      onClick={() =>
                        applyTextProperty("fontSize", Math.max(12, selectedObjectInfo.fontSize - 4))
                      }
                      className="px-2 py-1 text-xs text-gray-300 hover:bg-gray-700"
                      title="Reducir tamaño"
                    >
                      -
                    </button>
                    <span className="px-2 text-xs font-mono text-white">
                      {selectedObjectInfo.fontSize}px
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        applyTextProperty("fontSize", Math.min(120, selectedObjectInfo.fontSize + 4))
                      }
                      className="px-2 py-1 text-xs text-gray-300 hover:bg-gray-700"
                      title="Aumentar tamaño"
                    >
                      +
                    </button>
                  </div>

                  {/* Estilos: Negrita, Cursiva, Subrayado */}
                  <div className="flex items-center border border-gray-700 rounded-lg overflow-hidden bg-gray-800">
                    <button
                      type="button"
                      onClick={() =>
                        applyTextProperty(
                          "fontWeight",
                          selectedObjectInfo.fontWeight === "bold" ? "normal" : "bold"
                        )
                      }
                      className={`p-1.5 transition ${
                        selectedObjectInfo.fontWeight === "bold"
                          ? "bg-brand-500 text-white"
                          : "text-gray-300 hover:bg-gray-700"
                      }`}
                      title="Negrita"
                    >
                      <Bold className="size-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        applyTextProperty(
                          "fontStyle",
                          selectedObjectInfo.fontStyle === "italic" ? "normal" : "italic"
                        )
                      }
                      className={`p-1.5 transition ${
                        selectedObjectInfo.fontStyle === "italic"
                          ? "bg-brand-500 text-white"
                          : "text-gray-300 hover:bg-gray-700"
                      }`}
                      title="Cursiva"
                    >
                      <Italic className="size-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => applyTextProperty("underline", !selectedObjectInfo.underline)}
                      className={`p-1.5 transition ${
                        selectedObjectInfo.underline
                          ? "bg-brand-500 text-white"
                          : "text-gray-300 hover:bg-gray-700"
                      }`}
                      title="Subrayado"
                    >
                      <Underline className="size-3.5" />
                    </button>
                  </div>

                  {/* Alineación de Texto */}
                  <div className="flex items-center border border-gray-700 rounded-lg overflow-hidden bg-gray-800">
                    <button
                      type="button"
                      onClick={() => applyTextProperty("textAlign", "left")}
                      className={`p-1.5 transition ${
                        selectedObjectInfo.textAlign === "left"
                          ? "bg-brand-500 text-white"
                          : "text-gray-300 hover:bg-gray-700"
                      }`}
                      title="Alinear a la izquierda"
                    >
                      <AlignLeft className="size-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => applyTextProperty("textAlign", "center")}
                      className={`p-1.5 transition ${
                        selectedObjectInfo.textAlign === "center"
                          ? "bg-brand-500 text-white"
                          : "text-gray-300 hover:bg-gray-700"
                      }`}
                      title="Centrar"
                    >
                      <AlignCenter className="size-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => applyTextProperty("textAlign", "right")}
                      className={`p-1.5 transition ${
                        selectedObjectInfo.textAlign === "right"
                          ? "bg-brand-500 text-white"
                          : "text-gray-300 hover:bg-gray-700"
                      }`}
                      title="Alinear a la derecha"
                    >
                      <AlignRight className="size-3.5" />
                    </button>
                  </div>

                  {/* Resaltador de Fondo (Highlighter Box) */}
                  <button
                    type="button"
                    onClick={() =>
                      applyTextProperty(
                        "backgroundColor",
                        selectedObjectInfo.hasHighlight ? "" : accentColor
                      )
                    }
                    className={`flex items-center gap-1 px-2 py-1 rounded-lg border text-xs font-semibold transition ${
                      selectedObjectInfo.hasHighlight
                        ? "border-brand-500 bg-brand-500/20 text-brand-400"
                        : "border-gray-700 bg-gray-800 text-gray-300 hover:bg-gray-700"
                    }`}
                    title="Caja de resaltado estilo viral"
                  >
                    <Highlighter className="size-3.5" />
                    <span>Resaltar</span>
                  </button>

                  {/* Color de Texto */}
                  <div className="flex items-center gap-1.5 pl-1">
                    <input
                      type="color"
                      value={selectedObjectInfo.fill}
                      onChange={(e) => applyTextProperty("fill", e.target.value)}
                      className="size-6 rounded-md border border-gray-700 bg-transparent cursor-pointer"
                      title="Color del texto"
                    />
                  </div>

                  {/* Duplicar, Capas y Eliminar */}
                  <div className="flex items-center gap-1 pl-2 border-l border-gray-800">
                    <button
                      type="button"
                      onClick={handleDuplicateSelected}
                      className="p-1.5 rounded-lg text-gray-300 hover:bg-gray-800 transition"
                      title="Duplicar elemento"
                    >
                      <Copy className="size-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={handleBringForward}
                      className="p-1.5 rounded-lg text-gray-300 hover:bg-gray-800 transition"
                      title="Traer al frente"
                    >
                      <ArrowUp className="size-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={handleSendBackward}
                      className="p-1.5 rounded-lg text-gray-300 hover:bg-gray-800 transition"
                      title="Enviar atrás"
                    >
                      <ArrowDown className="size-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={handleDeleteSelected}
                      className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/10 transition"
                      title="Eliminar elemento"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                </div>
              ) : selectedObjectInfo ? (
                /* Controles cuando hay una Forma u Objeto General */
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400">Elemento Gráfico Seleccionado</span>
                  <button
                    type="button"
                    onClick={handleDuplicateSelected}
                    className="p-1.5 rounded-lg text-gray-300 hover:bg-gray-800"
                    title="Duplicar"
                  >
                    <Copy className="size-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={handleDeleteSelected}
                    className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/10"
                    title="Eliminar"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              ) : (
                /* Barra de estado en reposo */
                <div className="flex items-center justify-between w-full text-xs text-gray-400">
                  <div className="flex items-center gap-2">
                    <span className="size-2 rounded-full bg-emerald-400 animate-pulse"></span>
                    <span>
                      Modo Canva Activo: Selecciona cualquier texto o elemento para editar tipografía, tamaño y colores.
                    </span>
                  </div>
                  <span className="text-gray-500 text-[11px]">
                    Lámina {currentSlideIndex + 1} de {slides.length}
                  </span>
                </div>
              )}
            </div>

            {/* ESCENARIO CENTRAL DEL CANVAS */}
            <div className="flex-1 flex items-center justify-center p-3 sm:p-4 overflow-hidden relative">
              <div className="relative shadow-2xl rounded-xl border border-gray-800 bg-gray-900 overflow-hidden">
                <div
                  style={{
                    width: aspectRatio === "4:5" ? "400px" : "440px",
                    height: aspectRatio === "4:5" ? "500px" : "440px",
                    position: "relative",
                  }}
                  className="overflow-hidden bg-gray-950 flex items-center justify-center"
                >
                  <canvas ref={canvasElRef} style={{ width: "100%", height: "100%", display: "block" }} />
                </div>
              </div>
            </div>

            {/* PUNTO 3: TIRA INFERIOR DE CARRUSEL MULTIDIAPOSITIVA (ESTILO CANVA) */}
            <div className="w-full px-5 py-3 border-t border-gray-800 bg-gray-950/90 flex items-center gap-3 overflow-x-auto custom-scrollbar z-20">
              <span className="text-[11px] font-bold uppercase text-gray-400 shrink-0 flex items-center gap-1.5">
                <Layers className="size-3.5 text-brand-400" />
                Láminas:
              </span>

              {slides.map((slide, idx) => (
                <div
                  key={slide.id}
                  onClick={() => handleSelectSlide(idx)}
                  className={`group relative flex items-center gap-2 px-3 py-2 rounded-xl border cursor-pointer transition shrink-0 ${
                    currentSlideIndex === idx
                      ? "border-brand-500 bg-brand-500/15 ring-2 ring-brand-500/40 text-white"
                      : "border-gray-800 bg-gray-900 hover:border-gray-700 text-gray-400 hover:text-gray-200"
                  }`}
                >
                  <span className="size-5 rounded-md bg-gray-800 text-[11px] font-mono font-bold flex items-center justify-center text-brand-400 border border-gray-700">
                    {idx + 1}
                  </span>

                  <div className="text-left">
                    <p className="text-xs font-bold leading-none">{slide.label}</p>
                    <p className="text-[10px] text-gray-500 truncate max-w-[90px]">
                      {slide.title.substring(0, 18)}...
                    </p>
                  </div>

                  {slides.length > 1 && (
                    <button
                      type="button"
                      onClick={(e) => handleDeleteSlide(idx, e)}
                      className="opacity-0 group-hover:opacity-100 p-1 text-gray-500 hover:text-red-400 rounded transition"
                      title="Eliminar lámina"
                    >
                      <Trash2 className="size-3" />
                    </button>
                  )}
                </div>
              ))}

              {/* Botón de Añadir Lámina (+) */}
              <button
                type="button"
                onClick={handleAddSlide}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-dashed border-gray-700 hover:border-brand-500 hover:bg-brand-500/10 text-xs font-semibold text-gray-400 hover:text-brand-400 transition shrink-0"
              >
                <Plus className="size-4" />
                <span>Añadir Lámina</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
