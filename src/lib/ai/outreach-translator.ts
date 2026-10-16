// src/lib/ai/outreach-translator.ts
// Motor de traducción y adaptación multilingüe con IA para prospección en LinkedIn
// Preserva variables dinámicas: {{first_name}}, {{company}}, {{competitor}}, {{tema}}

import type { SupportedLanguage } from "@/lib/signals/language-detector";

const TARGET_LANG_NAMES: Record<SupportedLanguage, string> = {
  en: "English (conversational B2B LinkedIn tone)",
  es: "Español profesional y cercano de LinkedIn",
  pt: "Português do Brasil natural e de negócios",
};

/**
 * Adapta el mensaje de prospección al idioma del lead usando Google Gemini con fallback resiliente
 */
export async function translateOutreachMessage(
  paramsOrText:
    | {
        text: string;
        targetLanguage: SupportedLanguage;
        sourceLanguage?: SupportedLanguage;
      }
    | string,
  maybeTargetLanguage?: SupportedLanguage
): Promise<string> {
  let text: string;
  let targetLanguage: SupportedLanguage;
  let sourceLanguage: SupportedLanguage = "es";

  if (typeof paramsOrText === "string") {
    text = paramsOrText;
    targetLanguage = maybeTargetLanguage || "es";
  } else {
    text = paramsOrText.text;
    targetLanguage = paramsOrText.targetLanguage;
    sourceLanguage = paramsOrText.sourceLanguage || "es";
  }

  const cleanText = text.trim();
  if (!cleanText || targetLanguage === sourceLanguage) {
    return cleanText;
  }

  // 1. Proteger variables de sustitución con placeholders seguros
  const variableMap = new Map<string, string>();
  let placeholderIndex = 0;

  const protectedText = cleanText.replace(/\{\{([a-zA-Z0-9_]+)\}\}/g, (match) => {
    const key = `__VAR_${placeholderIndex++}__`;
    variableMap.set(key, match);
    return key;
  });

  const apiKey = (process.env.GEMINI_API_KEY || "").trim();
  const configuredModel = (process.env.GEMINI_MODEL || "").trim();

  const candidateModels = Array.from(
    new Set(
      [
        "gemini-flash-lite-latest",
        "gemini-3.5-flash-lite",
        configuredModel,
        "gemini-3.6-flash",
        "gemini-flash-latest",
      ].filter(Boolean)
    )
  );

  const targetLangDesc = TARGET_LANG_NAMES[targetLanguage] || targetLanguage;

  if (apiKey) {
    const prompt = `You are an elite LinkedIn B2B Social Selling Copywriter.
Translate and adapt the following LinkedIn outreach message into ${targetLangDesc}.

CRITICAL RULES:
1. Maintain exactly the placeholders like __VAR_0__, __VAR_1__, etc. DO NOT translate, change or remove them.
2. Keep the message natural, friendly, non-salesy, and perfectly suited for LinkedIn connection notes or DMs.
3. Keep the character count concise (ideal for LinkedIn connection notes under 300 characters).
4. Do NOT add greetings like "Sure! Here is the translation:", explanations or quotation marks.
5. Return ONLY the translated message.

ORIGINAL MESSAGE:
${protectedText}`;

    for (const model of candidateModels) {
      try {
        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
        const response = await fetch(geminiUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.2,
            },
          }),
        });

        if (response.ok) {
          const data = await response.json();
          const parts = data.candidates?.[0]?.content?.parts || [];
          const textParts = parts.filter((p: any) => p.text && !p.thought);
          let translated =
            textParts.map((p: any) => p.text).join("").trim() ||
            parts[0]?.text?.trim();

          if (translated) {
            // Limpiar posibles comillas y prefacios
            translated = translated
              .replace(/^["'«»]([\s\S]*)["'«»]$/, "$1")
              .trim();

            // Restaurar variables originales
            variableMap.forEach((originalVar, placeholder) => {
              translated = translated.replaceAll(placeholder, originalVar);
            });

            return translated;
          }
        }
      } catch (err) {
        console.warn(`[OutreachTranslator] Falló intento con Gemini ${model}:`, err);
      }
    }
  }

  // 2. Fallback de traducción rápida básica si Gemini no responde
  try {
    const targetCode = targetLanguage;
    const memUrl = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(
      protectedText
    )}&langpair=${sourceLanguage}|${targetCode}`;
    const memRes = await fetch(memUrl);
    if (memRes.ok) {
      const memData = await memRes.json();
      let translated = memData.responseData?.translatedText;
      if (translated) {
        variableMap.forEach((originalVar, placeholder) => {
          translated = translated.replaceAll(placeholder, originalVar);
        });
        return translated;
      }
    }
  } catch (memErr) {
    console.warn("[OutreachTranslator] Fallback MyMemory no disponible:", memErr);
  }

  // Si no hubo traducción, devolver el original
  return cleanText;
}
