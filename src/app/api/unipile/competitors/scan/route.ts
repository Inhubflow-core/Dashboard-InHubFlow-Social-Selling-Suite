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

function isAccountHealthy(acc: any): boolean {
  if (!acc) return false;
  if (acc.status === "OK" || acc.status === "CONNECTED") return true;
  if (Array.isArray(acc.sources) && acc.sources.some((s: any) => s.status === "OK" || s.status === "CONNECTED")) return true;
  return false;
}

import {
  extractCompanyFromHeadline,
  isAuthorEmployeeOrAffiliate,
} from "@/lib/signals/employee-filter";
import { detectLeadLanguage } from "@/lib/signals/language-detector";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    let accountId = String(body.accountId || "").replace(/^acc-li-/, "").trim();
    const competitorUrl = String(body.competitorUrl || "").trim();
    const competitorName = String(body.competitorName || "").trim();
    const interactionTypes = Array.isArray(body.interactionTypes)
      ? body.interactionTypes.filter((value: unknown): value is "likes" | "comments" => value === "likes" || value === "comments")
      : ["comments"];
    const limit = Math.min(10, Math.max(1, Number(body.limit) || 10));
    const batchLimit = Math.min(100, Math.max(10, Number(body.batchLimit) || 50));
    const minCommentThreshold = Math.max(0, Number(body.minCommentThreshold) || 0);
    const excludeAuthorEmployees = body.excludeAuthorEmployees !== false;

    const rawKeywords = Array.isArray(body.keywordsFilter)
      ? body.keywordsFilter
      : typeof body.keywordsFilter === "string"
      ? body.keywordsFilter.split(",")
      : [];
    const keywordsFilter = rawKeywords
      .map((k: string) => String(k || "").trim().toLowerCase())
      .filter(Boolean);

    if (!unipile.isConfigured()) {
      return NextResponse.json({ items: [], source: "unavailable", reason: "unipile_not_configured" }, { status: 503 });
    }

    // Auto-descubrir cuenta saludable de LinkedIn si la provista está desconectada o vacía
    if (unipile.isConfigured()) {
      try {
        const list = await unipile.listAccounts();
        const linkedinAccounts = (list.items || []).filter(
          (a: any) => String(a.type || a.provider || "").toUpperCase() === "LINKEDIN"
        );
        const healthyAccounts = linkedinAccounts.filter(isAccountHealthy);
        const isHealthy = accountId && healthyAccounts.some((a: any) => a.id === accountId);
        if (!isHealthy && healthyAccounts.length > 0) {
          accountId = healthyAccounts[0].id;
        }
      } catch (err) {
        console.warn("[CompetitorsScan] Error verificando cuentas Unipile:", err);
      }
    }

    if (!accountId || !competitorUrl) {
      return NextResponse.json({ error: "accountId y competitorUrl son obligatorios" }, { status: 400 });
    }

    let identifier = extractIdentifier(competitorUrl);
    const isCompany = !competitorUrl.includes("/in/");

    // Unipile requiere ID numérico para posts de empresas (ej. 1441 para Google o 97885580 para Adapta).
    // Si el identificador extraído de la URL es texto, lo enriquecemos primero con getCompanyProfile.
    if (isCompany && !/^\d+$/.test(identifier)) {
      try {
        const compProfile = await unipile.getCompanyProfile({ account_id: accountId, identifier });
        if (compProfile?.id && /^\d+$/.test(String(compProfile.id))) {
          identifier = String(compProfile.id);
        }
      } catch (e) {
        console.warn("[CompetitorsScan] No se pudo resolver ID numérico de empresa:", e);
      }
    } else if (!isCompany) {
      // Para perfiles personales, resolver provider_id interno para evitar error 422 invalid_recipient
      try {
        const userProfile = await unipile.resolveProfile(identifier, accountId);
        if (userProfile?.provider_id) {
          identifier = userProfile.provider_id;
        }
      } catch (e) {
        console.warn("[CompetitorsScan] No se pudo resolver provider_id para perfil personal:", e);
      }
    }

    const posts = await unipile.getUserPosts({
      account_id: accountId,
      identifier,
      limit,
      is_company: isCompany,
    });

    // Si se especificaron palabras clave, priorizar publicaciones que contengan alguno de los términos
    let matchingPosts = keywordsFilter.length > 0
      ? posts.filter((post) => {
          const text = String(post.text || "").toLowerCase();
          return keywordsFilter.some((kw: string) => text.includes(kw));
        })
      : posts;

    // Si se especificó umbral mínimo de comentarios (tracción mínima), filtrar publicaciones
    if (minCommentThreshold > 0) {
      const postsMeetingThreshold = matchingPosts.filter((post) => {
        const comments = Number(post.comments_count ?? post.commentsCount ?? (post as any).comments ?? post.num_comments ?? 0);
        return comments >= minCommentThreshold;
      });
      if (postsMeetingThreshold.length > 0) {
        matchingPosts = postsMeetingThreshold;
      }
    }

    const postsToProcess = matchingPosts.length > 0 ? matchingPosts : posts;

    const safePostsToProcess = postsToProcess.slice(0, limit);
    const interactions: Array<{ post: any; comments: any[]; reactions: any[] }> = [];

    for (let pIdx = 0; pIdx < safePostsToProcess.length; pIdx++) {
      const post = safePostsToProcess[pIdx];
      // Emular ritmo humano de lectura entre publicaciones (1.5s - 2.5s)
      if (pIdx > 0) {
        await new Promise((resolve) => setTimeout(resolve, 1500 + Math.random() * 1000));
      }

      const [comments, reactions] = await Promise.all([
        isRelevantInteraction(interactionTypes, "comments")
          ? unipile.getPostComments(post.id, accountId, 25).catch(() => ({ items: [] }))
          : Promise.resolve({ items: [] }),
        isRelevantInteraction(interactionTypes, "likes")
          ? unipile.getPostReactions(post.id, accountId, 25).catch(() => ({ items: [] }))
          : Promise.resolve({ items: [] }),
      ]);
      interactions.push({ post, comments: comments.items || [], reactions: reactions.items || [] });
    }

    // Preparar entidades del autor y competidor para el filtro anti-engagement interno
    const rawEntities = [competitorName, identifier];
    const targetEntitiesSet = new Set<string>();
    for (const ent of rawEntities) {
      if (!ent || typeof ent !== "string" || ent.trim().length < 2) continue;
      const clean = ent.trim();
      targetEntitiesSet.add(clean);
      targetEntitiesSet.add(clean.replace(/\s+/g, ""));
      targetEntitiesSet.add(clean.replace(/[\-_]/g, " "));
      targetEntitiesSet.add(clean.replace(/[\-_]/g, ""));
    }
    const targetEntities = Array.from(targetEntitiesSet);

    let excludedEmployeesCount = 0;
    const leadMap = new Map<string, Record<string, unknown>>();

    for (const interaction of interactions) {
      const postAuthorName = interaction.post?.author?.name || "";
      const currentTargets = [
        ...targetEntities,
        postAuthorName,
      ].filter((t): t is string => typeof t === "string" && t.trim().length >= 2);

      for (const comment of interaction.comments) {
        if (leadMap.size >= batchLimit) break;
        const author = comment.author;
        if (!author?.id) continue;

        const fullName = author.name || [author.first_name, author.last_name].filter(Boolean).join(" ") || "Miembro de LinkedIn";
        const headline = author.headline || "";
        const effectiveCompany = extractCompanyFromHeadline(headline) || "";

        // Anti-Engagement Interno: Excluir empleados del autor o del competidor
        if (excludeAuthorEmployees) {
          const isEmployee = isAuthorEmployeeOrAffiliate(
            { fullName, headline, company: effectiveCompany },
            currentTargets
          );
          if (isEmployee) {
            excludedEmployeesCount++;
            continue;
          }
        }

        const commentText = comment.text || "";
        const authorLinkedinUrl = author.profile_url || (author.public_identifier ? `https://www.linkedin.com/in/${author.public_identifier}` : "");
        const detectedCommentLang = detectLeadLanguage({
          fullName,
          headline,
          location: "",
          linkedinUrl: authorLinkedinUrl,
          signalSnippet: commentText,
          competitorName,
        });

        leadMap.set(author.id, {
          providerId: author.id,
          fullName,
          headline: headline || "Profesional en LinkedIn",
          company: effectiveCompany,
          location: "",
          linkedinUrl: authorLinkedinUrl,
          avatarUrl: author.picture_url || (author as any).profile_picture_url || undefined,
          signalSnippet: `Comentó en el post de ${competitorName || "la cuenta monitorizada"}: “${commentText}”`,
          signalType: "comment",
          intentLevel: "medium_high",
          intentScore: 90,
          sourcePostId: interaction.post.id,
          language: detectedCommentLang,
        });
      }

      if (leadMap.size >= batchLimit) break;

      for (const reaction of interaction.reactions) {
        if (leadMap.size >= batchLimit) break;
        const author = reaction.author;
        if (!author?.id || leadMap.has(author.id)) continue;

        const fullName = author.name || "Miembro de LinkedIn";
        const headline = author.headline || "";
        const effectiveCompany = extractCompanyFromHeadline(headline) || "";

        // Anti-Engagement Interno: Excluir empleados del autor o del competidor
        if (excludeAuthorEmployees) {
          const isEmployee = isAuthorEmployeeOrAffiliate(
            { fullName, headline, company: effectiveCompany },
            currentTargets
          );
          if (isEmployee) {
            excludedEmployeesCount++;
            continue;
          }
        }

        const reactionLinkedinUrl = author.profile_url || (author.public_identifier ? `https://www.linkedin.com/in/${author.public_identifier}` : "");
        const detectedReactionLang = detectLeadLanguage({
          fullName,
          headline,
          location: "",
          linkedinUrl: reactionLinkedinUrl,
          competitorName,
        });

        leadMap.set(author.id, {
          providerId: author.id,
          fullName,
          headline: headline || "Profesional en LinkedIn",
          company: effectiveCompany,
          location: "",
          linkedinUrl: reactionLinkedinUrl,
          avatarUrl: author.picture_url || (author as any).profile_picture_url || undefined,
          signalSnippet: `Reaccionó al post de ${competitorName || "la cuenta monitorizada"}`,
          signalType: "reaction",
          intentLevel: "medium",
          intentScore: 80,
          sourcePostId: interaction.post.id,
          language: detectedReactionLang,
        });
      }

      if (leadMap.size >= batchLimit) break;
    }

    const fallbackFeedUrl = isCompany
      ? `${competitorUrl.replace(/\/$/, "")}/posts/`
      : `${competitorUrl.replace(/\/$/, "")}/recent-activity/all/`;

    const scannedPosts = safePostsToProcess.map((post: any) => {
      const postId = String(post.id || post.post_id || "").trim();
      let directPostUrl = "";
      if (postId) {
        if (postId.startsWith("urn:li:activity:")) {
          directPostUrl = `https://www.linkedin.com/feed/update/${postId}/`;
        } else if (/^\d+$/.test(postId)) {
          directPostUrl = `https://www.linkedin.com/feed/update/urn:li:activity:${postId}/`;
        } else if (postId.startsWith("urn:li:")) {
          directPostUrl = `https://www.linkedin.com/feed/update/${postId}/`;
        }
      }

      let postUrl =
        post.share_url ||
        post.url ||
        directPostUrl ||
        fallbackFeedUrl;

      if (typeof postUrl === "string") {
        postUrl = postUrl.replace(/\/detail\/recent-activity\/shares\/?/, "/recent-activity/all/");
      }
      const rawText = String(post.text || post.commentary || "").trim();
      const text = rawText || "Publicación auditada en LinkedIn";
      return {
        id: postId || `post-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        url: postUrl,
        text: text.length > 150 ? text.slice(0, 150) + "..." : text,
        authorName: competitorName,
        reactionsCount: Number(post.reactions_count ?? post.reaction_counter ?? post.num_likes ?? 0),
        commentsCount: Number(post.comments_count ?? post.comment_counter ?? post.num_comments ?? 0),
        scannedAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
    });

    return NextResponse.json({
      items: Array.from(leadMap.values()),
      postsScanned: postsToProcess.length,
      scannedPosts,
      excludedEmployeesCount,
      batchLimit,
      leadsExtractedCount: leadMap.size,
      source: "unipile_live",
    });
  } catch (error) {
    console.error("[CompetitorsScan] Error en auditoría real:", error);
    return NextResponse.json({ items: [], source: "error", reason: "competitor_scan_failed" }, { status: 502 });
  }
}
