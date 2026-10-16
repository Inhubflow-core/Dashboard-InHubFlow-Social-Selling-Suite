import { NextRequest, NextResponse } from "next/server";
import { unipile } from "@/lib/unipile/client";

function extractIdentifier(url: string): string {
  try {
    const parsed = new URL(url);
    const parts = parsed.pathname.split("/").filter(Boolean);
    return parts.at(-1) || url;
  } catch {
    return url.trim();
  }
}

function isRelevantInteraction(type: Array<"likes" | "comments">, interaction: "likes" | "comments") {
  return type.includes(interaction);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const accountId = String(body.accountId || "").replace(/^acc-li-/, "").trim();
    const competitorUrl = String(body.competitorUrl || "").trim();
    const competitorName = String(body.competitorName || "").trim();
    const interactionTypes = Array.isArray(body.interactionTypes)
      ? body.interactionTypes.filter((value: unknown): value is "likes" | "comments" => value === "likes" || value === "comments")
      : ["comments"];
    const limit = Math.min(25, Math.max(1, Number(body.limit) || 10));

    if (!unipile.isConfigured()) {
      return NextResponse.json({ items: [], source: "unavailable", reason: "unipile_not_configured" }, { status: 503 });
    }
    if (!accountId || !competitorUrl) {
      return NextResponse.json({ error: "accountId y competitorUrl son obligatorios" }, { status: 400 });
    }

    const identifier = extractIdentifier(competitorUrl);
    const posts = await unipile.getUserPosts({
      account_id: accountId,
      identifier,
      limit,
      is_company: !competitorUrl.includes("/in/"),
    });

    const interactions = await Promise.all(
      posts.slice(0, limit).map(async (post) => {
        const [comments, reactions] = await Promise.all([
          isRelevantInteraction(interactionTypes, "comments")
            ? unipile.getPostComments(post.id, accountId, 100).catch(() => ({ items: [] }))
            : Promise.resolve({ items: [] }),
          isRelevantInteraction(interactionTypes, "likes")
            ? unipile.getPostReactions(post.id, accountId, 100).catch(() => ({ items: [] }))
            : Promise.resolve({ items: [] }),
        ]);
        return { post, comments: comments.items || [], reactions: reactions.items || [] };
      })
    );

    const leadMap = new Map<string, Record<string, unknown>>();
    for (const interaction of interactions) {
      for (const comment of interaction.comments) {
        const author = comment.author;
        if (!author?.id) continue;
        leadMap.set(author.id, {
          providerId: author.id,
          fullName: author.name || [author.first_name, author.last_name].filter(Boolean).join(" ") || "Miembro de LinkedIn",
          headline: author.headline || "Profesional en LinkedIn",
          company: "",
          location: "",
          linkedinUrl: author.profile_url || (author.public_identifier ? `https://www.linkedin.com/in/${author.public_identifier}` : ""),
          avatarUrl: author.picture_url || undefined,
          signalSnippet: `Comentó en el post de ${competitorName || "la cuenta monitorizada"}: “${comment.text || ""}”`,
          signalType: "comment",
          sourcePostId: interaction.post.id,
        });
      }
      for (const reaction of interaction.reactions) {
        const author = reaction.author;
        if (!author?.id || leadMap.has(author.id)) continue;
        leadMap.set(author.id, {
          providerId: author.id,
          fullName: author.name || "Miembro de LinkedIn",
          headline: author.headline || "Profesional en LinkedIn",
          company: "",
          location: "",
          linkedinUrl: author.profile_url || (author.public_identifier ? `https://www.linkedin.com/in/${author.public_identifier}` : ""),
          avatarUrl: author.picture_url || undefined,
          signalSnippet: `Reaccionó al post de ${competitorName || "la cuenta monitorizada"}`,
          signalType: "reaction",
          sourcePostId: interaction.post.id,
        });
      }
    }

    return NextResponse.json({ items: Array.from(leadMap.values()), postsScanned: posts.length, source: "unipile_live" });
  } catch (error) {
    console.error("[CompetitorsScan] Error en auditoría real:", error);
    return NextResponse.json({ items: [], source: "error", reason: "competitor_scan_failed" }, { status: 502 });
  }
}
