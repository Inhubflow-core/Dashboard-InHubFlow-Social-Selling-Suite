import fs from "node:fs";

// Cargar variables de entorno
const env = fs.readFileSync(".env.local", "utf-8");
const dsn = env.match(/UNIPILE_DSN=(.*)/)?.[1]?.trim().replace(/\/$/, "");
const key = env.match(/UNIPILE_API_KEY=(.*)/)?.[1]?.trim();

console.log("==================================================================");
console.log("TEST EN VIVO: VALIDACION ESTRICTA DE PAIS (CHILE 🇨🇱) EN NIVEL 3");
console.log("==================================================================\n");

async function testChileScan() {
  const accountId = "6yecZUhYS1mvPOJJC7p-zQ"; // RobertoOrse Agencia (saludable)

  console.log("1. Ejecutando escaneo con búsqueda contextualizada para Chile...");
  const searchQuery = "Prospección B2B";
  const targetCountry = "CL";
  const countryName = "Chile";
  const keywords = ["chile", "santiago", "valparaíso", "valparaiso", "concepción", "concepcion"];

  // Búsqueda con país
  const queryWithCountry = `${searchQuery} ${countryName}`;
  const searchRes = await fetch(`${dsn}/api/v1/linkedin/search?account_id=${encodeURIComponent(accountId)}&limit=8`, {
    method: "POST",
    headers: { "X-API-KEY": key, "Content-Type": "application/json" },
    body: JSON.stringify({ api: "classic", category: "posts", keywords: queryWithCountry }),
  });
  const searchData = await searchRes.json();
  const posts = searchData.items || [];
  console.log(`[OK] Posts encontrados en LinkedIn contextualizados en Chile: ${posts.length}`);

  for (let i = 0; i < Math.min(3, posts.length); i++) {
    const p = posts[i];
    console.log(`\n--- Post #${i + 1} ---`);
    console.log(`Autor: ${p.author?.name} (${p.author?.headline})`);
    console.log(`Share URL: ${p.share_url}`);
    console.log(`Reacciones: ${p.reaction_counter} | Comentarios: ${p.comment_counter}`);
    console.log(`Texto: "${(p.text || "").slice(0, 100).replace(/\n/g, " ")}..."`);
  }

  // Analizar todos los posts con comentarios o reacciones
  console.log("\n2. Extrayendo participantes y verificando país estricto...");
  const postsWithInteractions = posts.filter((p) => (p.comment_counter || 0) > 0 || (p.reaction_counter || 0) > 0);
  console.log(`Posts con interacción en Chile: ${postsWithInteractions.length}`);

  const approvedLeads = [];
  const rejectedLeads = [];

  for (const post of postsWithInteractions.slice(0, 3)) {
    const postId = post.social_id || `urn:li:activity:${post.id}`;
    const cmtRes = await fetch(`${dsn}/api/v1/posts/${encodeURIComponent(postId)}/comments?account_id=${encodeURIComponent(accountId)}&limit=10`, {
      headers: { "X-API-KEY": key },
    });
    const cmtData = await cmtRes.json();
    const comments = cmtData.items || (Array.isArray(cmtData) ? cmtData : []);

    for (const c of comments) {
      const authorDet = c.author_details || (typeof c.author === "object" ? c.author : {});
      const authorName = (typeof c.author === "string" ? c.author : authorDet.name) || "Miembro";
      const headline = authorDet.headline || "";
      let cleanId = "";
      if (authorDet.profile_url) {
        cleanId = authorDet.profile_url.split("/in/")[1]?.replace(/\/$/, "");
      }

      let realLocation = "Desconocida";
      if (cleanId) {
        try {
          const uRes = await fetch(`${dsn}/api/v1/users/${cleanId}?account_id=${encodeURIComponent(accountId)}`, {
            headers: { "X-API-KEY": key },
          });
          const uData = await uRes.json();
          realLocation = uData.location || "No especificada";
        } catch (err) {
          realLocation = "Error al resolver";
        }
      }

      const normLoc = realLocation.toLowerCase();
      const normHead = headline.toLowerCase();
      const isChile = keywords.some((kw) => normLoc.includes(kw) || normHead.includes(kw));

      if (isChile) {
        approvedLeads.push({ name: authorName, headline, location: realLocation, postUrl: post.share_url });
      } else {
        rejectedLeads.push({ name: authorName, headline, location: realLocation, postUrl: post.share_url });
      }
    }
  }

  console.log("\n==================================================================");
  console.log("RESULTADO DE LA VALIDACION DE PAIS:");
  console.log("==================================================================");
  console.log(`[ACEPTADOS - 100% CHILE 🇨🇱] (${approvedLeads.length}):`);
  approvedLeads.forEach((l) => console.log(`  ✓ ${l.name} | Ubicación: ${l.location} | Titular: ${l.headline.slice(0, 60)}`));

  console.log(`\n[DESCARTADOS - OTROS PAÍSES O NO VERIFICADOS] (${rejectedLeads.length}):`);
  rejectedLeads.forEach((l) => console.log(`  ✕ ${l.name} | Ubicación: ${l.location} | Titular: ${l.headline.slice(0, 60)}`));

  console.log(`\n[LINK DEL POST ASIGNADO A LOS LEADS]: ${postWithComments.share_url}`);
}

testChileScan().catch(console.error);
