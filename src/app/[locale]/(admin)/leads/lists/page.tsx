"use client";

import { Suspense, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";

function SignalListsRedirectInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const nextParams = new URLSearchParams(searchParams?.toString() || "");
    nextParams.set("tab", "lists");
    router.replace(`/leads?${nextParams.toString()}`);
  }, [router, searchParams]);

  return null;
}

export default function SignalListsRedirect() {
  const t = useTranslations("leads");

  return (
    <Suspense
      fallback={
        <div className="flex h-64 items-center justify-center text-xs text-gray-500">
          {t("redirectingToLists")}
        </div>
      }
    >
      <SignalListsRedirectInner />
      <div className="flex h-64 items-center justify-center text-xs text-gray-500">
        {t("redirectingToLists")}
      </div>
    </Suspense>
  );
}
