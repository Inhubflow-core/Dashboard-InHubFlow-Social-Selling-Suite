import {
  ActiveSelection,
  Circle,
  type FabricObject,
  IText,
  Path,
  Polygon,
  Polyline,
  Rect,
  Textbox,
  Triangle,
} from "fabric";

export const ROTATE_RADIUS = 7;
export const ROTATE_OFFSET = -28;
const EDGES = ["ml", "mr", "mt", "mb"] as const;

const SHAPE_CLASSES = [Rect, Circle, Triangle, Polygon, Polyline, Path];

function isShape(obj: FabricObject): boolean {
  return SHAPE_CLASSES.some((cls) => obj instanceof cls);
}

/**
 * Pinta el glifo circular de rotación estilo Canva (círculo blanco con flecha de giro).
 */
export function paintRotateGlyph(
  ctx: CanvasRenderingContext2D,
  left: number,
  top: number,
  accent: string = "#0099ff"
): void {
  ctx.save();
  ctx.fillStyle = "#ffffff";
  ctx.strokeStyle = accent;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(left, top, ROTATE_RADIUS, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Arco de tres cuartos con punta de flecha: "rotar/girar"
  const inner = ROTATE_RADIUS - 2.5;
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  ctx.arc(left, top, inner, Math.PI * 0.15, Math.PI * 1.7);
  ctx.stroke();

  const tipX = left + Math.cos(Math.PI * 0.15) * inner;
  const tipY = top + Math.sin(Math.PI * 0.15) * inner;
  ctx.beginPath();
  ctx.moveTo(tipX, tipY);
  ctx.lineTo(tipX + 2.4, tipY - 0.6);
  ctx.lineTo(tipX + 0.6, tipY + 2.2);
  ctx.closePath();
  ctx.fillStyle = accent;
  ctx.fill();
  ctx.restore();
}

/**
 * Configuración de estilo visual de selección (manijas circulares blancas con borde de acento).
 */
export function getSelectionStyle(accent: string = "#0099ff"): Partial<FabricObject> {
  return {
    borderColor: accent,
    cornerColor: "#ffffff",
    cornerStrokeColor: accent,
    cornerStyle: "circle",
    transparentCorners: false,
    cornerSize: 10,
    touchCornerSize: 28,
    borderScaleFactor: 1.5,
    borderOpacityWhenMoving: 0.6,
    padding: 3,
    lockSkewingX: true,
    lockSkewingY: true,
    snapAngle: 15,
    snapThreshold: 5,
  };
}

/**
 * Aplica el conjunto de manijas adecuado según el tipo de objeto:
 * - Fotos / Imágenes: sólo las 4 esquinas (así nunca se deforman al estirar de los lados).
 * - Figuras geométricas: las 8 manijas para ancho y alto independientes.
 * - Textos (Textbox): las 4 esquinas y las 2 laterales (ml, mr) para el ancho de envoltura (wrap width).
 * - Pin de rotación flotante a -28px con glifo estilo Canva.
 */
export function customizeControls(obj: FabricObject, accent: string = "#0099ff"): void {
  if (obj instanceof ActiveSelection) return;

  // Aplicar estilo de selección
  obj.set(getSelectionStyle(accent));

  const controls = obj.controls as Record<string, any>;
  if (!controls) return;

  const isText = obj instanceof Textbox || obj instanceof IText;
  const isWrapTextbox = obj instanceof Textbox;

  for (const name of EDGES) {
    const control = controls[name];
    if (!control) continue;

    if (isText) {
      // Para cajas de texto, sólo ml y mr para cambiar el ancho de envoltura
      control.visible = isWrapTextbox && (name === "ml" || name === "mr");
    } else if (isShape(obj)) {
      // Las figuras tienen todas las manijas
      control.visible = true;
    } else {
      // Las fotos/imágenes no tienen manijas laterales para no deformar su relación de aspecto
      control.visible = false;
    }
  }

  // Personalizar la manija de rotación (mtr)
  const rotate = controls.mtr;
  if (rotate) {
    rotate.offsetY = ROTATE_OFFSET;
    rotate.sizeX = rotate.sizeY = ROTATE_RADIUS * 2 + 4;
    rotate.touchSizeX = rotate.touchSizeY = ROTATE_RADIUS * 2 + 12;
    rotate.render = (
      ctx: CanvasRenderingContext2D,
      left: number,
      top: number,
      _style: unknown,
      target: FabricObject
    ) => {
      const color = typeof target.borderColor === "string" ? target.borderColor : accent;
      paintRotateGlyph(ctx, left, top, color);
    };
  }
}
