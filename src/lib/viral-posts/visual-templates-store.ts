"use client";

import { useEffect, useState } from "react";
import type { CustomVisualTemplate } from "./types";
export type { CustomVisualTemplate } from "./types";

const TEMPLATES_KEY = "inhubflow_custom_visual_templates";
const CHANGE_EVENT = "inhubflow_visual_templates_changed";

/** Plantillas iniciales de ejemplo para que la biblioteca tenga contenido desde el primer uso */
const INITIAL_CUSTOM_TEMPLATES: CustomVisualTemplate[] = [
  {
    id: "tpl-seed-dark-pitch",
    name: "Dark Pitch Ejecutivo B2B",
    desc: "Tarjeta de cristal oscuro con titular de alto impacto y píldoras flotantes para propuestas de valor.",
    category: "B2B",
    isCustom: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    authorName: "InHubFlow Master",
    baseTemplate: "editorial",
    aspectRatio: "4:5",
    editorMode: "carousel",
    selectedBgUrl: "https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=1200&q=85",
    bgDim: 0.5,
    bgBlur: 3,
    brandColor: "#0099ff",
    fontFamily: "Outfit, sans-serif",
    slides: [
      {
        id: "slide-1",
        slideNumber: 1,
        type: "cover",
        label: "Portada",
        tag: "ESTRATEGIA B2B",
        title: "El error #1 que frena las conversiones de tu equipo en LinkedIn:",
        subtitle: "No es el algoritmo. Es hablar del producto antes de validar el dolor.",
        customElements: [
          {
            id: "elem-seed-badge-1",
            type: "shape_pill",
            x: 40,
            y: 40,
            width: 130,
            height: 32,
            bgColor: "#ffffff",
            color: "#0f172a",
            borderRadius: 9999,
            opacity: 1,
            content: "FRAMEWORK B2B",
          },
        ],
      },
    ],
  },
  {
    id: "tpl-seed-quote-minimal",
    name: "Cita de Autoridad Minimal 1:1",
    desc: "Formato cuadrado limpio ideal para opiniones contundentes y citas directas de líderes.",
    category: "Citas",
    isCustom: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    authorName: "InHubFlow Master",
    baseTemplate: "authority_quote",
    aspectRatio: "1:1",
    editorMode: "single",
    selectedBgUrl: "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1200&q=85",
    bgDim: 0.6,
    bgBlur: 4,
    brandColor: "#f59e0b",
    fontFamily: "Montserrat, sans-serif",
    slides: [
      {
        id: "slide-quote-1",
        slideNumber: 1,
        type: "cover",
        label: "Cita",
        tag: "LIDERAZGO",
        title: "«Si tu prospección suena como un mensaje masivo, será tratada como spam.»",
        subtitle: "La personalización contextual es la única ventaja que la IA no puede copiar.",
      },
    ],
  },
];

export function getStoredVisualTemplates(): CustomVisualTemplate[] {
  if (typeof window === "undefined") return INITIAL_CUSTOM_TEMPLATES;
  try {
    const raw = localStorage.getItem(TEMPLATES_KEY);
    if (!raw) {
      localStorage.setItem(TEMPLATES_KEY, JSON.stringify(INITIAL_CUSTOM_TEMPLATES));
      return INITIAL_CUSTOM_TEMPLATES;
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      localStorage.setItem(TEMPLATES_KEY, JSON.stringify(INITIAL_CUSTOM_TEMPLATES));
      return INITIAL_CUSTOM_TEMPLATES;
    }
    return parsed;
  } catch {
    return INITIAL_CUSTOM_TEMPLATES;
  }
}

export function saveVisualTemplate(
  tpl: Omit<CustomVisualTemplate, "id" | "createdAt" | "updatedAt" | "isCustom"> & { id?: string }
): CustomVisualTemplate {
  const existing = getStoredVisualTemplates();
  const now = new Date().toISOString();

  let savedItem: CustomVisualTemplate;

  if (tpl.id) {
    const idx = existing.findIndex((t) => t.id === tpl.id);
    if (idx !== -1) {
      savedItem = {
        ...existing[idx],
        ...tpl,
        id: tpl.id,
        isCustom: true,
        updatedAt: now,
      };
      existing[idx] = savedItem;
    } else {
      savedItem = {
        ...tpl,
        id: tpl.id,
        isCustom: true,
        createdAt: now,
        updatedAt: now,
      };
      existing.unshift(savedItem);
    }
  } else {
    savedItem = {
      ...tpl,
      id: `custom-tpl-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      isCustom: true,
      createdAt: now,
      updatedAt: now,
    };
    existing.unshift(savedItem);
  }

  if (typeof window !== "undefined") {
    localStorage.setItem(TEMPLATES_KEY, JSON.stringify(existing));
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }

  return savedItem;
}

export function deleteVisualTemplate(id: string): boolean {
  if (typeof window === "undefined") return false;
  const existing = getStoredVisualTemplates();
  const filtered = existing.filter((t) => t.id !== id);
  if (filtered.length !== existing.length) {
    localStorage.setItem(TEMPLATES_KEY, JSON.stringify(filtered));
    window.dispatchEvent(new Event(CHANGE_EVENT));
    return true;
  }
  return false;
}

export function updateVisualTemplateMeta(
  id: string,
  meta: { name: string; desc?: string; category?: string }
): CustomVisualTemplate | null {
  const existing = getStoredVisualTemplates();
  const idx = existing.findIndex((t) => t.id === id);
  if (idx === -1) return null;

  existing[idx] = {
    ...existing[idx],
    ...meta,
    updatedAt: new Date().toISOString(),
  };

  if (typeof window !== "undefined") {
    localStorage.setItem(TEMPLATES_KEY, JSON.stringify(existing));
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }

  return existing[idx];
}

export function useVisualTemplates() {
  const [templates, setTemplates] = useState<CustomVisualTemplate[]>([]);

  useEffect(() => {
    setTemplates(getStoredVisualTemplates());
    const handleUpdate = () => {
      setTemplates(getStoredVisualTemplates());
    };
    window.addEventListener(CHANGE_EVENT, handleUpdate);
    window.addEventListener("storage", handleUpdate);
    return () => {
      window.removeEventListener(CHANGE_EVENT, handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, []);

  return {
    templates,
    saveTemplate: saveVisualTemplate,
    deleteTemplate: deleteVisualTemplate,
    updateMeta: updateVisualTemplateMeta,
    refresh: () => setTemplates(getStoredVisualTemplates()),
  };
}
