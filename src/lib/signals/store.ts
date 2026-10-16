"use client";

import { useEffect, useState } from "react";
import {
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
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((m: Level1Monitor) => Boolean(m && m.id && m.postTitle));
  } catch {
    return [];
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
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((m: Level2CompetitorMonitor) => Boolean(m && m.id && m.competitorName));
  } catch {
    return [];
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
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((m: Level3GlobalMonitor) => Boolean(m && m.id && m.searchQuery));
  } catch {
    return [];
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
    return parsed.filter((l: SignalLeadItem) => Boolean(l && l.id && l.fullName));
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
  // Evitar duplicados por monitorId + fullName o linkedinUrl
  const exists = current.some(
    (l) => l.monitorId === lead.monitorId && (l.fullName === lead.fullName || (lead.linkedinUrl && l.linkedinUrl === lead.linkedinUrl))
  );
  if (exists) return;
  const updated = [lead, ...current];
  saveStoredSignalLeads(updated);
}

export function addMultipleStoredSignalLeads(newLeads: SignalLeadItem[]): SignalLeadItem[] {
  if (typeof window === "undefined") return [];
  const current = getStoredSignalLeads();
  const added: SignalLeadItem[] = [];

  for (const lead of newLeads) {
    const exists = current.some(
      (l) => l.monitorId === lead.monitorId && (l.fullName === lead.fullName || (lead.linkedinUrl && l.linkedinUrl === lead.linkedinUrl))
    );
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
