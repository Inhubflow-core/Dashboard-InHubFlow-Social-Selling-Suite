import { SidebarProvider } from "@/context/SidebarContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { AuthProvider } from "@/context/AuthContext";
import { isRtl } from "@/i18n/languages";
import { type Locale, routing } from "@/i18n/routing";
import "flatpickr/dist/flatpickr.css";
import { NextIntlClientProvider } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { Outfit } from "next/font/google";
import { notFound } from "next/navigation";
import "simplebar-react/dist/simplebar.min.css";
import "swiper/css/bundle";
import "../globals.css";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    template: "%s | InHubFlow Social Selling",
    default: "InHubFlow | Social Selling Suite",
  },
  description:
    "Construye tu marca personal y escala tu facturacion B2B con prospeccion inbound en LinkedIn.",
  icons: {
    icon: "/images/logo/inhubflow-icon-dark.png",
    shortcut: "/images/logo/inhubflow-icon-dark.png",
    apple: "/images/logo/inhubflow-icon-dark.png",
  },
};

const outfit = Outfit({
  subsets: ["latin"],
});

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function RootLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>) {
  const { locale } = await params;

  if (!routing.locales.includes(locale as Locale)) {
    notFound();
  }

  setRequestLocale(locale);

  return (
    <html lang={locale} dir={isRtl(locale as Locale) ? "rtl" : "ltr"}>
      <body className={`${outfit.className} bg-[#d0d9e9] dark:bg-gray-900`}>
        <NextIntlClientProvider>
          <ThemeProvider>
            <AuthProvider>
              <SidebarProvider>{children}</SidebarProvider>
            </AuthProvider>
          </ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
