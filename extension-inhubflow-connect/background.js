// InHubFlow Connect — Background Service Worker (Manifest V3)
// Mantiene la extensión activa, rápida y con acceso ininterrumpido al almacenamiento de cookies.

console.log("[InHubFlow Connect] Background service worker iniciado.");

chrome.runtime.onInstalled.addListener((details) => {
  console.log("[InHubFlow Connect] Extensión instalada/actualizada:", details.reason);
});

// Función integral de detección de cookies de LinkedIn con 7 estrategias de respaldo
async function getLinkedInCookiesComprehensive() {
  if (typeof chrome === "undefined" || !chrome.cookies) {
    return { liAt: null, liA: null, debug: "chrome.cookies no disponible" };
  }

  const found = { liAt: null, liA: null, source: null };

  const checkCookie = (cookie) => {
    if (!cookie) return;
    if (cookie.name === "li_at" && !found.liAt && cookie.value) {
      found.liAt = cookie.value;
    }
    if (cookie.name === "li_a" && !found.liA && cookie.value) {
      found.liA = cookie.value;
    }
  };

  const checkList = (list) => {
    if (Array.isArray(list)) {
      list.forEach(checkCookie);
    }
  };

  const safeGetAll = (query) => {
    return new Promise((resolve) => {
      try {
        chrome.cookies.getAll(query, (cookies) => {
          if (chrome.runtime.lastError) {
            resolve([]);
          } else {
            resolve(cookies || []);
          }
        });
      } catch {
        resolve([]);
      }
    });
  };

  const safeGet = (query) => {
    return new Promise((resolve) => {
      try {
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
  };

  // Estrategia 1: Pestaña activa actual (la que el usuario está viendo en este instante)
  try {
    const tabs = await new Promise((r) =>
      chrome.tabs.query({ active: true, currentWindow: true }, (t) => r(t || []))
    );
    if (tabs[0]?.url && tabs[0].url.includes("linkedin.com")) {
      const activeCookies = await safeGetAll({ url: tabs[0].url });
      checkList(activeCookies);
      if (found.liAt) {
        found.source = "activeTab";
        return found;
      }
    }
  } catch (e) {}

  // Estrategia 2: Cualquier pestaña de LinkedIn abierta en el navegador
  try {
    const liTabs = await new Promise((r) =>
      chrome.tabs.query({ url: "*://*.linkedin.com/*" }, (t) => r(t || []))
    );
    for (const t of liTabs) {
      if (t.url) {
        const tabCookies = await safeGetAll({ url: t.url });
        checkList(tabCookies);
        if (found.liAt) {
          found.source = "anyTab";
          return found;
        }
      }
    }
  } catch (e) {}

  // Estrategia 3: Búsqueda directa por nombre de cookie ({ name: "li_at" })
  const nameQueryCookies = await safeGetAll({ name: "li_at" });
  checkList(nameQueryCookies);
  if (found.liAt) {
    const nameQueryA = await safeGetAll({ name: "li_a" });
    checkList(nameQueryA);
    found.source = "nameQuery";
    return found;
  }

  // Estrategia 4: Obtener todas las cookies accesibles del dominio linkedin
  const allCookies = await safeGetAll({});
  const liCookies = allCookies.filter(
    (c) => c.domain && c.domain.includes("linkedin.com")
  );
  checkList(liCookies);
  if (found.liAt) {
    found.source = "allCookies";
    return found;
  }

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
    if (found.liAt) {
      found.source = `domain:${d}`;
      return found;
    }
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
    if (found.liAt) {
      found.source = `url:${u}`;
      return found;
    }
  }

  // Estrategia 7: Inspeccionar todos los almacenes de cookies (perfiles / navegación privada)
  try {
    const stores = await new Promise((r) =>
      chrome.cookies.getAllCookieStores((s) => r(s || []))
    );
    for (const store of stores) {
      const storeCookies = await safeGetAll({
        storeId: store.id,
        name: "li_at",
      });
      checkList(storeCookies);
      if (found.liAt) {
        found.source = `store:${store.id}`;
        return found;
      }
    }
  } catch (e) {}

  return found;
}

// Receptor de mensajes del popup y del content-script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message && message.type === "GET_LINKEDIN_COOKIES") {
    getLinkedInCookiesComprehensive().then((res) => {
      sendResponse(res);
    });
    return true; // Respuesta asíncrona
  }
  return false;
});
