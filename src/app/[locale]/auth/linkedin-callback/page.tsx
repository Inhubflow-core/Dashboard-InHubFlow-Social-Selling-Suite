"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, AlertTriangle, ShieldCheck, XCircle } from "lucide-react";

function CallbackContent() {
  const searchParams = useSearchParams();
  const statusParam = searchParams.get("status") || "success";
  const isSuccess = statusParam !== "error" && statusParam !== "failed";
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const message = {
        type: isSuccess ? "LINKEDIN_AUTH_SUCCESS" : "LINKEDIN_AUTH_ERROR",
        status: statusParam,
      };

      try {
        if (window.opener) {
          window.opener.postMessage(message, "*");
        }
        if (window.parent && window.parent !== window) {
          window.parent.postMessage(message, "*");
        }
      } catch (err) {
        console.error("Error enviando postMessage desde linkedin-callback:", err);
      }

      if (isSuccess) {
        const timer = setTimeout(() => {
          setClosing(true);
          try {
            if (window.opener) {
              window.close();
            }
          } catch {
            // Popup could not be closed automatically
          }
        }, 2200);
        return () => clearTimeout(timer);
      }
    }
  }, [isSuccess, statusParam]);

  const handleClose = () => {
    try {
      window.close();
    } catch {
      window.location.href = "/linkedin-accounts";
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col items-center justify-center p-6 text-center">
      <div className="w-full max-w-md rounded-3xl border border-gray-200 bg-white p-8 shadow-xl dark:border-gray-800 dark:bg-gray-900">
        {isSuccess ? (
          <>
            <div className="mx-auto mb-5 flex size-20 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-500 ring-8 ring-emerald-50/50 dark:bg-emerald-950/40 dark:ring-emerald-950/20">
              <CheckCircle2 className="size-10 text-emerald-500" />
            </div>

            <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-600 dark:bg-brand-950/50 dark:text-brand-400 mb-3">
              <ShieldCheck className="size-3.5" />
              InHubFlow Social Selling Suite
            </span>

            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              ¡Conexión Exitosa!
            </h1>

            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
              Tu cuenta de LinkedIn ha sido autenticada y vinculada correctamente con Unipile.
            </p>

            <div className="mt-6 flex flex-col items-center gap-3">
              <div className="inline-flex items-center gap-2 rounded-xl bg-gray-100 px-4 py-2 text-xs font-semibold text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                {closing ? "Cerrando ventana de asistente..." : "Sincronizando con tu Dashboard..."}
              </div>

              <button
                onClick={handleClose}
                className="mt-2 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 underline underline-offset-4"
              >
                Cerrar ventana ahora
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="mx-auto mb-5 flex size-20 items-center justify-center rounded-2xl bg-red-50 text-red-500 ring-8 ring-red-50/50 dark:bg-red-950/40 dark:ring-red-950/20">
              <XCircle className="size-10 text-red-500" />
            </div>

            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              No se pudo conectar la cuenta
            </h1>

            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
              La autorización con LinkedIn no se completó o fue cancelada por el usuario.
            </p>

            <button
              onClick={handleClose}
              className="mt-6 inline-flex items-center justify-center rounded-xl bg-gray-900 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-gray-800 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100"
            >
              Regresar al Dashboard
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default function LinkedInCallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="size-8 rounded-full border-2 border-brand-500 border-t-transparent animate-spin" />
      </div>
    }>
      <CallbackContent />
    </Suspense>
  );
}
