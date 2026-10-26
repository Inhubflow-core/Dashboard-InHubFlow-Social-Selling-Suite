"use client";

import { useEffect } from "react";
import { useRouter } from "@/i18n/navigation";

export default function SecuritySettingsRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/settings?tab=api-security");
  }, [router]);

  return (
    <div className="flex h-64 items-center justify-center text-xs text-gray-500">
      Redirigiendo a API y Workspace...
    </div>
  );
}
