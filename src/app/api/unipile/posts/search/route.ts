import { unipile } from "@/lib/unipile/client";
import { getStoredAccounts } from "@/lib/unipile/store";
import {
  isExcludedCorporateAuthor,
  isFreelanceOrServiceSpam,
  isJobRelatedPost,
  isNonTargetGeography,
  isNonWestern,
} from "@/lib/viral-posts/filters";
import { NextResponse } from "next/server";

function detectPostLanguage(text: string): "pt" | "es" | "en" | "other" {
  const lower = " " + text.toLowerCase().replace(/[^a-záéíóúüñãõçâêîôûàèìòù]/g, " ") + " ";

  const ptWords = [
    " o ", " a ", " os ", " as ", " de ", " do ", " da ", " dos ", " das ", " em ", " no ", " na ",
    " nos ", " nas ", " por ", " para ", " com ", " como ", " você ", " voce ", " não ", " nao ",
    " mais ", " que ", " se ", " um ", " uma ", " sua ", " seu ", " muito ", " vendas ", " clientes ",
    " prospecção ", " equipe ", " mercado "
  ];
  const esWords = [
    " el ", " la ", " los ", " las ", " de ", " del ", " en ", " por ", " para ", " con ", " como ",
    " que ", " se ", " un ", " una ", " unos ", " unas ", " su ", " sus ", " más ", " mas ", " pero ",
    " este ", " esta ", " estos ", " estas ", " ventas ", " clientes ", " prospección ", " equipo ", " empresa "
  ];
  const enWords = [
    " the ", " and ", " to ", " of ", " in ", " for ", " is ", " on ", " that ", " by ", " this ",
    " with ", " from ", " at ", " it ", " you ", " your ", " are ", " we ", " have ", " our ",
    " be ", " will ", " can ", " sales ", " business ", " growth ", " team "
  ];

  let ptScore = 0;
  for (const w of ptWords) {
    if (lower.includes(w)) ptScore++;
  }

  let esScore = 0;
  for (const w of esWords) {
    if (lower.includes(w)) esScore++;
  }

  let enScore = 0;
  for (const w of enWords) {
    if (lower.includes(w)) enScore++;
  }

  if (ptScore > esScore && ptScore > enScore && ptScore >= 2) return "pt";
  if (esScore > ptScore && esScore > enScore && esScore >= 2) return "es";
  if (enScore > ptScore && enScore > esScore && enScore >= 2) return "en";
  if (ptScore >= 2) return "pt";
  if (esScore >= 2) return "es";
  if (enScore >= 2) return "en";
  return "en";
}

function detectMarketOrigin(text: string, headline: string, lang: "pt" | "es" | "en" | "other"): string {
  const combined = (text + " " + headline).toLowerCase();

  // Detección estricta de geografías fuera del objetivo comercial (Asia del Sur / Medio Oriente / África Subsahariana)
  if (isNonTargetGeography(text, headline)) {
    return "Asia del Sur / Medio Oriente";
  }

  if (
    combined.includes("brasil") ||
    combined.includes("brazil") ||
    combined.includes("são paulo") ||
    combined.includes("rio de janeiro") ||
    combined.includes("curitiba") ||
    combined.includes("belo horizonte") ||
    combined.includes("porto alegre")
  ) {
    return "Brasil";
  }
  if (
    combined.includes("panamá") ||
    combined.includes("panama") ||
    combined.includes("costa rica") ||
    combined.includes("guatemala") ||
    combined.includes("centroamérica") ||
    combined.includes("centroamerica")
  ) {
    return "Centroamérica / Panamá";
  }
  if (
    combined.includes("méxico") ||
    combined.includes("mexico") ||
    combined.includes("colombia") ||
    combined.includes("argentina") ||
    combined.includes("chile") ||
    combined.includes("perú") ||
    combined.includes("peru") ||
    combined.includes("latam") ||
    combined.includes("uruguay") ||
    combined.includes("ecuador")
  ) {
    return "LATAM";
  }
  if (
    combined.includes("united states") ||
    combined.includes("usa") ||
    combined.includes("san francisco") ||
    combined.includes("silicon valley") ||
    combined.includes("new york") ||
    combined.includes("austin") ||
    combined.includes("california") ||
    combined.includes("boston") ||
    combined.includes("seattle") ||
    combined.includes("florida") ||
    combined.includes("texas")
  ) {
    return "EE.UU.";
  }
  if (
    combined.includes("españa") ||
    combined.includes("spain") ||
    combined.includes("madrid") ||
    combined.includes("barcelona") ||
    combined.includes("united kingdom") ||
    combined.includes("london") ||
    combined.includes("france") ||
    combined.includes("germany") ||
    combined.includes("europe") ||
    combined.includes("emea")
  ) {
    return "Europa Occidental";
  }

  // Fallback por idioma (solo asigna EE.UU./Global si NO es de geografía excluida)
  if (lang === "pt") return "Brasil / Cono Sur";
  if (lang === "es") return "LATAM / Hispanoamérica";
  if (lang === "en") {
    if (isNonTargetGeography(text, headline)) {
      return "Asia del Sur / Medio Oriente";
    }
    return "EE.UU. / Global";
  }
  return "Occidente";
}

function resolveMarketFromTimezone(tz: string): string {
  const tzLower = (tz || "").toLowerCase();
  const brazilZones = [
    "sao_paulo", "brazil", "recife", "belem", "fortaleza", "manaus",
    "cuiaba", "porto_velho", "boa_vista", "maceio", "campo_grande",
    "noronha", "araguaina", "rio_branco", "santarem"
  ];
  if (brazilZones.some((z) => tzLower.includes(z))) return "brazil_us";

  const spainZones = ["madrid", "canary", "ceuta"];
  if (spainZones.some((z) => tzLower.includes(z)) || tzLower.startsWith("europe/")) return "europe_us";

  const centralZones = ["panama", "costa_rica", "guatemala", "el_salvador", "managua", "tegucigalpa"];
  if (centralZones.some((z) => tzLower.includes(z))) return "central_us";

  const usZones = ["new_york", "chicago", "los_angeles", "denver", "phoenix", "anchorage", "honolulu"];
  if (usZones.some((z) => tzLower.includes(z))) return "only_us";

  return "latam_us";
}

function generateQueryVariations(rawKeywords: string, targetMarket: string): string[] {
  const kw = rawKeywords.trim();
  if (!kw) return ["Social Selling"];

  const lower = kw.toLowerCase();
  const variations: string[] = [kw];

  // A. Normalización lingüística universal (sin acentos para matching amplio en LinkedIn)
  const unaccented = kw.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
  if (unaccented && unaccented.toLowerCase() !== lower) {
    variations.push(unaccented);
  }

  // B. Generación universal de Hashtag de Nicho (los creadores en cualquier industria usan hashtags)
  const alphaOnly = unaccented.replace(/[^a-zA-Z0-9]/g, "");
  if (alphaOnly.length >= 3) {
    variations.push(`#${alphaOnly}`);
  }

  // C. Tesauro Universal Multi-Industria para Plataforma SaaS (10 Grandes Ejes de Negocio)
  // 1. Salud, Nutrición, Bienestar y Medicina
  if (lower.includes("cetogenica") || lower.includes("keto") || lower.includes("cetogenico")) {
    variations.push("Keto Diet");
    variations.push("Dieta Cetogénica");
  } else if (lower.includes("nutricion") || lower.includes("nutricional") || lower.includes("dietetica")) {
    variations.push("Nutrition");
    variations.push("Nutrición Saludable");
  } else if (lower.includes("odontolog") || lower.includes("dentis")) {
    variations.push("Cosmetic Dentistry");
    variations.push("Odontología");
  } else if (lower.includes("fitness") || lower.includes("entrenamient") || lower.includes("gym")) {
    variations.push("Fitness Coaching");
    variations.push("Personal Trainer");
  } else if (lower.includes("fisioterap") || lower.includes("rehabilitac")) {
    variations.push("Physical Therapy");
    variations.push("Fisioterapia");
  } else if (lower.includes("psicolog") || lower.includes("salud mental") || lower.includes("terapia")) {
    variations.push("Mental Health");
    variations.push("Psicología");
  }
  // 2. Energía, Sostenibilidad, Clima y Medio Ambiente
  else if (lower.includes("solar") || lower.includes("fotovoltaic") || lower.includes("panel")) {
    variations.push("Solar Energy");
    variations.push("Energía Solar Fotovoltaica");
    variations.push("Paneles Solares");
  } else if (lower.includes("renovable") || lower.includes("sustentab") || lower.includes("sostenib")) {
    variations.push("Renewable Energy");
    variations.push("Sustainability");
  } else if (lower.includes("reciclaj") || lower.includes("residuos") || lower.includes("circular")) {
    variations.push("Circular Economy");
    variations.push("Gestión de Residuos");
  }
  // 3. Legal, Tributario y Compliance
  else if (lower.includes("tributari") || lower.includes("fiscal") || lower.includes("impuesto")) {
    variations.push("Tax Law");
    variations.push("Derecho Tributario");
  } else if (lower.includes("laboral") && (lower.includes("derecho") || lower.includes("abogad"))) {
    variations.push("Employment Law");
    variations.push("Derecho Laboral");
  } else if (lower.includes("derecho") || lower.includes("abogad") || lower.includes("juridic")) {
    variations.push("Corporate Law");
    variations.push("Legal Tech");
  }
  // 4. Inmobiliaria, Proptech y Construcción
  else if (lower.includes("inmobiliari") || lower.includes("bienes raices") || lower.includes("real estate") || lower.includes("proptech")) {
    variations.push("Real Estate Investing");
    variations.push("Proptech");
    variations.push("Bienes Raíces");
  } else if (lower.includes("arquitectur") || lower.includes("construcc")) {
    variations.push("Sustainable Architecture");
    variations.push("Construcción");
  }
  // 5. Finanzas, Inversión, Fintech y Cripto
  else if (lower.includes("fintech") || lower.includes("cripto") || lower.includes("crypto") || lower.includes("defi")) {
    variations.push("Fintech Innovation");
    variations.push("DeFi");
  } else if (lower.includes("finanz") || lower.includes("inversi") || lower.includes("wealth") || lower.includes("patrimoni")) {
    variations.push("Corporate Finance");
    variations.push("Finanzas Corporativas");
  }
  // 6. Tecnología, IA, Software y Ciberseguridad
  else if (lower.includes("ciberseguridad") || lower.includes("cybersecurity") || lower.includes("infosec")) {
    variations.push("Cybersecurity");
    variations.push("Information Security");
  } else if (lower.includes("inteligencia artificial") || lower === "ia" || lower.includes("artificial intelligence") || lower.includes("machine learning")) {
    variations.push("Artificial Intelligence");
    variations.push("Generative AI");
    variations.push("IA Generativa");
  } else if (lower.includes("saas") || lower.includes("software") || lower.includes("cloud") || lower.includes("devops")) {
    variations.push("B2B SaaS");
    variations.push("Cloud Architecture");
  }
  // 7. Ventas B2B, Prospección y Marketing
  else if ((lower.includes("b2b") && lower.includes("outbound")) || lower === "b2b outbound" || lower === "outbound b2b") {
    variations.push("Outbound B2B");
    if (targetMarket === "brazil_us") {
      variations.push("Prospecção Outbound");
      variations.push("Prospecção B2B");
    } else {
      variations.push("Prospección B2B");
      variations.push("Outbound Sales");
    }
  } else if (lower.includes("social selling")) {
    variations.push("Social Selling B2B");
    if (targetMarket === "brazil_us") {
      variations.push("Social Selling Brasil");
      variations.push("Vendas LinkedIn");
    } else {
      variations.push("Social Selling LinkedIn");
      variations.push("Ventas B2B");
    }
  } else if (lower.includes("cold email") || lower.includes("email frio")) {
    variations.push("Cold Outreach");
    variations.push("Cold Email B2B");
  } else if (lower.includes("lead generation") || lower.includes("generacion de leads") || lower.includes("geração de leads")) {
    variations.push("Geração de Leads");
    variations.push("B2B Lead Generation");
  } else if (lower.includes("copywriting") || lower.includes("redaccion")) {
    variations.push("Copywriting");
    variations.push("Content Marketing");
  } else if (lower.includes("ecommerce") || lower.includes("e-commerce")) {
    variations.push("Ecommerce Growth");
    variations.push("Ventas Online");
  }
  // 8. Recursos Humanos, Talento y Liderazgo
  else if (lower.includes("recursos humanos") || lower.includes("rrhh") || lower.includes("talento") || lower.includes("reclutamient")) {
    variations.push("HR Leadership");
    variations.push("People Operations");
  } else if (lower.includes("liderazgo") || lower.includes("leadership") || lower.includes("coaching") || lower.includes("management")) {
    variations.push("Executive Leadership");
    variations.push("Management");
  }
  // 9. Logística, Cadena de Suministro y Agro
  else if (lower.includes("logistica") || lower.includes("transporte") || lower.includes("supply chain")) {
    variations.push("Supply Chain Management");
    variations.push("Logística");
  } else if (lower.includes("agro") || lower.includes("agronegoci") || lower.includes("agricultur")) {
    variations.push("Agribusiness");
    variations.push("Agro");
  }
  // 10. Fallback Universal Dinámico para Cualquier Nicho Arbitrario
  else {
    const stopwords = new Set([
      "de", "del", "la", "el", "los", "las", "un", "una", "unos", "unas", "en", "para", "por", "con",
      "y", "o", "a", "al", "da", "do", "das", "dos", "em", "no", "na", "nos", "nas", "com", "para",
      "e", "ou", "the", "of", "in", "for", "on", "with", "at", "by", "from", "an", "and", "or"
    ]);
    const words = unaccented.split(/\s+/).filter((w) => Boolean(w) && !stopwords.has(w.toLowerCase()));

    if (words.length >= 2) {
      const reversed = [...words].reverse().join(" ");
      if (!variations.includes(reversed)) variations.push(reversed);
      const corePair = words.slice(0, 2).join(" ");
      if (!variations.includes(corePair)) variations.push(corePair);
    } else if (words.length === 1 && words[0]) {
      variations.push(`${words[0]} Leadership`);
      variations.push(`${words[0]} Trends`);
    }
  }

  // Deduplicar y retornar estrictamente 3 variantes para cosecha simultánea
  return Array.from(new Set(variations.filter(Boolean))).slice(0, 3);
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const keywords = (body.keywords || "Social Selling").trim();
    let requestedAccountId = body.account_id;
    const filterZero = body.filter_zero !== false;
    const excludeJobs = body.exclude_jobs !== false;
    const sortBy = body.sort_by || "RELEVANCE";
    const datePosted = body.date_posted || "PAST_MONTH";
    const requestLimit = Math.min(50, Math.max(35, body.limit || 50));

    // Detección 100% automática del mercado geográfico según la ubicación/zona horaria del usuario
    const userTimezone = body.user_timezone || req.headers.get("x-timezone") || "";
    let targetMarket = body.target_market;
    if (!targetMarket || targetMarket === "auto") {
      targetMarket = resolveMarketFromTimezone(userTimezone);
    }

    // 1. Obtener estado en vivo de las cuentas directamente de Unipile
    let liveAccounts: any[] = [];
    try {
      const res = await unipile.listAccounts();
      liveAccounts = res.items || [];
    } catch (err) {
      console.warn("[Posts Search] Error consultando cuentas Unipile:", err);
    }

    // Identificar cuenta activa y saludable (status === "OK" o fuente "OK")
    const isAccountHealthy = (acc: any) => {
      if (!acc) return false;
      if (acc.status === "OK" || acc.status === "CONNECTED") return true;
      if (Array.isArray(acc.sources) && acc.sources.some((s: any) => s.status === "OK")) return true;
      return false;
    };

    let targetAccountId = requestedAccountId;
    let selectedAccountObj = liveAccounts.find((a) => a.id === targetAccountId);

    // Si la cuenta solicitada no existe en Unipile o no está saludable, buscar una alternativa saludable
    if (!selectedAccountObj || !isAccountHealthy(selectedAccountObj)) {
      const healthyLive = liveAccounts.find(isAccountHealthy);
      if (healthyLive) {
        targetAccountId = healthyLive.id;
        selectedAccountObj = healthyLive;
      }
    }

    // Fallback secundario con cuentas almacenadas localmente
    if (!targetAccountId) {
      const stored = getStoredAccounts();
      const healthyStored = stored.find((a) => a.status === "OK");
      if (healthyStored) targetAccountId = healthyStored.id;
    }

    if (!targetAccountId) {
      return NextResponse.json(
        {
          error: "No hay cuentas de LinkedIn conectadas y con sesión activa (OK) para realizar la búsqueda.",
          items: [],
        },
        { status: 400 }
      );
    }

    // 2. Cosecha Multi-Ángulo en Paralelo (Multi-Angle Expansion)
    // Para superar la limitación fija de 24 posts por consulta de LinkedIn y garantizar holgadamente
    // que tras los filtros de calidad queden al menos 12 posts virales, consultamos variantes complementarias en paralelo.
    const queriesToRun = generateQueryVariations(keywords, targetMarket);
    console.log(`[Posts Search] Ejecutando búsqueda multi-ángulo paralela (${queriesToRun.length} variantes):`, queriesToRun);

    const rawItems: any[] = [];
    const seenPostIds = new Set<string>();

    const appendItems = (items: any[]) => {
      for (const item of items) {
        const id = item.id || item.social_id || item.share_url || (item.text ? item.text.slice(0, 60) : null);
        if (id) {
          if (!seenPostIds.has(id)) {
            seenPostIds.add(id);
            rawItems.push(item);
          }
        } else {
          rawItems.push(item);
        }
      }
    };

    const searchPromises = queriesToRun.map(async (queryText) => {
      try {
        const res = await unipile.searchLinkedIn({
          account_id: targetAccountId,
          category: "posts",
          keywords: queryText,
          limit: 25,
        });
        return res?.items || [];
      } catch (err: any) {
        console.warn(`[Posts Search] Sub-consulta para "${queryText}" con cuenta ${targetAccountId} falló:`, err?.message || err);
        return [];
      }
    });

    const searchResults = await Promise.all(searchPromises);
    searchResults.forEach((items) => appendItems(items));

    // Si todas las subconsultas fallaron (por ejemplo expiración de sesión), reintentar con cuenta alternativa saludable
    if (rawItems.length === 0) {
      const alternative = liveAccounts.find((a) => a.id !== targetAccountId && isAccountHealthy(a));
      if (alternative) {
        console.log(`[Posts Search] Reintentando con cuenta alternativa saludable: ${alternative.name} (${alternative.id})`);
        targetAccountId = alternative.id;
        selectedAccountObj = alternative;
        const retryPromises = queriesToRun.map(async (queryText) => {
          try {
            const res = await unipile.searchLinkedIn({
              account_id: targetAccountId,
              category: "posts",
              keywords: queryText,
              limit: 25,
            });
            return res?.items || [];
          } catch {
            return [];
          }
        });
        const retryResults = await Promise.all(retryPromises);
        retryResults.forEach((items) => appendItems(items));
      }
    }

    // Normalizar items y calcular métricas de viralidad ponderadas
    const normalized = rawItems.map((item: any, idx: number) => {
      const text = item.text || "";
      const lines = text.split("\n").map((l: string) => l.trim()).filter(Boolean);
      const hook = lines[0] || "Publicación destacada en LinkedIn";

      // Extraer imagen o adjunto multimedia si existe
      let mediaUrl: string | null = null;
      if (Array.isArray(item.attachments) && item.attachments.length > 0) {
        for (const att of item.attachments) {
          if (typeof att === "string" && att.startsWith("http")) {
            mediaUrl = att;
            break;
          } else if (att && typeof att === "object") {
            const found =
              att.url ||
              att.preview_url ||
              att.image_url ||
              att.media_url ||
              att.thumbnail_url ||
              att.file_url ||
              att.picture_url ||
              att.src ||
              null;
            if (found && typeof found === "string" && found.startsWith("http")) {
              mediaUrl = found;
              break;
            }
          }
        }
      }

      if (!mediaUrl) {
        const directMedia =
          item.image_url ||
          item.media_url ||
          item.thumbnail_url ||
          item.article?.thumbnail_url ||
          item.article?.image_url ||
          item.media?.url ||
          null;
        if (directMedia && typeof directMedia === "string" && directMedia.startsWith("http")) {
          mediaUrl = directMedia;
        }
      }

      // Detectar formato técnico real (Carrusel / Imagen / Video / Solo Texto)
      const lower = text.toLowerCase();
      let format: "text" | "image" | "carousel" | "video" = "text";
      let isCarousel = false;
      let isVideo = false;
      let isImage = false;

      // A. Inspeccionar adjuntos de Unipile
      const attachments = Array.isArray(item.attachments) ? item.attachments : [];

      // Si tiene múltiples adjuntos en LinkedIn -> Carrusel interactivo / Galería de slides
      if (attachments.length > 1) {
        isCarousel = true;
      }

      // B. Inspeccionar tipos de adjunto y mimetypes de Unipile
      for (const att of attachments) {
        const attType = String(att?.type || "").toUpperCase();
        const mime = String(att?.mimetype || att?.mime_type || "").toLowerCase();
        const urlStr = String(att?.url || att?.file_url || "").toLowerCase();
        const titleStr = String(att?.title || att?.name || "").toLowerCase();

        // LinkedIn procesa los Carruseles nativamente como DOCUMENT (PDF o presentación de diapositivas)
        if (
          attType === "DOCUMENT" ||
          attType === "CAROUSEL" ||
          attType === "PRESENTATION" ||
          mime.includes("pdf") ||
          mime.includes("document") ||
          mime.includes("presentation") ||
          urlStr.endsWith(".pdf") ||
          urlStr.includes("/pdf/") ||
          titleStr.endsWith(".pdf") ||
          titleStr.endsWith(".pptx") ||
          titleStr.endsWith(".ppt") ||
          (att?.page_count && Number(att.page_count) > 1) ||
          (att?.pages && Number(att.pages) > 1)
        ) {
          isCarousel = true;
          break;
        }

        // Detección de Video
        if (
          attType === "VIDEO" ||
          mime.startsWith("video/") ||
          urlStr.endsWith(".mp4") ||
          urlStr.includes("/video/")
        ) {
          isVideo = true;
        }

        // Detección de Imagen
        if (
          attType === "IMAGE" ||
          attType === "PHOTO" ||
          mime.startsWith("image/") ||
          att?.preview_url ||
          att?.image_url
        ) {
          isImage = true;
        }
      }

      // C. Inspeccionar propiedades directas en el objeto raíz de Unipile
      const postType = String(item.post_type || item.media_type || item.type || "").toUpperCase();
      if (
        postType === "DOCUMENT" ||
        postType === "CAROUSEL" ||
        item.document ||
        item.document_url ||
        item.is_carousel ||
        item.is_document
      ) {
        isCarousel = true;
      } else if (postType === "VIDEO" || item.video_url || item.video) {
        isVideo = true;
      }

      // D. Heurística lingüística multilingüe (Inglés, Español y Portugués)
      // Los creadores de carruseles usan activadores para incitar a pasar diapositivas
      const hasCarouselKeywords =
        lower.includes("swipe") ||
        lower.includes("carousel") ||
        lower.includes("carrusel") ||
        lower.includes("carrossel") ||
        lower.includes("desliza") ||
        lower.includes("deslize") ||
        lower.includes("arraste") ||
        lower.includes("slide") ||
        lower.includes("slides") ||
        lower.includes("diapositiva") ||
        lower.includes("diapositivas") ||
        lower.includes("pdf adjunto") ||
        lower.includes("pdf below") ||
        lower.includes("full pdf") ||
        lower.includes("document below") ||
        lower.includes("download the guide") ||
        lower.includes("playbook");

      if (hasCarouselKeywords && (attachments.length > 0 || mediaUrl || isImage)) {
        isCarousel = true;
      } else if (hasCarouselKeywords && !isCarousel && !isVideo) {
        // Si no tiene adjunto extraído pero el texto es explícitamente un carrusel
        isCarousel = true;
      }

      // E. Decisión final del Formato con jerarquía estricta
      if (isCarousel) {
        format = "carousel";
      } else if (isVideo) {
        format = "video";
      } else if (isImage || mediaUrl || attachments.length > 0 || lower.includes("imagen") || lower.includes("infografía") || lower.includes("infographic") || lower.includes("photo")) {
        format = "image";
      } else {
        format = "text";
      }

      const hasMedia = Boolean(mediaUrl || attachments.length > 0 || format !== "text");

      const likes = item.reaction_counter ?? 0;
      const comments = item.comment_counter ?? 0;
      const shares = item.repost_counter ?? 0;

      // Algoritmo Ponderado de Viralidad InHubFlow:
      // - Likes (x1): Reacciones de lectura rápida en el feed
      // - Comentarios (x3.5): Retención y distribución exponencial por algoritmo de LinkedIn
      // - Reposts (x5): Máxima amplificación orgánica y difusión externa
      const viralityScore = Math.round((likes * 1) + (comments * 3.5) + (shares * 5));

      // Asignación de Tier y Badge de Viralidad (Estrictamente los 3 tipos oficiales requeridos)
      let viralityTier: "mega" | "high" | "trending" = "trending";
      let viralityBadge = "En Tendencia 🔥";

      if (viralityScore >= 100 || (likes >= 50 && comments >= 15)) {
        viralityTier = "mega";
        viralityBadge = "Mega Viral 🔥🔥🔥";
      } else if (viralityScore >= 35 || (likes >= 20 && comments >= 5) || comments >= 8) {
        viralityTier = "high";
        viralityBadge = "Alta Tracción 🔥🔥";
      } else {
        viralityTier = "trending";
        viralityBadge = "En Tendencia 🔥";
      }

      // Ratio de interacción calculado dinámicamente
      const totalInteractions = likes + comments + shares;
      const ratio = totalInteractions > 0
        ? `${Math.min(25, Math.max(1.2, parseFloat((4.0 + Math.log10(totalInteractions + 1) * 3.5).toFixed(1))))}%`
        : "0.0%";

      // Detección de idioma y origen de mercado geográfico
      const lang = detectPostLanguage(text);
      const marketOrigin = detectMarketOrigin(text, item.author?.headline || "", lang);

      return {
        id: item.id || `live-post-${idx}`,
        author: item.author?.name || "Líder de Industria B2B",
        authorHeadline: item.author?.headline || "Especialista en LinkedIn & B2B",
        authorAvatar: item.author?.picture_url || null,
        publicIdentifier: item.author?.public_identifier || null,
        publishedDate: item.date || "Reciente",
        topic: keywords,
        format,
        hook,
        fullContent: text,
        likes,
        comments,
        shares,
        engagementRatio: ratio,
        viralityScore,
        viralityBadge,
        viralityTier,
        mediaUrl: mediaUrl || undefined,
        hasMedia,
        marketOrigin,
        detectedLanguage: lang,
        socialId: item.social_id || null,
        linkedinUrl: item.social_id ? `https://www.linkedin.com/feed/update/${item.social_id}` : null,
        isLive: true,
      };
    });

    // 2. Filtro Estricto Anti-Cirílico / Anti-Ruso y Alfabetos No Occidentales
    // Elimina publicaciones en ruso, ucraniano, búlgaro, kazajo o scripts asiáticos irrelevantes
    const nonRussianPosts = normalized.filter((item) => {
      const combined = `${item.author} ${item.authorHeadline} ${item.fullContent}`;
      return !isNonWestern(combined);
    });

    // 3. Filtro de Exclusión de Cuentas Corporativas e Institucionales
    const nonCorporatePosts = nonRussianPosts.filter(
      (item) => !isExcludedCorporateAuthor(item.author, item.publicIdentifier)
    );

    // 4. Filtro Estricto Anti-Ofertas y Solicitudes de Empleo (#OpenToWork / Hiring)
    let nonJobPosts = nonCorporatePosts;
    let filteredJobsCount = 0;
    if (excludeJobs) {
      nonJobPosts = nonCorporatePosts.filter(
        (item) => !isJobRelatedPost(item.fullContent, item.authorHeadline)
      );
      filteredJobsCount = nonCorporatePosts.length - nonJobPosts.length;
    }

    // 4.1. Filtro Estricto Anti-Spam Freelance, Diseñadores de Banners y Flyers Promocionales
    const nonSpamPosts = nonJobPosts.filter(
      (item) => !isFreelanceOrServiceSpam(item.fullContent, item.authorHeadline)
    );

    // 5. Filtro de Calidad Anti-Cero (Descartar publicaciones sin tracción)
    let qualifiedPosts = nonSpamPosts;

    if (filterZero) {
      qualifiedPosts = nonSpamPosts.filter((item) => {
        const total = item.likes + item.comments + item.shares;
        return total > 0;
      });

      // Si tras el filtro estricto de cero interacción la lista tiene menos de 12 posts,
      // complementar con posts limpios y pertinentes de la misma temática para garantizar siempre hasta 12 posts en el SaaS
      if (qualifiedPosts.length < 12 && nonSpamPosts.length > qualifiedPosts.length) {
        const qualifiedIds = new Set(qualifiedPosts.map((p) => p.id));
        const additionalClean = nonSpamPosts.filter((p) => !qualifiedIds.has(p.id));
        qualifiedPosts = [...qualifiedPosts, ...additionalClean];
      } else if (qualifiedPosts.length === 0 && nonSpamPosts.length > 0) {
        qualifiedPosts = nonSpamPosts;
      }
    }

    // 6. Segmentación Regional Inteligente (targetMarket)
    // Regla fija: Siempre incluye Estados Unidos (EE.UU.) como referente de innovación global
    // Excluye tajantemente regiones de gig spam (Asia del Sur, Medio Oriente, África Subsahariana)
    const matchesTargetMarket = (item: any) => {
      const lang = item.detectedLanguage;
      const origin = item.marketOrigin || "";

      // Exclusión tajante de regiones fuera del objetivo comercial
      if (
        origin.includes("Asia del Sur") ||
        origin.includes("Medio Oriente") ||
        isNonTargetGeography(item.fullContent, item.authorHeadline)
      ) {
        return false;
      }

      const isUS =
        (lang === "en" || origin.includes("EE.UU.") || origin.includes("Global")) &&
        !origin.includes("Asia del Sur") &&
        !origin.includes("Medio Oriente");

      switch (targetMarket) {
        case "brazil_us":
          // Brasil + EE.UU. (América del Sur y Hub de Innovación Norteamericano)
          return lang === "pt" || isUS || origin.includes("Brasil");
        case "central_us":
          // Centroamérica & Panamá + EE.UU.
          return (
            (lang === "es" && (origin.includes("Centroamérica") || origin.includes("LATAM") || origin.includes("Panamá"))) ||
            isUS
          );
        case "europe_us":
          // Europa Occidental + EE.UU.
          return origin.includes("Europa") || lang === "es" || isUS;
        case "only_us":
          // Exclusivo Estados Unidos (Innovación Global)
          return isUS;
        case "global_west":
          // Todo Occidente (Sin ruso/cirílico)
          return true;
        case "latam_us":
        default:
          // Hispanoamérica + EE.UU. (Recomendado)
          return lang === "es" || isUS || origin.includes("LATAM");
      }
    };

    let marketMatchedPosts = qualifiedPosts.filter(matchesTargetMarket);

    // Si la segmentación regional es muy específica y arroja menos de 12 resultados, complementar con posts occidentales limpios calificados
    if (marketMatchedPosts.length < 12 && qualifiedPosts.length > 0) {
      const existingIds = new Set(marketMatchedPosts.map((p) => p.id));
      const cleanRemaining = qualifiedPosts.filter(
        (p) =>
          !existingIds.has(p.id) &&
          !isNonTargetGeography(p.fullContent, p.authorHeadline) &&
          !isFreelanceOrServiceSpam(p.fullContent, p.authorHeadline)
      );
      marketMatchedPosts = [...marketMatchedPosts, ...cleanRemaining];
    }

    // 7. Ordenación Estricta Descendente por Score de Viralidad (Lo más viral siempre primero)
    marketMatchedPosts.sort((a, b) => (b.viralityScore ?? 0) - (a.viralityScore ?? 0));

    // 8. Limitar estrictamente a los 12 mejores posts (Top 12)
    const top12Posts = marketMatchedPosts.slice(0, 12);

    return NextResponse.json({
      success: true,
      keywords,
      targetMarket,
      accountId: targetAccountId,
      accountName: selectedAccountObj?.name || "LinkedIn Account",
      totalFound: normalized.length,
      filteredCyrillicCount: normalized.length - nonRussianPosts.length,
      filteredJobsCount,
      count: top12Posts.length,
      filteredOutZeroCount: normalized.length - qualifiedPosts.length,
      items: top12Posts,
    });
  } catch (error: any) {
    console.error("[Posts Search API] Error:", error);
    let errorMessage = error.message || "Error al buscar publicaciones en LinkedIn";
    if (
      errorMessage.includes("504") ||
      errorMessage.includes("request_timeout") ||
      errorMessage.includes("Request Timeout")
    ) {
      errorMessage =
        "LinkedIn tardó demasiado en responder para esta búsqueda (Timeout temporal). Por favor reintenta en unos instantes.";
    }
    return NextResponse.json(
      {
        error: errorMessage,
        items: [],
      },
      { status: 500 }
    );
  }
}

