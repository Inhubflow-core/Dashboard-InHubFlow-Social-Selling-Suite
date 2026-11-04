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
} from "fabric";
import { customizeControls } from "./fabric/fabricControls";
import { CropSession } from "./fabric/fabricCrop";
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

/**
 * Carga una imagen de forma segura en Fabric.js probando primero acceso directo
 * y aplicando fallback inmediato a través del proxy local (/api/proxy-image)
 * para garantizar bypass total de restricciones CORS o hotlinking.
 */
async function loadFabricImage(url: string): Promise<FabricImage> {
  if (!url) throw new Error("URL de imagen vacía");

  // 1. Data URLs y blobs
  if (url.startsWith("data:") || url.startsWith("blob:")) {
    return await FabricImage.fromURL(url, { crossOrigin: "anonymous" });
  }

  // 2. Intentar cargar con proxy directamente para evitar CORS en el canvas HTML5
  const proxyUrl = `/api/proxy-image?url=${encodeURIComponent(url)}`;
  try {
    return await FabricImage.fromURL(proxyUrl, { crossOrigin: "anonymous" });
  } catch (proxyErr) {
    // 3. Fallback directo si el endpoint proxy tiene alguna interrupción
    return await FabricImage.fromURL(url, { crossOrigin: "anonymous" });
  }
}

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
  const cropSessionRef = useRef<CropSession | null>(null);

  // Mantener referencias actualizadas de props para no recrear el canvas en cada render
  const accentColorRef = useRef(accentColor);
  accentColorRef.current = accentColor;

  const targetHeight = aspectRatio === "4:5" ? CANVAS_HEIGHT_4_5 : CANVAS_HEIGHT_1_1;
  const targetHeightRef = useRef(targetHeight);
  targetHeightRef.current = targetHeight;

  const callbacksRef = useRef({ onSelectObject, onCanvasModified });
  callbacksRef.current = { onSelectObject, onCanvasModified };

  const [bgDimmingVal, setBgDimmingVal] = useState(0);

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

  // INICIALIZACIÓN DEL CANVAS DE FABRIC - SE EJECUTA ÚNICAMENTE AL MONTAR
  useEffect(() => {
    if (!canvasElRef.current) return;

    // Crear instancia permanente de Canvas Fabric
    const canvas = new Canvas(canvasElRef.current, {
      width: CANVAS_WIDTH,
      height: targetHeightRef.current,
      backgroundColor: "#ffffff", // Siempre blanco puro por defecto
      preserveObjectStacking: true,
      selection: true,
      stopContextMenu: true,
      fireRightClick: true,
      uniformScaling: true,
    });

    fabricRef.current = canvas;

    // Eventos de selección de objetos
    const handleSelection = () => {
      const active = canvas.getActiveObject();
      if (active) {
        customizeControls(active, accentColorRef.current);
        callbacksRef.current.onSelectObject?.(getObjectInfo(active));
      } else {
        callbacksRef.current.onSelectObject?.(null);
      }
    };

    const handleDeselection = () => {
      callbacksRef.current.onSelectObject?.(null);
    };

    const handleModified = () => {
      callbacksRef.current.onCanvasModified?.();
    };

    canvas.on("selection:created", handleSelection);
    canvas.on("selection:updated", handleSelection);
    canvas.on("selection:cleared", handleDeselection);
    canvas.on("object:modified", handleModified);
    canvas.on("object:added", (e) => {
      if (e.target) {
        customizeControls(e.target, accentColorRef.current);
      }
    });

    // Doble clic en imagen para entrar en modo recorte interactivo (Doory CropSession)
    const handleDblClick = async (e: any) => {
      const target = e.target;
      if (target && target instanceof FabricImage && !cropSessionRef.current) {
        try {
          cropSessionRef.current = await CropSession.start(
            canvas,
            target,
            accentColorRef.current,
            () => {
              cropSessionRef.current = null;
              callbacksRef.current.onCanvasModified?.();
            }
          );
        } catch (err) {
          console.error("Error al iniciar CropSession por doble clic:", err);
        }
      }
    };
    canvas.on("mouse:dblclick", handleDblClick);

    // Tecla Delete / Backspace para borrar objeto seleccionado, Enter / Esc para modo recorte
    const handleKeyDown = (e: KeyboardEvent) => {
      // Atajos de modo recorte
      if (cropSessionRef.current) {
        if (e.key === "Enter") {
          e.preventDefault();
          cropSessionRef.current.apply();
          cropSessionRef.current = null;
          callbacksRef.current.onCanvasModified?.();
          return;
        }
        if (e.key === "Escape") {
          e.preventDefault();
          cropSessionRef.current.cancel();
          cropSessionRef.current = null;
          callbacksRef.current.onCanvasModified?.();
          return;
        }
      }

      const active = canvas.getActiveObject();
      if (!active) return;

      // Si está en modo edición inline de texto, permitir escribir/borrar caracteres
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
        callbacksRef.current.onSelectObject?.(null);
        callbacksRef.current.onCanvasModified?.();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      canvas.dispose();
      fabricRef.current = null;
    };
  }, [getObjectInfo]); // Array estático de dependencias: NUNCA se destruye por cambios de estado externos

  // Actualizar dimensiones suavemente cuando cambia aspectRatio (sin destruir el lienzo)
  useEffect(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;

    canvas.setDimensions({
      width: CANVAS_WIDTH,
      height: targetHeight,
    });
    canvas.requestRenderAll();
  }, [targetHeight]);

  // MÉTODOS IMPERATIVOS EXPUESTOS HACIA VisualEditorModal
  useImperativeHandle(
    ref,
    () => ({
      addHeading: (text = "Tu Gran Titular Aquí") => {
        const canvas = fabricRef.current;
        if (!canvas) return;

        const heading = new Textbox(text, {
          left: CANVAS_WIDTH / 2,
          top: targetHeightRef.current * 0.35,
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
        customizeControls(heading, accentColorRef.current);

        canvas.add(heading);
        canvas.setActiveObject(heading);
        canvas.requestRenderAll();
        callbacksRef.current.onSelectObject?.(getObjectInfo(heading));
        callbacksRef.current.onCanvasModified?.();
      },

      addSubheading: (text = "Subtítulo explicativo de alto impacto para tu audiencia B2B") => {
        const canvas = fabricRef.current;
        if (!canvas) return;

        const sub = new Textbox(text, {
          left: CANVAS_WIDTH / 2,
          top: targetHeightRef.current * 0.5,
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
        customizeControls(sub, accentColorRef.current);

        canvas.add(sub);
        canvas.setActiveObject(sub);
        canvas.requestRenderAll();
        callbacksRef.current.onSelectObject?.(getObjectInfo(sub));
        callbacksRef.current.onCanvasModified?.();
      },

      addBodyText: (text = "Haz doble clic para escribir tu texto explicativo o viñetas...") => {
        const canvas = fabricRef.current;
        if (!canvas) return;

        const body = new Textbox(text, {
          left: CANVAS_WIDTH / 2,
          top: targetHeightRef.current * 0.6,
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
        customizeControls(body, accentColorRef.current);

        canvas.add(body);
        canvas.setActiveObject(body);
        canvas.requestRenderAll();
        callbacksRef.current.onSelectObject?.(getObjectInfo(body));
        callbacksRef.current.onCanvasModified?.();
      },

      addPhoto: async (url: string, asBackground = false) => {
        const canvas = fabricRef.current;
        if (!canvas) return;

        try {
          const img = await loadFabricImage(url);
          const naturalW = img.width || 1;
          const naturalH = img.height || 1;
          const curH = targetHeightRef.current;

          if (asBackground) {
            // Ajustar para cubrir todo el lienzo como fondo
            const scale = Math.max(CANVAS_WIDTH / naturalW, curH / naturalH);
            img.set({
              left: CANVAS_WIDTH / 2,
              top: curH / 2,
              originX: "center",
              originY: "center",
              scaleX: scale,
              scaleY: scale,
              selectable: true,
              evented: true,
            });
            (img as any).isBackground = true;
            (img as any).id = "bg-photo";
            customizeControls(img, accentColorRef.current);

            // Insertar al fondo
            canvas.add(img);
            canvas.sendObjectToBack(img);
            canvas.setActiveObject(img);
          } else {
            // Foto como elemento regular centrado
            const maxDimension = Math.min(CANVAS_WIDTH * 0.75, curH * 0.55);
            const scale = Math.min(maxDimension / naturalW, maxDimension / naturalH);

            img.set({
              left: CANVAS_WIDTH / 2,
              top: curH / 2,
              originX: "center",
              originY: "center",
              scaleX: scale,
              scaleY: scale,
              lockUniScaling: true,
            });
            (img as any).id = `photo-${Date.now()}`;
            customizeControls(img, accentColorRef.current);

            canvas.add(img);
            canvas.setActiveObject(img);
          }

          canvas.requestRenderAll();
          callbacksRef.current.onSelectObject?.(getObjectInfo(img));
          callbacksRef.current.onCanvasModified?.();
        } catch (err) {
          console.error("Error al cargar imagen en Fabric:", err);
        }
      },

      addRect: (opts = {}) => {
        const canvas = fabricRef.current;
        if (!canvas) return;

        const rect = new Rect({
          left: CANVAS_WIDTH / 2,
          top: targetHeightRef.current / 2,
          originX: "center",
          originY: "center",
          width: opts.width || 220,
          height: opts.height || 140,
          fill: opts.fill || accentColorRef.current,
          rx: opts.rx ?? 14,
          ry: opts.ry ?? 14,
          strokeUniform: true,
        });

        (rect as any).id = `rect-${Date.now()}`;
        customizeControls(rect, accentColorRef.current);

        canvas.add(rect);
        canvas.setActiveObject(rect);
        canvas.requestRenderAll();
        callbacksRef.current.onSelectObject?.(getObjectInfo(rect));
        callbacksRef.current.onCanvasModified?.();
      },

      addCircle: (opts = {}) => {
        const canvas = fabricRef.current;
        if (!canvas) return;

        const circle = new Circle({
          left: CANVAS_WIDTH / 2,
          top: targetHeightRef.current / 2,
          originX: "center",
          originY: "center",
          radius: opts.radius || 60,
          fill: opts.fill || accentColorRef.current,
          strokeUniform: true,
        });

        (circle as any).id = `circle-${Date.now()}`;
        customizeControls(circle, accentColorRef.current);

        canvas.add(circle);
        canvas.setActiveObject(circle);
        canvas.requestRenderAll();
        callbacksRef.current.onSelectObject?.(getObjectInfo(circle));
        callbacksRef.current.onCanvasModified?.();
      },

      addLine: (opts = {}) => {
        const canvas = fabricRef.current;
        if (!canvas) return;

        const line = new Line([50, targetHeightRef.current / 2, CANVAS_WIDTH - 50, targetHeightRef.current / 2], {
          stroke: opts.stroke || accentColorRef.current,
          strokeWidth: opts.strokeWidth || 4,
          strokeUniform: true,
        });

        (line as any).id = `line-${Date.now()}`;
        customizeControls(line, accentColorRef.current);

        canvas.add(line);
        canvas.setActiveObject(line);
        canvas.requestRenderAll();
        callbacksRef.current.onSelectObject?.(getObjectInfo(line));
        callbacksRef.current.onCanvasModified?.();
      },

      addBadge: (text, bgColor, textColor = "#ffffff") => {
        const canvas = fabricRef.current;
        if (!canvas) return;

        const badge = new Textbox(text.toUpperCase(), {
          left: CANVAS_WIDTH / 2,
          top: targetHeightRef.current * 0.15,
          originX: "center",
          originY: "center",
          width: 220,
          fontFamily: "Inter",
          fontSize: 12,
          fontWeight: 700,
          fill: textColor,
          backgroundColor: bgColor || accentColorRef.current,
          textAlign: "center",
          padding: 8,
          editable: true,
        });

        (badge as any).customType = "badge";
        (badge as any).id = `badge-${Date.now()}`;
        customizeControls(badge, accentColorRef.current);

        canvas.add(badge);
        canvas.setActiveObject(badge);
        canvas.requestRenderAll();
        callbacksRef.current.onSelectObject?.(getObjectInfo(badge));
        callbacksRef.current.onCanvasModified?.();
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
        callbacksRef.current.onSelectObject?.(getObjectInfo(active));
        callbacksRef.current.onCanvasModified?.();
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
          customizeControls(cloned, accentColorRef.current);
          canvas.add(cloned);
          canvas.setActiveObject(cloned);
          canvas.requestRenderAll();
          callbacksRef.current.onSelectObject?.(getObjectInfo(cloned));
          callbacksRef.current.onCanvasModified?.();
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
        callbacksRef.current.onSelectObject?.(null);
        callbacksRef.current.onCanvasModified?.();
      },

      zoomActiveObject: (delta: number) => {
        const canvas = fabricRef.current;
        if (!canvas) return;

        const active = canvas.getActiveObject();
        if (!active) return;

        const curScale = active.scaleX || 1;
        const newScale = Math.min(4, Math.max(0.1, +(curScale + delta).toFixed(2)));
        active.set({
          scaleX: newScale,
          scaleY: newScale,
        });
        canvas.requestRenderAll();
        callbacksRef.current.onSelectObject?.(getObjectInfo(active));
        callbacksRef.current.onCanvasModified?.();
      },

      replaceActiveImage: async (url: string) => {
        const canvas = fabricRef.current;
        if (!canvas) return;

        const active = canvas.getActiveObject();
        if (!active) return;

        try {
          const newImg = await loadFabricImage(url);
          newImg.set({
            left: active.left,
            top: active.top,
            originX: active.originX,
            originY: active.originY,
            scaleX: active.scaleX,
            scaleY: active.scaleY,
            angle: active.angle,
          });
          (newImg as any).id = (active as any).id || `photo-${Date.now()}`;
          customizeControls(newImg, accentColorRef.current);

          const all = canvas.getObjects();
          const idx = all.indexOf(active);
          canvas.remove(active);
          if (idx >= 0) {
            canvas.insertAt(idx, newImg);
          } else {
            canvas.add(newImg);
          }
          canvas.setActiveObject(newImg);
          canvas.requestRenderAll();
          callbacksRef.current.onSelectObject?.(getObjectInfo(newImg));
          callbacksRef.current.onCanvasModified?.();
        } catch (err) {
          console.error("Error al reemplazar imagen activa en Fabric:", err);
        }
      },

      bringForward: () => {
        const canvas = fabricRef.current;
        if (!canvas) return;

        const active = canvas.getActiveObject();
        if (!active) return;

        canvas.bringObjectForward(active);
        canvas.requestRenderAll();
        callbacksRef.current.onCanvasModified?.();
      },

      sendBackward: () => {
        const canvas = fabricRef.current;
        if (!canvas) return;

        const active = canvas.getActiveObject();
        if (!active) return;

        canvas.sendObjectBackwards(active);
        canvas.requestRenderAll();
        callbacksRef.current.onCanvasModified?.();
      },

      setBackgroundColor: (color: string) => {
        const canvas = fabricRef.current;
        if (!canvas) return;

        canvas.backgroundColor = color;
        canvas.requestRenderAll();
        callbacksRef.current.onCanvasModified?.();
      },

      setBackgroundPhoto: async (url: string) => {
        const canvas = fabricRef.current;
        if (!canvas) return;

        try {
          // Remover fondo previo si existe
          const objects = canvas.getObjects();
          const oldBg = objects.find((o) => (o as any).isBackground);
          if (oldBg) canvas.remove(oldBg);

          const img = await loadFabricImage(url);
          const naturalW = img.width || 1;
          const naturalH = img.height || 1;
          const curH = targetHeightRef.current;
          const scale = Math.max(CANVAS_WIDTH / naturalW, curH / naturalH);

          img.set({
            left: CANVAS_WIDTH / 2,
            top: curH / 2,
            originX: "center",
            originY: "center",
            scaleX: scale,
            scaleY: scale,
            selectable: true,
            evented: true,
          });

          (img as any).isBackground = true;
          (img as any).id = "bg-photo";
          customizeControls(img, accentColorRef.current);

          canvas.add(img);
          canvas.sendObjectToBack(img);

          // Si hay filtro de contraste/dimming activo, asegurar que quede sobre el fondo
          const dimRect = canvas.getObjects().find((o) => (o as any).isDimOverlay);
          if (dimRect) {
            const bgIdx = canvas.getObjects().indexOf(img);
            canvas.insertAt(bgIdx + 1, dimRect);
          }

          canvas.setActiveObject(img);
          canvas.requestRenderAll();
          callbacksRef.current.onSelectObject?.(getObjectInfo(img));
          callbacksRef.current.onCanvasModified?.();
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
        }
        const dimRect = objects.find((o) => (o as any).isDimOverlay);
        if (dimRect) {
          canvas.remove(dimRect);
        }
        canvas.requestRenderAll();
        callbacksRef.current.onCanvasModified?.();
      },

      setFilterDimming: (percent: number) => {
        setBgDimmingVal(percent);
        const canvas = fabricRef.current;
        if (!canvas) return;

        const objects = canvas.getObjects();
        let dimRect = objects.find((o) => (o as any).isDimOverlay) as Rect | undefined;

        if (percent > 0) {
          const opacity = Math.min(0.85, percent / 100);
          if (!dimRect) {
            dimRect = new Rect({
              left: 0,
              top: 0,
              width: CANVAS_WIDTH,
              height: targetHeightRef.current,
              fill: "#000000",
              opacity,
              selectable: false,
              evented: false,
            });
            (dimRect as any).isDimOverlay = true;
            canvas.add(dimRect);
            const bgPhoto = canvas.getObjects().find((o) => (o as any).isBackground);
            if (bgPhoto) {
              const bgIdx = canvas.getObjects().indexOf(bgPhoto);
              canvas.insertAt(bgIdx + 1, dimRect);
            } else {
              canvas.sendObjectToBack(dimRect);
            }
          } else {
            dimRect.set({
              opacity,
              width: CANVAS_WIDTH,
              height: targetHeightRef.current,
            });
          }
        } else if (dimRect) {
          canvas.remove(dimRect);
        }

        canvas.requestRenderAll();
        callbacksRef.current.onCanvasModified?.();
      },

      exportToDataUrl: (multiplier = 2) => {
        const canvas = fabricRef.current;
        if (!canvas) return "";

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
        return getObjectInfo(canvas.getActiveObject() || null);
      },

      loadTemplate: async (templateId: string, data: any = {}) => {
        const canvas = fabricRef.current;
        if (!canvas) return;

        // Limpiar objetos
        canvas.clear();
        canvas.backgroundColor = "#ffffff"; // Fondo blanco limpio

        const curH = targetHeightRef.current;
        const curAccent = accentColorRef.current;

        // Cargar foto de fondo si está presente en los datos
        if (data.bgUrl) {
          try {
            const img = await loadFabricImage(data.bgUrl);
            const naturalW = img.width || 1;
            const naturalH = img.height || 1;
            const scale = Math.max(CANVAS_WIDTH / naturalW, curH / naturalH);

            img.set({
              left: CANVAS_WIDTH / 2,
              top: curH / 2,
              originX: "center",
              originY: "center",
              scaleX: scale,
              scaleY: scale,
              selectable: true,
              evented: true,
            });

            (img as any).isBackground = true;
            (img as any).id = "bg-photo";
            customizeControls(img, curAccent);

            canvas.add(img);
            canvas.sendObjectToBack(img);
          } catch (bgErr) {
            console.warn("No se pudo cargar foto de fondo en loadTemplate:", bgErr);
          }
        }

        const titleText = data.title || "5 Errores que Arruinan tus Conversiones en LinkedIn";
        const subtitleText = data.subtitle || "Framework probado para líderes B2B y fundadores de alto impacto";
        const categoryText = data.category || "SOCIAL SELLING B2B";
        const authorText = `${authorName} · ${authorHandle}`;

        if (templateId === "blank") {
          canvas.requestRenderAll();
          callbacksRef.current.onCanvasModified?.();
          return;
        }

        if (templateId === "editorial") {
          const card = new Rect({
            left: CANVAS_WIDTH / 2,
            top: curH * 0.52,
            originX: "center",
            originY: "center",
            width: CANVAS_WIDTH * 0.88,
            height: curH * 0.72,
            fill: "#ffffff",
            stroke: "#e2e8f0",
            strokeWidth: 1.5,
            rx: 20,
            ry: 20,
          });
          customizeControls(card, curAccent);
          canvas.add(card);

          const badge = new Textbox(categoryText.toUpperCase(), {
            left: CANVAS_WIDTH / 2,
            top: curH * 0.24,
            originX: "center",
            originY: "center",
            width: 220,
            fontFamily: "Inter",
            fontSize: 11,
            fontWeight: 800,
            fill: curAccent,
            textAlign: "center",
            editable: true,
          });
          (badge as any).customType = "badge";
          customizeControls(badge, curAccent);
          canvas.add(badge);

          const title = new Textbox(titleText, {
            left: CANVAS_WIDTH / 2,
            top: curH * 0.44,
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
          customizeControls(title, curAccent);
          canvas.add(title);

          const sub = new Textbox(subtitleText, {
            left: CANVAS_WIDTH / 2,
            top: curH * 0.65,
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
          customizeControls(sub, curAccent);
          canvas.add(sub);

          const author = new Textbox(authorText, {
            left: CANVAS_WIDTH / 2,
            top: curH * 0.8,
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
          customizeControls(author, curAccent);
          canvas.add(author);
        } else if (templateId === "authority_quote") {
          const quoteMark = new Textbox("“", {
            left: CANVAS_WIDTH / 2,
            top: curH * 0.22,
            originX: "center",
            originY: "center",
            width: 80,
            fontFamily: "Georgia",
            fontSize: 72,
            fontWeight: 900,
            fill: curAccent,
            textAlign: "center",
            editable: false,
          });
          customizeControls(quoteMark, curAccent);
          canvas.add(quoteMark);

          const quoteText = new Textbox(`"${titleText}"`, {
            left: CANVAS_WIDTH / 2,
            top: curH * 0.46,
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
          customizeControls(quoteText, curAccent);
          canvas.add(quoteText);

          const sub = new Textbox(subtitleText, {
            left: CANVAS_WIDTH / 2,
            top: curH * 0.68,
            originX: "center",
            originY: "center",
            width: CANVAS_WIDTH * 0.75,
            fontFamily: "Inter",
            fontSize: 15,
            fill: "#475569",
            textAlign: "center",
            editable: true,
          });
          customizeControls(sub, curAccent);
          canvas.add(sub);

          const author = new Textbox(`— ${authorText}`, {
            left: CANVAS_WIDTH / 2,
            top: curH * 0.82,
            originX: "center",
            originY: "center",
            width: CANVAS_WIDTH * 0.7,
            fontFamily: "Inter",
            fontSize: 14,
            fontWeight: 700,
            fill: curAccent,
            textAlign: "center",
            editable: true,
          });
          customizeControls(author, curAccent);
          canvas.add(author);
        } else if (templateId === "big_metric") {
          const metric = new Textbox(data.metric || "+340%", {
            left: CANVAS_WIDTH / 2,
            top: curH * 0.3,
            originX: "center",
            originY: "center",
            width: CANVAS_WIDTH * 0.8,
            fontFamily: "Plus Jakarta Sans",
            fontSize: 76,
            fontWeight: 900,
            fill: curAccent,
            textAlign: "center",
            editable: true,
          });
          customizeControls(metric, curAccent);
          canvas.add(metric);

          const metricLabel = new Textbox("TASA DE CONVERSIÓN B2B", {
            left: CANVAS_WIDTH / 2,
            top: curH * 0.44,
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
          customizeControls(metricLabel, curAccent);
          canvas.add(metricLabel);

          const title = new Textbox(titleText, {
            left: CANVAS_WIDTH / 2,
            top: curH * 0.6,
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
          customizeControls(title, curAccent);
          canvas.add(title);

          const author = new Textbox(authorText, {
            left: CANVAS_WIDTH / 2,
            top: curH * 0.82,
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
          customizeControls(author, curAccent);
          canvas.add(author);
        } else if (templateId === "social_card") {
          const card = new Rect({
            left: CANVAS_WIDTH / 2,
            top: curH * 0.5,
            originX: "center",
            originY: "center",
            width: CANVAS_WIDTH * 0.86,
            height: curH * 0.76,
            fill: "#ffffff",
            stroke: "#e2e8f0",
            strokeWidth: 2,
            rx: 16,
            ry: 16,
          });
          customizeControls(card, curAccent);
          canvas.add(card);

          const header = new Textbox(`${authorName}  ✔\n${authorHandle} · 1er`, {
            left: CANVAS_WIDTH / 2,
            top: curH * 0.24,
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
          customizeControls(header, curAccent);
          canvas.add(header);

          const postBody = new Textbox(`${titleText}\n\n${subtitleText}`, {
            left: CANVAS_WIDTH / 2,
            top: curH * 0.52,
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
          customizeControls(postBody, curAccent);
          canvas.add(postBody);

          const metrics = new Textbox("❤️ 428   💬 89   🔄 34", {
            left: CANVAS_WIDTH / 2,
            top: curH * 0.8,
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
          customizeControls(metrics, curAccent);
          canvas.add(metrics);
        } else {
          const title = new Textbox(titleText, {
            left: CANVAS_WIDTH / 2,
            top: curH * 0.38,
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
          customizeControls(title, curAccent);
          canvas.add(title);

          const sub = new Textbox(subtitleText, {
            left: CANVAS_WIDTH / 2,
            top: curH * 0.6,
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
          customizeControls(sub, curAccent);
          canvas.add(sub);

          const author = new Textbox(authorText, {
            left: CANVAS_WIDTH / 2,
            top: curH * 0.82,
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
          customizeControls(author, curAccent);
          canvas.add(author);
        }

        canvas.requestRenderAll();
        callbacksRef.current.onCanvasModified?.();
      },

      startCropActiveImage: async () => {
        const canvas = fabricRef.current;
        if (!canvas || cropSessionRef.current) return false;
        const active = canvas.getActiveObject();
        if (!active || !(active instanceof FabricImage)) return false;

        try {
          cropSessionRef.current = await CropSession.start(
            canvas,
            active,
            accentColorRef.current,
            () => {
              cropSessionRef.current = null;
              callbacksRef.current.onCanvasModified?.();
            }
          );
          return true;
        } catch (err) {
          console.error("Error al iniciar recorte:", err);
          return false;
        }
      },

      applyCrop: () => {
        if (!cropSessionRef.current) return false;
        const res = cropSessionRef.current.apply();
        cropSessionRef.current = null;
        callbacksRef.current.onCanvasModified?.();
        return res;
      },

      cancelCrop: () => {
        if (!cropSessionRef.current) return;
        cropSessionRef.current.cancel();
        cropSessionRef.current = null;
        callbacksRef.current.onCanvasModified?.();
      },

      resetCrop: () => {
        if (cropSessionRef.current) {
          cropSessionRef.current.reset();
        } else {
          const canvas = fabricRef.current;
          if (!canvas) return;
          const active = canvas.getActiveObject();
          if (active && active instanceof FabricImage) {
            const nat = active.getOriginalSize ? active.getOriginalSize() : { width: active.width, height: active.height };
            active.set({
              cropX: 0,
              cropY: 0,
              width: nat.width || active.width,
              height: nat.height || active.height,
            });
            active.setCoords();
            canvas.requestRenderAll();
            callbacksRef.current.onCanvasModified?.();
          }
        }
      },

      isCropping: () => cropSessionRef.current !== null,
    }),
    [authorName, authorHandle, getObjectInfo]
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
