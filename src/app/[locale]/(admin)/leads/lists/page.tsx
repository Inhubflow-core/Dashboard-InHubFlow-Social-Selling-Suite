"use client";

import { useEffect } from "react";
import { useRouter } from "@/i18n/navigation";

export default function SignalListsRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/leads?tab=lists");
  }, [router]);

  return (
    <div className="flex h-64 items-center justify-center text-xs text-gray-500">
      Redirigiendo a Listas por Señal...
    </div>
  );
}
