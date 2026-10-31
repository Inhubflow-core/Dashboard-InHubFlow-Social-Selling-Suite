(function () {
  let cachedLiAt = null;
  let cachedLiA = null;

  async function queryLinkedInCookies() {
    if (typeof chrome === "undefined" || !chrome.cookies) {
      return { liAt: null, liA: null };
    }

    try {
      // 1. Consulta veloz en memoria de cookies de linkedin.com
      const cookies = await chrome.cookies.getAll({ domain: "linkedin.com" });
      let liAt = cookies.find((c) => c.name === "li_at")?.value || null;
      let liA = cookies.find((c) => c.name === "li_a")?.value || null;

      if (liAt) return { liAt, liA };

      // 2. Fallback www
      const wwwCookies = await chrome.cookies.getAll({ domain: "www.linkedin.com" });
      liAt = wwwCookies.find((c) => c.name === "li_at")?.value || null;
      liA = wwwCookies.find((c) => c.name === "li_a")?.value || null;

      if (liAt) return { liAt, liA };

      // 3. Fallback canónico completo
      const [c1, c2] = await Promise.all([
        chrome.cookies.get({ url: "https://www.linkedin.com", name: "li_at" }).catch(() => null),
        chrome.cookies.get({ url: "https://www.linkedin.com", name: "li_a" }).catch(() => null),
      ]);

      return {
        liAt: c1?.value || null,
        liA: c2?.value || null,
      };
    } catch (err) {
      console.error("[InHubFlow Connect] Error leyendo cookies:", err);
      return { liAt: null, liA: null };
    }
  }

  function showFeedback(msg, type = "info") {
    const box = document.getElementById("feedback-box");
    const text = document.getElementById("feedback-text");
    if (!box || !text) return;

    box.className = `feedback-box ${type}`;
    text.textContent = msg;
    box.classList.remove("hidden");
  }

  async function findInHubFlowTabs() {
    if (typeof chrome === "undefined" || !chrome.tabs) return [];
    try {
      const tabs = await chrome.tabs.query({
        url: [
          "http://localhost:3001/*",
          "http://localhost:3000/*",
          "https://*.inhubflow.com/*",
          "https://inhubflow.com/*",
        ],
      });
      return tabs || [];
    } catch {
      return [];
    }
  }

  async function handleAutoConnect() {
    const btn = document.getElementById("btn-autoconnect");
    const btnSpinner = document.getElementById("btn-spinner");
    const btnBolt = document.getElementById("btn-bolt");
    const btnText = document.getElementById("btn-autoconnect-text");

    if (!cachedLiAt) {
      showFeedback("No se detectó la cookie de sesión de LinkedIn.", "error");
      return;
    }

    // Estado cargando en el botón
    btn.classList.add("connecting");
    btn.disabled = true;
    if (btnSpinner) btnSpinner.classList.remove("hidden");
    if (btnBolt) btnBolt.classList.add("hidden");
    if (btnText) btnText.textContent = "Conectando con InHubFlow...";
    showFeedback("Vinculando tu sesión con InHubFlow...", "info");

    try {
      const tabs = await findInHubFlowTabs();

      if (tabs.length > 0) {
        // Hay al menos una pestaña de InHubFlow abierta
        const targetTab = tabs[0];

        // Traer la pestaña al frente para que el usuario vea la magia
        try {
          await chrome.tabs.update(targetTab.id, { active: true });
          if (targetTab.windowId) {
            await chrome.windows.update(targetTab.windowId, { focused: true });
          }
        } catch {
          // ignorar si no se pudo enfocar
        }

        // Enviar mensaje al content script
        chrome.tabs.sendMessage(
          targetTab.id,
          {
            type: "INHUBFLOW_AUTOCONNECT",
            accessToken: cachedLiAt,
            premiumToken: cachedLiA,
            userAgent: navigator.userAgent,
          },
          (response) => {
            // Manejo de respuesta desde el content-script / webapp
            btn.classList.remove("connecting");
            if (btnSpinner) btnSpinner.classList.add("hidden");

            if (chrome.runtime.lastError || !response) {
              // Si el content-script no respondió (página previa a la inyección o modal aún cargando),
              // ejecutamos fallback directo por API usando el origen de la pestaña
              executeDirectApiFallback(targetTab.url || "http://localhost:3001");
              return;
            }

            if (response.success) {
              btn.classList.add("connected-success");
              if (btnText) btnText.textContent = "✓ ¡Conectado con Éxito!";
              showFeedback("¡Tu cuenta de LinkedIn quedó conectada a InHubFlow!", "success");
            } else if (response.checkpoint) {
              if (btnText) btnText.textContent = "Verifica tu cuenta en InHubFlow";
              showFeedback("LinkedIn solicitó verificación 2FA. Revisa la pantalla de tu Dashboard.", "info");
              btn.disabled = false;
            } else {
              if (btnBolt) btnBolt.classList.remove("hidden");
              if (btnText) btnText.textContent = "⚡ Reintentar Conexión";
              showFeedback(response.error || "No se pudo completar la conexión.", "error");
              btn.disabled = false;
            }
          }
        );
      } else {
        // No hay pestañas de InHubFlow abiertas: creamos una en localhost:3001/linkedin-accounts
        // y realizamos la llamada a la API nativa
        await executeDirectApiFallback("http://localhost:3001");
      }
    } catch (err) {
      console.error("[InHubFlow Connect] Error en autoconexión:", err);
      btn.classList.remove("connecting");
      btn.disabled = false;
      if (btnSpinner) btnSpinner.classList.add("hidden");
      if (btnBolt) btnBolt.classList.remove("hidden");
      if (btnText) btnText.textContent = "⚡ Conectar LinkedIn con InHub";
      showFeedback(err instanceof Error ? err.message : "Error al conectar.", "error");
    }
  }

  async function executeDirectApiFallback(baseUrl) {
    const btn = document.getElementById("btn-autoconnect");
    const btnSpinner = document.getElementById("btn-spinner");
    const btnBolt = document.getElementById("btn-bolt");
    const btnText = document.getElementById("btn-autoconnect-text");

    let origin = "http://localhost:3001";
    try {
      origin = new URL(baseUrl).origin;
    } catch {
      origin = "http://localhost:3001";
    }

    try {
      const res = await fetch(`${origin}/api/unipile/auth-native`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "cookie",
          accessToken: cachedLiAt,
          premiumToken: cachedLiA || undefined,
          userAgent: navigator.userAgent,
        }),
      });

      const data = await res.json();
      btn.classList.remove("connecting");
      if (btnSpinner) btnSpinner.classList.add("hidden");

      if (res.ok && !data.checkpoint) {
        btn.classList.add("connected-success");
        if (btnText) btnText.textContent = "✓ ¡Conectado con Éxito!";
        showFeedback("¡Tu cuenta de LinkedIn quedó conectada a InHubFlow!", "success");

        // Si no había pestaña abierta, abrir el dashboard
        if (typeof chrome !== "undefined" && chrome.tabs) {
          const tabs = await findInHubFlowTabs();
          if (tabs.length === 0) {
            chrome.tabs.create({ url: `${origin}/linkedin-accounts` });
          }
        }
      } else if (data.checkpoint) {
        if (btnText) btnText.textContent = "Verificación 2FA Requerida";
        showFeedback("LinkedIn solicita código de seguridad. Abre InHubFlow para ingresarlo.", "info");
        btn.disabled = false;
      } else {
        if (btnBolt) btnBolt.classList.remove("hidden");
        if (btnText) btnText.textContent = "⚡ Reintentar Conexión";
        showFeedback(data.error || "No se pudo conectar con InHubFlow.", "error");
        btn.disabled = false;
      }
    } catch (err) {
      btn.classList.remove("connecting");
      btn.disabled = false;
      if (btnSpinner) btnSpinner.classList.add("hidden");
      if (btnBolt) btnBolt.classList.remove("hidden");
      if (btnText) btnText.textContent = "⚡ Conectar LinkedIn con InHub";
      showFeedback("Error comunicando con el servidor de InHubFlow.", "error");
    }
  }

  async function init() {
    const stateLoading = document.getElementById("state-loading");
    const stateDetected = document.getElementById("state-detected");
    const stateEmpty = document.getElementById("state-empty");
    const cookiePreview = document.getElementById("cookie-preview");
    const salesNavRow = document.getElementById("sales-nav-row");
    const btnAutoConnect = document.getElementById("btn-autoconnect");
    const btnCopy = document.getElementById("btn-copy");
    const btnCopyText = document.getElementById("btn-copy-text");
    const btnOpenLinkedIn = document.getElementById("btn-open-linkedin");

    // Consultar cookies inmediatamente
    const { liAt, liA } = await queryLinkedInCookies();
    cachedLiAt = liAt;
    cachedLiA = liA;

    if (stateLoading) stateLoading.classList.add("hidden");

    if (liAt) {
      if (stateDetected) stateDetected.classList.remove("hidden");

      if (cookiePreview) {
        const prefix = liAt.slice(0, 6);
        cookiePreview.textContent = `${prefix}•••••• (${liAt.length} chars)`;
      }

      if (liA && salesNavRow) {
        salesNavRow.style.display = "flex";
      }

      if (btnAutoConnect) {
        btnAutoConnect.addEventListener("click", handleAutoConnect);
      }

      if (btnCopy) {
        btnCopy.addEventListener("click", async () => {
          try {
            await navigator.clipboard.writeText(liAt);
            btnCopy.classList.add("copied");
            if (btnCopyText) btnCopyText.textContent = "¡Código Copiado! 🎉";

            setTimeout(() => {
              btnCopy.classList.remove("copied");
              if (btnCopyText) btnCopyText.textContent = "Copiar Código Manualmente";
            }, 3000);
          } catch (err) {
            const ta = document.createElement("textarea");
            ta.value = liAt;
            document.body.appendChild(ta);
            ta.select();
            document.execCommand("copy");
            document.body.removeChild(ta);
            btnCopy.classList.add("copied");
            if (btnCopyText) btnCopyText.textContent = "¡Código Copiado! 🎉";
            setTimeout(() => {
              btnCopy.classList.remove("copied");
              if (btnCopyText) btnCopyText.textContent = "Copiar Código Manualmente";
            }, 3000);
          }
        });
      }
    } else {
      if (stateEmpty) stateEmpty.classList.remove("hidden");

      if (btnOpenLinkedIn) {
        btnOpenLinkedIn.addEventListener("click", () => {
          if (typeof chrome !== "undefined" && chrome.tabs) {
            chrome.tabs.create({ url: "https://www.linkedin.com/login" });
          } else {
            window.open("https://www.linkedin.com/login", "_blank");
          }
        });
      }
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
