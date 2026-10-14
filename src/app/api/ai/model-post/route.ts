import { INITIAL_KNOWLEDGE_SOURCES } from "@/lib/sdr/knowledge-data";
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
      knowledgeSources = null,
    } = body;

    // 1. Integración de la Base de Conocimiento Aprobada (RAG)
    const activeKnowledgeSources =
      Array.isArray(knowledgeSources) && knowledgeSources.length > 0
        ? knowledgeSources
        : INITIAL_KNOWLEDGE_SOURCES.filter((k) => k.status === "approved");

    const ragContext = activeKnowledgeSources
      .map(
        (k: any) =>
          `### [DOCUMENTO ${k.category?.toUpperCase() || "OFICIAL"}]: ${k.title}\n${k.content}`
      )
      .join("\n\n");

    const systemPrompt = `Eres un Master Copywriter y Estratega de Social Selling en LinkedIn especializado en el mercado B2B de habla hispana.
Tu misión es modelar y reescribir publicaciones virales para generar máxima interacción y leads calificados, integrando de forma natural la PROPUESTA DE VALOR Y METODOLOGÍA OFICIAL DE INHUBFLOW descrita en la Base de Conocimiento Aprobada (RAG).

BASE DE CONOCIMIENTO APROBADA (RAG DE INHUBFLOW):
${ragContext}

INSTRUCCIONES CLAVE DE MODELAJE CON BASE DE CONOCIMIENTO:
1. Toma la estructura y el ángulo psicológico del post de referencia (el dolor, el gancho o la lección).
2. Transfórmalo para resolver ese dolor utilizando los pilares de valor de InHubFlow (capturar leads 'tibios' con Signal Radar en vez de spam frío, secuencias de interacción con IA, flujos contextuales seguros sin riesgo de baneo, y asistente SDR IA con supervisión).
3. No redactes un anuncio publicitario aburrido; redacta un post de contenido educativo de altísimo impacto que eduque al decisor B2B sobre cómo generar reuniones comerciales calificadas.
4. El llamado a la acción (CTA) final debe invitar a comentar la palabra clave "${leadMagnetKeyword}" para recibir el recurso/PDF sin costo por mensaje privado.
5. Tono: ${tone}.
6. Idioma: Español profesional de negocios.

RESPONDE EXCLUSIVAMENTE CON UN OBJETO JSON VÁLIDO (sin bloques de markdown ni texto extra alrededor) con la siguiente estructura según el formato solicitado:

Si format == 'text':
{
  "title": "Titular representativo corto (máx 60 caracteres)",
  "hook": "Gancho de las primeras 2 líneas que frena el scroll",
  "content": "Cuerpo completo del post en formato LinkedIn con saltos de línea y CTA final con la palabra clave ${leadMagnetKeyword}",
  "suggestedHashtags": ["#SocialSelling", "#B2BGrowth", "#VentasB2B", "#InHubFlow"]
}

Si format == 'image':
{
  "title": "Titular representativo corto",
  "hook": "Gancho de las primeras 2 líneas",
  "content": "Cuerpo completo del post en formato LinkedIn haciendo referencia a la infografía o imagen adjunta y con CTA para comentar ${leadMagnetKeyword}",
  "imagePrompt": "Prompt en inglés hiperdetallado para Midjourney/Flux: composición limpia de oficina ejecutiva, colores azul corporativo y grafito, laptop o panel de datos con métricas de prospección B2B, iluminación cinematográfica, 8k photorealistic.",
  "suggestedHashtags": ["#SocialSelling", "#B2BGrowth", "#VentasB2B"]
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
      "title": "El Error Común en Outreach",
      "content": ["Punto 1 del dolor tradicional", "Punto 2 del spam frío", "Consecuencia en la reputación"],
      "footerText": "Paso 1: Diagnóstico"
    },
    {
      "slideNumber": 3,
      "title": "La Solución con Signal Radar & IA",
      "content": ["Pilar 1: Captura de intención", "Pilar 2: Interacción contextual", "Pilar 3: Asistente SDR IA"],
      "footerText": "Paso 2: Metodología"
    },
    {
      "slideNumber": 4,
      "title": "Implementación Práctica",
      "content": ["Acción concreta a ejecutar", "Automatización segura con Unipile", "Tasa de respuesta superior al 45%"],
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
"${originalContent.slice(0, 2000)}"

Genera ahora el contenido modelado en JSON según las instrucciones, integrando la propuesta de valor oficial de InHubFlow.`;

    // 2. Ejecución con Failover Multi-Modelo de Google Gemini
    const apiKey = (process.env.GEMINI_API_KEY || "").trim();
    const configuredModel = (process.env.GEMINI_MODEL || "").trim();

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
      for (const model of candidateModels) {
        try {
          const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 12000);

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
                temperature: 0.5,
              },
            }),
            signal: controller.signal,
          });

          clearTimeout(timeout);

          if (response.ok) {
            const data = await response.json();
            const rawText =
              data.candidates?.[0]?.content?.parts?.[0]?.text || "{}";

            let parsedResult;
            try {
              // Limpiar bloques de código markdown ```json si viniesen incluidos
              const cleaned = rawText
                .replace(/```json/gi, "")
                .replace(/```/g, "")
                .trim();
              parsedResult = JSON.parse(cleaned);
            } catch {
              parsedResult = null;
            }

            if (parsedResult && (parsedResult.content || parsedResult.slides)) {
              return NextResponse.json({
                success: true,
                modelUsed: model,
                engine: "gemini",
                ragIntegrated: true,
                result: parsedResult,
              });
            }
          } else {
            console.warn(
              `[Model Post API] Modelo ${model} devolvió status ${response.status}`
            );
          }
        } catch (geminiErr: any) {
          console.warn(`[Model Post API] Error en ${model}:`, geminiErr.message);
        }
      }
    }

    // 3. Generador de Respaldo RAG Inteligente (Si todas las APIs remotas fallasen o no hubiese API key)
    const fallbackResult = generateRagFallbackPost({
      format,
      topic,
      leadMagnetKeyword,
      hook,
      originalContent,
    });

    return NextResponse.json({
      success: true,
      modelUsed: "rag-synthesizer",
      engine: "inhubflow-rag",
      ragIntegrated: true,
      result: fallbackResult,
    });
  } catch (error: any) {
    console.error("[Model Post AI API] Error:", error);
    return NextResponse.json(
      { error: error.message || "Error al modelar contenido con IA" },
      { status: 500 }
    );
  }
}

/**
 * Generador sintético de contingencia con inyección de RAG de InHubFlow
 */
function generateRagFallbackPost(params: {
  format: string;
  topic: string;
  leadMagnetKeyword: string;
  hook?: string;
  originalContent?: string;
}) {
  const { format, topic, leadMagnetKeyword, hook } = params;
  const cleanHook =
    hook || "¿Sigues dependiendo de plantillas frías para conseguir clientes en LinkedIn?";

  if (format === "carousel") {
    return {
      title: "De Mensajes Fríos a Reuniones Calificadas: El Sistema de 4 Pilares",
      hook: cleanHook,
      content: `${cleanHook}

El 88% de los mensajes directos en frío son ignorados porque se envían sin intención previa.

En este carrusel te revelamos cómo transformar tu prospección en LinkedIn con una metodología predecible basada en datos y señales de compra.

Desliza para ver la guía completa paso a paso.

Comenta "${leadMagnetKeyword}" y te envío la plantilla oficial en PDF por mensaje privado.`,
      slides: [
        {
          slideNumber: 1,
          isCover: true,
          title: "El Sistema B2B Predictivo en LinkedIn",
          subtitle: "De prospección a ciegas a reuniones calificadas cada semana",
          content: ["Framework Oficial", "Por Roberto | InHubFlow"],
          footerText: "@inhubflow",
        },
        {
          slideNumber: 2,
          title: "El Gran Error del Outreach Frío",
          content: [
            "Enviar plantillas masivas a listas desactualizadas",
            "Quemar la reputación de tu perfil personal",
            "Tasas de respuesta inferiores al 12%",
          ],
          footerText: "Paso 1: El Diagnóstico",
        },
        {
          slideNumber: 3,
          title: "La Metodología Signal Radar",
          content: [
            "1. Detecta prospectos interactuando con tu nicho",
            "2. Inicia contacto cuando la intención ya existe",
            "3. Multiplica por 3x tu tasa de aceptación (>45%)",
          ],
          footerText: "Paso 2: Captura de Señales",
        },
        {
          slideNumber: 4,
          title: "Flujos Inteligentes & SDR IA",
          content: [
            "Automatización multi-paso con pausas humanas",
            "Asistente SDR IA que responde con conocimiento aprobado",
            "Protección contra restricciones de cuenta",
          ],
          footerText: "Paso 3: Escala Segura",
        },
        {
          slideNumber: 5,
          isCta: true,
          title: "¿Quieres la Guía Paso a Paso?",
          subtitle: "Recibe el documento de trabajo completo en PDF",
          content: [
            `Comenta "${leadMagnetKeyword}" en esta publicación`,
            "Te lo enviamos directamente por mensaje privado",
          ],
          footerText: "InHubFlow Social Selling",
        },
      ],
      suggestedHashtags: ["#SocialSelling", "#B2BGrowth", "#InHubFlow", "#Outbound"],
    };
  }

  if (format === "image") {
    return {
      title: "El Nuevo Paradigma de Prospección B2B en LinkedIn",
      hook: cleanHook,
      content: `${cleanHook}

Tus prospectos no necesitan otro mensaje genérico en su bandeja de entrada; necesitan una razón real para conversar.

La diferencia entre el 12% y más del 45% de aceptación radica en contactar prospectos con intención validada:

1. Signal Radar: Detectar en tiempo real quién interactúa con temas de ${topic}.
2. Conversación contextual: Iniciar con valor relevante antes de proponer tu solución.
3. Asistente SDR IA supervisado: Responder dudas fundamentadas y agendar demostraciones comerciales.

Revisa la infografía adjunta para aplicar este framework en tu pipeline.

Comenta "${leadMagnetKeyword}" abajo y te comparto el recurso completo en PDF sin costo.`,
      imagePrompt:
        "Modern minimalist executive desk with high-end laptop displaying an analytics growth dashboard, subtle dark slate and corporate blue ambient lighting, photorealistic 8k, cinematic depth of field.",
      suggestedHashtags: ["#SocialSelling", "#B2BOutbound", "#InHubFlow"],
    };
  }

  // Format == 'text'
  return {
    title: "El Sistema de 4 Pilares para Generar Reuniones en LinkedIn",
    hook: cleanHook,
    content: `${cleanHook}

La prospección tradicional a ciegas está rota:
- Mensajes masivos sin contexto
- Bloqueos de cuentas por actividad agresiva
- Menos del 12% de tasa de respuesta

Para generar reuniones comerciales predecibles en el mercado B2B, implementamos una secuencia basada en 4 pilares:

1. Viral Post Engine: Crear contenido de alta tracción que atrae al tomador de decisiones ideal.
2. Signal Radar: Monitorear interacciones en tiempo real para contactar solo cuando existe interés genuino (logrando más del 45% de respuesta).
3. Campañas contextuales: Flujos multi-paso con pausas humanas seguras.
4. Asistente SDR IA: Un agente entrenado en tu Base de Conocimiento oficial que clasifica respuestas y coordina llamadas comerciales.

Deja de empujar ventas y empieza a construir relaciones de negocio.

¿Quieres aplicar este framework en tu empresa?
Comenta la palabra "${leadMagnetKeyword}" abajo y te envío el playbook completo en PDF sin costo por mensaje privado.`,
    suggestedHashtags: [
      "#SocialSelling",
      "#B2BGrowth",
      "#GeneracionDeLeads",
      "#InHubFlow",
      "#VentasB2B",
    ],
  };
}
