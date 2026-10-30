document.addEventListener("DOMContentLoaded", async () => {
  const stateLoading = document.getElementById("state-loading");
  const stateDetected = document.getElementById("state-detected");
  const stateEmpty = document.getElementById("state-empty");
  const salesNavRow = document.getElementById("sales-nav-row");
  const btnCopy = document.getElementById("btn-copy");
  const btnCopyText = document.getElementById("btn-copy-text");
  const btnOpenLinkedIn = document.getElementById("btn-open-linkedin");

  let detectedLiAt = null;
  let detectedLiA = null;

  try {
    // 1. Verificar si la API de cookies de Chrome está disponible
    if (typeof chrome !== "undefined" && chrome.cookies) {
      const cookieLiAt = await chrome.cookies.get({
        url: "https://www.linkedin.com",
        name: "li_at",
      });

      const cookieLiA = await chrome.cookies.get({
        url: "https://www.linkedin.com",
        name: "li_a",
      });

      if (cookieLiAt && cookieLiAt.value) {
        detectedLiAt = cookieLiAt.value;
      }

      if (cookieLiA && cookieLiA.value) {
        detectedLiA = cookieLiA.value;
      }
    }
  } catch (err) {
    console.error("Error al consultar cookies de LinkedIn:", err);
  }

  // Ocultar estado de carga
  stateLoading.classList.add("hidden");

  if (detectedLiAt) {
    // Sesión detectada con éxito
    stateDetected.classList.remove("hidden");

    if (detectedLiA) {
      salesNavRow.style.display = "flex";
    }

    btnCopy.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(detectedLiAt);
        btnCopy.classList.add("copied");
        btnCopyText.textContent = "¡Código Copiado al Portapapeles! 🎉";

        setTimeout(() => {
          btnCopy.classList.remove("copied");
          btnCopyText.textContent = "Copiar Código de Conexión";
        }, 2500);
      } catch (err) {
        console.error("No se pudo copiar al portapapeles:", err);
        // Fallback usando textarea
        const ta = document.createElement("textarea");
        ta.value = detectedLiAt;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
        btnCopy.classList.add("copied");
        btnCopyText.textContent = "¡Código Copiado! 🎉";
        setTimeout(() => {
          btnCopy.classList.remove("copied");
          btnCopyText.textContent = "Copiar Código de Conexión";
        }, 2500);
      }
    });
  } else {
    // No hay sesión activa en LinkedIn
    stateEmpty.classList.remove("hidden");

    btnOpenLinkedIn.addEventListener("click", () => {
      if (typeof chrome !== "undefined" && chrome.tabs) {
        chrome.tabs.create({ url: "https://www.linkedin.com/login" });
      } else {
        window.open("https://www.linkedin.com/login", "_blank");
      }
    });
  }
});
