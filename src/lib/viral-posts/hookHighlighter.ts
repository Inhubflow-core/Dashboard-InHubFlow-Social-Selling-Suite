/**
 * Utilidad para análisis inteligente de ganchos virales (Hooks), subtítulos
 * y detección/extracción de frases de impacto a resaltar (Highlighting).
 */

export interface ParsedPostHeader {
  hook: string;
  subtitle: string;
  highlight: string;
}

/**
 * Detecta frases de alto impacto dentro de un titular o gancho viral.
 * Soporta formato markdown explícito (**palabra** o "palabra") y heurísticas
 * de copywriting viral de LinkedIn (errores comunes, fórmulas, cifras, secretos).
 */
export function detectViralHighlight(text: string): string {
  if (!text) return "";

  // 1. Detección explícita de markdown (**frase** o "frase")
  const boldMatch = text.match(/\*\*(.+?)\*\*/);
  if (boldMatch && boldMatch[1].trim()) return boldMatch[1].trim();

  const quoteMatch = text.match(/"([^"]{3,40})"/);
  if (quoteMatch && quoteMatch[1].trim()) return quoteMatch[1].trim();

  // 2. Patrones semánticos virales de LinkedIn (errores, números, fórmulas, contrates)
  const patterns: RegExp[] = [
    /cometen el mismo error/i,
    /el mayor error/i,
    /el peor error/i,
    /mismo error/i,
    /destruyen tu conversi[oó]n/i,
    /arruinan tus ventas/i,
    /terminan en la papelera/i,
    /el framework exacto/i,
    /la f[oó]rmula secreta/i,
    /el secreto de/i,
    /antes de entender/i,
    /\bel \d+%\b/i,
    /\b\d+\s+(errores|pasos|claves|secretos|se[ñn]ales)\b/i,
    /sin gastar/i,
    /en \d+ d[ií]as/i,
  ];

  for (const regex of patterns) {
    const match = text.match(regex);
    if (match) {
      return match[0].trim();
    }
  }

  return "";
}

/**
 * Limpia y formatea el gancho (elimina dos puntos finales y asteriscos).
 */
export function cleanHookText(raw: string): string {
  if (!raw) return "";
  return raw
    .replace(/\*\*/g, "") // quita markdown si lo hubiera
    .replace(/[:.]+$/, "") // quita dos puntos o puntos al final del titular
    .trim();
}

/**
 * Parsea el contenido completo del post para extraer:
 * 1. Título (Gancho limpio sin :)
 * 2. Subtítulo (Segunda línea con sustancia)
 * 3. Frase a resaltar (ej: "cometen el mismo error")
 */
export function parsePostHeader(content: string, explicitTitle = ""): ParsedPostHeader {
  const cleanLines = (content || "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  const rawHook = explicitTitle.trim() || cleanLines[0] || "Tu Titular de Alto Impacto";
  const hook = cleanHookText(rawHook);
  const highlight = detectViralHighlight(rawHook);

  // El subtítulo es el segundo párrafo o línea significativa (o fallback estándar)
  const subtitle = cleanLines.length > 1 ? cleanLines[1] : "Framework B2B";

  return {
    hook,
    subtitle,
    highlight,
  };
}
