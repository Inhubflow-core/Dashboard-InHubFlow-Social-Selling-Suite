"use client";

import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { useCreatedPosts } from "@/lib/viral-posts/store";
import type { CreatedPost } from "@/lib/viral-posts/types";
import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { useTranslations, useLocale } from "next-intl";


export default function EditorialCalendarView({
  onTabChange,
  hideBreadcrumb,
}: {
  onTabChange?: (tab: string) => void;
  hideBreadcrumb?: boolean;
} = {}) {
  const t = useTranslations("viralPosts.calendar");
  const locale = useLocale();
  const WEEKDAYS = [t("mon"), t("tue"), t("wed"), t("thu"), t("fri"), t("sat"), t("sun")];
  const { posts, updatePost } = useCreatedPosts();
  const [viewMode, setViewMode] = useState<"month" | "week">("month");
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [statusFilter, setStatusFilter] = useState<"all" | "scheduled" | "published">("all");
  const [draggedPostId, setDraggedPostId] = useState<string | null>(null);
  const [dragOverDateKey, setDragOverDateKey] = useState<string | null>(null);
  const [selectedPostDetails, setSelectedPostDetails] = useState<CreatedPost | null>(null);
  const [scheduleEditDate, setScheduleEditDate] = useState("");
  const [scheduleEditTime, setScheduleEditTime] = useState("09:30");
  const [scheduleSaveSuccess, setScheduleSaveSuccess] = useState(false);
  const [justRescheduledInfo, setJustRescheduledInfo] = useState<{ title: string; date: string } | null>(null);

    // Sincronizar fecha y hora al abrir el modal de detalle del post
  const openPostDetails = (post: CreatedPost) => {
    setSelectedPostDetails(post);
    if (post.scheduledAt) {
      const d = new Date(post.scheduledAt);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      const hours = String(d.getHours()).padStart(2, "0");
      const minutes = String(d.getMinutes()).padStart(2, "0");
      setScheduleEditDate(`${year}-${month}-${day}`);
      setScheduleEditTime(`${hours}:${minutes}`);
    } else {
      const tomorrow = new Date(Date.now() + 86400000);
      setScheduleEditDate(tomorrow.toISOString().split("T")[0]);
      setScheduleEditTime("09:30");
    }
    setScheduleSaveSuccess(false);
  };

  const handleSaveNewSchedule = () => {
    if (!selectedPostDetails || !scheduleEditDate || !scheduleEditTime) return;
    const newScheduledAt = new Date(`${scheduleEditDate}T${scheduleEditTime}:00`).toISOString();
    updatePost(selectedPostDetails.id, {
      scheduledAt: newScheduledAt,
      status: "scheduled",
    });
    setSelectedPostDetails((prev) => prev ? { ...prev, scheduledAt: newScheduledAt, status: "scheduled" } : null);
    setScheduleSaveSuccess(true);
    setTimeout(() => setScheduleSaveSuccess(false), 3000);
  };

  // Navegación de periodos (Anterior, Siguiente, Hoy): en vista semanal avanza o retrocede 1 día exacto
  const handlePrev = () => {
    setCurrentDate((prev) => {
      const d = new Date(prev);
      if (viewMode === "month") {
        d.setMonth(d.getMonth() - 1);
      } else {
        d.setDate(d.getDate() - 1);
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
        d.setDate(d.getDate() + 1);
      }
      return d;
    });
  };

  const handleToday = () => {
    const now = new Date();
    if (viewMode === "week") {
      const day = now.getDay();
      const diffToMonday = (day === 0 ? -6 : 1) - day;
      const monday = new Date(now);
      monday.setDate(now.getDate() + diffToMonday);
      setCurrentDate(monday);
    } else {
      setCurrentDate(now);
    }
  };

  // Título del periodo actual (ej. "Octubre De 2026")
  const periodTitle = useMemo(() => {
    const year = currentDate.getFullYear();
    const monthName = currentDate.toLocaleDateString(locale, { month: "long" });
    const capitalizedMonth = monthName.charAt(0).toUpperCase() + monthName.slice(1);

    if (viewMode === "month") {
      return `${capitalizedMonth} ${year}`;
    }

    const first = new Date(currentDate);
    const last = new Date(currentDate);
    last.setDate(currentDate.getDate() + 6);

    const firstMonth = first.toLocaleDateString(locale, { month: "short" });
    const lastMonth = last.toLocaleDateString(locale, { month: "short" });
    const firstYear = first.getFullYear();
    const lastYear = last.getFullYear();

    if (first.getMonth() === last.getMonth() && firstYear === lastYear) {
      return `${first.getDate()} - ${last.getDate()} ${firstMonth} ${firstYear}`;
    }
    if (firstYear === lastYear) {
      return `${first.getDate()} ${firstMonth} - ${last.getDate()} ${lastMonth} ${firstYear}`;
    }
    return `${first.getDate()} ${firstMonth} ${firstYear} - ${last.getDate()} ${lastMonth} ${lastYear}`;
  }, [currentDate, viewMode, locale]);

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
    }> = [];

    const createDay = (date: Date, isCurrentMonth: boolean) => {
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, "0");
      const d = String(date.getDate()).padStart(2, "0");
      const dateKey = `${y}-${m}-${d}`;
      const dayOfWeek = date.getDay();
      return {
        date,
        dateKey,
        dayNumber: date.getDate(),
        isCurrentMonth,
        isToday: dateKey === todayStr,
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

  // Calcular dinámicamente 7 días consecutivos a partir de currentDate (carrusel deslizable de a 1 día)
  const currentWeekDays = useMemo(() => {
    const today = new Date();
    const days = [];

    for (let i = 0; i < 7; i++) {
      const d = new Date(currentDate);
      d.setDate(currentDate.getDate() + i);

      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const dayNum = String(d.getDate()).padStart(2, "0");
      const dateKey = `${year}-${month}-${dayNum}`;

      const rawDayName = d.toLocaleDateString(locale, { weekday: "long" });
      const capitalizedDayName = rawDayName.charAt(0).toUpperCase() + rawDayName.slice(1);

      days.push({
        dayNumber: d.getDate(),
        monthName: d.toLocaleDateString(locale, { month: "short" }),
        name: capitalizedDayName,
        dateKey,
        isToday: d.toDateString() === today.toDateString(),
      });
    }

    return days;
  }, [currentDate, locale]);

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
    <div className="w-full space-y-6">
      {!hideBreadcrumb && <PageBreadcrumb pageTitle={t("pageTitle")} />}

      {/* Alerta de confirmación al reprogramar */}
      {justRescheduledInfo && (
        <div className="rounded-lg bg-emerald-50 p-3.5 text-xs text-emerald-800 border border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2.5">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>
              {t("rescheduledNotice", { title: justRescheduledInfo.title, date: justRescheduledInfo.date })}
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
      <div className="w-full rounded-lg border border-gray-300 bg-white dark:border-gray-800 dark:bg-white/3">
        {/* Cabecera Superior: Título, Contador, Selector de Vista y Botón Programar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-6 py-5">
          <div>
            <div className="flex items-center gap-3">
              <h3 className="text-base font-medium text-gray-800 dark:text-white/90">
                {t("cardTitle")}
              </h3>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-brand-50 text-brand-600 border border-brand-200/60 dark:bg-brand-950/60 dark:text-brand-300 dark:border-brand-800/80">
                {totalActiveCount === 1 ? t("postCountSingle", { count: totalActiveCount }) : t("postCountPlural", { count: totalActiveCount })}
              </span>
            </div>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {t("cardDesc")}
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {/* Selector de Modo: Mes | Semana */}
            <div className="flex items-center rounded-lg border border-gray-300 dark:border-gray-800 bg-gray-50/60 dark:bg-gray-950/40 p-1 shadow-2xs">
              <button
                type="button"
                onClick={() => setViewMode("month")}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                  viewMode === "month"
                    ? "bg-brand-500 text-white shadow-xs"
                    : "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                }`}
              >{t("viewMonth")}</button>
              <button
                type="button"
                onClick={() => setViewMode("week")}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                  viewMode === "week"
                    ? "bg-brand-500 text-white shadow-xs"
                    : "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                }`}
              >{t("viewWeek")}</button>
            </div>

            {/* Botón de Acción Principal */}
            <Link
              href="/viral-posts?tab=create" onClick={(e) => { if (onTabChange) { e.preventDefault(); onTabChange("create"); } }}
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand-500 px-4 py-2 text-xs font-semibold text-white hover:bg-brand-600 shadow-xs transition"
            >
              <Plus size={15} />
              {t("scheduleBtn")}
            </Link>
          </div>
        </div>

        {/* Cuerpo del Calendario con línea divisoria igual que ComponentCard */}
        <div className="border-t border-gray-300 px-6 py-5 sm:p-6 dark:border-gray-800 space-y-6">
          {/* Barra de Navegación del Mes & Filtros (Estilo exacto #b2b) */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          {/* Navegación temporal: Flechas + Hoy + Nombre del Mes */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center rounded-lg border border-gray-300 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-2xs p-1">
              <button
                type="button"
                onClick={handlePrev}
                className="p-1.5 rounded-lg text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                title={t("prevMonthTooltip")}
              >
                <ChevronLeft size={16} />
              </button>
              <button
                type="button"
                onClick={handleToday}
                className="px-3 py-1 rounded-lg text-xs font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >{t("btnToday")}</button>
              <button
                type="button"
                onClick={handleNext}
                className="p-1.5 rounded-lg text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                title={t("nextMonthTooltip")}
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
            <div className="inline-flex rounded-lg border border-gray-300 dark:border-gray-800 p-1 bg-gray-50 dark:bg-gray-950/40 text-xs shadow-2xs">
              {[
                { id: "all", label: t("filterAll") },
                { id: "scheduled", label: t("filterScheduled") },
                { id: "published", label: t("filterPublished") },
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

        {/* Leyenda de Estados: Solo Publicado y Programado */}
        <div className="flex flex-wrap items-center gap-4 pt-1 text-xs text-gray-600 dark:text-gray-400">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500"></span>
            <span>{t("statusPublished")}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-brand-400"></span>
            <span>{t("statusScheduled")}</span>
          </div>
        </div>

        {/* Vista Mensual Estilo #b2b con Días de la Semana y 7 Columnas */}
        {viewMode === "month" ? (
          <div className="w-full rounded-lg border border-gray-300 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-xs overflow-hidden">
            {/* Cabecera de Días de la Semana: LUN, MAR, MIÉ, JUE, VIE, SÁB, DOM */}
            <div className="grid grid-cols-7 border-b border-gray-300 dark:border-gray-800 bg-gray-50/80 dark:bg-gray-800/50 divide-x divide-gray-300 dark:divide-gray-800">
              {WEEKDAYS.map((wd) => (
                <div
                  key={wd}
                  className="py-3 text-center text-xs leading-5 font-normal tracking-normal uppercase text-gray-400"
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

                        {dayPosts.length > 0 && (
                          <span className="text-xs font-semibold text-gray-400 dark:text-gray-500">
                            {dayPosts.length === 1 ? t("cellPostSingle", { count: dayPosts.length }) : t("cellPostPlural", { count: dayPosts.length })}
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
                            openPostDetails(post);
                          }}
                          className={`px-2 py-1.5 rounded-lg text-xs font-medium border truncate transition-all cursor-grab active:cursor-grabbing hover:scale-[1.02] shadow-2xs flex items-center justify-between gap-1.5 select-none ${
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
                          title={t("dragTooltip", { title: post.title })}
                        >
                          <div className="flex items-center gap-1.5 truncate">
                            <span
                              className={`h-1.5 w-1.5 rounded-full shrink-0 ${
                                post.status === "published" ? "bg-emerald-500" : "bg-brand-500"
                              }`}
                            ></span>
                            <span className="font-bold text-xs opacity-75 shrink-0">
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
                        <div className="h-full min-h-[40px] flex items-center justify-center border-2 border-dashed border-brand-400 rounded-lg text-xs text-brand-600 dark:text-brand-400 font-medium">
                          Soltar aquí
                        </div>
                      )}
                    </div>


                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          /* Vista Semanal con Formato Carrusel (Flechas a la izquierda y derecha) */
          <div className="relative flex items-center">
            {/* Flecha Izquierda de Navegación de Semana (Carrusel) */}
            <button
              type="button"
              onClick={handlePrev}
              className="absolute -left-3.5 top-1/2 -translate-y-1/2 z-20 flex h-10 w-10 items-center justify-center rounded-full border border-gray-300 bg-white text-gray-700 shadow-md transition-all hover:scale-110 hover:border-brand-500 hover:bg-brand-50 hover:text-brand-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:border-brand-500 dark:hover:bg-brand-950 dark:hover:text-brand-400 cursor-pointer"
              title={t("prevWeekTooltip")}
              aria-label={t("prevWeekTooltip")}
            >
              <ChevronLeft size={22} />
            </button>

            {/* Contenedor de 7 Días Siempre Visibles */}
            <div className="w-full grid grid-cols-1 md:grid-cols-7 gap-3 px-2 transition-all duration-200 ease-out">
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
                  className={`flex flex-col min-h-[380px] rounded-lg border p-3 transition-all duration-150 ${
                    isDropTarget
                      ? "border-2 border-brand-500 bg-brand-100/70 dark:bg-brand-950/60 dark:border-brand-400 ring-4 ring-brand-500/20 scale-[1.01] shadow-md z-10"
                      : day.isToday
                      ? "border-brand-500 bg-brand-50/20 dark:border-brand-500/60 dark:bg-brand-950/30"
                      : "border-gray-300 bg-white dark:border-gray-800 dark:bg-gray-900"
                  }`}
                >
                  <div className="flex items-center justify-between pb-2 border-b border-gray-300 dark:border-gray-800">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <p className="text-xs leading-5 font-normal tracking-normal text-gray-400 uppercase">
                          {day.name}
                        </p>
                        {day.isToday && (
                          <span className="rounded-lg bg-brand-500 px-1.5 py-0.5 text-xs font-bold text-white uppercase tracking-wider">
                            {t("today")}
                          </span>
                        )}
                      </div>
                      <h4 className="text-base font-bold text-gray-900 dark:text-white mt-0.5">
                        {day.dayNumber} {day.monthName}
                      </h4>
                    </div>

                  </div>



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
                        onClick={() => openPostDetails(post)}
                        className={`cursor-grab active:cursor-grabbing rounded-lg border border-gray-300 bg-white p-3 shadow-theme-xs hover:border-brand-500 transition dark:border-gray-700 dark:bg-gray-800 select-none ${
                          draggedPostId === post.id
                            ? "opacity-30 scale-95 border-dashed border-brand-500"
                            : ""
                        }`}
                        title={t("dragDetailsTooltip", { title: post.title })}
                      >
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <span
                            className={`rounded-lg px-1.5 py-0.5 text-xs font-bold uppercase ${
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

                        <div className="mt-2 flex items-center justify-between text-xs text-gray-400 border-t border-gray-300 dark:border-gray-700 pt-1.5">
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
                        className={`h-full min-h-[160px] flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-3 text-center text-xs transition ${
                          isDropTarget
                            ? "border-brand-500 bg-brand-100/50 text-brand-700 font-bold dark:bg-brand-950/60 dark:text-brand-300"
                            : "border-gray-300 text-gray-400 dark:border-gray-800"
                        }`}
                      >
                        <span>{isDropTarget ? t("dropPostHere") : t("dragPostHere")}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            </div>

            {/* Flecha Derecha de Navegación de Semana (Carrusel) */}
            <button
              type="button"
              onClick={handleNext}
              className="absolute -right-3.5 top-1/2 -translate-y-1/2 z-20 flex h-10 w-10 items-center justify-center rounded-full border border-gray-300 bg-white text-gray-700 shadow-md transition-all hover:scale-110 hover:border-brand-500 hover:bg-brand-50 hover:text-brand-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:border-brand-500 dark:hover:bg-brand-950 dark:hover:text-brand-400 cursor-pointer"
              title={t("nextWeekTooltip")}
              aria-label={t("nextWeekTooltip")}
            >
              <ChevronRight size={22} />
            </button>
          </div>
        )}
        </div>
      </div>

      {/* Modal de Detalle de Publicación */}
      {selectedPostDetails && (
        <div className="fixed inset-0 z-99999 flex items-center justify-center bg-black/60 p-4">
          <div className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-lg bg-white p-6 shadow-theme-xl dark:bg-gray-900 border border-gray-300 dark:border-gray-800 space-y-4">
            <div className="flex items-start justify-between border-b border-gray-300 pb-3 dark:border-gray-800">
              <div>
                <span className="text-xs uppercase font-bold text-brand-600">
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

            <div className="rounded-lg bg-gray-50 p-3.5 font-mono text-xs text-gray-700 leading-relaxed whitespace-pre-wrap dark:bg-gray-800/60 dark:text-gray-300">
              {selectedPostDetails.content}
            </div>

            {/* Configuración y selección de horario de publicación */}
            {selectedPostDetails.status !== "published" ? (
              <div className="rounded-lg border border-gray-300 bg-gray-50/80 p-4 dark:border-gray-800 dark:bg-gray-800/50 space-y-3">
                <span className="text-xs font-bold text-gray-800 dark:text-gray-200 uppercase tracking-wide block">
                  {t("scheduleConfigTitle")}
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                      {t("dateLabel")}
                    </label>
                    <input
                      type="date"
                      value={scheduleEditDate}
                      onChange={(e) => setScheduleEditDate(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs text-gray-800 focus:border-brand-500 focus:outline-hidden dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                      {t("timeLabel")}
                    </label>
                    <input
                      type="time"
                      value={scheduleEditTime}
                      onChange={(e) => setScheduleEditTime(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs text-gray-800 focus:border-brand-500 focus:outline-hidden dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between pt-1">
                  {scheduleSaveSuccess ? (
                    <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                      ✓ {t("scheduleUpdatedSuccess")}
                    </span>
                  ) : <span></span>}
                  <button
                    type="button"
                    onClick={handleSaveNewSchedule}
                    className="rounded-lg bg-brand-500 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-brand-600 transition shadow-xs cursor-pointer"
                  >
                    {t("saveScheduleBtn")}
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {t("emissionScheduleLabel")}:{" "}
                <strong className="text-gray-800 dark:text-gray-200">
                  {new Date(selectedPostDetails.scheduledAt || selectedPostDetails.publishedAt || "").toLocaleString(locale)}
                </strong>
              </p>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-gray-300 dark:border-gray-800">
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
