import { NextRequest, NextResponse } from "next/server";
import { unipile } from "@/lib/unipile/client";
import { detectLeadLanguage } from "@/lib/signals/language-detector";
import { isAuthorEmployeeOrAffiliate, normalizeText } from "@/lib/signals/employee-filter";

const COUNTRY_DEFINITIONS: Record<string, { name: string; flag: string; keywords: string[] }> = {
  CL: { name: "Chile", flag: "🇨🇱", keywords: ["chile", "santiago", "valparaíso", "valparaiso", "concepción", "concepcion", "antofagasta", "viña", "vina", "temuco", "iquique"] },
  ES: { name: "España", flag: "🇪🇸", keywords: ["españa", "espana", "spain", "madrid", "barcelona", "valencia", "sevilla", "bilbao", "málaga", "malaga", "zaragoza", "alicante"] },
  MX: { name: "México", flag: "🇲🇽", keywords: ["méxico", "mexico", "cdmx", "guadalajara", "monterrey", "puebla", "querétaro", "queretaro", "tijuana", "mérida", "merida"] },
  CO: { name: "Colombia", flag: "🇨🇴", keywords: ["colombia", "bogotá", "bogota", "medellín", "medellin", "cali", "barranquilla", "bucaramanga", "cartagena"] },
  AR: { name: "Argentina", flag: "🇦🇷", keywords: ["argentina", "buenos aires", "córdoba", "cordoba", "rosario", "mendoza", "la plata", "mar del plata"] },
  PE: { name: "Perú", flag: "🇵🇪", keywords: ["perú", "peru", "lima", "arequipa", "trujillo", "chiclayo", "piura", "cusco"] },
  BR: { name: "Brasil", flag: "🇧🇷", keywords: ["brasil", "brazil", "são paulo", "sao paulo", "rio de janeiro", "curitiba", "belo horizonte", "porto alegre", "campinas", "recife", "salvador", "florianópolis", "florianopolis"] },
  UY: { name: "Uruguay", flag: "🇺🇾", keywords: ["uruguay", "montevideo", "punta del este"] },
  PA: { name: "Panamá", flag: "🇵🇦", keywords: ["panamá", "panama", "ciudad de panamá", "ciudad de panama"] },
  EC: { name: "Ecuador", flag: "🇪🇨", keywords: ["ecuador", "quito", "guayaquil", "cuenca"] },
  CR: { name: "Costa Rica", flag: "🇨🇷", keywords: ["costa rica", "san josé", "san jose"] },
  DO: { name: "Rep. Dominicana", flag: "🇩🇴", keywords: ["república dominicana", "republica dominicana", "santo domingo", "santiago de los caballeros"] },
  GT: { name: "Guatemala", flag: "🇬🇹", keywords: ["guatemala", "ciudad de guatemala"] },
};

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

function checkLocationMatch(
  textToCheck: string | null | undefined,
  keywords: string[]
): boolean {
  if (!keywords || keywords.length === 0) return true;
  if (!textToCheck) return false;

  const norm = normalizeText(textToCheck);
  return keywords.some((kw) => {
    const normKw = normalizeText(kw);
    if (!normKw) return false;
    const escaped = normKw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`(^|[^a-z0-9_])${escaped}([^a-z0-9_]|$)`, "i");
    return regex.test(norm) || norm.includes(normKw);
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
      limit = 50,
    } = body;

    const effectiveLimit = Math.max(1, Math.min(100, Number(limit) || 50));

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

    const countryCode = String(targetCountry || "all").toUpperCase();
    const countryDef = countryCode !== "ALL" ? COUNTRY_DEFINITIONS[countryCode] : null;

    // Construir lista de palabras clave de ubicación (país + ciudades clave)
    const targetKeywords = countryDef
      ? countryDef.keywords
      : Array.isArray(locations)
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
    // Si se especificó un país (ej. Chile), contextualizamos la búsqueda con el país para hallar debates locales
    const queryWithCountry = countryDef ? `${cleanQuery} ${countryDef.name}` : cleanQuery;
    console.log(`[GlobalScan] Buscando publicaciones en LinkedIn: "${queryWithCountry}" (cuenta: ${accountId}, país: ${countryDef ? countryDef.name : "Global"})...`);

    let rawPosts: any[] = [];
    try {
      const searchRes = await unipile.searchLinkedIn({
        account_id: accountId,
        category: "posts",
        keywords: queryWithCountry,
        limit: Math.min(25, Math.max(5, Number(limit) || 10)),
      });
      rawPosts = Array.isArray(searchRes?.items) ? searchRes.items : [];

      // Si la búsqueda con país arrojó pocos resultados, buscar también la temática directa
      if (rawPosts.length < 3 && countryDef) {
        console.log(`[GlobalScan] Búsqueda combinada arrojó ${rawPosts.length} posts. Buscando también "${cleanQuery}"...`);
        const fallbackRes = await unipile.searchLinkedIn({
          account_id: accountId,
          category: "posts",
          keywords: cleanQuery,
          limit: 10,
        });
        const fallbackPosts = Array.isArray(fallbackRes?.items) ? fallbackRes.items : [];
        const seenIds = new Set(rawPosts.map((p) => (p as any).social_id || p.id));
        for (const p of fallbackPosts) {
          const pid = (p as any).social_id || p.id;
          if (pid && !seenIds.has(pid)) {
            seenIds.add(pid);
            rawPosts.push(p);
          }
        }
      }
    } catch (searchErr: any) {
      console.warn(`[GlobalScan] Error en búsqueda de posts para "${cleanQuery}":`, searchErr?.message || searchErr);
      return NextResponse.json(
        { items: [], error: searchErr?.message || "Error al buscar publicaciones en LinkedIn" },
        { status: 500 }
      );
    }

    if (rawPosts.length === 0) {
      return NextResponse.json({
        success: true,
        items: [],
        totalPostsAnalyzed: 0,
        totalLeadsFound: 0,
        selectedPosts: [],
        message: `No se encontraron publicaciones recientes para "${cleanQuery}" en LinkedIn.`,
      });
    }

    // Filtrar publicaciones por umbral de reacciones si está disponible el contador
    const targetMinReactions = Number(minPostReactions) || 10;
    const qualifiedPosts = rawPosts.filter((post) => {
      const count = Number(post.reaction_counter ?? post.reactions_count ?? 0);
      return count >= targetMinReactions || count === 0;
    });

    const postsToProcess = (qualifiedPosts.length > 0 ? qualifiedPosts : rawPosts).slice(0, 6);
    console.log(`[GlobalScan] Procesando interacciones de ${postsToProcess.length} posts calificados...`);

    // Mapear posts seleccionados para mostrarlos con link directo en la interfaz
    const selectedPosts = postsToProcess.map((post) => {
      const postSocialId = post.social_id || post.id;
      const shareUrl =
        post.share_url ||
        `https://www.linkedin.com/feed/update/${encodeURIComponent(postSocialId)}`;
      return {
        id: postSocialId,
        url: shareUrl,
        text: (post.text || "").slice(0, 160),
        authorName: typeof post.author === "string" ? post.author : post.author?.name || "Autor en LinkedIn",
        reactionsCount: Number(post.reaction_counter ?? post.reactions_count ?? 0),
        commentsCount: Number(post.comment_counter ?? post.comments_count ?? 0),
      };
    });

    // 2. Extraer comentarios y reacciones de los posts en paralelo
    const interactions = await Promise.all(
      postsToProcess.map(async (post) => {
        // Unipile requiere el URN social_id (ej: urn:li:ugcPost:... o urn:li:activity:...)
        const postId =
          post.social_id ||
          (post.id && String(post.id).startsWith("urn:")
            ? post.id
            : post.id
            ? `urn:li:ugcPost:${post.id}`
            : post.share_url);

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

    async function verifyLeadLocation(params: {
      headline?: string;
      commentLocation?: string;
      commentText?: string;
      profileUrl?: string;
      publicIdentifier?: string;
    }): Promise<{ isMatch: boolean; resolvedLocation: string }> {
      const { headline, commentLocation, commentText, profileUrl, publicIdentifier } = params;

      // Si es global ("all"), no se restringe por país
      if (!countryDef || targetKeywords.length === 0) {
        return { isMatch: true, resolvedLocation: commentLocation || "Remoto / Global" };
      }

      // 1. Revisar si el titular, comentario o ubicación directa menciona el país o ciudades clave
      if (checkLocationMatch(headline, targetKeywords)) {
        return { isMatch: true, resolvedLocation: `${countryDef.name} (${countryDef.flag})` };
      }
      if (checkLocationMatch(commentLocation, targetKeywords)) {
        return { isMatch: true, resolvedLocation: commentLocation! };
      }
      if (checkLocationMatch(commentText, targetKeywords)) {
        return { isMatch: true, resolvedLocation: `${countryDef.name} (${countryDef.flag})` };
      }

      // 2. Extraer identificador de LinkedIn para resolver perfil completo con Unipile
      let cleanIdentifier = publicIdentifier || "";
      if (!cleanIdentifier && profileUrl) {
        const match = profileUrl.match(/\/in\/([^/?#]+)/i);
        if (match?.[1]) cleanIdentifier = match[1];
      }

      if (cleanIdentifier && accountId && !unipile.isSandboxMode()) {
        try {
          const profile = await unipile.resolveProfile(cleanIdentifier, accountId);
          if (profile && profile.location) {
            const matchesCountry = checkLocationMatch(profile.location, targetKeywords);
            if (matchesCountry) {
              return { isMatch: true, resolvedLocation: profile.location };
            } else {
              // Descarta si la ubicación oficial es de otro país
              return { isMatch: false, resolvedLocation: profile.location };
            }
          }
        } catch {
          // Si falla la llamada de perfil puntual, continuar
        }
      }

      // Si no hay confirmación del país para una regla específica, descartar para pureza
      return { isMatch: false, resolvedLocation: "No verificado" };
    }

    for (const item of interactions) {
      if (leadMap.size >= effectiveLimit) break;
      const post = item.post;
      const postAuthorName = typeof post.author === "string" ? post.author : post.author?.name || "";
      const postAuthorCompany = post.author?.headline || "";
      const targetEntities = [postAuthorName, postAuthorCompany].filter(Boolean);
      const postShareUrl =
        post.share_url ||
        `https://www.linkedin.com/feed/update/${encodeURIComponent(post.social_id || post.id)}`;

      // A. Procesar comentaristas (Intención Alta / Debate Activo)
      for (const comment of item.comments) {
        if (leadMap.size >= effectiveLimit) break;
        const rawAuthor: any = comment.author;
        const authorDetails: any = (comment as any).author_details || {};
        const authorObj: any = typeof rawAuthor === "object" && rawAuthor !== null ? rawAuthor : {};

        const authorId = authorDetails.id || authorObj.id || (comment as any).author_id;
        if (!authorId || leadMap.has(authorId)) continue;

        const rawAuthorStr = typeof rawAuthor === "string" ? rawAuthor.trim() : "";
        const fullName =
          rawAuthorStr ||
          authorDetails.name ||
          authorObj.name ||
          [authorDetails.first_name || authorObj.first_name, authorDetails.last_name || authorObj.last_name].filter(Boolean).join(" ") ||
          "Miembro de LinkedIn";

        const headline = authorDetails.headline || authorObj.headline || "";
        const location = authorDetails.location || authorObj.location || "";

        // Filtro Anti-Empleados del autor del post
        if (
          targetEntities.length > 0 &&
          isAuthorEmployeeOrAffiliate({ fullName, headline }, targetEntities)
        ) {
          continue;
        }

        // Filtro ICP por Cargo (si se especificó alguno)
        if (cleanTitles.length > 0 && !matchesIcp(headline, cleanTitles)) {
          continue;
        }

        const commentText = comment.text || "";
        const linkedinUrl =
          authorDetails.profile_url ||
          authorObj.profile_url ||
          (authorDetails.public_identifier
            ? `https://www.linkedin.com/in/${authorDetails.public_identifier}`
            : authorObj.public_identifier
            ? `https://www.linkedin.com/in/${authorObj.public_identifier}`
            : "");

        const pubId = authorDetails.public_identifier || authorObj.public_identifier;

        // Verificación Estricta de la Ubicación de la Persona
        const { isMatch: isLocMatch, resolvedLocation } = await verifyLeadLocation({
          headline,
          commentLocation: location,
          commentText,
          profileUrl: linkedinUrl,
          publicIdentifier: pubId,
        });

        if (!isLocMatch) {
          console.log(`[GlobalScan] Descartado lead "${fullName}" (${headline}) por no coincidir con el país ${countryDef?.name || targetCountry}. Ubicación: ${resolvedLocation}`);
          continue;
        }

        const rawPic =
          authorDetails.profile_picture_url ||
          authorDetails.picture_url ||
          authorObj.profile_picture_url ||
          authorObj.picture_url;

        const avatarUrl =
          rawPic && typeof rawPic === "string" && !rawPic.includes("unsplash.com")
            ? rawPic
            : undefined;

        const detectedLang = detectLeadLanguage({
          fullName,
          headline,
          location: resolvedLocation,
          linkedinUrl,
          signalSnippet: commentText,
        });

        leadMap.set(authorId, {
          providerId: authorId,
          fullName,
          headline: headline || "Profesional en LinkedIn",
          company: "",
          location: resolvedLocation,
          linkedinUrl,
          avatarUrl,
          signalSnippet: `Comentó en debate sobre ${cleanQuery}: “${commentText.slice(0, 120)}${commentText.length > 120 ? "..." : ""}”`,
          signalType: "comment",
          intentLevel: "medium_high",
          intentScore: 90,
          connectionDegree: authorDetails.network_distance || authorObj.network_distance || "2nd",
          sourcePostId: post.social_id || post.id,
          sourcePostUrl: postShareUrl,
          sourcePostTitle: (post.text || cleanQuery).slice(0, 100),
          sourceAuthorName: postAuthorName || "Autor en LinkedIn",
          language: detectedLang,
        });
      }

      // B. Procesar reacciones si faltan leads y el usuario lo solicitó
      if (trackLikes && leadMap.size < effectiveLimit) {
        for (const reaction of item.reactions) {
          if (leadMap.size >= effectiveLimit) break;
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

          const linkedinUrl =
            author.profile_url ||
            (author.public_identifier
              ? `https://www.linkedin.com/in/${author.public_identifier}`
              : "");

          // Verificación Estricta de la Ubicación de la Persona que Reaccionó
          const { isMatch: isLocMatch, resolvedLocation } = await verifyLeadLocation({
            headline,
            commentLocation: location,
            profileUrl: linkedinUrl,
            publicIdentifier: author.public_identifier,
          });

          if (!isLocMatch) {
            continue;
          }

          const rawPic = author.picture_url || (author as any).profile_picture_url;
          const avatarUrl =
            rawPic && typeof rawPic === "string" && !rawPic.includes("unsplash.com")
              ? rawPic
              : undefined;

          const detectedLang = detectLeadLanguage({
            fullName,
            headline,
            location: resolvedLocation,
            linkedinUrl,
            signalSnippet: headline,
          });

          leadMap.set(author.id, {
            providerId: author.id,
            fullName,
            headline: headline || "Profesional en LinkedIn",
            company: "",
            location: resolvedLocation,
            linkedinUrl,
            avatarUrl,
            signalSnippet: `Reaccionó al post sobre ${cleanQuery}: “${(post.text || cleanQuery).slice(0, 80)}...”`,
            signalType: "reaction",
            intentLevel: "medium",
            intentScore: 70,
            connectionDegree: (author as any).network_distance || "2nd",
            sourcePostId: post.social_id || post.id,
            sourcePostUrl: postShareUrl,
            sourcePostTitle: (post.text || cleanQuery).slice(0, 100),
            sourceAuthorName: postAuthorName || "Autor en LinkedIn",
            language: detectedLang,
          });
        }
      }
    }

    const items = Array.from(leadMap.values());
    console.log(`[GlobalScan] Escaneo finalizado. Total prospectos calificados del país encontrados: ${items.length}`);

    return NextResponse.json({
      success: true,
      items,
      totalPostsAnalyzed: postsToProcess.length,
      totalLeadsFound: items.length,
      selectedPosts,
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
