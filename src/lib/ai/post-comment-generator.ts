// src/lib/ai/post-comment-generator.ts
// Generador de comentarios inteligentes y de alto relacionamiento para LinkedIn usando Google Gemini API
// Analiza el contenido real de la publicación del prospecto y genera una respuesta ejecutiva peer-to-peer calibrada.

export interface GenerateSmartCommentParams {
  postText: string;
  leadName?: string;
  company?: string;
  language?: string;
}

const CANDIDATE_MODELS = [
  "gemini-3.5-flash",
  "gemini-3.6-flash",
  "gemini-3-flash-preview",
  "gemini-flash-latest",
];

/**
 * Lee la publicación de LinkedIn de un prospecto y redacta un comentario de alto impacto relacional
 * Calibrado estrictamente entre 42 y 46 palabras (~240-275 caracteres) en 2 oraciones.
 */
export async function generateSmartPostComment(
  params: GenerateSmartCommentParams
): Promise<string | null> {
  const { postText, leadName, company, language } = params;
  const cleanPost = (postText || "").trim();

  if (!cleanPost || cleanPost.length < 20) {
    return null;
  }

  const apiKey = (process.env.GEMINI_API_KEY || "").trim();
  if (!apiKey) {
    console.warn("[AI Comment] GEMINI_API_KEY no está configurada en .env");
    return null;
  }

  const authorName = leadName ? leadName.split(" ")[0] : "el autor";

  const prompt = `Eres un estratega senior de Social Selling en LinkedIn y consultor B2B de alto nivel.
Tu objetivo es escribir un COMENTARIO DE ALTO IMPACTO Y VALOR para la publicación de un prospecto en LinkedIn (${authorName}${company ? ` de ${company}` : ""}).

DIRECTRICES CRUCIALES DE SOCIAL SELLING:
1. ANÁLISIS PROFUNDO: Identifica la idea central del autor y valida su tesis con criterio estratégico de negocio.
2. CERO CLICHÉS: Queda estrictamente prohibido usar frases vacías como "Excelente post", "Gran visión", "100% de acuerdo", "Muy interesante", "Totalmente alineado".
3. APORTE DE VALOR: Añade una perspectiva complementaria o una pregunta inteligente que invite a debatir de igual a igual (conversación peer-to-peer de nivel ejecutivo).
4. IDIOMA NATIVO: Responde en el MISMO IDIOMA de la publicación del prospecto (si está en portugués, responde en portugués fluido y profesional; si está en español, en español; si en inglés, en inglés).
5. LONGITUD ESTRICTA: Debe tener OBLIGATORIAMENTE entre 42 y 46 palabras (aproximadamente entre 230 y 275 caracteres con espacios), estructurado en exactamente 2 oraciones ágiles. Asegúrate de contar las palabras antes de responder para mantenerte estrictamente en el rango de 42 a 46 palabras.
6. FORMATO LIMPIO: NO incluyas hashtags, ni links, ni menciones con @, ni introducciones explicativas como "Aquí tienes el comentario:".
7. SALIDA: Devuelve ÚNICAMENTE el texto final del comentario listo para publicar en LinkedIn.

PUBLICACIÓN DEL PROSPECTO:
"""
${cleanPost.slice(0, 1500)}
"""`;

  for (const model of CANDIDATE_MODELS) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.5,
          },
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const candidateText = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
        if (candidateText && candidateText.length >= 25) {
          // Limpiar comillas iniciales o finales si el modelo las agregó
          const sanitized = candidateText.replace(/^["'«“]|["'»”]$/g, "").trim();
          return sanitized;
        }
      } else {
        const errDetail = await response.text();
        console.warn(`[AI Comment] Fallo en modelo ${model} (${response.status}):`, errDetail.slice(0, 150));
      }
    } catch (err) {
      console.warn(`[AI Comment] Excepción llamando a ${model}:`, err);
    }
  }

  return null;
}
