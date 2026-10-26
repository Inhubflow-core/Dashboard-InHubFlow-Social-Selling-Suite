"use client";

import { useEffect } from "react";
import { useRouter } from "@/i18n/navigation";

export default function PostsListRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/viral-posts?tab=list");
  }, [router]);

  return (
    <div className="flex h-64 items-center justify-center text-xs text-gray-500">
      Redirigiendo a Publicaciones...
    </div>
  );
}
