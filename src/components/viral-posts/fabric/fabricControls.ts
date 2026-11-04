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

const ROTATE_SVG_PATH = "M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8 M21 3v5h-5";
const MOVE_SVG_PATH = "M5 9l-3 3 3 3 M9 5l3-3 3 3 M15 19l-3 3-3-3 M19 9l3 3-3 3 M2 12h20 M12 2v20";

let rotatePath2D: Path2D | null = null;
let movePath2D: Path2D | null = null;

if (typeof Path2D !== "undefined") {
  try {
    rotatePath2D = new Path2D(ROTATE_SVG_PATH);
    movePath2D = new Path2D(MOVE_SVG_PATH);
  } catch {}
}

/**
 * 4. HERRAMIENTA FLOTANTE 1: GIRAR (Rotate Button estilo Canva)
 * Botón circular blanco flotante inferior con ícono SVG nítido Lucide RotateCw.
 */
export function renderRotateButton(
  ctx: CanvasRenderingContext2D,
  left: number,
  top: number,
  _style: unknown,
  fabricObject: FabricObject
): void {
  const r = 14.5; // Diámetro 29px
  const angleRad = ((fabricObject.angle || 0) * Math.PI) / 180;

  ctx.save();
  ctx.translate(left, top);
  ctx.rotate(angleRad);

  // Sombra suave estilo Canva
  ctx.shadowColor = "rgba(15, 23, 42, 0.22)";
  ctx.shadowBlur = 8;
  ctx.shadowOffsetY = 3;
  ctx.shadowOffsetX = 0;

  // Botón circular blanco
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();

  // Resetear sombra para que el borde y el ícono queden 100% nítidos sin borrosidad
  ctx.shadowColor = "transparent";
  ctx.strokeStyle = "#cbd5e1"; // slate-300 sutil y elegante
  ctx.lineWidth = 1.2;
  ctx.stroke();

  // Dibujar ícono SVG vectorial Lucide RotateCw
  ctx.strokeStyle = "#1e293b"; // slate-800 oscuro de alto contraste
  ctx.lineWidth = 2.2;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  if (rotatePath2D) {
    ctx.save();
    ctx.scale(15 / 24, 15 / 24);
    ctx.translate(-12, -12);
    ctx.stroke(rotatePath2D);
    ctx.restore();
  } else {
    // Fallback vectorial manual limpio
    ctx.beginPath();
    ctx.arc(0, 0, 5.5, -Math.PI * 0.8, Math.PI * 0.25);
    ctx.stroke();

    const tipX = Math.cos(Math.PI * 0.25) * 5.5;
    const tipY = Math.sin(Math.PI * 0.25) * 5.5;
    ctx.beginPath();
    ctx.moveTo(tipX - 1.5, tipY - 4.5);
    ctx.lineTo(tipX + 0.5, tipY);
    ctx.lineTo(tipX - 4.5, tipY + 0.5);
    ctx.stroke();
  }

  ctx.restore();
}

/**
 * 5. HERRAMIENTA FLOTANTE 2: MOVER (Move Button estilo Canva)
 * Botón circular blanco flotante inferior junto a Girar con ícono SVG nítido Lucide Move.
 */
export function renderMoveButton(
  ctx: CanvasRenderingContext2D,
  left: number,
  top: number,
  _style: unknown,
  fabricObject: FabricObject
): void {
  const r = 14.5; // Diámetro 29px
  const angleRad = ((fabricObject.angle || 0) * Math.PI) / 180;

  ctx.save();
  ctx.translate(left, top);
  ctx.rotate(angleRad);

  // Sombra suave estilo Canva
  ctx.shadowColor = "rgba(15, 23, 42, 0.22)";
  ctx.shadowBlur = 8;
  ctx.shadowOffsetY = 3;
  ctx.shadowOffsetX = 0;

  // Botón circular blanco
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();

  // Resetear sombra para que el borde y el ícono queden 100% nítidos
  ctx.shadowColor = "transparent";
  ctx.strokeStyle = "#cbd5e1"; // slate-300 sutil y elegante
  ctx.lineWidth = 1.2;
  ctx.stroke();

  // Dibujar ícono SVG vectorial Lucide Move (4 flechas de movimiento)
  ctx.strokeStyle = "#1e293b"; // slate-800 oscuro de alto contraste
  ctx.lineWidth = 2.0;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  if (movePath2D) {
    ctx.save();
    ctx.scale(15 / 24, 15 / 24);
    ctx.translate(-12, -12);
    ctx.stroke(movePath2D);
    ctx.restore();
  } else {
    // Fallback vectorial manual limpio
    ctx.beginPath();
    ctx.moveTo(-6.5, 0); ctx.lineTo(6.5, 0);
    ctx.moveTo(0, -6.5); ctx.lineTo(0, 6.5);
    ctx.moveTo(-3, -4); ctx.lineTo(0, -7); ctx.lineTo(3, -4);
    ctx.moveTo(-3, 4); ctx.lineTo(0, 7); ctx.lineTo(3, 4);
    ctx.moveTo(-4, -3); ctx.lineTo(-7, 0); ctx.lineTo(-4, 3);
    ctx.moveTo(4, -3); ctx.lineTo(7, 0); ctx.lineTo(4, 3);
    ctx.stroke();
  }

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
  // Ubicadas centradas horizontalmente, 42px debajo del borde inferior (y: 0.5)
  // con separación limpia y sin solapar la manija de borde mb

  // Herramienta 1: GIRAR (mtr) - Botón izquierdo (-19px)
  if (controls.mtr) {
    controls.mtr.visible = true;
    controls.mtr.x = 0;
    controls.mtr.y = 0.5;
    controls.mtr.offsetX = -19;
    controls.mtr.offsetY = 42;
    controls.mtr.cursorStyleHandler = controlsUtils.rotationStyleHandler;
    controls.mtr.actionHandler = controlsUtils.rotationWithSnapping;
    controls.mtr.render = renderRotateButton;
    controls.mtr.sizeX = 30;
    controls.mtr.sizeY = 30;
    controls.mtr.touchSizeX = 38;
    controls.mtr.touchSizeY = 38;
  }

  // Herramienta 2: MOVER (move) - Botón derecho (+19px)
  controls.move = new Control({
    x: 0,
    y: 0.5,
    offsetX: 19,
    offsetY: 42,
    cursorStyle: "grab",
    actionHandler: controlsUtils.dragHandler,
    actionName: "drag",
    render: renderMoveButton,
    sizeX: 30,
    sizeY: 30,
    touchSizeX: 38,
    touchSizeY: 38,
  });
}
