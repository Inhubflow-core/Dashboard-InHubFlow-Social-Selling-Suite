// src/lib/ai/connection-note-generator.ts
// Generador de notas de invitación y mensajes de conexión inteligentes con IA Gemini
// Aplica Atribución de Señal (Signal Attribution): distingue entre "Like" y "Comentario",
// analiza el comentario del prospecto en el post monitoreado y lo conecta con su propio perfil.

export interface GenerateSmartConnectionNoteParams {
  leadName: string;
  signalType?: "reaction" | "like" | "comment" | "keyword" | "repost";
  postAuthorName?: string;
  topic?: string;
  keyword?: string;
  leadCommentText?: string;
  company?: string;
  language?: "es" | "en" | "pt" | string;
}

const CANDIDATE_MODELS = [
  "gemini-3.5-flash",
  "gemini-3.6-flash",
  "gemini-3-flash-preview",
  "gemini-flash-latest",
];

/**
 * Genera una nota de conexión hiperpersonalizada con IA
 * Longitud estricta: entre 180 y 280 caracteres (máximo 300 en LinkedIn).
 */
export async function generateSmartConnectionNote(
  params: GenerateSmartConnectionNoteParams
): Promise<string> {
  const {
    leadName,
    signalType = "reaction",
    postAuthorName = "un colega de LinkedIn",
    topic = "prospección B2B",
    keyword = "ventas",
    leadCommentText,
    language = "es",
  } = params;

  const firstName = leadName ? leadName.split(" ")[0] : "Hola";
  const isComment = signalType === "comment" && !!leadCommentText && leadCommentText.trim().length > 5;
  const targetTopic = topic || keyword || "nuestro sector";

  // Fallback rápido por si no hay API key o falla la red
  const fallbackNote = buildFallbackConnectionNote({
    firstName,
    isComment,
    postAuthorName,
    targetTopic,
    leadCommentText,
    language,
  });

  const apiKey = (process.env.GEMINI_API_KEY || "").trim();
  if (!apiKey) {
    return fallbackNote;
  }

  const prompt = `Eres un estratega senior de Social Selling en LinkedIn.
Tu objetivo es redactar una NOTA DE INVITACIÓN DE CONEXIÓN HIPERPERSONALIZADA para un prospecto (${firstName}).

CONTEXTO DE LA SEÑAL:
- El prospecto interactuó en LinkedIn en una publicación de ${postAuthorName} sobre el tema "${targetTopic}".
${
  isComment
    ? `- El prospecto COMENTÓ lo siguiente en ese post: "${leadCommentText?.slice(0, 300)}"`
    : `- El prospecto le dio LIKE a esa publicación.`
}
- Además, en el paso anterior nosotros visitamos el perfil de ${firstName} e interactuamos con una de sus publicaciones recientes.

REGLAS ESTRICTAS DE REDACCIÓN:
1. OBJETIVO: Saludar por su nombre de pila (${firstName}), hacer referencia a su ${
    isComment ? `comentario en el post de ${postAuthorName} conectando inteligentemente con su perspectiva (sin clichés genéricos)` : `interés en el post de ${postAuthorName}`
  }, mencionar que revisaste su perfil y te gustó una de sus publicaciones, e invitarle a conectar cordialmente.
2. LONGITUD OBLIGATORIA: Entre 180 y 270 caracteres totales (con espacios). NUNCA debes superar los 280 caracteres bajo ninguna circunstancia, ya que LinkedIn tiene un límite máximo de 300 caracteres.
3. TONO: Cercano, profesional, peer-to-peer de nivel ejecutivo. Cero venta agresiva, cero spam.
4. IDIOMA: ${language === "pt" ? "Portugués brasileño fluido y natural" : language === "en" ? "Inglés profesional nativo" : "Español profesional y natural"}.
5. SALIDA LIMPIA: Devuelve ÚNICAMENTE el texto final de la nota, sin comillas, sin explicaciones, sin hashtags ni enlaces.`;

  for (const model of CANDIDATE_MODELS) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.4,
          },
        }),
      });

      if (response.ok) {
        const data = await response.json();
        let candidateText = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
        if (candidateText && candidateText.length >= 40) {
          candidateText = candidateText.replace(/^["'«“]|["'»”]$/g, "").trim();
          // Asegurar que no supere 285 caracteres
          if (candidateText.length > 285) {
            const cutIndex = candidateText.lastIndexOf(".", 280);
            if (cutIndex > 150) {
              candidateText = candidateText.slice(0, cutIndex + 1);
            } else {
              candidateText = candidateText.slice(0, 280).trim() + "...";
            }
          }
          return candidateText;
        }
      }
    } catch (err) {
      console.warn(`[Connection Note AI] Fallo temporal con modelo ${model}:`, err);
    }
  }

  return fallbackNote;
}

/**
 * Plantilla de respaldo calibrada por idioma
 */
function buildFallbackConnectionNote(opts: {
  firstName: string;
  isComment: boolean;
  postAuthorName: string;
  targetTopic: string;
  leadCommentText?: string;
  language?: string;
}): string {
  const { firstName, isComment, postAuthorName, targetTopic, language = "es" } = opts;

  if (language === "pt") {
    if (isComment) {
      return `Olá ${firstName}, vi seu comentário no post de ${postAuthorName} sobre ${targetTopic}; excelente ponto. Gostei de uma publicação sua e passei para conectar!`;
    }
    return `Olá ${firstName}, vi que curtiu o post de ${postAuthorName} sobre ${targetTopic}. Gostei de uma publicação do seu perfil e passei para conectar!`;
  }

  if (language === "en") {
    if (isComment) {
      return `Hi ${firstName}, saw your comment on ${postAuthorName}'s post about ${targetTopic}; great insight. Loved one of your posts too, let's connect!`;
    }
    return `Hi ${firstName}, noticed you liked ${postAuthorName}'s post about ${targetTopic}. Really enjoyed one of your posts as well, let's connect!`;
  }

  // Español
  if (isComment) {
    return `Hola ${firstName}, vi tu comentario en el post de ${postAuthorName} sobre ${targetTopic}; muy buen punto. Me gustó una de tus publicaciones, paso a conectar!`;
  }
  return `Hola ${firstName}, vi que le diste like al post de ${postAuthorName} sobre ${targetTopic}. Me gustó una de tus publicaciones, paso a conectar para seguir en contacto!`;
}
