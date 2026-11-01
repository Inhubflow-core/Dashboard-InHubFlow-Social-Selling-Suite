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
  Sliders,
  Layers,
  FileDown,
  RefreshCw,
  Upload,
  User,
  ZoomIn,
  ZoomOut,
  Maximize2
} from "lucide-react";
import { jsPDF } from "jspdf";

export type TemplateId =
  | "editorial"
  | "authority_quote"
  | "social_card"
  | "split_focus"
  | "big_metric";

export type AspectRatio = "4:5" | "1:1";

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

// Fondos curados de alta resolución (Unsplash optimizados)
const CURATED_BACKGROUNDS = [
  {
    id: "executive_office",
    name: "Oficina Ejecutiva",
    thumb: "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=400&q=70",
    url: "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1200&q=85",
  },
  {
    id: "tech_desk",
    name: "Setup Tecnológico",
    thumb: "https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=400&q=70",
    url: "https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=1200&q=85",
  },
  {
    id: "architecture_clean",
    name: "Arquitectura Minimal",
    thumb: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=400&q=70",
    url: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1200&q=85",
  },
  {
    id: "dark_gradient_ambient",
    name: "Gradiente Corporativo",
    thumb: "https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&w=400&q=70",
    url: "https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&w=1200&q=85",
  },
  {
    id: "abstract_3d",
    name: "3D Geométrico Dark",
    thumb: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=400&q=70",
    url: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=85",
  },
  {
    id: "workspace_coffee",
    name: "Espacio Creativo",
    thumb: "https://images.unsplash.com/photo-1499750310107-5fef28a66643?auto=format&fit=crop&w=400&q=70",
    url: "https://images.unsplash.com/photo-1499750310107-5fef28a66643?auto=format&fit=crop&w=1200&q=85",
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

  // Estados de diseño
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateId>("editorial");
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>("4:5");
  const [selectedBgUrl, setSelectedBgUrl] = useState<string>(CURATED_BACKGROUNDS[0].url);
  const [customBgInput, setCustomBgInput] = useState("");
  const [accentColor, setAccentColor] = useState("#0099ff");
  const [overlayOpacity, setOverlayOpacity] = useState(0.75); // 75% oscuridad para legibilidad óptima
  const [activeTab, setActiveTab] = useState<"templates" | "backgrounds" | "content" | "brand">("templates");

  // Campos de texto editables en vivo
  const [titleText, setTitleText] = useState(initialTitle);
  const [subtitleText, setSubtitleText] = useState(initialSubtitle);
  const [categoryText, setCategoryText] = useState(initialCategory);
  const [metricText, setMetricText] = useState(initialMetric);
  const [nameText, setNameText] = useState(authorName);
  const [handleText, setHandleText] = useState(authorHandle);

  // Estados de UI
  const [isRendering, setIsRendering] = useState(false);
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  // Sincronizar props cuando cambia el post
  useEffect(() => {
    if (initialTitle) setTitleText(initialTitle);
    if (initialSubtitle) setSubtitleText(initialSubtitle);
    if (initialCategory) setCategoryText(initialCategory);
    if (initialMetric) setMetricText(initialMetric);
    if (authorName) setNameText(authorName);
    if (authorHandle) setHandleText(authorHandle);
  }, [initialTitle, initialSubtitle, initialCategory, initialMetric, authorName, authorHandle]);

  // Dimensiones internas nativas (Alta Resolución)
  const canvasWidth = 1080;
  const canvasHeight = aspectRatio === "4:5" ? 1350 : 1080;

  // Inicializar Fabric Canvas
  useEffect(() => {
    if (!isOpen || !canvasElRef.current) return;

    let isMounted = true;

    import("fabric").then((fabric) => {
      if (!isMounted || !canvasElRef.current) return;

      // Destruir canvas previo si existía
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
      renderCurrentTemplate(canvas, fabric);
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

  // Renderizar la plantilla activa
  const renderCurrentTemplate = useCallback(
    async (canvasInstance?: any, fabricModule?: any) => {
      const canvas = canvasInstance || fabricCanvasRef.current;
      if (!canvas) return;

      const fabric = fabricModule || (await import("fabric"));
      setIsRendering(true);

      canvas.clear();
      canvas.backgroundColor = "#090d16";

      const currentW = canvas.width || canvasWidth;
      const currentH = canvas.height || canvasHeight;

      try {
        // 1. CARGA DE FONDO (FOTO O COLOR SÓLIDO)
        if (selectedTemplate !== "social_card" || selectedBgUrl) {
          try {
            const img = await fabric.FabricImage.fromURL(selectedBgUrl, {
              crossOrigin: "anonymous",
            });

            // Escalar para cubrir todo el lienzo (estilo object-fit: cover)
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
            console.warn("No se pudo cargar la imagen remota, usando fondo sólido fallback", err);
          }
        }

        // 2. CAPAS ESPECÍFICAS SEGÚN LA PLANTILLA SELECCIONADA
        switch (selectedTemplate) {
          case "editorial": {
            // DEGRADÉ DE ALTO CONTRASTE (Desde transparente arriba hasta oscuro abajo)
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
                  { offset: 0, color: "rgba(5, 10, 20, 0.2)" },
                  { offset: 0.45, color: `rgba(5, 10, 20, ${overlayOpacity * 0.7})` },
                  { offset: 0.85, color: `rgba(5, 10, 20, ${overlayOpacity})` },
                  { offset: 1, color: `rgba(5, 10, 20, ${Math.min(1, overlayOpacity + 0.15)})` },
                ],
              }),
            });
            canvas.add(gradientRect);

            // CATEGORÍA / PILL TAG
            const tagBg = new fabric.Rect({
              left: 70,
              top: currentH - 580,
              rx: 8,
              ry: 8,
              fill: accentColor,
              width: Math.min(categoryText.length * 14 + 32, 450),
              height: 38,
              selectable: true,
            });
            const tagText = new fabric.Textbox(categoryText.toUpperCase(), {
              left: 86,
              top: currentH - 572,
              fontSize: 18,
              fontWeight: "bold",
              fill: accentColor === "#ffffff" ? "#000000" : "#ffffff",
              fontFamily: "Inter, sans-serif",
              selectable: true,
            });
            canvas.add(tagBg, tagText);

            // GRAN TITULAR GANCHO
            const titleObj = new fabric.Textbox(titleText, {
              left: 70,
              top: currentH - 510,
              width: currentW - 140,
              fontSize: 54,
              lineHeight: 1.15,
              fontWeight: "bold",
              fill: "#ffffff",
              fontFamily: "Outfit, Inter, sans-serif",
              shadow: new fabric.Shadow({
                color: "rgba(0,0,0,0.8)",
                blur: 20,
                offsetX: 0,
                offsetY: 6,
              }),
            });
            canvas.add(titleObj);

            // SUBTÍTULO DESCRIPTIVO
            const subObj = new fabric.Textbox(subtitleText, {
              left: 70,
              top: currentH - 260,
              width: currentW - 140,
              fontSize: 26,
              lineHeight: 1.3,
              fill: "rgba(226, 232, 240, 0.95)",
              fontFamily: "Inter, sans-serif",
            });
            canvas.add(subObj);

            // LÍNEA DIVISORIA INFERIOR
            const divider = new fabric.Rect({
              left: 70,
              top: currentH - 140,
              width: currentW - 140,
              height: 2,
              fill: "rgba(255, 255, 255, 0.2)",
              selectable: false,
            });
            canvas.add(divider);

            // PIE DE AUTOR (Avatar Placeholder + Nombre + Handle)
            const avatarCircle = new fabric.Rect({
              left: 70,
              top: currentH - 115,
              width: 54,
              height: 54,
              rx: 27,
              ry: 27,
              fill: accentColor,
              selectable: true,
            });
            const avatarLetter = new fabric.Textbox(nameText.charAt(0).toUpperCase() || "I", {
              left: 88,
              top: currentH - 105,
              fontSize: 26,
              fontWeight: "bold",
              fill: "#ffffff",
              fontFamily: "Inter, sans-serif",
              selectable: false,
            });
            const authorObj = new fabric.Textbox(nameText, {
              left: 140,
              top: currentH - 114,
              fontSize: 22,
              fontWeight: "bold",
              fill: "#ffffff",
              fontFamily: "Inter, sans-serif",
            });
            const handleObj = new fabric.Textbox(handleText, {
              left: 140,
              top: currentH - 85,
              fontSize: 18,
              fill: "rgba(148, 163, 184, 0.9)",
              fontFamily: "Inter, sans-serif",
            });
            canvas.add(avatarCircle, avatarLetter, authorObj, handleObj);
            break;
          }

          case "authority_quote": {
            // FONDO OSCURO VIGNETTE
            const darkOverlay = new fabric.Rect({
              left: 0,
              top: 0,
              width: currentW,
              height: currentH,
              fill: `rgba(10, 15, 26, ${Math.max(0.85, overlayOpacity)})`,
              selectable: false,
            });
            canvas.add(darkOverlay);

            // COMILLAS GIGANTES DECORATIVAS
            const quoteIcon = new fabric.Textbox("“", {
              left: 70,
              top: 110,
              fontSize: 190,
              fontWeight: "bold",
              fill: accentColor,
              fontFamily: "Georgia, serif",
              selectable: false,
              opacity: 0.85,
            });
            canvas.add(quoteIcon);

            // CITA CENTRADA CON IMPACTO
            const quoteText = new fabric.Textbox(`"${titleText}"`, {
              left: 80,
              top: 290,
              width: currentW - 160,
              fontSize: 50,
              lineHeight: 1.25,
              fontWeight: "bold",
              fill: "#ffffff",
              fontFamily: "Outfit, Inter, sans-serif",
            });
            canvas.add(quoteText);

            // REFLEXIÓN / SUBTÍTULO
            const subQuote = new fabric.Textbox(subtitleText, {
              left: 80,
              top: currentH - 380,
              width: currentW - 160,
              fontSize: 26,
              lineHeight: 1.35,
              fill: "rgba(203, 213, 225, 0.9)",
              fontFamily: "Inter, sans-serif",
            });
            canvas.add(subQuote);

            // TARJETA DE FIRMA DEL AUTOR
            const authorCardBg = new fabric.Rect({
              left: 80,
              top: currentH - 200,
              width: currentW - 160,
              height: 100,
              rx: 16,
              ry: 16,
              fill: "rgba(255, 255, 255, 0.06)",
              stroke: "rgba(255, 255, 255, 0.12)",
              strokeWidth: 1.5,
            });
            const quoteAuthor = new fabric.Textbox(nameText, {
              left: 110,
              top: currentH - 180,
              fontSize: 24,
              fontWeight: "bold",
              fill: "#ffffff",
              fontFamily: "Inter, sans-serif",
            });
            const quoteHandle = new fabric.Textbox(handleText, {
              left: 110,
              top: currentH - 142,
              fontSize: 18,
              fill: accentColor,
              fontFamily: "Inter, sans-serif",
            });
            canvas.add(authorCardBg, quoteAuthor, quoteHandle);
            break;
          }

          case "social_card": {
            // FONDO CON DEGRADÉ SUAVE
            const cardBgOverlay = new fabric.Rect({
              left: 0,
              top: 0,
              width: currentW,
              height: currentH,
              fill: `rgba(15, 23, 42, ${overlayOpacity})`,
              selectable: false,
            });
            canvas.add(cardBgOverlay);

            // TARJETA FLOTANTE CENTRAL ESTILO FEED PREMIUM
            const cardW = currentW - 120;
            const cardH = currentH - 220;
            const cardRect = new fabric.Rect({
              left: 60,
              top: 110,
              width: cardW,
              height: cardH,
              rx: 24,
              ry: 24,
              fill: "#0f172a",
              stroke: "rgba(255, 255, 255, 0.15)",
              strokeWidth: 2,
              shadow: new fabric.Shadow({
                color: "rgba(0, 0, 0, 0.7)",
                blur: 35,
                offsetX: 0,
                offsetY: 15,
              }),
            });
            canvas.add(cardRect);

            // ENCABEZADO DE LA TARJETA (Avatar + Nombre + Check azul)
            const cardAvatar = new fabric.Rect({
              left: 100,
              top: 150,
              width: 64,
              height: 64,
              rx: 32,
              ry: 32,
              fill: accentColor,
            });
            const cardInitial = new fabric.Textbox(nameText.charAt(0) || "U", {
              left: 122,
              top: 162,
              fontSize: 28,
              fontWeight: "bold",
              fill: "#ffffff",
              fontFamily: "Inter, sans-serif",
              selectable: false,
            });
            const cardName = new fabric.Textbox(nameText, {
              left: 180,
              top: 150,
              fontSize: 26,
              fontWeight: "bold",
              fill: "#ffffff",
              fontFamily: "Inter, sans-serif",
            });
            const cardVerified = new fabric.Textbox("✓ Verificado", {
              left: 180,
              top: 186,
              fontSize: 16,
              fontWeight: "bold",
              fill: accentColor,
              fontFamily: "Inter, sans-serif",
            });
            canvas.add(cardAvatar, cardInitial, cardName, cardVerified);

            // LÍNEA DIVISORIA INTERNA
            const cardDivider = new fabric.Rect({
              left: 100,
              top: 245,
              width: cardW - 80,
              height: 1.5,
              fill: "rgba(255, 255, 255, 0.1)",
              selectable: false,
            });
            canvas.add(cardDivider);

            // CONTENIDO DEL POST
            const cardTitle = new fabric.Textbox(titleText, {
              left: 100,
              top: 280,
              width: cardW - 80,
              fontSize: 44,
              lineHeight: 1.2,
              fontWeight: "bold",
              fill: "#ffffff",
              fontFamily: "Outfit, Inter, sans-serif",
            });
            const cardSub = new fabric.Textbox(subtitleText, {
              left: 100,
              top: currentH - 460,
              width: cardW - 80,
              fontSize: 26,
              lineHeight: 1.4,
              fill: "rgba(226, 232, 240, 0.9)",
              fontFamily: "Inter, sans-serif",
            });
            canvas.add(cardTitle, cardSub);

            // PIE SOCIAL (Métricas de Tracción)
            const cardFooterBg = new fabric.Rect({
              left: 100,
              top: currentH - 220,
              width: cardW - 80,
              height: 60,
              rx: 12,
              ry: 12,
              fill: "rgba(255, 255, 255, 0.04)",
              stroke: "rgba(255, 255, 255, 0.08)",
              strokeWidth: 1,
            });
            const cardFooterText = new fabric.Textbox("👍 1.420 recomendados  •  💬 348 comentarios", {
              left: 125,
              top: currentH - 202,
              fontSize: 18,
              fontWeight: "600",
              fill: "rgba(148, 163, 184, 0.9)",
              fontFamily: "Inter, sans-serif",
            });
            canvas.add(cardFooterBg, cardFooterText);
            break;
          }

          case "split_focus": {
            // MITAD INFERIOR SÓLIDA DE ALTO CONTRASTE
            const splitDividerY = currentH * 0.44;
            const bottomBlock = new fabric.Rect({
              left: 0,
              top: splitDividerY,
              width: currentW,
              height: currentH - splitDividerY,
              fill: "#090d16",
              selectable: false,
            });
            const accentBorder = new fabric.Rect({
              left: 0,
              top: splitDividerY,
              width: currentW,
              height: 6,
              fill: accentColor,
              selectable: false,
            });
            canvas.add(bottomBlock, accentBorder);

            // TITULAR EN EL BLOQUE INFERIOR
            const splitTitle = new fabric.Textbox(titleText, {
              left: 70,
              top: splitDividerY + 60,
              width: currentW - 140,
              fontSize: 48,
              lineHeight: 1.15,
              fontWeight: "bold",
              fill: "#ffffff",
              fontFamily: "Outfit, Inter, sans-serif",
            });
            const splitSub = new fabric.Textbox(subtitleText, {
              left: 70,
              top: splitDividerY + 260,
              width: currentW - 140,
              fontSize: 26,
              lineHeight: 1.4,
              fill: "rgba(203, 213, 225, 0.9)",
              fontFamily: "Inter, sans-serif",
            });
            canvas.add(splitTitle, splitSub);

            // FIRMA INFERIOR
            const splitAuthor = new fabric.Textbox(`${nameText}  •  ${handleText}`, {
              left: 70,
              top: currentH - 90,
              fontSize: 20,
              fontWeight: "600",
              fill: accentColor,
              fontFamily: "Inter, sans-serif",
            });
            canvas.add(splitAuthor);
            break;
          }

          case "big_metric": {
            // FONDO OSCURO TOTAL
            const darkBg = new fabric.Rect({
              left: 0,
              top: 0,
              width: currentW,
              height: currentH,
              fill: `rgba(9, 13, 22, ${Math.max(0.85, overlayOpacity)})`,
              selectable: false,
            });
            canvas.add(darkBg);

            // TAG SUPERIOR
            const metricTag = new fabric.Textbox(categoryText.toUpperCase(), {
              left: 80,
              top: 100,
              fontSize: 22,
              fontWeight: "bold",
              fill: accentColor,
              fontFamily: "Inter, sans-serif",
            });
            canvas.add(metricTag);

            // NÚMERO GIGANTE DESTACADO
            const bigNumber = new fabric.Textbox(metricText, {
              left: 70,
              top: 170,
              fontSize: 160,
              fontWeight: "900",
              fill: "#ffffff",
              fontFamily: "Outfit, Inter, sans-serif",
              shadow: new fabric.Shadow({
                color: accentColor,
                blur: 35,
                offsetX: 0,
                offsetY: 0,
              }),
            });
            canvas.add(bigNumber);

            // TITULAR ASOCIADO A LA MÉTRICA
            const metricTitle = new fabric.Textbox(titleText, {
              left: 80,
              top: 420,
              width: currentW - 160,
              fontSize: 48,
              lineHeight: 1.2,
              fontWeight: "bold",
              fill: "#ffffff",
              fontFamily: "Outfit, Inter, sans-serif",
            });
            const metricDesc = new fabric.Textbox(subtitleText, {
              left: 80,
              top: currentH - 360,
              width: currentW - 160,
              fontSize: 26,
              lineHeight: 1.4,
              fill: "rgba(203, 213, 225, 0.9)",
              fontFamily: "Inter, sans-serif",
            });
            canvas.add(metricTitle, metricDesc);

            // PIE DE AUTOR CON BARRA LATERAL
            const bar = new fabric.Rect({
              left: 80,
              top: currentH - 120,
              width: 5,
              height: 50,
              fill: accentColor,
            });
            const metricAuthor = new fabric.Textbox(nameText, {
              left: 100,
              top: currentH - 120,
              fontSize: 22,
              fontWeight: "bold",
              fill: "#ffffff",
              fontFamily: "Inter, sans-serif",
            });
            const metricHandle = new fabric.Textbox(handleText, {
              left: 100,
              top: currentH - 92,
              fontSize: 18,
              fill: "rgba(148, 163, 184, 0.9)",
              fontFamily: "Inter, sans-serif",
            });
            canvas.add(bar, metricAuthor, metricHandle);
            break;
          }
        }

        canvas.renderAll();
      } catch (err) {
        console.error("Error renderizando la plantilla en Fabric.js:", err);
      } finally {
        setIsRendering(false);
      }
    },
    [
      selectedTemplate,
      selectedBgUrl,
      overlayOpacity,
      accentColor,
      titleText,
      subtitleText,
      categoryText,
      metricText,
      nameText,
      handleText,
      canvasWidth,
      canvasHeight,
    ]
  );

  // Re-renderizar cuando cambien los parámetros visuales
  useEffect(() => {
    if (fabricCanvasRef.current) {
      renderCurrentTemplate();
    }
  }, [renderCurrentTemplate]);

  // Manejar subida de archivo de imagen local
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

  // Exportar y descargar imagen PNG
  const handleDownloadPng = () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    try {
      const dataUrl = canvas.toDataURL({
        format: "png",
        multiplier: 1, // 1080x1350 o 1080x1080 nítido
      });

      const link = document.createElement("a");
      link.download = `InHubFlow_${selectedTemplate}_${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error("Error al exportar PNG:", err);
    }
  };

  // Exportar Carrusel PDF (utilizando la imagen renderizada y jsPDF)
  const handleExportPdfCarousel = async () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    setIsExportingPdf(true);
    try {
      const dataUrl = canvas.toDataURL({
        format: "png",
        multiplier: 1,
      });

      // Crear PDF con dimensiones cuadradas de LinkedIn (200x200mm)
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: [200, 200],
      });

      // Slide 1: Portada creada con Fabric.js
      doc.addImage(dataUrl, "PNG", 0, 0, 200, 200);

      // Slide 2: Desarrollo accionable
      doc.addPage([200, 200]);
      doc.setFillColor(15, 23, 42); // #0f172a
      doc.rect(0, 0, 200, 200, "F");

      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(22);
      doc.text("Paso 1: Diagnóstico de Conversión", 20, 35);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(13);
      doc.setTextColor(203, 213, 225);
      const points = [
        "• Elimina mensajes genéricos sin contexto del decisor.",
        "• Construye activos de valor (plantillas, frameworks, calculadoras).",
        "• Invita a la conversación natural mediante preguntas abiertas.",
      ];
      let py = 60;
      points.forEach((p) => {
        doc.text(p, 20, py);
        py += 14;
      });

      // Slide 3: CTA Final
      doc.addPage([200, 200]);
      doc.setFillColor(10, 15, 26);
      doc.rect(0, 0, 200, 200, "F");

      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(22);
      doc.text("¿Quieres la Guía Completa?", 20, 45);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(14);
      doc.setTextColor(203, 213, 225);
      doc.text("Comenta 'SISTEMA' abajo y te la envío por mensaje privado.", 20, 75);

      doc.setTextColor(0, 153, 255);
      doc.text(nameText, 20, 175);
      doc.text(handleText, 180, 175, { align: "right" });

      doc.save(`InHubFlow_Carrusel_${Date.now()}.pdf`);
    } catch (err) {
      console.error("Error al exportar carrusel PDF:", err);
    } finally {
      setIsExportingPdf(false);
    }
  };

  // Aplicar imagen al post y cerrar modal
  const handleApplyToPost = () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    try {
      const dataUrl = canvas.toDataURL({
        format: "png",
        multiplier: 1,
      });

      if (onApplyImage) {
        onApplyImage(dataUrl);
      }
      onClose();
    } catch (err) {
      console.error("Error al aplicar imagen:", err);
    }
  };

  // Generador de Prompt Visual para IA (DALL-E / Flux)
  const visualPrompt = `Cinematic professional photograph, moody executive workspace, modern laptop with clean data charts on glass table, dark navy blue ambient tones, elegant contrast, realistic 8k, copy space at bottom for text overlay, no text, no letters.`;

  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(visualPrompt);
    setCopiedPrompt(true);
    setTimeout(() => setCopiedPrompt(false), 3000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-3 sm:p-6 overflow-hidden">
      <div className="relative flex flex-col w-full max-w-[1440px] h-[92vh] rounded-2xl bg-gray-900 border border-gray-800 shadow-2xl overflow-hidden">
        {/* BARRA SUPERIOR / HEADER */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800 bg-gray-950/80">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-brand-500/20 text-brand-400 border border-brand-500/30">
              <Sparkles className="size-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white">Estudio Visual InHubFlow</h2>
                <span className="rounded-full bg-brand-500/10 border border-brand-500/20 px-2 py-0.5 text-[10px] font-semibold text-brand-400 uppercase tracking-wide">
                  LinkedIn Ready
                </span>
              </div>
              <p className="text-xs text-gray-400">
                Diseña portadas y carruseles con tipografía vectorial nítida y fotografías de impacto
              </p>
            </div>
          </div>

          {/* Selector de Relación de Aspecto (4:5 vs 1:1) */}
          <div className="flex items-center gap-2 bg-gray-900 border border-gray-800 p-1 rounded-lg">
            <button
              type="button"
              onClick={() => setAspectRatio("4:5")}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition ${
                aspectRatio === "4:5"
                  ? "bg-brand-500 text-white shadow-xs"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              Vertical 4:5 (Recomendado)
            </button>
            <button
              type="button"
              onClick={() => setAspectRatio("1:1")}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition ${
                aspectRatio === "1:1"
                  ? "bg-brand-500 text-white shadow-xs"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              Cuadrado 1:1
            </button>
          </div>

          {/* Botones de Acción */}
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handleDownloadPng}
              className="flex items-center gap-1.5 rounded-lg border border-gray-700 bg-gray-800/80 px-3 py-2 text-xs font-medium text-gray-200 hover:bg-gray-700 transition"
              title="Descargar imagen en alta resolución"
            >
              <Download className="size-3.5" />
              <span>Descargar PNG</span>
            </button>

            <button
              type="button"
              onClick={handleExportPdfCarousel}
              disabled={isExportingPdf}
              className="flex items-center gap-1.5 rounded-lg border border-gray-700 bg-gray-800/80 px-3 py-2 text-xs font-medium text-gray-200 hover:bg-gray-700 transition disabled:opacity-50"
              title="Generar carrusel PDF deslizable para LinkedIn"
            >
              <FileDown className="size-3.5" />
              <span>{isExportingPdf ? "Generando PDF..." : "Carrusel PDF"}</span>
            </button>

            <button
              type="button"
              onClick={handleApplyToPost}
              className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-brand-500 to-brand-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-brand-500/20 hover:brightness-110 transition"
            >
              <Check className="size-4" />
              <span>Aplicar a la Publicación</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-2 text-gray-400 hover:bg-gray-800 hover:text-white transition"
              title="Cerrar modal"
            >
              <X className="size-5" />
            </button>
          </div>
        </div>

        {/* CUERPO PRINCIPAL DEL EDITOR */}
        <div className="grid grid-cols-12 flex-1 min-h-0 overflow-hidden">
          {/* PANEL LATERAL IZQUIERDO: HERRAMIENTAS Y PLANTILLAS */}
          <div className="col-span-12 lg:col-span-4 xl:col-span-4 flex flex-col border-r border-gray-800 bg-gray-950/60 overflow-y-auto custom-scrollbar">
            {/* Pestañas del Panel Lateral */}
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
                <span>Textos</span>
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
                <span>Estilo</span>
              </button>
            </div>

            {/* CONTENIDO DE CADA PESTAÑA */}
            <div className="p-5 space-y-5">
              {/* PESTAÑA 1: PLANTILLAS (CAMBIO EN VIVO) */}
              {activeTab === "templates" && (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-gray-300">
                      Arquetipos Virales de LinkedIn
                    </h3>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Haz clic en cualquier diseño: tu texto y branding se adaptan al instante.
                    </p>
                  </div>

                  <div className="space-y-3">
                    {/* Plantilla 1: Cinematic Editorial */}
                    <button
                      type="button"
                      onClick={() => setSelectedTemplate("editorial")}
                      className={`w-full text-left p-3.5 rounded-xl border transition flex items-center gap-3.5 ${
                        selectedTemplate === "editorial"
                          ? "border-brand-500 bg-brand-500/10 ring-1 ring-brand-500/30"
                          : "border-gray-800 bg-gray-900/60 hover:border-gray-700 hover:bg-gray-800/50"
                      }`}
                    >
                      <div className="size-14 rounded-lg bg-gradient-to-t from-gray-950 via-gray-900/80 to-blue-900/40 border border-gray-700 flex flex-col justify-end p-1.5 shrink-0">
                        <div className="h-1.5 w-6 bg-brand-400 rounded-xs mb-1"></div>
                        <div className="h-1 w-10 bg-white/90 rounded-xs"></div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-bold text-white">Cinematic Editorial</p>
                          <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-sm">
                            Top Viral
                          </span>
                        </div>
                        <p className="text-xs text-gray-400 mt-1 line-clamp-2">
                          Foto envolvente + degradé oscuro + tipografía gigante. El estilo #1 en LinkedIn.
                        </p>
                      </div>
                    </button>

                    {/* Plantilla 2: Cita de Autoridad */}
                    <button
                      type="button"
                      onClick={() => setSelectedTemplate("authority_quote")}
                      className={`w-full text-left p-3.5 rounded-xl border transition flex items-center gap-3.5 ${
                        selectedTemplate === "authority_quote"
                          ? "border-brand-500 bg-brand-500/10 ring-1 ring-brand-500/30"
                          : "border-gray-800 bg-gray-900/60 hover:border-gray-700 hover:bg-gray-800/50"
                      }`}
                    >
                      <div className="size-14 rounded-lg bg-gray-950 border border-gray-700 flex items-center justify-center shrink-0 text-brand-400 text-3xl font-serif">
                        “
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-white">Cita de Autoridad</p>
                        <p className="text-xs text-gray-400 mt-1 line-clamp-2">
                          Comillas decorativas gigantes y frase destacada centrada para generar debate.
                        </p>
                      </div>
                    </button>

                    {/* Plantilla 3: Tarjeta Social / Feed */}
                    <button
                      type="button"
                      onClick={() => setSelectedTemplate("social_card")}
                      className={`w-full text-left p-3.5 rounded-xl border transition flex items-center gap-3.5 ${
                        selectedTemplate === "social_card"
                          ? "border-brand-500 bg-brand-500/10 ring-1 ring-brand-500/30"
                          : "border-gray-800 bg-gray-900/60 hover:border-gray-700 hover:bg-gray-800/50"
                      }`}
                    >
                      <div className="size-14 rounded-lg bg-gray-900 border border-gray-700 flex flex-col justify-center items-center p-2 shrink-0">
                        <div className="size-3.5 rounded-full bg-brand-400 mb-1"></div>
                        <div className="h-1 w-8 bg-gray-400 rounded-xs mb-1"></div>
                        <div className="h-1 w-6 bg-gray-600 rounded-xs"></div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-white">Tarjeta Social / Feed</p>
                        <p className="text-xs text-gray-400 mt-1 line-clamp-2">
                          Tarjeta flotante con sombra suave, avatar circular y check de verificación.
                        </p>
                      </div>
                    </button>

                    {/* Plantilla 4: Split Focus */}
                    <button
                      type="button"
                      onClick={() => setSelectedTemplate("split_focus")}
                      className={`w-full text-left p-3.5 rounded-xl border transition flex items-center gap-3.5 ${
                        selectedTemplate === "split_focus"
                          ? "border-brand-500 bg-brand-500/10 ring-1 ring-brand-500/30"
                          : "border-gray-800 bg-gray-900/60 hover:border-gray-700 hover:bg-gray-800/50"
                      }`}
                    >
                      <div className="size-14 rounded-lg overflow-hidden border border-gray-700 flex flex-col shrink-0">
                        <div className="h-1/2 bg-blue-950/60"></div>
                        <div className="h-1/2 bg-gray-950 border-t border-brand-500"></div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-white">Split Focus (50/50)</p>
                        <p className="text-xs text-gray-400 mt-1 line-clamp-2">
                          Mitad superior con fotografía y mitad inferior bloque oscuro con takeaways.
                        </p>
                      </div>
                    </button>

                    {/* Plantilla 5: Métrica de Alto Impacto */}
                    <button
                      type="button"
                      onClick={() => setSelectedTemplate("big_metric")}
                      className={`w-full text-left p-3.5 rounded-xl border transition flex items-center gap-3.5 ${
                        selectedTemplate === "big_metric"
                          ? "border-brand-500 bg-brand-500/10 ring-1 ring-brand-500/30"
                          : "border-gray-800 bg-gray-900/60 hover:border-gray-700 hover:bg-gray-800/50"
                      }`}
                    >
                      <div className="size-14 rounded-lg bg-gray-950 border border-gray-700 flex items-center justify-center shrink-0 text-brand-400 font-black text-sm">
                        +340%
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-white">Métrica de Alto Impacto</p>
                        <p className="text-xs text-gray-400 mt-1 line-clamp-2">
                          Número focal gigante en color de acento con explicación estratégica.
                        </p>
                      </div>
                    </button>
                  </div>
                </div>
              )}

              {/* PESTAÑA 2: CONTENIDO / TEXTOS */}
              {activeTab === "content" && (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-gray-300">
                      Editar Textos en Vivo
                    </h3>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Puedes modificar los campos aquí o hacer doble clic directamente en el lienzo.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-300 uppercase mb-1">
                      Categoría / Tag
                    </label>
                    <input
                      type="text"
                      value={categoryText}
                      onChange={(e) => setCategoryText(e.target.value)}
                      className="w-full rounded-lg border border-gray-700 bg-gray-900 px-3.5 py-2 text-xs text-white focus:border-brand-500 focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-300 uppercase mb-1">
                      Gran Titular Gancho
                    </label>
                    <textarea
                      rows={3}
                      value={titleText}
                      onChange={(e) => setTitleText(e.target.value)}
                      className="w-full rounded-lg border border-gray-700 bg-gray-900 p-3 text-xs text-white font-medium focus:border-brand-500 focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-300 uppercase mb-1">
                      Subtítulo o Puntos Clave
                    </label>
                    <textarea
                      rows={3}
                      value={subtitleText}
                      onChange={(e) => setSubtitleText(e.target.value)}
                      className="w-full rounded-lg border border-gray-700 bg-gray-900 p-3 text-xs text-gray-300 focus:border-brand-500 focus:outline-hidden"
                    />
                  </div>

                  {selectedTemplate === "big_metric" && (
                    <div>
                      <label className="block text-xs font-semibold text-gray-300 uppercase mb-1">
                        Métrica Principal (Número)
                      </label>
                      <input
                        type="text"
                        value={metricText}
                        onChange={(e) => setMetricText(e.target.value)}
                        className="w-full rounded-lg border border-gray-700 bg-gray-900 px-3.5 py-2 text-xs font-bold text-brand-400 focus:border-brand-500 focus:outline-hidden"
                      />
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <div>
                      <label className="block text-xs font-semibold text-gray-300 uppercase mb-1">
                        Nombre de Autor
                      </label>
                      <input
                        type="text"
                        value={nameText}
                        onChange={(e) => setNameText(e.target.value)}
                        className="w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-xs text-white focus:border-brand-500 focus:outline-hidden"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-300 uppercase mb-1">
                        Handle / Cargo
                      </label>
                      <input
                        type="text"
                        value={handleText}
                        onChange={(e) => setHandleText(e.target.value)}
                        className="w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-xs text-white focus:border-brand-500 focus:outline-hidden"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* PESTAÑA 3: FOTOS Y FONDOS */}
              {activeTab === "backgrounds" && (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-gray-300">
                      Fotografías Curadas de Alta Resolución
                    </h3>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Selecciona una imagen profesional para tu fondo:
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    {CURATED_BACKGROUNDS.map((bg) => (
                      <button
                        key={bg.id}
                        type="button"
                        onClick={() => setSelectedBgUrl(bg.url)}
                        className={`relative rounded-xl overflow-hidden border aspect-video group text-left transition ${
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
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex items-end p-2">
                          <span className="text-[11px] font-semibold text-white drop-shadow-sm">
                            {bg.name}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>

                  {/* Subir Imagen Propia */}
                  <div className="pt-2">
                    <label className="block text-xs font-semibold text-gray-300 uppercase mb-1.5">
                      O Sube tu Propia Fotografía
                    </label>
                    <label className="flex flex-col items-center justify-center border-2 border-dashed border-gray-700 rounded-xl p-4 cursor-pointer hover:border-brand-500/70 hover:bg-gray-900/60 transition">
                      <Upload className="size-6 text-gray-400 mb-1" />
                      <span className="text-xs font-medium text-gray-300">
                        Haz clic para seleccionar imagen (PNG, JPG)
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                    </label>
                  </div>

                  {/* Asistente de Prompt IA */}
                  <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-3.5 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-brand-400 flex items-center gap-1.5">
                        <Sparkles className="size-3.5" /> Prompt de Fondo para IA (DALL-E)
                      </span>
                      <button
                        type="button"
                        onClick={handleCopyPrompt}
                        className="text-[11px] font-semibold text-gray-300 bg-gray-800 border border-gray-700 px-2 py-0.5 rounded-md hover:bg-gray-700"
                      >
                        {copiedPrompt ? "¡Copiado!" : "Copiar Prompt"}
                      </button>
                    </div>
                    <p className="text-[11px] text-gray-400 font-mono leading-relaxed bg-gray-950 p-2 rounded-lg border border-gray-800">
                      {visualPrompt}
                    </p>
                  </div>
                </div>
              )}

              {/* PESTAÑA 4: ESTILO Y MARCA */}
              {activeTab === "brand" && (
                <div className="space-y-5">
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-gray-300">
                      Color de Acento de Marca
                    </h3>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Define el color de los ganchos, botones y marcos:
                    </p>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    {BRAND_COLORS.map((c) => (
                      <button
                        key={c.hex}
                        type="button"
                        onClick={() => setAccentColor(c.hex)}
                        className={`flex items-center gap-2 p-2 rounded-lg border transition ${
                          accentColor === c.hex
                            ? "border-brand-500 bg-gray-800"
                            : "border-gray-800 bg-gray-900 hover:border-gray-700"
                        }`}
                      >
                        <span
                          className="size-4 rounded-full border border-white/20 shrink-0"
                          style={{ backgroundColor: c.hex }}
                        ></span>
                        <span className="text-xs font-medium text-gray-200 truncate">
                          {c.name.split(" ")[0]}
                        </span>
                      </button>
                    ))}
                  </div>

                  {/* Slider de Intensidad de Sombra */}
                  <div className="space-y-2 pt-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-gray-300 uppercase">
                        Intensidad de Sombra / Degradé
                      </label>
                      <span className="text-xs font-mono text-brand-400">
                        {Math.round(overlayOpacity * 100)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0.3}
                      max={0.95}
                      step={0.05}
                      value={overlayOpacity}
                      onChange={(e) => setOverlayOpacity(parseFloat(e.target.value))}
                      className="w-full accent-brand-500 cursor-pointer"
                    />
                    <p className="text-[11px] text-gray-500">
                      Aumenta el degradé para que los textos en blanco resalten sin importar la foto.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ÁREA CENTRAL: LIENZO WYSIWYG (CANVAS) */}
          <div className="col-span-12 lg:col-span-8 xl:col-span-8 flex flex-col items-center justify-center p-4 sm:p-6 bg-slate-950 relative overflow-hidden">
            {/* Barra de Ayuda y Estado */}
            <div className="absolute top-4 left-6 z-10 flex items-center gap-2 bg-gray-900/90 backdrop-blur-md border border-gray-800 px-3 py-1.5 rounded-full shadow-lg">
              <span className="size-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="text-xs text-gray-300">
                {isRendering ? "Renderizando..." : "Lienzo interactivo: Haz doble clic en el texto para editar"}
              </span>
            </div>

            {/* Contenedor del Canvas con Escala Visual Responsiva */}
            <div className="relative flex items-center justify-center shadow-2xl rounded-xl border border-gray-800/80 bg-gray-900 overflow-hidden max-h-[75vh]">
              <div
                style={{
                  width: aspectRatio === "4:5" ? "420px" : "450px",
                  height: aspectRatio === "4:5" ? "525px" : "450px",
                  position: "relative",
                  transformOrigin: "top left",
                }}
                className="overflow-hidden bg-gray-950 flex items-center justify-center"
              >
                <canvas
                  ref={canvasElRef}
                  style={{
                    width: "100%",
                    height: "100%",
                    display: "block",
                  }}
                />
              </div>
            </div>

            {/* Guía inferior */}
            <div className="mt-4 flex items-center gap-4 text-xs text-gray-500">
              <span>Resolución de Exportación: {canvasWidth} x {canvasHeight} px</span>
              <span>•</span>
              <span>Vectorial & Nítido para Feed Móvil</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
