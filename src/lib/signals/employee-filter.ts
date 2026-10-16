// src/lib/signals/employee-filter.ts
// Motor compartido de filtrado inteligente anti-engagement interno (empleados y colaboradores del autor/empresa)
// Heredado de la arquitectura probada en #b2b (InHubFlow Outreach B2B Suite)

export function extractIdentifier(url: string): string {
  try {
    const parsed = new URL(url);
    const parts = parsed.pathname.split("/").filter(Boolean);
    return parts.at(-1) || url;
  } catch {
    return url.trim();
  }
}

export function normalizeText(text: string | null | undefined): string {
  if (!text) return "";
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

export function companyNormalize(name: string | null | undefined): string {
  if (!name) return "";
  return normalizeText(name)
    .replace(/\b(inc|llc|ltd|limitada|sa|s\.a|s\/a|corp|corporation|me|eireli|gmbh|sl|s\.l|co|company|group|holding|holdings|tech|technologies|solucoes|solutions|software|brasil|latam|global|labs|ia|ai)\b/g, "")
    .replace(/[^a-z0-9]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function companyTokens(name: string | null | undefined): string[] {
  const norm = companyNormalize(name);
  if (!norm) return [];
  const stopWords = new Set(["de", "do", "da", "dos", "das", "e", "y", "and", "the", "la", "el", "los", "las"]);
  return norm
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2 && !stopWords.has(t));
}

export function companyMatches(
  actualCompany: string | null | undefined,
  wantedCompany: string | null | undefined
): boolean {
  if (!actualCompany || !wantedCompany) return false;
  const actualNorm = companyNormalize(actualCompany);
  const wantedNorm = companyNormalize(wantedCompany);
  if (!actualNorm || !wantedNorm) return false;

  // 1. Coincidencia exacta o inclusión directa
  if (actualNorm === wantedNorm) return true;
  if (actualNorm.includes(wantedNorm) || wantedNorm.includes(actualNorm)) {
    if (Math.min(actualNorm.length, wantedNorm.length) >= 4) return true;
  }

  const actualTokens = companyTokens(actualCompany);
  const wantedTokens = companyTokens(wantedCompany);
  if (!actualTokens.length || !wantedTokens.length) return false;

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

export function extractCompanyFromHeadline(headline: string | null | undefined): string | null {
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

export function isAuthorEmployeeOrAffiliate(
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
