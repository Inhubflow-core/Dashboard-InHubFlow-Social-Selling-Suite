"use client";

import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { useCreatedPosts } from "@/lib/viral-posts/store";
import type { CreatedPost } from "@/lib/viral-posts/types";
import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import Link from "next/link";

const WEEKDAYS = ["LUN", "MAR", "MIÉ", "JUE", "VIE", "SÁB", "DOM"];

export default function EditorialCalendarPage() {
  const { posts, updatePost } = useCreatedPosts();
  const [viewMode, setViewMode] = useState<"month" | "week">("month");
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [statusFilter, setStatusFilter] = useState<"all" | "scheduled" | "published">("all");
  const [draggedPostId, setDraggedPostId] = useState<string | null>(null);
  const [dragOverDateKey, setDragOverDateKey] = useState<string | null>(null);
  const [selectedPostDetails, setSelectedPostDetails] = useState<CreatedPost | null>(null);
  const [justRescheduledInfo, setJustRescheduledInfo] = useState<{ title: string; date: string } | null>(null);

  // Navegación de periodos (Anterior, Siguiente, Hoy)
  const handlePrev = () => {
    setCurrentDate((prev) => {
      const d = new Date(prev);
      if (viewMode === "month") {
        d.setMonth(d.getMonth() - 1);
      } else {
        d.setDate(d.getDate() - 7);
      }
      return d;
    });
  };

  const handleNext = () => {
    setCurrentDate((prev) => {
      const d = new Date(prev);
      if (viewMode === "month") {
        d.setMonth(d.getMonth() + 1);
      } else {
        d.setDate(d.getDate() + 7);
      }
      return d;
    });
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  // Título del periodo actual (ej. "Octubre De 2026")
  const periodTitle = useMemo(() => {
    const months = [
      "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
      "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
    ];
    const year = currentDate.getFullYear();
    const monthName = months[currentDate.getMonth()];

    if (viewMode === "month") {
      return `${monthName} De ${year}`;
    }

    const day = currentDate.getDay();
    const diffToMonday = (day === 0 ? -6 : 1) - day;
    const monday = new Date(currentDate);
    monday.setDate(currentDate.getDate() + diffToMonday);

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    const mondayMonth = months[monday.getMonth()].slice(0, 3);
    const sundayMonth = months[sunday.getMonth()].slice(0, 3);

    if (monday.getMonth() === sunday.getMonth()) {
      return `${monday.getDate()} - ${sunday.getDate()} de ${monthName} ${year}`;
    }
    return `${monday.getDate()} ${mondayMonth} - ${sunday.getDate()} ${sundayMonth} ${year}`;
  }, [currentDate, viewMode]);

  // Cuadrícula Mensual de 7 columnas estilo #b2b con padding de días anterior/siguiente
  const calendarMonthDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);

    // Días de la semana: Domingo=0 … Sábado=6 → Lunes como 0
    let startDayOfWeek = firstDayOfMonth.getDay() - 1;
    if (startDayOfWeek === -1) startDayOfWeek = 6;

    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

    const days: Array<{
      date: Date;
      dateKey: string;
      dayNumber: number;
      isCurrentMonth: boolean;
      isToday: boolean;
      isPeak: boolean;
    }> = [];

    const createDay = (date: Date, isCurrentMonth: boolean) => {
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, "0");
      const d = String(date.getDate()).padStart(2, "0");
      const dateKey = `${y}-${m}-${d}`;
      const dayOfWeek = date.getDay();
      // Martes (2), Miércoles (3), Jueves (4) picos B2B
      const isPeak = dayOfWeek === 2 || dayOfWeek === 3 || dayOfWeek === 4;

      return {
        date,
        dateKey,
        dayNumber: date.getDate(),
        isCurrentMonth,
        isToday: dateKey === todayStr,
        isPeak,
      };
    };

    // Días de relleno del mes anterior (para que coincida el día de la semana)
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      days.push(createDay(new Date(year, month - 1, prevMonthLastDay - i), false));
    }

    // Días del mes actual
    for (let i = 1; i <= lastDayOfMonth.getDate(); i++) {
      days.push(createDay(new Date(year, month, i), true));
    }

    // Días de relleno del mes siguiente para completar la cuadrícula de 35 o 42 celdas
    const totalCells = days.length <= 35 ? 35 : 42;
    const remainingDays = totalCells - days.length;
    for (let i = 1; i <= remainingDays; i++) {
      days.push(createDay(new Date(year, month + 1, i), false));
    }

    return days;
  }, [currentDate]);

  // Calcular dinámicamente los días de la semana actual (Lunes a Domingo) para la vista semanal
  const currentWeekDays = useMemo(() => {
    const currentDay = currentDate.getDay();
    const distanceToMonday = currentDay === 0 ? -6 : 1 - currentDay;

    const monday = new Date(currentDate);
    monday.setDate(currentDate.getDate() + distanceToMonday);

    const today = new Date();
    const days = [];
    const dayNames = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);

      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const dayNum = String(d.getDate()).padStart(2, "0");
      const dateKey = `${year}-${month}-${dayNum}`;

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
  }, [currentDate]);

  // Filtrado de publicaciones por estado
  const filteredPosts = useMemo(() => {
    return posts.filter((p) => {
      if (p.status !== "scheduled" && p.status !== "published") return false;
      if (statusFilter === "scheduled") return p.status === "scheduled";
      if (statusFilter === "published") return p.status === "published";
      return true;
    });
  }, [posts, statusFilter]);

  const totalActiveCount = useMemo(() => {
    return posts.filter((p) => p.status === "scheduled" || p.status === "published").length;
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
      <PageBreadcrumb pageTitle="Calendario Editorial" />

      {/* Alerta de confirmación al reprogramar */}
      {justRescheduledInfo && (
        <div className="rounded-2xl bg-emerald-50 p-3.5 text-xs text-emerald-800 border border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2.5">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>
              Publicación <strong>"{justRescheduledInfo.title}"</strong> reprogramada exitosamente para el día{" "}
              <strong>{justRescheduledInfo.date}</strong>.
            </span>
          </div>
          <button
            type="button"
            onClick={() => setJustRescheduledInfo(null)}
            className="text-emerald-600 hover:text-emerald-900 dark:text-emerald-400 font-bold ml-2"
          >
            ✕
          </button>
        </div>
      )}

      {/* Contenedor Principal del Calendario */}
      <div className="rounded-3xl border border-gray-200/80 bg-white p-5 sm:p-6 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900 space-y-6">
        {/* Cabecera Superior: Título, Contador, Selector de Vista y Botón Programar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
                Calendario
              </h1>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-brand-50 text-brand-600 border border-brand-200/60 dark:bg-brand-950/60 dark:text-brand-300 dark:border-brand-800/80">
                {totalActiveCount} {totalActiveCount === 1 ? "publicación" : "publicaciones"}
              </span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Planificación editorial, carruseles de valor y mejores franjas horarias en LinkedIn.
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {/* Selector de Modo: Mes | Semana */}
            <div className="flex items-center rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50/60 dark:bg-gray-950/40 p-1 shadow-2xs">
              <button
                type="button"
                onClick={() => setViewMode("month")}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                  viewMode === "month"
                    ? "bg-brand-500 text-white shadow-xs"
                    : "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                }`}
              >
                Mes
              </button>
              <button
                type="button"
                onClick={() => setViewMode("week")}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                  viewMode === "week"
                    ? "bg-brand-500 text-white shadow-xs"
                    : "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                }`}
              >
                Semana
              </button>
            </div>

            {/* Botón de Acción Principal */}
            <Link
              href="/viral-posts/create"
              className="inline-flex items-center gap-1.5 rounded-xl bg-brand-500 px-4 py-2 text-xs font-semibold text-white hover:bg-brand-600 shadow-xs transition"
            >
              <Plus size={15} />
              Programar Post
            </Link>
          </div>
        </div>

        {/* Barra de Navegación del Mes & Filtros (Estilo exacto #b2b) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
          {/* Navegación temporal: Flechas + Hoy + Nombre del Mes */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-2xs p-1">
              <button
                type="button"
                onClick={handlePrev}
                className="p-1.5 rounded-lg text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                title="Anterior"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                type="button"
                onClick={handleToday}
                className="px-3 py-1 rounded-lg text-xs font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                Hoy
              </button>
              <button
                type="button"
                onClick={handleNext}
                className="p-1.5 rounded-lg text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                title="Siguiente"
              >
                <ChevronRight size={16} />
              </button>
            </div>

            <h2 className="text-lg sm:text-xl font-bold tracking-tight text-gray-900 dark:text-white min-w-[190px]">
              {periodTitle}
            </h2>
          </div>

          {/* Filtros de Estado: Todas | Programadas | Publicadas */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="inline-flex rounded-xl border border-gray-200 dark:border-gray-800 p-1 bg-gray-50 dark:bg-gray-950/40 text-xs shadow-2xs">
              {[
                { id: "all", label: "Todas" },
                { id: "scheduled", label: "Programadas" },
                { id: "published", label: "Publicadas" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setStatusFilter(tab.id as any)}
                  className={`px-3 py-1 font-semibold rounded-lg transition ${
                    statusFilter === tab.id
                      ? "bg-brand-500 text-white shadow-xs font-bold"
                      : "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Leyenda de Franjas y Estados */}
        <div className="flex flex-wrap items-center gap-4 pt-1 text-xs text-gray-600 dark:text-gray-400">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-brand-500"></span>
            <span className="font-medium text-gray-700 dark:text-gray-300">
              Franja Óptima B2B (Mar - Jue 08:30 a 10:30 AM)
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500"></span>
            <span>Publicado</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-brand-400"></span>
            <span>Programado</span>
          </div>
        </div>

        {/* Vista Mensual Estilo #b2b con Días de la Semana y 7 Columnas */}
        {viewMode === "month" ? (
          <div className="w-full rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-xs overflow-hidden">
            {/* Cabecera de Días de la Semana: LUN, MAR, MIÉ, JUE, VIE, SÁB, DOM */}
            <div className="grid grid-cols-7 border-b border-gray-200 dark:border-gray-800 bg-gray-50/80 dark:bg-gray-800/50 divide-x divide-gray-200 dark:divide-gray-800">
              {WEEKDAYS.map((wd, idx) => (
                <div
                  key={wd}
                  className={`py-3 text-center text-xs font-bold uppercase tracking-wider ${
                    idx >= 5 ? "text-gray-400 dark:text-gray-500" : "text-gray-700 dark:text-gray-300"
                  }`}
                >
                  {wd}
                </div>
              ))}
            </div>

            {/* Cuadrícula de 7 Columnas con división sutil gap-px */}
            <div className="grid grid-cols-7 gap-px bg-gray-200 dark:bg-gray-800">
              {calendarMonthDays.map((cell, idx) => {
                const dayPosts = filteredPosts.filter((p) => {
                  if (!p.scheduledAt) return false;
                  return p.scheduledAt.startsWith(cell.dateKey);
                });
                const isDropTarget = dragOverDateKey === cell.dateKey;

                return (
                  <div
                    key={cell.dateKey + idx}
                    onDragOver={(e) => {
                      e.preventDefault();
                      if (draggedPostId && dragOverDateKey !== cell.dateKey) {
                        setDragOverDateKey(cell.dateKey);
                      }
                    }}
                    onDragLeave={() => {
                      if (dragOverDateKey === cell.dateKey) {
                        setDragOverDateKey(null);
                      }
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      handleDropOnDay(cell.dateKey);
                    }}
                    className={`min-h-[115px] md:min-h-[130px] p-2.5 flex flex-col justify-between transition-colors relative group ${
                      isDropTarget
                        ? "bg-brand-50/90 dark:bg-brand-950/80 ring-2 ring-brand-500 z-10"
                        : cell.isCurrentMonth
                        ? "bg-white dark:bg-gray-900 hover:bg-brand-50/20 dark:hover:bg-brand-950/25"
                        : "bg-gray-50/70 dark:bg-gray-950/60 text-gray-400 dark:text-gray-600"
                    }`}
                  >
                    {/* Header de la celda: Número de día y marcas de estado */}
                    <div className="flex items-center justify-between mb-1.5">
                      <span
                        className={`inline-flex items-center justify-center text-xs rounded-full w-6 h-6 transition-colors ${
                          cell.isToday
                            ? "bg-brand-500 text-white font-bold shadow-xs"
                            : cell.isCurrentMonth
                            ? "text-gray-800 dark:text-gray-200 font-bold group-hover:text-brand-600"
                            : "text-gray-400 dark:text-gray-600 font-medium"
                        }`}
                      >
                        {cell.dayNumber}
                      </span>

                      <div className="flex items-center gap-1.5">
                        {cell.isPeak && (
                          <span
                            className="h-1.5 w-1.5 rounded-full bg-brand-500"
                            title="Franja Óptima B2B (Mar - Jue)"
                          ></span>
                        )}
                        {dayPosts.length > 0 && (
                          <span className="text-[10px] font-semibold text-gray-400 dark:text-gray-500">
                            {dayPosts.length} {dayPosts.length === 1 ? "post" : "posts"}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Lista de publicaciones en la celda */}
                    <div className="flex-1 space-y-1.5 my-1 overflow-hidden">
                      {dayPosts.map((post) => (
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
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedPostDetails(post);
                          }}
                          className={`px-2 py-1.5 rounded-lg text-[11px] font-medium border truncate transition-all cursor-grab active:cursor-grabbing hover:scale-[1.02] shadow-2xs flex items-center justify-between gap-1.5 select-none ${
                            draggedPostId === post.id
                              ? "opacity-30 scale-95 border-dashed border-brand-500"
                              : ""
                          } ${
                            post.status === "published"
                              ? "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/60"
                              : post.format === "carousel"
                              ? "bg-brand-50 text-brand-700 border-brand-200 dark:bg-brand-950/50 dark:text-brand-300 dark:border-brand-800/60"
                              : post.format === "image"
                              ? "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/50 dark:text-purple-300 dark:border-purple-800/60"
                              : "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800/60"
                          }`}
                          title={`Arrastra para reprogramar • Clic para ver: ${post.title}`}
                        >
                          <div className="flex items-center gap-1.5 truncate">
                            <span
                              className={`h-1.5 w-1.5 rounded-full shrink-0 ${
                                post.status === "published" ? "bg-emerald-500" : "bg-brand-500"
                              }`}
                            ></span>
                            <span className="font-bold text-[10px] opacity-75 shrink-0">
                              {post.scheduledAt
                                ? new Date(post.scheduledAt).toLocaleTimeString([], {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })
                                : "09:30"}
                            </span>
                            <span className="truncate">{post.title}</span>
                          </div>
                        </div>
                      ))}

                      {isDropTarget && dayPosts.length === 0 && (
                        <div className="h-full min-h-[40px] flex items-center justify-center border-2 border-dashed border-brand-400 rounded-lg text-[10px] text-brand-600 dark:text-brand-400 font-medium">
                          Soltar aquí
                        </div>
                      )}
                    </div>

                    {/* Footer de la celda */}
                    <div className="flex items-center justify-between text-[9px] text-gray-400 pt-0.5">
                      {cell.isPeak && dayPosts.length === 0 && (
                        <span className="text-brand-500 font-medium text-[8px]">Pico B2B</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          /* Vista Semanal con Drag & Drop */
          <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
            {currentWeekDays.map((day) => {
              const dayPosts = filteredPosts.filter((p) => {
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
        )}
      </div>

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
                className="text-gray-400 hover:text-gray-600 dark:hover:text-white font-bold"
              >
                ✕
              </button>
            </div>

            <div className="rounded-xl bg-gray-50 p-3.5 font-mono text-xs text-gray-700 leading-relaxed whitespace-pre-wrap dark:bg-gray-800/60 dark:text-gray-300">
              {selectedPostDetails.content}
            </div>

            {selectedPostDetails.scheduledAt && (
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Horario de emisión:{" "}
                <strong className="text-gray-800 dark:text-gray-200">
                  {new Date(selectedPostDetails.scheduledAt).toLocaleString("es-ES")}
                </strong>
              </p>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-gray-100 dark:border-gray-800">
              <button
                type="button"
                onClick={() => setSelectedPostDetails(null)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
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
