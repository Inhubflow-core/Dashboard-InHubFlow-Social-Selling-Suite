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
  const [dragOverDateKey, setDragOverDateKey] = useState<string | null>(null);
  const [selectedPostDetails, setSelectedPostDetails] = useState<CreatedPost | null>(null);
  const [justRescheduledInfo, setJustRescheduledInfo] = useState<{ title: string; date: string } | null>(null);

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
    const post = posts.find((p) => p.id === draggedPostId);
    let timePart = "09:30:00.000Z";
    if (post?.scheduledAt && post.scheduledAt.includes("T")) {
      const parts = post.scheduledAt.split("T");
      if (parts[1]) timePart = parts[1];
    }
    const newScheduledDate = `${dateKey}T${timePart}`;
    updatePost(draggedPostId, {
      scheduledAt: newScheduledDate,
      status: "scheduled",
    });
    if (post) {
      setJustRescheduledInfo({
        title: post.title,
        date: dateKey,
      });
      setTimeout(() => setJustRescheduledInfo(null), 4000);
    }
    setDraggedPostId(null);
    setDragOverDateKey(null);
  };

  return (
    <div className="space-y-6">
      <PageBreadcrumb pageTitle="Calendario Editorial Drag & Drop" />

      <ComponentCard
        title="Planificación Editorial & Horarios Óptimos en LinkedIn"
        desc="Arrastra cualquier publicación entre días de la semana o del mes para ajustar automáticamente su fecha y hora de emisión."
      >
        <div className="space-y-4">
          {/* Alerta de confirmación al reprogramar */}
          {justRescheduledInfo && (
            <div className="rounded-xl bg-emerald-50 p-3 text-xs text-emerald-800 border border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300 flex items-center justify-between transition">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>
                  Publicación <strong>"{justRescheduledInfo.title}"</strong> reprogramada exitosamente para el día{" "}
                  <strong>{justRescheduledInfo.date}</strong>.
                </span>
              </div>
              <button
                type="button"
                onClick={() => setJustRescheduledInfo(null)}
                className="text-emerald-600 hover:text-emerald-900 font-bold ml-2"
              >
                ✕
              </button>
            </div>
          )}

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
                const isDropTarget = dragOverDateKey === day.dateKey;

                return (
                  <div
                    key={day.dateKey}
                    onDragOver={(e) => {
                      e.preventDefault();
                      if (draggedPostId && dragOverDateKey !== day.dateKey) {
                        setDragOverDateKey(day.dateKey);
                      }
                    }}
                    onDragLeave={() => {
                      if (dragOverDateKey === day.dateKey) {
                        setDragOverDateKey(null);
                      }
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      handleDropOnDay(day.dateKey);
                    }}
                    className={`flex flex-col min-h-[380px] rounded-2xl border p-3 transition-all duration-150 ${
                      isDropTarget
                        ? "border-2 border-brand-500 bg-brand-100/70 dark:bg-brand-950/60 dark:border-brand-400 ring-4 ring-brand-500/20 scale-[1.01] shadow-md z-10"
                        : day.isToday
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
                          onDragStart={(e) => {
                            e.stopPropagation();
                            handleDragStart(post.id);
                          }}
                          onDragEnd={() => {
                            setDraggedPostId(null);
                            setDragOverDateKey(null);
                          }}
                          onClick={() => setSelectedPostDetails(post)}
                          className={`cursor-grab active:cursor-grabbing rounded-xl border border-gray-200 bg-white p-3 shadow-theme-xs hover:border-brand-500 transition dark:border-gray-700 dark:bg-gray-800 select-none ${
                            draggedPostId === post.id
                              ? "opacity-30 scale-95 border-dashed border-brand-500"
                              : ""
                          }`}
                          title={`Arrastra para reprogramar • Clic para ver detalles: ${post.title}`}
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
                        <div
                          className={`h-full min-h-[160px] flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-3 text-center text-[11px] transition ${
                            isDropTarget
                              ? "border-brand-500 bg-brand-100/50 text-brand-700 font-bold dark:bg-brand-950/60 dark:text-brand-300"
                              : "border-gray-200 text-gray-400 dark:border-gray-800"
                          }`}
                        >
                          <span>{isDropTarget ? "Soltar publicación aquí" : "Arrastra un post aquí"}</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* Vista Mensual con Drag & Drop Completo */
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2.5 pt-2">
              {currentMonthDays.map((d) => {
                const dayPosts = scheduledPosts.filter((p) => {
                  if (!p.scheduledAt) return false;
                  return p.scheduledAt.startsWith(d.dateKey);
                });
                const isDropTarget = dragOverDateKey === d.dateKey;

                return (
                  <div
                    key={d.dateKey}
                    onDragOver={(e) => {
                      e.preventDefault();
                      if (draggedPostId && dragOverDateKey !== d.dateKey) {
                        setDragOverDateKey(d.dateKey);
                      }
                    }}
                    onDragLeave={() => {
                      if (dragOverDateKey === d.dateKey) {
                        setDragOverDateKey(null);
                      }
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      handleDropOnDay(d.dateKey);
                    }}
                    className={`min-h-[115px] p-2.5 rounded-xl border flex flex-col justify-between transition-all duration-150 ${
                      isDropTarget
                        ? "border-2 border-brand-500 bg-brand-100/70 dark:bg-brand-950/60 dark:border-brand-400 ring-4 ring-brand-500/20 scale-[1.02] shadow-md z-10"
                        : d.isToday
                        ? "border-brand-500 bg-brand-50/20 dark:border-brand-500 dark:bg-brand-950/20"
                        : d.isPeak
                        ? "border-brand-100 bg-brand-25/20 dark:border-brand-900/30 dark:bg-brand-950/10"
                        : "border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-gray-800 dark:text-white">
                          {d.dayNumber}
                        </span>
                        {d.isToday && (
                          <span className="rounded bg-brand-500 px-1 py-0.2 text-[8px] font-bold text-white uppercase">
                            Hoy
                          </span>
                        )}
                      </div>
                      {d.isPeak && (
                        <span className="h-1.5 w-1.5 rounded-full bg-brand-500" title="Día pico de interacción B2B"></span>
                      )}
                    </div>

                    <div className="space-y-1.5 my-1.5 flex-1">
                      {dayPosts.map((p) => (
                        <div
                          key={p.id}
                          draggable
                          onDragStart={(e) => {
                            e.stopPropagation();
                            handleDragStart(p.id);
                          }}
                          onDragEnd={() => {
                            setDraggedPostId(null);
                            setDragOverDateKey(null);
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedPostDetails(p);
                          }}
                          className={`text-[10px] bg-brand-50 text-brand-700 font-semibold p-1.5 rounded-lg truncate cursor-grab active:cursor-grabbing border border-brand-200/70 hover:bg-brand-100 hover:border-brand-400 dark:bg-brand-950 dark:text-brand-300 dark:border-brand-800/80 transition shadow-2xs select-none ${
                            draggedPostId === p.id
                              ? "opacity-30 scale-95 border-dashed border-brand-500"
                              : ""
                          }`}
                          title={`Arrastra para reprogramar • Clic para ver detalles: ${p.title}`}
                        >
                          <div className="flex items-center gap-1.5 truncate">
                            <span
                              className={`h-1.5 w-1.5 rounded-full shrink-0 ${
                                p.status === "published" ? "bg-emerald-500" : "bg-brand-500"
                              }`}
                            ></span>
                            <span className="truncate">{p.title}</span>
                          </div>
                        </div>
                      ))}

                      {isDropTarget && dayPosts.length === 0 && (
                        <div className="h-full min-h-[45px] flex items-center justify-center border-2 border-dashed border-brand-400 rounded-lg text-[10px] text-brand-600 dark:text-brand-400 font-medium">
                          Soltar aquí
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-[9px] text-gray-400 pt-1 border-t border-gray-100/60 dark:border-gray-800/60">
                      <span>{dayPosts.length > 0 ? `${dayPosts.length} post(s)` : ""}</span>
                      {d.isPeak && <span className="text-brand-500 font-medium text-[8px]">Pico B2B</span>}
                    </div>
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
