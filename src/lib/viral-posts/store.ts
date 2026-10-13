"use client";

import { useEffect, useState } from "react";
import { initialCreatedPosts, initialViralTemplates } from "./mock-data";
import type { CreatedPost, ViralPostTemplate } from "./types";

const TEMPLATES_KEY = "inhubflow_viral_templates";
const CREATED_POSTS_KEY = "inhubflow_created_posts";
const SELECTED_FOR_MODELING_KEY = "inhubflow_modeling_template";

function enrichTemplateWithVirality(t: ViralPostTemplate): ViralPostTemplate {
  const viralityScore = t.viralityScore ?? Math.round((t.likes * 1) + (t.comments * 3.5) + (t.shares * 5));
  let viralityTier: "mega" | "high" | "discussed" | "growing" | "emerging" = t.viralityTier || "emerging";
  let viralityBadge = t.viralityBadge || "📈 En Crecimiento";

  if (viralityScore >= 100 || (t.likes >= 50 && t.comments >= 15)) {
    viralityTier = "mega";
    viralityBadge = "🚀 Mega Viral";
  } else if (viralityScore >= 35 || (t.likes >= 20 && t.comments >= 5)) {
    viralityTier = "high";
    viralityBadge = "🔥 Alta Tracción";
  } else if (t.comments >= 8) {
    viralityTier = "discussed";
    viralityBadge = "💬 Gran Debate";
  } else if (viralityScore >= 10 || (t.likes + t.comments + t.shares) >= 4) {
    viralityTier = "growing";
    viralityBadge = "⭐ En Tendencia";
  }

  return {
    ...t,
    viralityScore,
    viralityTier,
    viralityBadge,
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
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const clean = parsed.filter((p: CreatedPost) => p && !/^created-0[1-3]$/.test(p.id));
    if (clean.length !== parsed.length) localStorage.setItem(CREATED_POSTS_KEY, JSON.stringify(clean));
    return clean;
  } catch {
    return [];
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
