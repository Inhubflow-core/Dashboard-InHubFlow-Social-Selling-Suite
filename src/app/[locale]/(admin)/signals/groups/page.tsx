"use client";

import { useEffect } from "react";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";

export default function LinkedInGroupsSignalRadarRedirect() {
  const router = useRouter();
  const t = useTranslations("signals.common");

  useEffect(() => {
    router.replace("/signals");
  }, [router]);

  return (
    <div className="flex h-64 items-center justify-center text-xs text-gray-500">
      {t("redirectingGroups")}
    </div>
  );
}
