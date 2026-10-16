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

const CORPORATE_SUFFIXES = new Set([
  "inc", "llc", "ltd", "ltda", "sa", "sas", "sl", "srl", "spa", "plc",
  "corp", "corporation", "company", "co", "gmbh", "eirl", "group", "holding",
  "tech", "technologies", "technology", "solutions", "chile", "mexico", "colombia",
  "espana", "spain", "argentina", "peru", "brasil", "brazil", "latam", "global", "international",
  "health", "lab", "labs", "ia", "ai",
]);

function normalizeText(value: string | null | undefined): string {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function companyNormalize(value: string | null | undefined): string {
  return normalizeText(value)
    .replace(/\b([a-zA-Z])\.([a-zA-Z])(?:\.([a-zA-Z]))?(?:\.([a-zA-Z]))?/g, "$1$2$3$4")
    .replace(/\b(inc|llc|ltd|ltda|sa|sas|sl|srl|spa|plc|corp|corporation|company|co|gmbh|eirl)\b/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function companyTokens(name: string): string[] {
  const norm = companyNormalize(name);
  return norm.split(/\s+/).filter((w) => w.length > 0 && !CORPORATE_SUFFIXES.has(w));
}

function companyMatches(profileCompany: string | null | undefined, expected: string): boolean {
  if (!profileCompany || !expected) return false;
  const actualNorm = companyNormalize(profileCompany);
  const wantedNorm = companyNormalize(expected);
  if (!actualNorm || !wantedNorm) return false;

  // 1. Coincidencia exacta directa
  if (actualNorm === wantedNorm) return true;

  const wantedTokens = companyTokens(expected);
  const actualTokens = companyTokens(profileCompany);
  if (wantedTokens.length === 0 || actualTokens.length === 0) {
    return actualNorm === wantedNorm;
  }

  const wantedCore = wantedTokens.join(" ");
  const actualCore = actualTokens.join(" ");
  if (wantedCore === actualCore) return true;

  // 2. Si la empresa esperada tiene una sola palabra clave (ej: "Adapta", "Prospectme"):
  if (wantedTokens.length === 1) {
    if (actualTokens.includes(wantedTokens[0])) return true;
    return false;
  }

  // 3. Para empresas de 2 o más palabras clave:
  const allWantedInActual = wantedTokens.every((t) => actualTokens.includes(t));
  if (allWantedInActual && actualTokens.length <= wantedTokens.length + 2) {
    return true;
  }
  const allActualInWanted = actualTokens.every((t) => wantedTokens.includes(t));
  if (allActualInWanted && wantedTokens.length <= actualTokens.length + 2) {
    return true;
  }

  return false;
}

function extractCompanyFromHeadline(headline: string | null | undefined): string | null {
  if (!headline) return null;
  const cleaned = headline.trim();

  // 1. Preposiciones de pertenencia: "at Google", "en Mercado Libre", "na Prospectme", "no Nubank", "em Itaú", "@ Meta"
  const atMatch = cleaned.match(/(?:^|\s)(?:at|en|@|na|no|em)\s+([^| ,\n/-]+)/i);
  if (atMatch?.[1]?.trim()) {
    const candidate = atMatch[1].trim();
    if (candidate.length >= 2 && candidate.length <= 60) return candidate;
  }

  // 2. Roles seguidos directamente de empresa sin preposición: "Cofundador Prospectme", "Founder Acme", "CEO Inhubflow", "BDR Prospectme"
  const roleMatch = cleaned.match(/(?:^|\s)(?:co-?founder|co-?fundador|founder|fundador|ceo|cto|coo|cmo|cro|bdr|sdr)\s+([A-Za-z0-9_.-]+)/i);
  if (roleMatch?.[1]?.trim()) {
    const candidate = roleMatch[1].trim();
    if (candidate.length >= 2 && candidate.length <= 60) return candidate;
  }

  // 3. Separadores estándar (| o -)
  const pipeMatch = cleaned.match(/\|\s*([^| ,\n]+)$/);
  if (pipeMatch?.[1]?.trim()) {
    const candidate = pipeMatch[1].trim();
    if (candidate.length >= 2 && candidate.length <= 60) return candidate;
  }

  return null;
}

function isAuthorEmployeeOrAffiliate(
  lead: { fullName?: string; headline?: string; company?: string },
  targetEntities: string[]
): boolean {
  if (!targetEntities.length) return false;

  const effectiveCompany = lead.company || extractCompanyFromHeadline(lead.headline);
  const headlineNorm = normalizeText(lead.headline);
  const nameNorm = normalizeText(lead.fullName);

  for (const target of targetEntities) {
    if (!target || target.trim().length < 2) continue;
    const targetNorm = normalizeText(target);

    // 1. Coincidencia directa de empresa
    if (effectiveCompany && companyMatches(effectiveCompany, target)) {
      return true;
    }
    if (lead.company && companyMatches(lead.company, target)) {
      return true;
    }

    // 2. Coincidencia textual en el titular / headline del lead (ej: "BDR na Prospectme", "SDR @ Adapta")
    if (targetNorm.length >= 3) {
      if (headlineNorm.includes(targetNorm)) {
        return true;
      }
      const escaped = targetNorm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const boundaryRegex = new RegExp(`(^|[^a-z0-9_])${escaped}([^a-z0-9_]|$)`, "i");
      if (boundaryRegex.test(headlineNorm)) {
        return true;
      }
    }

    // 3. Coincidencia si el lead es el autor mismo del post o la entidad
    if (nameNorm && targetNorm && (nameNorm.includes(targetNorm) || targetNorm.includes(nameNorm))) {
      if (targetNorm.length >= 4) {
        return true;
      }
    }
  }

  return false;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    let accountId = String(body.accountId || "").replace(/^acc-li-/, "").trim();
    const competitorUrl = String(body.competitorUrl || "").trim();
    const competitorName = String(body.competitorName || "").trim();
    const interactionTypes = Array.isArray(body.interactionTypes)
      ? body.interactionTypes.filter((value: unknown): value is "likes" | "comments" => value === "likes" || value === "comments")
      : ["comments"];
    const limit = Math.min(25, Math.max(1, Number(body.limit) || 10));
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
    }

    const posts = await unipile.getUserPosts({
      account_id: accountId,
      identifier,
      limit,
      is_company: isCompany,
    });

    // Si se especificaron palabras clave, priorizar publicaciones que contengan alguno de los términos
    const matchingPosts = keywordsFilter.length > 0
      ? posts.filter((post) => {
          const text = String(post.text || "").toLowerCase();
          return keywordsFilter.some((kw: string) => text.includes(kw));
        })
      : posts;
    const postsToProcess = matchingPosts.length > 0 ? matchingPosts : posts;

    const interactions = await Promise.all(
      postsToProcess.slice(0, limit).map(async (post) => {
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

    // Preparar entidades del autor y competidor para el filtro anti-auto-bombo
    const targetEntities = [
      competitorName,
      identifier,
    ].filter((t): t is string => typeof t === "string" && t.trim().length >= 2);

    let excludedEmployeesCount = 0;
    const leadMap = new Map<string, Record<string, unknown>>();

    for (const interaction of interactions) {
      const postAuthorName = interaction.post?.author?.name || "";
      const currentTargets = [
        ...targetEntities,
        postAuthorName,
      ].filter((t): t is string => typeof t === "string" && t.trim().length >= 2);

      for (const comment of interaction.comments) {
        const author = comment.author;
        if (!author?.id) continue;

        const fullName = author.name || [author.first_name, author.last_name].filter(Boolean).join(" ") || "Miembro de LinkedIn";
        const headline = author.headline || "";
        const effectiveCompany = extractCompanyFromHeadline(headline) || "";

        // Anti-Auto-Bombo: Excluir empleados del autor o del competidor
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

        leadMap.set(author.id, {
          providerId: author.id,
          fullName,
          headline: headline || "Profesional en LinkedIn",
          company: effectiveCompany,
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

        const fullName = author.name || "Miembro de LinkedIn";
        const headline = author.headline || "";
        const effectiveCompany = extractCompanyFromHeadline(headline) || "";

        // Anti-Auto-Bombo: Excluir empleados del autor o del competidor
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

        leadMap.set(author.id, {
          providerId: author.id,
          fullName,
          headline: headline || "Profesional en LinkedIn",
          company: effectiveCompany,
          location: "",
          linkedinUrl: author.profile_url || (author.public_identifier ? `https://www.linkedin.com/in/${author.public_identifier}` : ""),
          avatarUrl: author.picture_url || undefined,
          signalSnippet: `Reaccionó al post de ${competitorName || "la cuenta monitorizada"}`,
          signalType: "reaction",
          sourcePostId: interaction.post.id,
        });
      }
    }

    return NextResponse.json({
      items: Array.from(leadMap.values()),
      postsScanned: postsToProcess.length,
      excludedEmployeesCount,
      source: "unipile_live",
    });
  } catch (error) {
    console.error("[CompetitorsScan] Error en auditoría real:", error);
    return NextResponse.json({ items: [], source: "error", reason: "competitor_scan_failed" }, { status: 502 });
  }
}
