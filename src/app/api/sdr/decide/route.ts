import { NextRequest, NextResponse } from "next/server";
import { runSdrDecision, type SdrSimulationOutput } from "@/lib/sdr/simulation-engine";
import type { KnowledgeSource, SdrAgentConfig } from "@/lib/sdr/types";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const inboundText = String(body.inboundText || "").trim();
    const senderName = typeof body.senderName === "string" ? body.senderName : undefined;
    const senderCompany = typeof body.senderCompany === "string" ? body.senderCompany : undefined;
    const config = body.config as SdrAgentConfig;
    const knowledgeSources = (Array.isArray(body.knowledgeSources) ? body.knowledgeSources : []) as KnowledgeSource[];

    if (!inboundText || !config) {
      return NextResponse.json(
        { ok: false, error: "Se requiere 'inboundText' y 'config'." },
        { status: 400 }
      );
    }

    // Motor base determinista (siempre garantiza clasificación, guardrails legales y fallback inmediato)
    const baseDecision: SdrSimulationOutput = runSdrDecision({
      inboundText,
      senderName,
      senderCompany,
      config,
      knowledgeSources,
    });

    const apiKey = (process.env.GEMINI_API_KEY || "").trim();
    if (!apiKey || baseDecision.requiresHuman || baseDecision.intent === "unsubscribe") {
      return NextResponse.json({
        ok: true,
        mode: "deterministic",
        decision: baseDecision,
      });
    }

    try {
      const start = Date.now();
      const approvedDocs = knowledgeSources
        .filter((k) => k.status === "approved")
        .slice(0, 6)
        .map((k) => `[${k.title} (${k.category})]:\n${k.content}`)
        .join("\n\n");

      const prompt = `
${config.systemPrompt}

CONTEXTO DE LA EMPRESA:
${config.companyContext}

INSTRUCCIONES ADICIONALES:
${config.customInstructions}

OBJETIVO DE CONVERSIÓN (${config.conversionGoalType}):
URL objetivo: ${config.targetUrl || config.bookingLink || ""}

DOCUMENTOS APROBADOS DE CONOCIMIENTO:
${approvedDocs || "Sin documentos adicionales."}

MENSAJE ENTRANTE DEL PROSPECTO (${senderName || "Prospecto"}, ${senderCompany || "Empresa B2B"}):
"${inboundText}"

INSTRUCCIÓN DE SALIDA:
Responde en el idioma del prospecto (${baseDecision.detectedLanguage}), de forma ejecutiva, concisa y natural para LinkedIn (máximo 4 líneas). No inventes precios ni funcionalidades fuera de los documentos aprobados. Devuelve únicamente el texto de respuesta al prospecto.
      `.trim();

      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
          }),
        }
      );

      if (res.ok) {
        const json = await res.json();
        const aiReply = json?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
        if (aiReply && aiReply.length > 10) {
          return NextResponse.json({
            ok: true,
            mode: "ai_grounded",
            decision: {
              ...baseDecision,
              replyDraft: aiReply,
              latencyMs: Math.max(120, Date.now() - start),
              model: "gemini-2.5-flash",
            },
          });
        }
      }
    } catch (aiErr) {
      console.warn("[api/sdr/decide] Fallback a motor determinista:", aiErr);
    }

    return NextResponse.json({
      ok: true,
      mode: "deterministic_fallback",
      decision: baseDecision,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error en decisión SDR";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
