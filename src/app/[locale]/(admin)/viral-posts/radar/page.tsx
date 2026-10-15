"use client";

import ComponentCard from "@/components/common/ComponentCard";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { getStoredAccounts } from "@/lib/unipile/store";
import type { UnipileAccount } from "@/lib/unipile/types";
import {
  isExcludedCorporateAuthor,
  isFreelanceOrServiceSpam,
  isJobRelatedPost,
  isNonTargetGeography,
  isNonWestern,
} from "@/lib/viral-posts/filters";
import {
  getStoredViralTemplates,
  setSelectedTemplateForModeling,
  getStoredRadarState,
  saveStoredRadarState,
} from "@/lib/viral-posts/store";
import type { PostFormat, ViralPostTemplate } from "@/lib/viral-posts/types";
import { useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

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

export default function ViralRadarPage() {
  const router = useRouter();
  const locale = useLocale();
  const masterTemplates = useMemo(() => getStoredViralTemplates(), []);

  // Cuentas de LinkedIn
  const [availableAccounts, setAvailableAccounts] = useState<any[]>([]);
  const [activeAccount, setActiveAccount] = useState<UnipileAccount | null>(null);
  const [activeAccountName, setActiveAccountName] = useState<string>("");

  // Modo de visualización: "live" (LinkedIn en Vivo) | "templates" (Plantillas Maestras)
  const [viewMode, setViewMode] = useState<"live" | "templates">("live");

  // Control de persistencia de sesión
  const [isCacheRestored, setIsCacheRestored] = useState(false);

  // Estados para Búsqueda en Vivo
  const [searchKeyword, setSearchKeyword] = useState("B2B Outbound");
  const [lastSuccessfulKeyword, setLastSuccessfulKeyword] = useState<string>("B2B Outbound");
  const [livePosts, setLivePosts] = useState<ViralPostTemplate[]>([]);
  const [isSearchingLive, setIsSearchingLive] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [hasSearchedOnce, setHasSearchedOnce] = useState(false);

  // Detección 100% Automática de Ubicación y Mercado (Sin selección manual de botones)
  const [detectedLocation, setDetectedLocation] = useState<DetectedMarketInfo>(() => detectUserMarket());

  useEffect(() => {
    setDetectedLocation(detectUserMarket());
  }, []);

  // Filtros de Viralidad y Temporalidad
  const [datePosted, setDatePosted] = useState<"PAST_MONTH" | "PAST_WEEK" | "PAST_24H" | "ANY">("PAST_MONTH");
  const [viralityTierFilter, setViralityTierFilter] = useState<"all" | "mega" | "high" | "trending">("all");
  const excludeJobs = true;

  // Filtros generales y Modal
  const [selectedFormat, setSelectedFormat] = useState<"all" | PostFormat>("all");
  const [filterTerm, setFilterTerm] = useState("");
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
      if (cached.viewMode) setViewMode(cached.viewMode);
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
      viewMode,
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
    viewMode,
  ]);

  // Cargar cuentas en vivo desde la API de Unipile
  useEffect(() => {
    fetch("/api/unipile/accounts")
      .then((r) => r.json())
      .then((data) => {
        const liveItems = data.items || [];
        if (liveItems.length > 0) {
          setAvailableAccounts(liveItems);
          // Priorizar cuenta con estado OK (como Linn Martinson o RobertoOrSe)
          const healthy = liveItems.find(
            (a: any) =>
              a.status === "OK" ||
              a.status === "CONNECTED" ||
              (Array.isArray(a.sources) && a.sources.some((s: any) => s.status === "OK"))
          ) || liveItems[0];
          setActiveAccount(healthy);
          setActiveAccountName(healthy.name);
        } else {
          const stored = getStoredAccounts();
          const healthyStored = stored.find((a) => a.status === "OK") || stored[0] || null;
          setActiveAccount(healthyStored as any);
          if (healthyStored) setActiveAccountName(healthyStored.name);
        }
      })
      .catch(() => {
        const stored = getStoredAccounts();
        const healthyStored = stored.find((a) => a.status === "OK") || stored[0] || null;
        setActiveAccount(healthyStored as any);
        if (healthyStored) setActiveAccountName(healthyStored.name);
      });
  }, []);

  // Función de búsqueda en vivo en LinkedIn a través de Unipile (filtrando cirílico, ofertas de empleo y seleccionando el Top 12)
  const handleLiveSearch = useCallback(
    async (
      keywordToSearch?: string,
      accountIdOverride?: string,
      dateOverride?: string,
      marketOverride?: TargetMarket,
      excludeJobsOverride?: boolean
    ) => {
      const kw = (keywordToSearch !== undefined ? keywordToSearch : searchKeyword).trim();
      if (!kw) return;

      const targetId = accountIdOverride || activeAccount?.id;
      const targetDate = dateOverride || datePosted;
      const targetMkt = marketOverride || detectedLocation.market;
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
          viewMode: "live",
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
          msg = "LinkedIn tardó demasiado en responder para esta búsqueda (Timeout temporal). Puedes reintentar ahora o explorar las plantillas maestras.";
        }
        setSearchError(msg);
      } finally {
        setIsSearchingLive(false);
      }
    },
    [searchKeyword, activeAccount?.id, datePosted, detectedLocation, excludeJobs, viralityTierFilter, selectedFormat]
  );

  // Ejecutar búsqueda inicial en vivo SOLO si ya se verificó el caché Y no existía ninguna búsqueda previa guardada
  useEffect(() => {
    if (isCacheRestored && activeAccount && !hasSearchedOnce && livePosts.length === 0) {
      handleLiveSearch(searchKeyword || "B2B Outbound", undefined, undefined, detectedLocation.market);
    }
  }, [isCacheRestored, activeAccount, hasSearchedOnce, livePosts.length, handleLiveSearch, searchKeyword, detectedLocation.market]);

  // Publicaciones según el modo activo
  const currentPostsPool = viewMode === "live" ? livePosts : masterTemplates;

  // Filtrado reactivo por formato, tier de viralidad (Mega Viral, Alta Tracción, En Tendencia) y término secundario
  const filteredPosts = useMemo(() => {
    const list = currentPostsPool.filter((post) => {
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

      const matchesFilter =
        !filterTerm ||
        post.topic.toLowerCase().includes(filterTerm.toLowerCase()) ||
        post.hook.toLowerCase().includes(filterTerm.toLowerCase()) ||
        post.author.toLowerCase().includes(filterTerm.toLowerCase()) ||
        post.fullContent.toLowerCase().includes(filterTerm.toLowerCase());

      const matchesFormat = selectedFormat === "all" || post.format === selectedFormat;

      const matchesTier =
        viralityTierFilter === "all" ||
        post.viralityTier === viralityTierFilter ||
        (viralityTierFilter === "mega" && (post.viralityScore ?? 0) >= 100) ||
        (viralityTierFilter === "high" && (post.viralityScore ?? 0) >= 35 && (post.viralityScore ?? 0) < 100) ||
        (viralityTierFilter === "trending" && (post.viralityScore ?? 0) < 35);

      return matchesFilter && matchesFormat && matchesTier;
    });

    // Ordenar de forma descendente por Score de Viralidad (los mejores posts siempre al inicio)
    const sorted = [...list].sort((a, b) => (b.viralityScore ?? 0) - (a.viralityScore ?? 0));

    // En modo Radar en Vivo (LinkedIn), mostrar estrictamente los 12 mejores resultados
    if (viewMode === "live") {
      return sorted.slice(0, 12);
    }

    return sorted;
  }, [currentPostsPool, filterTerm, selectedFormat, viralityTierFilter, viewMode, excludeJobs]);

  const handleModelWithAi = (post: ViralPostTemplate) => {
    setSelectedTemplateForModeling(post);
    router.push("/viral-posts/create");
  };

  const getFormatLabel = (fmt: PostFormat) => {
    switch (fmt) {
      case "text":
        return "Texto";
      case "image":
        return "Texto + Imagen";
      case "video":
        return "Texto + Video";
      case "carousel":
        return "Carrusel";
    }
  };

  const handleOpenPostModal = (post: ViralPostTemplate) => {
    setSelectedPostForModal(post);
  };

  const handleClosePostModal = () => {
    setSelectedPostForModal(null);
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

  const currentDisplayName = activeAccountName || activeAccount?.name || "Linn Martinson";

  return (
    <div className="space-y-6">
      <PageBreadcrumb pageTitle="Post Finder (Top Posts de LinkedIn)" />


      {/* Selector Principal de Modo: Live LinkedIn vs Plantillas Maestras */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-white border border-gray-200 dark:bg-gray-900 dark:border-gray-800">
        <div>
          <h2 className="text-base font-bold text-gray-900 dark:text-white">
            Explorador de Publicaciones de Alto Impacto
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {viewMode === "live"
              ? "Búsqueda en tiempo real de publicaciones virales en LinkedIn ordenadas estrictamente por repercusión y debate."
              : "12 estructuras maestras de copywriting probadas (Carruseles, Ganchos y Prompts Visuales)."}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setViewMode("live")}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition ${
              viewMode === "live"
                ? "bg-brand-500 text-white shadow-theme-xs"
                : "border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300"
            }`}
          >
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
            Post Finder (LinkedIn)
          </button>
          <button
            type="button"
            onClick={() => setViewMode("templates")}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition ${
              viewMode === "templates"
                ? "bg-brand-500 text-white shadow-theme-xs"
                : "border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300"
            }`}
          >
            Plantillas Maestras ({masterTemplates.length})
          </button>
        </div>
      </div>

      {/* Panel de Control de Búsqueda y Parámetros */}
      <ComponentCard
        title={viewMode === "live" ? "Post Finder en la Red de LinkedIn" : "Buscador de Plantillas Virales"}
        desc={
          viewMode === "live"
            ? `Indexación directa de publicaciones vía Unipile con la cuenta de LinkedIn: ${currentDisplayName}.`
            : "Filtra por formato, temáticas y estructuras comprobadas de atracción."
        }
      >
        <div className="space-y-4">
          {viewMode === "live" ? (
            <div className="space-y-3">
              {/* Selector de cuenta si hay varias */}
              {availableAccounts.length > 1 && (
                <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl bg-gray-50 border border-gray-200 dark:bg-gray-800/40 dark:border-gray-800 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-600 dark:text-gray-400">
                      Cuenta conectada para indexar:
                    </span>
                    <span className="font-bold text-gray-900 dark:text-white">
                      {currentDisplayName}
                    </span>
                    <span className="rounded bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">
                      OK
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-gray-500 text-[11px]">Cambiar cuenta:</span>
                    <select
                      value={activeAccount?.id || ""}
                      onChange={(e) => {
                        const selected = availableAccounts.find((a) => a.id === e.target.value);
                        if (selected) {
                          setActiveAccount(selected);
                          setActiveAccountName(selected.name);
                          handleLiveSearch(searchKeyword, selected.id);
                        }
                      }}
                      className="rounded-lg border border-gray-300 bg-white px-2.5 py-1 text-xs text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
                    >
                      {availableAccounts.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name} ({a.status === "OK" ? "Conectada" : "Reconexión"})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={searchKeyword}
                    onChange={(e) => setSearchKeyword(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleLiveSearch()}
                    placeholder="Palabra clave, industria o dolor (ej. Social Selling, B2B SaaS, Agentes SDR)..."
                    className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:border-brand-500 focus:outline-hidden dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                  />
                </div>
                <button
                  type="button"
                  disabled={isSearchingLive}
                  onClick={() => handleLiveSearch()}
                  className="rounded-xl bg-brand-500 px-5 py-2.5 text-xs font-semibold text-white hover:bg-brand-600 disabled:opacity-50 transition flex items-center justify-center gap-2 shrink-0"
                >
                  {isSearchingLive ? (
                    <>
                      <span className="h-3.5 w-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin"></span>
                      Escaneando LinkedIn...
                    </>
                  ) : (
                    "Escanear Tendencias"
                  )}
                </button>
              </div>

              {/* Tags de búsqueda rápida */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <span className="text-xs font-medium text-gray-400 mr-1">Sugerencias:</span>
                {quickSearchTags.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => {
                      setSearchKeyword(tag);
                    }}
                    className={`rounded-lg px-2.5 py-1 text-[11px] font-medium border transition ${
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
              <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-gray-100 dark:border-gray-800 text-xs">
                {/* Ventana Temporal */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-gray-500 dark:text-gray-400">Ventana Temporal:</span>
                  <div className="inline-flex rounded-lg border border-gray-200 dark:border-gray-800 p-0.5 bg-gray-50 dark:bg-gray-900">
                    {[
                      { id: "PAST_MONTH", label: "Último Mes (Recomendado)" },
                      { id: "PAST_WEEK", label: "Última Semana" },
                      { id: "PAST_24H", label: "24h" },
                      { id: "ANY", label: "Todo" },
                    ].map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => {
                          setDatePosted(opt.id as any);
                          handleLiveSearch(searchKeyword, undefined, opt.id);
                        }}
                        className={`px-2.5 py-1 text-[11px] font-medium rounded-md transition ${
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

              </div>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <input
                type="text"
                value={filterTerm}
                onChange={(e) => setFilterTerm(e.target.value)}
                placeholder="Filtrar plantillas por tema, gancho o autor..."
                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:border-brand-500 focus:outline-hidden dark:border-gray-700 dark:bg-gray-900 dark:text-white"
              />
              {filterTerm && (
                <button
                  type="button"
                  onClick={() => setFilterTerm("")}
                  className="rounded-lg border border-gray-300 px-3 py-2 text-xs text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 shrink-0"
                >
                  Limpiar
                </button>
              )}
            </div>
          )}

          {/* Filtros por Nivel de Viralidad y Formato */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-gray-100 dark:border-gray-800">
            {/* Nivel de Viralidad */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 mr-1">
                Nivel de Viralidad:
              </span>
              {[
                { id: "all", label: "Todos (Top 12)" },
                { id: "mega", label: "Mega Viral 🔥🔥🔥" },
                { id: "high", label: "Alta Tracción 🔥🔥" },
                { id: "trending", label: "En Tendencia 🔥" },
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
              <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 mr-1">
                Formato:
              </span>
              {[
                { id: "all", label: `Todos (${filteredPosts.length})` },
                { id: "text", label: "Texto" },
                { id: "image", label: "Texto + Imagen" },
                { id: "video", label: "Texto + Video" },
                { id: "carousel", label: "Carrusel" },
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
            <div className="rounded-xl bg-amber-50 p-3 text-xs text-amber-800 border border-amber-200 dark:bg-amber-950/30 dark:border-amber-900/50 dark:text-amber-300 flex items-center justify-between">
              <span>{searchError}</span>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => handleLiveSearch(searchKeyword)}
                  className="font-semibold text-brand-600 hover:underline"
                >
                  Reintentar
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("templates")}
                  className="underline font-semibold hover:text-amber-900"
                >
                  Ver Plantillas Maestras
                </button>
              </div>
            </div>
          )}
        </div>
      </ComponentCard>

      {/* Listado de Tarjetas */}
      <div>
        <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <h3 className="text-base font-semibold text-gray-800 dark:text-white/90">
              {viewMode === "live"
                ? `Publicaciones Reales en LinkedIn (Top ${filteredPosts.length} virales)`
                : `Plantillas Maestras Disponibles (${filteredPosts.length})`}
            </h3>
            {viewMode === "live" && livePosts.length > 0 && (
              <button
                type="button"
                onClick={() => handleLiveSearch(lastSuccessfulKeyword || searchKeyword)}
                disabled={isSearchingLive}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-gray-600 dark:text-gray-300 hover:text-brand-600 dark:hover:text-brand-400 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 transition"
                title="Volver a escanear LinkedIn con esta palabra clave"
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
                {isSearchingLive ? "Actualizando..." : "Actualizar"}
              </button>
            )}
          </div>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {viewMode === "live"
              ? searchError && lastSuccessfulKeyword !== searchKeyword
                ? `Mostrando resultados de "${lastSuccessfulKeyword}" • Reintento pendiente para "${searchKeyword}"`
                : `Palabra clave: "${lastSuccessfulKeyword || searchKeyword}" • Top 12 ordenados por Score de Impacto`
              : "Ordenadas por Ratio de Interacción probado"}
          </span>
        </div>

        {isSearchingLive ? (
          <div className="py-16 text-center space-y-3 bg-white rounded-2xl border border-gray-200 dark:bg-gray-900 dark:border-gray-800">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent"></div>
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              Escaneando publicaciones en vivo en LinkedIn...
            </p>
            <p className="text-xs text-gray-400">
              Extrayendo el Top 12 con mayor impacto, descartando ofertas laborales (#Hiring), solicitudes (#OpenToWork) y publicaciones sin tracción.
            </p>
          </div>
        ) : filteredPosts.length === 0 ? (
          <div className="py-16 text-center space-y-3 bg-white rounded-2xl border border-gray-200 dark:bg-gray-900 dark:border-gray-800 p-6">
            <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
              No se encontraron publicaciones virales para los filtros aplicados.
            </p>
            {viewMode === "live" && (
              <div className="space-y-2">
                <p className="text-xs text-gray-400">
                  Prueba buscando otra palabra clave, ampliando la ventana temporal o explora las plantillas maestras virales.
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
                  >
                    Mostrar Todo (Top 9)
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode("templates")}
                    className="rounded-lg bg-brand-500 px-4 py-1.5 text-xs font-semibold text-white"
                  >
                    Abrir Plantillas Maestras
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
            {filteredPosts.map((post) => (
              <div
                key={post.id}
                className="flex flex-col justify-between rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-xs hover:border-brand-500/60 transition dark:border-gray-800 dark:bg-gray-900/60"
              >
                <div>
                  {/* Encabezado: Autor y Badges */}
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2.5 min-w-0 pr-2">
                      {post.authorAvatar ? (
                        <img
                          src={post.authorAvatar}
                          alt={post.author}
                          className="h-10 w-10 rounded-full object-cover shrink-0 border border-gray-200 dark:border-gray-700"
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
                          {post.isLive && (
                            <span className="rounded bg-emerald-50 px-1.5 py-0.2 text-[9px] font-bold text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">
                              LIVE
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate mt-0.5">
                          {post.authorHeadline}
                        </p>
                        <span className="text-[10px] text-gray-400 block mt-0.5">
                          {post.publishedDate} • {post.topic}
                        </span>
                      </div>
                    </div>

                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold shrink-0 border ${
                        post.format === "carousel"
                          ? "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800"
                          : post.format === "video"
                          ? "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800"
                          : post.format === "image"
                          ? "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800"
                          : "bg-gray-100 text-gray-700 border border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700"
                      }`}
                    >
                      {getFormatLabel(post.format)}
                    </span>
                  </div>

                  {/* Fila de Viralidad: Badge & Score & Origen de Mercado */}
                  <div className="mb-3 flex items-center justify-between gap-1 flex-wrap">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span
                        className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold ${
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
                        <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-semibold text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                          Score: {post.viralityScore} pts
                        </span>
                      )}
                      {post.marketOrigin && (
                        <span className="inline-flex items-center gap-1 rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-semibold text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-900/50">
                          <svg className="w-2.5 h-2.5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          {post.marketOrigin}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Cuerpo del Post con formato fiel a LinkedIn y Enlace Traducir */}
                  <div className="mb-3">
                    <div className="text-[13px] leading-relaxed text-gray-800 dark:text-gray-200 font-sans whitespace-pre-wrap select-text">
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
                        {expandedPosts[post.id] ? "ver menos" : "...ver más"}
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
                        <span className="text-[11px] text-gray-400 dark:text-gray-500">
                          •{" "}
                          {locale === "pt-BR"
                            ? "Traduzido para português"
                            : locale === "en"
                            ? "Translated to English"
                            : "Traducido al español"}
                        </span>
                      )}

                      {translations[post.id]?.error && (
                        <span className="text-[11px] text-rose-500">
                          ({translations[post.id].error})
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Vista previa recortada de la imagen / recurso visual (para saber de un vistazo si incluye imagen) */}
                  {(post.mediaUrl || post.format === "image" || post.format === "carousel") && (
                    <div className="relative mb-4 h-32 sm:h-36 w-full overflow-hidden rounded-xl bg-gray-100 dark:bg-gray-800/80 border border-gray-200/80 dark:border-gray-800 group">
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
                        className={`media-fallback h-full w-full ${post.mediaUrl ? "hidden" : "flex"} flex-col items-center justify-center p-3 text-center bg-gradient-to-br ${
                          post.format === "carousel"
                            ? "from-blue-500/10 via-brand-500/15 to-purple-500/10 border-blue-500/20"
                            : "from-amber-500/10 via-brand-500/15 to-rose-500/10 border-amber-500/20"
                        }`}
                      >
                        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-white shadow-xs dark:bg-gray-800 mb-1 text-brand-600 dark:text-brand-400">
                          {post.format === "carousel" ? (
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          ) : (
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          )}
                        </div>
                        <span className="text-[11px] font-semibold text-gray-700 dark:text-gray-200">
                          {post.format === "carousel"
                            ? `Carrusel (${post.carouselSlides?.length || "5"} diapositivas)`
                            : "Publicación con Imagen"}
                        </span>
                        {post.imagePrompt && (
                          <span className="text-[9px] text-gray-400 line-clamp-1 mt-0.5 max-w-[90%]">
                            {post.imagePrompt}
                          </span>
                        )}
                      </div>

                      {/* Etiqueta flotante inferior para confirmar que tiene imagen o carrusel */}
                      <div className="absolute bottom-2 left-2 flex items-center gap-1.5 pointer-events-none">
                        <span className="inline-flex items-center gap-1 rounded-md bg-black/65 backdrop-blur-xs px-2 py-0.5 text-[9px] font-bold text-white shadow-xs">
                          {post.format === "carousel" ? "Carrusel" : "Imagen adjunta"}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Métricas Públicas de LinkedIn: Likes, Comentarios, Reposts */}
                  <div className="mb-5 grid grid-cols-3 gap-2 border-y border-gray-100 py-2.5 text-center dark:border-gray-800">
                    <div>
                      <span className="block text-[10px] text-gray-400 uppercase font-medium">Likes</span>
                      <span className="text-xs font-bold text-gray-800 dark:text-white">
                        {post.likes.toLocaleString()}
                      </span>
                    </div>
                    <div className="rounded-lg bg-brand-50/50 py-0.5 dark:bg-brand-950/20">
                      <span className="block text-[10px] text-brand-600 dark:text-brand-400 uppercase font-bold">
                        Comentarios
                      </span>
                      <span className="text-xs font-bold text-brand-600 dark:text-brand-400">
                        {post.comments.toLocaleString()}
                      </span>
                    </div>
                    <div>
                      <span className="block text-[10px] text-gray-400 uppercase font-medium">
                        Reposts
                      </span>
                      <span className="text-xs font-bold text-gray-800 dark:text-white">
                        {post.shares.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-gray-100 dark:border-gray-800">
                  <button
                    type="button"
                    onClick={() => handleOpenPostModal(post)}
                    className="rounded-lg border border-gray-300 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/5"
                  >
                    Lectura Completa
                  </button>
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
                    Modelar con IA
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
          <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-gray-50 dark:bg-gray-950 p-4 sm:p-6 shadow-theme-xl border border-gray-200 dark:border-gray-800">
            {/* Barra Superior de Metadatos y Cierre */}
            <div className="flex items-center justify-between gap-3 border-b border-gray-200 dark:border-gray-800 pb-3 mb-4">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="rounded-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 px-2.5 py-0.5 text-xs font-semibold text-gray-800 dark:text-gray-200 shadow-xs">
                  {getFormatLabel(selectedPostForModal.format)}
                </span>
                {selectedPostForModal.viralityBadge && (
                  <span
                    className={`rounded-md px-2 py-0.5 text-xs font-bold ${
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
                  <span className="rounded bg-gray-200/70 dark:bg-gray-800 px-2 py-0.5 text-xs font-semibold text-gray-700 dark:text-gray-300">
                    Score: {selectedPostForModal.viralityScore} pts
                  </span>
                )}
                {selectedPostForModal.marketOrigin && (
                  <span className="inline-flex items-center gap-1 rounded bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-900/50">
                    <svg className="w-3 h-3 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    {selectedPostForModal.marketOrigin}
                  </span>
                )}
                {selectedPostForModal.isLive && (
                  <span className="rounded bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900">
                    LinkedIn en Vivo
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={handleClosePostModal}
                className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-800 text-xs font-bold transition shrink-0"
              >
                ✕ Cerrar
              </button>
            </div>

            {/* Tarjeta con Estructura Fiel a una Publicación de LinkedIn */}
            <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm overflow-hidden mb-4">
              {/* Encabezado del Autor (Avatar + Nombre + Seguir + Titular + Tiempo) */}
              <div className="p-4 flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  {selectedPostForModal.authorAvatar ? (
                    <img
                      src={selectedPostForModal.authorAvatar}
                      alt={selectedPostForModal.author}
                      className="h-12 w-12 rounded-full object-cover shrink-0 border border-gray-200 dark:border-gray-700"
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
                    <div className="flex items-center gap-1 text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">
                      <span>{selectedPostForModal.publishedDate}</span>
                      <span>•</span>
                      <svg className="w-3 h-3 text-gray-400 fill-current inline" viewBox="0 0 16 16">
                        <path d="M8 0a8 8 0 1 0 0 16A8 8 0 0 0 8 0ZM4.88 5.75A5.72 5.72 0 0 1 8 4.75c1.17 0 2.25.35 3.12 1L9.75 7.12A3.24 3.24 0 0 0 8 6.75c-.64 0-1.24.19-1.75.52L4.88 5.75Zm6.24 4.5A5.72 5.72 0 0 1 8 11.25a5.72 5.72 0 0 1-3.12-1l1.37-1.37c.51.33 1.11.52 1.75.52.64 0 1.24-.19 1.75-.52l1.37 1.37Z" />
                      </svg>
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
                    <span className="text-[11px] text-gray-400 dark:text-gray-500">
                      •{" "}
                      {locale === "pt-BR"
                        ? "Traduzido para português"
                        : locale === "en"
                        ? "Translated to English"
                        : "Traducido al español"}
                    </span>
                  )}

                  {translations[selectedPostForModal.id]?.error && (
                    <span className="text-[11px] text-rose-500">
                      ({translations[selectedPostForModal.id].error})
                    </span>
                  )}
                </div>
              </div>

              {/* Recurso Visual (Imagen o Carrusel - Justo debajo del Texto) */}
              {selectedPostForModal.mediaUrl && (
                <div className="w-full overflow-hidden bg-black/5 dark:bg-black/50 border-y border-gray-100 dark:border-gray-800">
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
              <div className="flex items-center justify-between px-4 py-2.5 text-xs text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-800">
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
                  <span>{selectedPostForModal.comments.toLocaleString()} comentarios</span>
                  <span>•</span>
                  <span>{selectedPostForModal.shares.toLocaleString()} compartidos</span>
                </div>
              </div>

              {/* Barra de Acciones del Feed de LinkedIn */}
              <div className="grid grid-cols-4 py-1 px-2 text-xs font-semibold text-gray-600 dark:text-gray-300">
                <div className="flex items-center justify-center gap-1.5 py-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg cursor-pointer transition">
                  <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017a2 2 0 01-1.789-1.106l-3.5-7A2 2 0 017.747 10H10V4a2 2 0 012-2h1a2 2 0 012 2v6z" />
                  </svg>
                  <span className="hidden sm:inline">Reaccionar</span>
                </div>
                <div className="flex items-center justify-center gap-1.5 py-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg cursor-pointer transition">
                  <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  <span className="hidden sm:inline">Comentar</span>
                </div>
                <div className="flex items-center justify-center gap-1.5 py-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg cursor-pointer transition">
                  <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span className="hidden sm:inline">Compartir</span>
                </div>
                <div className="flex items-center justify-center gap-1.5 py-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg cursor-pointer transition">
                  <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                  <span className="hidden sm:inline">Enviar</span>
                </div>
              </div>
            </div>

            {/* Enlace a publicación original en LinkedIn */}
            {selectedPostForModal.linkedinUrl && (
              <div className="mb-4 flex items-center justify-between p-3 rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900 text-xs">
                <span className="text-gray-600 dark:text-gray-400 font-medium">Publicación original en la red:</span>
                <a
                  href={selectedPostForModal.linkedinUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-brand-600 hover:underline dark:text-brand-400 flex items-center gap-1"
                >
                  Ver en LinkedIn &rarr;
                </a>
              </div>
            )}

            {/* Estructura de Diapositivas (si es Carrusel) */}
            {selectedPostForModal.format === "carousel" && selectedPostForModal.carouselSlides && (
              <div className="mb-4 rounded-xl border border-gray-200 p-4 bg-white dark:border-gray-800 dark:bg-gray-900">
                <h4 className="text-xs font-bold uppercase tracking-wider text-brand-600 mb-2">
                  Estructura de Diapositivas ({selectedPostForModal.carouselSlides.length} diapositivas):
                </h4>
                <div className="space-y-2 text-xs text-gray-600 dark:text-gray-400">
                  {selectedPostForModal.carouselSlides.map((s) => (
                    <div key={s.slideNumber} className="flex gap-2">
                      <span className="font-semibold text-gray-900 dark:text-white shrink-0">
                        Slide {s.slideNumber}:
                      </span>
                      <span>{s.title}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Prompt Visual para IA (si aplica) */}
            {selectedPostForModal.format === "image" && selectedPostForModal.imagePrompt && (
              <div className="mb-4 rounded-xl border border-gray-200 p-4 bg-white dark:border-gray-800 dark:bg-gray-900">
                <h4 className="text-xs font-bold uppercase tracking-wider text-brand-600 mb-1">
                  Prompt Visual para IA:
                </h4>
                <p className="text-xs font-mono text-gray-700 dark:text-gray-300">
                  {selectedPostForModal.imagePrompt}
                </p>
              </div>
            )}

            {/* Botones de Acción */}
            <div className="flex justify-end gap-3 border-t border-gray-200 pt-4 dark:border-gray-800">
              <button
                type="button"
                onClick={handleClosePostModal}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
              >
                Regresar
              </button>
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
                className="rounded-lg bg-brand-500 px-5 py-2 text-xs font-semibold text-white hover:bg-brand-600 transition shadow-xs"
              >
                Modelar esta Publicación con IA
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
