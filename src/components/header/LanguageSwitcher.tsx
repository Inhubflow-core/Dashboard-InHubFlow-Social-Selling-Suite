"use client";

import { useClickOutside } from "@/hooks/useClickOutside";
import { getLanguage, languages } from "@/i18n/languages";
import { usePathname, useRouter } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { ChevronDownIcon } from "@/icons";
import { useLocale } from "next-intl";
import { useRef, useState } from "react";

export default function LanguageSwitcher() {
  const locale = useLocale() as Locale;
  const router = useRouter();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const currentLanguage = getLanguage(locale);
  const CurrentFlag = currentLanguage.FlagIcon;

  useClickOutside(containerRef, () => setIsOpen(false));

  const handleSelectLanguage = (nextLocale: Locale) => {
    router.replace(pathname, { locale: nextLocale });
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-expanded={isOpen}
        aria-label="Seleccionar idioma"
        className="flex h-10 items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-2.5 text-xs font-semibold text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-white/5"
      >
        <CurrentFlag className="size-4" />
        <span>{currentLanguage.shortName}</span>
        <ChevronDownIcon
          className={`size-3.5 text-gray-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {isOpen && (
        <div className="absolute end-0 top-full z-99999 mt-2 w-44 rounded-xl border border-gray-200 bg-white p-1.5 shadow-theme-lg dark:border-gray-800 dark:bg-gray-dark">
          <p className="px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-400">
            Idioma
          </p>
          {languages.map((language) => {
            const FlagIcon = language.FlagIcon;
            const isSelected = language.id === locale;

            return (
              <button
                key={language.id}
                type="button"
                onClick={() => handleSelectLanguage(language.id)}
                aria-pressed={isSelected}
                className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-start text-xs transition-colors ${
                  isSelected
                    ? "bg-brand-50 font-semibold text-brand-600 dark:bg-brand-950/40 dark:text-brand-300"
                    : "text-gray-600 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-white/5"
                }`}
              >
                <FlagIcon className="size-4" />
                <span>{language.name}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
