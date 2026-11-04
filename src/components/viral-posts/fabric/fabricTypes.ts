export type FabricObjectType =
  | "text"
  | "heading"
  | "subheading"
  | "body"
  | "image"
  | "rect"
  | "circle"
  | "line"
  | "badge"
  | "background";

export interface ActiveObjectInfo {
  id: string;
  type: FabricObjectType;
  text?: string;
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: string | number;
  fontStyle?: string;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  textAlign?: string;
  opacity?: number;
  width?: number;
  height?: number;
  scaleX?: number;
  scaleY?: number;
  angle?: number;
  isBackground?: boolean;
}

export interface FabricCanvasEditorHandle {
  addHeading: (text?: string) => void;
  addSubheading: (text?: string) => void;
  addBodyText: (text?: string) => void;
  addPhoto: (url: string, asBackground?: boolean) => Promise<void>;
  addRect: (options?: { fill?: string; width?: number; height?: number; rx?: number; ry?: number }) => void;
  addCircle: (options?: { fill?: string; radius?: number }) => void;
  addLine: (options?: { stroke?: string; strokeWidth?: number }) => void;
  addBadge: (text: string, bgColor?: string, textColor?: string) => void;
  updateActiveObject: (props: Partial<ActiveObjectInfo>) => void;
  duplicateActiveObject: () => void;
  deleteActiveObject: () => void;
  bringForward: () => void;
  sendBackward: () => void;
  setBackgroundColor: (color: string) => void;
  setBackgroundPhoto: (url: string) => Promise<void>;
  clearBackgroundPhoto: () => void;
  setFilterDimming: (percent: number) => void;
  exportToDataUrl: (multiplier?: number) => string;
  getActiveObjectInfo: () => ActiveObjectInfo | null;
  loadTemplate: (templateId: string, data: any) => Promise<void>;
}
