import { INITIAL_DEALS, INITIAL_MEETINGS } from "./mock-data";
import { CommercialMeeting, PipelineDeal, PipelineStageId } from "./types";

const DEALS_STORAGE_KEY = "inhubflow_pipeline_deals";
const MEETINGS_STORAGE_KEY = "inhubflow_pipeline_meetings";

export function getPipelineDeals(): PipelineDeal[] {
  if (typeof window === "undefined") return INITIAL_DEALS;
  try {
    const raw = localStorage.getItem(DEALS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const clean = parsed.filter((d: PipelineDeal) => d && !/^deal-[1-7]$/.test(d.id));
    if (clean.length !== parsed.length) localStorage.setItem(DEALS_STORAGE_KEY, JSON.stringify(clean));
    return clean;
  } catch {
    return [];
  }
}

export function savePipelineDeals(deals: PipelineDeal[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(DEALS_STORAGE_KEY, JSON.stringify(deals));
  } catch {
    // ignore
  }
}

export function moveDealStage(dealId: string, targetStageId: PipelineStageId): PipelineDeal[] {
  const deals = getPipelineDeals();
  const updated = deals.map((d) => {
    if (d.id === dealId) {
      return {
        ...d,
        stageId: targetStageId,
        lastActivity: "Etapa actualizada en Kanban comercial",
      };
    }
    return d;
  });
  savePipelineDeals(updated);
  return updated;
}

export function addPipelineDeal(deal: Omit<PipelineDeal, "id">): PipelineDeal[] {
  const deals = getPipelineDeals();
  const newDeal: PipelineDeal = {
    ...deal,
    id: "deal-" + Date.now(),
  };
  const updated = [newDeal, ...deals];
  savePipelineDeals(updated);
  return updated;
}

export function getMeetings(): CommercialMeeting[] {
  if (typeof window === "undefined") return INITIAL_MEETINGS;
  try {
    const raw = localStorage.getItem(MEETINGS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const clean = parsed.filter((m: CommercialMeeting) => m && !/^meet-[1-3]$/.test(m.id));
    if (clean.length !== parsed.length) localStorage.setItem(MEETINGS_STORAGE_KEY, JSON.stringify(clean));
    return clean;
  } catch {
    return [];
  }
}

export function saveMeetings(meetings: CommercialMeeting[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(MEETINGS_STORAGE_KEY, JSON.stringify(meetings));
  } catch {
    // ignore
  }
}

export function addCommercialMeeting(meeting: Omit<CommercialMeeting, "id">): CommercialMeeting[] {
  const meetings = getMeetings();
  const newMeeting: CommercialMeeting = {
    ...meeting,
    id: "meet-" + Date.now(),
  };
  const updated = [newMeeting, ...meetings];
  saveMeetings(updated);
  return updated;
}
