"use client";

import ComponentCard from "@/components/common/ComponentCard";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { useCreatedPosts } from "@/lib/viral-posts/store";
import type { CreatedPost, PostFormat, PostStatus } from "@/lib/viral-posts/types";
import { useState } from "react";

export default function PostsListPage() {
  const { posts, isLoaded, updatePost, deletePost } = useCreatedPosts();
  const [filterStatus, setFilterStatus] = useState<"all" | PostStatus>("all");
  const [filterFormat, setFilterFormat] = useState<"all" | PostFormat>("all");
  const [publishingId, setPublishingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ id: string; type: "success" | "error"; message: string } | null>(null);

  const filteredPosts = posts.filter((p) => {
    const matchesStatus = filterStatus === "all" || p.status === filterStatus;
    const matchesFormat = filterFormat === "all" || p.format === filterFormat;
    return matchesStatus && matchesFormat;
  });

  const getFormatBadge = (fmt: PostFormat) => {
    switch (fmt) {
      case "text":
        return { label: "Solo Texto", color: "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300" };
      case "image":
        return { label: "Texto + Imagen", color: "bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300" };
      case "carousel":
        return { label: "Carrusel PDF", color: "bg-brand-50 text-brand-600 dark:bg-brand-950/40 dark:text-brand-300" };
    }
  };

  const getStatusBadge = (status: PostStatus) => {
    switch (status) {
      case "published":
        return { label: "Publicado", color: "bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-400" };
      case "scheduled":
        return { label: "Programado", color: "bg-brand-50 text-brand-600 dark:bg-brand-950/40 dark:text-brand-300" };
      case "draft":
        return { label: "Borrador", color: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300" };
      case "failed":
        return { label: "Error", color: "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400" };
    }
  };

  const handlePublishNow = async (post: CreatedPost) => {
    setPublishingId(post.id);
    setFeedback(null);

    try {
      const res = await fetch("/api/unipile/posts/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          account_id: post.targetAccountId,
          text: post.content,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "No se pudo despachar el post a LinkedIn.");
      }

      updatePost(post.id, {
        status: "published",
        publishedAt: new Date().toISOString(),
        linkedinPostId: data.postId,
        metrics: { likes: 0, comments: 0, impressions: 0, leadsCaptured: 0 },
      });

      setFeedback({
        id: post.id,
        type: "success",
        message: "¡Publicado en LinkedIn con éxito!",
      });
      setTimeout(() => setFeedback(null), 4000);
    } catch (err: any) {
      console.error("[Publish Now Error]:", err);
      setFeedback({
        id: post.id,
        type: "error",
        message: err.message || "Error al conectar con la red de LinkedIn.",
      });
    } finally {
      setPublishingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <PageBreadcrumb pageTitle="Gestión de Publicaciones" />

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-semibold text-gray-800 dark:text-white/90">
            Cola Editorial y Contenido Emitido
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Control central de publicaciones programadas, borradores y métricas de impacto en LinkedIn.
          </p>
        </div>
        <a
          href="/viral-posts/create"
          className="rounded-xl bg-brand-500 px-4 py-2.5 text-xs font-semibold text-white hover:bg-brand-600 transition shadow-theme-xs"
        >
          + Crear Nueva Publicación
        </a>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-white rounded-2xl border border-gray-200 dark:bg-gray-900 dark:border-gray-800">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-gray-500 mr-2">Estado:</span>
          {[
            { id: "all", label: "Todos" },
            { id: "scheduled", label: "Programados" },
            { id: "published", label: "Publicados" },
            { id: "draft", label: "Borradores" },
          ].map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setFilterStatus(s.id as "all" | PostStatus)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                filterStatus === s.id
                  ? "bg-brand-500 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-gray-500 mr-2">Formato:</span>
          {[
            { id: "all", label: "Todos" },
            { id: "text", label: "Texto" },
            { id: "image", label: "Imagen" },
            { id: "carousel", label: "Carrusel" },
          ].map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilterFormat(f.id as "all" | PostFormat)}
              className={`rounded-lg px-2.5 py-1 text-xs font-medium transition ${
                filterFormat === f.id
                  ? "border border-brand-500 text-brand-600 bg-brand-50 dark:bg-brand-950 dark:text-brand-300"
                  : "text-gray-500 hover:text-gray-900 dark:text-gray-400"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <ComponentCard title={`Publicaciones (${filteredPosts.length})`}>
        {!isLoaded ? (
          <p className="text-xs text-gray-400 py-4">Cargando publicaciones...</p>
        ) : filteredPosts.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
              No hay publicaciones que coincidan con los filtros seleccionados.
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Modela una publicación viral desde el radar o redacta una nueva con IA.
            </p>
            <div className="mt-4 flex items-center justify-center gap-3">
              <a
                href="/viral-posts/radar"
                className="rounded-lg border border-gray-300 px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300"
              >
                Explorar Radar Viral
              </a>
              <a
                href="/viral-posts/create"
                className="rounded-lg bg-brand-500 px-4 py-2 text-xs font-semibold text-white hover:bg-brand-600 transition"
              >
                Crear con IA
              </a>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredPosts.map((post) => {
              const formatBadge = getFormatBadge(post.format);
              const statusBadge = getStatusBadge(post.status);
              const isCurrentlyPublishing = publishingId === post.id;
              const postFeedback = feedback?.id === post.id ? feedback : null;

              return (
                <div
                  key={post.id}
                  className="rounded-2xl border border-gray-200 bg-white p-5 hover:border-brand-500/60 transition shadow-theme-xs dark:border-gray-800 dark:bg-gray-900/60"
                >
                  <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                    <div className="space-y-2 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${formatBadge.color}`}>
                          {formatBadge.label}
                        </span>
                        <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${statusBadge.color}`}>
                          {statusBadge.label}
                        </span>
                        {post.leadMagnetKeyword && (
                          <span className="rounded bg-brand-50 px-2 py-0.5 text-[11px] font-mono font-semibold text-brand-700 dark:bg-brand-950 dark:text-brand-300">
                            Keyword: {post.leadMagnetKeyword}
                          </span>
                        )}
                        <span className="text-[11px] text-gray-400">
                          {post.scheduledAt
                            ? `Programado: ${new Date(post.scheduledAt).toLocaleDateString()} ${new Date(post.scheduledAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
                            : post.publishedAt
                            ? `Publicado: ${new Date(post.publishedAt).toLocaleDateString()}`
                            : `Creado: ${new Date(post.createdAt).toLocaleDateString()}`}
                        </span>
                      </div>

                      <h4 className="font-semibold text-gray-900 dark:text-white text-sm">
                        {post.title}
                      </h4>

                      <p className="text-xs text-gray-600 dark:text-gray-300 line-clamp-3 font-mono leading-relaxed whitespace-pre-wrap">
                        {post.content}
                      </p>

                      {postFeedback && (
                        <div
                          className={`mt-2 p-2 rounded-lg text-xs font-medium border ${
                            postFeedback.type === "success"
                              ? "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300"
                              : "bg-red-50 text-red-800 border-red-200 dark:bg-red-950/40 dark:text-red-300"
                          }`}
                        >
                          {postFeedback.message}
                        </div>
                      )}

                      {post.status === "published" && post.metrics && (
                        <div className="flex items-center gap-5 pt-2 text-xs text-gray-500 border-t border-gray-100 dark:border-gray-800">
                          <span>
                            <strong className="text-gray-900 dark:text-white">{post.metrics.likes}</strong> Likes
                          </span>
                          <span>
                            <strong className="text-gray-900 dark:text-white">{post.metrics.comments}</strong> Comentarios
                          </span>
                          <span>
                            <strong className="text-gray-900 dark:text-white">{post.metrics.impressions}</strong> Impresiones
                          </span>
                          <span className="text-brand-600 font-semibold dark:text-brand-400">
                            {post.metrics.leadsCaptured} Leads Captados
                          </span>
                          {post.linkedinPostId && (
                            <span className="text-[10px] text-gray-400 font-mono">
                              ID: {post.linkedinPostId}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex lg:flex-col items-center gap-2 shrink-0">
                      {post.status !== "published" && (
                        <button
                          type="button"
                          disabled={isCurrentlyPublishing}
                          onClick={() => handlePublishNow(post)}
                          className="w-full rounded-xl bg-brand-500 px-3.5 py-2 text-xs font-semibold text-white hover:bg-brand-600 transition flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                          {isCurrentlyPublishing ? (
                            <>
                              <span className="h-3 w-3 border-2 border-white/40 border-t-white rounded-full animate-spin"></span>
                              Publicando...
                            </>
                          ) : (
                            "Publicar Inmediato"
                          )}
                        </button>
                      )}
                      <a
                        href="/viral-posts/calendar"
                        className="w-full text-center rounded-xl border border-gray-200 px-3.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300"
                      >
                        Ver en Calendario
                      </a>
                      <button
                        type="button"
                        onClick={() => deletePost(post.id)}
                        className="w-full rounded-xl border border-red-200 px-3.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 dark:border-red-900/40 dark:text-red-400"
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </ComponentCard>
    </div>
  );
}
