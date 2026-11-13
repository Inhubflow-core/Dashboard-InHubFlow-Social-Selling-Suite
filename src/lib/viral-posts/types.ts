export type PostFormat = "text" | "image" | "carousel" | "video";
export type PostStatus = "draft" | "scheduled" | "published" | "failed";
export type CoverLayout = "bottom" | "split_left" | "split_right";

export interface CarouselSlide {
  slideNumber: number;
  title: string;
  subtitle?: string;
  content: string[];
  footerText?: string;
  isCover?: boolean;
  isCta?: boolean;
  coverLayout?: CoverLayout;
  backgroundImageUrl?: string;
  highlightColor?: string;
  aspectRatio?: "1:1" | "4:5" | "16:9";
}

export interface ViralPostTemplate {
  id: string;
  author: string;
  authorHeadline: string;
  authorAvatar?: string;
  publishedDate: string;
  topic: string;
  format: PostFormat;
  hook: string;
  fullContent: string;
  imagePrompt?: string;
  carouselSlides?: CarouselSlide[];
  likes: number;
  comments: number;
  shares: number;
  engagementRatio: string;
  isLive?: boolean;
  socialId?: string;
  linkedinUrl?: string;
  publicIdentifier?: string;
  viralityScore?: number;
  viralityBadge?: string;
  viralityTier?: "mega" | "high" | "trending";
  mediaUrl?: string;
  hasMedia?: boolean;
  marketOrigin?: string;
  detectedLanguage?: "es" | "pt" | "en" | "other";
}

export interface CreatedPost {
  id: string;
  title: string;
  format: PostFormat;
  content: string;
  imagePrompt?: string;
  mediaUrl?: string;
  coverLayout?: CoverLayout;
  coverImage?: string;
  carouselPdfUrl?: string;
  carouselPageCount?: number;
  carouselThumbnail?: string;
  sourceMode?: "viral" | "external" | "scratch";
  carouselSlides?: CarouselSlide[];
  carouselTheme?: {
    primaryColor: string;
    fontFamily: string;
    authorHandle: string;
    authorName: string;
  };
  leadMagnetKeyword?: string;
  autoDmEnabled?: boolean;
  autoDmMessage?: string;
  autoLikeComment?: boolean;
  status: PostStatus;
  scheduledAt?: string;
  createdAt: string;
  publishedAt?: string;
  linkedinPostId?: string;
  postUrl?: string;
  targetAccountId?: string;
  metrics?: {
    likes: number;
    comments: number;
    impressions: number;
    leadsCaptured: number;
  };
}

// -------------------------------------------------------------
// TIPOS DEL ESTUDIO VISUAL Y GESTIÓN DE PLANTILLAS PERSONALIZADAS
// -------------------------------------------------------------

export type TemplateId =
  | "blank"
  | "editorial"
  | "authority_quote"
  | "social_card"
  | "split_focus"
  | "big_metric"
  | "bold_highlighter";

export type AspectRatio = "4:5" | "1:1" | "1.91:1";
export type EditorMode = "single" | "carousel";

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
  dimensions?: Record<string, { width?: number; height?: number }>;
  hiddenElements?: Record<string, boolean>;
  customElements?: CustomCanvasElement[];
  elementStyles?: Record<string, ElementFormatting>;
  bgUrl?: string;
  category?: string;
  authorName?: string;
  authorHandle?: string;
}

export interface CustomVisualTemplate {
  id: string;
  name: string;
  desc?: string;
  category?: string;
  isCustom: true;
  createdAt: string;
  updatedAt: string;
  authorName?: string;
  baseTemplate: TemplateId;
  aspectRatio: AspectRatio;
  editorMode: EditorMode;
  selectedBgUrl: string;
  bgDim: number;
  bgBlur: number;
  brandColor: string;
  fontFamily: string;
  slides: CarouselSlideItem[];
  thumbnail?: string;
}

