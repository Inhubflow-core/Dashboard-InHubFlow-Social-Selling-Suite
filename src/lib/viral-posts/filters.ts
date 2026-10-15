// Filtros de calidad, origen y contenido para el Radar Viral de Social Selling
// Diseñado para excluir ruido (ruso/cirílico, spam corporativo institucional y ofertas/solicitudes de empleo)

export const CYRILLIC_REGEX = /[\u0400-\u04FF]/;
export const NON_WESTERN_REGEX =
  /[\u4E00-\u9FFF\u3040-\u30FF\uAC00-\uD7AF\u0600-\u06FF\u10A0-\u10FF\u0530-\u05FF\u0590-\u05FF]/;

export function isNonWestern(text: string): boolean {
  if (!text) return false;
  return CYRILLIC_REGEX.test(text) || NON_WESTERN_REGEX.test(text);
}

export const EXCLUDED_CORPORATE_AUTHORS = [
  "linkedin for marketing",
  "linkedin marketing solutions",
  "linkedin marketing",
  "linkedin for business",
  "linkedin business",
];

export function isExcludedCorporateAuthor(author?: string, publicIdentifier?: string): boolean {
  const authorLower = String(author || "").toLowerCase();
  const publicIdLower = String(publicIdentifier || "").toLowerCase();
  return EXCLUDED_CORPORATE_AUTHORS.some(
    (term) => authorLower.includes(term) || publicIdLower.includes(term)
  );
}

/**
 * Filtro estricto de ofertas y solicitudes de empleo (#OpenToWork / Hiring / Recrutamento)
 * Excluye publicaciones transaccionales de empleo que no aportan estructuras de valor
 * ni frameworks de Social Selling / Copywriting para modelar.
 */
export function isJobRelatedPost(text: string, headline: string = ""): boolean {
  const lower = (text + " " + headline).toLowerCase();

  // 1. Hashtags y etiquetas explícitas de empleo
  const jobHashtags = [
    "#opentowork",
    "#hiring",
    "#nowhiring",
    "#wearehiring",
    "#hiringnow",
    "#jobalert",
    "#jobopening",
    "#jobvacancy",
    "#careers",
    "#vagas",
    "#vaga",
    "#vagasdeemprego",
    "#empleo",
    "#trabajo",
    "#recolocacao",
    "#recolocação",
    "#buscoempleo",
    "#recrutamento",
    "#oportunidade",
    "#oportunidades",
  ];

  for (const tag of jobHashtags) {
    if (lower.includes(tag)) return true;
  }

  // 2. Ofertas de empleo (Hiring / Recruiting)
  const jobOfferPatterns = [
    // Inglés
    "we're hiring",
    "were hiring",
    "we are hiring",
    "hiring!",
    "now hiring",
    "i'm hiring",
    "im hiring",
    "is hiring",
    "job opportunity",
    "job opening",
    "open position",
    "open role",
    "looking for a sdr",
    "looking for a bdr",
    "looking for an ae",
    "looking to hire",
    "apply here",
    "apply now",
    "send your cv",
    "send your resume",
    "join our team",
    "job openings",
    "in this role, you will lead",
    "hiring for",
    "qualifications:",
    "salary range:",
    "how to apply:",
    // Español
    "estamos contratando",
    "estoy contratando",
    "buscamos sdr",
    "buscamos bdr",
    "buscamos prospectador",
    "buscamos closer",
    "buscamos ejecutivo",
    "buscamos comercial",
    "oferta de empleo",
    "oferta laboral",
    "oportunidad laboral",
    "vacante abierta",
    "nueva vacante",
    "vagas abiertas",
    "postúlate aquí",
    "postulate aqui",
    "envía tu cv",
    "envia tu cv",
    "enviar cv",
    "enviar hoja de vida",
    "requisitos del puesto",
    "perfil requerido",
    "salario:",
    "remuneración:",
    "sueldo:",
    "únete a nuestro equipo",
    "unete a nuestro equipo",
    // Portugués
    "vaga aberta",
    "vagas abertas",
    "oportunidade de emprego",
    "oportunidade de trabalho",
    "venha fazer parte",
    "junte-se ao time",
    "posição aberta",
    "inscrições abertas",
    "envie seu currículo",
    "envie seu cv",
    "mande seu cv",
    "mande seu curriculo",
    "interessados enviar cv",
    "estamos com uma posição",
    "estamos com vaga",
    "3 vagas abertas",
    "2 vagas abertas",
    "1 vaga aberta",
    "vagas da semana",
    "vagas da",
    "vaga da semana",
    "carro da vaga",
    "vagas de hoje",
    "oportunidades comerciais",
    "contratando sdr",
    "contratando bdr",
    "salário fixo + comissão",
  ];

  for (const pattern of jobOfferPatterns) {
    if (lower.includes(pattern)) return true;
  }

  // 3. Comprobar si el autor es recruiter o agencia de empleo
  const authorProfile = headline.toLowerCase();
  const recruiterTerms = [
    "recruiter",
    "recrutamento",
    "talent acquisition",
    "headhunter",
    "r&s",
    "staffing",
    "recursos humanos",
  ];
  const isRecruiterAuthor = recruiterTerms.some(
    (term) => authorProfile.includes(term) || lower.includes(term)
  );
  if (
    isRecruiterAuthor &&
    (lower.includes("vaga") ||
      lower.includes("hiring") ||
      lower.includes("job") ||
      lower.includes("currículo") ||
      lower.includes("cv") ||
      lower.includes("oportunidade") ||
      lower.includes("candidato"))
  ) {
    return true;
  }

  // 4. Solicitudes de empleo / Búsqueda activa (Job Seeking / #OpenToWork)
  const jobSeekerPatterns = [
    // Inglés
    "looking for a new role",
    "looking for new opportunities",
    "actively looking for",
    "seeking a new opportunity",
    "seeking new opportunities",
    "in between roles",
    "in transition",
    "my bandwidth is open",
    "open to new opportunities",
    "looking for my next role",
    "available for immediate start",
    "open for new challenges",
    // Español
    "buscando empleo",
    "busco empleo",
    "busco trabajo",
    "buscando trabajo",
    "en búsqueda activa",
    "en busqueda activa",
    "abierto a nuevas oportunidades",
    "abierta a nuevas oportunidades",
    "en busca de mi próximo reto",
    "en busca de nuevos desafíos",
    "en busca de nuevos desafios",
    "mi disponibilidad es inmediata",
    "mi cv adjunto",
    "comparto mi cv",
    // Portugués
    "estou aberto a novas oportunidades",
    "estou aberta a novas oportunidades",
    "aberto a novas oportunidades",
    "aberta a nuevas oportunidades",
    "buscando recolocação",
    "em busca de recolocação",
    "em busca de recolocacao",
    "procurando recolocação",
    "procurando recolocacao",
    "aberto ao mercado",
    "aberta ao mercado",
    "disponível para novas oportunidades",
    "disponivel para novas oportunidades",
    "disponivel para novos desafios",
  ];

  for (const pattern of jobSeekerPatterns) {
    if (lower.includes(pattern)) return true;
  }

  return false;
}

/**
 * Filtro estricto de spam promocional, servicios freelance, ofertas directas de diseño/banners
 * y esquemas de "ganar dinero online" / cursos de freelance.
 * Elimina flyers comerciales de baja calidad que no aportan estructuras de Social Selling B2B.
 */
export function isFreelanceOrServiceSpam(text: string, headline: string = ""): boolean {
  const lower = (text + " " + headline).toLowerCase();

  // 1. Detección de moneda de regiones de gig spam (Rupias indias) o esquemas de ingresos
  if (
    lower.includes("₹") ||
    lower.includes("inr") ||
    lower.includes("earning potential") ||
    lower.includes("learnandearn") ||
    lower.includes("#learnandearn") ||
    lower.includes("#freelancelife") ||
    lower.includes("earn money online") ||
    lower.includes("make money online") ||
    lower.includes("ganhar dinheiro online") ||
    lower.includes("renda passiva online") ||
    lower.includes("#digitalskills") ||
    lower.includes("#upskilling")
  ) {
    return true;
  }

  // 2. Servicios de diseño gráfico, perfiles y banners freelance
  const designServiceTerms = [
    "banner designer",
    "banner design",
    "banners delivered",
    "elite banner",
    "profile banner",
    "linkedin banner",
    "banner para o linkedin",
    "designer de banner",
    "co-founder banner designer",
    "profile design",
    "profile makeover",
    "profile redesign",
    "thumbnail designer",
    "carrossel designer",
    "designer de carrossel",
    "canva designer",
    "designer gráfico freelance",
    "designer grafico freelance",
    "1x elite banner",
    "1x banner",
    "2x featured cards",
    "branded pic",
    "foto de perfil com marca",
    "cards estratégicos em destaque",
    "cards estrategicos",
    "banner & pic",
    "banner & profile",
  ];

  for (const term of designServiceTerms) {
    if (lower.includes(term)) return true;
  }

  // 3. Ofertas de servicios con descuentos agresivos y escasez artificial (Promo Flyers)
  const promoOfferPatterns = [
    "exclusive offer",
    "oferta exclusiva",
    "limited offer",
    "special offer",
    "agora custa $",
    "now costs $",
    "now only $",
    "now for only $",
    "now $",
    "de $393 por",
    "spots left",
    "spot left",
    "5 spot left",
    "7 spot left",
    "slots left",
    "slots each week",
    "slot each week",
    "7 slot each week",
    "7 slots each week",
    "vagas por semana para que eu possa",
    "vagas por semana",
    "vagas disponíveis para clientes",
    "vagas disponiveis para clientes",
    "dm to book",
    "dm to claim",
    "send a dm to order",
    "order your banner",
    "click link in featured",
    "check featured section",
    "pacote de geração de leads",
    "pacote de geracao de leads",
    "lead gen pack of $",
    "lead generation pack of $",
  ];

  for (const pattern of promoOfferPatterns) {
    if (lower.includes(pattern)) return true;
  }

  return false;
}

/**
 * Detecta si una publicación o su autor provienen de regiones fuera del foco comercial
 * (Asia del Sur, Medio Oriente, África Subsahariana, etc.) que suelen generar spam freelance y no corresponden
 * al objetivo de prospección y Social Selling en América y Europa.
 */
export function isNonTargetGeography(text: string, headline: string = ""): boolean {
  const lower = (text + " " + headline).toLowerCase();

  // Monedas de regiones con alto volumen de gig spam
  if (
    lower.includes("₹") ||
    lower.includes("inr") ||
    lower.includes("aed") ||
    lower.includes("pkr") ||
    lower.includes("bdt")
  ) {
    return true;
  }

  // Países y ciudades de Asia del Sur, Medio Oriente y hubs de gig spam
  const excludedLocations = [
    // Medio Oriente
    "dubai",
    "emirados árabes",
    "emirados arabes",
    "united arab emirates",
    "uae",
    "abu dhabi",
    "sharjah",
    "saudi arabia",
    "riyadh",
    "jeddah",
    "qatar",
    "doha",
    "kuwait",
    "bahrain",
    // India y principales ciudades
    "india",
    "delhi",
    "new delhi",
    "mumbai",
    "bangalore",
    "bengaluru",
    "hyderabad",
    "pune",
    "chennai",
    "noida",
    "gurugram",
    "gurgaon",
    "ahmedabad",
    "kolkata",
    "jaipur",
    "chandigarh",
    // Pakistán y principales ciudades
    "pakistan",
    "lahore",
    "karachi",
    "islamabad",
    "rawalpindi",
    // Bangladesh
    "bangladesh",
    "dhaka",
    // África Subsahariana / Otros
    "nigeria",
    "lagos",
    "abuja",
    "kenya",
    "nairobi",
    "philippines",
  ];

  for (const loc of excludedLocations) {
    if (lower.includes(loc)) {
      return true;
    }
  }

  return false;
}
