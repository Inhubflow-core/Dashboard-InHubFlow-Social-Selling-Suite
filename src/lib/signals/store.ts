"use client";

import { useEffect, useState } from "react";
import {
  claudiaCuriRealPosts,
  viralPostsB2B,
  verifiedUsaOutreachScannedPosts,
  initialDiscoveredLeads,
  initialLevel1Monitors,
  initialLevel2Monitors,
  initialLevel3Monitors,
} from "./mock-data";
import type {
  Level1Monitor,
  Level2CompetitorMonitor,
  Level3GlobalMonitor,
  SignalLeadItem,
} from "./types";
import { isAuthorEmployeeOrAffiliate } from "./employee-filter";

const L1_KEY = "inhubflow_signals_l1";
const L2_KEY = "inhubflow_signals_l2";
const L3_KEY = "inhubflow_signals_l3";
const LEADS_KEY = "inhubflow_signals_leads";

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
    const monitors = parsed
      .filter((m: Level1Monitor) => Boolean(m && m.id && m.postTitle))
      .map((m: Level1Monitor) => {
        if (m.scanFrequency !== "daily") {
          hadModifications = true;
          return { ...m, scanFrequency: "daily" as const };
        }
        return m;
      });

    for (const initMon of initialLevel1Monitors) {
      if (!monitors.some((m) => m.id === initMon.id)) {
        monitors.push(initMon);
        hadModifications = true;
      }
    }

    if (hadModifications) {
      localStorage.setItem(L1_KEY, JSON.stringify(monitors));
    }
    return monitors;
  } catch {
    return initialLevel1Monitors;
  }
}

export function saveStoredLevel1Monitors(monitors: Level1Monitor[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(L1_KEY, JSON.stringify(monitors));
  } catch {}
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

        // Sanitización automática de posts previos en cache: Si el monitor es de USA o país occidental, purgar posts residuales en cirílico/vietnamita/chino o vacantes
        const country = (updated.targetCountry || "").toUpperCase();
        if (country === "US" || country === "ES" || country === "LATAM" || country === "UK" || country === "CA") {
          if (Array.isArray(updated.lastScannedPosts) && updated.lastScannedPosts.length > 0) {
            const hasInvalidPosts = updated.lastScannedPosts.some((p: any) => {
              const fullText = `${p.text || ""} ${p.authorName || ""}`;
              return (
                /[\u0400-\u04FF\u0500-\u052F\u4e00-\u9fa5ăâđêôơưĂÂĐÊÔƠƯ]/.test(fullText) ||
                /\b(шукаємо|вакансия|вакансія|we-edit|career opportunity|hiring)\b/i.test(fullText)
              );
            });

            if (hasInvalidPosts) {
              hadModifications = true;
              const cleanPosts = updated.lastScannedPosts.filter((p: any) => {
                const fullText = `${p.text || ""} ${p.authorName || ""}`;
                return !(
                  /[\u0400-\u04FF\u0500-\u052F\u4e00-\u9fa5ăâđêôơưĂÂĐÊÔƠƯ]/.test(fullText) ||
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
  } catch {}
}

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
      // Purgar residuos de búsquedas previas con alfabetos no soportados (ej. cirílico en monitores occidentales)
      const leadText = `${l.fullName} ${l.headline || ""} ${l.signalSnippet || ""} ${l.sourcePostTitle || ""}`;
      if (/[\u0400-\u04FF\u0500-\u052F]/.test(leadText)) {
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

    if (leadUrl && lUrl && leadUrl === lUrl) return true;
    if (leadName && lName && leadName === lName && (leadSource === lSource || l.monitorId === lead.monitorId)) {
      return true;
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

      if (leadUrl && lUrl && leadUrl === lUrl) return true;
      if (leadName && lName && leadName === lName && (leadSource === lSource || l.monitorId === lead.monitorId)) {
        return true;
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
  const [l3Monitors, setL3Monitors] = useState<Level3GlobalMonitor[]>([]);
  const [leads, setLeads] = useState<SignalLeadItem[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setL1Monitors(getStoredLevel1Monitors());
    setL2Monitors(getStoredLevel2Monitors());
    setL3Monitors(getStoredLevel3Monitors());
    setLeads(getStoredSignalLeads());
    setIsLoaded(true);
  }, []);

  const addLevel1Monitor = (monitor: Level1Monitor) => {
    const updated = [monitor, ...l1Monitors];
    setL1Monitors(updated);
    saveStoredLevel1Monitors(updated);
  };

  const updateLevel1Monitor = (id: string, updates: Partial<Level1Monitor>) => {
    const updated = l1Monitors.map((m) => (m.id === id ? { ...m, ...updates } : m));
    setL1Monitors(updated);
    saveStoredLevel1Monitors(updated);
  };

  const deleteLevel1Monitor = (id: string) => {
    const updated = l1Monitors.filter((m) => m.id !== id);
    setL1Monitors(updated);
    saveStoredLevel1Monitors(updated);
  };

  const toggleLevel1Status = (id: string) => {
    const updated = l1Monitors.map((m) =>
      m.id === id ? { ...m, status: m.status === "active" ? ("paused" as const) : ("active" as const) } : m
    );
    setL1Monitors(updated);
    saveStoredLevel1Monitors(updated);
  };

  const addLevel2Monitor = (monitor: Level2CompetitorMonitor) => {
    const updated = [monitor, ...l2Monitors];
    setL2Monitors(updated);
    saveStoredLevel2Monitors(updated);
  };

  const updateLevel2Monitor = (id: string, updates: Partial<Level2CompetitorMonitor>) => {
    const updated = l2Monitors.map((m) => (m.id === id ? { ...m, ...updates } : m));
    setL2Monitors(updated);
    saveStoredLevel2Monitors(updated);
  };

  const deleteLevel2Monitor = (id: string) => {
    const updated = l2Monitors.filter((m) => m.id !== id);
    setL2Monitors(updated);
    saveStoredLevel2Monitors(updated);
  };

  const toggleLevel2Status = (id: string) => {
    const updated = l2Monitors.map((m) =>
      m.id === id ? { ...m, status: m.status === "active" ? ("paused" as const) : ("active" as const) } : m
    );
    setL2Monitors(updated);
    saveStoredLevel2Monitors(updated);
  };

  const addLevel3Monitor = (monitor: Level3GlobalMonitor) => {
    const updated = [monitor, ...l3Monitors];
    setL3Monitors(updated);
    saveStoredLevel3Monitors(updated);
  };

  const updateLevel3Monitor = (id: string, updates: Partial<Level3GlobalMonitor>) => {
    const updated = l3Monitors.map((m) => (m.id === id ? { ...m, ...updates } : m));
    setL3Monitors(updated);
    saveStoredLevel3Monitors(updated);
  };

  const deleteLevel3Monitor = (id: string) => {
    const updated = l3Monitors.filter((m) => m.id !== id);
    setL3Monitors(updated);
    saveStoredLevel3Monitors(updated);
  };

  const toggleLevel3Status = (id: string) => {
    const updated = l3Monitors.map((m) =>
      m.id === id ? { ...m, status: m.status === "active" ? ("paused" as const) : ("active" as const) } : m
    );
    setL3Monitors(updated);
    saveStoredLevel3Monitors(updated);
  };

  const recordDiscoveredLeads = (newLeads: SignalLeadItem[]) => {
    const added = addMultipleStoredSignalLeads(newLeads);
    if (added.length > 0) {
      setLeads(getStoredSignalLeads());
    }
    return added;
  };

  const getLeadsForMonitor = (monitorId: string) => {
    return leads.filter((l) => l.monitorId === monitorId);
  };

  const sanitizeLeadsForMonitor = (
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
  };

  return {
    l1Monitors,
    l2Monitors,
    l3Monitors,
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
    addLevel3Monitor,
    updateLevel3Monitor,
    deleteLevel3Monitor,
    toggleLevel3Status,
    recordDiscoveredLeads,
    getLeadsForMonitor,
    sanitizeLeadsForMonitor,
  };
}
