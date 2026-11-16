import { getSocialSellingDb } from "@/lib/persistence/db";
import { unipile } from "@/lib/unipile/client";
import { getStoredAccounts } from "@/lib/unipile/store";
import { NextRequest, NextResponse } from "next/server";

interface SchedulablePost {
  id: string;
  title?: string;
  format?: string;
  content: string;
  targetAccountId?: string;
  scheduledAt?: string;
  carouselPdfUrl?: string;
  coverImage?: string;
  mediaUrl?: string;
}

function isAccountHealthy(acc: any): boolean {
  if (!acc) return false;
  if (acc.status === "OK" || acc.status === "CONNECTED") return true;
  if (Array.isArray(acc.sources) && acc.sources.some((s: any) => s.status === "OK")) return true;
  return false;
}

function cleanUnipileId(id?: string): string {
  return (id || "").replace(/^acc-li-/, "");
}

async function resolveHealthyAccountId(
  requestedAccountId: string | undefined,
  liveAccounts: any[]
): Promise<string> {
  let targetAccountId = cleanUnipileId(requestedAccountId);
  let selectedAccountObj = liveAccounts.find((a) => cleanUnipileId(a.id) === targetAccountId);

  if (!selectedAccountObj || !isAccountHealthy(selectedAccountObj)) {
    const healthyLive = liveAccounts.find(isAccountHealthy);
    if (healthyLive) {
      targetAccountId = cleanUnipileId(healthyLive.id);
      selectedAccountObj = healthyLive;
    }
  }

  if (!targetAccountId) {
    const stored = getStoredAccounts();
    const healthyStored = stored.find((a) => a.status === "OK");
    if (healthyStored) {
      targetAccountId = cleanUnipileId(healthyStored.unipileAccountId || healthyStored.id);
    }
  }

  return targetAccountId;
}

function buildPostAttachments(post: SchedulablePost) {
  if (post.format === "carousel" && post.carouselPdfUrl) {
    return [
      {
        content: post.carouselPdfUrl,
        filename: "carrusel.pdf",
        content_type: "application/pdf",
      },
    ];
  }

  const imageSrc = post.coverImage || post.mediaUrl;
  if (imageSrc && imageSrc.startsWith("data:")) {
    return [
      {
        content: imageSrc,
        filename: "post-cover.png",
        content_type: "image/png",
      },
    ];
  }

  return undefined;
}

async function executeScheduledDispatch(clientDuePosts: SchedulablePost[] = []) {
  const nowIso = new Date().toISOString();
  const db = getSocialSellingDb();

  const dbDueRows = db
    .prepare(
      `SELECT * FROM viral_posts
       WHERE status = 'scheduled'
         AND scheduled_at IS NOT NULL
         AND scheduled_at <= ?`
    )
    .all(nowIso) as any[];

  const mergedById = new Map<string, SchedulablePost>();

  for (const row of dbDueRows) {
    let metadata: Record<string, any> = {};
    try {
      metadata = row.metadata_json ? JSON.parse(row.metadata_json) : {};
    } catch {
      metadata = {};
    }
    mergedById.set(row.id, {
      id: row.id,
      title: row.title,
      format: row.format,
      content: row.content,
      targetAccountId: row.target_account_id || undefined,
      scheduledAt: row.scheduled_at,
      carouselPdfUrl: metadata.carouselPdfUrl,
      coverImage: metadata.coverImage,
      mediaUrl: metadata.mediaUrl,
    });
  }

  for (const post of clientDuePosts) {
    if (!post || !post.id || !post.content?.trim()) continue;
    if (post.scheduledAt && post.scheduledAt > nowIso) continue;
    const prev = mergedById.get(post.id);
    mergedById.set(post.id, {
      ...(prev || {}),
      ...post,
    });
  }

  const postsToRun = Array.from(mergedById.values());
  if (postsToRun.length === 0) {
    return { ok: true, processed: 0, published: [], failed: [] };
  }

  let liveAccounts: any[] = [];
  try {
    const res = await unipile.listAccounts();
    liveAccounts = res.items || [];
  } catch (err) {
    console.warn("[Run Scheduled Posts] Error consultando cuentas Unipile:", err);
  }

  const updateStmt = db.prepare(`
    UPDATE viral_posts
    SET status = 'published',
        published_at = ?,
        linkedin_post_id = ?
    WHERE id = ?
  `);

  const published: Array<{ id: string; linkedinPostId: string; publishedAt: string }> = [];
  const failed: Array<{ id: string; error: string }> = [];

  for (const post of postsToRun) {
    try {
      if (!post.content || !post.content.trim()) {
        failed.push({ id: post.id, error: "Contenido vacío" });
        continue;
      }

      const accountId = await resolveHealthyAccountId(post.targetAccountId, liveAccounts);
      if (!accountId) {
        failed.push({ id: post.id, error: "No hay una cuenta de LinkedIn conectada (OK)." });
        continue;
      }

      const attachments = buildPostAttachments(post);
      const result = await unipile.createPost({
        account_id: accountId,
        text: post.content.trim(),
        attachments,
      });

      const linkedinPostId = result.post_id || result.id || `up_post_${Date.now()}`;
      const publishedAt = new Date().toISOString();

      updateStmt.run(publishedAt, linkedinPostId, post.id);
      published.push({ id: post.id, linkedinPostId, publishedAt });
    } catch (err: any) {
      console.error(`[Run Scheduled Posts] Error publicando ${post.id}:`, err);
      failed.push({ id: post.id, error: err?.message || "Error desconocido al publicar" });
    }
  }

  return {
    ok: true,
    processed: postsToRun.length,
    published,
    failed,
  };
}

export async function GET() {
  try {
    const result = await executeScheduledDispatch([]);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("[Run Scheduled Posts GET] Error:", error);
    return NextResponse.json(
      { ok: false, error: error.message || "Error al ejecutar publicaciones programadas." },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const duePosts: SchedulablePost[] = Array.isArray(body.duePosts) ? body.duePosts : [];
    const result = await executeScheduledDispatch(duePosts);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("[Run Scheduled Posts POST] Error:", error);
    return NextResponse.json(
      { ok: false, error: error.message || "Error al ejecutar publicaciones programadas." },
      { status: 500 }
    );
  }
}
