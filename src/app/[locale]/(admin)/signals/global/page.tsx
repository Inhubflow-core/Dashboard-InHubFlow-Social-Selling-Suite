"use client";

import { useEffect } from "react";
import { useRouter } from "@/i18n/navigation";

export default function GlobalSignalsRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/signals?tab=global");
  }, [router]);

  return (
    <div className="flex h-64 items-center justify-center text-xs text-gray-500">
      Redirigiendo a Signal Radar (Post Globales LinkedIn)...
    </div>
  );
}
