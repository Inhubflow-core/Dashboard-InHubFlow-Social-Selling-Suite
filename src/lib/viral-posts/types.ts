export type PostFormat = "text" | "image" | "carousel";
export type PostStatus = "draft" | "scheduled" | "published" | "failed";

export interface CarouselSlide {
  slideNumber: number;
  title: string;
  subtitle?: string;
  content: string[];
  footerText?: string;
  isCover?: boolean;
  isCta?: boolean;
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
}

export interface CreatedPost {
  id: string;
  title: string;
  format: PostFormat;
  content: string;
  imagePrompt?: string;
  mediaUrl?: string;
  carouselSlides?: CarouselSlide[];
  carouselTheme?: {
    primaryColor: string;
    fontFamily: string;
    authorHandle: string;
    authorName: string;
  };
  leadMagnetKeyword?: string;
  status: PostStatus;
  scheduledAt?: string;
  createdAt: string;
  publishedAt?: string;
  linkedinPostId?: string;
  targetAccountId?: string;
  metrics?: {
    likes: number;
    comments: number;
    impressions: number;
    leadsCaptured: number;
  };
}
