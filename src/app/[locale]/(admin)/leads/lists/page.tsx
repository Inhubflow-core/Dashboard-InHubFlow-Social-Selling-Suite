"use client";

import { useEffect } from "react";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";

export default function SignalListsRedirect() {
  const router = useRouter();
  const t = useTranslations("leads");

  useEffect(() => {
    router.replace("/leads?tab=lists");
  }, [router]);

  return (
    <div className="flex h-64 items-center justify-center text-xs text-gray-500">
      {t("redirectingToLists")}
    </div>
  );
}
