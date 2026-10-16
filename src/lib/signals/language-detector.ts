// src/lib/signals/language-detector.ts
// Detector inteligente de idioma del prospecto (Inglés / Español / Portugués)
// Basado en señales de ubicación geográfica, headline/cargo y comentarios de LinkedIn

export type SupportedLanguage = "en" | "es" | "pt";

export const LANGUAGE_LABELS: Record<SupportedLanguage, { label: string; code: string; flagName: string }> = {
  en: { label: "Inglés", code: "EN", flagName: "UK / USA" },
  es: { label: "Español", code: "ES", flagName: "Hispano" },
  pt: { label: "Portugués", code: "PT", flagName: "Brasil / Portugal" },
};

const PT_LOCATION_PATTERNS = [
  /bra[sz]il/i,
  /s[aã]o paulo/i,
  /rio de janeiro/i,
  /belo horizonte/i,
  /curitiba/i,
  /porto alegre/i,
  /florian[oó]polis/i,
  /bras[ií]lia/i,
  /salvador/i,
  /fortaleza/i,
  /recife/i,
  /campinas/i,
  /portugal/i,
  /lisbo[na]/i,
  /porto/i,
];

const ES_LOCATION_PATTERNS = [
  /colombia/i,
  /bogot[aá]/i,
  /medell[ií]n/i,
  /m[eé]xico/i,
  /mexico city/i,
  /cdmx/i,
  /guadalajara/i,
  /monterrey/i,
  /espa[nñ]a/i,
  /spain/i,
  /madrid/i,
  /barcelona/i,
  /valencia/i,
  /argentina/i,
  /buenos aires/i,
  /c[oó]rdoba/i,
  /chile/i,
  /santiago/i,
  /per[uú]/i,
  /lima/i,
  /uruguay/i,
  /montevideo/i,
  /ecuador/i,
  /quito/i,
  /guayaquil/i,
  /venezuela/i,
  /costa rica/i,
  /panam[aá]/i,
  /guatemala/i,
];

const EN_LOCATION_PATTERNS = [
  /united kingdom/i,
  /\buk\b/i,
  /london/i,
  /manchester/i,
  /birmingham/i,
  /england/i,
  /scotland/i,
  /united states/i,
  /\busa?\b/i,
  /new york/i,
  /california/i,
  /san francisco/i,
  /austin/i,
  /texas/i,
  /florida/i,
  /miami/i,
  /los angeles/i,
  /chicago/i,
  /seattle/i,
  /boston/i,
  /canada/i,
  /toronto/i,
  /vancouver/i,
  /australia/i,
  /sydney/i,
  /melbourne/i,
  /ireland/i,
  /dublin/i,
  /germany/i,
  /netherlands/i,
  /amsterdam/i,
  /berlin/i,
  /singapore/i,
];

const PT_TEXT_PATTERNS = [
  /\b(gerente|diretor|diretora|s[oó]cio|s[oó]cia|desenvolvedor|desenvolvedora|especialista|vendas|neg[oó]cios|gestor|gestora|coordena[cç][aã]o|analista|equipe|empresa|estrat[eé]gia|crescimento|atendimento|consultor|consultoria|est[aá]gio)\b/i,
  /\b(obrigad[oa]|parab[eé]ns|concordo|excelente|muito bom|sensacional|com certeza|legal|show|valeu|ol[aá]|bom dia|boa tarde)\b/i,
  /\b(de|do|da|dos|das|no|na|nos|nas|em|com|para|por|mais|uma|um|esse|essa|isso)\b/i,
];

const ES_TEXT_PATTERNS = [
  /\b(director|directora|socio|socia|desarrollador|desarrolladora|ventas|negocios|coordinador|coordinadora|asesor|asesora|estrategia|crecimiento|atenci[oó]n|equipo|consultor[ií]a)\b/i,
  /\b(gracias|felicidades|excelente|totalmente|de acuerdo|muy buen|saludos|buen d[ií]a|hola|buena publicaci[oó]n)\b/i,
  /\b(el|la|los|las|un|una|del|al|con|para|por|hacia|sobre|este|esta|esto|pero|tambi[eé]n)\b/i,
];

const EN_TEXT_PATTERNS = [
  /\b(founder|co-founder|ceo|cto|cmo|coo|cro|head of|vp of|vice president|manager|director|growth|lead|engineer|developer|specialist|consultant|advisor|officer|partner|creator|strategist)\b/i,
  /\b(great|awesome|congrats|insightful|congratulations|love this|agree|totally|well said|interesting|thanks|thank you|valuable|spot on)\b/i,
  /\b(the|and|for|with|this|that|from|have|what|your|their|about|how|just|more|into|some)\b/i,
];

/**
 * Detecta el idioma principal del lead analizando ubicación, titular y texto de interacción
 */
export function detectLeadLanguage(lead: {
  headline?: string | null;
  location?: string | null;
  signalSnippet?: string | null;
  defaultLang?: SupportedLanguage;
}): SupportedLanguage {
  const loc = (lead.location || "").trim();
  const text = `${lead.headline || ""} ${lead.signalSnippet || ""}`.trim();

  // 1. Detección por ubicación geográfica (señal de máxima prioridad física)
  if (loc) {
    for (const pat of PT_LOCATION_PATTERNS) {
      if (pat.test(loc)) return "pt";
    }
    for (const pat of ES_LOCATION_PATTERNS) {
      if (pat.test(loc)) return "es";
    }
    for (const pat of EN_LOCATION_PATTERNS) {
      if (pat.test(loc)) return "en";
    }
  }

  // 2. Detección por texto (headline + comentario/interacción)
  let ptScore = 0;
  let esScore = 0;
  let enScore = 0;

  for (const pat of PT_TEXT_PATTERNS) {
    const m = text.match(new RegExp(pat.source, "gi"));
    if (m) ptScore += m.length * 2;
  }

  for (const pat of ES_TEXT_PATTERNS) {
    const m = text.match(new RegExp(pat.source, "gi"));
    if (m) esScore += m.length * 2;
  }

  for (const pat of EN_TEXT_PATTERNS) {
    const m = text.match(new RegExp(pat.source, "gi"));
    if (m) enScore += m.length * 2;
  }

  if (enScore > esScore && enScore > ptScore) return "en";
  if (ptScore > esScore && ptScore > enScore) return "pt";
  if (esScore > ptScore && esScore > enScore) return "es";

  // 3. Fallback inteligente
  return lead.defaultLang || "es";
}
