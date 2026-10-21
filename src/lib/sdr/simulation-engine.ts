import {
  SdrIntent,
  SdrActionType,
  SdrRiskLevel,
  KnowledgeSource,
  SdrAgentConfig,
} from "./types";

export interface SdrSimulationInput {
  inboundText: string;
  senderName?: string;
  senderCompany?: string;
  config: SdrAgentConfig;
  knowledgeSources: KnowledgeSource[];
}

export interface SdrSimulationOutput {
  intent: SdrIntent;
  confidence: number;
  riskLevel: SdrRiskLevel;
  recommendedAction: SdrActionType;
  requiresHuman: boolean;
  reasonCode: string;
  reasoningSummary: string;
  replyDraft: string;
  citations: string[];
  latencyMs: number;
  model: string;
}

export function runSdrDecision(input: SdrSimulationInput): SdrSimulationOutput {
  const text = input.inboundText.trim().toLowerCase();
  const sender = input.senderName || "Estimado(a)";
  const start = Date.now();

  let intent: SdrIntent = "ambiguous";
  let confidence = 0.88;
  let riskLevel: SdrRiskLevel = "low";
  let action: SdrActionType = "answer";
  let requiresHuman = false;
  let reasonCode = "standard_response";
  let reasoningSummary = "";
  let replyDraft = "";
  const citations: string[] = [];

  // 1. Hostile or legal risk -> Emergency Handoff
  if (
    text.includes("demanda") ||
    text.includes("abogado") ||
    text.includes("ilegal") ||
    text.includes("denuncia") ||
    text.includes("acoso")
  ) {
    intent = "hostile_or_legal";
    confidence = 0.98;
    riskLevel = "high";
    action = "handoff";
    requiresHuman = true;
    reasonCode = "legal_risk_detected";
    reasoningSummary = "Se detectó lenguaje con potencial riesgo legal o reclamo severo. La IA suspende la automatización y escala de forma inmediata.";
    replyDraft = `Hola ${sender}, he tomado nota de tu mensaje y lo he transferido con máxima prioridad a nuestro equipo directivo para que se comuniquen contigo directamente a la brevedad.`;
    citations.push("Criterios Estrictos de Handoff a Humano");
  }

  // 2. Unsubscribe
  else if (
    text.includes("no me escribas") ||
    text.includes("dar de baja") ||
    text.includes("spam") ||
    text.includes("remover") ||
    text.includes("no mas mensajes")
  ) {
    intent = "unsubscribe";
    confidence = 0.97;
    riskLevel = "low";
    action = "stop_outreach";
    requiresHuman = false;
    reasonCode = "opt_out_respected";
    reasoningSummary = "El contacto solicita explícitamente no recibir más comunicaciones. Se detienen las secuencias.";
    replyDraft = `Entendido perfectamente, ${sender}. Disculpa las molestias; ya he marcado tu contacto para no enviarte más comunicaciones por este medio. ¡Muchos éxitos!`;
    citations.push("Protocolo de Respeto de Contacto");
  }

  // 3. Human Requested
  else if (
    text.includes("humano") ||
    text.includes("persona real") ||
    text.includes("alguien real") ||
    text.includes("tu telefono") ||
    text.includes("tu teléfono") ||
    text.includes("llamame al") ||
    text.includes("llámame al")
  ) {
    intent = "human_requested";
    confidence = 0.95;
    riskLevel = "medium";
    action = "handoff";
    requiresHuman = true;
    reasonCode = "human_operator_requested";
    reasoningSummary = "El prospecto solicita hablar con un consultor o persona del equipo. Se activa handoff comercial.";
    replyDraft = `¡Por supuesto, ${sender}! Le acabo de notificar a uno de nuestros especialistas del equipo para que tome la conversación y se ponga en contacto contigo de inmediato.`;
    citations.push("Criterios Estrictos de Handoff a Humano");
  }

  // 4. Meeting Request / Direct Interest in Call
  else if (
    text.includes("reunión") ||
    text.includes("reunion") ||
    text.includes("llamada") ||
    text.includes("demo") ||
    text.includes("agendar") ||
    text.includes("videollamada") ||
    text.includes("zoom") ||
    text.includes("meet") ||
    text.includes("calendario") ||
    text.includes("cuando podemos hablar")
  ) {
    intent = "meeting_request";
    confidence = 0.96;
    riskLevel = "low";
    action = "offer_slots";
    requiresHuman = false;
    reasonCode = "demo_booking_requested";
    reasoningSummary = "El prospecto muestra intención clara de agendar una sesión demostrativa o videollamada.";
    const bookingUrl = input.config.bookingLink || "https://cal.inhubflow.com/demo-20min";
    replyDraft = `¡Excelente iniciativa, ${sender}! Estaremos encantados de mostrarte la plataforma en vivo adaptada a los objetivos de tu equipo. 

Puedes elegir la fecha y franja horaria que mejor te convenga en este enlace (20 minutos):
${bookingUrl}

¿Te parece bien, o prefieres que coordinemos una hora concreta por aquí?`;
    citations.push("Protocolo de Agendamiento de Reuniones", "Propuesta de Valor & Capacidades de InHubFlow");
  }

  // 5. Pricing Question
  else if (
    text.includes("precio") ||
    text.includes("cuánto cuesta") ||
    text.includes("cuanto cuesta") ||
    text.includes("costo") ||
    text.includes("tarifa") ||
    text.includes("planes") ||
    text.includes("cuanto sale") ||
    text.includes("presupuesto")
  ) {
    intent = "pricing_question";
    confidence = 0.94;
    riskLevel = "low";
    action = "answer";
    requiresHuman = false;
    reasonCode = "transparent_pricing_provided";
    reasoningSummary = "Consulta sobre precios y planes oficiales. Se detalla la estructura multislot aprobada en la base de conocimiento.";
    replyDraft = `Hola ${sender}, con gusto te comparto la estructura de planes de InHubFlow según la cantidad de cuentas de LinkedIn que desees conectar:

- Plan Starter: $49/mes (1 cuenta de LinkedIn, 20 inv/día, 30 DMs/día, Viral Engine).
- Plan Growth: $149/mes (5 cuentas en simultáneo, 100 inv/día, 150 DMs/día, gestión de equipo multislot).
- Plan Business: $279/mes (10 cuentas en simultáneo, 200 inv/día, 300 DMs/día, API y soporte prioritario).

Todos los planes incluyen 20% de descuento en suscripción anual y garantía de prueba guiada. ¿Cuántas cuentas o personas de tu equipo estarían interesadas en prospectar?`;
    citations.push("Estructura de Precios y Planes Oficiales");
  }

  // 6. Objection Handling
  else if (
    text.includes("ya usamos") ||
    text.includes("tengo proveedor") ||
    text.includes("waalaxy") ||
    text.includes("lemlist") ||
    text.includes("expandi") ||
    text.includes("bloqueo") ||
    text.includes("restringir") ||
    text.includes("no tengo tiempo") ||
    text.includes("muy caro")
  ) {
    intent = "objection";
    confidence = 0.91;
    riskLevel = "low";
    action = "answer";
    requiresHuman = false;
    reasonCode = "objection_handled_with_approved_framework";
    reasoningSummary = "Se detectó una objeción común de prospección. Se aplica el marco de diferenciación y seguridad de la base de conocimiento.";
    if (text.includes("waalaxy") || text.includes("lemlist") || text.includes("expandi") || text.includes("ya usamos")) {
      replyDraft = `Totalmente comprensible, ${sender}. Muchas agencias y empresas que hoy usan InHubFlow venían de herramientas de prospección masiva en frío.

La gran diferencia es que nosotros no enviamos mensajes a ciegas; nuestro Signal Radar detecta cuando un prospecto comenta o interactúa con contenido de tu sector (leads 'tibios'), logrando tasas de respuesta de más del 40% y protegiendo tu reputación en LinkedIn con emulación humana real.

¿Te interesaría ver una breve comparativa de 5 minutos sobre cómo complementamos o potenciamos lo que ya tienen?`;
    } else if (text.includes("bloqueo") || text.includes("restringir")) {
      replyDraft = `Esa es una preocupación muy válida, ${sender}. Justamente por eso en InHubFlow no usamos extensiones de Chrome riesgosas. Toda la conexión opera con emulación humana segura, respetando rotación de IPs residenciales y límites prudentes de 20 a 25 invitaciones diarias por cuenta.

Tu seguridad es la prioridad número uno. ¿Te gustaría conocer más sobre nuestras capas de protección?`;
    } else {
      replyDraft = `Comprendo el punto, ${sender}. Justamente el objetivo de InHubFlow es ahorrarte tiempo: el Asistente SDR IA redacta los mensajes y clasifica las respuestas de modo que tu equipo solo dedique 10 minutos al día a revisar reuniones agendadas.

¿Tendrías 15 minutos esta semana para revisar si tiene sentido estratégico para ustedes?`;
    }
    citations.push("Manejo de Objeciones Comunes", "Propuesta de Valor & Capacidades de InHubFlow");
  }

  // 7. Not Interested (Polite decline)
  else if (
    text.includes("no me interesa") ||
    text.includes("no gracias") ||
    text.includes("por ahora no") ||
    text.includes("no estamos buscando") ||
    text.includes("en este momento no")
  ) {
    intent = "not_interested";
    confidence = 0.93;
    riskLevel = "low";
    action = "no_action";
    requiresHuman = false;
    reasonCode = "polite_decline_acknowledged";
    reasoningSummary = "El contacto rechaza cordialmente. Se responde de manera educada dejando la puerta abierta para el futuro.";
    replyDraft = `¡Totalmente de acuerdo, ${sender}! Agradezco mucho que me lo hayas comentado con sinceridad. Quedamos en contacto por aquí para cuando sea un mejor momento. ¡Que tengas una excelente semana!`;
    citations.push("Protocolo de Relación Profesional");
  }

  // 8. General Interested / Product Question
  else if (
    text.includes("me interesa") ||
    text.includes("cuéntame") ||
    text.includes("cuentame") ||
    text.includes("como funciona") ||
    text.includes("cómo funciona") ||
    text.includes("de que se trata") ||
    text.includes("de qué se trata") ||
    text.includes("info") ||
    text.includes("información")
  ) {
    intent = "interested";
    confidence = 0.92;
    riskLevel = "low";
    action = "answer";
    requiresHuman = false;
    reasonCode = "positive_intent_nurtured";
    reasoningSummary = "Interés abierto en la solución. Se resume la propuesta de valor con llamado a la acción enfocado.";
    replyDraft = `¡Con mucho gusto, ${sender}! InHubFlow es una suite de Social Selling diseñada para generar reuniones comerciales en LinkedIn combinando 3 motores:

1. Signal Radar: Detecta prospectos activos comentando en publicaciones de tu sector.
2. Campañas Automatizadas Seguras: Secuencias inteligentes con descansos humanos y personalización por IA.
3. Asistente SDR IA: Responde y pre-califica a los interesados para coordinar llamadas de venta en tu calendario.

¿Qué objetivo principal de prospección tienen actualmente en ${input.senderCompany || "tu empresa"}?`;
    citations.push("Propuesta de Valor & Capacidades de InHubFlow");
  }

  // 9. Default / Ambiguous
  else {
    intent = "ambiguous";
    confidence = 0.76;
    riskLevel = "low";
    action = "ask_clarification";
    requiresHuman = confidence < input.config.confidenceThreshold;
    reasonCode = "clarification_needed";
    reasoningSummary = "Mensaje corto o sin suficiente contexto. Se formula una pregunta amable para clarificar la necesidad del prospecto.";
    replyDraft = `Hola ${sender}, un placer saludarte. ¿Cómo podemos ayudarte desde InHubFlow con la prospección comercial de tu equipo en LinkedIn?`;
    citations.push("Propuesta de Valor & Capacidades de InHubFlow");
  }

  // Check confidence threshold against agent policy
  if (confidence < input.config.confidenceThreshold && !requiresHuman) {
    requiresHuman = true;
    action = "handoff";
    reasonCode = "confidence_below_threshold";
    reasoningSummary += ` (La confianza de ${Math.round(confidence * 100)}% está por debajo del umbral mínimo configurado de ${Math.round(input.config.confidenceThreshold * 100)}%, requiriendo supervisión humana).`;
  }

  const latencyMs = Math.max(120, Date.now() - start + Math.floor(Math.random() * 180 + 100));

  return {
    intent,
    confidence,
    riskLevel,
    recommendedAction: action,
    requiresHuman,
    reasonCode,
    reasoningSummary,
    replyDraft,
    citations,
    latencyMs,
    model: input.config.model || "gemini-3.6-flash",
  };
}
