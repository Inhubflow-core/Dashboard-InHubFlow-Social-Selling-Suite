"use client";

import { useEffect, useState } from "react";
import { initialCreatedPosts, initialViralTemplates } from "./mock-data";
import type { CreatedPost, PostFormat, ViralPostTemplate } from "./types";

const TEMPLATES_KEY = "inhubflow_viral_templates";
const CREATED_POSTS_KEY = "inhubflow_created_posts";
const SELECTED_FOR_MODELING_KEY = "inhubflow_modeling_template";

function enrichTemplateWithVirality(t: ViralPostTemplate): ViralPostTemplate {
  const viralityScore = t.viralityScore ?? Math.round((t.likes * 1) + (t.comments * 3.5) + (t.shares * 5));
  let viralityTier: "mega" | "high" | "trending" = "trending";
  let viralityBadge = "En Tendencia";

  if (viralityScore >= 100 || (t.likes >= 50 && t.comments >= 15)) {
    viralityTier = "mega";
    viralityBadge = "Mega Viral";
  } else if (viralityScore >= 35 || (t.likes >= 20 && t.comments >= 5) || t.comments >= 8) {
    viralityTier = "high";
    viralityBadge = "Alta Tracción";
  } else {
    viralityTier = "trending";
    viralityBadge = "En Tendencia";
  }

  const baseTemplate = initialViralTemplates.find((x) => x.id === t.id);
  const mediaUrl = t.mediaUrl || baseTemplate?.mediaUrl;
  const hasMedia = Boolean(t.hasMedia || mediaUrl || t.format === "image" || t.format === "carousel");

  return {
    ...t,
    viralityScore,
    viralityTier,
    viralityBadge,
    mediaUrl,
    hasMedia,
  };
}

export function getStoredViralTemplates(): ViralPostTemplate[] {
  if (typeof window === "undefined") return initialViralTemplates.map(enrichTemplateWithVirality);
  try {
    const raw = localStorage.getItem(TEMPLATES_KEY);
    if (!raw) {
      const enriched = initialViralTemplates.map(enrichTemplateWithVirality);
      localStorage.setItem(TEMPLATES_KEY, JSON.stringify(enriched));
      return enriched;
    }
    const parsed: ViralPostTemplate[] = JSON.parse(raw);
    return parsed.map(enrichTemplateWithVirality);
  } catch {
    return initialViralTemplates.map(enrichTemplateWithVirality);
  }
}

export function getStoredCreatedPosts(): CreatedPost[] {
  if (typeof window === "undefined") return initialCreatedPosts;
  try {
    const raw = localStorage.getItem(CREATED_POSTS_KEY);
    if (!raw) {
      localStorage.setItem(CREATED_POSTS_KEY, JSON.stringify(initialCreatedPosts));
      return initialCreatedPosts;
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      localStorage.setItem(CREATED_POSTS_KEY, JSON.stringify(initialCreatedPosts));
      return initialCreatedPosts;
    }
    const clean = parsed.filter((p: CreatedPost) => p && !/^created-0[1-3]$/.test(p.id));
    const merged = [...clean];
    let hadModifications = clean.length !== parsed.length;

    for (const initPost of initialCreatedPosts) {
      const existingIdx = merged.findIndex(
        (p) =>
          p.id === initPost.id ||
          (p.linkedinPostId && initPost.linkedinPostId && p.linkedinPostId === initPost.linkedinPostId) ||
          (p.title && initPost.title && p.title.trim().toLowerCase() === initPost.title.trim().toLowerCase())
      );
      if (existingIdx === -1) {
        merged.push(initPost);
        hadModifications = true;
      } else {
        if (!merged[existingIdx].postUrl && initPost.postUrl) {
          merged[existingIdx].postUrl = initPost.postUrl;
          hadModifications = true;
        }
      }
    }

    if (hadModifications) {
      localStorage.setItem(CREATED_POSTS_KEY, JSON.stringify(merged));
    }
    return merged;
  } catch {
    return initialCreatedPosts;
  }
}

export function saveCreatedPosts(posts: CreatedPost[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(CREATED_POSTS_KEY, JSON.stringify(posts));
}

export function setSelectedTemplateForModeling(template: ViralPostTemplate | null): void {
  if (typeof window === "undefined") return;
  if (!template) {
    localStorage.removeItem(SELECTED_FOR_MODELING_KEY);
  } else {
    localStorage.setItem(SELECTED_FOR_MODELING_KEY, JSON.stringify(template));
  }
}

export function getSelectedTemplateForModeling(): ViralPostTemplate | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(SELECTED_FOR_MODELING_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export interface ViralRadarState {
  searchKeyword: string;
  lastSuccessfulKeyword: string;
  livePosts: ViralPostTemplate[];
  hasSearchedOnce: boolean;
  datePosted: "PAST_MONTH" | "PAST_WEEK" | "PAST_24H" | "ANY";
  viralityTierFilter: "all" | "mega" | "high" | "trending";
  selectedFormat: "all" | PostFormat;
  viewMode: "live" | "templates";
  updatedAt?: number;
}

const RADAR_CACHE_KEY = "inhubflow_viral_radar_cache";

export function getStoredRadarState(): ViralRadarState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(RADAR_CACHE_KEY) || localStorage.getItem(RADAR_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveStoredRadarState(state: Partial<ViralRadarState>): void {
  if (typeof window === "undefined") return;
  try {
    const existing = getStoredRadarState() || ({} as Partial<ViralRadarState>);
    const updated: ViralRadarState = {
      searchKeyword: state.searchKeyword ?? existing.searchKeyword ?? "B2B Outbound",
      lastSuccessfulKeyword: state.lastSuccessfulKeyword ?? existing.lastSuccessfulKeyword ?? "B2B Outbound",
      livePosts: state.livePosts ?? existing.livePosts ?? [],
      hasSearchedOnce: state.hasSearchedOnce ?? existing.hasSearchedOnce ?? false,
      datePosted: state.datePosted ?? existing.datePosted ?? "PAST_MONTH",
      viralityTierFilter: state.viralityTierFilter ?? existing.viralityTierFilter ?? "all",
      selectedFormat: state.selectedFormat ?? existing.selectedFormat ?? "all",
      viewMode: state.viewMode ?? existing.viewMode ?? "live",
      updatedAt: Date.now(),
    };
    const serialized = JSON.stringify(updated);
    sessionStorage.setItem(RADAR_CACHE_KEY, serialized);
    localStorage.setItem(RADAR_CACHE_KEY, serialized);
  } catch (err) {
    console.warn("[saveStoredRadarState] Failed to persist radar state:", err);
  }
}

export function clearStoredRadarState(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(RADAR_CACHE_KEY);
    localStorage.removeItem(RADAR_CACHE_KEY);
  } catch {}
}


export function useCreatedPosts() {
  const [posts, setPosts] = useState<CreatedPost[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setPosts(getStoredCreatedPosts());
    setIsLoaded(true);
  }, []);

  const addPost = (post: CreatedPost) => {
    const updated = [post, ...posts];
    setPosts(updated);
    saveCreatedPosts(updated);
  };

  const updatePost = (id: string, updates: Partial<CreatedPost>) => {
    const updated = posts.map((p) => (p.id === id ? { ...p, ...updates } : p));
    setPosts(updated);
    saveCreatedPosts(updated);
  };

  const deletePost = (id: string) => {
    const updated = posts.filter((p) => p.id !== id);
    setPosts(updated);
    saveCreatedPosts(updated);
  };

  return { posts, isLoaded, addPost, updatePost, deletePost };
}
