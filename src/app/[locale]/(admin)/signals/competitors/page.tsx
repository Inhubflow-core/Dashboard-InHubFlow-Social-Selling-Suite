"use client";

import { useEffect } from "react";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";

export default function CompetitorsSignalRadarRedirect() {
  const router = useRouter();
  const t = useTranslations("signals.common");

  useEffect(() => {
    router.replace("/signals?tab=competitors");
  }, [router]);

  return (
    <div className="flex h-64 items-center justify-center text-xs text-gray-500">
      {t("redirectingCompetitors")}
    </div>
  );
}
