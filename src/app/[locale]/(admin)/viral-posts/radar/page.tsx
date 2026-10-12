"use client";

import ComponentCard from "@/components/common/ComponentCard";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { getStoredAccounts } from "@/lib/unipile/store";
import type { UnipileAccount } from "@/lib/unipile/types";
import { getStoredViralTemplates, setSelectedTemplateForModeling } from "@/lib/viral-posts/store";
import type { PostFormat, ViralPostTemplate } from "@/lib/viral-posts/types";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

export default function ViralRadarPage() {
  const router = useRouter();
  const masterTemplates = useMemo(() => getStoredViralTemplates(), []);

  // Cuentas de LinkedIn activas
  const [activeAccount, setActiveAccount] = useState<UnipileAccount | null>(null);

  // Modo de visualización: "live" (LinkedIn en Vivo) | "templates" (Plantillas Maestras)
  const [viewMode, setViewMode] = useState<"live" | "templates">("live");

  // Estados para Búsqueda en Vivo
  const [searchKeyword, setSearchKeyword] = useState("Social Selling");
  const [livePosts, setLivePosts] = useState<ViralPostTemplate[]>([]);
  const [isSearchingLive, setIsSearchingLive] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [hasSearchedOnce, setHasSearchedOnce] = useState(false);

  // Filtros
  const [selectedFormat, setSelectedFormat] = useState<"all" | PostFormat>("all");
  const [filterTerm, setFilterTerm] = useState("");
  const [selectedPostForModal, setSelectedPostForModal] = useState<ViralPostTemplate | null>(null);

  // Cargar cuenta activa al montar
  useEffect(() => {
    const accounts = getStoredAccounts();
    const okAcc = accounts.find((a) => a.status === "OK") || accounts[0] || null;
    setActiveAccount(okAcc);
  }, []);

  // Función de búsqueda en vivo en LinkedIn a través de Unipile
  const handleLiveSearch = useCallback(async (keywordToSearch?: string) => {
    const kw = (keywordToSearch !== undefined ? keywordToSearch : searchKeyword).trim();
    if (!kw) return;

    setIsSearchingLive(true);
    setSearchError(null);

    try {
      const res = await fetch("/api/unipile/posts/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          keywords: kw,
          account_id: activeAccount?.id,
          limit: 12,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "No se pudieron obtener resultados de LinkedIn.");
      }

      setLivePosts(data.items || []);
      setHasSearchedOnce(true);
    } catch (err: any) {
      console.warn("[Radar Live Search Error]:", err);
      setSearchError(err.message || "Error al conectar con el radar de LinkedIn.");
      // Fallback amigable: si falla, mantener posts o invitar a usar plantillas maestras
    } finally {
      setIsSearchingLive(false);
    }
  }, [searchKeyword, activeAccount?.id]);

  // Ejecutar búsqueda inicial en vivo al tener cuenta activa
  useEffect(() => {
    if (activeAccount && !hasSearchedOnce) {
      handleLiveSearch("Social Selling");
    }
  }, [activeAccount, hasSearchedOnce, handleLiveSearch]);

  // Publicaciones según el modo activo
  const currentPostsPool = viewMode === "live" ? livePosts : masterTemplates;

  // Filtrado reactivo por formato y término secundario
  const filteredPosts = useMemo(() => {
    return currentPostsPool.filter((post) => {
      const matchesFilter =
        !filterTerm ||
        post.topic.toLowerCase().includes(filterTerm.toLowerCase()) ||
        post.hook.toLowerCase().includes(filterTerm.toLowerCase()) ||
        post.author.toLowerCase().includes(filterTerm.toLowerCase()) ||
        post.fullContent.toLowerCase().includes(filterTerm.toLowerCase());

      const matchesFormat = selectedFormat === "all" || post.format === selectedFormat;

      return matchesFilter && matchesFormat;
    });
  }, [currentPostsPool, filterTerm, selectedFormat]);

  const handleModelWithAi = (post: ViralPostTemplate) => {
    setSelectedTemplateForModeling(post);
    router.push("/viral-posts/create");
  };

  const getFormatLabel = (fmt: PostFormat) => {
    switch (fmt) {
      case "text":
        return "Solo Texto";
      case "image":
        return "Texto + Imagen";
      case "carousel":
        return "Carrusel PDF";
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

  return (
    <div className="space-y-6">
      <PageBreadcrumb pageTitle="Radar Viral (Top Posts de LinkedIn)" />

      {/* Selector Principal de Modo: Live LinkedIn vs Plantillas Maestras */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-white border border-gray-200 dark:bg-gray-900 dark:border-gray-800">
        <div>
          <h2 className="text-base font-bold text-gray-900 dark:text-white">
            Explorador de Publicaciones de Alto Impacto
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {viewMode === "live"
              ? "Búsqueda en tiempo real de publicaciones virales en LinkedIn para modelar ganchos y generar tracción."
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
            Radar en Vivo (LinkedIn)
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

      {/* Panel de Control de Búsqueda */}
      <ComponentCard
        title={viewMode === "live" ? "Radar en Vivo en la Red de LinkedIn" : "Buscador de Plantillas Virales"}
        desc={
          viewMode === "live"
            ? `Indexación directa de publicaciones vía Unipile con la cuenta de LinkedIn: ${
                activeAccount ? activeAccount.name : "Conectando..."
              }.`
            : "Filtra por formato, temáticas y estructuras comprobadas de atracción."
        }
      >
        <div className="space-y-4">
          {viewMode === "live" ? (
            <div className="space-y-3">
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
                      handleLiveSearch(tag);
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

          {/* Filtro por Formato */}
          <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-gray-100 dark:border-gray-800">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 mr-2">
              Filtrar por Formato:
            </span>
            {[
              { id: "all", label: `Todos (${filteredPosts.length})` },
              { id: "text", label: "Solo Texto" },
              { id: "image", label: "Texto + Imagen" },
              { id: "carousel", label: "Carrusel PDF" },
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setSelectedFormat(f.id as "all" | PostFormat)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                  selectedFormat === f.id
                    ? "bg-brand-500 text-white"
                    : "border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {searchError && (
            <div className="rounded-xl bg-amber-50 p-3 text-xs text-amber-800 border border-amber-200 dark:bg-amber-950/30 dark:border-amber-900/50 dark:text-amber-300 flex items-center justify-between">
              <span>{searchError}</span>
              <button
                type="button"
                onClick={() => setViewMode("templates")}
                className="underline font-semibold hover:text-amber-900"
              >
                Ver Plantillas Maestras
              </button>
            </div>
          )}
        </div>
      </ComponentCard>

      {/* Listado de Tarjetas */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-semibold text-gray-800 dark:text-white/90">
            {viewMode === "live"
              ? `Publicaciones Reales en LinkedIn (${filteredPosts.length} encontradas)`
              : `Plantillas Maestras Disponibles (${filteredPosts.length})`}
          </h3>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {viewMode === "live"
              ? `Palabra clave: "${searchKeyword}"`
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
              Consultando la red mediante Unipile con la cuenta {activeAccount?.name || "activa"}.
            </p>
          </div>
        ) : filteredPosts.length === 0 ? (
          <div className="py-16 text-center space-y-3 bg-white rounded-2xl border border-gray-200 dark:bg-gray-900 dark:border-gray-800 p-6">
            <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
              No se encontraron publicaciones para los filtros aplicados.
            </p>
            {viewMode === "live" && (
              <div className="space-y-2">
                <p className="text-xs text-gray-400">
                  Prueba buscando otra palabra clave o explora las 12 plantillas maestras virales.
                </p>
                <button
                  type="button"
                  onClick={() => setViewMode("templates")}
                  className="rounded-lg bg-brand-500 px-4 py-2 text-xs font-semibold text-white"
                >
                  Abrir Plantillas Maestras
                </button>
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
                  <div className="mb-3 flex items-start justify-between gap-2">
                    <div className="pr-2">
                      <div className="flex items-center gap-1.5">
                        <h4 className="font-semibold text-gray-900 dark:text-white text-sm line-clamp-1">
                          {post.author}
                        </h4>
                        {post.isLive && (
                          <span className="rounded bg-emerald-50 px-1.5 py-0.2 text-[9px] font-bold text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">
                            LIVE
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-gray-500 dark:text-gray-400 line-clamp-1 mt-0.5">
                        {post.authorHeadline}
                      </p>
                      <span className="text-[10px] text-gray-400 block mt-0.5">
                        {post.publishedDate} • {post.topic}
                      </span>
                    </div>
                    <span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-[11px] font-semibold text-brand-600 dark:bg-brand-950 dark:text-brand-300 shrink-0">
                      {getFormatLabel(post.format)}
                    </span>
                  </div>

                  <div className="mb-4 rounded-xl bg-gray-50 p-3 text-xs text-gray-700 dark:bg-white/3 dark:text-gray-300">
                    <p className="font-semibold text-gray-900 dark:text-white mb-1">
                      Gancho Principal (Hook):
                    </p>
                    <p className="italic leading-relaxed line-clamp-3">{post.hook}</p>
                  </div>

                  <div className="mb-5 grid grid-cols-3 gap-2 border-y border-gray-100 py-2.5 text-center dark:border-gray-800">
                    <div>
                      <span className="block text-[10px] text-gray-400 uppercase">Likes</span>
                      <span className="text-xs font-bold text-gray-800 dark:text-white">
                        {post.likes.toLocaleString()}
                      </span>
                    </div>
                    <div>
                      <span className="block text-[10px] text-gray-400 uppercase">Comentarios</span>
                      <span className="text-xs font-bold text-gray-800 dark:text-white">
                        {post.comments.toLocaleString()}
                      </span>
                    </div>
                    <div>
                      <span className="block text-[10px] text-gray-400 uppercase">
                        {post.isLive ? "Reposts" : "Ratio"}
                      </span>
                      <span className="text-xs font-bold text-brand-600 dark:text-brand-400">
                        {post.isLive ? post.shares.toLocaleString() : post.engagementRatio}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-gray-100 dark:border-gray-800">
                  <button
                    type="button"
                    onClick={() => setSelectedPostForModal(post)}
                    className="rounded-lg border border-gray-300 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/5"
                  >
                    Lectura Completa
                  </button>
                  <button
                    type="button"
                    onClick={() => handleModelWithAi(post)}
                    className="flex-1 rounded-lg bg-brand-500 py-2 text-center text-xs font-semibold text-white hover:bg-brand-600 transition"
                  >
                    Modelar con IA
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal de Lectura Completa */}
      {selectedPostForModal && (
        <div className="fixed inset-0 z-99999 flex items-center justify-center bg-black/60 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-theme-xl dark:bg-gray-900 border border-gray-200 dark:border-gray-800">
            <div className="flex items-start justify-between border-b border-gray-100 pb-4 dark:border-gray-800">
              <div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-semibold text-brand-600 dark:bg-brand-950 dark:text-brand-300">
                    {getFormatLabel(selectedPostForModal.format)}
                  </span>
                  {selectedPostForModal.isLive && (
                    <span className="rounded bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">
                      LinkedIn en Vivo
                    </span>
                  )}
                </div>
                <h3 className="mt-2 text-lg font-bold text-gray-900 dark:text-white">
                  {selectedPostForModal.author}
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {selectedPostForModal.authorHeadline} • {selectedPostForModal.publishedDate}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedPostForModal(null)}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 text-sm font-bold"
              >
                Cerrar
              </button>
            </div>

            <div className="my-5 space-y-4">
              <div className="rounded-xl bg-gray-50 p-4 text-xs font-mono text-gray-800 leading-relaxed whitespace-pre-wrap dark:bg-gray-800/50 dark:text-gray-200">
                {selectedPostForModal.fullContent}
              </div>

              {selectedPostForModal.linkedinUrl && (
                <div className="flex items-center justify-between p-3 rounded-xl border border-gray-200 bg-gray-50/50 dark:border-gray-800 dark:bg-gray-900/40 text-xs">
                  <span className="text-gray-600 dark:text-gray-400">Publicación original en la red:</span>
                  <a
                    href={selectedPostForModal.linkedinUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold text-brand-600 hover:underline dark:text-brand-400"
                  >
                    Ver en LinkedIn &rarr;
                  </a>
                </div>
              )}

              {selectedPostForModal.format === "carousel" && selectedPostForModal.carouselSlides && (
                <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-800">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-brand-600 mb-2">
                    Estructura de Diapositivas ({selectedPostForModal.carouselSlides.length} slides):
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

              {selectedPostForModal.format === "image" && selectedPostForModal.imagePrompt && (
                <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-800">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-brand-600 mb-1">
                    Prompt Visual para IA:
                  </h4>
                  <p className="text-xs font-mono text-gray-700 dark:text-gray-300">
                    {selectedPostForModal.imagePrompt}
                  </p>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 border-t border-gray-100 pt-4 dark:border-gray-800">
              <button
                type="button"
                onClick={() => setSelectedPostForModal(null)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300"
              >
                Regresar
              </button>
              <button
                type="button"
                onClick={() => {
                  handleModelWithAi(selectedPostForModal);
                }}
                className="rounded-lg bg-brand-500 px-5 py-2 text-xs font-semibold text-white hover:bg-brand-600 transition"
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
