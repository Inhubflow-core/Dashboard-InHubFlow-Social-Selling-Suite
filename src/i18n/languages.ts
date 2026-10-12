import type { Locale } from "./routing";

export interface Language {
  id: Locale;
  name: string;
  shortName: string;
  dir: "ltr" | "rtl";
  badge?: string;
}

export const languages: Language[] = [
  {
    id: "es",
    name: "Español",
    shortName: "ES",
    dir: "ltr",
  },
  {
    id: "en",
    name: "English",
    shortName: "EN",
    dir: "ltr",
  },
  {
    id: "pt-BR",
    name: "Português",
    shortName: "PT",
    dir: "ltr",
  },
];

export function getLanguage(locale: Locale): Language {
  return languages.find((l) => l.id === locale) || languages[0];
}

export function isRtl(locale: Locale): boolean {
  return getLanguage(locale).dir === "rtl";
}
