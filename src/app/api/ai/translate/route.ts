import { NextResponse } from "next/server";

const LANGUAGE_NAMES: Record<string, string> = {
  es: "español",
  "pt-BR": "portugués brasileño",
  pt: "portugués",
  en: "inglés",
};

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { text = "", targetLanguage = "es" } = body;

    const cleanText = String(text || "").trim();
    if (!cleanText) {
      return NextResponse.json({ translatedText: "" });
    }

    const targetLangName = LANGUAGE_NAMES[targetLanguage] || targetLanguage;
    const targetCode = targetLanguage.split("-")[0].toLowerCase(); // "es", "pt", "en"

    // 1. Intentar traducción de alta fidelidad con Google Gemini AI (multi-modelo resiliente)
    const apiKey = (process.env.GEMINI_API_KEY || "").trim();
    const configuredModel = (process.env.GEMINI_MODEL || "").trim();
    
    // Lista de modelos priorizando los de alta disponibilidad inmediata
    const candidateModels = Array.from(
      new Set(
        [
          "gemini-flash-lite-latest",
          "gemini-3.5-flash-lite",
          configuredModel,
          "gemini-3.6-flash",
          "gemini-3.8-flash",
          "gemini-flash-latest",
        ].filter(Boolean)
      )
    );

    if (apiKey) {
      const prompt = `Eres un traductor experto y redactor de Social Selling B2B en LinkedIn.
Traduce el siguiente texto de publicación de LinkedIn al idioma ${targetLangName} (${targetLanguage}).

REGLAS ESTRICTAS:
1. Mantén exactamente todos los saltos de línea, numeración, viñetas y formato visual original.
2. Utiliza un tono profesional, natural y de negocios, ideal para decisores y líderes de LinkedIn.
3. No agregues saludos, explicaciones, notas ni comillas alrededor.
4. Devuelve ÚNICAMENTE el texto traducido.

TEXTO ORIGINAL:
${cleanText}`;

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
              // Limpiar posibles prefacios del modelo
              translated = translated
                .replace(
                  /^(La traducción (al [a-zá-ú]+ )?es:?|Traducción:?|Aquí tienes la traducción:?)\s*/i,
                  ""
                )
                .replace(/^["'«»]([\s\S]*)["'«»]$/, "$1")
                .trim();

              return NextResponse.json({
                success: true,
                engine: `gemini-${model}`,
                translatedText: translated,
                targetLanguage,
              });
            }
          } else {
            console.warn(
              `[Translate API] Modelo Gemini ${model} falló con status ${response.status}`
            );
          }
        } catch (geminiErr) {
          console.warn(`[Translate API] Excepción en Gemini ${model}:`, geminiErr);
        }
      }
    }

    // 2. Fallback resiliente con servicio MyMemory Translation API
    try {
      // MyMemory admite fragmentos de hasta 500 caracteres, procesamos en bloques si es necesario
      const maxChunk = 450;
      if (cleanText.length <= maxChunk) {
        const memUrl = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(
          cleanText
        )}&langpair=auto|${targetCode}`;
        const memRes = await fetch(memUrl);
        if (memRes.ok) {
          const memData = await memRes.json();
          if (
            memData.responseStatus === 200 &&
            memData.responseData?.translatedText
          ) {
            return NextResponse.json({
              success: true,
              engine: "mymemory",
              translatedText: memData.responseData.translatedText,
              targetLanguage,
            });
          }
        }
      } else {
        // Traducir por párrafos para preservar estructura
        const paragraphs = cleanText.split("\n");
        const translatedParagraphs: string[] = [];
        let allSuccess = true;

        for (const p of paragraphs) {
          const trimmedP = p.trim();
          if (!trimmedP) {
            translatedParagraphs.push("");
            continue;
          }
          const memUrl = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(
            trimmedP.slice(0, maxChunk)
          )}&langpair=auto|${targetCode}`;
          const memRes = await fetch(memUrl);
          if (memRes.ok) {
            const memData = await memRes.json();
            if (memData.responseData?.translatedText) {
              translatedParagraphs.push(memData.responseData.translatedText);
              continue;
            }
          }
          allSuccess = false;
          translatedParagraphs.push(trimmedP);
        }

        if (allSuccess && translatedParagraphs.length > 0) {
          return NextResponse.json({
            success: true,
            engine: "mymemory-chunked",
            translatedText: translatedParagraphs.join("\n"),
            targetLanguage,
          });
        }
      }
    } catch (memErr) {
      console.warn("[Translate API] Fallback MyMemory error:", memErr);
    }

    // 3. Fallback adicional con Google Translate API pública
    try {
      const gUrl = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetCode}&dt=t&q=${encodeURIComponent(
        cleanText
      )}`;
      const gRes = await fetch(gUrl, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        },
      });
      if (gRes.ok) {
        const gData = await gRes.json();
        if (Array.isArray(gData?.[0])) {
          const fallbackText = gData[0]
            .map((chunk: any) => chunk[0] || "")
            .join("");
          if (fallbackText) {
            return NextResponse.json({
              success: true,
              engine: "google-translate",
              translatedText: fallbackText,
              targetLanguage,
            });
          }
        }
      }
    } catch (fallbackErr) {
      console.warn("[Translate API] Fallback GT error:", fallbackErr);
    }

    // Si todos los motores fallaron, retornar error explícito
    return NextResponse.json(
      {
        error: "No se pudo traducir la publicación en este momento. Por favor, reintenta en unos instantes.",
        targetLanguage,
      },
      { status: 502 }
    );
  } catch (error: any) {
    console.error("[Translate API] Error general:", error);
    return NextResponse.json(
      { error: error.message || "Error al traducir texto" },
      { status: 500 }
    );
  }
}
