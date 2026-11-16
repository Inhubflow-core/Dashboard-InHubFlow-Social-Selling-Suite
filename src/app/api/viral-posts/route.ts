import { getSocialSellingDb } from "@/lib/persistence/db";
import type { CreatedPost } from "@/lib/viral-posts/types";
import { NextRequest, NextResponse } from "next/server";

const MAX_DATA_URL_LENGTH = 200 * 1024;

function stripLargeDataUrls(value: unknown): unknown {
  if (typeof value === "string") {
    if (value.startsWith("data:") && value.length > MAX_DATA_URL_LENGTH) {
      return undefined;
    }
    return value;
  }
  if (Array.isArray(value)) {
    return value.map(stripLargeDataUrls);
  }
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      const cleaned = stripLargeDataUrls(v);
      if (cleaned !== undefined) {
        out[k] = cleaned;
      }
    }
    return out;
  }
  return value;
}

function rowToCreatedPost(row: any): CreatedPost {
  let metadata: Record<string, any> = {};
  try {
    metadata = row.metadata_json ? JSON.parse(row.metadata_json) : {};
  } catch {
    metadata = {};
  }

  return {
    ...metadata,
    id: row.id,
    title: row.title,
    format: row.format,
    content: row.content,
    status: row.status,
    scheduledAt: row.scheduled_at || undefined,
    publishedAt: row.published_at || undefined,
    createdAt: row.created_at,
    targetAccountId: row.target_account_id || undefined,
    targetLanguage: row.target_language || undefined,
    linkedinPostId: row.linkedin_post_id || undefined,
    postUrl: row.post_url || undefined,
    leadMagnetKeyword: row.lead_magnet_keyword || undefined,
    autoDmEnabled: Boolean(row.auto_dm_enabled),
    autoDmMessage: row.auto_dm_message || undefined,
    autoLikeComment: Boolean(row.auto_like_comment),
  };
}

export async function GET() {
  try {
    const db = getSocialSellingDb();
    const rows = db
      .prepare("SELECT * FROM viral_posts ORDER BY created_at DESC")
      .all();

    return NextResponse.json({
      ok: true,
      posts: rows.map(rowToCreatedPost),
    });
  } catch (error: any) {
    console.error("[Viral Posts API GET] Error:", error);
    return NextResponse.json(
      { ok: false, error: error.message || "Error al obtener publicaciones." },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const incomingList: CreatedPost[] = Array.isArray(body.posts)
      ? body.posts
      : body.post
      ? [body.post]
      : [];

    if (incomingList.length === 0) {
      return NextResponse.json(
        { ok: false, error: "Se requiere 'post' o 'posts' para sincronizar." },
        { status: 400 }
      );
    }

    const db = getSocialSellingDb();
    const upsertStmt = db.prepare(`
      INSERT OR REPLACE INTO viral_posts (
        id,
        workspace_id,
        title,
        format,
        content,
        status,
        scheduled_at,
        published_at,
        created_at,
        target_account_id,
        target_language,
        linkedin_post_id,
        post_url,
        lead_magnet_keyword,
        auto_dm_enabled,
        auto_dm_message,
        auto_like_comment,
        metadata_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    let synced = 0;
    const syncTx = db.transaction((items: CreatedPost[]) => {
      for (const p of items) {
        if (!p || !p.id || !p.title) continue;
        const {
          id,
          title,
          format,
          content,
          status,
          scheduledAt,
          publishedAt,
          createdAt,
          targetAccountId,
          targetLanguage,
          linkedinPostId,
          postUrl,
          leadMagnetKeyword,
          autoDmEnabled,
          autoDmMessage,
          autoLikeComment,
          ...rest
        } = p;

        const safeMetadata = stripLargeDataUrls(rest) || {};

        upsertStmt.run(
          id,
          "default",
          title,
          format || "text",
          content || "",
          status || "draft",
          scheduledAt || null,
          publishedAt || null,
          createdAt || new Date().toISOString(),
          targetAccountId || null,
          targetLanguage || null,
          linkedinPostId || null,
          postUrl || null,
          leadMagnetKeyword || null,
          autoDmEnabled ? 1 : 0,
          autoDmMessage || null,
          autoLikeComment === false ? 0 : 1,
          JSON.stringify(safeMetadata)
        );
        synced++;
      }
    });

    syncTx(incomingList);

    return NextResponse.json({
      ok: true,
      synced,
    });
  } catch (error: any) {
    console.error("[Viral Posts API POST] Error:", error);
    return NextResponse.json(
      { ok: false, error: error.message || "Error al guardar publicaciones." },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get("id");
    if (!id) {
      return NextResponse.json(
        { ok: false, error: "Se requiere el parámetro 'id'." },
        { status: 400 }
      );
    }

    const db = getSocialSellingDb();
    const res = db.prepare("DELETE FROM viral_posts WHERE id = ?").run(id);

    return NextResponse.json({
      ok: true,
      deleted: res.changes > 0,
    });
  } catch (error: any) {
    console.error("[Viral Posts API DELETE] Error:", error);
    return NextResponse.json(
      { ok: false, error: error.message || "Error al eliminar publicación." },
      { status: 500 }
    );
  }
}
