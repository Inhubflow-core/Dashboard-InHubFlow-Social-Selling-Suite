"use client";

import { useEffect, useState } from "react";
import { initialLeadLists, initialLeadsData } from "./mock-data";
import type { CrmStage, Lead360Item, LeadListGroup, SequenceStatus } from "./types";
import type { SignalLeadItem } from "@/lib/signals/types";

const LEADS_STORAGE_KEY = "inhubflow_leads_360";
const LISTS_STORAGE_KEY = "inhubflow_leads_lists";

export function getStoredLeads(): Lead360Item[] {
  if (typeof window === "undefined") return initialLeadsData;
  try {
    const raw = localStorage.getItem(LEADS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // Purgar leads mock antiguos
    const cleanLeads = parsed.filter((l: Lead360Item) => l && !l.id?.startsWith("lead-360-"));
    if (cleanLeads.length !== parsed.length) {
      localStorage.setItem(LEADS_STORAGE_KEY, JSON.stringify(cleanLeads));
    }
    return cleanLeads;
  } catch {
    return [];
  }
}

export function getStoredLeadLists(): LeadListGroup[] {
  if (typeof window === "undefined") return initialLeadLists;
  try {
    const raw = localStorage.getItem(LISTS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // Purgar listas mock antiguas
    const cleanLists = parsed.filter((lg: LeadListGroup) => lg && !lg.id?.startsWith("list-l"));
    if (cleanLists.length !== parsed.length) {
      localStorage.setItem(LISTS_STORAGE_KEY, JSON.stringify(cleanLists));
    }
    return cleanLists;
  } catch {
    return [];
  }
}

export function exportLeadsToCsv(leads: Lead360Item[]): void {
  if (typeof window === "undefined" || leads.length === 0) return;

  const headers = [
    "ID",
    "Nombre Completo",
    "Cargo",
    "Empresa",
    "Ubicacion",
    "Email",
    "Telefono",
    "URL LinkedIn",
    "Origen de Señal",
    "Puntuacion de Intencion",
    "Etapa CRM",
    "Estado Secuencia",
    "Lista",
    "Fecha Creacion",
  ];

  const rows = leads.map((l) => [
    `"${l.id}"`,
    `"${l.fullName.replace(/"/g, '""')}"`,
    `"${l.title.replace(/"/g, '""')}"`,
    `"${l.company.replace(/"/g, '""')}"`,
    `"${l.location.replace(/"/g, '""')}"`,
    `"${l.email || ""}"`,
    `"${l.phone || ""}"`,
    `"${l.linkedinUrl}"`,
    `"${l.signalSource.replace(/"/g, '""')}"`,
    `"${l.intentScore}"`,
    `"${l.stage}"`,
    `"${l.sequenceStatus}"`,
    `"${l.listName.replace(/"/g, '""')}"`,
    `"${l.createdAt}"`,
  ]);

  const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
  const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `InHubFlow_Leads_Export_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function useLeadsStore() {
  const [leads, setLeads] = useState<Lead360Item[]>([]);
  const [lists, setLists] = useState<LeadListGroup[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setLeads(getStoredLeads());
    setLists(getStoredLeadLists());
    setIsLoaded(true);
  }, []);

  const updateLeadStage = (leadId: string, newStage: CrmStage) => {
    const updated = leads.map((l) => {
      if (l.id === leadId) {
        const newTimelineEvent = {
          id: `tl-${Date.now()}`,
          timestamp: "Justo ahora",
          title: "Cambio de Etapa Manual",
          detail: `Mover a etapa: ${newStage}.`,
          type: "crm" as const,
        };
        return {
          ...l,
          stage: newStage,
          lastActivityAt: "Reciente",
          timeline: [newTimelineEvent, ...l.timeline],
        };
      }
      return l;
    });
    setLeads(updated);
    if (typeof window !== "undefined") localStorage.setItem(LEADS_STORAGE_KEY, JSON.stringify(updated));
  };

  const updateLeadSequenceStatus = (leadId: string, newStatus: SequenceStatus) => {
    const updated = leads.map((l) => (l.id === leadId ? { ...l, sequenceStatus: newStatus } : l));
    setLeads(updated);
    if (typeof window !== "undefined") localStorage.setItem(LEADS_STORAGE_KEY, JSON.stringify(updated));
  };

  const deleteLead = (leadId: string) => {
    const updated = leads.filter((l) => l.id !== leadId);
    setLeads(updated);
    if (typeof window !== "undefined") localStorage.setItem(LEADS_STORAGE_KEY, JSON.stringify(updated));
  };

  const createList = (newList: LeadListGroup) => {
    const updated = [newList, ...lists];
    setLists(updated);
    if (typeof window !== "undefined") localStorage.setItem(LISTS_STORAGE_KEY, JSON.stringify(updated));
  };

  const importSignalLeads = (targetList: LeadListGroup, signalLeads: SignalLeadItem[]) => {
    const result = importSignalLeadsToList(targetList, signalLeads);
    setLeads(getStoredLeads());
    setLists(getStoredLeadLists());
    return result;
  };

  return {
    leads,
    lists,
    isLoaded,
    updateLeadStage,
    updateLeadSequenceStatus,
    deleteLead,
    createList,
    importSignalLeads,
  };
}

export function importSignalLeadsToList(
  targetList: LeadListGroup,
  signalLeads: SignalLeadItem[]
): { list: LeadListGroup; addedCount: number } {
  if (typeof window === "undefined") return { list: targetList, addedCount: 0 };

  const currentLists = getStoredLeadLists();
  const currentLeads = getStoredLeads();

  // 1. Convertir SignalLeadItem a Lead360Item
  const convertedLeads: Lead360Item[] = [];
  for (const sLead of signalLeads) {
    const nameParts = (sLead.fullName || "").trim().split(" ");
    const firstName = nameParts[0] || "Contacto";
    const lastName = nameParts.slice(1).join(" ") || "";

    const exists = currentLeads.some(
      (l) =>
        (sLead.linkedinUrl && l.linkedinUrl === sLead.linkedinUrl && l.listId === targetList.id) ||
        (l.fullName.toLowerCase() === sLead.fullName.toLowerCase() && l.listId === targetList.id)
    );
    if (exists) continue;

    const lead360: Lead360Item = {
      id: `lead-360-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      fullName: sLead.fullName || "Miembro de LinkedIn",
      firstName,
      lastName,
      title: sLead.headline || "Profesional en LinkedIn",
      company: sLead.company || (targetList.competitorName ? `Interactuó con ${targetList.competitorName}` : "No especificado"),
      location: sLead.location || "Remoto / No especificado",
      linkedinUrl: sLead.linkedinUrl || "",
      avatarUrl: sLead.avatarUrl,
      signalSource: targetList.signalSource || `Signal: ${targetList.competitorName || "Competidor"}`,
      signalLevel: targetList.signalLevel || "level_2",
      intentScore: sLead.intentLevel === "very_high" ? 95 : sLead.intentLevel === "medium_high" ? 85 : 70,
      stage: "lead_captured",
      sequenceStatus: "in_progress",
      listId: targetList.id,
      listName: targetList.name,
      activeCampaignName: targetList.assignedCampaign || "Secuencia de Social Selling",
      timeline: [
        {
          id: `tl-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
          timestamp: "Justo ahora",
          title: "Captado por Signal Radar",
          detail: sLead.signalSnippet || "Interacción registrada en LinkedIn",
          type: "signal",
        },
      ],
      createdAt: new Date().toISOString(),
      lastActivityAt: "Reciente",
    };
    convertedLeads.push(lead360);
  }

  // 2. Guardar leads
  const updatedLeads = [...convertedLeads, ...currentLeads];
  localStorage.setItem(LEADS_STORAGE_KEY, JSON.stringify(updatedLeads));

  // 3. Guardar lista o actualizar contador
  const existingListIndex = currentLists.findIndex((lg) => lg.id === targetList.id);
  const updatedList: LeadListGroup = {
    ...targetList,
    leadsCount: (targetList.leadsCount || 0) + convertedLeads.length,
  };

  let updatedLists: LeadListGroup[];
  if (existingListIndex >= 0) {
    updatedLists = currentLists.map((lg) => (lg.id === targetList.id ? updatedList : lg));
  } else {
    updatedLists = [updatedList, ...currentLists];
  }
  localStorage.setItem(LISTS_STORAGE_KEY, JSON.stringify(updatedLists));

  return { list: updatedList, addedCount: convertedLeads.length };
}
