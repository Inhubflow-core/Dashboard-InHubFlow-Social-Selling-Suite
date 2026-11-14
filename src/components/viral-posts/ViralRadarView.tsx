"use client";

import ComponentCard from "@/components/common/ComponentCard";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import {
  getActiveAccountForUser,
  getVisibleAccountsForUser,
  setActiveAccountId,
  accountMatchesUser,
  addStoredAccount,
  updateStoredAccountStatus,
  updateAccountLanguage,
} from "@/lib/unipile/store";
import type { UnipileAccount } from "@/lib/unipile/types";
import { useAuth } from "@/context/AuthContext";
import {
  isExcludedCorporateAuthor,
  isFreelanceOrServiceSpam,
  isJobRelatedPost,
  isNonTargetGeography,
  isNonWestern,
} from "@/lib/viral-posts/filters";
import {
  setSelectedTemplateForModeling,
  getStoredRadarState,
  saveStoredRadarState,
  generateMonthScheduleDates,
  addBatchCreatedPosts,
} from "@/lib/viral-posts/store";
import { SAMPLE_B2B_BACKGROUNDS } from "./CreateViralPostView";
import type { CreatedPost, PostFormat, ViralPostTemplate } from "@/lib/viral-posts/types";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Sparkles,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Layers,
  FileText,
  Image as ImageIcon,
  X,
  Clock,
  ArrowRight,
  Check,
  Globe,
  UserCheck,
  MapPin,
} from "lucide-react";

export type TargetMarket =
  | "latam_us"
  | "brazil_us"
  | "central_us"
  | "europe_us"
  | "only_us"
  | "global_west";

export interface DetectedMarketInfo {
  country: string;
  market: TargetMarket;
  label: string;
  timezone: string;
}

export function detectUserMarket(): DetectedMarketInfo {
  let timeZone = "";
  try {
    timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
  } catch {
    timeZone = "";
  }

  const lang = typeof navigator !== "undefined" ? (navigator.language || "").toLowerCase() : "";
  const tzLower = timeZone.toLowerCase();

  // 1. Brasil (Horarios de São Paulo, Recife, Belém, etc. o idioma portugués)
  const brazilZones = [
    "sao_paulo", "brazil", "recife", "belem", "fortaleza", "manaus",
    "cuiaba", "porto_velho", "boa_vista", "maceio", "campo_grande",
    "noronha", "araguaina", "rio_branco", "santarem"
  ];
  if (brazilZones.some((z) => tzLower.includes(z)) || lang.startsWith("pt")) {
    return {
      country: "Brasil",
      market: "brazil_us",
      label: "Brasil + EE.UU.",
      timezone: timeZone,
    };
  }

  // 2. España y Europa Occidental
  const spainZones = ["madrid", "canary", "ceuta"];
  if (spainZones.some((z) => tzLower.includes(z))) {
    return {
      country: "España",
      market: "europe_us",
      label: "España + EE.UU.",
      timezone: timeZone,
    };
  }
  if (tzLower.startsWith("europe/")) {
    return {
      country: "Europa Occidental",
      market: "europe_us",
      label: "Europa Occidental + EE.UU.",
      timezone: timeZone,
    };
  }

  // 3. Panamá y Centroamérica
  const centralZones = ["panama", "costa_rica", "guatemala", "el_salvador", "managua", "tegucigalpa"];
  if (centralZones.some((z) => tzLower.includes(z))) {
    const isPanama = tzLower.includes("panama");
    return {
      country: isPanama ? "Panamá" : "Centroamérica",
      market: "central_us",
      label: isPanama ? "Panamá + EE.UU." : "Centroamérica + EE.UU.",
      timezone: timeZone,
    };
  }

  // 4. Estados Unidos / Canadá
  const usZones = [
    "new_york", "chicago", "los_angeles", "denver", "phoenix",
    "anchorage", "honolulu", "detroit", "indiana", "boise"
  ];
  if (usZones.some((z) => tzLower.includes(z))) {
    return {
      country: "Estados Unidos",
      market: "only_us",
      label: "Solo EE.UU.",
      timezone: timeZone,
    };
  }

  // 5. Países de Hispanoamérica (México, Colombia, Argentina, Chile, Perú, etc.)
  let latamCountry = "Hispanoamérica";
  if (tzLower.includes("mexico") || tzLower.includes("monterrey") || tzLower.includes("cancun") || tzLower.includes("tijuana")) {
    latamCountry = "México";
  } else if (tzLower.includes("bogota")) {
    latamCountry = "Colombia";
  } else if (tzLower.includes("buenos_aires") || tzLower.includes("argentina") || tzLower.includes("cordoba")) {
    latamCountry = "Argentina";
  } else if (tzLower.includes("santiago")) {
    latamCountry = "Chile";
  } else if (tzLower.includes("lima")) {
    latamCountry = "Perú";
  } else if (tzLower.includes("montevideo")) {
    latamCountry = "Uruguay";
  } else if (tzLower.includes("caracas")) {
    latamCountry = "Venezuela";
  } else if (tzLower.includes("guayaquil") || tzLower.includes("quito")) {
    latamCountry = "Ecuador";
  }

  return {
    country: latamCountry,
    market: "latam_us",
    label: `${latamCountry} + EE.UU.`,
    timezone: timeZone,
  };
}

export default function ViralRadarView({
  onTabChange,
  hideBreadcrumb,
}: {
  onTabChange?: (tab: string) => void;
  hideBreadcrumb?: boolean;
} = {}) {
  const t = useTranslations("viralPosts.radar");
  const router = useRouter();
  const locale = useLocale();
  const { currentUser } = useAuth();

  // Cuentas de LinkedIn
  const [availableAccounts, setAvailableAccounts] = useState<any[]>([]);
  const [activeAccount, setActiveAccount] = useState<UnipileAccount | null>(null);
  const [activeAccountName, setActiveAccountName] = useState<string>("");

  // Control de persistencia de sesión
  const [isCacheRestored, setIsCacheRestored] = useState(false);

  // Estados para Búsqueda en Vivo
  const [searchKeyword, setSearchKeyword] = useState("B2B Outbound");
  const [lastSuccessfulKeyword, setLastSuccessfulKeyword] = useState<string>("B2B Outbound");
  const [livePosts, setLivePosts] = useState<ViralPostTemplate[]>([]);
  const [isSearchingLive, setIsSearchingLive] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [hasSearchedOnce, setHasSearchedOnce] = useState(false);

  // Estados para Generador de Plan de 1 Mes (12 Posts)
  const [showConfigMonthPlanModal, setShowConfigMonthPlanModal] = useState(false);
  const [monthPlanTargetAccountId, setMonthPlanTargetAccountId] = useState<string>("");
  const [monthPlanTargetLanguage, setMonthPlanTargetLanguage] = useState<"es" | "pt" | "en">("es");
  const [saveLanguageToAccount, setSaveLanguageToAccount] = useState<boolean>(true);
  const [generatingProgress, setGeneratingProgress] = useState<{ current: number; total: number; message: string } | null>(null);
  const [isGeneratingMonthPlan, setIsGeneratingMonthPlan] = useState(false);
  const [showMonthPlanModal, setShowMonthPlanModal] = useState(false);
  const [generatedMonthPosts, setGeneratedMonthPosts] = useState<CreatedPost[]>([]);

  // Detección 100% Automática de Ubicación y Mercado (Sin selección manual de botones)
  const [detectedLocation, setDetectedLocation] = useState<DetectedMarketInfo>(() => detectUserMarket());

  useEffect(() => {
    setDetectedLocation(detectUserMarket());
  }, []);

  // Filtros de Viralidad, País del Autor y Temporalidad
  const [selectedCountry, setSelectedCountry] = useState<string>("ALL");
  const [datePosted, setDatePosted] = useState<"PAST_MONTH" | "PAST_WEEK" | "PAST_24H" | "ANY">("PAST_MONTH");
  const [viralityTierFilter, setViralityTierFilter] = useState<"all" | "mega" | "high" | "trending">("all");
  const excludeJobs = true;

  // Filtros generales y Modal
  const [selectedFormat, setSelectedFormat] = useState<"all" | PostFormat>("all");
  const [selectedPostForModal, setSelectedPostForModal] = useState<ViralPostTemplate | null>(null);

  // Estados de Traducción de la Publicación (estilo LinkedIn) tanto para Tarjetas del Grid como para Modal
  const [translations, setTranslations] = useState<
    Record<
      string,
      {
        translatedText: string;
        isShowing: boolean;
        isTranslating: boolean;
        error?: string;
      }
    >
  >({});
  const [expandedPosts, setExpandedPosts] = useState<Record<string, boolean>>({});

  // 1. Restaurar estado de búsqueda persistido en la sesión (sessionStorage / localStorage) al montar
  useEffect(() => {
    const cached = getStoredRadarState();
    if (cached) {
      if (Array.isArray(cached.livePosts) && cached.livePosts.length > 0) {
        setLivePosts(cached.livePosts);
        setHasSearchedOnce(true);
      }
      if (cached.searchKeyword) setSearchKeyword(cached.searchKeyword);
      if (cached.lastSuccessfulKeyword) setLastSuccessfulKeyword(cached.lastSuccessfulKeyword);
      if (cached.datePosted) setDatePosted(cached.datePosted);
      if (cached.viralityTierFilter) setViralityTierFilter(cached.viralityTierFilter);
      if (cached.selectedFormat) setSelectedFormat(cached.selectedFormat);
    }
    setIsCacheRestored(true);
  }, []);

  // 2. Sincronizar automáticamente en sesión cada vez que cambien los estados clave
  useEffect(() => {
    if (!isCacheRestored) return;
    saveStoredRadarState({
      searchKeyword,
      lastSuccessfulKeyword,
      livePosts,
      hasSearchedOnce,
      datePosted,
      viralityTierFilter,
      selectedFormat,
    });
  }, [
    isCacheRestored,
    searchKeyword,
    lastSuccessfulKeyword,
    livePosts,
    hasSearchedOnce,
    datePosted,
    viralityTierFilter,
    selectedFormat,
  ]);

  // Cargar cuentas reactivas según el usuario autenticado
  useEffect(() => {
    const syncAccounts = () => {
      const visible = getVisibleAccountsForUser(currentUser);
      const active = getActiveAccountForUser(currentUser);
      const ownAccounts = visible.filter(
        (a) =>
          accountMatchesUser(a, currentUser) ||
          (currentUser.role !== "super_admin" && a.ownerId === currentUser.id)
      );
      const accountsList = ownAccounts.length > 0 ? ownAccounts : visible;
      setAvailableAccounts(accountsList as any);
      if (active) {
        setActiveAccount(active as any);
        setActiveAccountName(active.name);
      }
    };

    syncAccounts();

    fetch("/api/unipile/accounts")
      .then((r) => r.json())
      .then((data) => {
        if (data.isExpired || !data.configured) {
          const visible = getVisibleAccountsForUser(currentUser);
          visible.forEach((acc) => {
            updateStoredAccountStatus(acc.id, "CREDENTIALS");
          });
        } else if (data.accounts && Array.isArray(data.accounts) && data.accounts.length > 0) {
          data.accounts.forEach((remoteAcc: any) => {
            addStoredAccount(remoteAcc);
          });
        }
        syncAccounts();
      })
      .catch(() => {});

    window.addEventListener("storage", syncAccounts);
    window.addEventListener("inhubflow-account-update", syncAccounts);
    return () => {
      window.removeEventListener("storage", syncAccounts);
      window.removeEventListener("inhubflow-account-update", syncAccounts);
    };
  }, [currentUser]);

  // Función de búsqueda en vivo en LinkedIn a través de Unipile (filtrando cirílico, ofertas de empleo y seleccionando el Top 12)
  const handleLiveSearch = useCallback(
    async (
      keywordToSearch?: string,
      accountIdOverride?: string,
      dateOverride?: string,
      marketOverride?: TargetMarket,
      excludeJobsOverride?: boolean,
      countryOverride?: string
    ) => {
      const kw = (keywordToSearch !== undefined ? keywordToSearch : searchKeyword).trim();
      if (!kw) return;

      const targetId = accountIdOverride || activeAccount?.id;
      const targetDate = dateOverride || datePosted;
      const targetMkt = marketOverride || detectedLocation.market;
      const targetCtry = countryOverride !== undefined ? countryOverride : selectedCountry;
      const shouldExcludeJobs =
        excludeJobsOverride !== undefined ? excludeJobsOverride : excludeJobs;

      setIsSearchingLive(true);
      setSearchError(null);

      try {
        const res = await fetch("/api/unipile/posts/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            keywords: kw,
            account_id: targetId,
            limit: 50,
            date_posted: targetDate,
            target_market: targetMkt,
            target_country: targetCtry,
            user_timezone: detectedLocation.timezone,
            user_country: detectedLocation.country,
            filter_zero: true,
            exclude_jobs: shouldExcludeJobs,
            sort_by: "RELEVANCE",
          }),
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || "No se pudieron obtener resultados de LinkedIn.");
        }

        const rawItems: ViralPostTemplate[] = data.items || [];

        const isExcluded = (p: ViralPostTemplate) => {
          const combined = `${p.author || ""} ${p.authorHeadline || ""} ${p.fullContent || ""}`;

          // Descartar posts en cirílico/ruso o alfabetos no occidentales
          if (isNonWestern(combined)) {
            return true;
          }

          // Descartar cuentas institucionales
          if (isExcludedCorporateAuthor(p.author, p.publicIdentifier)) {
            return true;
          }

          // Descartar ofertas y solicitudes de empleo si el filtro está activo
          if (
            shouldExcludeJobs &&
            isJobRelatedPost(p.fullContent || p.hook || "", p.authorHeadline || "")
          ) {
            return true;
          }

          // Descartar spam de servicios freelance, diseñadores de banners y ofertas de cursos
          if (isFreelanceOrServiceSpam(p.fullContent || p.hook || "", p.authorHeadline || "")) {
            return true;
          }

          // Descartar publicaciones fuera de las geografías objetivo (India, Dubái/EAU, Pakistán, etc.)
          if (isNonTargetGeography(p.fullContent || p.hook || "", p.authorHeadline || "")) {
            return true;
          }

          return false;
        };

        const validItems = rawItems.filter((p) => !isExcluded(p));
        // Garantizar estrictamente los top 12 mejores posts ordenados por score
        const top12 = validItems
          .sort((a, b) => (b.viralityScore ?? 0) - (a.viralityScore ?? 0))
          .slice(0, 12);

        setLivePosts(top12);
        setHasSearchedOnce(true);
        setLastSuccessfulKeyword(kw);

        saveStoredRadarState({
          searchKeyword: kw,
          lastSuccessfulKeyword: kw,
          livePosts: top12,
          hasSearchedOnce: true,
          datePosted: targetDate as any,
          viralityTierFilter,
          selectedFormat,
        });

        if (data.accountName) {
          setActiveAccountName(data.accountName);
        }
      } catch (err: any) {
        console.warn("[Radar Live Search Error]:", err);
        let msg = err.message || "Error al conectar con el radar de LinkedIn.";
        if (
          msg.includes("504") ||
          msg.includes("request_timeout") ||
          msg.includes("Request Timeout") ||
          msg.includes("timeout")
        ) {
          msg = "LinkedIn tardó demasiado en responder para esta búsqueda (Timeout temporal). Puedes reintentar ahora con otra palabra clave o ventana temporal.";
        }
        setSearchError(msg);
      } finally {
        setIsSearchingLive(false);
      }
    },
    [searchKeyword, activeAccount?.id, datePosted, detectedLocation, excludeJobs, viralityTierFilter, selectedFormat, selectedCountry]
  );

  // Ejecutar búsqueda inicial en vivo SOLO si ya se verificó el caché Y no existía ninguna búsqueda previa guardada
  useEffect(() => {
    if (isCacheRestored && activeAccount && !hasSearchedOnce && livePosts.length === 0) {
      handleLiveSearch(searchKeyword || "B2B Outbound", undefined, undefined, detectedLocation.market);
    }
  }, [isCacheRestored, activeAccount, hasSearchedOnce, livePosts.length, handleLiveSearch, searchKeyword, detectedLocation.market]);

  // Filtrado reactivo por formato y tier de viralidad (Mega Viral, Alta Tracción, En Tendencia)
  const filteredPosts = useMemo(() => {
    const list = livePosts.filter((post) => {
      const combined = `${post.author || ""} ${post.authorHeadline || ""} ${post.fullContent || ""}`;
      if (isNonWestern(combined)) {
        return false;
      }

      if (isExcludedCorporateAuthor(post.author, post.publicIdentifier)) {
        return false;
      }

      if (
        excludeJobs &&
        isJobRelatedPost(post.fullContent || post.hook || "", post.authorHeadline || "")
      ) {
        return false;
      }

      if (isFreelanceOrServiceSpam(post.fullContent || post.hook || "", post.authorHeadline || "")) {
        return false;
      }

      if (isNonTargetGeography(post.fullContent || post.hook || "", post.authorHeadline || "")) {
        return false;
      }

      const matchesFormat = selectedFormat === "all" || post.format === selectedFormat;

      const matchesTier =
        viralityTierFilter === "all" ||
        post.viralityTier === viralityTierFilter ||
        (viralityTierFilter === "mega" && (post.viralityScore ?? 0) >= 100) ||
        (viralityTierFilter === "high" && (post.viralityScore ?? 0) >= 35 && (post.viralityScore ?? 0) < 100) ||
        (viralityTierFilter === "trending" && (post.viralityScore ?? 0) < 35);

      return matchesFormat && matchesTier;
    });

    // Ordenar de forma descendente por Score de Viralidad (los mejores posts siempre al inicio)
    const sorted = [...list].sort((a, b) => (b.viralityScore ?? 0) - (a.viralityScore ?? 0));

    // Mostrar estrictamente el Top 12 de resultados con mayor impacto
    return sorted.slice(0, 12);
  }, [livePosts, selectedFormat, viralityTierFilter, excludeJobs]);

  const handleModelWithAi = (post: ViralPostTemplate) => {
    setSelectedTemplateForModeling(post);
    if (onTabChange) {
      onTabChange("create");
    } else {
      router.push("/viral-posts/create");
    }
  };

  const getFormatLabel = (fmt: PostFormat) => {
    switch (fmt) {
      case "text":
        return t("formatText");
      case "image":
        return t("formatImage");
      case "video":
        return t("formatVideo");
      case "carousel":
        return t("formatCarousel");
    }
  };

  const handleOpenPostModal = (post: ViralPostTemplate) => {
    setSelectedPostForModal(post);
  };

  const handleClosePostModal = () => {
    setSelectedPostForModal(null);
  };

  const formatScheduleDay = (isoDate: string) => {
    const d = new Date(isoDate);
    const dayNames = ["Dom", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sáb"];
    const monthNames = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
    const dayName = dayNames[d.getDay()] || "Día";
    const dayNumber = d.getDate();
    const monthName = monthNames[d.getMonth()] || "";
    const hours = String(d.getHours()).padStart(2, "0");
    const minutes = String(d.getMinutes()).padStart(2, "0");
    return {
      dayName,
      dayNumber,
      monthName,
      time: `${hours}:${minutes}`,
      fullLabel: `${dayName} ${dayNumber} ${monthName} · ${hours}:${minutes}`,
    };
  };

  // Función auxiliar de adaptación localizada de respaldo de alta fidelidad
  const getLocalizedViralFallback = (rawHook: string, rawContent: string, targetLang: "es" | "pt" | "en") => {
    if (targetLang === "en") {
      return { hook: rawHook, content: rawContent };
    }
    const lower = (rawHook + " " + rawContent).toLowerCase();

    if (lower.includes("ghosting")) {
      return targetLang === "pt"
        ? {
            hook: "Quando foi que o ghosting virou o novo padrão no B2B?",
            content: "Quando foi que o ghosting virou o novo padrão no B2B?\n\nVocê agenda uma reunião, dedica 45 minutos para entender a dor da empresa, envia uma proposta personalizada...\ne a pessoa simplesmente desaparece.\n\nO problema quase nunca é o seu preço. Geralmente é um destes 3 pontos:\n1. Você conversou com o avaliador, não com quem assina o cheque.\n2. Não ficou claro o custo financeiro de não fazer nada.\n3. A proposta atacou uma dor secundária, não uma prioridade da diretoria.\n\nComo você tem lidado com o ghosting no LinkedIn? Conta aqui nos comentários.",
          }
        : {
            hook: "¿Cuándo se normalizó el ghosting en B2B?",
            content: "¿Cuándo se normalizó el ghosting en B2B?\n\nAgendas una llamada, dedicas 45 minutos a analizar su negocio, envías la propuesta personalizada...\ny desaparecen por completo.\n\nEl problema casi nunca es tu precio. El problema suele ser uno de estos 3 puntos:\n1. Hablaste con el evaluador, no con quien firma el cheque.\n2. No cuantificaron juntos el costo de no hacer nada.\n3. Tu propuesta resolvió una molestia menor, no una prioridad de junta directiva.\n\n¿Cómo manejas tú cuando un prospecto deja de responder? Te leo en comentarios.",
          };
    }

    if (lower.includes("cold email") || lower.includes("cold mail")) {
      return targetLang === "pt"
        ? {
            hook: "O cold email não morreu. O que morreu foi disparar mensagens genéricas.",
            content: "O cold email não morreu. O que morreu foi disparar 5.000 mensagens genéricas por dia.\n\nDurante anos, o jogo da prospecção foi puro volume:\n• Comprar lista de 10.000 contatos.\n• Disparar templates copiados.\n• Rezar por 0.5% de resposta.\n\nHoje a nova regra de prospecção B2B é clara:\nRelevância > Volume.\n\n10 mensagens altamente contextualizadas geram mais reuniões qualificadas do que 500 emails em massa.\n\nVocê tem priorizado qualidade ou quantidade este mês?",
          }
        : {
            hook: "El email en frío no ha muerto. Lo que murió fue enviar spam masivo.",
            content: "El email en frío no ha muerto. Lo que murió fue enviar 5.000 correos genéricos al día.\n\nDurante años, el juego de prospección fue volumen puro:\n• Comprar una lista de 10.000 contactos.\n• Disparar plantillas genéricas.\n• Rogar por un 0.5% de respuesta.\n\nHoy los decisores huelen la automatización a kilómetros.\n\nLa nueva regla de prospección B2B:\nRelevancia > Volumen.\n\n10 mensajes contextualizados generan más reuniones cualificadas que 500 emails masivos.\n\n¿Calidad o cantidad en tu estrategia comercial este mes?",
          };
    }

    if (lower.includes("purchased") || lower.includes("bought") || lower.includes("course") || lower.includes("invest")) {
      return targetLang === "pt"
        ? {
            hook: "Investi em mentorias de vendas B2B e isto foi o que realmente funcionou.",
            content: "Investi em consultorias e cursos de vendas B2B no último ano.\n\n80% do que ensinam são hacks passageiros de algoritmo ou scripts robóticos que queimam a sua reputação.\n\nO que realmente fecha contratos de alto ticket:\n• Entender o impacto financeiro real do problema do cliente.\n• Apresentar cases de sucesso com métricas comprovadas.\n• Manter presença consistente compartilhando visão de mercado toda semana.\n\nVendas B2B não são sobre atalhos, são sobre confiança construída publicamente.",
          }
        : {
            hook: "Invertí en consultorías de ventas B2B y esto fue lo que realmente funcionó.",
            content: "Invertí en consultorías y cursos de prospección B2B el año pasado.\n\nEl 80% de lo que enseñan son trucos baratos de 'hackear el algoritmo' o scripts manipuladores que espantan a decisores serios.\n\nLo único que realmente mueve la aguja en ventas complejas:\n• Entender el problema financiero que le quita el sueño al CEO.\n• Compartir casos de estudio con números verificables.\n• Ser implacablemente consistente en compartir perspectiva propia cada semana.\n\nLas ventas B2B no son trucos, son confianza construida en público.",
          };
    }

    if (lower.includes("3 months") || lower.includes("months ago") || lower.includes("meses")) {
      return targetLang === "pt"
        ? {
            hook: "Há 3 meses mudei completamente a nossa estratégia de prospecção.",
            content: "Há 3 meses mudei completamente a nossa estratégia de prospecção no LinkedIn.\n\nParamos de enviar pitch de vendas no primeiro contato de conexão.\nNo lugar disso, implementamos um radar de sinais:\n\n1. Interação prévia com posts do prospect (comentário de alto valor).\n2. Pedido de conexão citando um ponto específico que ele publicou.\n3. Nutrição com conteúdo relevante antes de abrir proposta.\n\nResultado:\nNossa taxa de aceitação subiu de 18% para 44%, e as respostas qualificadas triplicaram.\n\nMenos spam, mais conversas reais de negócios.",
          }
        : {
            hook: "Hace 3 meses cambié por completo nuestra forma de prospectar en LinkedIn.",
            content: "Hace 3 meses cambié por completo nuestra forma de prospectar en LinkedIn.\n\nDejamos de enviar pitches en el primer mensaje de conexión.\nEn su lugar, implementamos un radar de señales:\n\n1. Interacción previa con el contenido del prospecto (dejar un comentario de valor real).\n2. Conexión contextualizada haciendo referencia a una publicación suya reciente.\n3. Esperar a que lean nuestro contenido antes de iniciar conversación comercial.\n\nEl resultado:\nNuestra tasa de aceptación subió del 18% al 44%, y las respuestas positivas se triplicaron.\n\nMenos spam, más conversaciones humanas.",
          };
    }

    if (targetLang === "pt") {
      return {
        hook: `Estratégia prática de Social Selling: ${rawHook.slice(0, 50)}`,
        content: `A maioria dos profissionais comete o erro de forçar um pitch comercial antes de gerar valor real para o decisor.\n\nAqui estão os 3 pilares para gerar demanda qualificada no LinkedIn:\n• 1. Diagnóstico contextual: Nunca apresente soluções sem antes mapear o problema real do cliente.\n• 2. Relevância sobre volume: 10 conversas estratégicas superam 500 abordagens genéricas.\n• 3. Construção de autoridade: Compartilhe aprendizados de bastidores e cases práticos antes de pedir uma reunião.\n\nQual desses três pontos tem sido o seu maior foco este mês? Compartilhe nos comentários.`,
      };
    }

    return {
      hook: `Estrategia práctica de Social Selling: ${rawHook.slice(0, 50)}`,
      content: `La mayoría de las empresas cometen el error de precipitar el pitch comercial antes de entender el contexto real del decisor.\n\nAquí los 3 puntos clave para generar demanda cualificada en LinkedIn:\n• 1. Diagnóstico previo: No presentes una propuesta sin entender el problema real.\n• 2. Relevancia sobre volumen: 10 conversaciones contextualizadas superan a 500 mensajes genéricos.\n• 3. Construcción de confianza: Aporta perspectiva y casos reales antes de pedir una reunión.\n\n¿Cuál de estos tres puntos representa tu mayor desafío actual? Te leo en comentarios.`,
    };
  };

  // Abre el Modal de Configuración Previa del Plan de 1 Mes
  const handleOpenMonthPlanModal = () => {
    if (!filteredPosts || filteredPosts.length === 0) return;
    const active = getActiveAccountForUser(currentUser);
    const targetAcc = active || (availableAccounts.length > 0 ? availableAccounts[0] : null);
    const initialAccId = targetAcc?.id || currentUser?.id || "";
    setMonthPlanTargetAccountId(initialAccId);

    // Prioridad del idioma:
    // 1. Idioma configurado en la cuenta de LinkedIn
    // 2. Idioma de la interfaz del usuario
    const accLang = targetAcc?.targetLanguage || (locale === "pt" ? "pt" : locale === "en" ? "en" : "es");
    setMonthPlanTargetLanguage((accLang as "es" | "pt" | "en") || "es");
    setShowConfigMonthPlanModal(true);
  };

  // Alias para mantener retrocompatibilidad total con invocadores y tests
  const handleGenerateMonthPlan = handleOpenMonthPlanModal;

  // Ejecución definitiva de la programación y adaptación con IA
  const handleExecuteGenerateMonthPlan = async () => {
    if (!filteredPosts || filteredPosts.length === 0) return;
    setIsGeneratingMonthPlan(true);
    setShowConfigMonthPlanModal(false);

    const targetLang = monthPlanTargetLanguage;
    const langLabel = targetLang === "pt" ? "Português" : targetLang === "en" ? "English" : "Español";

    setGeneratingProgress({
      current: 0,
      total: 12,
      message: `Iniciando adaptación de 12 posts al ${langLabel}...`,
    });

    try {
      // 1. Guardar idioma seleccionado en la cuenta si está habilitado
      if (saveLanguageToAccount && monthPlanTargetAccountId) {
        updateAccountLanguage(monthPlanTargetAccountId, targetLang);
      }

      // 2. Obtener exactamente 12 fechas en días Lun, Mié y Vie de las próximas 4 semanas
      const dates = generateMonthScheduleDates(new Date());

      // 3. Tomar los mejores posts virales (o ciclar sobre el Top 12)
      const targetSourcePosts: ViralPostTemplate[] = [];
      for (let i = 0; i < 12; i++) {
        targetSourcePosts.push(filteredPosts[i % filteredPosts.length]);
      }

      const activeAcc = getActiveAccountForUser(currentUser);
      const targetAccountId = monthPlanTargetAccountId || activeAcc?.id || currentUser?.id;

      // 4. Adaptar y traducir cada post viral con IA
      const newScheduledPosts: CreatedPost[] = [];

      for (let i = 0; i < targetSourcePosts.length; i++) {
        const sourcePost = targetSourcePosts[i];
        const scheduledDate = dates[i];

        setGeneratingProgress({
          current: i + 1,
          total: 12,
          message: `Adaptando post ${i + 1} de 12 al ${langLabel} con IA...`,
        });

        const rawHook = sourcePost.hook?.replace(/:$/, "").trim() || sourcePost.topic || "Estrategia B2B en LinkedIn";
        let rawContent = "";
        if (sourcePost.fullContent && sourcePost.fullContent.length > 120) {
          rawContent = sourcePost.fullContent;
        } else {
          rawContent = `${rawHook}\n\nLa mayoría de las empresas B2B cometen el error de precipitar el pitch comercial antes de entender el contexto real del decisor.\n\nAquí los 3 puntos clave para generar demanda cualificada:\n• 1. Diagnóstico previo: No presentes una propuesta sin entender el problema real.\n• 2. Relevancia sobre volumen: 10 conversaciones contextualizadas superan a 500 mensajes genéricos.\n• 3. Construcción de confianza: Aporta perspectiva y casos reales antes de pedir una reunión.\n\n¿Cuál de estos tres puntos representa tu mayor desafío actual? Te leo en comentarios.`;
        }

        let translatedHook = rawHook;
        let translatedContent = rawContent;

        const isAlreadyTarget =
          (targetLang === "en" && (sourcePost.detectedLanguage === "en" || !sourcePost.detectedLanguage)) ||
          (targetLang === "es" && sourcePost.detectedLanguage === "es") ||
          (targetLang === "pt" && sourcePost.detectedLanguage === "pt");

        if (!isAlreadyTarget) {
          try {
            const promptText = `HOOK: ${rawHook}\n\nCONTENT:\n${rawContent}`;
            const res = await fetch("/api/ai/translate", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                text: promptText,
                targetLanguage: targetLang,
              }),
            });

            if (res.ok) {
              const data = await res.json();
              if (data.translatedText) {
                const text = data.translatedText;
                if (text.includes("HOOK:") && text.includes("CONTENT:")) {
                  const afterHook = text.split("HOOK:")[1] || "";
                  const parts = afterHook.split("CONTENT:");
                  translatedHook = parts[0]?.trim() || rawHook;
                  translatedContent = parts[1]?.trim() || text;
                } else {
                  translatedContent = text.trim();
                  const firstLine = translatedContent.split("\n")[0].trim();
                  if (firstLine.length > 5) translatedHook = firstLine;
                }
              } else {
                const fb = getLocalizedViralFallback(rawHook, rawContent, targetLang);
                translatedHook = fb.hook;
                translatedContent = fb.content;
              }
            } else {
              const fb = getLocalizedViralFallback(rawHook, rawContent, targetLang);
              translatedHook = fb.hook;
              translatedContent = fb.content;
            }
          } catch (e) {
            const fb = getLocalizedViralFallback(rawHook, rawContent, targetLang);
            translatedHook = fb.hook;
            translatedContent = fb.content;
          }
        } else if (targetLang !== "en" && (!sourcePost.detectedLanguage || sourcePost.detectedLanguage === "en")) {
          const fb = getLocalizedViralFallback(rawHook, rawContent, targetLang);
          translatedHook = fb.hook;
          translatedContent = fb.content;
        }

        const title = translatedHook.replace(/^["'«»]|["'«»]$/g, "").slice(0, 75);

        const post: CreatedPost = {
          id: `scheduled-month-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 6)}`,
          title,
          format: "text",
          content: translatedContent,
          sourceMode: "viral",
          status: "scheduled",
          scheduledAt: scheduledDate.toISOString(),
          createdAt: new Date().toISOString(),
          targetAccountId,
          targetLanguage: targetLang,
        };

        newScheduledPosts.push(post);
      }

      // 5. Guardar los 12 posts en el almacenamiento persistente
      addBatchCreatedPosts(newScheduledPosts);
      setGeneratedMonthPosts(newScheduledPosts);
      setShowMonthPlanModal(true);
    } catch (err) {
      console.error("[Generate Month Plan Error]:", err);
    } finally {
      setIsGeneratingMonthPlan(false);
      setGeneratingProgress(null);
    }
  };

  const handleTogglePostTranslation = async (post: ViralPostTemplate) => {
    if (!post) return;
    const current = translations[post.id];
    if (current?.isTranslating) return;

    if (current?.isShowing) {
      setTranslations((prev) => ({
        ...prev,
        [post.id]: { ...prev[post.id], isShowing: false, error: undefined },
      }));
      return;
    }

    if (current?.translatedText) {
      setTranslations((prev) => ({
        ...prev,
        [post.id]: { ...prev[post.id], isShowing: true, error: undefined },
      }));
      return;
    }

    setTranslations((prev) => ({
      ...prev,
      [post.id]: {
        translatedText: "",
        isShowing: false,
        isTranslating: true,
        error: undefined,
      },
    }));

    try {
      const res = await fetch("/api/ai/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: post.fullContent || post.hook,
          targetLanguage: locale || "es",
        }),
      });

      const data = await res.json();
      if (res.ok && data.translatedText) {
        setTranslations((prev) => ({
          ...prev,
          [post.id]: {
            translatedText: data.translatedText,
            isShowing: true,
            isTranslating: false,
          },
        }));
      } else {
        setTranslations((prev) => ({
          ...prev,
          [post.id]: {
            translatedText: "",
            isShowing: false,
            isTranslating: false,
            error: data.error || "No se pudo traducir",
          },
        }));
      }
    } catch (err: any) {
      setTranslations((prev) => ({
        ...prev,
        [post.id]: {
          translatedText: "",
          isShowing: false,
          isTranslating: false,
          error: err.message || "Error al conectar con el traductor",
        },
      }));
    }
  };

  const quickSearchTags = [
    "Social Selling",
    "B2B Outbound",
    "Inteligencia Artificial",
    "Lead Generation",
    "SaaS Growth",
    "Cold Email",
  ];

  const currentDisplayName = activeAccountName || activeAccount?.name || currentUser.name || "InHubFlow Creator";

  return (
    <div className="w-full space-y-6">
      {!hideBreadcrumb && <PageBreadcrumb pageTitle={t("pageTitle")} />}


      {/* Panel de Control de Búsqueda y Parámetros */}
      <ComponentCard
        title={t("cardTitle")}
        desc={t("cardDesc", { name: currentDisplayName })}
      >
        <div className="space-y-4">
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={searchKeyword}
                  onChange={(e) => setSearchKeyword(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleLiveSearch()}
                  placeholder={t("searchPlaceholder")}
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:border-brand-500 focus:outline-hidden dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                />
              </div>
              <button
                type="button"
                disabled={isSearchingLive}
                onClick={() => handleLiveSearch()}
                className="rounded-lg bg-brand-500 px-5 py-2.5 text-xs font-semibold text-white hover:bg-brand-600 disabled:opacity-50 transition flex items-center justify-center gap-2 shrink-0"
              >
                {isSearchingLive ? (
                  <>
                    <span className="h-3.5 w-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin"></span>
                    {t("scanning")}
                  </>
                ) : (
                  t("searchBtn")
                )}
              </button>
            </div>

            {/* Tags de búsqueda rápida */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="text-xs font-medium text-gray-400 mr-1">{t("suggestions")}</span>
              {quickSearchTags.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => {
                    setSearchKeyword(tag);
                  }}
                  className={`rounded-lg px-2.5 py-1 text-xs font-medium border transition ${
                    searchKeyword === tag
                      ? "border-brand-500 bg-brand-50 text-brand-600 dark:bg-brand-950 dark:text-brand-300"
                      : "border-gray-200 bg-white text-gray-600 hover:border-gray-300 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300"
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>

            {/* Controles de Búsqueda: Temporalidad & Detección Automática de Mercado */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-gray-300 dark:border-gray-800 text-xs">
              {/* Ventana Temporal */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-gray-500 dark:text-gray-400">{t("timeWindow")}</span>
                <div className="inline-flex rounded-lg border border-gray-300 dark:border-gray-800 p-0.5 bg-gray-50 dark:bg-gray-900">
                  {[
                    { id: "PAST_MONTH", label: t("pastMonth") },
                    { id: "PAST_WEEK", label: t("pastWeek") },
                    { id: "PAST_24H", label: t("past24h") },
                    { id: "ANY", label: t("allTime") },
                  ].map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => {
                        setDatePosted(opt.id as any);
                        handleLiveSearch(searchKeyword, undefined, opt.id);
                      }}
                      className={`px-2.5 py-1 text-xs font-medium rounded-lg transition ${
                        datePosted === opt.id
                          ? "bg-white text-brand-600 font-bold shadow-xs dark:bg-gray-800 dark:text-brand-400"
                          : "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Filtro por País del Creador (Verificación Real de Ubicación del Perfil) */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-gray-500 dark:text-gray-400 flex items-center gap-1">
                  <Globe className="size-3.5 text-[#0099ff]" />
                  País del Autor:
                </span>
                <select
                  value={selectedCountry}
                  onChange={(e) => {
                    const country = e.target.value;
                    setSelectedCountry(country);
                    handleLiveSearch(searchKeyword, undefined, undefined, undefined, undefined, country);
                  }}
                  className="h-8 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-2.5 text-xs font-semibold text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-[#0099ff] cursor-pointer"
                  title="Filtrar por ubicación geográfica real del autor"
                >
                  <option value="ALL">🌐 Todos los países / Global</option>
                  <option value="BR">🇧🇷 Brasil</option>
                  <option value="US">🇺🇸 Estados Unidos</option>
                  <option value="ES">🇪🇸 España</option>
                  <option value="MX">🇲🇽 México</option>
                  <option value="CO">🇨🇴 Colombia</option>
                  <option value="AR">🇦🇷 Argentina</option>
                  <option value="CL">🇨🇱 Chile</option>
                  <option value="PE">🇵🇪 Perú</option>
                  <option value="PA">🇵🇦 Panamá</option>
                  <option value="PT">🇵🇹 Portugal</option>
                  <option value="GB">🇬🇧 Reino Unido</option>
                  <option value="AU">🇦🇺 Australia</option>
                </select>
              </div>

            </div>
          </div>

          {/* Filtros por Nivel de Viralidad y Formato */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-gray-300 dark:border-gray-800">
            {/* Nivel de Viralidad */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 mr-1">{t("viralityLevelLabel")}</span>
              {[
                { id: "all", label: t("tierAllTop") },
                { id: "mega", label: t("tierMegaBadge") },
                { id: "high", label: t("tierHighBadge") },
                { id: "trending", label: t("tierTrendingBadge") },
              ].map((tier) => (
                <button
                  key={tier.id}
                  type="button"
                  onClick={() => setViralityTierFilter(tier.id as any)}
                  className={`rounded-lg px-2.5 py-1 text-xs font-medium transition ${
                    viralityTierFilter === tier.id
                      ? "bg-brand-500 text-white shadow-xs font-semibold"
                      : "border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300"
                  }`}
                >
                  {tier.label}
                </button>
              ))}
            </div>

            {/* Formato */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 mr-1">{t("formatLabel")}</span>
              {[
                { id: "all", label: t("formatAllCount", { count: filteredPosts.length }) },
                { id: "text", label: t("formatText") },
                { id: "image", label: t("formatImage") },
                { id: "video", label: t("formatVideo") },
                { id: "carousel", label: t("formatCarousel") },
              ].map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setSelectedFormat(f.id as "all" | PostFormat)}
                  className={`rounded-lg px-2.5 py-1 text-xs font-medium transition ${
                    selectedFormat === f.id
                      ? "bg-gray-900 text-white dark:bg-white dark:text-gray-900 shadow-xs font-bold"
                      : "border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {searchError && (
            <div className="rounded-lg bg-amber-50 p-3 text-xs text-amber-800 border border-amber-200 dark:bg-amber-950/30 dark:border-amber-900/50 dark:text-amber-300 flex items-center justify-between">
              <span>{searchError}</span>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => handleLiveSearch(searchKeyword)}
                  className="font-semibold text-brand-600 hover:underline"
                >{t("retryBtn")}</button>
              </div>
            </div>
          )}
        </div>
      </ComponentCard>

      {/* Listado de Tarjetas */}
      <div>
        <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3 flex-wrap">
            <h3 className="text-base font-semibold text-gray-800 dark:text-white/90">
              {t("sectionTitle", { count: filteredPosts.length })}
            </h3>
            {livePosts.length > 0 && (
              <button
                type="button"
                onClick={() => handleLiveSearch(lastSuccessfulKeyword || searchKeyword)}
                disabled={isSearchingLive}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-gray-600 dark:text-gray-300 hover:text-brand-600 dark:hover:text-brand-400 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 transition"
                title={t("refreshTooltip")}
              >
                <svg
                  className={`w-3.5 h-3.5 ${isSearchingLive ? "animate-spin text-brand-500" : ""}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                {isSearchingLive ? t("refreshing") : t("refreshBtn")}
              </button>
            )}
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {/* Botón 1-Clic: Crear Contenido para 1 Mes (12 Posts) */}
            {filteredPosts.length > 0 && (
              <button
                type="button"
                onClick={handleGenerateMonthPlan}
                disabled={isGeneratingMonthPlan}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#0099ff] to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/25 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
              >
                <Sparkles className={`size-4 ${isGeneratingMonthPlan ? "animate-spin" : "text-amber-300"}`} />
                <span>{isGeneratingMonthPlan ? "Programando 12 posts..." : "Crear Contenido para 1 Mes (12 Posts)"}</span>
                <span className="hidden md:inline-block text-[10px] bg-white/20 px-2 py-0.5 rounded-full font-semibold">
                  Lun · Mié · Vie (4 sem.)
                </span>
              </button>
            )}

            <span className="text-xs text-gray-500 dark:text-gray-400">
              {searchError && lastSuccessfulKeyword !== searchKeyword
                ? t("showingRetryPending", { last: lastSuccessfulKeyword, current: searchKeyword })
                : t("showingKeyword", { kw: lastSuccessfulKeyword || searchKeyword })}
            </span>
          </div>
        </div>

        {/* Banner explicativo cuando opera en modo local / simulación */}
        {!isSearchingLive && filteredPosts.length > 0 && !filteredPosts.some((p) => p.isLive) && (
          <div className="mb-4 flex items-center justify-between gap-3 rounded-lg border border-amber-300/80 bg-amber-50/90 dark:border-amber-900/60 dark:bg-amber-950/40 px-4 py-2.5 text-xs text-amber-900 dark:text-amber-200">
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 rounded-full bg-amber-500 animate-pulse shrink-0" />
              <span>
                <strong>Modo Simulación Local Activo:</strong> La API de LinkedIn (Unipile) no está conectada en este entorno (error 401). Estás visualizando plantillas modeladas de alta conversión. Cuando conectas tu cuenta de LinkedIn en vivo (como en Hostinger), el radar extrae las publicaciones 100% reales de LinkedIn con sus fotos de perfil originales, métricas en vivo y enlaces directos a cada post.
              </span>
            </div>
          </div>
        )}

        {isSearchingLive ? (
          <div className="py-16 text-center space-y-3 bg-white rounded-lg border border-gray-300 dark:bg-gray-900 dark:border-gray-800">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent"></div>
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              {t("scanningFull")}
            </p>
            <p className="text-xs text-gray-400">
              {t("scanningFullDesc")}
            </p>
          </div>
        ) : filteredPosts.length === 0 ? (
          <div className="py-16 text-center space-y-3 bg-white rounded-lg border border-gray-300 dark:bg-gray-900 dark:border-gray-800 p-6">
            <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
              {t("noPostsFound")}
            </p>
            <div className="space-y-2">
              <p className="text-xs text-gray-400">
                {t("noPostsFoundHelp")}
              </p>
              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setViralityTierFilter("all");
                    setSelectedFormat("all");
                    setDatePosted("PAST_MONTH");
                    handleLiveSearch(searchKeyword, undefined, "PAST_MONTH");
                  }}
                  className="rounded-lg border border-gray-300 px-3.5 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300"
                >{t("resetFiltersBtn")}</button>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
            {filteredPosts.map((post) => (
              <div
                key={post.id}
                className="flex flex-col justify-between rounded-lg border border-gray-300 bg-white p-5 shadow-theme-xs hover:border-brand-500/60 transition dark:border-gray-800 dark:bg-gray-900/60"
              >
                <div>
                  {/* Encabezado: Autor y Badges */}
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2.5 min-w-0 pr-2">
                      {post.authorAvatar ? (
                        <img
                          src={post.authorAvatar}
                          alt={post.author}
                          className="h-10 w-10 rounded-full object-cover shrink-0 border border-gray-300 dark:border-gray-700"
                          onError={(e) => {
                            (e.currentTarget as HTMLElement).style.display = "none";
                          }}
                        />
                      ) : (
                        <div className="h-10 w-10 rounded-full bg-brand-500/10 text-brand-600 dark:bg-brand-500/20 dark:text-brand-300 font-bold text-xs flex items-center justify-center shrink-0">
                          {post.author.slice(0, 2).toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <h4 className="font-semibold text-gray-900 dark:text-white text-sm truncate">
                            {post.author}
                          </h4>
                          {post.isLive ? (
                            <span className="rounded-md bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900 shrink-0">
                              ● EN VIVO
                            </span>
                          ) : (
                            <span className="rounded-md bg-amber-50 px-1.5 py-0.5 text-[10px] font-bold text-amber-700 dark:bg-amber-950 dark:text-amber-300 border border-amber-200 dark:border-amber-900 shrink-0" title="Plantilla de inspiración simulada (modo local)">
                              SIMULADO
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
                          {post.authorHeadline}
                        </p>
                        <span className="text-xs text-gray-400 block mt-0.5">
                          {post.publishedDate} • {post.topic}
                        </span>
                      </div>
                    </div>

                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-semibold shrink-0 border ${
                        post.format === "carousel"
                          ? "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800"
                          : post.format === "video"
                          ? "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800"
                          : post.format === "image"
                          ? "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800"
                          : "bg-gray-100 text-gray-700 border border-gray-300 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700"
                      }`}
                    >
                      {getFormatLabel(post.format)}
                    </span>
                  </div>

                  {/* Fila de Viralidad: Badge & Score & Origen de Mercado */}
                  <div className="mb-3 flex items-center justify-between gap-1 flex-wrap">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span
                        className={`inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-xs font-bold ${
                          post.viralityTier === "mega"
                            ? "bg-purple-100 text-purple-700 dark:bg-purple-950/80 dark:text-purple-300 border border-purple-300 dark:border-purple-800"
                            : post.viralityTier === "high"
                            ? "bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-300 dark:border-amber-800"
                            : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800"
                        }`}
                      >
                        {post.viralityBadge || (
                          post.viralityTier === "mega"
                            ? "Mega Viral 🔥🔥🔥"
                            : post.viralityTier === "high"
                            ? "Alta Tracción 🔥🔥"
                            : "En Tendencia 🔥"
                        )}
                      </span>
                      {post.viralityScore !== undefined && (
                        <span className="rounded-lg bg-gray-100 px-1.5 py-0.5 text-xs font-semibold text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                          {t("scorePts", { score: post.viralityScore })}
                        </span>
                      )}
                      {(post.authorLocation || post.marketOrigin) && (
                        <span
                          className="inline-flex items-center gap-1 rounded-lg bg-blue-50 px-1.5 py-0.5 text-xs font-semibold text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-900/50"
                          title={`Ubicación verificada del perfil en LinkedIn: ${post.authorLocation || post.marketOrigin}`}
                        >
                          <MapPin className="w-2.5 h-2.5 text-blue-500 shrink-0" />
                          <span className="truncate max-w-[130px]">{post.authorLocation || post.marketOrigin}</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Cuerpo del Post con formato fiel a LinkedIn y Enlace Traducir */}
                  <div className="mb-3">
                    <div className="text-sm leading-relaxed text-gray-800 dark:text-gray-200 font-sans whitespace-pre-wrap select-text">
                      {translations[post.id]?.isShowing && translations[post.id]?.translatedText
                        ? (expandedPosts[post.id]
                            ? translations[post.id].translatedText
                            : translations[post.id].translatedText.slice(0, 240) + (translations[post.id].translatedText.length > 240 ? "..." : ""))
                        : (expandedPosts[post.id]
                            ? (post.fullContent || post.hook)
                            : (post.fullContent || post.hook).slice(0, 240) + ((post.fullContent || post.hook).length > 240 ? "..." : ""))}
                    </div>

                    {/* Botón ...ver más / ver menos si el texto es extenso */}
                    {(post.fullContent || post.hook).length > 240 && (
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedPosts((prev) => ({
                            ...prev,
                            [post.id]: !prev[post.id],
                          }))
                        }
                        className="text-xs font-semibold text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 mt-1 cursor-pointer"
                      >
                        {expandedPosts[post.id] ? t("seeLess") : t("seeMore")}
                      </button>
                    )}

                    {/* Enlace de Traducción interactivo estilo LinkedIn ("Traducir" / "Ver original") */}
                    <div className="mt-2.5 flex items-center gap-2">
                      <button
                        type="button"
                        disabled={translations[post.id]?.isTranslating}
                        onClick={() => handleTogglePostTranslation(post)}
                        className="text-xs font-semibold text-[#0a66c2] hover:underline cursor-pointer flex items-center gap-1.5 transition disabled:opacity-50"
                      >
                        {translations[post.id]?.isTranslating ? (
                          <>
                            <span className="h-3 w-3 border-2 border-[#0a66c2]/40 border-t-[#0a66c2] rounded-full animate-spin"></span>
                            <span>
                              {locale === "pt-BR"
                                ? "Traduzindo..."
                                : locale === "en"
                                ? "Translating..."
                                : "Traduciendo..."}
                            </span>
                          </>
                        ) : translations[post.id]?.isShowing ? (
                          <span>
                            {locale === "pt-BR"
                              ? "Ver original"
                              : locale === "en"
                              ? "See original"
                              : "Ver original"}
                          </span>
                        ) : (
                          <span>
                            {locale === "pt-BR"
                              ? "Traduzir"
                              : locale === "en"
                              ? "Translate"
                              : "Traducir"}
                          </span>
                        )}
                      </button>

                      {translations[post.id]?.isShowing && (
                        <span className="text-xs text-gray-400 dark:text-gray-500">
                          •{" "}
                          {locale === "pt-BR"
                            ? "Traduzido para português"
                            : locale === "en"
                            ? "Translated to English"
                            : "Traducido al español"}
                        </span>
                      )}

                      {translations[post.id]?.error && (
                        <span className="text-xs text-rose-500">
                          ({translations[post.id].error})
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Vista previa: Para Carruseles renderizamos una portada de presentación PDF estilo LinkedIn, para imágenes la fotografía, y para videos la miniatura */}
                  {post.format === "carousel" ? (
                    <div
                      className="relative mb-4 h-32 sm:h-36 w-full overflow-hidden rounded-lg bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 p-3 text-white border border-slate-700/80 shadow-inner flex flex-col justify-between group cursor-pointer"
                      onClick={() => setSelectedPostForModal(post)}
                      title="Haz clic para ver todas las diapositivas del carrusel"
                    >
                      {/* Fondo decorativo con brillo sutil */}
                      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-brand-500/15 via-transparent to-transparent pointer-events-none" />

                      {/* Barra superior de documento estilo LinkedIn */}
                      <div className="relative z-10 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5 text-brand-300 font-semibold tracking-wide">
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          <span className="uppercase text-[10px] font-bold">PDF • {post.carouselSlides?.length || 5} DIAPOSITIVAS</span>
                        </div>
                        <span className="rounded-md bg-white/10 px-2 py-0.5 text-[10px] font-mono font-medium text-slate-300 backdrop-blur-xs">
                          1 / {post.carouselSlides?.length || 5}
                        </span>
                      </div>

                      {/* Título y subtítulo de la portada */}
                      <div className="relative z-10 my-auto py-1">
                        <p className="text-xs sm:text-sm font-bold text-white line-clamp-2 leading-snug drop-shadow-xs">
                          {post.carouselSlides?.[0]?.title || post.hook}
                        </p>
                        {post.carouselSlides?.[0]?.subtitle && (
                          <p className="text-[11px] text-brand-300/90 line-clamp-1 mt-0.5 font-medium">
                            {post.carouselSlides[0].subtitle}
                          </p>
                        )}
                      </div>

                      {/* Barra inferior: creador y llamado a deslizar */}
                      <div className="relative z-10 flex items-center justify-between text-[10px] text-slate-400 border-t border-white/10 pt-1.5">
                        <span className="truncate max-w-[65%] font-medium text-slate-300">
                          Por {post.author}
                        </span>
                        <span className="flex items-center gap-1 font-semibold text-brand-400 group-hover:translate-x-0.5 transition-transform">
                          Ver diapositivas ➔
                        </span>
                      </div>

                      {/* Efecto de hojas apiladas a la derecha */}
                      <div className="absolute right-0 top-2 bottom-2 w-1 rounded-r-md bg-white/20" />
                      <div className="absolute right-1 top-3 bottom-3 w-1 rounded-r-md bg-white/10" />
                    </div>
                  ) : (post.mediaUrl || post.format === "image" || post.format === "video") ? (
                    <div className="relative mb-4 h-32 sm:h-36 w-full overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-800/80 border border-gray-300 dark:border-gray-800 group">
                      {post.mediaUrl ? (
                        <img
                          src={post.mediaUrl}
                          alt={post.hook || "Recurso visual"}
                          loading="lazy"
                          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                          onError={(e) => {
                            (e.currentTarget as HTMLElement).style.display = "none";
                            const fallback = e.currentTarget.parentElement?.querySelector(".media-fallback");
                            if (fallback) (fallback as HTMLElement).style.display = "flex";
                          }}
                        />
                      ) : null}

                      {/* Fallback visual estilizado */}
                      <div
                        className={`media-fallback h-full w-full ${post.mediaUrl ? "hidden" : "flex"} flex-col items-center justify-center p-3 text-center bg-gradient-to-br from-amber-500/10 via-brand-500/15 to-rose-500/10 border-amber-500/20`}
                      >
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white shadow-xs dark:bg-gray-800 mb-1 text-brand-600 dark:text-brand-400">
                          {post.format === "video" ? (
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          ) : (
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          )}
                        </div>
                        <span className="text-xs font-semibold text-gray-700 dark:text-gray-200">
                          {post.format === "video" ? "Video de LinkedIn" : "Publicación con Imagen"}
                        </span>
                        {post.imagePrompt && (
                          <span className="text-xs text-gray-400 line-clamp-1 mt-0.5 max-w-[90%]">
                            {post.imagePrompt}
                          </span>
                        )}
                      </div>

                      {/* Etiqueta flotante inferior para confirmar que tiene imagen o video */}
                      <div className="absolute bottom-2 left-2 flex items-center gap-1.5 pointer-events-none">
                        <span className="inline-flex items-center gap-1 rounded-lg bg-black/65 backdrop-blur-xs px-2 py-0.5 text-xs font-bold text-white shadow-xs">
                          {post.format === "video" ? "Video adjunto" : "Imagen adjunta"}
                        </span>
                      </div>
                    </div>
                  ) : null}

                  {/* Métricas Públicas de LinkedIn: Likes, Comentarios, Reposts */}
                  <div className="mb-5 grid grid-cols-3 gap-2 border-y border-gray-300 py-2.5 text-center dark:border-gray-800">
                    <div>
                      <span className="block text-xs leading-5 font-normal tracking-normal text-gray-400 uppercase">{t("likes")}</span>
                      <span className="text-xs font-bold text-gray-800 dark:text-white">
                        {post.likes.toLocaleString()}
                      </span>
                    </div>
                    <div className="rounded-lg bg-brand-50/50 py-0.5 dark:bg-brand-950/20">
                      <span className="block text-xs leading-5 font-normal tracking-normal text-gray-400 uppercase">{t("comments")}</span>
                      <span className="text-xs font-bold text-brand-600 dark:text-brand-400">
                        {post.comments.toLocaleString()}
                      </span>
                    </div>
                    <div>
                      <span className="block text-xs leading-5 font-normal tracking-normal text-gray-400 uppercase">{t("reposts")}</span>
                      <span className="text-xs font-bold text-gray-800 dark:text-white">
                        {post.shares.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-gray-300 dark:border-gray-800">
                  <button
                    type="button"
                    onClick={() => handleOpenPostModal(post)}
                    className="rounded-lg border border-gray-300 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/5"
                  >{t("fullReading")}</button>
                  <button
                    type="button"
                    onClick={() => {
                      const contentToModel =
                        translations[post.id]?.isShowing && translations[post.id]?.translatedText
                          ? { ...post, fullContent: translations[post.id].translatedText }
                          : post;
                      handleModelWithAi(contentToModel);
                    }}
                    className="flex-1 rounded-lg bg-brand-500 py-2 text-center text-xs font-semibold text-white hover:bg-brand-600 transition shadow-xs"
                  >
                    {t("modelWithAi")}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal de Lectura Completa con Estructura Fiel a LinkedIn */}
      {selectedPostForModal && (
        <div className="fixed inset-0 z-99999 flex items-center justify-center bg-black/60 p-3 sm:p-4 backdrop-blur-xs">
          <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto custom-scrollbar rounded-lg bg-gray-50 dark:bg-gray-950 p-4 sm:p-6 shadow-theme-xl border border-gray-300 dark:border-gray-800">
            {/* Barra Superior de Metadatos y Cierre */}
            <div className="flex items-center justify-between gap-3 border-b border-gray-300 dark:border-gray-800 pb-3 mb-4">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="rounded-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-800 px-2.5 py-0.5 text-xs font-semibold text-gray-800 dark:text-gray-200 shadow-xs">
                  {getFormatLabel(selectedPostForModal.format)}
                </span>
                {selectedPostForModal.viralityBadge && (
                  <span
                    className={`rounded-lg px-2 py-0.5 text-xs font-bold ${
                      selectedPostForModal.viralityTier === "mega"
                        ? "bg-purple-100 text-purple-700 dark:bg-purple-950/80 dark:text-purple-300 border border-purple-300 dark:border-purple-800"
                        : selectedPostForModal.viralityTier === "high"
                        ? "bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-300 dark:border-amber-800"
                        : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800"
                    }`}
                  >
                    {selectedPostForModal.viralityBadge || (
                      selectedPostForModal.viralityTier === "mega"
                        ? "Mega Viral 🔥🔥🔥"
                        : selectedPostForModal.viralityTier === "high"
                        ? "Alta Tracción 🔥🔥"
                        : "En Tendencia 🔥"
                    )}
                  </span>
                )}
                {selectedPostForModal.viralityScore !== undefined && (
                  <span className="rounded-lg bg-gray-200/70 dark:bg-gray-800 px-2 py-0.5 text-xs font-semibold text-gray-700 dark:text-gray-300">
                    {t("scorePts", { score: selectedPostForModal.viralityScore })}
                  </span>
                )}
                {selectedPostForModal.marketOrigin && (
                  <span className="inline-flex items-center gap-1 rounded-lg bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-900/50">
                    <svg className="w-3 h-3 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    {selectedPostForModal.marketOrigin}
                  </span>
                )}
                {selectedPostForModal.isLive && (
                  <span className="rounded-lg bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900">
                    {t("liveBadge")}
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={handleClosePostModal}
                className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-800 text-xs font-bold transition shrink-0"
              >
                {t("closeModal")}
              </button>
            </div>

            {/* Tarjeta con Estructura Fiel a una Publicación de LinkedIn */}
            <div className="rounded-lg border border-gray-300 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm overflow-hidden mb-4">
              {/* Encabezado del Autor (Avatar + Nombre {t("followAuthor")} + Titular + Tiempo) */}
              <div className="p-4 flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  {selectedPostForModal.authorAvatar ? (
                    <img
                      src={selectedPostForModal.authorAvatar}
                      alt={selectedPostForModal.author}
                      className="h-12 w-12 rounded-full object-cover shrink-0 border border-gray-300 dark:border-gray-700"
                      onError={(e) => {
                        (e.currentTarget as HTMLElement).style.display = "none";
                      }}
                    />
                  ) : (
                    <div className="h-12 w-12 rounded-full bg-gradient-to-br from-brand-500 to-purple-600 text-white font-bold text-sm flex items-center justify-center shrink-0 shadow-xs">
                      {selectedPostForModal.author.slice(0, 2).toUpperCase()}
                    </div>
                  )}

                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h3 className="text-sm font-bold text-gray-900 dark:text-white hover:underline cursor-pointer">
                        {selectedPostForModal.author}
                      </h3>
                      <span className="text-[#0a66c2] text-xs font-semibold hover:underline cursor-pointer flex items-center gap-0.5">
                        + Seguir
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1 mt-0.5">
                      {selectedPostForModal.authorHeadline}
                    </p>
                    <div className="flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500 mt-0.5 flex-wrap">
                      <span>{selectedPostForModal.publishedDate}</span>
                      <span>•</span>
                      <svg className="w-3 h-3 text-gray-400 fill-current inline" viewBox="0 0 16 16">
                        <path d="M8 0a8 8 0 1 0 0 16A8 8 0 0 0 8 0ZM4.88 5.75A5.72 5.72 0 0 1 8 4.75c1.17 0 2.25.35 3.12 1L9.75 7.12A3.24 3.24 0 0 0 8 6.75c-.64 0-1.24.19-1.75.52L4.88 5.75Zm6.24 4.5A5.72 5.72 0 0 1 8 11.25a5.72 5.72 0 0 1-3.12-1l1.37-1.37c.51.33 1.11.52 1.75.52.64 0 1.24-.19 1.75-.52l1.37 1.37Z" />
                      </svg>
                      <span>•</span>
                      <a
                        href={
                          selectedPostForModal.linkedinUrl ||
                          (selectedPostForModal.socialId
                            ? `https://www.linkedin.com/feed/update/${selectedPostForModal.socialId}`
                            : `https://www.linkedin.com/search/results/content/?keywords=${encodeURIComponent(
                                selectedPostForModal.hook?.replace(/:$/, "").slice(0, 90) || selectedPostForModal.topic
                              )}`)
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#0a66c2] hover:text-[#004182] dark:text-sky-400 dark:hover:text-sky-300 hover:underline transition"
                        title={
                          selectedPostForModal.isLive
                            ? "Abrir publicación real en LinkedIn"
                            : "Buscar esta temática en LinkedIn (Plantilla local)"
                        }
                      >
                        <svg className="w-3 h-3 fill-current shrink-0" viewBox="0 0 24 24">
                          <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 10.9h2.77v8.37H6.46v-8.37M7.85 6.6a1.6 1.6 0 1 0 0 3.2 1.6 1.6 0 0 0 0-3.2z" />
                        </svg>
                        <span>
                          {selectedPostForModal.isLive
                            ? "Ver en LinkedIn ↗"
                            : "Buscar temática en LinkedIn ↗"}
                        </span>
                      </a>
                    </div>
                  </div>
                </div>

                <div className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1 cursor-pointer">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <circle cx="5" cy="12" r="2" />
                    <circle cx="12" cy="12" r="2" />
                    <circle cx="19" cy="12" r="2" />
                  </svg>
                </div>
              </div>

              {/* Texto de la Publicación (Primero el Texto, formato natural de LinkedIn) */}
              <div className="px-4 pb-3">
                <div className="text-[14px] leading-relaxed text-gray-900 dark:text-gray-100 font-sans whitespace-pre-wrap select-text">
                  {translations[selectedPostForModal.id]?.isShowing &&
                  translations[selectedPostForModal.id]?.translatedText
                    ? translations[selectedPostForModal.id].translatedText
                    : selectedPostForModal.fullContent}
                </div>

                {/* Enlace de Traducción interactivo estilo LinkedIn ("Traducir" / "Ver original") */}
                <div className="mt-3 flex items-center gap-2">
                  <button
                    type="button"
                    disabled={translations[selectedPostForModal.id]?.isTranslating}
                    onClick={() => handleTogglePostTranslation(selectedPostForModal)}
                    className="text-xs font-semibold text-[#0a66c2] hover:underline cursor-pointer flex items-center gap-1.5 transition disabled:opacity-50"
                  >
                    {translations[selectedPostForModal.id]?.isTranslating ? (
                      <>
                        <span className="h-3 w-3 border-2 border-[#0a66c2]/40 border-t-[#0a66c2] rounded-full animate-spin"></span>
                        <span>
                          {locale === "pt-BR"
                            ? "Traduzindo..."
                            : locale === "en"
                            ? "Translating..."
                            : "Traduciendo..."}
                        </span>
                      </>
                    ) : translations[selectedPostForModal.id]?.isShowing ? (
                      <span>
                        {locale === "pt-BR"
                          ? "Ver original"
                          : locale === "en"
                          ? "See original"
                          : "Ver original"}
                      </span>
                    ) : (
                      <span>
                        {locale === "pt-BR"
                          ? "Traduzir"
                          : locale === "en"
                          ? "Translate"
                          : "Traducir"}
                      </span>
                    )}
                  </button>

                  {translations[selectedPostForModal.id]?.isShowing && (
                    <span className="text-xs text-gray-400 dark:text-gray-500">
                      •{" "}
                      {locale === "pt-BR"
                        ? "Traduzido para português"
                        : locale === "en"
                        ? "Translated to English"
                        : "Traducido al español"}
                    </span>
                  )}

                  {translations[selectedPostForModal.id]?.error && (
                    <span className="text-xs text-rose-500">
                      ({translations[selectedPostForModal.id].error})
                    </span>
                  )}
                </div>
              </div>

              {/* Recurso Visual (Imagen o Carrusel - Justo debajo del Texto) */}
              {selectedPostForModal.mediaUrl && (
                <div className="w-full overflow-hidden bg-black/5 dark:bg-black/50 border-y border-gray-300 dark:border-gray-800">
                  <img
                    src={selectedPostForModal.mediaUrl}
                    alt={selectedPostForModal.author}
                    className="w-full h-auto max-h-[620px] object-contain mx-auto"
                    onError={(e) => {
                      (e.currentTarget as HTMLElement).style.display = "none";
                    }}
                  />
                </div>
              )}

              {/* Barra de Reacciones y Contadores de LinkedIn (Likes, Comentarios, Compartidos) */}
              <div className="flex items-center justify-between px-4 py-2.5 text-xs text-gray-500 dark:text-gray-400 border-b border-gray-300 dark:border-gray-800">
                <div className="flex items-center gap-1.5">
                  <span className="flex items-center -space-x-1">
                    <span className="flex h-4.5 w-4.5 items-center justify-center rounded-full bg-[#0a66c2] text-white shadow-xs">
                      <svg className="h-2.5 w-2.5 fill-current" viewBox="0 0 24 24">
                        <path d="M1 21h4V9H1v12zm22-11c0-1.1-.9-2-2-2h-6.31l.95-4.57.03-.32c0-.41-.17-.79-.44-1.06L14.17 1 7.59 7.59C7.22 7.95 7 8.45 7 9v10c0 1.1.9 2 2 2h9c.83 0 1.54-.5 1.84-1.22l3.02-7.05c.09-.23.14-.47.14-.73v-2z" />
                      </svg>
                    </span>
                    <span className="flex h-4.5 w-4.5 items-center justify-center rounded-full bg-[#df704d] text-white shadow-xs">
                      <svg className="h-2.5 w-2.5 fill-current" viewBox="0 0 24 24">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" />
                      </svg>
                    </span>
                  </span>
                  <span className="font-semibold text-gray-700 dark:text-gray-300 ml-1">
                    {selectedPostForModal.likes.toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span>{t("commentsCount", { count: selectedPostForModal.comments.toLocaleString() })}</span>
                  <span>•</span>
                  <span>{t("sharesCount", { count: selectedPostForModal.shares.toLocaleString() })}</span>
                </div>
              </div>

              {/* Barra de Acciones del Feed de LinkedIn */}
              <div className="grid grid-cols-4 py-1 px-2 text-xs font-semibold text-gray-600 dark:text-gray-300">
                <div className="flex items-center justify-center gap-1.5 py-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg cursor-pointer transition">
                  <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017a2 2 0 01-1.789-1.106l-3.5-7A2 2 0 017.747 10H10V4a2 2 0 012-2h1a2 2 0 012 2v6z" />
                  </svg>
                  <span className="hidden sm:inline">{t("reactAction")}</span>
                </div>
                <div className="flex items-center justify-center gap-1.5 py-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg cursor-pointer transition">
                  <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  <span className="hidden sm:inline">{t("commentAction")}</span>
                </div>
                <div className="flex items-center justify-center gap-1.5 py-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg cursor-pointer transition">
                  <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span className="hidden sm:inline">{t("shareAction")}</span>
                </div>
                <div className="flex items-center justify-center gap-1.5 py-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg cursor-pointer transition">
                  <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                  <span className="hidden sm:inline">{t("sendAction")}</span>
                </div>
              </div>
            </div>

            {/* Enlace a publicación original en LinkedIn */}
            {selectedPostForModal.linkedinUrl && (
              <div className="mb-4 flex items-center justify-between p-3 rounded-lg border border-gray-300 bg-white dark:border-gray-800 dark:bg-gray-900 text-xs">
                <span className="text-gray-600 dark:text-gray-400 font-medium">{t("originalPostLink")}</span>
                <a
                  href={selectedPostForModal.linkedinUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-brand-600 hover:underline dark:text-brand-400 flex items-center gap-1"
                >
                  {t("viewOnLinkedIn")} &rarr;
                </a>
              </div>
            )}

            {/* Estructura de Diapositivas (si es Carrusel) */}
            {selectedPostForModal.format === "carousel" && selectedPostForModal.carouselSlides && (
              <div className="mb-4 rounded-lg border border-gray-300 p-4 bg-white dark:border-gray-800 dark:bg-gray-900">
                <h4 className="text-xs leading-5 font-normal tracking-normal uppercase text-gray-400 mb-2">
                  {t("carouselStructure", { count: selectedPostForModal.carouselSlides.length })}
                </h4>
                <div className="space-y-2 text-xs text-gray-600 dark:text-gray-400">
                  {selectedPostForModal.carouselSlides.map((s) => (
                    <div key={s.slideNumber} className="flex gap-2">
                      <span className="font-semibold text-gray-900 dark:text-white shrink-0">
                        {t("slideNumber", { num: s.slideNumber })}
                      </span>
                      <span>{s.title}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Ubicación Verificada del Perfil del Autor */}
            {(selectedPostForModal.authorLocation || selectedPostForModal.marketOrigin) && (
              <div className="mb-4 flex items-center justify-between p-3 rounded-lg border border-gray-300 bg-white dark:border-gray-800 dark:bg-gray-900 text-xs">
                <span className="text-gray-600 dark:text-gray-400 font-medium flex items-center gap-1.5">
                  <MapPin className="size-3.5 text-rose-500" />
                  Ubicación verificada del perfil en LinkedIn:
                </span>
                <span className="font-semibold text-gray-800 dark:text-gray-200">
                  {selectedPostForModal.authorLocation || selectedPostForModal.marketOrigin}
                </span>
              </div>
            )}

            {/* Prompt Visual para IA (si aplica) */}
            {selectedPostForModal.format === "image" && selectedPostForModal.imagePrompt && (
              <div className="mb-4 rounded-lg border border-gray-300 p-4 bg-white dark:border-gray-800 dark:bg-gray-900">
                <h4 className="text-xs leading-5 font-normal tracking-normal uppercase text-gray-400 mb-1">
                  {t("visualPromptAi")}
                </h4>
                <p className="text-xs font-mono text-gray-700 dark:text-gray-300">
                  {selectedPostForModal.imagePrompt}
                </p>
              </div>
            )}

            {/* Botones de Acción */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-t border-gray-300 pt-4 dark:border-gray-800">
              <a
                href={
                  selectedPostForModal.linkedinUrl ||
                  (selectedPostForModal.socialId
                    ? `https://www.linkedin.com/feed/update/${selectedPostForModal.socialId}`
                    : `https://www.linkedin.com/search/results/content/?keywords=${encodeURIComponent(
                        selectedPostForModal.hook?.replace(/:$/, "").slice(0, 90) || selectedPostForModal.topic
                      )}`)
                }
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0a66c2] hover:text-[#004182] dark:text-sky-400 dark:hover:text-sky-300 hover:underline transition self-start sm:self-center"
              >
                <svg className="w-3.5 h-3.5 fill-current shrink-0" viewBox="0 0 24 24">
                  <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 10.9h2.77v8.37H6.46v-8.37M7.85 6.6a1.6 1.6 0 1 0 0 3.2 1.6 1.6 0 0 0 0-3.2z" />
                </svg>
                <span>
                  {selectedPostForModal.isLive
                    ? "Ver publicación original en LinkedIn ↗"
                    : "Buscar temática en LinkedIn ↗"}
                </span>
              </a>

              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={handleClosePostModal}
                  className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 cursor-pointer"
                >{t("backBtn")}</button>
                <button
                  type="button"
                  onClick={() => {
                    const contentToModel =
                      translations[selectedPostForModal.id]?.isShowing &&
                      translations[selectedPostForModal.id]?.translatedText
                        ? {
                            ...selectedPostForModal,
                            fullContent:
                              translations[selectedPostForModal.id].translatedText,
                          }
                        : selectedPostForModal;
                    handleModelWithAi(contentToModel);
                  }}
                  className="rounded-lg bg-brand-500 px-5 py-2 text-xs font-semibold text-white hover:bg-brand-600 transition shadow-xs cursor-pointer"
                >{t("modelThisPostBtn")}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal 1: Configuración Previa del Plan de 1 Mes (Multi-cuenta e Idioma) */}
      {showConfigMonthPlanModal && (
        <div className="fixed inset-0 z-99999 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto custom-scrollbar rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-5">
            {/* Header */}
            <div className="flex items-start justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-gradient-to-tr from-[#0099ff] to-blue-600 text-white shadow-md shadow-blue-500/20">
                  <Sparkles className="size-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Programar Contenido para 1 Mes (12 Posts)
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Configura la cuenta de destino y el idioma objetivo antes de generar
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowConfigMonthPlanModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition cursor-pointer"
              >
                <X className="size-5" />
              </button>
            </div>

            {/* Indicador de Filtro Geográfico si está activo */}
            {selectedCountry !== "ALL" && (
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/50 text-xs text-blue-700 dark:text-blue-300">
                <Globe className="size-4 shrink-0 text-[#0099ff]" />
                <span>
                  Filtro geográfico activo: <strong>{selectedCountry}</strong> (Autores verificados en este país).
                </span>
              </div>
            )}

            {/* 1. Selector de Cuenta de LinkedIn Destino */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                <span>Cuenta de LinkedIn Destino</span>
                <span className="text-[11px] font-normal text-slate-400">
                  {availableAccounts.length} cuenta{availableAccounts.length === 1 ? "" : "s"} disponible{availableAccounts.length === 1 ? "" : "s"}
                </span>
              </label>

              {availableAccounts.length > 0 ? (
                <div className="space-y-1.5">
                  <select
                    value={monthPlanTargetAccountId}
                    onChange={(e) => {
                      const newId = e.target.value;
                      setMonthPlanTargetAccountId(newId);
                      const found = availableAccounts.find(
                        (a: any) => a.id === newId || a.unipileAccountId === newId
                      );
                      if (found?.targetLanguage) {
                        setMonthPlanTargetLanguage(found.targetLanguage);
                      }
                    }}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0099ff]"
                  >
                    {availableAccounts.map((acc: any) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name} ({acc.email || "LinkedIn"}) · {acc.targetLanguage ? acc.targetLanguage.toUpperCase() : "ES"}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 text-xs text-slate-500">
                  {currentUser.name} (Usuario Actual)
                </div>
              )}
            </div>

            {/* 2. Selector de Idioma Objetivo */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                Idioma de Publicación e IA
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: "es", flag: "🇪🇸", label: "Español", desc: "LATAM / España" },
                  { id: "pt", flag: "🇧🇷", label: "Português", desc: "Brasil / Portugal" },
                  { id: "en", flag: "🇺🇸", label: "English", desc: "USA / Global B2B" },
                ].map((lang) => (
                  <button
                    key={lang.id}
                    type="button"
                    onClick={() => setMonthPlanTargetLanguage(lang.id as any)}
                    className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-center transition cursor-pointer ${
                      monthPlanTargetLanguage === lang.id
                        ? "border-[#0099ff] bg-[#0099ff]/10 text-[#0099ff] ring-2 ring-[#0099ff]/20 font-bold"
                        : "border-slate-200 dark:border-slate-700 hover:border-slate-300 text-slate-700 dark:text-slate-300 font-medium"
                    }`}
                  >
                    <span className="text-xl mb-1 leading-none">{lang.flag}</span>
                    <span className="text-xs">{lang.label}</span>
                    <span className="text-[10px] text-slate-400">{lang.desc}</span>
                  </button>
                ))}
              </div>

              {/* Checkbox: Recordar idioma en la cuenta */}
              <label className="flex items-center gap-2 pt-1 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={saveLanguageToAccount}
                  onChange={(e) => setSaveLanguageToAccount(e.target.checked)}
                  className="rounded border-slate-300 text-[#0099ff] focus:ring-[#0099ff]"
                />
                <span className="text-xs text-slate-600 dark:text-slate-400">
                  Guardar este idioma como preferido para esta cuenta
                </span>
              </label>
            </div>

            {/* 3. Estructura del Plan */}
            <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 space-y-2 text-xs">
              <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Calendar className="size-4 text-[#0099ff]" />
                Estructura del Plan:
              </div>
              <ul className="space-y-1 text-slate-600 dark:text-slate-400 text-[11px] list-disc list-inside">
                <li>12 publicaciones distribuidas en 4 semanas (<strong>Lunes, Miércoles y Viernes a las 09:30 AM</strong>).</li>
                <li>Generación inicial en <strong>100% Texto Puro de alto engagement</strong>.</li>
                <li>La IA adaptará ganchos, estructura y llamadas a la acción al idioma seleccionado.</li>
                <li>Al revisarlos en el calendario, podrás enriquecer cualquier post con <strong>Portada Visual (4:5)</strong> o <strong>Carrusel PDF</strong> con 1 clic.</li>
              </ul>
            </div>

            {/* Footer / Botones de Acción */}
            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setShowConfigMonthPlanModal(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleExecuteGenerateMonthPlan}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-[#0099ff] to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/25 transition-all hover:scale-[1.02] cursor-pointer"
              >
                <Sparkles className="size-4 text-amber-300" />
                <span>
                  Generar 12 Posts en {monthPlanTargetLanguage === "pt" ? "Português" : monthPlanTargetLanguage === "en" ? "English" : "Español"}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 2: Pantalla de Carga y Progreso de Adaptación con IA */}
      {isGeneratingMonthPlan && generatingProgress && (
        <div className="fixed inset-0 z-99999 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-2xl border border-slate-200 dark:border-slate-800 text-center space-y-4">
            <div className="inline-flex p-3 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-[#0099ff] ring-4 ring-blue-500/10">
              <Sparkles className="size-8 animate-spin text-[#0099ff]" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Adaptando Publicaciones Virales con IA
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {generatingProgress.message}
              </p>
            </div>

            {/* Barra de Progreso */}
            <div className="space-y-1.5">
              <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#0099ff] to-blue-600 transition-all duration-300"
                  style={{
                    width: `${Math.round((generatingProgress.current / generatingProgress.total) * 100)}%`,
                  }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                <span>{generatingProgress.current} de {generatingProgress.total}</span>
                <span>{Math.round((generatingProgress.current / generatingProgress.total) * 100)}%</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Plan Editorial de 1 Mes Generado con Éxito */}
      {showMonthPlanModal && (
        <div className="fixed inset-0 z-99999 flex items-center justify-center bg-black/60 p-3 sm:p-4 backdrop-blur-xs">
          <div className="max-h-[92vh] w-full max-w-4xl overflow-y-auto custom-scrollbar rounded-2xl bg-white dark:bg-slate-900 p-5 sm:p-7 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-6">
            {/* Header del Modal */}
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-[#0099ff]">
                    <Sparkles className="size-5" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                    ¡12 Publicaciones Programadas para 1 Mes Completo!
                  </h3>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Hemos generado y distribuido 12 publicaciones inspiradas en tu Top 12 viral, organizadas a razón de 3 por semana (<strong>Lunes, Miércoles y Viernes a las 09:30 AM</strong>).
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowMonthPlanModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition cursor-pointer"
              >
                <X className="size-5" />
              </button>
            </div>

            {/* Badges de Resumen de Formatos */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-xs font-bold text-emerald-700 dark:text-emerald-300">
                <FileText className="size-3.5" />
                12 Publicaciones en Texto Puro Listas
              </span>
              {generatedMonthPosts[0]?.targetLanguage && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-xs font-bold text-indigo-700 dark:text-indigo-300">
                  <Globe className="size-3.5" />
                  Idioma: {generatedMonthPosts[0].targetLanguage === "pt" ? "🇧🇷 Português" : generatedMonthPosts[0].targetLanguage === "en" ? "🇺🇸 English" : "🇪🇸 Español"}
                </span>
              )}
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-xs font-semibold text-[#0099ff]">
                <Sparkles className="size-3.5" />
                Puedes elevar cualquier post a Portada Visual o Carrusel PDF al revisarlo
              </span>
            </div>

            {/* Cuadrícula de 4 Semanas */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[0, 1, 2, 3].map((weekIndex) => {
                const weekPosts = generatedMonthPosts.slice(weekIndex * 3, (weekIndex + 1) * 3);
                return (
                  <div
                    key={weekIndex}
                    className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 space-y-3"
                  >
                    <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-slate-700/60 pb-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                        <Calendar className="size-3.5 text-[#0099ff]" />
                        Semana {weekIndex + 1}
                      </span>
                      <span className="text-[11px] font-semibold text-slate-500">
                        3 Publicaciones
                      </span>
                    </div>

                    <div className="space-y-2">
                      {weekPosts.map((post) => {
                        const sched = formatScheduleDay(post.scheduledAt || "");
                        return (
                          <div
                            key={post.id}
                            className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 flex items-start gap-3 shadow-2xs"
                          >
                            <div className="shrink-0 text-center w-12 pt-0.5">
                              <span className="block text-[10px] font-extrabold uppercase text-[#0099ff]">
                                {sched.dayName.slice(0, 3)}
                              </span>
                              <span className="block text-sm font-extrabold text-slate-800 dark:text-white leading-tight">
                                {sched.dayNumber}
                              </span>
                              <span className="block text-[9px] text-slate-400">
                                {sched.monthName}
                              </span>
                            </div>

                            <div className="min-w-0 flex-1 space-y-1">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                                  post.format === "image"
                                    ? "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                                    : post.format === "carousel"
                                    ? "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300"
                                    : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                                }`}>
                                  {post.format === "image" ? "Portada" : post.format === "carousel" ? "Carrusel" : "Texto"}
                                </span>
                                <span className="text-[10px] text-slate-400 flex items-center gap-1">
                                  <Clock className="size-2.5" />
                                  {sched.time}
                                </span>
                              </div>
                              <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 line-clamp-1">
                                {post.title}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Botones de Acción */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <span className="text-xs text-slate-500 dark:text-slate-400 text-center sm:text-left">
                💡 Puedes revisar, reorganizar o editar el contenido e imágenes de cada publicación desde el <strong>Calendario Editorial</strong>.
              </span>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setShowMonthPlanModal(false)}
                  className="w-full sm:w-auto px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  Seguir en Radar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowMonthPlanModal(false);
                    if (onTabChange) {
                      onTabChange("calendar");
                    } else {
                      router.push("/viral-posts?tab=calendar");
                    }
                  }}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#0099ff] hover:bg-[#0082db] text-white text-xs font-bold transition shadow-xs cursor-pointer"
                >
                  <Calendar className="size-4" />
                  <span>Ir al Calendario Editorial</span>
                  <ArrowRight className="size-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
