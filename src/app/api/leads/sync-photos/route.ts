import { NextRequest, NextResponse } from "next/server";
import { unipile } from "@/lib/unipile/client";
import { detectLeadLanguage } from "@/lib/signals/language-detector";

function isAccountHealthy(acc: any): boolean {
  if (!acc) return false;
  if (acc.status === "OK" || acc.status === "CONNECTED") return true;
  if (Array.isArray(acc.sources) && acc.sources.some((s: any) => s.status === "OK" || s.status === "CONNECTED")) return true;
  return false;
}

export interface SyncedLeadData {
  photoUrl?: string;
  location?: string;
  language?: "en" | "es" | "pt";
  headline?: string;
}

/**
 * POST /api/leads/sync-photos
 * Sincroniza y extrae las fotos oficiales, la ubicación geográfica real
 * y recalcula con precisión el idioma del prospecto en LinkedIn.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const targets: Array<{ id: string; linkedinUrl?: string; fullName?: string; competitorName?: string }> =
      Array.isArray(body.targets) ? body.targets : [];

    if (targets.length === 0) {
      return NextResponse.json({ updated: {}, syncedCount: 0 });
    }

    if (!unipile.isConfigured()) {
      return NextResponse.json({
        updated: {},
        syncedCount: 0,
        message: "Motor Unipile no configurado en este entorno",
      });
    }

    // Resolver cuenta de LinkedIn conectada
    let accountId = "";
    try {
      const list = await unipile.listAccounts();
      const linkedinAccounts = (list.items || []).filter(
        (a: any) => String(a.type || a.provider || "").toUpperCase() === "LINKEDIN"
      );
      const healthyAccounts = linkedinAccounts.filter(isAccountHealthy);
      if (healthyAccounts.length > 0) {
        accountId = healthyAccounts[0].id;
      }
    } catch (e) {
      console.warn("[sync-photos] Error obteniendo cuentas de LinkedIn:", e);
    }

    if (!accountId) {
      return NextResponse.json({
        updated: {},
        syncedCount: 0,
        message: "No hay cuenta activa de LinkedIn conectada para sincronizar fotos",
      });
    }

    const updated: Record<string, SyncedLeadData> = {};
    let syncedCount = 0;

    // Procesar hasta 15 perfiles por lote para respetar cuotas y ritmo seguro
    const batch = targets.filter((t) => t.linkedinUrl && t.linkedinUrl.includes("/in/")).slice(0, 15);

    for (const item of batch) {
      try {
        // Jitter de 200-400ms para emular comportamiento natural
        await new Promise((r) => setTimeout(r, 200 + Math.floor(Math.random() * 200)));

        const profile = await unipile.resolveProfile(item.linkedinUrl!, accountId);
        const photoUrl =
          profile.profile_picture_url_large ||
          profile.profile_picture_url ||
          (profile as any).picture_url ||
          undefined;

        const effectiveLocation = profile.location && profile.location.trim().length > 1
          ? profile.location.trim()
          : undefined;

        const effectiveHeadline = profile.headline && profile.headline.trim().length > 1
          ? profile.headline.trim()
          : undefined;

        const detectedLang = detectLeadLanguage({
          fullName: item.fullName || (profile.first_name ? `${profile.first_name} ${profile.last_name || ""}` : undefined),
          headline: effectiveHeadline,
          location: effectiveLocation,
          linkedinUrl: item.linkedinUrl,
          competitorName: item.competitorName,
        });

        const cleanPhoto = (photoUrl && typeof photoUrl === "string" && !photoUrl.includes("unsplash.com"))
          ? photoUrl
          : undefined;

        updated[item.id] = {
          photoUrl: cleanPhoto,
          location: effectiveLocation,
          language: detectedLang,
          headline: effectiveHeadline,
        };
        syncedCount++;
      } catch (err) {
        // Silenciar errores individuales de perfil no encontrado o privado
        console.warn(`[sync-photos] No se pudo resolver perfil para lead ${item.id}:`, err instanceof Error ? err.message : String(err));
      }
    }

    return NextResponse.json({ updated, syncedCount });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error interno";
    return NextResponse.json({ error: message, updated: {}, syncedCount: 0 }, { status: 500 });
  }
}
