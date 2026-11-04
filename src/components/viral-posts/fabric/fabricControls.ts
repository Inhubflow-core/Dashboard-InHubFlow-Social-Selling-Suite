import {
  ActiveSelection,
  Control,
  controlsUtils,
  FabricImage,
  type FabricObject,
  IText,
  Textbox,
} from "fabric";
import {
  cropBottomAction,
  cropLeftAction,
  cropRightAction,
  cropTopAction,
} from "./fabricCrop";

/**
 * Dibuja un rectángulo con bordes redondeados (píldora / cápsula) en el contexto 2D.
 */
function drawRoundedPill(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

/**
 * 1. MANIJAS DE LAS 4 ESQUINAS (tl, tr, bl, br)
 * Círculos blancos nítidos con borde de acento y sombra suave estilo Canva.
 */
export function renderCornerCircle(
  ctx: CanvasRenderingContext2D,
  left: number,
  top: number,
  _style: unknown,
  fabricObject: FabricObject
): void {
  const accent = typeof fabricObject.borderColor === "string" ? fabricObject.borderColor : "#0099ff";
  const r = 5.5; // Diámetro 11px (size-3)

  ctx.save();
  ctx.translate(left, top);

  ctx.shadowColor = "rgba(0, 0, 0, 0.28)";
  ctx.shadowBlur = 4;
  ctx.shadowOffsetY = 1;

  ctx.fillStyle = "#ffffff";
  ctx.strokeStyle = accent;
  ctx.lineWidth = 2;

  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();

  ctx.shadowColor = "transparent";
  ctx.stroke();

  ctx.restore();
}

/**
 * 2. MANIJAS LATERALES SUPERIOR E INFERIOR (mt, mb)
 * Cápsulas / píldoras horizontales blancas con borde de acento.
 */
export function renderHorizontalPill(
  ctx: CanvasRenderingContext2D,
  left: number,
  top: number,
  _style: unknown,
  fabricObject: FabricObject
): void {
  const accent = typeof fabricObject.borderColor === "string" ? fabricObject.borderColor : "#0099ff";
  const w = 20;
  const h = 7;
  const r = 3.5;
  const angleRad = ((fabricObject.angle || 0) * Math.PI) / 180;

  ctx.save();
  ctx.translate(left, top);
  ctx.rotate(angleRad);

  ctx.shadowColor = "rgba(0, 0, 0, 0.25)";
  ctx.shadowBlur = 4;
  ctx.shadowOffsetY = 1;

  ctx.fillStyle = "#ffffff";
  ctx.strokeStyle = accent;
  ctx.lineWidth = 1.5;

  drawRoundedPill(ctx, -w / 2, -h / 2, w, h, r);
  ctx.fill();

  ctx.shadowColor = "transparent";
  ctx.stroke();

  ctx.restore();
}

/**
 * 3. MANIJAS LATERALES IZQUIERDA Y DERECHA (ml, mr)
 * Cápsulas / píldoras verticales blancas con borde de acento.
 */
export function renderVerticalPill(
  ctx: CanvasRenderingContext2D,
  left: number,
  top: number,
  _style: unknown,
  fabricObject: FabricObject
): void {
  const accent = typeof fabricObject.borderColor === "string" ? fabricObject.borderColor : "#0099ff";
  const w = 7;
  const h = 20;
  const r = 3.5;
  const angleRad = ((fabricObject.angle || 0) * Math.PI) / 180;

  ctx.save();
  ctx.translate(left, top);
  ctx.rotate(angleRad);

  ctx.shadowColor = "rgba(0, 0, 0, 0.25)";
  ctx.shadowBlur = 4;
  ctx.shadowOffsetY = 1;

  ctx.fillStyle = "#ffffff";
  ctx.strokeStyle = accent;
  ctx.lineWidth = 1.5;

  drawRoundedPill(ctx, -w / 2, -h / 2, w, h, r);
  ctx.fill();

  ctx.shadowColor = "transparent";
  ctx.stroke();

  ctx.restore();
}

/**
 * 4. HERRAMIENTA FLOTANTE 1: GIRAR (Rotate Button)
 * Botón circular blanco flotante inferior con ícono de flecha circular de giro.
 */
export function renderRotateButton(
  ctx: CanvasRenderingContext2D,
  left: number,
  top: number,
  _style: unknown,
  fabricObject: FabricObject
): void {
  const accent = typeof fabricObject.borderColor === "string" ? fabricObject.borderColor : "#0099ff";
  const r = 13; // Diámetro 26px (estilo size-7 Canva)
  const angleRad = ((fabricObject.angle || 0) * Math.PI) / 180;

  ctx.save();
  ctx.translate(left, top);
  ctx.rotate(angleRad);

  // Sombra elegante
  ctx.shadowColor = "rgba(0, 0, 0, 0.3)";
  ctx.shadowBlur = 6;
  ctx.shadowOffsetY = 2;

  // Botón circular blanco
  ctx.fillStyle = "#ffffff";
  ctx.strokeStyle = accent;
  ctx.lineWidth = 1.5;

  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();

  ctx.shadowColor = "transparent";
  ctx.stroke();

  // Ícono de giro estilo Lucide RotateCw
  ctx.strokeStyle = accent;
  ctx.fillStyle = accent;
  ctx.lineWidth = 1.6;
  const innerR = 6;

  ctx.beginPath();
  ctx.arc(0, 0, innerR, Math.PI * 0.15, Math.PI * 1.72);
  ctx.stroke();

  // Punta de flecha
  const tipX = Math.cos(Math.PI * 0.15) * innerR;
  const tipY = Math.sin(Math.PI * 0.15) * innerR;
  ctx.beginPath();
  ctx.moveTo(tipX, tipY);
  ctx.lineTo(tipX + 3.2, tipY - 1.8);
  ctx.lineTo(tipX + 1.0, tipY + 3.2);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

/**
 * 5. HERRAMIENTA FLOTANTE 2: MOVER (Move Button)
 * Botón circular blanco flotante inferior junto a Girar con ícono de 4 flechas de movimiento.
 */
export function renderMoveButton(
  ctx: CanvasRenderingContext2D,
  left: number,
  top: number,
  _style: unknown,
  fabricObject: FabricObject
): void {
  const accent = typeof fabricObject.borderColor === "string" ? fabricObject.borderColor : "#0099ff";
  const r = 13; // Diámetro 26px (estilo size-7 Canva)
  const angleRad = ((fabricObject.angle || 0) * Math.PI) / 180;

  ctx.save();
  ctx.translate(left, top);
  ctx.rotate(angleRad);

  // Sombra elegante
  ctx.shadowColor = "rgba(0, 0, 0, 0.3)";
  ctx.shadowBlur = 6;
  ctx.shadowOffsetY = 2;

  // Botón circular blanco
  ctx.fillStyle = "#ffffff";
  ctx.strokeStyle = accent;
  ctx.lineWidth = 1.5;

  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();

  ctx.shadowColor = "transparent";
  ctx.stroke();

  // Ícono de 4 flechas de movimiento estilo Canva
  ctx.strokeStyle = accent;
  ctx.fillStyle = accent;
  ctx.lineWidth = 1.5;
  ctx.lineCap = "round";

  // Cruz central
  ctx.beginPath();
  ctx.moveTo(-5.5, 0);
  ctx.lineTo(5.5, 0);
  ctx.moveTo(0, -5.5);
  ctx.lineTo(0, 5.5);
  ctx.stroke();

  // Flecha Arriba
  ctx.beginPath();
  ctx.moveTo(-2.8, -4.2);
  ctx.lineTo(0, -7.5);
  ctx.lineTo(2.8, -4.2);
  ctx.stroke();

  // Flecha Abajo
  ctx.beginPath();
  ctx.moveTo(-2.8, 4.2);
  ctx.lineTo(0, 7.5);
  ctx.lineTo(2.8, 4.2);
  ctx.stroke();

  // Flecha Izquierda
  ctx.beginPath();
  ctx.moveTo(-4.2, -2.8);
  ctx.lineTo(-7.5, 0);
  ctx.lineTo(-4.2, 2.8);
  ctx.stroke();

  // Flecha Derecha
  ctx.beginPath();
  ctx.moveTo(4.2, -2.8);
  ctx.lineTo(7.5, 0);
  ctx.lineTo(4.2, 2.8);
  ctx.stroke();

  ctx.restore();
}

/**
 * Configuración del estilo del recuadro de selección.
 * padding: 0 asegura que las manijas queden exactamente en los bordes exteriores, nunca por dentro.
 */
export function getSelectionStyle(accent: string = "#0099ff"): Partial<FabricObject> {
  return {
    borderColor: accent,
    borderScaleFactor: 1.5,
    borderOpacityWhenMoving: 0.8,
    padding: 0,
    lockSkewingX: true,
    lockSkewingY: true,
    snapAngle: 15,
    snapThreshold: 5,
    transparentCorners: false,
  };
}

/**
 * Configura las 8 manijas completas y las dos herramientas flotantes juntas (Girar + Mover):
 * - 4 esquinas circulares: tl, tr, bl, br
 * - 4 laterales en cápsula: arriba (mt), abajo (mb), izquierda (ml), derecha (mr)
 * - 2 herramientas inferiores juntas: Girar (mtr a -16px) y Mover (move a +16px) a 32px debajo del borde.
 */
export function customizeControls(obj: FabricObject, accent: string = "#0099ff"): void {
  if (obj instanceof ActiveSelection) return;

  obj.set(getSelectionStyle(accent));

  const controls = obj.controls as Record<string, any>;
  if (!controls) return;

  const isImage = obj instanceof FabricImage;
  const isWrapTextbox = obj instanceof Textbox;

  // Bloquear deformación en imágenes: siempre escala proporcional desde esquinas
  if (isImage) {
    obj.set({
      lockUniScaling: true,
      lockSkewingX: true,
      lockSkewingY: true,
    });
  }

  // 1. LAS 4 ESQUINAS (tl, tr, bl, br)
  const CORNERS = ["tl", "tr", "bl", "br"] as const;
  for (const c of CORNERS) {
    if (controls[c]) {
      controls[c].visible = true;
      controls[c].render = renderCornerCircle;
      controls[c].sizeX = 14;
      controls[c].sizeY = 14;
      controls[c].touchSizeX = 28;
      controls[c].touchSizeY = 28;
      if (isImage) {
        controls[c].actionHandler = controlsUtils.scalingEqually;
      }
    }
  }

  // 2. LAS 4 MANIJAS LATERALES (mt, mb, ml, mr)
  // Borde Superior (mt) - Cápsula horizontal
  if (controls.mt) {
    controls.mt.visible = !isWrapTextbox;
    controls.mt.render = renderHorizontalPill;
    controls.mt.sizeX = 24;
    controls.mt.sizeY = 10;
    controls.mt.touchSizeX = 32;
    controls.mt.touchSizeY = 24;
    if (isImage) {
      controls.mt.actionHandler = cropTopAction;
      controls.mt.actionName = "cropTop";
    }
  }

  // Borde Inferior (mb) - Cápsula horizontal
  if (controls.mb) {
    controls.mb.visible = !isWrapTextbox;
    controls.mb.render = renderHorizontalPill;
    controls.mb.sizeX = 24;
    controls.mb.sizeY = 10;
    controls.mb.touchSizeX = 32;
    controls.mb.touchSizeY = 24;
    if (isImage) {
      controls.mb.actionHandler = cropBottomAction;
      controls.mb.actionName = "cropBottom";
    }
  }

  // Borde Izquierdo (ml) - Cápsula vertical
  if (controls.ml) {
    controls.ml.visible = true;
    controls.ml.render = renderVerticalPill;
    controls.ml.sizeX = 10;
    controls.ml.sizeY = 24;
    controls.ml.touchSizeX = 24;
    controls.ml.touchSizeY = 32;
    if (isImage) {
      controls.ml.actionHandler = cropLeftAction;
      controls.ml.actionName = "cropLeft";
    } else if (isWrapTextbox) {
      controls.ml.actionHandler = controlsUtils.changeWidth;
    }
  }

  // Borde Derecho (mr) - Cápsula vertical
  if (controls.mr) {
    controls.mr.visible = true;
    controls.mr.render = renderVerticalPill;
    controls.mr.sizeX = 10;
    controls.mr.sizeY = 24;
    controls.mr.touchSizeX = 24;
    controls.mr.touchSizeY = 32;
    if (isImage) {
      controls.mr.actionHandler = cropRightAction;
      controls.mr.actionName = "cropRight";
    } else if (isWrapTextbox) {
      controls.mr.actionHandler = controlsUtils.changeWidth;
    }
  }

  // 3. LAS DOS HERRAMIENTAS FLOTANTES JUNTAS (GIRAR + MOVER):
  // Ubicadas centradas horizontalmente, 32px debajo del borde inferior (y: 0.5)

  // Herramienta 1: GIRAR (mtr) - Botón izquierdo (-16px)
  if (controls.mtr) {
    controls.mtr.visible = true;
    controls.mtr.x = 0;
    controls.mtr.y = 0.5;
    controls.mtr.offsetX = -16;
    controls.mtr.offsetY = 32;
    controls.mtr.cursorStyleHandler = controlsUtils.rotationStyleHandler;
    controls.mtr.actionHandler = controlsUtils.rotationWithSnapping;
    controls.mtr.render = renderRotateButton;
    controls.mtr.sizeX = 28;
    controls.mtr.sizeY = 28;
    controls.mtr.touchSizeX = 36;
    controls.mtr.touchSizeY = 36;
  }

  // Herramienta 2: MOVER (move) - Botón derecho (+16px)
  controls.move = new Control({
    x: 0,
    y: 0.5,
    offsetX: 16,
    offsetY: 32,
    cursorStyle: "grab",
    actionHandler: controlsUtils.dragHandler,
    actionName: "drag",
    render: renderMoveButton,
    sizeX: 28,
    sizeY: 28,
    touchSizeX: 36,
    touchSizeY: 36,
  });
}
