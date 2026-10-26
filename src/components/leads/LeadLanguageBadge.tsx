"use client";

import React from "react";

interface LeadLanguageBadgeProps {
  language?: string | null;
  className?: string;
}

export function LeadLanguageBadge({ language, className = "" }: LeadLanguageBadgeProps) {
  if (!language) return null;
  const lang = String(language).toLowerCase().trim();

  let dotColor = "bg-emerald-500";
  let title = "Español";

  if (lang === "en") {
    dotColor = "bg-blue-500";
    title = "English";
  } else if (lang === "pt" || lang === "pt-br") {
    dotColor = "bg-amber-500";
    title = "Português";
  }

  const displayCode = lang.startsWith("pt") ? "PT" : lang.toUpperCase().slice(0, 2);

  return (
    <span
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium tracking-wider text-gray-500 dark:text-gray-400 bg-gray-50/90 dark:bg-gray-800/60 border border-gray-200/70 dark:border-gray-700/60 leading-none select-none shrink-0 shadow-2xs ${className}`}
      title={`Idioma: ${title} (${displayCode})`}
    >
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotColor}`} />
      <span>{displayCode}</span>
    </span>
  );
}

export default LeadLanguageBadge;
