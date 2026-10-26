"use client";

import React from "react";
import { useTranslations } from "next-intl";

interface LeadScoreBadgeProps {
  score: number;
  showDetail?: boolean;
  size?: "sm" | "md";
  className?: string;
}

export function LeadScoreBadge({
  score,
  showDetail = true,
  size = "md",
  className = "",
}: LeadScoreBadgeProps) {
  const t = useTranslations("leads");
  const rawScore = Number(score) || 80;
  // Migración automática de scores históricos (70 -> 80)
  const normalizedScore = rawScore === 70 ? 80 : rawScore;

  // Clasificación oficial de Social Selling B2B:
  // 100: Palabra Clave en Lead Magnet (Full Intención 🔥)
  // 90: Quien COMENTÓ (Medalla de Oro 🥇)
  // 80: Quien DIO LIKE / REACCIÓN (Medalla de Plata 🥈)

  let badgeConfig = {
    badgeClass: "bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800/60 shadow-2xs",
    medal: "🥈",
    label: t("badgeReactionLabel"),
    title: t("badgeReactionTooltip"),
  };

  if (normalizedScore >= 100) {
    badgeConfig = {
      badgeClass: "bg-purple-50 text-purple-800 border-purple-200 dark:bg-purple-950/50 dark:text-purple-300 dark:border-purple-800/60 shadow-2xs",
      medal: "🔥",
      label: "Lead Magnet",
      title: t("badgeKeywordTooltip"),
    };
  } else if (normalizedScore >= 90) {
    badgeConfig = {
      badgeClass: "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/60 shadow-2xs",
      medal: "🥇",
      label: t("badgeCommentLabel"),
      title: t("badgeCommentTooltip"),
    };
  }

  const isSmall = size === "sm";

  return (
    <span
      className={`inline-flex items-center gap-1 font-semibold border rounded-lg cursor-help transition select-none ${badgeConfig.badgeClass} ${
        isSmall ? "px-1.5 py-0.5 text-xs" : "px-2 py-0.5 text-xs"
      } ${className}`}
      title={badgeConfig.title}
    >
      <span className="text-xs">{badgeConfig.medal}</span>
      <span className="font-bold">{normalizedScore}</span>
      {showDetail && (
        <>
          <span className="opacity-40">•</span>
          <span className="font-medium text-xs tracking-tight">{badgeConfig.label}</span>
        </>
      )}
    </span>
  );
}

export default LeadScoreBadge;
