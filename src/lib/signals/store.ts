"use client";

import { useCallback, useEffect, useState } from "react";
import {
  claudiaCuriRealPosts,
  viralPostsB2B,
  verifiedUsaOutreachScannedPosts,
  initialDiscoveredLeads,
  initialLevel1Monitors,
  initialLevel2Monitors,
  initialLevel3Monitors,
  initialLevel3GroupMonitors,
  initialLevel4GlobalMonitors,
} from "./mock-data";
import type {
  Level1Monitor,
  Level2CompetitorMonitor,
  Level3GroupMonitor,
  Level4GlobalMonitor,
  Level3GlobalMonitor,
  SignalLeadItem,
} from "./types";
import type { CreatedPost } from "@/lib/viral-posts/types";
import { isAuthorEmployeeOrAffiliate } from "./employee-filter";

const L1_KEY = "inhubflow_signals_l1";
export const L1_MONITORS_CHANGE_EVENT = "inhubflow_signals_l1_changed";
export const L2_MONITORS_CHANGE_EVENT = "inhubflow:l2-monitors-updated";
export const L3_GROUP_MONITORS_CHANGE_EVENT = "inhubflow:l3-group-monitors-updated";
export const L4_GLOBAL_MONITORS_CHANGE_EVENT = "inhubflow:l4-global-monitors-updated";
export const SIGNAL_LEADS_CHANGE_EVENT = "inhubflow:signal-leads-updated";
const L1_DELETED_KEY = "inhubflow_signals_l1_deleted";
const L2_KEY = "inhubflow_signals_l2";
const L3_GROUPS_KEY = "inhubflow_signals_l3_groups";
const L3_KEY = "inhubflow_signals_l3";
const L4_KEY = "inhubflow_signals_l3";
const LEADS_KEY = "inhubflow_signals_leads";

function syncMonitorsToDbInBackground(
  level: "level_1" | "level_2" | "level_3_groups" | "level_4",
  monitors: unknown[]
): void {
  if (typeof window === "undefined" || typeof fetch !== "function" || monitors.length === 0) return;
  fetch("/api/signals/monitors", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ level, monitors }),
  }).catch(() => {});
}

function deleteMonitorFromDbInBackground(id: string): void {
  if (typeof window === "undefined" || typeof fetch !== "function" || !id) return;
  fetch(`/api/signals/monitors?id=${encodeURIComponent(id)}`, {
    method: "DELETE",
  }).catch(() => {});
}

export function getLevel1MonitorKey(m: Level1Monitor): string {
  const idMatch = m.postUrl?.match(/([0-9]{16,25})/);
  if (idMatch && idMatch[1]) {
    return `li_id::${idMatch[1]}`;
  }
  if (m.originPostId) {
    return `origin::${m.originPostId}`;
  }
  if (m.postUrl && m.postUrl.startsWith("http")) {
    const cleanUrl = m.postUrl.split("?")[0].replace(/\/$/, "").toLowerCase();
    return `url::${cleanUrl}`;
  }
  if (m.postTitle) {
    const cleanTitle = m.postTitle.trim().toLowerCase().slice(0, 40);
    return `title::${cleanTitle}`;
  }
  return m.id;
}

export function getDeletedLevel1MonitorKeys(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(L1_DELETED_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function recordDeletedLevel1Monitor(m: Level1Monitor | string): void {
  if (typeof window === "undefined") return;
  try {
    const keys = getDeletedLevel1MonitorKeys();
    const idToAdd = typeof m === "string" ? m : m.id;
    const additionalKey = typeof m === "object" ? getLevel1MonitorKey(m) : null;
    const next = Array.from(new Set([...keys, idToAdd, additionalKey].filter(Boolean))) as string[];
    localStorage.setItem(L1_DELETED_KEY, JSON.stringify(next));
  } catch {}
}

export function deduplicateLevel1Monitors(monitorsList: Level1Monitor[]): Level1Monitor[] {
  const map = new Map<string, Level1Monitor>();

  for (const mon of monitorsList) {
    if (!mon || !mon.postTitle) continue;
    const key = getLevel1MonitorKey(mon);

    if (!map.has(key)) {
      map.set(key, mon);
    } else {
      const existing = map.get(key)!;
      const merged: Level1Monitor = {
        ...existing,
        id: existing.id.startsWith("mon-l1-roberto")
          ? existing.id
          : mon.id.startsWith("mon-l1-roberto")
          ? mon.id
          : existing.id,
        postUrl: existing.postUrl && existing.postUrl.startsWith("http") ? existing.postUrl : mon.postUrl,
        scannedCommentsCount: Math.max(existing.scannedCommentsCount || 0, mon.scannedCommentsCount || 0),
        leadsCapturedCount: Math.max(existing.leadsCapturedCount || 0, mon.leadsCapturedCount || 0),
        autoLikeComment: existing.autoLikeComment || mon.autoLikeComment,
        publicReplyTemplate: existing.publicReplyTemplate || mon.publicReplyTemplate,
        nonConnectedNoteTemplate: existing.nonConnectedNoteTemplate || mon.nonConnectedNoteTemplate,
        attachedPdfName: existing.attachedPdfName || mon.attachedPdfName,
        originPostId: existing.originPostId || mon.originPostId,
        lastScanAt:
          existing.lastScanAt && existing.lastScanAt !== "Recién creado"
            ? existing.lastScanAt
            : mon.lastScanAt,
        lastScanAtIso: existing.lastScanAtIso || mon.lastScanAtIso,
      };
      map.set(key, merged);
    }
  }

  return Array.from(map.values());
}

export function getStoredLevel1Monitors(): Level1Monitor[] {
  if (typeof window === "undefined") return initialLevel1Monitors;
  try {
    const raw = localStorage.getItem(L1_KEY);
    if (!raw) {
      if (initialLevel1Monitors.length > 0) {
        localStorage.setItem(L1_KEY, JSON.stringify(initialLevel1Monitors));
      }
      return initialLevel1Monitors;
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      if (initialLevel1Monitors.length > 0) {
        localStorage.setItem(L1_KEY, JSON.stringify(initialLevel1Monitors));
      }
      return initialLevel1Monitors;
    }
    let hadModifications = false;
    const deletedKeys = new Set(getDeletedLevel1MonitorKeys());

    // 1. Filtrar monitores inválidos, falsos o eliminados explícitamente
    const filtered = parsed
      .filter(
        (m: Level1Monitor) =>
          Boolean(m && m.id && m.postTitle) &&
          !deletedKeys.has(m.id) &&
          !deletedKeys.has(getLevel1MonitorKey(m)) &&
          m.id !== "mon-l1-roberto-sistema" &&
          m.id !== "mon-l1-roberto-prospeccion" &&
          !m.postUrl?.includes("7419089920785190912") &&
          !m.postUrl?.includes("7418727192660910080") &&
          !m.postTitle?.toLowerCase().includes("20 lugares. cierro el lunes") &&
          !m.postTitle?.toLowerCase().includes("buscando 20 empresas b2b")
      )
      .map((m: Level1Monitor) => {
        if (m.scanFrequency !== "daily") {
          hadModifications = true;
          return { ...m, scanFrequency: "daily" as const };
        }
        return m;
      });

    // 2. Deduplicar estrictamente por publicación
    const deduplicated = deduplicateLevel1Monitors(filtered);
    if (deduplicated.length !== parsed.length) {
      hadModifications = true;
    }

    // 3. Incorporar de initialLevel1Monitors solo si no existe ya un monitor para esa publicación Y no fue eliminado
    for (const initMon of initialLevel1Monitors) {
      const initKey = getLevel1MonitorKey(initMon);
      if (!deletedKeys.has(initMon.id) && !deletedKeys.has(initKey)) {
        const alreadyExists = deduplicated.some((m) => getLevel1MonitorKey(m) === initKey);
        if (!alreadyExists) {
          deduplicated.push(initMon);
          hadModifications = true;
        }
      }
    }

    if (hadModifications) {
      localStorage.setItem(L1_KEY, JSON.stringify(deduplicated));
    }
    return deduplicated;
  } catch {
    return initialLevel1Monitors;
  }
}

export function saveStoredLevel1Monitors(monitors: Level1Monitor[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(L1_KEY, JSON.stringify(monitors));
    window.dispatchEvent(new CustomEvent(L1_MONITORS_CHANGE_EVENT));
    syncMonitorsToDbInBackground("level_1", monitors);
  } catch {}
}

export function upsertLevel1MonitorFromPost(post: CreatedPost): Level1Monitor | null {
  if (!post.leadMagnetKeyword && !post.autoDmEnabled) return null;

  const current = getStoredLevel1Monitors();
  const normalizedTitle = (post.title || "").trim().toLowerCase();
  const existingIdx = current.findIndex(
    (m) =>
      m.originPostId === post.id ||
      (normalizedTitle && m.postTitle.trim().toLowerCase() === normalizedTitle)
  );

  let resolvedPostUrl = "";
  if (post.status === "published") {
    if (post.postUrl && post.postUrl.startsWith("http")) {
      resolvedPostUrl = post.postUrl;
    } else if (post.linkedinPostId) {
      const rawId = post.linkedinPostId.trim();
      resolvedPostUrl = rawId.startsWith("http")
        ? rawId
        : `https://www.linkedin.com/feed/update/urn:li:activity:${rawId.replace(/^urn:li:activity:/, "")}`;
    }
  }

  const nextStatus: Level1Monitor["status"] =
    post.status === "published" ? "active" : "pending_publish";

  if (existingIdx !== -1) {
    const existing = current[existingIdx];
    const keyword = (post.leadMagnetKeyword || existing.keyword || "SISTEMA").trim().toUpperCase();
    const updatedMonitor: Level1Monitor = {
      ...existing,
      postTitle: post.title || existing.postTitle,
      postUrl: resolvedPostUrl || existing.postUrl || "",
      keyword,
      status: nextStatus,
      autoLikeComment: post.autoLikeComment ?? existing.autoLikeComment ?? true,
      nonConnectedNoteTemplate: post.autoDmMessage || existing.nonConnectedNoteTemplate,
      originPostId: post.id,
      originPostStatus: post.status,
      scheduledAt: post.scheduledAt ?? existing.scheduledAt,
      lastScanAt:
        post.status === "published" && existing.lastScanAt === "Pendiente de publicación"
          ? "Recién creado"
          : existing.lastScanAt,
      lastScanAtIso:
        post.status === "published"
          ? existing.lastScanAtIso || new Date().toISOString()
          : existing.lastScanAtIso,
    };
    const updated = [...current];
    updated[existingIdx] = updatedMonitor;
    saveStoredLevel1Monitors(updated);
    return updatedMonitor;
  }

  const keyword = (post.leadMagnetKeyword || "SISTEMA").trim().toUpperCase();
  const createdMonitor: Level1Monitor = {
    id: `mon-l1-${post.id}`,
    postTitle: post.title,
    postUrl: resolvedPostUrl,
    keyword,
    status: nextStatus,
    autoLikeComment: post.autoLikeComment ?? true,
    publicReplyTemplate: "Te lo acabo de enviar por privado, revisa tus mensajes",
    nonConnectedNoteTemplate:
      post.autoDmMessage ||
      "Hola {{first_name}}, vi que comentaste en mi post. Te envío la invitación para entregarte el recurso por privado.",
    attachedPdfName: "Guia_Oficial_Social_Selling.pdf",
    scannedCommentsCount: 0,
    leadsCapturedCount: 0,
    lastScanAt: post.status === "published" ? "Recién creado" : "Pendiente de publicación",
    lastScanAtIso: post.status === "published" ? new Date().toISOString() : undefined,
    scanFrequency: "daily",
    createdAt: new Date().toISOString(),
    originPostId: post.id,
    originPostStatus: post.status,
    scheduledAt: post.scheduledAt,
  };

  saveStoredLevel1Monitors([createdMonitor, ...current]);
  return createdMonitor;
}

export function getStoredLevel2Monitors(): Level2CompetitorMonitor[] {
  if (typeof window === "undefined") return initialLevel2Monitors;
  try {
    const raw = localStorage.getItem(L2_KEY);
    if (!raw) {
      if (initialLevel2Monitors.length > 0) {
        localStorage.setItem(L2_KEY, JSON.stringify(initialLevel2Monitors));
      }
      return initialLevel2Monitors;
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      if (initialLevel2Monitors.length > 0) {
        localStorage.setItem(L2_KEY, JSON.stringify(initialLevel2Monitors));
      }
      return initialLevel2Monitors;
    }

    let hadModifications = false;
    const monitors = parsed
      .filter((m: Level2CompetitorMonitor) => Boolean(m && m.id && m.competitorName))
      .map((m: Level2CompetitorMonitor) => {
        let updated = { ...m };
        if (updated.scanFrequency !== "daily") {
          hadModifications = true;
          updated.scanFrequency = "daily" as const;
        }

        const isClaudia =
          (m.competitorName || "").toLowerCase().includes("claudia") ||
          (m.competitorUrl || "").toLowerCase().includes("claudiacuri");

        if (isClaudia) {
          if (!m.lastScannedPosts || m.lastScannedPosts.length < 10) {
            hadModifications = true;
            updated = {
              ...updated,
              lastScannedPosts: claudiaCuriRealPosts,
              lastScanAt: m.lastScanAt || "15:34",
              lastScanAtIso: m.lastScanAtIso || "2026-10-15T15:34:00.000Z",
              leadsIdentifiedCount: Math.max(m.leadsIdentifiedCount || 0, 113),
            };
          }
        }
        return updated;
      });

    if (hadModifications) {
      localStorage.setItem(L2_KEY, JSON.stringify(monitors));
    }
    return monitors;
  } catch {
    return initialLevel2Monitors;
  }
}

export function saveStoredLevel2Monitors(monitors: Level2CompetitorMonitor[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(L2_KEY, JSON.stringify(monitors));
    window.dispatchEvent(new CustomEvent(L2_MONITORS_CHANGE_EVENT));
    syncMonitorsToDbInBackground("level_2", monitors);
  } catch {}
}

export function getStoredLevel3GroupMonitors(): Level3GroupMonitor[] {
  if (typeof window === "undefined") return initialLevel3GroupMonitors;
  try {
    const raw = localStorage.getItem(L3_GROUPS_KEY);
    if (!raw) {
      if (initialLevel3GroupMonitors.length > 0) {
        localStorage.setItem(L3_GROUPS_KEY, JSON.stringify(initialLevel3GroupMonitors));
      }
      return initialLevel3GroupMonitors;
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      if (initialLevel3GroupMonitors.length > 0) {
        localStorage.setItem(L3_GROUPS_KEY, JSON.stringify(initialLevel3GroupMonitors));
      }
      return initialLevel3GroupMonitors;
    }

    const monitors = parsed
      .filter((m: Level3GroupMonitor) => Boolean(m && m.id && m.groupName))
      .map((m: Level3GroupMonitor) => {
        let updated = { ...m };
        if (updated.scanFrequency !== "daily") {
          updated.scanFrequency = "daily" as const;
        }
        return updated;
      });

    return monitors;
  } catch {
    return initialLevel3GroupMonitors;
  }
}

export function saveStoredLevel3GroupMonitors(monitors: Level3GroupMonitor[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(L3_GROUPS_KEY, JSON.stringify(monitors));
    window.dispatchEvent(new CustomEvent(L3_GROUP_MONITORS_CHANGE_EVENT));
    syncMonitorsToDbInBackground("level_3_groups", monitors);
  } catch {}
}

export function getStoredLevel3Monitors(): Level3GlobalMonitor[] {
  if (typeof window === "undefined") return initialLevel3Monitors;
  try {
    const raw = localStorage.getItem(L3_KEY);
    if (!raw) {
      if (typeof window !== "undefined") {
        localStorage.setItem(L3_KEY, JSON.stringify(initialLevel3Monitors));
      }
      return initialLevel3Monitors;
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      if (typeof window !== "undefined") {
        localStorage.setItem(L3_KEY, JSON.stringify(initialLevel3Monitors));
      }
      return initialLevel3Monitors;
    }

    // Si los monitores almacenados aún son de la Opción A (Pedro Valladolid), migrar limpiamente a la Opción B
    const isOldOptionA = parsed.some((m) =>
      (m.id && m.id.includes("pedro")) ||
      (m.searchQuery && m.searchQuery.toLowerCase().includes("pedro")) ||
      (m.leaderName && m.leaderName.toLowerCase().includes("pedro"))
    );

    if (isOldOptionA) {
      if (typeof window !== "undefined") {
        localStorage.setItem(L3_KEY, JSON.stringify(initialLevel3Monitors));
      }
      return initialLevel3Monitors;
    }

    let hadModifications = false;
    const monitors = parsed
      .filter((m: Level3GlobalMonitor) => Boolean(m && m.id && m.searchQuery))
      .map((m: Level3GlobalMonitor) => {
        let updated = { ...m };
        if (updated.scanFrequency !== "daily") {
          hadModifications = true;
          updated.scanFrequency = "daily" as const;
        }

        // Sanitización automática de posts previos en cache: Si el monitor es de USA o país occidental, purgar posts residuales en cirílico/coreano/chino/japonés/árabe o vacantes
        const country = (updated.targetCountry || "").toUpperCase();
        const westernCodes = [
          "US", "CA", "MX", "LATAM", "GT", "CR", "PA", "SV", "HN", "NI", "BZ",
          "CO", "AR", "CL", "PE", "BR", "UY", "EC", "BO", "PY", "VE", "GY", "SR",
          "DO", "PR", "CU", "JM", "TT", "BS", "BB", "HT",
          "ES", "UK", "DE", "FR", "IT", "PT", "NL", "CH", "BE", "SE", "NO", "DK", "FI", "IE", "PL", "AT"
        ];
        if (westernCodes.includes(country)) {
          if (Array.isArray(updated.lastScannedPosts) && updated.lastScannedPosts.length > 0) {
            const hasInvalidPosts = updated.lastScannedPosts.some((p: any) => {
              const fullText = `${p.text || ""} ${p.authorName || ""}`;
              return (
                /[\u0400-\u04FF\u0500-\u052F\u4e00-\u9fa5\u3040-\u30ff\uac00-\ud7af\u0600-\u06ffăâđêôơưĂÂĐÊÔƠƯ]/.test(fullText) ||
                /\b(шукаємо|вакансия|вакансія|we-edit|career opportunity|hiring)\b/i.test(fullText)
              );
            });

            if (hasInvalidPosts) {
              hadModifications = true;
              const cleanPosts = updated.lastScannedPosts.filter((p: any) => {
                const fullText = `${p.text || ""} ${p.authorName || ""}`;
                return !(
                  /[\u0400-\u04FF\u0500-\u052F\u4e00-\u9fa5\u3040-\u30ff\uac00-\ud7af\u0600-\u06ffăâđêôơưĂÂĐÊÔƠƯ]/.test(fullText) ||
                  /\b(шукаємо|вакансия|вакансія|we-edit|career opportunity|hiring)\b/i.test(fullText)
                );
              });

              if (cleanPosts.length > 0) {
                updated.lastScannedPosts = cleanPosts;
              } else if (country === "US") {
                updated.lastScannedPosts = verifiedUsaOutreachScannedPosts;
              }
            }
          } else if (country === "US") {
            hadModifications = true;
            updated.lastScannedPosts = verifiedUsaOutreachScannedPosts;
          }
        }

        return updated;
      });

    if (hadModifications) {
      localStorage.setItem(L3_KEY, JSON.stringify(monitors));
    }
    return monitors;
  } catch {
    return initialLevel3Monitors;
  }
}

export function saveStoredLevel3Monitors(monitors: Level3GlobalMonitor[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(L3_KEY, JSON.stringify(monitors));
    window.dispatchEvent(new CustomEvent(L4_GLOBAL_MONITORS_CHANGE_EVENT));
    syncMonitorsToDbInBackground("level_4", monitors);
  } catch {}
}

export const getStoredLevel4GlobalMonitors = getStoredLevel3Monitors;
export const saveStoredLevel4GlobalMonitors = saveStoredLevel3Monitors;

export function getStoredSignalLeads(): SignalLeadItem[] {
  if (typeof window === "undefined") return initialDiscoveredLeads;
  try {
    const raw = localStorage.getItem(LEADS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    let hadModifications = false;

    // 1. Filtrar registros inválidos
    const validLeads = parsed.filter((l: SignalLeadItem) => {
      if (!l || !l.id || !l.fullName) return false;
      const urlLower = (l.linkedinUrl || "").toLowerCase();
      const nameLower = (l.fullName || "").toLowerCase();
      if (urlLower.includes("davi-magalde") || nameLower.includes("davi magalde")) {
        hadModifications = true;
        return false;
      }
      // Purgar residuos de búsquedas previas con alfabetos no soportados (ej. cirílico, coreano, chino, etc.)
      const leadText = `${l.fullName} ${l.headline || ""} ${l.signalSnippet || ""} ${l.sourcePostTitle || ""}`;
      if (/[\u0400-\u04FF\u0500-\u052F\u4e00-\u9fa5\u3040-\u30ff\uac00-\ud7af\u0600-\u06ff]/.test(leadText)) {
        hadModifications = true;
        return false;
      }

      // Purgar leads residuales defectuosos ("Prospecto de LinkedIn" o URL genérica sin identificador)
      if (
        l.fullName === "Prospecto de LinkedIn" ||
        l.linkedinUrl === "https://www.linkedin.com" ||
        l.linkedinUrl === "https://www.linkedin.com/"
      ) {
        hadModifications = true;
        return false;
      }

      return true;
    });

    // 2. Purgar duplicados estrictos (mismo lead para la misma fuente/monitor)
    const seen = new Set<string>();
    const deduplicatedLeads: SignalLeadItem[] = [];

    for (const l of validLeads) {
      const cleanUrl = (l.linkedinUrl || "").toLowerCase().trim();
      const cleanName = (l.fullName || "").toLowerCase().trim();
      const source = (l.sourceAuthorName || l.monitorId || "").toLowerCase().trim();

      const key = cleanUrl ? `${source}::url::${cleanUrl}` : `${source}::name::${cleanName}`;
      if (!seen.has(key)) {
        seen.add(key);
        deduplicatedLeads.push(l);
      } else {
        hadModifications = true;
      }
    }

    if (hadModifications) {
      localStorage.setItem(LEADS_KEY, JSON.stringify(deduplicatedLeads));
    }
    return deduplicatedLeads;
  } catch {
    return [];
  }
}

export function saveStoredSignalLeads(leads: SignalLeadItem[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LEADS_KEY, JSON.stringify(leads));
    window.dispatchEvent(new CustomEvent(SIGNAL_LEADS_CHANGE_EVENT));
  } catch {
    // ignore
  }
}

export function addStoredSignalLead(lead: SignalLeadItem): void {
  if (typeof window === "undefined") return;
  const current = getStoredSignalLeads();
  const leadUrl = (lead.linkedinUrl || "").toLowerCase().trim();
  const leadName = (lead.fullName || "").toLowerCase().trim();
  const leadSource = (lead.sourceAuthorName || lead.monitorId || "").toLowerCase().trim();

  const exists = current.some((l) => {
    const lUrl = (l.linkedinUrl || "").toLowerCase().trim();
    const lName = (l.fullName || "").toLowerCase().trim();
    const lSource = (l.sourceAuthorName || l.monitorId || "").toLowerCase().trim();

    const isSameMonitor =
      (lead.monitorId && l.monitorId && lead.monitorId === l.monitorId) ||
      (leadSource && lSource && leadSource === lSource);

    if (isSameMonitor) {
      if (leadUrl && lUrl && leadUrl === lUrl) return true;
      if (leadName && lName && leadName === lName) return true;
    }
    return false;
  });

  if (exists) return;
  const updated = [lead, ...current];
  saveStoredSignalLeads(updated);
}

export function addMultipleStoredSignalLeads(newLeads: SignalLeadItem[]): SignalLeadItem[] {
  if (typeof window === "undefined") return [];
  const current = getStoredSignalLeads();
  const added: SignalLeadItem[] = [];

  for (const lead of newLeads) {
    const leadUrl = (lead.linkedinUrl || "").toLowerCase().trim();
    const leadName = (lead.fullName || "").toLowerCase().trim();
    const leadSource = (lead.sourceAuthorName || lead.monitorId || "").toLowerCase().trim();

    const exists = current.some((l) => {
      const lUrl = (l.linkedinUrl || "").toLowerCase().trim();
      const lName = (l.fullName || "").toLowerCase().trim();
      const lSource = (l.sourceAuthorName || l.monitorId || "").toLowerCase().trim();

      const isSameMonitor =
        (lead.monitorId && l.monitorId && lead.monitorId === l.monitorId) ||
        (leadSource && lSource && leadSource === lSource);

      if (isSameMonitor) {
        if (leadUrl && lUrl && leadUrl === lUrl) return true;
        if (leadName && lName && leadName === lName) return true;
      }
      return false;
    });

    if (!exists) {
      current.unshift(lead);
      added.push(lead);
    }
  }

  saveStoredSignalLeads(current);
  return added;
}

export function useSignalRadar() {
  const [l1Monitors, setL1Monitors] = useState<Level1Monitor[]>([]);
  const [l2Monitors, setL2Monitors] = useState<Level2CompetitorMonitor[]>([]);
  const [l3GroupMonitors, setL3GroupMonitors] = useState<Level3GroupMonitor[]>([]);
  const [l4GlobalMonitors, setL4GlobalMonitors] = useState<Level4GlobalMonitor[]>([]);
  const [leads, setLeads] = useState<SignalLeadItem[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const syncL1 = () => setL1Monitors(getStoredLevel1Monitors());
    const syncL2 = () => setL2Monitors(getStoredLevel2Monitors());
    const syncL3Groups = () => setL3GroupMonitors(getStoredLevel3GroupMonitors());
    const syncL4 = () => setL4GlobalMonitors(getStoredLevel4GlobalMonitors());
    const syncLeads = () => setLeads(getStoredSignalLeads());
    const syncAll = () => {
      syncL1();
      syncL2();
      syncL3Groups();
      syncL4();
      syncLeads();
    };

    syncAll();
    setIsLoaded(true);

    window.addEventListener(L1_MONITORS_CHANGE_EVENT, syncL1);
    window.addEventListener(L2_MONITORS_CHANGE_EVENT, syncL2);
    window.addEventListener(L3_GROUP_MONITORS_CHANGE_EVENT, syncL3Groups);
    window.addEventListener(L4_GLOBAL_MONITORS_CHANGE_EVENT, syncL4);
    window.addEventListener(SIGNAL_LEADS_CHANGE_EVENT, syncLeads);
    window.addEventListener("storage", syncAll);
    return () => {
      window.removeEventListener(L1_MONITORS_CHANGE_EVENT, syncL1);
      window.removeEventListener(L2_MONITORS_CHANGE_EVENT, syncL2);
      window.removeEventListener(L3_GROUP_MONITORS_CHANGE_EVENT, syncL3Groups);
      window.removeEventListener(L4_GLOBAL_MONITORS_CHANGE_EVENT, syncL4);
      window.removeEventListener(SIGNAL_LEADS_CHANGE_EVENT, syncLeads);
      window.removeEventListener("storage", syncAll);
    };
  }, []);

  const addLevel1Monitor = useCallback((monitor: Level1Monitor) => {
    const current = getStoredLevel1Monitors();
    const updated = [monitor, ...current.filter((m) => m.id !== monitor.id)];
    setL1Monitors(updated);
    saveStoredLevel1Monitors(updated);
  }, []);

  const updateLevel1Monitor = useCallback((id: string, updates: Partial<Level1Monitor>) => {
    const current = getStoredLevel1Monitors();
    const updated = current.map((m) => (m.id === id ? { ...m, ...updates } : m));
    setL1Monitors(updated);
    saveStoredLevel1Monitors(updated);
  }, []);

  const deleteLevel1Monitor = useCallback((id: string) => {
    const current = getStoredLevel1Monitors();
    const toDelete = current.find((m) => m.id === id);
    if (toDelete) {
      recordDeletedLevel1Monitor(toDelete);
    } else {
      recordDeletedLevel1Monitor(id);
    }
    const updated = current.filter((m) => m.id !== id);
    setL1Monitors(updated);
    saveStoredLevel1Monitors(updated);
    deleteMonitorFromDbInBackground(id);
  }, []);

  const toggleLevel1Status = useCallback((id: string) => {
    const current = getStoredLevel1Monitors();
    const updated = current.map((m) =>
      m.id === id ? { ...m, status: m.status === "active" ? ("paused" as const) : ("active" as const) } : m
    );
    setL1Monitors(updated);
    saveStoredLevel1Monitors(updated);
  }, []);

  const addLevel2Monitor = useCallback((monitor: Level2CompetitorMonitor) => {
    const current = getStoredLevel2Monitors();
    const updated = [monitor, ...current.filter((m) => m.id !== monitor.id)];
    setL2Monitors(updated);
    saveStoredLevel2Monitors(updated);
  }, []);

  const updateLevel2Monitor = useCallback((id: string, updates: Partial<Level2CompetitorMonitor>) => {
    const current = getStoredLevel2Monitors();
    const updated = current.map((m) => (m.id === id ? { ...m, ...updates } : m));
    setL2Monitors(updated);
    saveStoredLevel2Monitors(updated);
  }, []);

  const deleteLevel2Monitor = useCallback((id: string) => {
    const current = getStoredLevel2Monitors();
    const updated = current.filter((m) => m.id !== id);
    setL2Monitors(updated);
    saveStoredLevel2Monitors(updated);
    deleteMonitorFromDbInBackground(id);
  }, []);

  const toggleLevel2Status = useCallback((id: string) => {
    const current = getStoredLevel2Monitors();
    const updated = current.map((m) =>
      m.id === id ? { ...m, status: m.status === "active" ? ("paused" as const) : ("active" as const) } : m
    );
    setL2Monitors(updated);
    saveStoredLevel2Monitors(updated);
  }, []);

  // --- Nivel 3: Grupos de LinkedIn ---
  const addLevel3GroupMonitor = useCallback((monitor: Level3GroupMonitor) => {
    const current = getStoredLevel3GroupMonitors();
    const updated = [monitor, ...current.filter((m) => m.id !== monitor.id)];
    setL3GroupMonitors(updated);
    saveStoredLevel3GroupMonitors(updated);
  }, []);

  const updateLevel3GroupMonitor = useCallback((id: string, updates: Partial<Level3GroupMonitor>) => {
    const current = getStoredLevel3GroupMonitors();
    const updated = current.map((m) => (m.id === id ? { ...m, ...updates } : m));
    setL3GroupMonitors(updated);
    saveStoredLevel3GroupMonitors(updated);
  }, []);

  const deleteLevel3GroupMonitor = useCallback((id: string) => {
    const current = getStoredLevel3GroupMonitors();
    const updated = current.filter((m) => m.id !== id);
    setL3GroupMonitors(updated);
    saveStoredLevel3GroupMonitors(updated);
    deleteMonitorFromDbInBackground(id);
  }, []);

  const toggleLevel3GroupStatus = useCallback((id: string) => {
    const current = getStoredLevel3GroupMonitors();
    const updated = current.map((m) =>
      m.id === id ? { ...m, status: m.status === "active" ? ("paused" as const) : ("active" as const) } : m
    );
    setL3GroupMonitors(updated);
    saveStoredLevel3GroupMonitors(updated);
  }, []);

  // --- Nivel 4: Posts Globales en LinkedIn ---
  const addLevel4GlobalMonitor = useCallback((monitor: Level4GlobalMonitor) => {
    const current = getStoredLevel4GlobalMonitors();
    const updated = [monitor, ...current.filter((m) => m.id !== monitor.id)];
    setL4GlobalMonitors(updated);
    saveStoredLevel4GlobalMonitors(updated);
  }, []);

  const updateLevel4GlobalMonitor = useCallback((id: string, updates: Partial<Level4GlobalMonitor>) => {
    const current = getStoredLevel4GlobalMonitors();
    const updated = current.map((m) => (m.id === id ? { ...m, ...updates } : m));
    setL4GlobalMonitors(updated);
    saveStoredLevel4GlobalMonitors(updated);
  }, []);

  const deleteLevel4GlobalMonitor = useCallback((id: string) => {
    const current = getStoredLevel4GlobalMonitors();
    const updated = current.filter((m) => m.id !== id);
    setL4GlobalMonitors(updated);
    saveStoredLevel4GlobalMonitors(updated);
    deleteMonitorFromDbInBackground(id);
  }, []);

  const toggleLevel4GlobalStatus = useCallback((id: string) => {
    const current = getStoredLevel4GlobalMonitors();
    const updated = current.map((m) =>
      m.id === id ? { ...m, status: m.status === "active" ? ("paused" as const) : ("active" as const) } : m
    );
    setL4GlobalMonitors(updated);
    saveStoredLevel4GlobalMonitors(updated);
  }, []);

  // Alias retrocompatibles
  const addLevel3Monitor = addLevel4GlobalMonitor;
  const updateLevel3Monitor = updateLevel4GlobalMonitor;
  const deleteLevel3Monitor = deleteLevel4GlobalMonitor;
  const toggleLevel3Status = toggleLevel4GlobalStatus;

  const recordDiscoveredLeads = useCallback((newLeads: SignalLeadItem[]) => {
    const added = addMultipleStoredSignalLeads(newLeads);
    if (added.length > 0) {
      setLeads(getStoredSignalLeads());
    }
    return added;
  }, []);

  const getLeadsForMonitor = (monitorId: string) => {
    return leads.filter((l) => l.monitorId === monitorId);
  };

  const sanitizeLeadsForMonitor = useCallback((
    monitorId: string,
    targetEntities: string[]
  ): number => {
    const current = getStoredSignalLeads();
    const clean = current.filter((l) => {
      if (l.monitorId !== monitorId) return true;
      const isEmployee = isAuthorEmployeeOrAffiliate(
        { fullName: l.fullName, headline: l.headline, company: l.company },
        targetEntities
      );
      return !isEmployee;
    });
    const removedCount = current.length - clean.length;
    if (removedCount > 0) {
      saveStoredSignalLeads(clean);
      setLeads(clean);
    }
    return removedCount;
  }, []);

  return {
    l1Monitors,
    l2Monitors,
    l3GroupMonitors,
    l4GlobalMonitors,
    l4Monitors: l4GlobalMonitors,
    l3Monitors: l4GlobalMonitors, // alias retrocompatible
    leads,
    isLoaded,
    addLevel1Monitor,
    updateLevel1Monitor,
    deleteLevel1Monitor,
    toggleLevel1Status,
    addLevel2Monitor,
    updateLevel2Monitor,
    deleteLevel2Monitor,
    toggleLevel2Status,
    addLevel3GroupMonitor,
    updateLevel3GroupMonitor,
    deleteLevel3GroupMonitor,
    toggleLevel3GroupStatus,
    addLevel4GlobalMonitor,
    updateLevel4GlobalMonitor,
    deleteLevel4GlobalMonitor,
    toggleLevel4GlobalStatus,
    addLevel3Monitor,
    updateLevel3Monitor,
    deleteLevel3Monitor,
    toggleLevel3Status,
    recordDiscoveredLeads,
    getLeadsForMonitor,
    sanitizeLeadsForMonitor,
  };
}
