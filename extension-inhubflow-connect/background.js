// InHubFlow Connect — Background Service Worker (Manifest V3)
console.log("[InHubFlow Connect] Service worker listo.");

chrome.runtime.onInstalled.addListener((details) => {
  console.log("[InHubFlow Connect] Versión instalada/actualizada:", details.reason);
});

function safeGetCookie(url, name, partitionKey) {
  return new Promise((resolve) => {
    try {
      if (!chrome.cookies || !chrome.cookies.get) {
        resolve(null);
        return;
      }
      const details = { url, name };
      if (partitionKey) details.partitionKey = partitionKey;
      chrome.cookies.get(details, (cookie) => {
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

function safeGetAllCookies(details) {
  return new Promise((resolve) => {
    try {
      if (!chrome.cookies || !chrome.cookies.getAll) {
        resolve([]);
        return;
      }
      chrome.cookies.getAll(details, (cookies) => {
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
}

async function getLinkedInCookiesComprehensive() {
  const result = { liAt: null, liA: null, source: null };

  // 1. Detección directa en URLs canónicas oficiales de LinkedIn (Método estándar del 99% de extensiones)
  const canonicalUrls = [
    "https://www.linkedin.com",
    "https://linkedin.com",
    "https://www.linkedin.com/",
    "https://linkedin.com/",
    "https://www.linkedin.com/feed",
    "https://linkedin.com/feed",
  ];

  for (const u of canonicalUrls) {
    const cAt = await safeGetCookie(u, "li_at");
    if (cAt && cAt.value) {
      result.liAt = cAt.value;
      const cA = await safeGetCookie(u, "li_a");
      if (cA && cA.value) result.liA = cA.value;
      result.source = `directUrl:${u}`;
      return result;
    }
  }

  // 2. Consulta por dominio exacto
  const domains = ["linkedin.com", "www.linkedin.com"];
  for (const d of domains) {
    const cookies = await safeGetAllCookies({ domain: d });
    for (const c of cookies) {
      if (c.name === "li_at" && c.value && !result.liAt) result.liAt = c.value;
      if (c.name === "li_a" && c.value && !result.liA) result.liA = c.value;
    }
    if (result.liAt) {
      result.source = `domain:${d}`;
      return result;
    }
  }

  // 3. Pestaña activa en la ventana activa (lastFocusedWindow)
  try {
    const tabs = await new Promise((r) =>
      chrome.tabs.query({ active: true, lastFocusedWindow: true }, (t) => r(t || []))
    );
    if (tabs[0]?.url && tabs[0].url.includes("linkedin.com")) {
      const activeCookies = await safeGetAllCookies({ url: tabs[0].url });
      for (const c of activeCookies) {
        if (c.name === "li_at" && c.value && !result.liAt) result.liAt = c.value;
        if (c.name === "li_a" && c.value && !result.liA) result.liA = c.value;
      }
      if (result.liAt) {
        result.source = "activeTab";
        return result;
      }
    }
  } catch (e) {}

  // 4. Soporte para cookies particionadas (CHIPS en Chrome reciente)
  for (const u of ["https://www.linkedin.com", "https://linkedin.com"]) {
    const cAt = await safeGetCookie(u, "li_at", {});
    if (cAt && cAt.value) {
      result.liAt = cAt.value;
      const cA = await safeGetCookie(u, "li_a", {});
      if (cA && cA.value) result.liA = cA.value;
      result.source = `partitioned:${u}`;
      return result;
    }
  }

  return result;
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message && message.type === "GET_LINKEDIN_COOKIES") {
    getLinkedInCookiesComprehensive().then((res) => {
      sendResponse(res);
    });
    return true;
  }
  return false;
});
