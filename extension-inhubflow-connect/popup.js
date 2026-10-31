(function () {
  async function queryLinkedInCookies() {
    if (typeof chrome === "undefined" || !chrome.cookies) {
      return { liAt: null, liA: null };
    }

    try {
      // 1. Consulta directa y veloz a todas las cookies de linkedin.com (memoria local del navegador)
      const cookies = await chrome.cookies.getAll({ domain: "linkedin.com" });
      let liAt = cookies.find((c) => c.name === "li_at")?.value || null;
      let liA = cookies.find((c) => c.name === "li_a")?.value || null;

      if (liAt) return { liAt, liA };

      // 2. Fallback si estuviera en dominio con www
      const wwwCookies = await chrome.cookies.getAll({ domain: "www.linkedin.com" });
      liAt = wwwCookies.find((c) => c.name === "li_at")?.value || null;
      liA = wwwCookies.find((c) => c.name === "li_a")?.value || null;

      if (liAt) return { liAt, liA };

      // 3. Fallback por URL canónica completa
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

  async function init() {
    const stateLoading = document.getElementById("state-loading");
    const stateDetected = document.getElementById("state-detected");
    const stateEmpty = document.getElementById("state-empty");
    const cookiePreview = document.getElementById("cookie-preview");
    const salesNavRow = document.getElementById("sales-nav-row");
    const btnCopy = document.getElementById("btn-copy");
    const btnCopyText = document.getElementById("btn-copy-text");
    const btnOpenLinkedIn = document.getElementById("btn-open-linkedin");

    // Consultar cookies inmediatamente
    const { liAt, liA } = await queryLinkedInCookies();

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

      if (btnCopy) {
        btnCopy.addEventListener("click", async () => {
          try {
            await navigator.clipboard.writeText(liAt);
            btnCopy.classList.add("copied");
            if (btnCopyText) btnCopyText.textContent = "¡Código Copiado al Portapapeles! 🎉";

            setTimeout(() => {
              btnCopy.classList.remove("copied");
              if (btnCopyText) btnCopyText.textContent = "Copiar Código de Conexión";
            }, 3000);
          } catch (err) {
            console.error("No se pudo copiar con API clipboard:", err);
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
              if (btnCopyText) btnCopyText.textContent = "Copiar Código de Conexión";
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
