"use client";

import { useEffect } from "react";
import { useRouter } from "@/i18n/navigation";

export default function CompetitorsSignalRadarRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/signals?tab=competitors");
  }, [router]);

  return (
    <div className="flex h-64 items-center justify-center text-xs text-gray-500">
      Redirigiendo a Signal Radar (Post de la Competencia)...
    </div>
  );
}
