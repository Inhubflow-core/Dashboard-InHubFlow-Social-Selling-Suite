"use client";

import { useCallback, useEffect, useState } from "react";
import { initialLeadLists, initialLeadsData } from "./mock-data";
import type { CrmStage, Lead360Item, LeadListGroup, SequenceStatus } from "./types";
import type { SignalLeadItem } from "@/lib/signals/types";
import { detectLeadLanguage } from "@/lib/signals/language-detector";

const LEADS_STORAGE_KEY = "inhubflow_leads_360";
const LISTS_STORAGE_KEY = "inhubflow_leads_lists";

export function getStoredLeads(): Lead360Item[] {
  if (typeof window === "undefined") return initialLeadsData;
  try {
    const raw = localStorage.getItem(LEADS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // Purgar SOLO leads mock antiguos si existieran
    const legacyMockIds = new Set([
      "lead-360-01",
      "lead-360-02",
      "lead-360-03",
      "lead-360-04",
      "lead-360-05",
      "lead-360-06",
      "lead-360-07",
      "lead-360-08",
    ]);
    let hadFixes = false;
    const cleanLeads = parsed
      .filter((l: Lead360Item) => {
        if (!l || !l.id || legacyMockIds.has(l.id)) return false;

        // Purgar prospectos identificados como empleados del competidor
        if ((l as any).isEmployee) {
          hadFixes = true;
          return false;
        }

        // Purgar explícitamente empleados confirmados de competidores monitoreados (ej: Davi Magalde en Prospectme)
        const urlLower = (l.linkedinUrl || "").toLowerCase();
        const fullNameLower = (l.fullName || "").toLowerCase();
        const isProspectMeList =
          (l.listName || "").toLowerCase().includes("prospect") ||
          (l.signalSource || "").toLowerCase().includes("prospect") ||
          (l.company || "").toLowerCase().includes("prospect");

        if (isProspectMeList) {
          if (urlLower.includes("davi-magalde") || fullNameLower.includes("davi magalde")) {
            hadFixes = true;
            return false;
          }
        }

        return true;
      })
      .map((l: Lead360Item) => {
        let avatar = l.avatarUrl;
        if (avatar && avatar.includes("unsplash.com")) {
          hadFixes = true;
          avatar = undefined;
        }

        // Recalibrar idioma con detector inteligente contextual
        const correctedLang = detectLeadLanguage({
          fullName: l.fullName,
          headline: l.title,
          location: l.location,
          linkedinUrl: l.linkedinUrl,
          competitorName: l.company || l.signalSource || l.listName,
          defaultLang: l.language,
        });

        if (correctedLang !== l.language) {
          hadFixes = true;
        }

        return {
          ...l,
          avatarUrl: avatar,
          language: correctedLang,
        };
      });

    // Purgar duplicados en listas de CRM (mismo listId y mismo linkedinUrl o fullName)
    const seenCrm = new Set<string>();
    const deduplicatedCrm: Lead360Item[] = [];
    for (const lead of cleanLeads) {
      const urlKey = (lead.linkedinUrl || "").toLowerCase().trim();
      const nameKey = (lead.fullName || "").toLowerCase().trim();
      const listKey = lead.listId || "default";
      const key = urlKey ? `${listKey}::url::${urlKey}` : `${listKey}::name::${nameKey}`;
      if (!seenCrm.has(key)) {
        seenCrm.add(key);
        deduplicatedCrm.push(lead);
      } else {
        hadFixes = true;
      }
    }

    if (deduplicatedCrm.length !== parsed.length || hadFixes) {
      localStorage.setItem(LEADS_STORAGE_KEY, JSON.stringify(deduplicatedCrm));
    }
    return deduplicatedCrm;
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
    // Purgar listas mock antiguas (ej: list-l1-01, list-l2-01)
    const legacyMockLists = new Set(["list-l1-01", "list-l2-01", "list-l3-01"]);
    const cleanLists = parsed.filter((lg: LeadListGroup) => lg && lg.id && !legacyMockLists.has(lg.id));

    // Sincronizar contadores exactos si existen leads en localStorage
    const rawLeads = localStorage.getItem(LEADS_STORAGE_KEY);
    const storedLeads: Lead360Item[] = rawLeads ? JSON.parse(rawLeads) : [];
    if (Array.isArray(storedLeads) && storedLeads.length > 0) {
      const calibratedLists = cleanLists.map((lg: LeadListGroup) => {
        const actualCount = storedLeads.filter(
          (l) =>
            l.listId === lg.id ||
            (lg.competitorName && (
              l.company?.toLowerCase().includes(lg.competitorName.toLowerCase()) ||
              l.signalSource?.toLowerCase().includes(lg.competitorName.toLowerCase())
            ))
        ).length;
        return {
          ...lg,
          leadsCount: actualCount,
        };
      });
      return calibratedLists;
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

export function syncSignalLeadsToCrm(): { leads: Lead360Item[]; lists: LeadListGroup[] } {
  if (typeof window === "undefined") return { leads: [], lists: [] };
  try {
    let currentLeads = getStoredLeads();
    let currentLists = getStoredLeadLists();
    let modified = false;

    // 1. Sincronizar monitores N2 existentes desde inhubflow_signals_l2
    const rawL2 = localStorage.getItem("inhubflow_signals_l2");
    const l2MonitorsMap = new Map<string, any>();
    if (rawL2) {
      try {
        const l2Monitors = JSON.parse(rawL2);
        if (Array.isArray(l2Monitors)) {
          for (const mon of l2Monitors) {
            if (!mon || !mon.competitorName) continue;
            l2MonitorsMap.set(mon.id, mon);
            const targetComp = mon.competitorName.trim().toLowerCase();
            let existingList = currentLists.find(
              (l) =>
                l.sourceMonitorId === mon.id ||
                (l.competitorName && l.competitorName.trim().toLowerCase() === targetComp) ||
                l.name.toLowerCase().startsWith(`[signal n2] ${targetComp}`)
            );
            if (!existingList) {
              const kw = mon.keywordsFilter?.slice(0, 2).join(", ") || "leads B2B";
              existingList = {
                id: `list-sig-n2-${mon.id}`,
                name: `[Signal N2] ${mon.competitorName} • ${kw}`,
                description: `Lista inteligente auto-alimentada por interacciones en publicaciones de ${mon.competitorName}.`,
                signalSource: "Competitor Posts (Nivel 2)",
                signalLevel: "level_2",
                leadsCount: mon.leadsIdentifiedCount || 0,
                assignedCampaign: "Secuencia de Social Selling",
                createdAt: mon.createdAt || new Date().toISOString(),
                competitorName: mon.competitorName,
                keywords: mon.keywordsFilter,
                sourceMonitorId: mon.id,
              };
              currentLists = [existingList, ...currentLists];
              modified = true;
            } else {
              let listUpdated = false;
              if (!existingList.sourceMonitorId) {
                existingList.sourceMonitorId = mon.id;
                listUpdated = true;
              }
              if (!existingList.competitorName) {
                existingList.competitorName = mon.competitorName;
                listUpdated = true;
              }
              if (listUpdated) modified = true;
            }
          }
        }
      } catch (e) {
        console.error("Error sincronizando monitores L2:", e);
      }
    }

    // 2. Sincronizar monitores N3 existentes desde inhubflow_signals_l3
    const rawL3 = localStorage.getItem("inhubflow_signals_l3");
    if (rawL3) {
      try {
        const l3Monitors = JSON.parse(rawL3);
        if (Array.isArray(l3Monitors)) {
          for (const mon of l3Monitors) {
            if (!mon || !mon.searchQuery) continue;
            const targetQuery = mon.searchQuery.trim().toLowerCase();
            let existingList = currentLists.find(
              (l) =>
                l.sourceMonitorId === mon.id ||
                l.name.toLowerCase().startsWith(`[signal n3] ${targetQuery.slice(0, 32)}`)
            );
            if (!existingList) {
              const locLabel = mon.targetCountryFlag && mon.targetCountryName 
                ? `${mon.targetCountryFlag} ${mon.targetCountryName}` 
                : mon.targetCountryName || "Global";
              existingList = {
                id: `list-sig-n3-${mon.id}`,
                name: `[Signal N3] ${mon.searchQuery.slice(0, 32)} • ${locLabel}`,
                description: `Lista inteligente auto-alimentada por debates y tendencias globales en LinkedIn sobre "${mon.searchQuery}" (${locLabel}).`,
                signalSource: `Debates Globales (${mon.searchQuery})`,
                signalLevel: "level_3",
                leadsCount: mon.leadsIdentifiedCount || 0,
                assignedCampaign: "Secuencia de Social Selling",
                createdAt: mon.createdAt || new Date().toISOString(),
                keywords: [mon.searchQuery, locLabel],
                sourceMonitorId: mon.id,
              };
              currentLists = [existingList, ...currentLists];
              modified = true;
            } else if (!existingList.sourceMonitorId) {
              existingList.sourceMonitorId = mon.id;
              modified = true;
            }
          }
        }
      } catch (e) {
        console.error("Error sincronizando monitores L3:", e);
      }
    }

    // 3. Sincronizar monitores N1 existentes desde inhubflow_signals_l1
    const rawL1 = localStorage.getItem("inhubflow_signals_l1");
    if (rawL1) {
      try {
        const l1Monitors = JSON.parse(rawL1);
        if (Array.isArray(l1Monitors)) {
          for (const mon of l1Monitors) {
            if (!mon || !mon.postTitle) continue;
            let existingList = currentLists.find(
              (l) => l.sourceMonitorId === mon.id || (mon.keyword && l.name.includes(mon.keyword))
            );
            if (!existingList) {
              existingList = {
                id: `list-sig-n1-${mon.id}`,
                name: `[Signal N1] ${mon.postTitle.slice(0, 24)}... • Keyword: ${mon.keyword}`,
                description: `Lista inteligente de prospectos que comentaron "${mon.keyword}" en tu publicación.`,
                signalSource: "Mis Posts (Nivel 1)",
                signalLevel: "level_1",
                leadsCount: mon.leadsCapturedCount || 0,
                assignedCampaign: "Secuencia Lead Magnet Automatizada (Nivel 1)",
                createdAt: mon.createdAt || new Date().toISOString(),
                keywords: [mon.keyword],
                sourceMonitorId: mon.id,
              };
              currentLists = [existingList, ...currentLists];
              modified = true;
            }
          }
        }
      } catch (e) {
        console.error("Error sincronizando monitores L1:", e);
      }
    }

    // 4. Sincronizar leads de señales descubiertos
    const rawSignals = localStorage.getItem("inhubflow_signals_leads");
    if (rawSignals) {
      try {
        const signalLeads: SignalLeadItem[] = JSON.parse(rawSignals);
        if (Array.isArray(signalLeads) && signalLeads.length > 0) {
          for (const sLead of signalLeads) {
            if (!sLead || !sLead.fullName) continue;

            const compName = sLead.sourceAuthorName || (sLead.monitorId && l2MonitorsMap.get(sLead.monitorId)?.competitorName) || "";
            const targetComp = compName ? compName.trim().toLowerCase() : "";

            let targetList = currentLists.find(
              (lg) =>
                (sLead.monitorId && lg.sourceMonitorId === sLead.monitorId) ||
                (targetComp && lg.competitorName && lg.competitorName.trim().toLowerCase() === targetComp) ||
                (targetComp && lg.name.toLowerCase().startsWith(`[signal n2] ${targetComp}`))
            );

            if (!targetList && compName) {
              targetList = getOrCreateMonitorList({
                monitorId: sLead.monitorId || `mon-${Date.now()}`,
                competitorName: compName,
                keywords: ["leads B2B"],
              });
              currentLists = getStoredLeadLists();
              modified = true;
            }

            if (targetList) {
              const alreadyInList = currentLeads.some(
                (l) =>
                  (sLead.linkedinUrl && l.linkedinUrl === sLead.linkedinUrl && l.listId === targetList?.id) ||
                  (l.fullName.toLowerCase() === sLead.fullName.toLowerCase() && l.listId === targetList?.id)
              );
              if (!alreadyInList) {
                importSignalLeadsToList(targetList, [sLead]);
                modified = true;
              }
            }
          }
        }
      } catch (e) {
        console.error("Error procesando signal leads:", e);
      }
    }

    // 5. Recalibrar contadores exactos para cada lista
    if (modified) {
      currentLeads = getStoredLeads();
      currentLists = getStoredLeadLists();
    }

    const recalibratedLists = currentLists.map((lg) => {
      const targetComp = lg.competitorName ? lg.competitorName.trim().toLowerCase() : null;
      const countInLeads = currentLeads.filter(
        (l) =>
          l.listId === lg.id ||
          (lg.sourceMonitorId && (l as any).monitorId === lg.sourceMonitorId) ||
          (targetComp && (
            (l.company && l.company.trim().toLowerCase() === targetComp) ||
            (l.signalSource && l.signalSource.trim().toLowerCase() === `signal: ${targetComp}`)
          ))
      ).length;

      // Usar el mayor entre los leads concretos en store y el conteo reportado por el monitor
      let monitorCount = 0;
      if (lg.sourceMonitorId && l2MonitorsMap.has(lg.sourceMonitorId)) {
        monitorCount = l2MonitorsMap.get(lg.sourceMonitorId)?.leadsIdentifiedCount || 0;
      }
      const finalCount = Math.max(countInLeads, monitorCount, lg.leadsCount || 0);

      return {
        ...lg,
        leadsCount: finalCount,
      };
    });

    localStorage.setItem(LISTS_STORAGE_KEY, JSON.stringify(recalibratedLists));
    return { leads: currentLeads, lists: recalibratedLists };
  } catch (err) {
    console.error("Error al sincronizar señales a CRM:", err);
    return { leads: getStoredLeads(), lists: getStoredLeadLists() };
  }
}

export function useLeadsStore() {
  const [leads, setLeads] = useState<Lead360Item[]>([]);
  const [lists, setLists] = useState<LeadListGroup[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const { leads: syncedLeads, lists: syncedLists } = syncSignalLeadsToCrm();
    setLeads(syncedLeads);
    setLists(syncedLists);
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

  const deleteList = (listId: string) => {
    const targetList = lists.find((l) => l.id === listId);
    const updatedLists = lists.filter((l) => l.id !== listId);
    setLists(updatedLists);
    if (typeof window !== "undefined") {
      localStorage.setItem(LISTS_STORAGE_KEY, JSON.stringify(updatedLists));
    }

    // Borrado en cascada de todos los contactos dentro de la lista
    const updatedLeads = leads.filter((lead) => {
      if (lead.listId === listId) return false;
      if (targetList?.competitorName) {
        const matchesComp =
          lead.company?.toLowerCase().includes(targetList.competitorName.toLowerCase()) ||
          lead.signalSource?.toLowerCase().includes(targetList.competitorName.toLowerCase());
        if (matchesComp && (!lead.listId || lead.listId === listId || lead.listId === targetList.id)) {
          return false;
        }
      }
      return true;
    });

    setLeads(updatedLeads);
    if (typeof window !== "undefined") {
      localStorage.setItem(LEADS_STORAGE_KEY, JSON.stringify(updatedLeads));

      // Purgar también señales sin procesar asociadas a esta lista
      try {
        const rawSignals = localStorage.getItem("inhubflow_signals_leads");
        if (rawSignals) {
          const signalLeads: SignalLeadItem[] = JSON.parse(rawSignals);
          if (Array.isArray(signalLeads)) {
            const filteredSignals = signalLeads.filter((s) => {
              if (targetList?.sourceMonitorId && s.monitorId === targetList.sourceMonitorId) return false;
              if (targetList?.competitorName && s.sourceAuthorName?.toLowerCase() === targetList.competitorName.toLowerCase()) return false;
              return true;
            });
            localStorage.setItem("inhubflow_signals_leads", JSON.stringify(filteredSignals));
          }
        }
      } catch (err) {
        console.warn("[deleteList] Error limpiando signals storage:", err);
      }
    }
  };

  const importSignalLeads = useCallback((targetList: LeadListGroup, signalLeads: SignalLeadItem[]) => {
    const result = importSignalLeadsToList(targetList, signalLeads);
    if (result.addedCount > 0) {
      setLeads(getStoredLeads());
      setLists(getStoredLeadLists());
    }
    return result;
  }, []);

  const batchUpdateLeadPhotos = (
    updates: Record<string, string | { photoUrl?: string; location?: string; language?: "en" | "es" | "pt"; headline?: string; isEmployee?: boolean }>
  ) => {
    if (!updates || Object.keys(updates).length === 0) return;
    setLeads((prev) => {
      // 1. Filtrar cualquier lead detectado como empleado interno
      const nonEmployees = prev.filter((l) => {
        const val = updates[l.id];
        if (val && typeof val === "object" && val.isEmployee === true) {
          return false;
        }
        return true;
      });

      // 2. Actualizar datos de los leads restantes válidos
      const updated = nonEmployees.map((l) => {
        const val = updates[l.id];
        if (!val) return l;
        if (typeof val === "string") {
          return { ...l, avatarUrl: val };
        }
        return {
          ...l,
          avatarUrl: val.photoUrl || l.avatarUrl,
          location: val.location || l.location,
          language: val.language || l.language,
          title: val.headline || l.title,
        };
      });

      if (typeof window !== "undefined") {
        localStorage.setItem(LEADS_STORAGE_KEY, JSON.stringify(updated));

        // Si se eliminó algún empleado, recalibrar los contadores de listas de inmediato
        if (nonEmployees.length !== prev.length) {
          const storedLists = getStoredLeadLists();
          const recalibrated = storedLists.map((lg) => ({
            ...lg,
            leadsCount: updated.filter(
              (l) =>
                l.listId === lg.id ||
                (lg.competitorName && (
                  l.company?.toLowerCase().includes(lg.competitorName.toLowerCase()) ||
                  l.signalSource?.toLowerCase().includes(lg.competitorName.toLowerCase())
                ))
            ).length,
          }));
          localStorage.setItem(LISTS_STORAGE_KEY, JSON.stringify(recalibrated));
          setLists(recalibrated);
        }
      }
      return updated;
    });
  };

  const getOrCreateList = useCallback((params: { monitorId: string; competitorName: string; keywords?: string[] }) => {
    const prevLists = getStoredLeadLists();
    const list = getOrCreateMonitorList(params);
    if (!prevLists.some((l) => l.id === list.id)) {
      setLists(getStoredLeadLists());
    }
    return list;
  }, []);

  const getOrCreateGlobalList = useCallback((params: {
    monitorId: string;
    searchQuery: string;
    countryName?: string;
    countryFlag?: string;
    icpTitles?: string[];
  }) => {
    const prevLists = getStoredLeadLists();
    const list = getOrCreateGlobalMonitorList(params);
    if (!prevLists.some((l) => l.id === list.id)) {
      setLists(getStoredLeadLists());
    }
    return list;
  }, []);

  return {
    leads,
    lists,
    isLoaded,
    updateLeadStage,
    updateLeadSequenceStatus,
    deleteLead,
    createList,
    deleteList,
    importSignalLeads,
    batchUpdateLeadPhotos,
    getOrCreateList,
    getOrCreateGlobalList,
  };
}

export const useLeads = useLeadsStore;

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

    const detectedLang = sLead.language || detectLeadLanguage({
      headline: sLead.headline,
      location: sLead.location,
      signalSnippet: sLead.signalSnippet,
    });

    // Sanitizar avatar para no persistir URLs falsas de stock
    const cleanAvatar = (sLead.avatarUrl && !sLead.avatarUrl.includes("unsplash.com") && sLead.avatarUrl.length > 5)
      ? sLead.avatarUrl
      : undefined;

    const lead360: Lead360Item = {
      id: `lead-crm-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      fullName: sLead.fullName || "Miembro de LinkedIn",
      firstName,
      lastName,
      title: sLead.headline || "Profesional en LinkedIn",
      company: sLead.company || (targetList.competitorName ? `Interactuó con ${targetList.competitorName}` : "No especificado"),
      location: sLead.location || "Remoto / No especificado",
      linkedinUrl: sLead.linkedinUrl || "",
      avatarUrl: cleanAvatar,
      signalSource: targetList.signalSource || `Signal: ${targetList.competitorName || "Competidor"}`,
      signalLevel: targetList.signalLevel || "level_2",
      intentScore: sLead.intentLevel === "very_high" ? 95 : sLead.intentLevel === "medium_high" ? 85 : 70,
      stage: "lead_captured",
      sequenceStatus: "in_progress",
      listId: targetList.id,
      listName: targetList.name,
      activeCampaignName: targetList.assignedCampaign || "Secuencia de Social Selling",
      language: detectedLang,
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

  // 3. Contar de manera exacta los leads reales que pertenecen a esta lista
  const targetComp = targetList.competitorName ? targetList.competitorName.trim().toLowerCase() : null;
  const actualCountInStore = updatedLeads.filter(
    (l) =>
      l.listId === targetList.id ||
      (targetList.sourceMonitorId && (l as any).monitorId === targetList.sourceMonitorId) ||
      (targetComp && (
        (l.company && l.company.trim().toLowerCase() === targetComp) ||
        (l.signalSource && l.signalSource.trim().toLowerCase() === `signal: ${targetComp}`)
      ))
  ).length;

  const existingListIndex = currentLists.findIndex((lg) => lg.id === targetList.id);
  const updatedList: LeadListGroup = {
    ...targetList,
    leadsCount: Math.max(actualCountInStore, targetList.leadsCount || 0),
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

export function getOrCreateMonitorList(params: {
  monitorId: string;
  competitorName: string;
  keywords?: string[];
}): LeadListGroup {
  const currentLists = getStoredLeadLists();
  const targetComp = params.competitorName.trim().toLowerCase();
  const existing = currentLists.find(
    (l) =>
      l.sourceMonitorId === params.monitorId ||
      (l.competitorName && l.competitorName.trim().toLowerCase() === targetComp) ||
      l.name.toLowerCase().startsWith(`[signal n2] ${targetComp}`)
  );
  if (existing) return existing;

  const kw = params.keywords?.slice(0, 2).join(", ") || "leads B2B";
  const newList: LeadListGroup = {
    id: `list-sig-n2-${params.monitorId}`,
    name: `[Signal N2] ${params.competitorName} • ${kw}`,
    description: `Lista inteligente auto-alimentada por interacciones en publicaciones de ${params.competitorName}.`,
    signalSource: "Competitor Posts (Nivel 2)",
    signalLevel: "level_2",
    leadsCount: 0,
    assignedCampaign: "Secuencia de Social Selling",
    createdAt: new Date().toISOString(),
    competitorName: params.competitorName,
    keywords: params.keywords,
    sourceMonitorId: params.monitorId,
  };

  const updatedLists = [newList, ...currentLists];
  if (typeof window !== "undefined") {
    localStorage.setItem(LISTS_STORAGE_KEY, JSON.stringify(updatedLists));
  }
  return newList;
}

export function getOrCreateGlobalMonitorList(params: {
  monitorId: string;
  searchQuery: string;
  countryName?: string;
  countryFlag?: string;
  icpTitles?: string[];
}): LeadListGroup {
  const currentLists = getStoredLeadLists();
  const targetQuery = params.searchQuery.trim().toLowerCase();
  const existing = currentLists.find(
    (l) =>
      l.sourceMonitorId === params.monitorId ||
      l.name.toLowerCase().startsWith(`[signal n3] ${targetQuery.slice(0, 32)}`)
  );
  if (existing) return existing;

  const locLabel = params.countryFlag && params.countryName 
    ? `${params.countryFlag} ${params.countryName}` 
    : params.countryName || "Global";
  const newList: LeadListGroup = {
    id: `list-sig-n3-${params.monitorId}`,
    name: `[Signal N3] ${params.searchQuery.slice(0, 32)} • ${locLabel}`,
    description: `Lista inteligente auto-alimentada por debates y tendencias globales en LinkedIn sobre "${params.searchQuery}" (${locLabel}).`,
    signalSource: `Debates Globales (${params.searchQuery})`,
    signalLevel: "level_3",
    leadsCount: 0,
    assignedCampaign: "Secuencia de Social Selling",
    createdAt: new Date().toISOString(),
    keywords: [params.searchQuery, locLabel],
    sourceMonitorId: params.monitorId,
  };

  const updatedLists = [newList, ...currentLists];
  if (typeof window !== "undefined") {
    localStorage.setItem(LISTS_STORAGE_KEY, JSON.stringify(updatedLists));
  }
  return newList;
}
