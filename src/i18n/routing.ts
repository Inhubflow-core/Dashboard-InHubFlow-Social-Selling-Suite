import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["es", "en", "pt-BR"],
  defaultLocale: "es",
  localePrefix: "never",
});

export type Locale = (typeof routing.locales)[number];
