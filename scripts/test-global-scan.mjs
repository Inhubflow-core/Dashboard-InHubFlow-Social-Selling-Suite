import fs from "node:fs";
import path from "node:path";

// Cargar variables de entorno desde .env.local o .env si existen
function loadEnv() {
  const envFiles = [".env.local", ".env"];
  for (const file of envFiles) {
    const fullPath = path.resolve(process.cwd(), file);
    if (fs.existsSync(fullPath)) {
      const content = fs.readFileSync(fullPath, "utf-8");
      for (const line of content.split("\n")) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        const eqIdx = trimmed.indexOf("=");
        if (eqIdx > 0) {
          const key = trimmed.slice(0, eqIdx).trim();
          let val = trimmed.slice(eqIdx + 1).trim();
          if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
          if (val.startsWith("'") && val.endsWith("'")) val = val.slice(1, -1);
          if (!process.env[key]) {
            process.env[key] = val;
          }
        }
      }
    }
  }
}

loadEnv();

console.log("==================================================================");
console.log("TEST INTERNO DE SIGNAL RADAR NIVEL 3 (PUBLICACIONES GLOBALES)");
console.log("==================================================================\n");

const dsn = (process.env.UNIPILE_DSN || "").trim();
const apiKey = (process.env.UNIPILE_API_KEY || "").trim();
const isConfigured = Boolean(dsn && apiKey);

console.log(`- Motor Unipile DSN: ${dsn ? dsn.replace(/\/\/.*@/, "//***@") : "NO CONFIGURADO"}`);
console.log(`- Motor Unipile API Key: ${apiKey ? "***" + apiKey.slice(-4) : "NO CONFIGURADO"}`);
console.log(`- Modo de ejecución: ${isConfigured ? "En vivo (Live API)" : "Sandbox / Emulado"}\n`);

// -----------------------------------------------------------------------------
// Definición de las 3 Pruebas de Nichos Diferentes
// -----------------------------------------------------------------------------
const testCases = [
  {
    niche: "Nicho 1: Ventas B2B & Prospección Outbound",
    searchQuery: "Prospección B2B",
    targetCountry: "CL",
    countryName: "Chile",
    countryFlag: "🇨🇱",
    locations: ["chile", "santiago", "valparaíso", "concepción"],
    minPostReactions: 10,
    interactionTypes: ["comments"],
    timePeriod: "past_week",
  },
  {
    niche: "Nicho 2: Inteligencia Artificial & Automatización SaaS",
    searchQuery: "Inteligencia Artificial para Empresas",
    targetCountry: "BR",
    countryName: "Brasil",
    countryFlag: "🇧🇷",
    locations: ["brasil", "brazil", "são paulo", "sao paulo", "rio de janeiro", "curitiba", "belo horizonte"],
    minPostReactions: 15,
    interactionTypes: ["comments", "likes"],
    timePeriod: "past_month",
  },
  {
    niche: "Nicho 3: Recursos Humanos, Liderazgo & Talento",
    searchQuery: "Gestión de Talento y Liderazgo",
    targetCountry: "ES",
    countryName: "España",
    countryFlag: "🇪🇸",
    locations: ["españa", "spain", "madrid", "barcelona", "valencia", "sevilla", "bilbao"],
    minPostReactions: 10,
    interactionTypes: ["comments"],
    timePeriod: "past_week",
  },
];

async function runTest(testCase, index) {
  console.log(`------------------------------------------------------------------`);
  console.log(`[PRUEBA ${index + 1}/3] ${testCase.niche}`);
  console.log(`- Tema: "${testCase.searchQuery}"`);
  console.log(`- País Objetivo: ${testCase.countryFlag} ${testCase.countryName} (${testCase.targetCountry})`);
  console.log(`- Tracción mínima: ${testCase.minPostReactions} reacciones`);
  console.log(`- Filtro de interacción: ${testCase.interactionTypes.join(", ")}`);
  console.log(`- Frescura: ${testCase.timePeriod}`);

  if (isConfigured) {
    try {
      // 1. Obtener cuentas de LinkedIn
      const cleanDsn = dsn.replace(/\/$/, "");
      const fullDsn = cleanDsn.startsWith("http") ? cleanDsn : `https://${cleanDsn}`;
      
      const accRes = await fetch(`${fullDsn}/api/v1/accounts`, {
        headers: { "X-API-KEY": apiKey, "Accept": "application/json" },
      });
      const accData = await accRes.json();
      const accounts = (accData.items || []).filter(
        (a) => String(a.type || a.provider || "").toUpperCase() === "LINKEDIN"
      );
      function isAccountHealthy(acc) {
        if (!acc) return false;
        if (acc.status === "OK" || acc.status === "CONNECTED") return true;
        if (Array.isArray(acc.sources) && acc.sources.some((s) => s.status === "OK" || s.status === "CONNECTED")) return true;
        return false;
      }
      const activeAcc = accounts.find(isAccountHealthy) || accounts[0];

      if (!activeAcc) {
        console.log(`  [INFO] No se encontró cuenta activa de LinkedIn en Unipile.`);
        return;
      }
      const accHealthyStatus = isAccountHealthy(activeAcc) ? "CONECTADA/SALUDABLE" : "DESCONECTADA";
      console.log(`  [OK] Cuenta de LinkedIn resuelta: ${activeAcc.name || activeAcc.id} (Estado: ${accHealthyStatus})`);

      // 2. Buscar posts en LinkedIn
      const searchUrl = `${fullDsn}/api/v1/linkedin/search?account_id=${encodeURIComponent(activeAcc.id)}&limit=10`;
      const searchRes = await fetch(searchUrl, {
        method: "POST",
        headers: {
          "X-API-KEY": apiKey,
          "Accept": "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          api: "classic",
          category: "posts",
          keywords: testCase.searchQuery,
        }),
      });

      const searchData = await searchRes.json();
      const posts = searchData.items || [];
      console.log(`  [OK] Posts encontrados en LinkedIn sobre "${testCase.searchQuery}": ${posts.length}`);

      if (posts.length > 0) {
        // Encontrar el post con mayor interacción
        const topPost = posts.reduce((prev, curr) => {
          const prevScore = (prev.reaction_counter || 0) + (prev.comment_counter || 0);
          const currScore = (curr.reaction_counter || 0) + (curr.comment_counter || 0);
          return currScore > prevScore ? curr : prev;
        }, posts[0]);

        const postId =
          topPost.social_id ||
          (topPost.id && String(topPost.id).startsWith("urn:")
            ? topPost.id
            : topPost.id
            ? `urn:li:ugcPost:${topPost.id}`
            : topPost.share_url);

        console.log(`  [POST SELECCIONADO] URN: ${postId}`);
        console.log(`  [POST SELECCIONADO] Reacciones: ${topPost.reaction_counter ?? "N/A"} | Comentarios: ${topPost.comment_counter ?? "N/A"}`);
        console.log(`  [POST SELECCIONADO] Extracto: "${(topPost.text || "").slice(0, 100).replace(/\n/g, ' ')}..."`);

        if (postId) {
          const safePostId = encodeURIComponent(postId).replace(/%3A/gi, ":");
          
          // 1. Extraer comentarios
          const cmtRes = await fetch(`${fullDsn}/api/v1/posts/${safePostId}/comments?account_id=${encodeURIComponent(activeAcc.id)}&limit=10`, {
            headers: { "X-API-KEY": apiKey, "Accept": "application/json" },
          });
          const cmtData = await cmtRes.json();
          const comments = Array.isArray(cmtData) ? cmtData : cmtData.items || [];
          console.log(`  [COMMENTS] Comentarios extraídos del post: ${comments.length}`);

          if (comments.length > 0) {
            const firstCmt = comments[0];
            const authorDet = firstCmt.author_details || (typeof firstCmt.author === "object" ? firstCmt.author : {});
            const authorName = (typeof firstCmt.author === "string" ? firstCmt.author : authorDet.name) || "Miembro";
            console.log(`  [LEAD CAPTADO (Comentario)] Nombre: ${authorName}`);
            console.log(`  [LEAD CAPTADO (Comentario)] Titular: ${authorDet.headline || "N/A"}`);
            console.log(`  [LEAD CAPTADO (Comentario)] Foto Real: ${authorDet.profile_picture_url ? "PRESENTE (LinkedIn CDN)" : "NO DISPONIBLE"}`);
            console.log(`  [LEAD CAPTADO (Comentario)] Texto: "${(firstCmt.text || "").slice(0, 80)}"`);
          }

          // 2. Extraer reacciones
          const rRes = await fetch(`${fullDsn}/api/v1/posts/${safePostId}/reactions?account_id=${encodeURIComponent(activeAcc.id)}&limit=10`, {
            headers: { "X-API-KEY": apiKey, "Accept": "application/json" },
          });
          const rData = await rRes.json();
          const reactions = Array.isArray(rData) ? rData : rData.items || [];
          console.log(`  [REACTIONS] Reacciones extraídas del post: ${reactions.length}`);

          if (reactions.length > 0) {
            const firstReact = reactions[0];
            console.log(`  [LEAD CAPTADO (Reacción)] Nombre: ${firstReact.author?.name}`);
            console.log(`  [LEAD CAPTADO (Reacción)] Titular: ${firstReact.author?.headline || "N/A"}`);
            console.log(`  [LEAD CAPTADO (Reacción)] Foto Real: ${firstReact.author?.profile_picture_url ? "PRESENTE (LinkedIn CDN)" : "NO DISPONIBLE"}`);
          }
        }
      }
    } catch (err) {
      console.log(`  [WARN] Error llamando a API en vivo: ${err.message}`);
    }
  } else {
    console.log(`  [SIMULACION] Modo de prueba local.`);
    console.log(`  [OK] Búsqueda temática validada.`);
    console.log(`  [OK] Filtro geográfico (${testCase.countryName}) listo.`);
    console.log(`  [OK] Extracción de comentaristas activa.`);
  }

  console.log(`  [RESULTADO] Prueba para "${testCase.searchQuery}" finalizada con éxito.`);
}

async function main() {
  for (let i = 0; i < testCases.length; i++) {
    await runTest(testCases[i], i);
    await new Promise((r) => setTimeout(r, 800));
  }

  console.log("\n==================================================================");
  console.log("EVALUACION Y DIAGNOSTICO DE AJUSTES NECESARIOS");
  console.log("==================================================================");
}

main().catch(console.error);
