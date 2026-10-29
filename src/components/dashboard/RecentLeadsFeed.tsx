"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { Lead360Item } from "@/lib/leads/types";

interface RecentLeadsFeedProps {
  leads: Lead360Item[];
}

export default function RecentLeadsFeed({ leads }: RecentLeadsFeedProps) {
  const t = useTranslations("dashboard");

  const getSignalBadge = (level: string) => {
    switch (level) {
      case "level_1":
        return {
          label: "Nivel 1 (Mis Posts)",
          cls: "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400 border-blue-200 dark:border-blue-800",
        };
      case "level_2":
        return {
          label: "Nivel 2 (Competidor)",
          cls: "bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-400 border-purple-200 dark:border-purple-800",
        };
      default:
        return {
          label: "Nivel 3 (Grupos)",
          cls: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border-amber-200 dark:border-amber-800",
        };
    }
  };

  const getStageLabel = (stage: string) => {
    switch (stage) {
      case "lead_captured":
        return "1. Lead Captado";
      case "in_sequence":
        return "2. En Secuencia";
      case "connected_material_sent":
        return "3. Recurso Enviado";
      case "interested":
      case "active_conversation":
        return "4. Interesado";
      case "meeting_scheduled":
        return "5. Cita Cal.com";
      case "proposal_presented":
      case "proposal_sent":
        return "6. Propuesta";
      case "closed_won":
        return "7. Ganado";
      default:
        return "Lead Activo";
    }
  };

  return (
    <div className="rounded-lg border border-gray-300 bg-white p-5 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-xs font-semibold text-gray-900 dark:text-white uppercase tracking-wider">
            {t("charts.recentLeads.title")}
          </h3>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            {t("charts.recentLeads.desc")}
          </p>
        </div>

        <Link
          href="/leads"
          className="inline-flex items-center text-xs font-semibold text-brand-600 hover:text-brand-700 dark:text-brand-400"
        >
          {t("modules.leadsAction")} &rarr;
        </Link>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-gray-200 text-[11px] font-semibold text-gray-500 uppercase dark:border-gray-800 dark:text-gray-400">
              <th className="py-2.5 px-3">{t("charts.recentLeads.colLead")}</th>
              <th className="py-2.5 px-3">{t("charts.recentLeads.colSignal")}</th>
              <th className="py-2.5 px-3">{t("charts.recentLeads.colScore")}</th>
              <th className="py-2.5 px-3">{t("charts.recentLeads.colStage")}</th>
              <th className="py-2.5 px-3 text-right">{t("charts.recentLeads.colAction")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-xs dark:divide-gray-800">
            {leads.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-6 text-center text-gray-500 dark:text-gray-400">
                  {t("charts.recentLeads.noLeads")}
                </td>
              </tr>
            ) : (
              leads.map((lead) => {
                const badge = getSignalBadge(lead.signalLevel);
                const initials = lead.fullName
                  .split(" ")
                  .map((w) => w[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase();

                const isHot = lead.intentScore >= 90;

                return (
                  <tr
                    key={lead.id}
                    className="hover:bg-gray-50/80 transition dark:hover:bg-gray-800/40"
                  >
                    {/* Prospecto */}
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-50 text-xs font-bold text-brand-600 dark:bg-brand-950/60 dark:text-brand-400 border border-brand-200 dark:border-brand-800">
                          {initials}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-gray-900 truncate dark:text-white">
                            {lead.fullName}
                          </p>
                          <p className="text-[11px] text-gray-500 truncate dark:text-gray-400">
                            {lead.title} {lead.company ? `• ${lead.company}` : ""}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Señal */}
                    <td className="py-3 px-3">
                      <span
                        className={`inline-block rounded-md border px-2 py-0.5 text-[11px] font-medium ${badge.cls}`}
                      >
                        {badge.label}
                      </span>
                    </td>

                    {/* Score */}
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        <span
                          className={`font-bold ${
                            isHot
                              ? "text-emerald-600 dark:text-emerald-400"
                              : "text-amber-600 dark:text-amber-400"
                          }`}
                        >
                          {lead.intentScore} pts
                        </span>
                        <span
                          className={`rounded px-1.5 py-0.2 text-[10px] font-semibold ${
                            isHot
                              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400"
                              : "bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400"
                          }`}
                        >
                          {isHot ? "HOT" : "WARM"}
                        </span>
                      </div>
                    </td>

                    {/* Etapa */}
                    <td className="py-3 px-3">
                      <span className="rounded-md bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                        {getStageLabel(lead.stage)}
                      </span>
                    </td>

                    {/* Acciones */}
                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href="/pipeline"
                          className="rounded border border-gray-200 px-2 py-1 text-[11px] font-medium text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                        >
                          {t("charts.recentLeads.viewInKanban")}
                        </Link>
                        <Link
                          href="/inbox"
                          className="rounded bg-brand-50 border border-brand-200 px-2 py-1 text-[11px] font-semibold text-brand-600 hover:bg-brand-100 dark:bg-brand-950/40 dark:border-brand-800 dark:text-brand-400"
                        >
                          {t("charts.recentLeads.viewInbox")}
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
