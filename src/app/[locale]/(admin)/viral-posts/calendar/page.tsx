"use client";

import ComponentCard from "@/components/common/ComponentCard";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { useCreatedPosts } from "@/lib/viral-posts/store";
import type { CreatedPost } from "@/lib/viral-posts/types";
import { useMemo, useState } from "react";

export default function EditorialCalendarPage() {
  const { posts, updatePost } = useCreatedPosts();
  const [viewMode, setViewMode] = useState<"month" | "week">("week");
  const [draggedPostId, setDraggedPostId] = useState<string | null>(null);
  const [selectedPostDetails, setSelectedPostDetails] = useState<CreatedPost | null>(null);

  // Calcular dinámicamente los días de la semana actual (Lunes a Domingo)
  const currentWeekDays = useMemo(() => {
    const today = new Date();
    const currentDay = today.getDay(); // 0 es Domingo, 1 es Lunes
    // Calcular distancia al Lunes de esta semana
    const distanceToMonday = currentDay === 0 ? -6 : 1 - currentDay;

    const monday = new Date(today);
    monday.setDate(today.getDate() + distanceToMonday);

    const days = [];
    const dayNames = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);

      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const dayNum = String(d.getDate()).padStart(2, "0");
      const dateKey = `${year}-${month}-${dayNum}`;

      // Martes (i=1), Miércoles (i=2), Jueves (i=3) son picos B2B
      const isPeak = i === 1 || i === 2 || i === 3;

      days.push({
        dayNumber: d.getDate(),
        monthName: d.toLocaleString("es-ES", { month: "short" }),
        name: dayNames[i],
        dateKey,
        isPeak,
        peakTime: "08:30 - 10:30",
        isToday: d.toDateString() === today.toDateString(),
      });
    }

    return days;
  }, []);

  // Calcular días del mes actual para la vista mensual
  const currentMonthDays = useMemo(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    const days = [];
    for (let d = 1; d <= lastDay.getDate(); d++) {
      const dateObj = new Date(year, month, d);
      const dateKey = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      const dayOfWeek = dateObj.getDay();
      const isPeak = dayOfWeek === 2 || dayOfWeek === 3 || dayOfWeek === 4;

      days.push({
        dayNumber: d,
        dateKey,
        isPeak,
        isToday: dateObj.toDateString() === today.toDateString(),
      });
    }
    return days;
  }, []);

  const scheduledPosts = useMemo(() => {
    return posts.filter((p) => p.status === "scheduled" || p.status === "published");
  }, [posts]);

  const handleDragStart = (postId: string) => {
    setDraggedPostId(postId);
  };

  const handleDropOnDay = (dateKey: string) => {
    if (!draggedPostId) return;
    const newScheduledDate = `${dateKey}T09:30:00.000Z`;
    updatePost(draggedPostId, {
      scheduledAt: newScheduledDate,
      status: "scheduled",
    });
    setDraggedPostId(null);
  };

  return (
    <div className="space-y-6">
      <PageBreadcrumb pageTitle="Calendario Editorial Drag & Drop" />

      <ComponentCard
        title="Planificación Editorial & Horarios Óptimos en LinkedIn"
        desc="Arrastra cualquier publicación entre días de la semana para ajustar automáticamente su fecha y hora de emisión."
      >
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-gray-100 dark:border-gray-800">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-brand-500"></span>
                <span className="text-xs text-gray-700 dark:text-gray-300 font-medium">
                  Franja Óptima B2B (Mar - Jue 08:30 a 10:30 AM)
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-emerald-500"></span>
                <span className="text-xs text-gray-500 dark:text-gray-400">Publicado</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-brand-400"></span>
                <span className="text-xs text-gray-500 dark:text-gray-400">Programado</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setViewMode("week")}
                className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition ${
                  viewMode === "week"
                    ? "bg-brand-500 text-white shadow-theme-xs"
                    : "border border-gray-200 text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300"
                }`}
              >
                Semana
              </button>
              <button
                type="button"
                onClick={() => setViewMode("month")}
                className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition ${
                  viewMode === "month"
                    ? "bg-brand-500 text-white shadow-theme-xs"
                    : "border border-gray-200 text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300"
                }`}
              >
                Mes
              </button>
              <a
                href="/viral-posts/create"
                className="rounded-lg bg-gray-900 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-gray-800 dark:bg-white dark:text-gray-900 transition"
              >
                + Programar Post
              </a>
            </div>
          </div>

          {/* Vista Semanal con Drag & Drop */}
          {viewMode === "week" ? (
            <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
              {currentWeekDays.map((day) => {
                const dayPosts = scheduledPosts.filter((p) => {
                  if (!p.scheduledAt) return false;
                  return p.scheduledAt.startsWith(day.dateKey);
                });

                return (
                  <div
                    key={day.dateKey}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => handleDropOnDay(day.dateKey)}
                    className={`flex flex-col min-h-[380px] rounded-2xl border p-3 transition ${
                      day.isToday
                        ? "border-brand-500 bg-brand-50/20 dark:border-brand-500/60 dark:bg-brand-950/30"
                        : day.isPeak
                        ? "border-brand-200 bg-brand-25/30 dark:border-brand-900/40 dark:bg-brand-950/10"
                        : "border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900"
                    }`}
                  >
                    <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-gray-800">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <p className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase">
                            {day.name}
                          </p>
                          {day.isToday && (
                            <span className="rounded bg-brand-500 px-1 py-0.2 text-[8px] font-bold text-white uppercase">
                              Hoy
                            </span>
                          )}
                        </div>
                        <h4 className="text-base font-bold text-gray-900 dark:text-white mt-0.5">
                          {day.dayNumber} {day.monthName}
                        </h4>
                      </div>
                      {day.isPeak && (
                        <span className="rounded bg-brand-500 px-1.5 py-0.5 text-[9px] font-bold text-white uppercase tracking-wider">
                          Pico B2B
                        </span>
                      )}
                    </div>

                    {day.isPeak && (
                      <div className="my-2 rounded-lg bg-white/90 p-1.5 text-center text-[10px] text-brand-700 font-semibold border border-brand-100 dark:bg-gray-800/80 dark:text-brand-300 dark:border-brand-900/60">
                        Horario: {day.peakTime}
                      </div>
                    )}

                    <div className="flex-1 space-y-2.5 pt-2">
                      {dayPosts.map((post: CreatedPost) => (
                        <div
                          key={post.id}
                          draggable
                          onDragStart={() => handleDragStart(post.id)}
                          onClick={() => setSelectedPostDetails(post)}
                          className="cursor-grab active:cursor-grabbing rounded-xl border border-gray-200 bg-white p-3 shadow-theme-xs hover:border-brand-500 transition dark:border-gray-700 dark:bg-gray-800"
                        >
                          <div className="flex items-center justify-between gap-1 mb-1">
                            <span
                              className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${
                                post.format === "carousel"
                                  ? "bg-brand-50 text-brand-600 dark:bg-brand-950 dark:text-brand-300"
                                  : post.format === "image"
                                  ? "bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300"
                                  : "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                              }`}
                            >
                              {post.format}
                            </span>
                            <span
                              className={`h-2 w-2 rounded-full ${
                                post.status === "published" ? "bg-emerald-500" : "bg-brand-500"
                              }`}
                            ></span>
                          </div>

                          <p className="text-xs font-semibold text-gray-800 dark:text-white line-clamp-2">
                            {post.title}
                          </p>

                          <div className="mt-2 flex items-center justify-between text-[10px] text-gray-400 border-t border-gray-100 dark:border-gray-700 pt-1.5">
                            <span>
                              {post.scheduledAt
                                ? new Date(post.scheduledAt).toLocaleTimeString([], {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })
                                : "09:30 AM"}
                            </span>
                            {post.leadMagnetKeyword && (
                              <span className="font-mono text-brand-600 dark:text-brand-400 font-semibold">
                                {post.leadMagnetKeyword}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}

                      {dayPosts.length === 0 && (
                        <div className="h-full min-h-[160px] flex flex-col items-center justify-center border-2 border-dashed border-gray-200 rounded-xl p-3 text-center text-[11px] text-gray-400 dark:border-gray-800">
                          <span>Arrastra un post aquí</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* Vista Mensual */
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2.5 pt-2">
              {currentMonthDays.map((d) => {
                const dayPosts = scheduledPosts.filter((p) => {
                  if (!p.scheduledAt) return false;
                  return p.scheduledAt.startsWith(d.dateKey);
                });

                return (
                  <div
                    key={d.dateKey}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => handleDropOnDay(d.dateKey)}
                    className={`min-h-[110px] p-2.5 rounded-xl border flex flex-col justify-between transition ${
                      d.isToday
                        ? "border-brand-500 bg-brand-50/20 dark:border-brand-500 dark:bg-brand-950/20"
                        : d.isPeak
                        ? "border-brand-100 bg-brand-25/20 dark:border-brand-900/30 dark:bg-brand-950/10"
                        : "border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-gray-800 dark:text-white">
                        {d.dayNumber}
                      </span>
                      {d.isPeak && (
                        <span className="h-1.5 w-1.5 rounded-full bg-brand-500"></span>
                      )}
                    </div>

                    <div className="space-y-1 my-1">
                      {dayPosts.map((p) => (
                        <div
                          key={p.id}
                          onClick={() => setSelectedPostDetails(p)}
                          className="text-[10px] bg-brand-50 text-brand-700 font-semibold p-1 rounded truncate cursor-pointer hover:bg-brand-100 dark:bg-brand-950 dark:text-brand-300"
                        >
                          {p.title}
                        </div>
                      ))}
                    </div>

                    <span className="text-[9px] text-gray-400">
                      {dayPosts.length > 0 ? `${dayPosts.length} post(s)` : ""}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </ComponentCard>

      {/* Modal de Detalle de Publicación */}
      {selectedPostDetails && (
        <div className="fixed inset-0 z-99999 flex items-center justify-center bg-black/60 p-4">
          <div className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-theme-xl dark:bg-gray-900 border border-gray-200 dark:border-gray-800 space-y-4">
            <div className="flex items-start justify-between border-b border-gray-100 pb-3 dark:border-gray-800">
              <div>
                <span className="text-[10px] uppercase font-bold text-brand-600">
                  {selectedPostDetails.format} • {selectedPostDetails.status}
                </span>
                <h3 className="text-base font-bold text-gray-900 dark:text-white mt-0.5">
                  {selectedPostDetails.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedPostDetails(null)}
                className="text-gray-400 hover:text-gray-600 font-bold"
              >
                ✕
              </button>
            </div>

            <div className="rounded-xl bg-gray-50 p-3.5 font-mono text-xs text-gray-700 leading-relaxed whitespace-pre-wrap dark:bg-gray-800/60 dark:text-gray-300">
              {selectedPostDetails.content}
            </div>

            {selectedPostDetails.scheduledAt && (
              <p className="text-xs text-gray-500">
                Horario de emisión:{" "}
                <strong>
                  {new Date(selectedPostDetails.scheduledAt).toLocaleString("es-ES")}
                </strong>
              </p>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-gray-100 dark:border-gray-800">
              <button
                type="button"
                onClick={() => setSelectedPostDetails(null)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
