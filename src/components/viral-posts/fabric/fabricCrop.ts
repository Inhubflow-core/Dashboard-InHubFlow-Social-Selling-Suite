import {
  controlsUtils,
  FabricImage,
  FabricObject,
  Point,
  Rect,
  type Canvas,
} from "fabric";

export interface CropParams {
  cropX: number;
  cropY: number;
  width: number;
  height: number;
}

export interface CropGeometry {
  natW: number;
  natH: number;
  /** px por px de imagen (siempre positivo). */
  sx: number;
  sy: number;
  angle: number;
  flipX: boolean;
  flipY: boolean;
  /** Posición central de la imagen completa en el lienzo. */
  ghostCenter: { x: number; y: number };
}

export interface Frame {
  cx: number;
  cy: number;
  /** Tamaño en el lienzo en los ejes de la imagen. */
  w: number;
  h: number;
}

const rad = (deg: number): number => ((deg || 0) * Math.PI) / 180;
const clamp = (n: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, n));

export function toLocal(g: CropGeometry, x: number, y: number): { x: number; y: number } {
  const dx = x - g.ghostCenter.x;
  const dy = y - g.ghostCenter.y;
  const a = -rad(g.angle);
  const rx = dx * Math.cos(a) - dy * Math.sin(a);
  const ry = dx * Math.sin(a) + dy * Math.cos(a);
  return { x: g.flipX ? -rx : rx, y: g.flipY ? -ry : ry };
}

export function toScene(g: CropGeometry, lx: number, ly: number): { x: number; y: number } {
  const fx = g.flipX ? -lx : lx;
  const fy = g.flipY ? -ly : ly;
  const a = rad(g.angle);
  return {
    x: g.ghostCenter.x + fx * Math.cos(a) - fy * Math.sin(a),
    y: g.ghostCenter.y + fx * Math.sin(a) + fy * Math.cos(a),
  };
}

/** Calcula parámetros de recorte (en px reales de la imagen) para un marco en el lienzo. */
export function frameToCrop(g: CropGeometry, f: Frame): CropParams {
  const local = toLocal(g, f.cx, f.cy);
  const width = f.w / g.sx;
  const height = f.h / g.sy;
  return {
    cropX: g.natW / 2 + local.x / g.sx - width / 2,
    cropY: g.natH / 2 + local.y / g.sy - height / 2,
    width,
    height,
  };
}

/** Calcula el marco en el lienzo para unos parámetros de recorte dados (inverso de frameToCrop). */
export function cropToFrame(g: CropGeometry, c: CropParams): Frame {
  const lx = (c.cropX + c.width / 2 - g.natW / 2) * g.sx;
  const ly = (c.cropY + c.height / 2 - g.natH / 2) * g.sy;
  const p = toScene(g, lx, ly);
  return { cx: p.x, cy: p.y, w: c.width * g.sx, h: c.height * g.sy };
}

/** Mantiene el área de recorte dentro de los límites de la imagen original. */
export function clampCrop(g: CropGeometry, c: CropParams, minSize = 20): CropParams {
  const width = clamp(c.width, Math.min(minSize, g.natW), g.natW);
  const height = clamp(c.height, Math.min(minSize, g.natH), g.natH);
  return {
    width,
    height,
    cropX: clamp(c.cropX, 0, Math.max(0, g.natW - width)),
    cropY: clamp(c.cropY, 0, Math.max(0, g.natH - height)),
  };
}

/** Recorta excesos si el marco sobresale del borde de la imagen. */
export function trimCrop(g: CropGeometry, c: CropParams): CropParams {
  const cropX = Math.max(0, c.cropX);
  const cropY = Math.max(0, c.cropY);
  return {
    cropX,
    cropY,
    width: Math.min(g.natW, c.cropX + c.width) - cropX,
    height: Math.min(g.natH, c.cropY + c.height) - cropY,
  };
}

/** Ajusta el área de recorte a una relación de aspecto específica sin deformar. */
export function fitAspect(g: CropGeometry, around: CropParams, ratio: number): CropParams {
  const cx = around.cropX + around.width / 2;
  const cy = around.cropY + around.height / 2;
  const imgRatio = ratio * (g.sy / g.sx);
  let width = Math.min(around.width, g.natW);
  let height = width / imgRatio;
  if (height > Math.min(around.height, g.natH)) {
    height = Math.min(around.height, g.natH);
    width = height * imgRatio;
  }
  if (width > g.natW) {
    width = g.natW;
    height = width / imgRatio;
  }
  return clampCrop(g, { width, height, cropX: cx - width / 2, cropY: cy - height / 2 });
}

/** Obtiene la geometría completa de recorte de un objeto FabricImage. */
export function geometryOf(img: FabricImage): CropGeometry {
  const nat = img.getOriginalSize ? img.getOriginalSize() : { width: img.width, height: img.height };
  const center = img.getCenterPoint();
  const sx = Math.abs(img.scaleX) || 1;
  const sy = Math.abs(img.scaleY) || 1;
  const g: CropGeometry = {
    natW: nat.width || img.width || 1,
    natH: nat.height || img.height || 1,
    sx,
    sy,
    angle: img.angle || 0,
    flipX: img.flipX || false,
    flipY: img.flipY || false,
    ghostCenter: { x: center.x, y: center.y },
  };
  const frame = cropToFrame(
    { ...g, ghostCenter: { x: 0, y: 0 } },
    { cropX: img.cropX || 0, cropY: img.cropY || 0, width: img.width || g.natW, height: img.height || g.natH }
  );
  g.ghostCenter = { x: center.x - frame.cx, y: center.y - frame.cy };
  return g;
}

// =========================================================================
// ACTION HANDLERS DIRECTOS PARA MANIJAS DE RECORTE (mt, mb, ml, mr)
// Garantizan que el usuario corte la foto sin deformar / aplastar nunca los píxeles
// =========================================================================

/**
 * Manija Superior (mt): Recorta desde arriba fijando el borde inferior.
 * NO altera scaleY ni scaleX; incrementa cropY y reduce height.
 */
export const cropTopAction = controlsUtils.wrapWithFixedAnchor(
  (eventData: MouseEvent | TouchEvent, transform: any, x: number, y: number): boolean => {
    const target = transform.target as FabricImage;
    if (!target) return false;

    const sy = Math.abs(target.scaleY) || 1;
    const originalSize = target.getOriginalSize ? target.getOriginalSize() : { width: target.width, height: target.height };
    const natH = originalSize.height || target.height || 1;

    const localPoint = controlsUtils.getLocalPoint(transform, transform.originX, "bottom", x, y);
    const wantedScreenH = -localPoint.y;
    const wantedImageH = wantedScreenH / sy;

    const curCropY = target.cropY || 0;
    const curH = target.height || 1;
    const bottomInImage = curCropY + curH;

    const clampedCropY = Math.max(0, Math.min(bottomInImage - wantedImageH, bottomInImage - 20));
    const clampedH = bottomInImage - clampedCropY;

    if (Math.abs((target.cropY || 0) - clampedCropY) < 0.5 && Math.abs(target.height - clampedH) < 0.5) {
      return false;
    }

    target.set({
      cropY: Math.round(clampedCropY),
      height: Math.round(clampedH),
    });
    return true;
  }
);

/**
 * Manija Inferior (mb): Recorta desde abajo fijando el borde superior.
 * NO altera scaleY ni scaleX; reduce o incrementa height hasta el límite natural.
 */
export const cropBottomAction = controlsUtils.wrapWithFixedAnchor(
  (eventData: MouseEvent | TouchEvent, transform: any, x: number, y: number): boolean => {
    const target = transform.target as FabricImage;
    if (!target) return false;

    const sy = Math.abs(target.scaleY) || 1;
    const originalSize = target.getOriginalSize ? target.getOriginalSize() : { width: target.width, height: target.height };
    const natH = originalSize.height || target.height || 1;

    const localPoint = controlsUtils.getLocalPoint(transform, transform.originX, "top", x, y);
    const wantedScreenH = localPoint.y;
    const wantedImageH = wantedScreenH / sy;

    const curCropY = target.cropY || 0;
    const maxAvailableH = natH - curCropY;

    const clampedH = Math.max(20, Math.min(wantedImageH, maxAvailableH));

    if (Math.abs(target.height - clampedH) < 0.5) {
      return false;
    }

    target.set({
      height: Math.round(clampedH),
    });
    return true;
  }
);

/**
 * Manija Izquierda (ml): Recorta desde la izquierda fijando el borde derecho.
 * NO altera scaleX ni scaleY; incrementa cropX y reduce width.
 */
export const cropLeftAction = controlsUtils.wrapWithFixedAnchor(
  (eventData: MouseEvent | TouchEvent, transform: any, x: number, y: number): boolean => {
    const target = transform.target as FabricImage;
    if (!target) return false;

    const sx = Math.abs(target.scaleX) || 1;
    const originalSize = target.getOriginalSize ? target.getOriginalSize() : { width: target.width, height: target.height };
    const natW = originalSize.width || target.width || 1;

    const localPoint = controlsUtils.getLocalPoint(transform, "right", transform.originY, x, y);
    const wantedScreenW = -localPoint.x;
    const wantedImageW = wantedScreenW / sx;

    const curCropX = target.cropX || 0;
    const curW = target.width || 1;
    const rightInImage = curCropX + curW;

    const clampedCropX = Math.max(0, Math.min(rightInImage - wantedImageW, rightInImage - 20));
    const clampedW = rightInImage - clampedCropX;

    if (Math.abs((target.cropX || 0) - clampedCropX) < 0.5 && Math.abs(target.width - clampedW) < 0.5) {
      return false;
    }

    target.set({
      cropX: Math.round(clampedCropX),
      width: Math.round(clampedW),
    });
    return true;
  }
);

/**
 * Manija Derecha (mr): Recorta desde la derecha fijando el borde izquierdo.
 * NO altera scaleX ni scaleY; reduce o incrementa width hasta el límite natural.
 */
export const cropRightAction = controlsUtils.wrapWithFixedAnchor(
  (eventData: MouseEvent | TouchEvent, transform: any, x: number, y: number): boolean => {
    const target = transform.target as FabricImage;
    if (!target) return false;

    const sx = Math.abs(target.scaleX) || 1;
    const originalSize = target.getOriginalSize ? target.getOriginalSize() : { width: target.width, height: target.height };
    const natW = originalSize.width || target.width || 1;

    const localPoint = controlsUtils.getLocalPoint(transform, "left", transform.originY, x, y);
    const wantedScreenW = localPoint.x;
    const wantedImageW = wantedScreenW / sx;

    const curCropX = target.cropX || 0;
    const maxAvailableW = natW - curCropX;

    const clampedW = Math.max(20, Math.min(wantedImageW, maxAvailableW));

    if (Math.abs(target.width - clampedW) < 0.5) {
      return false;
    }

    target.set({
      width: Math.round(clampedW),
    });
    return true;
  }
);

// =========================================================================
// SESIÓN DE RECORTE INTERACTIVO (DOORY CROPSESSION)
// Modo interactivo completo con imagen fantasma traslúcida y marco de recorte
// =========================================================================

export class CropSession {
  private readonly geometry: CropGeometry;
  private readonly original: CropParams;
  private readonly originalFlags: { selectable: boolean; evented: boolean };
  private ratio: number | null = null;
  private cleanups: (() => void)[] = [];
  private done = false;

  private constructor(
    private readonly canvas: Canvas,
    private readonly img: FabricImage,
    private readonly ghost: FabricImage,
    private readonly frame: Rect,
    private readonly onEnd: () => void
  ) {
    this.geometry = geometryOf(img);
    this.original = {
      cropX: img.cropX || 0,
      cropY: img.cropY || 0,
      width: img.width || this.geometry.natW,
      height: img.height || this.geometry.natH,
    };
    this.originalFlags = { selectable: img.selectable, evented: img.evented };
  }

  /** Inicia el modo de recorte interactivo con ghost y frame */
  static async start(
    canvas: Canvas,
    img: FabricImage,
    accentColor: string,
    onEnd: () => void
  ): Promise<CropSession> {
    const geometry = geometryOf(img);
    const ghost = (await img.clone()) as FabricImage;

    ghost.set({
      cropX: 0,
      cropY: 0,
      width: geometry.natW,
      height: geometry.natH,
      scaleX: img.scaleX,
      scaleY: img.scaleY,
      angle: img.angle,
      flipX: img.flipX,
      flipY: img.flipY,
      originX: "center",
      originY: "center",
      left: geometry.ghostCenter.x,
      top: geometry.ghostCenter.y,
      opacity: 0.35,
      shadow: null,
      stroke: null,
      selectable: false,
      evented: false,
      excludeFromExport: true,
    });
    (ghost as any).isUi = true;

    const start = cropToFrame(geometry, {
      cropX: img.cropX || 0,
      cropY: img.cropY || 0,
      width: img.width || geometry.natW,
      height: img.height || geometry.natH,
    });

    const frame = new Rect({
      originX: "center",
      originY: "center",
      left: start.cx,
      top: start.cy,
      width: start.w,
      height: start.h,
      angle: img.angle,
      fill: "rgba(0,0,0,0)",
      stroke: accentColor,
      strokeWidth: 2,
      strokeUniform: true,
      lockRotation: true,
      excludeFromExport: true,
      objectCaching: false,
      hoverCursor: "move",
    });
    (frame as any).isUi = true;
    frame.setControlsVisibility({ mtr: false });

    const session = new CropSession(canvas, img, ghost, frame, onEnd);
    session.install();
    return session;
  }

  private install(): void {
    const canvas = this.canvas;
    const index = canvas.getObjects().indexOf(this.img);
    canvas.insertAt(Math.max(0, index), this.ghost);
    this.img.set({ selectable: false, evented: false });
    canvas.add(this.frame);

    canvas.discardActiveObject();
    canvas.setActiveObject(this.frame);

    const on = (name: "object:moving" | "object:scaling" | "object:modified", fn: () => void): void => {
      const handler = (e: { target: FabricObject }): void => {
        if (e.target === this.frame) fn();
      };
      canvas.on(name, handler);
      this.cleanups.push(() => canvas.off(name, handler));
    };

    on("object:moving", () => this.sync(false));
    on("object:scaling", () => this.sync(true));
    on("object:modified", () => {
      this.sync(false);
      this.bakeFrame();
    });

    const cleared = (): void => {
      if (!this.done) this.apply();
    };
    canvas.on("selection:cleared", cleared);
    this.cleanups.push(() => canvas.off("selection:cleared", cleared));

    canvas.requestRenderAll();
  }

  private currentFrame(): Frame {
    const c = this.frame.getCenterPoint();
    return {
      cx: c.x,
      cy: c.y,
      w: this.frame.width * (this.frame.scaleX || 1),
      h: this.frame.height * (this.frame.scaleY || 1),
    };
  }

  private placeFrame(f: Frame): void {
    this.frame.set({
      scaleX: f.w / (this.frame.width || 1),
      scaleY: f.h / (this.frame.height || 1),
    });
    this.frame.setPositionByOrigin(new Point(f.cx, f.cy), "center", "center");
    this.frame.setCoords();
  }

  private sync(resizing: boolean): void {
    const wanted = frameToCrop(this.geometry, this.currentFrame());
    let params = clampCrop(this.geometry, resizing ? trimCrop(this.geometry, wanted) : wanted);
    if (this.ratio) params = fitAspect(this.geometry, params, this.ratio);
    this.placeFrame(cropToFrame(this.geometry, params));
    this.writeImage(params);
  }

  private writeImage(p: CropParams): void {
    const f = cropToFrame(this.geometry, p);
    this.img.set({
      cropX: Math.round(p.cropX),
      cropY: Math.round(p.cropY),
      width: Math.round(p.width),
      height: Math.round(p.height),
    });
    this.img.setPositionByOrigin(new Point(f.cx, f.cy), "center", "center");
    this.img.setCoords();
    this.canvas.requestRenderAll();
  }

  private bakeFrame(): void {
    const f = this.currentFrame();
    this.frame.set({ width: f.w, height: f.h, scaleX: 1, scaleY: 1 });
    this.frame.setPositionByOrigin(new Point(f.cx, f.cy), "center", "center");
    this.frame.setCoords();
  }

  /** Fija o libera una relación de aspecto predeterminada */
  setAspect(ratio: number | null): void {
    this.ratio = ratio;
    const free = ratio === null;
    this.frame.setControlsVisibility({ ml: free, mr: free, mt: free, mb: free, mtr: false });
    if (ratio) {
      const params = fitAspect(this.geometry, frameToCrop(this.geometry, this.currentFrame()), ratio);
      this.bakeFrame();
      this.placeFrame(cropToFrame(this.geometry, params));
      this.bakeFrame();
      this.writeImage(params);
    }
  }

  /** Restaura la imagen a su tamaño natural completo */
  reset(): void {
    const full = { cropX: 0, cropY: 0, width: this.geometry.natW, height: this.geometry.natH };
    this.placeFrame(cropToFrame(this.geometry, full));
    this.bakeFrame();
    this.writeImage(this.ratio ? fitAspect(this.geometry, full, this.ratio) : full);
  }

  private teardown(): void {
    this.done = true;
    for (const off of this.cleanups) off();
    this.cleanups = [];
    const canvas = this.canvas;
    canvas.discardActiveObject();
    canvas.remove(this.frame, this.ghost);
    this.img.set(this.originalFlags);
    this.onEnd();
  }

  /** Confirma el recorte y vuelve a seleccionar la imagen */
  apply(): boolean {
    if (this.done) return false;
    const p = {
      cropX: this.img.cropX || 0,
      cropY: this.img.cropY || 0,
      width: this.img.width || this.geometry.natW,
      height: this.img.height || this.geometry.natH,
    };
    const changed = (Object.keys(p) as (keyof CropParams)[]).some(
      (k) => Math.abs(p[k] - this.original[k]) > 0.5
    );
    this.teardown();
    this.img.setCoords();
    this.canvas.setActiveObject(this.img);
    this.canvas.requestRenderAll();
    return changed;
  }

  /** Cancela y restaura las dimensiones originales previas */
  cancel(): void {
    if (this.done) return;
    this.writeImage(this.original);
    this.teardown();
    this.canvas.setActiveObject(this.img);
    this.canvas.requestRenderAll();
  }
}
