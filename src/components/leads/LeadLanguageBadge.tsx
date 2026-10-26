"use client";

import React from "react";

interface LeadLanguageBadgeProps {
  language?: string | null;
  className?: string;
}

export function LeadLanguageBadge({ language, className = "" }: LeadLanguageBadgeProps) {
  if (!language) return null;
  const lang = String(language).toLowerCase().trim();

  let title = "Español";

  if (lang === "en") {
    title = "English";
  } else if (lang === "pt" || lang === "pt-br") {
    title = "Português";
  }

  const displayCode = lang.startsWith("pt") ? "PT" : lang.toUpperCase().slice(0, 2);

  return (
    <span
      className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium tracking-wider text-gray-400 dark:text-gray-500 bg-gray-100/70 dark:bg-gray-800/60 border border-gray-200/60 dark:border-gray-700/50 leading-none select-none shrink-0 ${className}`}
      title={`Idioma: ${title} (${displayCode})`}
    >
      {displayCode}
    </span>
  );
}

export default LeadLanguageBadge;
