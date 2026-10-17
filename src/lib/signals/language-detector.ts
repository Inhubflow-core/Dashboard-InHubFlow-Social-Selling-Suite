// src/lib/signals/language-detector.ts
// Detector inteligente de idioma del prospecto (Inglés / Español / Portugués)
// Basado en ubicación geográfica, dominios de LinkedIn, headline/cargo, nombres luso-brasileños y contexto del competidor

export type SupportedLanguage = "en" | "es" | "pt";

export const LANGUAGE_LABELS: Record<SupportedLanguage, { label: string; code: string; flagName: string }> = {
  en: { label: "Inglés", code: "EN", flagName: "UK / USA" },
  es: { label: "Español", code: "ES", flagName: "Hispano" },
  pt: { label: "Portugués", code: "PT", flagName: "Brasil / Portugal" },
};

// Ubicaciones de Brasil y Portugal (Prioridad absoluta geográfica)
const PT_LOCATION_PATTERNS = [
  /bra[sz]il/i,
  /\bbr\b/i,
  /s[aã]o paulo/i,
  /\bsp\b/i,
  /rio de janeiro/i,
  /\brj\b/i,
  /belo horizonte/i,
  /minas gerais/i,
  /\bmg\b/i,
  /curitiba/i,
  /paran[aá]/i,
  /\bpr\b/i,
  /porto alegre/i,
  /rio grande do sul/i,
  /\brs\b/i,
  /florian[oó]polis/i,
  /santa catarina/i,
  /\bsc\b/i,
  /bras[ií]lia/i,
  /distrito federal/i,
  /\bdf\b/i,
  /salvador/i,
  /bahia/i,
  /\bba\b/i,
  /fortaleza/i,
  /cear[aá]/i,
  /\bce\b/i,
  /recife/i,
  /pernambuco/i,
  /\bpe\b/i,
  /campinas/i,
  /goi[aâ]nia/i,
  /goi[aá]s/i,
  /\bgo\b/i,
  /vit[oó]ria/i,
  /serra/i,
  /esp[ií]rito santo/i,
  /\bes\b/i,
  /manaus/i,
  /amazonas/i,
  /\bam\b/i,
  /bel[eé]m/i,
  /par[aá]/i,
  /\bpa\b/i,
  /natal/i,
  /rio grande do norte/i,
  /\brn\b/i,
  /jo[aã]o pessoa/i,
  /para[ií]ba/i,
  /\bpb\b/i,
  /macei[oó]/i,
  /alagoas/i,
  /\bal\b/i,
  /teresina/i,
  /piau[ií]/i,
  /\bpi\b/i,
  /campo grande/i,
  /mato grosso do sul/i,
  /\bms\b/i,
  /cuiab[aá]/i,
  /mato grosso/i,
  /\bmt\b/i,
  /aracaju/i,
  /sergipe/i,
  /\bse\b/i,
  /porto velho/i,
  /rond[oô]nia/i,
  /\bro\b/i,
  /palmas/i,
  /tocantins/i,
  /\bto\b/i,
  /macap[aá]/i,
  /amap[aá]/i,
  /\bap\b/i,
  /boa vista/i,
  /roraima/i,
  /\brr\b/i,
  /rio branco/i,
  /acre/i,
  /\bac\b/i,
  /portugal/i,
  /lisbo[na]/i,
  /porto\b/i,
  /coimbra/i,
  /braga/i,
  /faro/i,
  /aveiro/i,
  /set[uú]bal/i,
];

const ES_LOCATION_PATTERNS = [
  /colombia/i,
  /bogot[aá]/i,
  /medell[ií]n/i,
  /cali\b/i,
  /barranquilla/i,
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
  /sevilla/i,
  /argentina/i,
  /buenos aires/i,
  /c[oó]rdoba/i,
  /rosario/i,
  /mendoza/i,
  /chile/i,
  /santiago/i,
  /valpara[ií]so/i,
  /per[uú]/i,
  /lima/i,
  /arequipa/i,
  /uruguay/i,
  /montevideo/i,
  /ecuador/i,
  /quito/i,
  /guayaquil/i,
  /venezuela/i,
  /caracas/i,
  /costa rica/i,
  /san jos[eé]/i,
  /panam[aá]/i,
  /guatemala/i,
  /republica dominicana/i,
  /santo domingo/i,
  /bolivia/i,
  /la paz/i,
  /paraguay/i,
  /asunci[oó]n/i,
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
  /\busa\b/i,
  /\bu\.s\.a?\b/i,
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
  /montreal/i,
  /australia/i,
  /sydney/i,
  /melbourne/i,
  /ireland/i,
  /dublin/i,
  /singapore/i,
];

// Empresas, creadores y ecosistemas brasileños conocidos
const BRAZILIAN_COMPETITORS_OR_ECOSYSTEMS = [
  /prospectme/i,
  /hatlas/i,
  /totvs/i,
  /rd station/i,
  /resultados digitais/i,
  /nuvemshop/i,
  /g4 educa[cç][aã]o/i,
  /startse/i,
  /vtex/i,
  /meetime/i,
  /leadster/i,
  /exact sales/i,
  /ramper/i,
  /agendor/i,
  /ploomes/i,
  /octadesk/i,
  /take blip/i,
  /blip/i,
  /hotmart/i,
  /kiwify/i,
  /eduzz/i,
  /monetizze/i,
  /nubank/i,
  /banco inter/i,
  /c6 bank/i,
  /stone\b/i,
  /pagseguro/i,
  /loft\b/i,
  /quintoandar/i,
  /ifood/i,
  /gympass/i,
  /wellhub/i,
  /pipefy/i,
  /s[oó]lides/i,
  /omie/i,
  /conta azul/i,
  /cora\b/i,
  /asaas/i,
];

// Apellidos y nombres luso-brasileños emblemáticos
const LUSO_BRAZILIAN_NAMES = new Set([
  "goulardins",
  "deluca",
  "silva",
  "souza",
  "sousa",
  "oliveira",
  "santos",
  "pereira",
  "ferreira",
  "alves",
  "ribeiro",
  "batista",
  "valentim",
  "nicolau",
  "magalde",
  "ardiguero",
  "rocha",
  "júnior",
  "junior",
  "prestes",
  "machado",
  "mendes",
  "freitas",
  "cardoso",
  "ramos",
  "gonçalves",
  "goncalves",
  "santana",
  "teixeira",
  "filho",
  "neto",
  "sobrinho",
  "barbosa",
  "dias",
  "nascimento",
  "andrade",
  "moreira",
  "nunes",
  "marques",
  "vieira",
  "lopes",
  "soares",
  "almeida",
  "carvalho",
  "martins",
  "lima",
  "gomes",
  "costa",
  "rodrigo",
  "matheus",
  "thiago",
  "tiago",
  "vinicius",
  "vinícius",
  "danila",
  "danilo",
  "fernanda",
  "eduardo",
  "karthen",
  "davi",
  "caio",
  "mário",
  "marcio",
  "fábio",
  "fabio",
  "otávio",
  "otavio",
  "guilherme",
  "henrique",
  "leandro",
  "luciano",
]);

// Palabras funcionales y vocabulario exclusivo del portugués
const PT_SPECIFIC_WORDS = [
  /\b(fazemos|faz|fazer|construindo|futuras?|unic[oó]rnios?|cara de empresa|grande)\b/i,
  /\b(gerente|diretor|diretora|s[oó]cio|s[oó]cia|desenvolvedor|desenvolvedora|especialista|vendas|neg[oó]cios|gestor|gestora|coordena[cç][aã]o|analista|equipe|empresa|estrat[eé]gia|crescimento|atendimento|consultor|consultoria|est[aá]gio|s[eê]nior|j[uú]nior|gera[cç][aã]o de demanda|prospec[cç][aã]o|treinamento|recursos humanos)\b/i,
  /\b(obrigad[oa]|parab[eé]ns|concordo|excelente|muito bom|sensacional|com certeza|legal|show|valeu|ol[aá]|bom dia|boa tarde|boa noite|abra[cç]o|sucesso|demais|ótimo|ótima)\b/i,
  /\b(do|da|dos|das|no|na|nos|nas|em|com|para|mais|um|uma|esse|essa|isso|este|esta|isto|aquele|aquela|voc[eê]|voc[eê]s|sua|suas|seu|seus|nosso|nossa|nossos|nossas|dele|dela|deles|delas|tamb[eé]m|j[aá]|ainda|agora|depois|sempre|nunca|tudo|nada|est[aá]|est[aã]o|s[aã]o|[eé]|foi|foram|tem|t[eê]m|vamos|estamos|sou|somos|ajuda|ajudar)\b/i,
];

// Palabras del español
const ES_SPECIFIC_WORDS = [
  /\b(director|directora|socio|socia|desarrollador|desarrolladora|ventas|negocios|coordinador|coordinadora|asesor|asesora|estrategia|crecimiento|atenci[oó]n|equipo|consultor[ií]a|capacitaci[oó]n)\b/i,
  /\b(gracias|felicidades|excelente|totalmente|de acuerdo|muy buen|saludos|buen d[ií]a|buenas tardes|hola|buena publicaci[oó]n|genial|abrazo|éxitos)\b/i,
  /\b(el|la|los|las|un|una|del|al|con|para|por|hacia|sobre|este|esta|esto|pero|tambi[eé]n|despu[eé]s|ahora|siempre|nunca|todo|nada|est[aá]|est[aá]n|somos|estamos|tenemos|ayuda|ayudar)\b/i,
];

// Palabras del inglés general
const EN_SPECIFIC_WORDS = [
  /\b(we make|look expensive|building websites|brands for future|co-founder|founder|ceo|cto|cmo|coo|cro|head of|vp of|vice president|manager|director|growth|lead|engineer|developer|specialist|consultant|advisor|officer|partner|creator|strategist)\b/i,
  /\b(great|awesome|congrats|insightful|congratulations|love this|agree|totally|well said|interesting|thanks|thank you|valuable|spot on)\b/i,
  /\b(the|and|for|with|this|that|from|have|what|your|their|about|how|just|into|some|look|websites|brands|future|startups?)\b/i,
];

export interface DetectLeadLanguageParams {
  fullName?: string | null;
  headline?: string | null;
  location?: string | null;
  linkedinUrl?: string | null;
  signalSnippet?: string | null;
  competitorName?: string | null;
  defaultLang?: SupportedLanguage;
}

/**
 * Detecta el idioma nativo y comercial del prospecto (Inglés / Español / Portugués)
 * con ponderación de ubicación, dominios de LinkedIn, nombres locales y ecosistema.
 */
export function detectLeadLanguage(lead: DetectLeadLanguageParams): SupportedLanguage {
  const loc = (lead.location || "").trim();
  const linkedinUrl = (lead.linkedinUrl || "").trim().toLowerCase();
  const fullName = (lead.fullName || "").trim().toLowerCase();
  const headline = (lead.headline || "").trim();
  const snippet = (lead.signalSnippet || "").trim();
  const compName = (lead.competitorName || "").trim();
  const combinedText = `${headline} ${snippet}`.trim();

  // 1. Detección por Dominio Regional de LinkedIn
  if (linkedinUrl.includes("br.linkedin.com") || linkedinUrl.includes("pt.linkedin.com")) {
    return "pt";
  }
  if (
    linkedinUrl.includes("es.linkedin.com") ||
    linkedinUrl.includes("ar.linkedin.com") ||
    linkedinUrl.includes("mx.linkedin.com") ||
    linkedinUrl.includes("co.linkedin.com") ||
    linkedinUrl.includes("cl.linkedin.com") ||
    linkedinUrl.includes("pe.linkedin.com") ||
    linkedinUrl.includes("uy.linkedin.com")
  ) {
    return "es";
  }

  // 2. Detección por Ubicación Geográfica Explícita (Prioridad física indiscutible)
  if (loc && !/remoto|no especificado/i.test(loc)) {
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

  // 3. Verificación de Ecosistema Brasileño (Ej: interactuó con Prospectme, Hatlas, etc.)
  const isBrazilianEcosystem =
    (compName && BRAZILIAN_COMPETITORS_OR_ECOSYSTEMS.some((p) => p.test(compName))) ||
    BRAZILIAN_COMPETITORS_OR_ECOSYSTEMS.some((p) => p.test(combinedText));

  // 4. Verificación de Nombre/Apellido Luso-Brasileño
  const nameTokens = fullName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .split(/\s+/);
  const hasLusoName = nameTokens.some((tok) => LUSO_BRAZILIAN_NAMES.has(tok));

  // Si proviene del ecosistema brasileño (ej: Prospectme) y tiene nombre local o el competidor es de Brasil,
  // el idioma comercial es Portugués (aunque su headline esté en inglés para sonar global como startup)
  if (isBrazilianEcosystem) {
    // Si no hay indicadores fuertes de España o país hispano, es Portugués
    let esScore = 0;
    for (const pat of ES_SPECIFIC_WORDS) {
      const m = combinedText.match(new RegExp(pat.source, "gi"));
      if (m) esScore += m.length;
    }
    if (esScore === 0) {
      return "pt";
    }
  }

  // 5. Presencia de Caracteres Exclusivos de Portugués (ç, ã, õ, ê, ô)
  if (/[çãõêô]/i.test(combinedText)) {
    return "pt";
  }

  // 6. Análisis Ponderado de Vocabulario
  let ptScore = 0;
  let esScore = 0;
  let enScore = 0;

  for (const pat of PT_SPECIFIC_WORDS) {
    const m = combinedText.match(new RegExp(pat.source, "gi"));
    if (m) ptScore += m.length * 3;
  }

  for (const pat of ES_SPECIFIC_WORDS) {
    const m = combinedText.match(new RegExp(pat.source, "gi"));
    if (m) esScore += m.length * 3;
  }

  for (const pat of EN_SPECIFIC_WORDS) {
    const m = combinedText.match(new RegExp(pat.source, "gi"));
    if (m) enScore += m.length * 2;
  }

  // Bono por nombre luso
  if (hasLusoName) {
    ptScore += 4;
  }

  // Si el ecosistema es brasileño pero el headline está en inglés (muy común en fundadores como Deluca o tech recruiters como Gabriel)
  if (isBrazilianEcosystem && enScore > 0 && ptScore === 0) {
    // En Brasil, fundadores como Deluca ponen titulares en inglés ("We make startups look expensive...")
    // pero operan en Brasil y su idioma de prospección es Portugués
    return "pt";
  }

  if (ptScore > esScore && ptScore > enScore) return "pt";
  if (esScore > ptScore && esScore > enScore) return "es";
  if (enScore > esScore && enScore > ptScore) return "en";

  // 7. Fallback Contextual
  if (hasLusoName || isBrazilianEcosystem) {
    return "pt";
  }

  return lead.defaultLang || "es";
}
