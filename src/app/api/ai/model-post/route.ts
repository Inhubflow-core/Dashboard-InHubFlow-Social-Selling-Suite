import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const {
      hook = "",
      originalContent = "",
      topic = "Social Selling B2B",
      format = "text",
      leadMagnetKeyword = "SISTEMA",
      tone = "Autoridad B2B con llamada a la acción",
    } = body;

    const apiKey = (process.env.GEMINI_API_KEY || "").trim();
    if (!apiKey) {
      return NextResponse.json(
        { error: "La API Key de Gemini no está configurada en las variables de entorno." },
        { status: 500 }
      );
    }

    const model = (process.env.GEMINI_MODEL || "gemini-3.6-flash").trim();

    const systemPrompt = `Eres un Master Copywriter y Estratega de Social Selling en LinkedIn especializado en el mercado B2B de habla hispana.
Tu trabajo es modelar y reescribir publicaciones virales para generar máxima interacción y leads calificados mediante ganchos irresistibles y Lead Magnets.

REGLAS DE COPYWRITING:
1. Primeras 2 líneas (El Gancho / Hook): Deben frenar el scroll del decisor, desafiar el sentido común o plantear una pregunta o cifra impactante.
2. Espacio en blanco y legibilidad: Párrafos cortos de 1 a 2 líneas, sin bloques gigantes de texto.
3. Valor accionable: Entregar un framework o diagnóstico claro de 3 a 5 puntos.
4. Llamado a la acción (CTA) directo: Pedir que comenten la palabra clave "${leadMagnetKeyword}" para recibir el recurso/PDF sin coste por mensaje privado.
5. Tono: ${tone}.
6. Idioma: Español profesional de negocios.

RESPONDE EXCLUSIVAMENTE CON UN OBJETO JSON VÁLIDO (sin bloques de markdown ni texto extra alrededor) con la siguiente estructura según el formato solicitado:

Si format == 'text':
{
  "title": "Titular representativo corto (máx 60 caracteres)",
  "hook": "Gancho de las primeras 2 líneas",
  "content": "Cuerpo completo del post en formato LinkedIn con saltos de línea y CTA final con la palabra clave ${leadMagnetKeyword}",
  "suggestedHashtags": ["#SocialSelling", "#B2BGrowth", "#Ventas"]
}

Si format == 'image':
{
  "title": "Titular representativo corto",
  "hook": "Gancho de las primeras 2 líneas",
  "content": "Cuerpo completo del post en formato LinkedIn haciendo referencia a la infografía o imagen adjunta y con CTA para comentar ${leadMagnetKeyword}",
  "imagePrompt": "Prompt en inglés hiperdetallado para Midjourney/Flux: composición limpia de oficina ejecutiva, colores azul corporativo y grafito, laptop o panel de datos, iluminación cinematográfica, 8k photorealistic.",
  "suggestedHashtags": ["#SocialSelling", "#B2B"]
}

Si format == 'carousel':
{
  "title": "Titular del carrusel",
  "hook": "Gancho del post que invita a deslizar el carrusel",
  "content": "Copy de acompañamiento para el post de LinkedIn invitando a deslizar y a comentar ${leadMagnetKeyword}",
  "slides": [
    {
      "slideNumber": 1,
      "isCover": true,
      "title": "Título de Portada de Alto Impacto",
      "subtitle": "Subtítulo explicativo del carrusel",
      "content": ["Guía paso a paso", "Por Roberto | InHubFlow"],
      "footerText": "@inhubflow"
    },
    {
      "slideNumber": 2,
      "title": "El Problema / El Error Común",
      "content": ["Punto 1 del dolor", "Punto 2 del dolor", "Consecuencia en el negocio"],
      "footerText": "Paso 1: Diagnóstico"
    },
    {
      "slideNumber": 3,
      "title": "El Framework / La Solución",
      "content": ["Pilar 1 de la metodología", "Pilar 2 de la metodología", "Resultado esperado"],
      "footerText": "Paso 2: Estrategia"
    },
    {
      "slideNumber": 4,
      "title": "Implementación Práctica",
      "content": ["Acción concreta a ejecutar", "Herramienta o proceso sugerido", "Métrica de control"],
      "footerText": "Paso 3: Ejecución"
    },
    {
      "slideNumber": 5,
      "isCta": true,
      "title": "¿Quieres la Plantilla Completa?",
      "subtitle": "Descarga el recurso en PDF listo para aplicar",
      "content": ["Comenta ${leadMagnetKeyword} abajo en este post", "Te lo enviamos por privado de inmediato"],
      "footerText": "InHubFlow Social Selling"
    }
  ]
}`;

    const userPrompt = `FORMATO SOLICITADO: ${format}
TEMA: ${topic}
PALABRA CLAVE DE LEAD MAGNET: ${leadMagnetKeyword}
GANCHO DE REFERENCIA A MODELAR (si existe): "${hook}"
CONTENIDO ORIGINAL DE REFERENCIA:
"${originalContent.slice(0, 1500)}"

Genera ahora el contenido modelado en JSON según las instrucciones.`;

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const response = await fetch(geminiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }],
          },
        ],
        generationConfig: {
          temperature: 0.7,
          responseMimeType: "application/json",
        },
      }),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => "");
      throw new Error(`Error en API Gemini [${response.status}]: ${errText}`);
    }

    const data = await response.json();
    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || "{}";

    let parsedResult;
    try {
      parsedResult = JSON.parse(rawText);
    } catch {
      // Si venía con markdown tags ```json
      const cleaned = rawText.replace(/```json/g, "").replace(/```/g, "").trim();
      parsedResult = JSON.parse(cleaned);
    }

    return NextResponse.json({
      success: true,
      modelUsed: model,
      result: parsedResult,
    });
  } catch (error: any) {
    console.error("[Model Post AI API] Error:", error);
    return NextResponse.json(
      { error: error.message || "Error al modelar contenido con IA" },
      { status: 500 }
    );
  }
}
