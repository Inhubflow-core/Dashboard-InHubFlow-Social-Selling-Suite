// scripts/validate-i18n.mjs
import fs from "node:fs";
import path from "node:path";

const MESSAGES_DIR = path.resolve("./src/messages");
const LOCALES = ["es", "en", "pt-BR"];

function loadJson(locale) {
  const filePath = path.join(MESSAGES_DIR, `${locale}.json`);
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }
  const raw = fs.readFileSync(filePath, "utf8");
  try {
    return JSON.parse(raw);
  } catch (err) {
    throw new Error(`Invalid JSON in ${filePath}: ${err.message}`);
  }
}

function getLeaves(obj, prefix = "") {
  const leaves = {};
  for (const [key, val] of Object.entries(obj)) {
    const full = prefix ? `${prefix}.${key}` : key;
    if (val && typeof val === "object" && !Array.isArray(val)) {
      Object.assign(leaves, getLeaves(val, full));
    } else {
      leaves[full] = val;
    }
  }
  return leaves;
}

function extractPlaceholders(text) {
  if (typeof text !== "string") return [];
  const matches = text.match(/\{[a-zA-Z0-9_]+\}/g) || [];
  return matches.sort();
}

export function validateI18n() {
  console.log("==================================================================");
  console.log("VALIDACIÓN AUTOMÁTICA DE INTERNACIONALIZACIÓN (i18n)");
  console.log("Locales:", LOCALES.join(", "));
  console.log("==================================================================\n");

  const catalogs = {};
  const leafCatalogs = {};

  for (const loc of LOCALES) {
    try {
      catalogs[loc] = loadJson(loc);
      leafCatalogs[loc] = getLeaves(catalogs[loc]);
      console.log(`[PASS] JSON válido: ${loc}.json (${Object.keys(leafCatalogs[loc]).length} claves finales)`);
    } catch (err) {
      console.error(`[FAIL] Error cargando ${loc}.json:`, err.message);
      process.exit(1);
    }
  }

  const baseLocale = "es";
  const baseKeys = Object.keys(leafCatalogs[baseLocale]).sort();
  let errors = 0;

  // 1. Verificar claves faltantes o sobrantes
  for (const loc of LOCALES) {
    if (loc === baseLocale) continue;
    const locKeys = new Set(Object.keys(leafCatalogs[loc]));
    const missing = baseKeys.filter((k) => !locKeys.has(k));
    const extra = Object.keys(leafCatalogs[loc]).filter((k) => !leafCatalogs[baseLocale][k]);

    if (missing.length === 0) {
      console.log(`[PASS] Cero claves faltantes en ${loc}.json vs ${baseLocale}.json`);
    } else {
      console.error(`[FAIL] ${missing.length} claves faltantes en ${loc}.json:`, missing.slice(0, 10));
      errors += missing.length;
    }

    if (extra.length === 0) {
      console.log(`[PASS] Cero claves huérfanas en ${loc}.json vs ${baseLocale}.json`);
    } else {
      console.error(`[FAIL] ${extra.length} claves extra en ${loc}.json:`, extra.slice(0, 10));
      errors += extra.length;
    }
  }

  // 2. Verificar simetría de placeholders de interpolación y textos vacíos
  let emptyCount = 0;
  let placeholderMismatches = 0;

  for (const key of baseKeys) {
    const baseVal = leafCatalogs[baseLocale][key];
    const basePlaceholders = extractPlaceholders(baseVal).join(",");

    for (const loc of LOCALES) {
      const val = leafCatalogs[loc][key];
      if (val === undefined || val === null || (typeof val === "string" && val.trim() === "")) {
        console.error(`[FAIL] Clave vacía en ${loc}.json: ${key}`);
        emptyCount++;
        errors++;
      } else {
        const locPlaceholders = extractPlaceholders(val).join(",");
        if (locPlaceholders !== basePlaceholders) {
          console.error(`[FAIL] Placeholders no coinciden en '${key}': ${baseLocale}='${basePlaceholders}' vs ${loc}='${locPlaceholders}'`);
          placeholderMismatches++;
          errors++;
        }
      }
    }
  }

  if (emptyCount === 0) {
    console.log(`[PASS] Ausencia total de traducciones vacías en todos los idiomas`);
  }
  if (placeholderMismatches === 0) {
    console.log(`[PASS] Simetría exacta de variables de interpolación ({var})`);
  }

  console.log("\n------------------------------------------------------------------");
  if (errors === 0) {
    console.log(`RESULTADO: VALIDACIÓN DE i18n EXITOSA (0 errores en ${baseKeys.length * 3} entradas)`);
    console.log("------------------------------------------------------------------\n");
    return true;
  } else {
    console.error(`RESULTADO: FALLÓ VALIDACIÓN DE i18n con ${errors} errores`);
    console.log("------------------------------------------------------------------\n");
    process.exit(1);
  }
}

if (process.argv[1]?.endsWith("validate-i18n.mjs") || process.argv[1]?.endsWith("validate-i18n.js")) {
  validateI18n();
}
