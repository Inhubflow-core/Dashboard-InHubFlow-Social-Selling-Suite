(function () {
  let cachedLiAt = null;
  let cachedLiA = null;

  function safeGetAll(query) {
    return new Promise((resolve) => {
      try {
        if (!chrome.cookies || !chrome.cookies.getAll) {
          resolve([]);
          return;
        }
        chrome.cookies.getAll(query, (cookies) => {
          if (chrome.runtime.lastError) {
            console.warn("[InHubFlow Connect] cookies.getAll error:", chrome.runtime.lastError.message);
            resolve([]);
          } else {
            resolve(cookies || []);
          }
        });
      } catch (err) {
        console.warn("[InHubFlow Connect] cookies.getAll exception:", err);
        resolve([]);
      }
    });
  }

  function safeGet(query) {
    return new Promise((resolve) => {
      try {
        if (!chrome.cookies || !chrome.cookies.get) {
          resolve(null);
          return;
        }
        chrome.cookies.get(query, (cookie) => {
          if (chrome.runtime.lastError) {
            resolve(null);
          } else {
            resolve(cookie || null);
          }
        });
      } catch {
        resolve(null);
      }
    });
  }

  // Consulta exhaustiva en cascada con 7 estrategias de detección
  async function queryLinkedInCookies() {
    // 0. Intentar primero con el service worker en background (si está disponible)
    try {
      if (typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.sendMessage) {
        const bgResult = await new Promise((resolve) => {
          const timeout = setTimeout(() => resolve(null), 800);
          try {
            chrome.runtime.sendMessage({ type: "GET_LINKEDIN_COOKIES" }, (res) => {
              clearTimeout(timeout);
              if (chrome.runtime.lastError) {
                resolve(null);
              } else {
                resolve(res || null);
              }
            });
          } catch {
            clearTimeout(timeout);
            resolve(null);
          }
        });

        if (bgResult && bgResult.liAt) {
          console.log("[InHubFlow Connect] Cookies obtenidas exitosamente vía Background Service Worker:", bgResult.source);
          return { liAt: bgResult.liAt, liA: bgResult.liA };
        }
      }
    } catch (e) {
      // Continuar con detección directa local
    }

    if (typeof chrome === "undefined" || !chrome.cookies) {
      console.warn("[InHubFlow Connect] chrome.cookies no está disponible.");
      return { liAt: null, liA: null };
    }

    const found = { liAt: null, liA: null };

    const checkCookie = (cookie) => {
      if (!cookie || !cookie.value) return;
      if (cookie.name === "li_at" && !found.liAt) {
        found.liAt = cookie.value;
      }
      if (cookie.name === "li_a" && !found.liA) {
        found.liA = cookie.value;
      }
    };

    const checkList = (list) => {
      if (Array.isArray(list)) {
        list.forEach(checkCookie);
      }
    };

    try {
      // Estrategia 1: Pestaña activa actual (la que el usuario está viendo directamente)
      const tabs = await new Promise((r) =>
        chrome.tabs.query({ active: true, currentWindow: true }, (t) => r(t || []))
      );
      if (tabs[0]?.url && tabs[0].url.includes("linkedin.com")) {
        const activeCookies = await safeGetAll({ url: tabs[0].url });
        checkList(activeCookies);
        if (found.liAt) return found;
      }

      // Estrategia 2: Cualquier pestaña de LinkedIn abierta en el navegador
      const liTabs = await new Promise((r) =>
        chrome.tabs.query({ url: "*://*.linkedin.com/*" }, (t) => r(t || []))
      );
      for (const t of liTabs) {
        if (t.url) {
          const tabCookies = await safeGetAll({ url: t.url });
          checkList(tabCookies);
          if (found.liAt) return found;
        }
      }

      // Estrategia 3: Búsqueda global directa por nombre de cookie
      const nameQuery = await safeGetAll({ name: "li_at" });
      checkList(nameQuery);
      if (found.liAt) {
        const nameQueryA = await safeGetAll({ name: "li_a" });
        checkList(nameQueryA);
        return found;
      }

      // Estrategia 4: Obtener todas las cookies accesibles del dominio linkedin
      const allCookies = await safeGetAll({});
      const liCookies = allCookies.filter(
        (c) => c.domain && c.domain.includes("linkedin.com")
      );
      checkList(liCookies);
      if (found.liAt) return found;

      // Estrategia 5: Variantes de dominio estándar
      const domainVariants = [
        ".linkedin.com",
        "linkedin.com",
        ".www.linkedin.com",
        "www.linkedin.com",
      ];
      for (const d of domainVariants) {
        const cookies = await safeGetAll({ domain: d });
        checkList(cookies);
        if (found.liAt) return found;
      }

      // Estrategia 6: URLs canónicas completas con barra final
      const urlVariants = [
        "https://www.linkedin.com/",
        "https://linkedin.com/",
        "https://www.linkedin.com/feed/",
        "https://linkedin.com/feed/",
      ];
      for (const u of urlVariants) {
        const [cLiAt, cLiA] = await Promise.all([
          safeGet({ url: u, name: "li_at" }),
          safeGet({ url: u, name: "li_a" }),
        ]);
        checkCookie(cLiAt);
        checkCookie(cLiA);
        if (found.liAt) return found;
      }

      // Estrategia 7: Todos los almacenes de cookies (perfiles / multi-cuenta)
      const stores = await new Promise((r) =>
        chrome.cookies.getAllCookieStores((s) => r(s || []))
      );
      for (const store of stores) {
        const storeCookies = await safeGetAll({
          storeId: store.id,
          name: "li_at",
        });
        checkList(storeCookies);
        if (found.liAt) return found;
      }
    } catch (err) {
      console.error("[InHubFlow Connect] Error en detección exhaustiva:", err);
    }

    return found;
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
          "http://localhost:*/*",
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
            btn.classList.remove("connecting");
            if (btnSpinner) btnSpinner.classList.add("hidden");

            if (chrome.runtime.lastError || !response) {
              // Si el content-script no respondió, ejecutar fallback directo por API
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

  async function checkAndRenderSession() {
    const stateLoading = document.getElementById("state-loading");
    const stateDetected = document.getElementById("state-detected");
    const stateEmpty = document.getElementById("state-empty");
    const cookiePreview = document.getElementById("cookie-preview");
    const salesNavRow = document.getElementById("sales-nav-row");
    const btnAutoConnect = document.getElementById("btn-autoconnect");
    const btnCopy = document.getElementById("btn-copy");
    const btnCopyText = document.getElementById("btn-copy-text");

    if (stateLoading) stateLoading.classList.remove("hidden");
    if (stateDetected) stateDetected.classList.add("hidden");
    if (stateEmpty) stateEmpty.classList.add("hidden");

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

      if (btnAutoConnect && !btnAutoConnect._hasClick) {
        btnAutoConnect._hasClick = true;
        btnAutoConnect.addEventListener("click", handleAutoConnect);
      }

      if (btnCopy && !btnCopy._hasClick) {
        btnCopy._hasClick = true;
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
    }
  }

  function init() {
    const btnOpenLinkedIn = document.getElementById("btn-open-linkedin");
    const btnRetry = document.getElementById("btn-retry");

    if (btnRetry) {
      btnRetry.addEventListener("click", () => {
        checkAndRenderSession();
      });
    }

    if (btnOpenLinkedIn) {
      btnOpenLinkedIn.addEventListener("click", () => {
        if (typeof chrome !== "undefined" && chrome.tabs) {
          chrome.tabs.create({ url: "https://www.linkedin.com/feed/" });
        } else {
          window.open("https://www.linkedin.com/feed/", "_blank");
        }
      });
    }

    // Iniciar detección inmediatamente
    checkAndRenderSession();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
