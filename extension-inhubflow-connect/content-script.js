// InHubFlow Connect — Content Script Bridge
// Este script se inyecta en el Dashboard de InHubFlow para permitir
// la comunicación bidireccional segura en 1-clic con la extensión.

(function () {
  // Marca la presencia de la extensión en el DOM para que el Dashboard sepa que está instalada
  try {
    document.documentElement.setAttribute("data-inhubflow-extension-installed", "true");
    document.documentElement.setAttribute("data-inhubflow-extension-version", "1.1.0");
  } catch (e) {
    // ignorar
  }

  if (typeof chrome === "undefined" || !chrome.runtime || !chrome.runtime.onMessage) {
    return;
  }

  // Escuchar mensajes provenientes del popup de la extensión
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (!message || !message.type) return false;

    if (message.type === "PING_INHUBFLOW") {
      sendResponse({ status: "ok", url: window.location.href });
      return true;
    }

    if (message.type === "INHUBFLOW_AUTOCONNECT") {
      const payload = {
        accessToken: message.accessToken,
        premiumToken: message.premiumToken || null,
        userAgent: message.userAgent || navigator.userAgent,
        source: "INHUBFLOW_EXTENSION",
      };

      // 1. Despachar CustomEvent en window para React
      window.dispatchEvent(
        new CustomEvent("INHUBFLOW_AUTOCONNECT_EVENT", {
          detail: payload,
        })
      );

      // 2. Despachar window.postMessage para compatibilidad adicional
      window.postMessage(
        {
          source: "INHUBFLOW_EXTENSION",
          type: "AUTOCONNECT",
          ...payload,
        },
        "*"
      );

      // 3. Escuchar la respuesta del Dashboard para responderle al popup de la extensión
      const handleWebappResponse = (event) => {
        if (
          event.data &&
          event.data.source === "INHUBFLOW_WEBAPP" &&
          event.data.type === "AUTOCONNECT_RESULT"
        ) {
          window.removeEventListener("message", handleWebappResponse);
          sendResponse({
            success: !!event.data.success,
            checkpoint: !!event.data.checkpoint,
            error: event.data.error || null,
            remoteAccountId: event.data.remoteAccountId || null,
          });
        }
      };

      window.addEventListener("message", handleWebappResponse);

      // Timeout de seguridad de 30 segundos
      setTimeout(() => {
        window.removeEventListener("message", handleWebappResponse);
      }, 30000);

      // Indica a Chrome que la respuesta será asíncrona
      return true;
    }

    return false;
  });
})();
