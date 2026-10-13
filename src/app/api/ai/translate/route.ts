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

    // 1. Intentar traducción de alta fidelidad con Google Gemini AI
    const apiKey = (process.env.GEMINI_API_KEY || "").trim();
    const model = (process.env.GEMINI_MODEL || "gemini-3.6-flash").trim();

    if (apiKey) {
      try {
        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

        const prompt = `Eres un traductor experto y redactor de Social Selling B2B en LinkedIn.
Traduce el siguiente texto de publicación de LinkedIn al idioma ${targetLangName} (${targetLanguage}).

REGLAS ESTRICTAS:
1. Mantén exactamente todos los saltos de línea, numeración, viñetas y formato visual original.
2. Utiliza un tono profesional, natural y de negocios, ideal para decisores y líderes de LinkedIn.
3. No agregues saludos, explicaciones, notas ni comillas alrededor.
4. Devuelve ÚNICAMENTE el texto traducido.

TEXTO ORIGINAL:
${cleanText}`;

        const response = await fetch(geminiUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                role: "user",
                parts: [{ text: prompt }],
              },
            ],
            generationConfig: {
              temperature: 0.3,
            },
          }),
        });

        if (response.ok) {
          const data = await response.json();
          const translated = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
          if (translated) {
            return NextResponse.json({
              success: true,
              engine: "gemini",
              translatedText: translated,
              targetLanguage,
            });
          }
        }
      } catch (geminiErr) {
        console.warn("[Translate API] Gemini fallback trigger:", geminiErr);
      }
    }

    // 2. Fallback resiliente con servicio de traducción rápida
    try {
      const gUrl = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetCode}&dt=t&q=${encodeURIComponent(
        cleanText
      )}`;
      const gRes = await fetch(gUrl);
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
      console.warn("[Translate API] Fallback error:", fallbackErr);
    }

    // Si todo falla, devolver el texto original
    return NextResponse.json({
      success: true,
      engine: "none",
      translatedText: cleanText,
      targetLanguage,
    });
  } catch (error: any) {
    console.error("[Translate API] Error:", error);
    return NextResponse.json(
      { error: error.message || "Error al traducir texto" },
      { status: 500 }
    );
  }
}
