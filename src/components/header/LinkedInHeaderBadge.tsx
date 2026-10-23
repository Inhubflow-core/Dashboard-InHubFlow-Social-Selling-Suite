"use client";

import { useEffect, useState } from "react";
import { Link } from "@/i18n/navigation";
import { getActiveAccountForUser } from "@/lib/unipile/store";
import type { ConnectedLinkedInAccount } from "@/lib/unipile/types";
import { Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useAuth } from "@/context/AuthContext";

export default function LinkedInHeaderBadge() {
  const { currentUser } = useAuth();
  const [activeAccount, setActiveAccount] = useState<ConnectedLinkedInAccount | null>(null);
  const t = useTranslations("header.linkedin");

  useEffect(() => {
    const updateAccount = () => {
      const found = getActiveAccountForUser(currentUser);
      setActiveAccount(found);
    };

    updateAccount();

    // Escuchar cambios de storage para reactividad
    window.addEventListener("storage", updateAccount);
    return () => window.removeEventListener("storage", updateAccount);
  }, [currentUser]);

  if (!activeAccount) {
    return (
      <Link
        href="/linkedin-accounts"
        className="hidden md:inline-flex items-center gap-1.5 rounded-lg border border-dashed border-gray-300 px-2.5 py-1.5 text-xs font-medium text-gray-600 transition hover:border-brand-500 hover:text-brand-500 dark:border-gray-700 dark:text-gray-400 dark:hover:border-brand-500 dark:hover:text-brand-400"
      >
        <Plus className="size-3.5" />
        <span>{t("connect")}</span>
      </Link>
    );
  }

  const isHealthy = activeAccount.status === "OK";

  return (
    <Link
      href="/linkedin-accounts"
      className="hidden md:inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50/80 px-2.5 py-1.5 transition hover:border-brand-500 hover:bg-white dark:border-gray-800 dark:bg-gray-800/80 dark:hover:border-brand-500 dark:hover:bg-gray-800"
      title={`${t("activeAccount")}: ${activeAccount.name}`}
    >
      <div className="relative">
        <div className="size-6 rounded-lg bg-brand-500 flex items-center justify-center text-white text-xs font-bold">
          {activeAccount.name.charAt(0).toUpperCase()}
        </div>
        <span
          className={`absolute -bottom-0.5 -right-0.5 size-2 rounded-full ring-1 ring-white dark:ring-gray-900 ${
            isHealthy ? "bg-green-500" : "bg-amber-500"
          }`}
        />
      </div>
      <div className="flex flex-col text-left leading-tight">
        <span className="text-xs font-semibold text-gray-800 dark:text-gray-200 max-w-[120px] truncate">
          {activeAccount.name}
        </span>
        <span className="text-xs text-gray-400">{t("connected")}</span>
      </div>
    </Link>
  );
}
