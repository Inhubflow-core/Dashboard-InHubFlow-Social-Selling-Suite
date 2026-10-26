"use client";

import { useEffect } from "react";
import { useRouter } from "@/i18n/navigation";

export default function MyPostsSignalRadarRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/signals?tab=my-posts");
  }, [router]);

  return (
    <div className="flex h-64 items-center justify-center text-xs text-gray-500">
      Redirigiendo a Signal Radar (Mis propios Posts)...
    </div>
  );
}
