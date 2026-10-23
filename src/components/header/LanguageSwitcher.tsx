"use client";

import { useClickOutside } from "@/hooks/useClickOutside";
import { getLanguage, languages } from "@/i18n/languages";
import { usePathname, useRouter } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { ChevronDownIcon } from "@/icons";
import { Check, Globe } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useRef, useState } from "react";

export default function LanguageSwitcher() {
  const locale = useLocale() as Locale;
  const router = useRouter();
  const pathname = usePathname();
  const t = useTranslations("common");
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const currentLanguage = getLanguage(locale);

  useClickOutside(containerRef, () => setIsOpen(false));

  const handleSelectLanguage = (nextLocale: Locale) => {
    document.cookie = `NEXT_LOCALE=${nextLocale}; path=/; max-age=31536000; SameSite=Lax`;
    router.replace(pathname, { locale: nextLocale });
    router.refresh();
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-expanded={isOpen}
        aria-label={t("language")}
        className="flex h-10 items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 text-xs font-semibold text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-white/5"
      >
        <Globe className="size-4 text-gray-500 dark:text-gray-400" />
        <span className="font-semibold">{currentLanguage.shortName}</span>
        <ChevronDownIcon
          className={`size-3.5 text-gray-400 transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {isOpen && (
        <div className="absolute end-0 top-full z-99999 mt-2 w-52 rounded-xl border border-gray-200 bg-white p-1.5 shadow-theme-lg dark:border-gray-800 dark:bg-gray-dark">
          <p className="px-2.5 py-1.5 text-xs leading-5 font-normal tracking-normal uppercase text-gray-400">
            {t("language")}
          </p>
          <div className="space-y-0.5">
            {languages.map((language) => {
              const isSelected = language.id === locale;

              return (
                <button
                  key={language.id}
                  type="button"
                  onClick={() => handleSelectLanguage(language.id)}
                  aria-pressed={isSelected}
                  className={`flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-start text-xs transition-colors ${
                    isSelected
                      ? "bg-brand-50 font-semibold text-brand-600 dark:bg-brand-950/40 dark:text-brand-300"
                      : "text-gray-600 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-white/5"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`inline-flex min-w-[2.25rem] items-center justify-center rounded px-1.5 py-0.5 font-mono text-xs font-bold uppercase ${
                        isSelected
                          ? "bg-brand-500/15 text-brand-600 dark:text-brand-300"
                          : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"
                      }`}
                    >
                      {language.shortName}
                    </span>
                    <span>{language.name}</span>
                  </div>
                  {isSelected && (
                    <Check className="size-3.5 text-brand-600 dark:text-brand-400" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
