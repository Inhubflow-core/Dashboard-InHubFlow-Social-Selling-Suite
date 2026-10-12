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
    const clean = parsed.filter((m: Level1Monitor) => m && !m.id?.startsWith("mon-l1-"));
    if (clean.length !== parsed.length) localStorage.setItem(L1_KEY, JSON.stringify(clean));
    return clean;
  } catch {
    return [];
  }
}

export function getStoredLevel2Monitors(): Level2CompetitorMonitor[] {
  if (typeof window === "undefined") return initialLevel2Monitors;
  try {
    const raw = localStorage.getItem(L2_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const clean = parsed.filter((m: Level2CompetitorMonitor) => m && !m.id?.startsWith("mon-l2-"));
    if (clean.length !== parsed.length) localStorage.setItem(L2_KEY, JSON.stringify(clean));
    return clean;
  } catch {
    return [];
  }
}

export function getStoredLevel3Monitors(): Level3GlobalMonitor[] {
  if (typeof window === "undefined") return initialLevel3Monitors;
  try {
    const raw = localStorage.getItem(L3_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const clean = parsed.filter((m: Level3GlobalMonitor) => m && !m.id?.startsWith("mon-l3-"));
    if (clean.length !== parsed.length) localStorage.setItem(L3_KEY, JSON.stringify(clean));
    return clean;
  } catch {
    return [];
  }
}

export function getStoredSignalLeads(): SignalLeadItem[] {
  if (typeof window === "undefined") return initialDiscoveredLeads;
  try {
    const raw = localStorage.getItem(LEADS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const clean = parsed.filter((l: SignalLeadItem) => l && !l.id?.startsWith("sig-lead-"));
    if (clean.length !== parsed.length) localStorage.setItem(LEADS_KEY, JSON.stringify(clean));
    return clean;
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
  const updated = [lead, ...current];
  saveStoredSignalLeads(updated);
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
    if (typeof window !== "undefined") localStorage.setItem(L1_KEY, JSON.stringify(updated));
  };

  const toggleLevel1Status = (id: string) => {
    const updated = l1Monitors.map((m) =>
      m.id === id ? { ...m, status: m.status === "active" ? ("paused" as const) : ("active" as const) } : m
    );
    setL1Monitors(updated);
    if (typeof window !== "undefined") localStorage.setItem(L1_KEY, JSON.stringify(updated));
  };

  const addLevel2Monitor = (monitor: Level2CompetitorMonitor) => {
    const updated = [monitor, ...l2Monitors];
    setL2Monitors(updated);
    if (typeof window !== "undefined") localStorage.setItem(L2_KEY, JSON.stringify(updated));
  };

  const toggleLevel2Status = (id: string) => {
    const updated = l2Monitors.map((m) =>
      m.id === id ? { ...m, status: m.status === "active" ? ("paused" as const) : ("active" as const) } : m
    );
    setL2Monitors(updated);
    if (typeof window !== "undefined") localStorage.setItem(L2_KEY, JSON.stringify(updated));
  };

  const addLevel3Monitor = (monitor: Level3GlobalMonitor) => {
    const updated = [monitor, ...l3Monitors];
    setL3Monitors(updated);
    if (typeof window !== "undefined") localStorage.setItem(L3_KEY, JSON.stringify(updated));
  };

  const toggleLevel3Status = (id: string) => {
    const updated = l3Monitors.map((m) =>
      m.id === id ? { ...m, status: m.status === "active" ? ("paused" as const) : ("active" as const) } : m
    );
    setL3Monitors(updated);
    if (typeof window !== "undefined") localStorage.setItem(L3_KEY, JSON.stringify(updated));
  };

  const getLeadsForMonitor = (monitorId: string) => {
    return leads.filter((l) => l.monitorId === monitorId);
  };

  return {
    l1Monitors,
    l2Monitors,
    l3Monitors,
    leads,
    isLoaded,
    addLevel1Monitor,
    toggleLevel1Status,
    addLevel2Monitor,
    toggleLevel2Status,
    addLevel3Monitor,
    toggleLevel3Status,
    getLeadsForMonitor,
  };
}
