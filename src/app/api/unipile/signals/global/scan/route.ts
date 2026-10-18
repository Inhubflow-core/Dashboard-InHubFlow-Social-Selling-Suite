import { NextRequest, NextResponse } from "next/server";
import { unipile } from "@/lib/unipile/client";
import { detectLeadLanguage } from "@/lib/signals/language-detector";
import { isAuthorEmployeeOrAffiliate, normalizeText } from "@/lib/signals/employee-filter";

function isAccountHealthy(acc: any): boolean {
  if (!acc) return false;
  if (acc.status === "OK" || acc.status === "CONNECTED") return true;
  if (Array.isArray(acc.sources) && acc.sources.some((s: any) => s.status === "OK" || s.status === "CONNECTED")) return true;
  return false;
}

function matchesIcp(headline: string | null | undefined, icpTitles: string[]): boolean {
  if (!icpTitles || icpTitles.length === 0) return true;
  if (!headline) return false;

  const normHeadline = normalizeText(headline);
  return icpTitles.some((title) => {
    const normTitle = normalizeText(title);
    if (!normTitle) return false;
    const escaped = normTitle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`(^|[^a-z0-9_])${escaped}([^a-z0-9_]|$)`, "i");
    return regex.test(normHeadline) || normHeadline.includes(normTitle);
  });
}

function matchesLocation(location: string | null | undefined, locations: string[]): boolean {
  if (!locations || locations.length === 0) return true;
  if (!location || location.trim().length === 0) return true; // No descartar si LinkedIn no expone la ubicación en la vista de comentarios

  const normLoc = normalizeText(location);
  return locations.some((loc) => {
    const normL = normalizeText(loc);
    return normL && (normLoc.includes(normL) || normL.includes(normLoc));
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    let {
      accountId,
      searchQuery,
      icpTitles = [],
      locations = [],
      targetCountry = "all",
      interactionTypes = ["comments"],
      timePeriod = "past_week",
      minPostReactions = 10,
      limit = 8,
    } = body;

    if (!searchQuery || typeof searchQuery !== "string" || !searchQuery.trim()) {
      return NextResponse.json(
        { error: "searchQuery es obligatorio para escanear debates globales." },
        { status: 400 }
      );
    }

    const cleanQuery = searchQuery.trim();
    const cleanTitles = Array.isArray(icpTitles)
      ? icpTitles.map((t: string) => String(t || "").trim()).filter(Boolean)
      : [];
    const cleanLocations = Array.isArray(locations)
      ? locations.map((l: string) => String(l || "").trim()).filter(Boolean)
      : [];

    const trackComments = !Array.isArray(interactionTypes) || interactionTypes.includes("comments");
    const trackLikes = Array.isArray(interactionTypes) && interactionTypes.includes("likes");

    if (!unipile.isConfigured()) {
      return NextResponse.json(
        { items: [], source: "unavailable", reason: "unipile_not_configured" },
        { status: 503 }
      );
    }

    // Auto-descubrir cuenta saludable de LinkedIn si la provista está desconectada o vacía
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
      console.warn("[GlobalScan] Error verificando cuentas de LinkedIn en Unipile:", err);
    }

    if (!accountId) {
      return NextResponse.json(
        {
          items: [],
          source: "unavailable",
          reason: "linkedin_account_not_connected",
          message: "No hay cuenta de LinkedIn conectada y saludable para realizar la búsqueda.",
        },
        { status: 400 }
      );
    }

    // 1. Buscar publicaciones relevantes en LinkedIn con Unipile
    console.log(`[GlobalScan] Buscando publicaciones globales en LinkedIn para "${cleanQuery}" (cuenta: ${accountId}, país: ${targetCountry})...`);
    let searchResponse: any;
    try {
      searchResponse = await unipile.searchLinkedIn({
        account_id: accountId,
        category: "posts",
        keywords: cleanQuery,
        limit: Math.min(20, Math.max(5, Number(limit) || 8)),
      });
    } catch (searchErr: any) {
      console.warn(`[GlobalScan] Error en búsqueda de posts para "${cleanQuery}":`, searchErr?.message || searchErr);
      return NextResponse.json(
        { items: [], error: searchErr?.message || "Error al buscar publicaciones en LinkedIn" },
        { status: 500 }
      );
    }

    const rawPosts: any[] = Array.isArray(searchResponse?.items) ? searchResponse.items : [];
    if (rawPosts.length === 0) {
      return NextResponse.json({
        success: true,
        items: [],
        totalPostsAnalyzed: 0,
        totalLeadsFound: 0,
        message: `No se encontraron publicaciones recientes para "${cleanQuery}" en LinkedIn.`,
      });
    }

    // Filtrar publicaciones por umbral de reacciones si está disponible el contador
    const targetMinReactions = Number(minPostReactions) || 10;
    const qualifiedPosts = rawPosts.filter((post) => {
      const count = Number(post.reaction_counter ?? post.reactions_count ?? 0);
      return count >= targetMinReactions || count === 0; // Si el contador no viene provisto, se incluye
    });

    const postsToProcess = (qualifiedPosts.length > 0 ? qualifiedPosts : rawPosts).slice(0, 6);
    console.log(`[GlobalScan] Procesando interacciones de ${postsToProcess.length} posts globales calificados...`);

    // 2. Extraer comentarios y reacciones de los posts en paralelo
    const interactions = await Promise.all(
      postsToProcess.map(async (post) => {
        const postId = post.id || post.social_id || post.share_url;
        if (!postId) return { post, comments: [], reactions: [] };

        const [commentsRes, reactionsRes] = await Promise.all([
          trackComments
            ? unipile.getPostComments(postId, accountId, 40).catch(() => ({ items: [] }))
            : Promise.resolve({ items: [] }),
          trackLikes
            ? unipile.getPostReactions(postId, accountId, 40).catch(() => ({ items: [] }))
            : Promise.resolve({ items: [] }),
        ]);

        return {
          post,
          comments: commentsRes?.items || [],
          reactions: reactionsRes?.items || [],
        };
      })
    );

    const leadMap = new Map<string, Record<string, unknown>>();

    for (const item of interactions) {
      const post = item.post;
      const postAuthorName = post.author?.name || "";
      const postAuthorCompany = post.author?.headline || "";
      const targetEntities = [postAuthorName, postAuthorCompany].filter(Boolean);

      // A. Procesar comentaristas (Intención Alta / Debate Activo)
      for (const comment of item.comments) {
        const author = comment.author;
        if (!author?.id || leadMap.has(author.id)) continue;

        const fullName =
          author.name ||
          [author.first_name, author.last_name].filter(Boolean).join(" ") ||
          "Miembro de LinkedIn";
        const headline = author.headline || "";
        const location = (author as any).location || "";

        // Filtro Anti-Empleados del autor del post
        if (
          targetEntities.length > 0 &&
          isAuthorEmployeeOrAffiliate({ fullName, headline }, targetEntities)
        ) {
          continue;
        }

        // Filtro ICP por Cargo
        if (cleanTitles.length > 0 && !matchesIcp(headline, cleanTitles)) {
          continue;
        }

        // Filtro por Ubicación
        if (cleanLocations.length > 0 && !matchesLocation(location, cleanLocations)) {
          continue;
        }

        const linkedinUrl =
          author.profile_url ||
          (author.public_identifier
            ? `https://www.linkedin.com/in/${author.public_identifier}`
            : "");

        const rawPic = author.picture_url || (author as any).profile_picture_url;
        const avatarUrl =
          rawPic && typeof rawPic === "string" && !rawPic.includes("unsplash.com")
            ? rawPic
            : undefined;

        const commentText = comment.text || "";
        const detectedLang = detectLeadLanguage({
          fullName,
          headline,
          location,
          linkedinUrl,
          signalSnippet: commentText,
        });

        leadMap.set(author.id, {
          providerId: author.id,
          fullName,
          headline: headline || "Profesional en LinkedIn",
          company: "",
          location: location || "Remoto / No especificado",
          linkedinUrl,
          avatarUrl,
          signalSnippet: `Comentó en debate sobre ${cleanQuery}: “${commentText.slice(0, 120)}${commentText.length > 120 ? "..." : ""}”`,
          intentLevel: "medium_high",
          connectionDegree: "2nd",
          sourcePostId: post.id,
          sourcePostTitle: (post.text || cleanQuery).slice(0, 80),
          language: detectedLang,
        });
      }

      // B. Procesar reacciones si faltan leads
      if (leadMap.size < 20) {
        for (const reaction of item.reactions) {
          const author = reaction.author;
          if (!author?.id || leadMap.has(author.id)) continue;

          const fullName = author.name || "Miembro de LinkedIn";
          const headline = author.headline || "";
          const location = (author as any).location || "";

          if (
            targetEntities.length > 0 &&
            isAuthorEmployeeOrAffiliate({ fullName, headline }, targetEntities)
          ) {
            continue;
          }

          if (cleanTitles.length > 0 && !matchesIcp(headline, cleanTitles)) {
            continue;
          }

          if (cleanLocations.length > 0 && !matchesLocation(location, cleanLocations)) {
            continue;
          }

          const linkedinUrl =
            author.profile_url ||
            (author.public_identifier
              ? `https://www.linkedin.com/in/${author.public_identifier}`
              : "");

          const avatarUrl =
            author.picture_url && !author.picture_url.includes("unsplash.com")
              ? author.picture_url
              : undefined;

          const detectedLang = detectLeadLanguage({
            fullName,
            headline,
            location,
            linkedinUrl,
          });

          leadMap.set(author.id, {
            providerId: author.id,
            fullName,
            headline: headline || "Profesional en LinkedIn",
            company: "",
            location: location || "Remoto / No especificado",
            linkedinUrl,
            avatarUrl,
            signalSnippet: `Reaccionó al debate viral sobre ${cleanQuery}`,
            intentLevel: "medium",
            connectionDegree: "2nd",
            sourcePostId: post.id,
            sourcePostTitle: (post.text || cleanQuery).slice(0, 80),
            language: detectedLang,
          });
        }
      }
    }

    const items = Array.from(leadMap.values());
    console.log(`[GlobalScan] Escaneo finalizado. Total prospectos ICP calificados encontrados: ${items.length}`);

    return NextResponse.json({
      success: true,
      items,
      totalPostsAnalyzed: postsToProcess.length,
      totalLeadsFound: items.length,
      mode: unipile.isSandboxMode() ? "sandbox" : "live",
    });
  } catch (err: any) {
    console.error("[GlobalScan] Error no controlado en escaneo global:", err);
    return NextResponse.json(
      { error: err?.message || "Error interno del servidor durante el escaneo global" },
      { status: 500 }
    );
  }
}
