import { getSocialSellingDb } from "@/lib/persistence/db";
import type { Lead360Item, LeadListGroup } from "@/lib/leads/types";
import { NextRequest, NextResponse } from "next/server";

function rowToLead(row: any): Lead360Item {
  let metadata: Record<string, any> = {};
  try {
    metadata = row.metadata_json ? JSON.parse(row.metadata_json) : {};
  } catch {
    metadata = {};
  }
  return {
    ...metadata,
    id: row.id,
    listId: metadata.listId ?? row.list_id ?? "",
    fullName: metadata.fullName ?? row.full_name,
    linkedinUrl: metadata.linkedinUrl ?? row.linkedin_url ?? "",
    stage: (metadata.stage ?? row.stage ?? "lead_captured") as Lead360Item["stage"],
    sequenceStatus: (metadata.sequenceStatus ?? row.sequence_status ?? "in_progress") as Lead360Item["sequenceStatus"],
    intentScore: Number(metadata.intentScore ?? row.intent_score ?? 80),
    language: metadata.language ?? row.language ?? undefined,
    createdAt: metadata.createdAt ?? row.created_at,
  } as Lead360Item;
}

function rowToList(row: any): LeadListGroup {
  let metadata: Record<string, any> = {};
  try {
    metadata = row.metadata_json ? JSON.parse(row.metadata_json) : {};
  } catch {
    metadata = {};
  }
  return {
    ...metadata,
    id: row.id,
    name: metadata.name ?? row.name,
    signalLevel: (metadata.signalLevel ?? row.signal_level ?? "level_1") as LeadListGroup["signalLevel"],
    leadsCount: Number(metadata.leadsCount ?? row.leads_count ?? 0),
    assignedCampaign: metadata.assignedCampaign ?? row.assigned_campaign ?? "",
    createdAt: metadata.createdAt ?? row.created_at,
  } as LeadListGroup;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const listId = searchParams.get("listId");
    const db = getSocialSellingDb();

    const listRows = db.prepare("SELECT * FROM crm_lead_lists ORDER BY updated_at DESC").all();
    const leadRows = listId
      ? db.prepare("SELECT * FROM crm_leads_360 WHERE list_id = ? ORDER BY updated_at DESC").all(listId)
      : db.prepare("SELECT * FROM crm_leads_360 ORDER BY updated_at DESC").all();

    return NextResponse.json({
      ok: true,
      lists: listRows.map(rowToList),
      leads: leadRows.map(rowToLead),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error al consultar leads";
    console.error("[Leads API GET] Error:", error);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const incomingLists: LeadListGroup[] = Array.isArray(body.lists)
      ? body.lists
      : body.list
      ? [body.list]
      : [];
    const incomingLeads: Lead360Item[] = Array.isArray(body.leads)
      ? body.leads
      : body.lead
      ? [body.lead]
      : [];

    if (incomingLists.length === 0 && incomingLeads.length === 0) {
      return NextResponse.json(
        { ok: false, error: "Se requiere 'leads' o 'lists' para sincronizar." },
        { status: 400 }
      );
    }

    const db = getSocialSellingDb();
    const nowIso = new Date().toISOString();

    const upsertList = db.prepare(`
      INSERT OR REPLACE INTO crm_lead_lists (
        id, name, signal_level, leads_count, assigned_campaign, created_at, updated_at, metadata_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const upsertLead = db.prepare(`
      INSERT OR REPLACE INTO crm_leads_360 (
        id, list_id, full_name, linkedin_url, stage, sequence_status, intent_score, language, created_at, updated_at, metadata_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    let syncedLists = 0;
    let syncedLeads = 0;

    const tx = db.transaction(() => {
      for (const lg of incomingLists) {
        if (!lg || typeof lg.id !== "string" || !lg.id.trim()) continue;
        upsertList.run(
          lg.id.trim(),
          lg.name || "Lista Inteligente",
          lg.signalLevel || "level_1",
          Number(lg.leadsCount || 0),
          lg.assignedCampaign || "",
          lg.createdAt || nowIso,
          nowIso,
          JSON.stringify(lg)
        );
        syncedLists += 1;
      }

      for (const lead of incomingLeads) {
        if (!lead || typeof lead.id !== "string" || !lead.id.trim()) continue;
        upsertLead.run(
          lead.id.trim(),
          lead.listId || "",
          lead.fullName || "Contacto",
          lead.linkedinUrl || "",
          lead.stage || "lead_captured",
          lead.sequenceStatus || "in_progress",
          Number(lead.intentScore || 80),
          lead.language || null,
          lead.createdAt || nowIso,
          nowIso,
          JSON.stringify(lead)
        );
        syncedLeads += 1;
      }
    });

    tx();

    return NextResponse.json({
      ok: true,
      syncedLists,
      syncedLeads,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error al guardar leads";
    console.error("[Leads API POST] Error:", error);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const body = await req.json().catch(() => ({}));
    const leadId = searchParams.get("leadId") || body.leadId;
    const listId = searchParams.get("listId") || body.listId;

    if (!leadId && !listId) {
      return NextResponse.json(
        { ok: false, error: "Se requiere 'leadId' o 'listId'." },
        { status: 400 }
      );
    }

    const db = getSocialSellingDb();
    let deletedCount = 0;

    if (leadId) {
      const info = db.prepare("DELETE FROM crm_leads_360 WHERE id = ?").run(String(leadId).trim());
      deletedCount += info.changes;
    }

    if (listId) {
      const tx = db.transaction((targetListId: string) => {
        const lInfo = db.prepare("DELETE FROM crm_lead_lists WHERE id = ?").run(targetListId);
        const cInfo = db.prepare("DELETE FROM crm_leads_360 WHERE list_id = ?").run(targetListId);
        return lInfo.changes + cInfo.changes;
      });
      deletedCount += tx(String(listId).trim());
    }

    return NextResponse.json({ ok: true, deletedCount });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error al eliminar en SQLite";
    console.error("[Leads API DELETE] Error:", error);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
