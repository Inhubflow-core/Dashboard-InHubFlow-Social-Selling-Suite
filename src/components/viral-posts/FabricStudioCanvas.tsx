"use client";

import React, {
  useEffect,
  useRef,
  useImperativeHandle,
  forwardRef,
  useState,
  useCallback,
} from "react";
import {
  Canvas,
  FabricImage,
  type FabricObject,
  Textbox,
  Rect,
  Circle,
  Line,
  Point,
} from "fabric";
import { customizeControls, getSelectionStyle } from "./fabric/fabricControls";
import type {
  ActiveObjectInfo,
  FabricCanvasEditorHandle,
  FabricObjectType,
} from "./fabric/fabricTypes";

export interface FabricStudioCanvasProps {
  aspectRatio: "4:5" | "1:1";
  accentColor?: string;
  authorName?: string;
  authorHandle?: string;
  onSelectObject?: (info: ActiveObjectInfo | null) => void;
  onCanvasModified?: () => void;
}

const CANVAS_WIDTH = 540;
const CANVAS_HEIGHT_4_5 = 675; // 540 * 1.25 = 675
const CANVAS_HEIGHT_1_1 = 540;

export const FabricStudioCanvas = forwardRef<
  FabricCanvasEditorHandle,
  FabricStudioCanvasProps
>(function FabricStudioCanvas(
  {
    aspectRatio,
    accentColor = "#0099ff",
    authorName = "Roberto InHubFlow",
    authorHandle = "@roberto.b2b",
    onSelectObject,
    onCanvasModified,
  },
  ref
) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasElRef = useRef<HTMLCanvasElement | null>(null);
  const fabricRef = useRef<Canvas | null>(null);

  const [isReady, setIsReady] = useState(false);
  const [bgDimmingVal, setBgDimmingVal] = useState(0);

  const targetHeight = aspectRatio === "4:5" ? CANVAS_HEIGHT_4_5 : CANVAS_HEIGHT_1_1;

  // Extrae información limpia de un objeto seleccionado en Fabric
  const getObjectInfo = useCallback(
    (obj: FabricObject | null): ActiveObjectInfo | null => {
      if (!obj) return null;

      const isText = obj instanceof Textbox;
      const isImg = obj instanceof FabricImage;
      const isRect = obj instanceof Rect;
      const isCirc = obj instanceof Circle;
      const isLin = obj instanceof Line;

      let type: FabricObjectType = "text";
      if (isImg) type = "image";
      else if (isRect) type = "rect";
      else if (isCirc) type = "circle";
      else if (isLin) type = "line";
      else if (isText) {
        const customType = (obj as any).customType;
        if (customType === "heading") type = "heading";
        else if (customType === "subheading") type = "subheading";
        else if (customType === "badge") type = "badge";
        else type = "text";
      }

      return {
        id: (obj as any).id || `obj-${Date.now()}`,
        type,
        text: isText ? (obj as Textbox).text : undefined,
        fontFamily: isText ? (obj as Textbox).fontFamily : undefined,
        fontSize: isText ? (obj as Textbox).fontSize : undefined,
        fontWeight: isText ? (obj as Textbox).fontWeight : undefined,
        fontStyle: isText ? (obj as Textbox).fontStyle : undefined,
        fill: typeof obj.fill === "string" ? obj.fill : undefined,
        stroke: typeof obj.stroke === "string" ? obj.stroke : undefined,
        strokeWidth: obj.strokeWidth,
        textAlign: isText ? (obj as Textbox).textAlign : undefined,
        opacity: obj.opacity,
        width: obj.width,
        height: obj.height,
        scaleX: obj.scaleX,
        scaleY: obj.scaleY,
        angle: obj.angle,
        isBackground: (obj as any).isBackground || false,
      };
    },
    []
  );

  // Inicialización del Canvas de Fabric
  useEffect(() => {
    if (!canvasElRef.current) return;

    // Crear instancia de Canvas Fabric
    const canvas = new Canvas(canvasElRef.current, {
      width: CANVAS_WIDTH,
      height: targetHeight,
      backgroundColor: "#ffffff", // Siempre blanco por defecto
      preserveObjectStacking: true,
      selection: true,
      stopContextMenu: true,
      fireRightClick: true,
      uniformScaling: true,
    });

    fabricRef.current = canvas;
    setIsReady(true);

    // Eventos de selección de objetos
    const handleSelection = () => {
      const active = canvas.getActiveObject();
      if (active) {
        customizeControls(active, accentColor);
        onSelectObject?.(getObjectInfo(active));
      } else {
        onSelectObject?.(null);
      }
    };

    const handleDeselection = () => {
      onSelectObject?.(null);
    };

    const handleModified = () => {
      onCanvasModified?.();
    };

    canvas.on("selection:created", handleSelection);
    canvas.on("selection:updated", handleSelection);
    canvas.on("selection:cleared", handleDeselection);
    canvas.on("object:modified", handleModified);
    canvas.on("object:added", (e) => {
      if (e.target) {
        customizeControls(e.target, accentColor);
      }
    });

    // Tecla Delete / Backspace para borrar objeto seleccionado
    const handleKeyDown = (e: KeyboardEvent) => {
      const active = canvas.getActiveObject();
      if (!active) return;

      // Si está en modo edición de texto, no borrar el objeto
      if (active instanceof Textbox && active.isEditing) {
        return;
      }

      if (e.key === "Delete" || e.key === "Backspace") {
        const targetTag = (e.target as HTMLElement)?.tagName?.toLowerCase();
        if (targetTag === "input" || targetTag === "textarea") return;

        e.preventDefault();
        canvas.remove(active);
        canvas.discardActiveObject();
        canvas.requestRenderAll();
        onSelectObject?.(null);
        onCanvasModified?.();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      canvas.dispose();
      fabricRef.current = null;
    };
  }, [accentColor, targetHeight, getObjectInfo, onSelectObject, onCanvasModified]);

  // Actualizar altura cuando cambia aspectRatio
  useEffect(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;

    canvas.setDimensions({
      width: CANVAS_WIDTH,
      height: targetHeight,
    });
    canvas.requestRenderAll();
  }, [targetHeight]);

  // Métodos imperativos para el VisualEditorModal
  useImperativeHandle(
    ref,
    () => ({
      addHeading: (text = "Tu Gran Titular Aquí") => {
        const canvas = fabricRef.current;
        if (!canvas) return;

        const heading = new Textbox(text, {
          left: CANVAS_WIDTH / 2,
          top: targetHeight * 0.35,
          originX: "center",
          originY: "center",
          width: CANVAS_WIDTH * 0.84,
          fontFamily: "Plus Jakarta Sans",
          fontSize: 32,
          fontWeight: 700,
          fill: "#0f172a",
          textAlign: "center",
          lineHeight: 1.2,
          editable: true,
          splitByGrapheme: false,
        });

        (heading as any).customType = "heading";
        (heading as any).id = `heading-${Date.now()}`;
        customizeControls(heading, accentColor);

        canvas.add(heading);
        canvas.setActiveObject(heading);
        canvas.requestRenderAll();
        onSelectObject?.(getObjectInfo(heading));
        onCanvasModified?.();
      },

      addSubheading: (text = "Subtítulo explicativo de alto impacto para tu audiencia B2B") => {
        const canvas = fabricRef.current;
        if (!canvas) return;

        const sub = new Textbox(text, {
          left: CANVAS_WIDTH / 2,
          top: targetHeight * 0.5,
          originX: "center",
          originY: "center",
          width: CANVAS_WIDTH * 0.8,
          fontFamily: "Inter",
          fontSize: 18,
          fontWeight: 500,
          fill: "#475569",
          textAlign: "center",
          lineHeight: 1.3,
          editable: true,
        });

        (sub as any).customType = "subheading";
        (sub as any).id = `subheading-${Date.now()}`;
        customizeControls(sub, accentColor);

        canvas.add(sub);
        canvas.setActiveObject(sub);
        canvas.requestRenderAll();
        onSelectObject?.(getObjectInfo(sub));
        onCanvasModified?.();
      },

      addBodyText: (text = "Haz doble clic para escribir tu texto explicativo o viñetas...") => {
        const canvas = fabricRef.current;
        if (!canvas) return;

        const body = new Textbox(text, {
          left: CANVAS_WIDTH / 2,
          top: targetHeight * 0.6,
          originX: "center",
          originY: "center",
          width: CANVAS_WIDTH * 0.75,
          fontFamily: "Inter",
          fontSize: 14,
          fontWeight: 400,
          fill: "#64748b",
          textAlign: "center",
          lineHeight: 1.4,
          editable: true,
        });

        (body as any).customType = "body";
        (body as any).id = `body-${Date.now()}`;
        customizeControls(body, accentColor);

        canvas.add(body);
        canvas.setActiveObject(body);
        canvas.requestRenderAll();
        onSelectObject?.(getObjectInfo(body));
        onCanvasModified?.();
      },

      addPhoto: async (url: string, asBackground = false) => {
        const canvas = fabricRef.current;
        if (!canvas) return;

        try {
          const img = await FabricImage.fromURL(url, { crossOrigin: "anonymous" });
          const naturalW = img.width || 1;
          const naturalH = img.height || 1;

          if (asBackground) {
            // Ajustar para cubrir el lienzo como fondo
            const scale = Math.max(CANVAS_WIDTH / naturalW, targetHeight / naturalH);
            img.set({
              left: CANVAS_WIDTH / 2,
              top: targetHeight / 2,
              originX: "center",
              originY: "center",
              scaleX: scale,
              scaleY: scale,
              selectable: true, // Se puede seleccionar y mover
              evented: true,
            });
            (img as any).isBackground = true;
            (img as any).id = "bg-photo";
            customizeControls(img, accentColor);

            // Enviar al fondo
            canvas.insertAt(0, img);
            canvas.setActiveObject(img);
          } else {
            // Foto como elemento regular centrado
            const maxDimension = Math.min(CANVAS_WIDTH * 0.7, targetHeight * 0.5);
            const scale = Math.min(maxDimension / naturalW, maxDimension / naturalH);

            img.set({
              left: CANVAS_WIDTH / 2,
              top: targetHeight / 2,
              originX: "center",
              originY: "center",
              scaleX: scale,
              scaleY: scale,
              cornerSize: 10,
              cornerStyle: "circle",
            });
            (img as any).id = `photo-${Date.now()}`;
            customizeControls(img, accentColor);

            canvas.add(img);
            canvas.setActiveObject(img);
          }

          canvas.requestRenderAll();
          onSelectObject?.(getObjectInfo(img));
          onCanvasModified?.();
        } catch (err) {
          console.error("Error al cargar imagen en Fabric:", err);
        }
      },

      addRect: (opts = {}) => {
        const canvas = fabricRef.current;
        if (!canvas) return;

        const rect = new Rect({
          left: CANVAS_WIDTH / 2,
          top: targetHeight / 2,
          originX: "center",
          originY: "center",
          width: opts.width || 220,
          height: opts.height || 140,
          fill: opts.fill || accentColor,
          rx: opts.rx ?? 14,
          ry: opts.ry ?? 14,
          strokeUniform: true,
        });

        (rect as any).id = `rect-${Date.now()}`;
        customizeControls(rect, accentColor);

        canvas.add(rect);
        canvas.setActiveObject(rect);
        canvas.requestRenderAll();
        onSelectObject?.(getObjectInfo(rect));
        onCanvasModified?.();
      },

      addCircle: (opts = {}) => {
        const canvas = fabricRef.current;
        if (!canvas) return;

        const circle = new Circle({
          left: CANVAS_WIDTH / 2,
          top: targetHeight / 2,
          originX: "center",
          originY: "center",
          radius: opts.radius || 60,
          fill: opts.fill || accentColor,
          strokeUniform: true,
        });

        (circle as any).id = `circle-${Date.now()}`;
        customizeControls(circle, accentColor);

        canvas.add(circle);
        canvas.setActiveObject(circle);
        canvas.requestRenderAll();
        onSelectObject?.(getObjectInfo(circle));
        onCanvasModified?.();
      },

      addLine: (opts = {}) => {
        const canvas = fabricRef.current;
        if (!canvas) return;

        const line = new Line([50, targetHeight / 2, CANVAS_WIDTH - 50, targetHeight / 2], {
          stroke: opts.stroke || accentColor,
          strokeWidth: opts.strokeWidth || 4,
          strokeUniform: true,
        });

        (line as any).id = `line-${Date.now()}`;
        customizeControls(line, accentColor);

        canvas.add(line);
        canvas.setActiveObject(line);
        canvas.requestRenderAll();
        onSelectObject?.(getObjectInfo(line));
        onCanvasModified?.();
      },

      addBadge: (text, bgColor = accentColor, textColor = "#ffffff") => {
        const canvas = fabricRef.current;
        if (!canvas) return;

        const badge = new Textbox(text.toUpperCase(), {
          left: CANVAS_WIDTH / 2,
          top: targetHeight * 0.15,
          originX: "center",
          originY: "center",
          width: 220,
          fontFamily: "Inter",
          fontSize: 12,
          fontWeight: 700,
          fill: textColor,
          backgroundColor: bgColor,
          textAlign: "center",
          padding: 8,
          editable: true,
        });

        (badge as any).customType = "badge";
        (badge as any).id = `badge-${Date.now()}`;
        customizeControls(badge, accentColor);

        canvas.add(badge);
        canvas.setActiveObject(badge);
        canvas.requestRenderAll();
        onSelectObject?.(getObjectInfo(badge));
        onCanvasModified?.();
      },

      updateActiveObject: (props) => {
        const canvas = fabricRef.current;
        if (!canvas) return;

        const active = canvas.getActiveObject();
        if (!active) return;

        const updates: Record<string, any> = {};

        if (props.text !== undefined && active instanceof Textbox) {
          active.set("text", props.text);
        }
        if (props.fontFamily !== undefined && active instanceof Textbox) {
          updates.fontFamily = props.fontFamily;
        }
        if (props.fontSize !== undefined && active instanceof Textbox) {
          updates.fontSize = props.fontSize;
        }
        if (props.fontWeight !== undefined && active instanceof Textbox) {
          updates.fontWeight = props.fontWeight;
        }
        if (props.fontStyle !== undefined && active instanceof Textbox) {
          updates.fontStyle = props.fontStyle;
        }
        if (props.textAlign !== undefined && active instanceof Textbox) {
          updates.textAlign = props.textAlign;
        }
        if (props.fill !== undefined) {
          updates.fill = props.fill;
        }
        if (props.stroke !== undefined) {
          updates.stroke = props.stroke;
        }
        if (props.strokeWidth !== undefined) {
          updates.strokeWidth = props.strokeWidth;
        }
        if (props.opacity !== undefined) {
          updates.opacity = props.opacity;
        }

        active.set(updates);
        canvas.requestRenderAll();
        onSelectObject?.(getObjectInfo(active));
        onCanvasModified?.();
      },

      duplicateActiveObject: () => {
        const canvas = fabricRef.current;
        if (!canvas) return;

        const active = canvas.getActiveObject();
        if (!active) return;

        active.clone().then((cloned: FabricObject) => {
          cloned.set({
            left: (active.left || 0) + 20,
            top: (active.top || 0) + 20,
            evented: true,
          });
          (cloned as any).id = `copy-${Date.now()}`;
          customizeControls(cloned, accentColor);
          canvas.add(cloned);
          canvas.setActiveObject(cloned);
          canvas.requestRenderAll();
          onSelectObject?.(getObjectInfo(cloned));
          onCanvasModified?.();
        });
      },

      deleteActiveObject: () => {
        const canvas = fabricRef.current;
        if (!canvas) return;

        const active = canvas.getActiveObject();
        if (!active) return;

        canvas.remove(active);
        canvas.discardActiveObject();
        canvas.requestRenderAll();
        onSelectObject?.(null);
        onCanvasModified?.();
      },

      bringForward: () => {
        const canvas = fabricRef.current;
        if (!canvas) return;

        const active = canvas.getActiveObject();
        if (!active) return;

        canvas.bringObjectForward(active);
        canvas.requestRenderAll();
        onCanvasModified?.();
      },

      sendBackward: () => {
        const canvas = fabricRef.current;
        if (!canvas) return;

        const active = canvas.getActiveObject();
        if (!active) return;

        canvas.sendObjectBackwards(active);
        canvas.requestRenderAll();
        onCanvasModified?.();
      },

      setBackgroundColor: (color: string) => {
        const canvas = fabricRef.current;
        if (!canvas) return;

        canvas.backgroundColor = color;
        canvas.requestRenderAll();
        onCanvasModified?.();
      },

      setBackgroundPhoto: async (url: string) => {
        const canvas = fabricRef.current;
        if (!canvas) return;

        try {
          // Remover fondo previo si existe
          const objects = canvas.getObjects();
          const oldBg = objects.find((o) => (o as any).isBackground);
          if (oldBg) canvas.remove(oldBg);

          const img = await FabricImage.fromURL(url, { crossOrigin: "anonymous" });
          const naturalW = img.width || 1;
          const naturalH = img.height || 1;
          const scale = Math.max(CANVAS_WIDTH / naturalW, targetHeight / naturalH);

          img.set({
            left: CANVAS_WIDTH / 2,
            top: targetHeight / 2,
            originX: "center",
            originY: "center",
            scaleX: scale,
            scaleY: scale,
            selectable: true,
            evented: true,
          });

          (img as any).isBackground = true;
          (img as any).id = "bg-photo";
          customizeControls(img, accentColor);

          canvas.insertAt(0, img);
          canvas.requestRenderAll();
          onCanvasModified?.();
        } catch (err) {
          console.error("Error al establecer foto de fondo:", err);
        }
      },

      clearBackgroundPhoto: () => {
        const canvas = fabricRef.current;
        if (!canvas) return;

        const objects = canvas.getObjects();
        const oldBg = objects.find((o) => (o as any).isBackground);
        if (oldBg) {
          canvas.remove(oldBg);
          canvas.requestRenderAll();
          onCanvasModified?.();
        }
      },

      setFilterDimming: (percent: number) => {
        setBgDimmingVal(percent);
        const canvas = fabricRef.current;
        if (!canvas) return;

        const objects = canvas.getObjects();
        const bgPhoto = objects.find((o) => (o as any).isBackground);
        if (bgPhoto) {
          // Ajustar opacidad según el dimming
          bgPhoto.set("opacity", Math.max(0.2, 1 - percent / 150));
          canvas.requestRenderAll();
          onCanvasModified?.();
        }
      },

      exportToDataUrl: (multiplier = 2) => {
        const canvas = fabricRef.current;
        if (!canvas) return "";

        // Deseleccionar para que no aparezcan las manijas en la exportación
        canvas.discardActiveObject();
        canvas.renderAll();

        return canvas.toDataURL({
          format: "png",
          multiplier,
          enableRetinaScaling: true,
        });
      },

      getActiveObjectInfo: () => {
        const canvas = fabricRef.current;
        if (!canvas) return null;
        return getObjectInfo(canvas.getActiveObject());
      },

      loadTemplate: async (templateId: string, data: any) => {
        const canvas = fabricRef.current;
        if (!canvas) return;

        // Limpiar objetos
        canvas.clear();
        canvas.backgroundColor = "#ffffff"; // 100% fondo blanco limpio

        const titleText = data.title || "5 Errores que Arruinan tus Conversiones en LinkedIn";
        const subtitleText = data.subtitle || "Framework probado para líderes B2B y fundadores de alto impacto";
        const categoryText = data.category || "SOCIAL SELLING B2B";
        const authorText = `${authorName} · ${authorHandle}`;

        if (templateId === "blank") {
          canvas.requestRenderAll();
          onCanvasModified?.();
          return;
        }

        if (templateId === "editorial") {
          // 1. Tarjeta sutil
          const card = new Rect({
            left: CANVAS_WIDTH / 2,
            top: targetHeight * 0.52,
            originX: "center",
            originY: "center",
            width: CANVAS_WIDTH * 0.88,
            height: targetHeight * 0.72,
            fill: "#ffffff",
            stroke: "#e2e8f0",
            strokeWidth: 1.5,
            rx: 20,
            ry: 20,
          });
          customizeControls(card, accentColor);
          canvas.add(card);

          // 2. Badge de Categoría
          const badge = new Textbox(categoryText.toUpperCase(), {
            left: CANVAS_WIDTH / 2,
            top: targetHeight * 0.24,
            originX: "center",
            originY: "center",
            width: 220,
            fontFamily: "Inter",
            fontSize: 11,
            fontWeight: 800,
            fill: accentColor,
            textAlign: "center",
            editable: true,
          });
          (badge as any).customType = "badge";
          customizeControls(badge, accentColor);
          canvas.add(badge);

          // 3. Título Principal
          const title = new Textbox(titleText, {
            left: CANVAS_WIDTH / 2,
            top: targetHeight * 0.44,
            originX: "center",
            originY: "center",
            width: CANVAS_WIDTH * 0.76,
            fontFamily: "Plus Jakarta Sans",
            fontSize: 28,
            fontWeight: 800,
            fill: "#0f172a",
            textAlign: "center",
            lineHeight: 1.25,
            editable: true,
          });
          (title as any).customType = "heading";
          customizeControls(title, accentColor);
          canvas.add(title);

          // 4. Subtítulo
          const sub = new Textbox(subtitleText, {
            left: CANVAS_WIDTH / 2,
            top: targetHeight * 0.65,
            originX: "center",
            originY: "center",
            width: CANVAS_WIDTH * 0.72,
            fontFamily: "Inter",
            fontSize: 15,
            fontWeight: 500,
            fill: "#475569",
            textAlign: "center",
            lineHeight: 1.4,
            editable: true,
          });
          (sub as any).customType = "subheading";
          customizeControls(sub, accentColor);
          canvas.add(sub);

          // 5. Autor
          const author = new Textbox(authorText, {
            left: CANVAS_WIDTH / 2,
            top: targetHeight * 0.8,
            originX: "center",
            originY: "center",
            width: CANVAS_WIDTH * 0.7,
            fontFamily: "Inter",
            fontSize: 13,
            fontWeight: 600,
            fill: "#64748b",
            textAlign: "center",
            editable: true,
          });
          customizeControls(author, accentColor);
          canvas.add(author);
        } else if (templateId === "authority_quote") {
          // Cita de Autoridad
          const quoteMark = new Textbox("“", {
            left: CANVAS_WIDTH / 2,
            top: targetHeight * 0.22,
            originX: "center",
            originY: "center",
            width: 80,
            fontFamily: "Georgia",
            fontSize: 72,
            fontWeight: 900,
            fill: accentColor,
            textAlign: "center",
            editable: false,
          });
          customizeControls(quoteMark, accentColor);
          canvas.add(quoteMark);

          const quoteText = new Textbox(`"${titleText}"`, {
            left: CANVAS_WIDTH / 2,
            top: targetHeight * 0.46,
            originX: "center",
            originY: "center",
            width: CANVAS_WIDTH * 0.8,
            fontFamily: "Plus Jakarta Sans",
            fontSize: 26,
            fontWeight: 700,
            fontStyle: "italic",
            fill: "#0f172a",
            textAlign: "center",
            lineHeight: 1.3,
            editable: true,
          });
          customizeControls(quoteText, accentColor);
          canvas.add(quoteText);

          const sub = new Textbox(subtitleText, {
            left: CANVAS_WIDTH / 2,
            top: targetHeight * 0.68,
            originX: "center",
            originY: "center",
            width: CANVAS_WIDTH * 0.75,
            fontFamily: "Inter",
            fontSize: 15,
            fill: "#475569",
            textAlign: "center",
            editable: true,
          });
          customizeControls(sub, accentColor);
          canvas.add(sub);

          const author = new Textbox(`— ${authorText}`, {
            left: CANVAS_WIDTH / 2,
            top: targetHeight * 0.82,
            originX: "center",
            originY: "center",
            width: CANVAS_WIDTH * 0.7,
            fontFamily: "Inter",
            fontSize: 14,
            fontWeight: 700,
            fill: accentColor,
            textAlign: "center",
            editable: true,
          });
          customizeControls(author, accentColor);
          canvas.add(author);
        } else if (templateId === "big_metric") {
          // Métrica de Alto Impacto
          const metric = new Textbox(data.metric || "+340%", {
            left: CANVAS_WIDTH / 2,
            top: targetHeight * 0.3,
            originX: "center",
            originY: "center",
            width: CANVAS_WIDTH * 0.8,
            fontFamily: "Plus Jakarta Sans",
            fontSize: 76,
            fontWeight: 900,
            fill: accentColor,
            textAlign: "center",
            editable: true,
          });
          customizeControls(metric, accentColor);
          canvas.add(metric);

          const metricLabel = new Textbox("TASA DE CONVERSIÓN B2B", {
            left: CANVAS_WIDTH / 2,
            top: targetHeight * 0.44,
            originX: "center",
            originY: "center",
            width: CANVAS_WIDTH * 0.7,
            fontFamily: "Inter",
            fontSize: 12,
            fontWeight: 800,
            fill: "#64748b",
            textAlign: "center",
            editable: true,
          });
          customizeControls(metricLabel, accentColor);
          canvas.add(metricLabel);

          const title = new Textbox(titleText, {
            left: CANVAS_WIDTH / 2,
            top: targetHeight * 0.6,
            originX: "center",
            originY: "center",
            width: CANVAS_WIDTH * 0.8,
            fontFamily: "Plus Jakarta Sans",
            fontSize: 24,
            fontWeight: 800,
            fill: "#0f172a",
            textAlign: "center",
            lineHeight: 1.3,
            editable: true,
          });
          customizeControls(title, accentColor);
          canvas.add(title);

          const author = new Textbox(authorText, {
            left: CANVAS_WIDTH / 2,
            top: targetHeight * 0.82,
            originX: "center",
            originY: "center",
            width: CANVAS_WIDTH * 0.7,
            fontFamily: "Inter",
            fontSize: 13,
            fontWeight: 600,
            fill: "#64748b",
            textAlign: "center",
            editable: true,
          });
          customizeControls(author, accentColor);
          canvas.add(author);
        } else if (templateId === "social_card") {
          // Tarjeta Social Feed
          const card = new Rect({
            left: CANVAS_WIDTH / 2,
            top: targetHeight * 0.5,
            originX: "center",
            originY: "center",
            width: CANVAS_WIDTH * 0.86,
            height: targetHeight * 0.76,
            fill: "#ffffff",
            stroke: "#e2e8f0",
            strokeWidth: 2,
            rx: 16,
            ry: 16,
          });
          customizeControls(card, accentColor);
          canvas.add(card);

          const header = new Textbox(`${authorName}  ✔\n${authorHandle} · 1er`, {
            left: CANVAS_WIDTH / 2,
            top: targetHeight * 0.24,
            originX: "center",
            originY: "center",
            width: CANVAS_WIDTH * 0.72,
            fontFamily: "Inter",
            fontSize: 14,
            fontWeight: 700,
            fill: "#0f172a",
            textAlign: "left",
            lineHeight: 1.3,
            editable: true,
          });
          customizeControls(header, accentColor);
          canvas.add(header);

          const postBody = new Textbox(`${titleText}\n\n${subtitleText}`, {
            left: CANVAS_WIDTH / 2,
            top: targetHeight * 0.52,
            originX: "center",
            originY: "center",
            width: CANVAS_WIDTH * 0.72,
            fontFamily: "Inter",
            fontSize: 16,
            fontWeight: 500,
            fill: "#1e293b",
            textAlign: "left",
            lineHeight: 1.45,
            editable: true,
          });
          customizeControls(postBody, accentColor);
          canvas.add(postBody);

          const metrics = new Textbox("❤️ 428   💬 89   🔄 34", {
            left: CANVAS_WIDTH / 2,
            top: targetHeight * 0.8,
            originX: "center",
            originY: "center",
            width: CANVAS_WIDTH * 0.72,
            fontFamily: "Inter",
            fontSize: 14,
            fontWeight: 600,
            fill: "#64748b",
            textAlign: "left",
            editable: true,
          });
          customizeControls(metrics, accentColor);
          canvas.add(metrics);
        } else {
          // bold_highlighter o default
          const title = new Textbox(titleText, {
            left: CANVAS_WIDTH / 2,
            top: targetHeight * 0.38,
            originX: "center",
            originY: "center",
            width: CANVAS_WIDTH * 0.8,
            fontFamily: "Plus Jakarta Sans",
            fontSize: 30,
            fontWeight: 900,
            fill: "#0f172a",
            textAlign: "center",
            lineHeight: 1.25,
            editable: true,
          });
          customizeControls(title, accentColor);
          canvas.add(title);

          const sub = new Textbox(subtitleText, {
            left: CANVAS_WIDTH / 2,
            top: targetHeight * 0.6,
            originX: "center",
            originY: "center",
            width: CANVAS_WIDTH * 0.75,
            fontFamily: "Inter",
            fontSize: 16,
            fontWeight: 500,
            fill: "#475569",
            textAlign: "center",
            lineHeight: 1.4,
            editable: true,
          });
          customizeControls(sub, accentColor);
          canvas.add(sub);

          const author = new Textbox(authorText, {
            left: CANVAS_WIDTH / 2,
            top: targetHeight * 0.82,
            originX: "center",
            originY: "center",
            width: CANVAS_WIDTH * 0.7,
            fontFamily: "Inter",
            fontSize: 13,
            fontWeight: 600,
            fill: "#64748b",
            textAlign: "center",
            editable: true,
          });
          customizeControls(author, accentColor);
          canvas.add(author);
        }

        canvas.requestRenderAll();
        onCanvasModified?.();
      },
    }),
    [
      accentColor,
      targetHeight,
      authorName,
      authorHandle,
      getObjectInfo,
      onSelectObject,
      onCanvasModified,
    ]
  );

  return (
    <div
      ref={containerRef}
      className="relative flex items-center justify-center shadow-2xl rounded-xl overflow-hidden transition-all duration-200 border border-slate-700/60 bg-white"
      style={{
        width: "100%",
        maxWidth: "432px",
        aspectRatio: aspectRatio === "4:5" ? "4/5" : "1/1",
      }}
    >
      <canvas
        ref={canvasElRef}
        className="w-full h-full block"
        style={{ touchAction: "none" }}
      />
    </div>
  );
});
