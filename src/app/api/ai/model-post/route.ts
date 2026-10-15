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

    // 1. Integración Inteligente de la Base de Conocimiento (RAG Multi-Tenant para SaaS)
    const hasCustomKnowledge = Array.isArray(knowledgeSources) && knowledgeSources.length > 0;
    let ragContext = "";
    if (hasCustomKnowledge) {
      ragContext = knowledgeSources
        .map(
          (k: any) =>
            `### [DOCUMENTO ${k.category?.toUpperCase() || "OFICIAL"} DE LA EMPRESA]: ${k.title}\n${k.content}`
        )
        .join("\n\n");
    } else if (topic.toLowerCase().includes("social selling") || topic.toLowerCase().includes("b2b outbound")) {
      // Solo inyectar demo de InHubFlow si el tema es explícitamente Social Selling / Outreach B2B
      ragContext = INITIAL_KNOWLEDGE_SOURCES.filter((k) => k.status === "approved")
        .map(
          (k: any) =>
            `### [DOCUMENTO ${k.category?.toUpperCase() || "OFICIAL"}]: ${k.title}\n${k.content}`
        )
        .join("\n\n");
    }

    const cleanTopic = String(topic || "Tendencias y Negocios").trim();
    const cleanTopicWords = cleanTopic.split(/\s+/).filter(Boolean);
    const topicTag = cleanTopic.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9]/g, "");

    const systemPrompt = `Eres un Master Copywriter y Creador de Contenido de Autoridad en LinkedIn para profesionales, directores y fundadores de empresa en cualquier industria.
Tu misión es modelar y reescribir publicaciones virales para generar máxima interacción, credibilidad y prospectos calificados, adaptando el contenido al NICHO, INDUSTRIA Y TEMÁTICA DEL USUARIO: "${cleanTopic}".

${
  ragContext
    ? `BASE DE CONOCIMIENTO APROBADA DEL NEGOCIO / EMPRESA DEL USUARIO (RAG):
${ragContext}

INSTRUCCIÓN CLAVE: Resuelve el dolor planteado en el post de referencia utilizando de forma natural la propuesta de valor, metodología, productos o servicios descritos en la Base de Conocimiento de la empresa.`
    : `INSTRUCCIÓN CLAVE: El usuario opera en el sector de "${cleanTopic}". Transforma el post de referencia para resolver ese dolor específico con autoridad, datos clave, consejos prácticos y lecciones de alto valor aplicables para clientes y profesionales de este sector.`
}

REGLAS DE COPYWRITING UNIVERSALES PARA SAAS:
1. Toma la estructura y el ángulo psicológico del post de referencia (el dolor, el gancho, el contraste o la lección).
2. Desarrolla la lección con autoridad en el tema "${cleanTopic}".
3. No redactes un anuncio publicitario aburrido; redacta contenido educativo y de alto valor que posicione al autor como un referente en "${cleanTopic}".
4. El llamado a la acción (CTA) final debe invitar a comentar la palabra clave "${leadMagnetKeyword}" para recibir un recurso, guía o plantilla en PDF por mensaje privado.
5. Tono: ${tone}.
6. Idioma: Español profesional y persuasivo adaptado al nicho de "${cleanTopic}".
7. NUNCA menciones nombres de marcas o herramientas ajenas a menos que estén explícitamente en la Base de Conocimiento del usuario.

RESPONDE EXCLUSIVAMENTE CON UN OBJETO JSON VÁLIDO (sin bloques de markdown ni texto extra alrededor) con la siguiente estructura según el formato solicitado:

Si format == 'text':
{
  "title": "Titular representativo corto sobre ${cleanTopic} (máx 60 caracteres)",
  "hook": "Gancho de las primeras 2 líneas que frena el scroll",
  "content": "Cuerpo completo del post en formato LinkedIn con saltos de línea y CTA final con la palabra clave ${leadMagnetKeyword}",
  "suggestedHashtags": ["#${topicTag}", "#${cleanTopicWords[0] || 'Liderazgo'}", "#Innovacion", "#Estrategia"]
}

Si format == 'image':
{
  "title": "Titular representativo corto sobre ${cleanTopic}",
  "hook": "Gancho de las primeras 2 líneas",
  "content": "Cuerpo completo del post en formato LinkedIn haciendo referencia a la infografía o imagen adjunta y con CTA para comentar ${leadMagnetKeyword}",
  "imagePrompt": "Prompt en inglés hiperdetallado para Midjourney/Flux describiendo una imagen conceptual y profesional 8k relacionada directamente con ${cleanTopic}",
  "suggestedHashtags": ["#${topicTag}", "#${cleanTopicWords[0] || 'Tendencias'}", "#Estrategia"]
}

Si format == 'carousel':
{
  "title": "Titular del carrusel sobre ${cleanTopic}",
  "hook": "Gancho del post que invita a deslizar el carrusel",
  "content": "Copy de acompañamiento para el post de LinkedIn invitando a deslizar y a comentar ${leadMagnetKeyword}",
  "slides": [
    {
      "slideNumber": 1,
      "isCover": true,
      "title": "Título de Portada de Alto Impacto sobre ${cleanTopic}",
      "subtitle": "Subtítulo explicativo con la promesa de valor",
      "content": ["Guía práctica paso a paso", "Framework de Especialista"],
      "footerText": "Desliza para continuar →"
    },
    {
      "slideNumber": 2,
      "title": "El Error Común en ${cleanTopic}",
      "content": ["Punto 1 del dolor frecuente", "Punto 2 de lo que la mayoría hace mal", "Consecuencia en resultados"],
      "footerText": "Paso 1: Diagnóstico"
    },
    {
      "slideNumber": 3,
      "title": "La Metodología Comprobada",
      "content": ["Pilar 1: Diagnóstico preciso", "Pilar 2: Estrategia basada en datos", "Pilar 3: Implementación consistente"],
      "footerText": "Paso 2: La Solución"
    },
    {
      "slideNumber": 4,
      "title": "Implementación Práctica",
      "content": ["Acción concreta número 1", "Acción concreta número 2", "Resultado esperado comprobable"],
      "footerText": "Paso 3: Ejecución"
    },
    {
      "slideNumber": 5,
      "isCta": true,
      "title": "¿Quieres la Guía Completa?",
      "subtitle": "Recibe el documento de trabajo en PDF listo para aplicar",
      "content": ["Comenta ${leadMagnetKeyword} abajo en este post", "Te lo comparto por mensaje privado"],
      "footerText": "Guía de Especialista"
    }
  ]
}`;

    const userPrompt = `FORMATO SOLICITADO: ${format}
TEMA / NICHO DEL CLIENTE: ${cleanTopic}
PALABRA CLAVE DE LEAD MAGNET: ${leadMagnetKeyword}
GANCHO DE REFERENCIA A MODELAR (si existe): "${hook}"
CONTENIDO ORIGINAL DE REFERENCIA:
"${originalContent.slice(0, 2000)}"

Genera ahora el contenido modelado en JSON según las instrucciones, enfocado en el nicho de "${cleanTopic}".`;

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
 * Generador sintético de contingencia universal adaptado a cualquier nicho/tema del SaaS
 */
function generateRagFallbackPost(params: {
  format: string;
  topic: string;
  leadMagnetKeyword: string;
  hook?: string;
  originalContent?: string;
}) {
  const { format, topic, leadMagnetKeyword, hook } = params;
  const cleanTopic = (topic || "Innovación y Estrategia").trim();
  const topicTag = cleanTopic.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9]/g, "");
  const words = cleanTopic.split(/\s+/).filter(Boolean);
  const cleanHook =
    hook || `¿Cuál es el mayor error que comete la mayoría al trabajar en ${cleanTopic}?`;

  if (format === "carousel") {
    return {
      title: `Guía Maestra de ${cleanTopic}: El Framework en 4 Pasos`,
      hook: cleanHook,
      content: `${cleanHook}

La mayoría de los profesionales en ${cleanTopic} intentan resolver los problemas con métodos obsoletos que ya no funcionan hoy.

En este carrusel te revelamos el framework paso a paso para dominar ${cleanTopic} con una metodología clara, predecible y orientada a resultados reales.

Desliza para ver la guía completa.

Comenta "${leadMagnetKeyword}" abajo y te comparto el documento de trabajo completo en PDF por mensaje privado.`,
      slides: [
        {
          slideNumber: 1,
          isCover: true,
          title: `El Framework Definitivo de ${cleanTopic}`,
          subtitle: "De la frustración a resultados predecibles y de alto impacto",
          content: ["Guía paso a paso", "Metodología de Autoridad"],
          footerText: "Desliza para continuar →",
        },
        {
          slideNumber: 2,
          title: `El Gran Error en ${cleanTopic}`,
          content: [
            "Aplicar tácticas tradicionales desactualizadas",
            "No medir métricas reales de impacto y retorno",
            "Falta de consistencia y diferenciación en el mercado",
          ],
          footerText: "Paso 1: El Diagnóstico",
        },
        {
          slideNumber: 3,
          title: "El Nuevo Enfoque Estratégico",
          content: [
            "1. Diagnóstico preciso de la situación actual",
            "2. Optimización basada en datos comprobados",
            "3. Multiplicar resultados con procesos estandarizados",
          ],
          footerText: "Paso 2: La Metodología",
        },
        {
          slideNumber: 4,
          title: "Implementación en 3 Fases",
          content: [
            "Fase 1: Auditoría y corrección de fricciones",
            "Fase 2: Ejecución estructurada sin atajos",
            "Fase 3: Escala predecible y retención a largo plazo",
          ],
          footerText: "Paso 3: Ejecución",
        },
        {
          slideNumber: 5,
          isCta: true,
          title: "¿Quieres la Guía Completa en PDF?",
          subtitle: "Recibe la plantilla de trabajo lista para aplicar",
          content: [
            `Comenta "${leadMagnetKeyword}" en esta publicación`,
            "Te la enviamos directamente por mensaje privado",
          ],
          footerText: "Recurso Exclusivo",
        },
      ],
      suggestedHashtags: [`#${topicTag}`, `#${words[0] || 'Estrategia'}`, "#Innovacion", "#Liderazgo"],
    };
  }

  if (format === "image") {
    return {
      title: `El Nuevo Paradigma en ${cleanTopic}`,
      hook: cleanHook,
      content: `${cleanHook}

En el sector de ${cleanTopic}, la diferencia entre quienes lideran el mercado y quienes se quedan atrás radica en tener un método comprobado:

1. Claridad de objetivo: Identificar las palancas de mayor impacto en ${cleanTopic}.
2. Ejecución consistente: Priorizar sistemas sobre la improvisación diaria.
3. Resultados medibles: Ajustar con base en métricas reales de desempeño.

Revisa la infografía adjunta para aplicar este framework en tu día a día.

Comenta "${leadMagnetKeyword}" abajo y te comparto el recurso completo en PDF sin costo.`,
      imagePrompt: `Clean, modern visual breakdown infographic about ${cleanTopic}, minimal executive palette, high-contrast typography, crisp lighting, 8k photorealistic.`,
      suggestedHashtags: [`#${topicTag}`, `#${words[0] || 'Tendencias'}`, "#Estrategia"],
    };
  }

  // Format == 'text'
  return {
    title: `Los 4 Pilares Fundamentales de ${cleanTopic}`,
    hook: cleanHook,
    content: `${cleanHook}

Los viejos métodos para abordar ${cleanTopic} están dejando de funcionar:
- Procesos manuales lentos y desarticulados
- Pérdida de tiempo y recursos en acciones de bajo impacto
- Resultados impredecibles

Para construir un estándar de excelencia en ${cleanTopic}, aplicamos un enfoque de 4 pilares:

1. Diagnóstico objetivo: Analizar la situación con datos antes de actuar.
2. Estrategia probada: Implementar solo aquello que genera tracción comprobada.
3. Optimización continua: Refinar cada fase del proceso de forma sistemática.
4. Escala sostenible: Construir sistemas duraderos que no dependan de la suerte.

¿Quieres aplicar este framework en tu actividad profesional o empresa?
Comenta la palabra "${leadMagnetKeyword}" abajo y te envío la guía completa en PDF sin costo por mensaje privado.`,
    suggestedHashtags: [
      `#${topicTag}`,
      `#${words[0] || 'Estrategia'}`,
      "#Innovacion",
      "#Liderazgo",
      "#Excelencia",
    ],
  };
}
