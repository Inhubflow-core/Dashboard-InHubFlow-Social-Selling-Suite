import {
  SdrIntent,
  SdrActionType,
  SdrRiskLevel,
  KnowledgeSource,
  SdrAgentConfig,
} from "./types";
import { detectLeadLanguage, SupportedLanguage } from "@/lib/signals/language-detector";

export interface SdrSimulationInput {
  inboundText: string;
  senderName?: string;
  senderCompany?: string;
  senderHeadline?: string;
  senderLocation?: string;
  language?: SupportedLanguage;
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
  detectedLanguage: SupportedLanguage;
}

export function runSdrDecision(input: SdrSimulationInput): SdrSimulationOutput {
  const text = input.inboundText.trim().toLowerCase();
  const sender = input.senderName ? input.senderName.split(" ")[0] : "Estimado(a)";
  const start = Date.now();

  // Detección profunda del idioma del perfil y del mensaje
  const lang: SupportedLanguage =
    input.language ||
    detectLeadLanguage({
      fullName: input.senderName,
      headline: input.senderHeadline,
      location: input.senderLocation,
      signalSnippet: input.inboundText,
    });

  let intent: SdrIntent = "ambiguous";
  let confidence = 0.88;
  let riskLevel: SdrRiskLevel = "low";
  let action: SdrActionType = "answer";
  let requiresHuman = false;
  let reasonCode = "standard_response";
  let reasoningSummary = "";
  let replyDraft = "";
  const citations: string[] = [];
  const goalType = input.config.conversionGoalType || "send_landing_demo";
  const targetUrl = input.config.targetUrl || input.config.bookingLink || "https://inhubflow.com/demo";
  const bookingUrl = input.config.bookingLink || targetUrl || "https://cal.inhubflow.com/demo-20min";

  // 1. Riesgo legal o reclamo severo -> Emergency Handoff
  if (
    text.includes("demanda") ||
    text.includes("abogado") ||
    text.includes("ilegal") ||
    text.includes("denuncia") ||
    text.includes("acoso") ||
    text.includes("lawyer") ||
    text.includes("sue") ||
    text.includes("illegal") ||
    text.includes("harassment") ||
    text.includes("processo") ||
    text.includes("advogado")
  ) {
    intent = "hostile_or_legal";
    confidence = 0.98;
    riskLevel = "high";
    action = "handoff";
    requiresHuman = true;
    reasonCode = "legal_risk_detected";
    reasoningSummary = "Se detectó lenguaje con potencial riesgo legal o reclamo severo. La IA suspende la automatización y escala de forma inmediata.";
    citations.push("Criterios Estrictos de Handoff a Humano");

    if (lang === "pt") {
      replyDraft = `Olá ${sender}, tomei nota da sua mensagem e transferi com máxima prioridade para nossa equipe diretiva entrar em contato diretamente.`;
    } else if (lang === "en") {
      replyDraft = `Hello ${sender}, I have noted your message and escalated it with top priority to our leadership team to reach out to you directly.`;
    } else {
      replyDraft = `Hola ${sender}, he tomado nota de tu mensaje y lo he transferido con máxima prioridad a nuestro equipo directivo para que se comuniquen contigo directamente a la brevedad.`;
    }
  }

  // 2. Unsubscribe / Opt-out
  else if (
    text.includes("no me escribas") ||
    text.includes("dar de baja") ||
    text.includes("spam") ||
    text.includes("remover") ||
    text.includes("no mas mensajes") ||
    text.includes("unsubscribe") ||
    text.includes("stop messaging") ||
    text.includes("remove me") ||
    text.includes("não me escreva") ||
    text.includes("descadastrar") ||
    text.includes("parar")
  ) {
    intent = "unsubscribe";
    confidence = 0.97;
    riskLevel = "low";
    action = "stop_outreach";
    requiresHuman = false;
    reasonCode = "opt_out_respected";
    reasoningSummary = "El contacto solicita explícitamente no recibir más comunicaciones. Se detienen las secuencias.";
    citations.push("Protocolo de Respeto de Contacto");

    if (lang === "pt") {
      replyDraft = `Entendido perfeitamente, ${sender}. Peço desculpas pelo incômodo; já atualizei seu contato para não enviar mais mensagens. Muito sucesso!`;
    } else if (lang === "en") {
      replyDraft = `Understood completely, ${sender}. Apologies for any inconvenience; I have marked your profile to stop further messages. Wishing you the best!`;
    } else {
      replyDraft = `Entendido perfectamente, ${sender}. Disculpa las molestias; ya he marcado tu contacto para no enviarte más comunicaciones por este medio. ¡Muchos éxitos!`;
    }
  }

  // 3. Human Requested
  else if (
    text.includes("humano") ||
    text.includes("persona real") ||
    text.includes("alguien real") ||
    text.includes("tu telefono") ||
    text.includes("tu teléfono") ||
    text.includes("llamame al") ||
    text.includes("llámame al") ||
    text.includes("human") ||
    text.includes("real person") ||
    text.includes("call me") ||
    text.includes("phone number") ||
    text.includes("pessoa real") ||
    text.includes("falar com alguém") ||
    text.includes("me liga")
  ) {
    intent = "human_requested";
    confidence = 0.95;
    riskLevel = "medium";
    action = "handoff";
    requiresHuman = true;
    reasonCode = "human_operator_requested";
    reasoningSummary = "El prospecto solicita hablar con un consultor o persona del equipo. Se activa handoff comercial.";
    citations.push("Criterios Estrictos de Handoff a Humano");

    if (lang === "pt") {
      replyDraft = `Com certeza, ${sender}! Já notifiquei um especialista da nossa equipe para assumir a conversa e falar com você diretamente.`;
    } else if (lang === "en") {
      replyDraft = `Of course, ${sender}! I've just notified a specialist from our team to take over the conversation and get in touch with you right away.`;
    } else {
      replyDraft = `¡Por supuesto, ${sender}! Le acabo de notificar a uno de nuestros especialistas del equipo para que tome la conversación y se ponga en contacto contigo de inmediato.`;
    }
  }

  // 4. Meeting Request / Demo / Call
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
    text.includes("cuando podemos hablar") ||
    text.includes("meeting") ||
    text.includes("schedule") ||
    text.includes("book a call") ||
    text.includes("calendar") ||
    text.includes("reunião") ||
    text.includes("conversa") ||
    text.includes("demonstração") ||
    text.includes("podemos conversar")
  ) {
    intent = "meeting_request";
    confidence = 0.96;
    riskLevel = "low";
    action = goalType === "schedule_meeting" ? "offer_slots" : "answer";
    requiresHuman = false;
    reasonCode = goalType === "schedule_meeting" ? "demo_booking_requested" : "demo_landing_sent";
    reasoningSummary =
      goalType === "schedule_meeting"
        ? "El prospecto muestra intención de agendar una videollamada. Se ofrece el enlace de calendario."
        : "El prospecto muestra interés o solicita demo. Se le comparte el enlace directo a la presentación/demo en video.";
    citations.push(
      goalType === "schedule_meeting"
        ? "Protocolo de Agendamiento de Reuniones"
        : "Presentación Oficial y Demostración en Video",
      "Propuesta de Valor & Capacidades de InHubFlow"
    );

    if (goalType === "schedule_meeting") {
      if (lang === "pt") {
        replyDraft = `Excelente iniciativa, ${sender}! Ficaremos felizes em apresentar a plataforma ao vivo adaptada aos objetivos da sua equipe.

Você pode escolher o melhor dia e horário diretamente por este link (20 minutos):
${bookingUrl}

Fica bom para você, ou prefere combinar um horário específico por aqui?`;
      } else if (lang === "en") {
        replyDraft = `Great initiative, ${sender}! We would love to show you the platform live tailored to your team's goals.

You can pick the date and time that suits you best via this link (20 minutes):
${bookingUrl}

Does that work for you, or would you rather coordinate a specific slot here?`;
      } else {
        replyDraft = `¡Excelente iniciativa, ${sender}! Estaremos encantados de mostrarte la plataforma en vivo adaptada a los objetivos de tu equipo.

Puedes elegir la fecha y franja horaria que mejor te convenga en este enlace (20 minutos):
${bookingUrl}

¿Te parece bien, o prefieres que coordinemos una hora concreta por aquí?`;
      }
    } else if (goalType === "send_landing_demo") {
      if (lang === "pt") {
        replyDraft = `Excelente iniciativa, ${sender}! Compartilho aqui o link direto para a nossa apresentação e demonstração em vídeo para que você possa avaliar no seu próprio ritmo:

${targetUrl}

Diretamente pela página você pode conferir todos os detalhes e ativar seu acesso se fizer sentido. O que acha?`;
      } else if (lang === "en") {
        replyDraft = `Great initiative, ${sender}! Here is the direct link to our interactive presentation and video walkthrough so you can review it at your own pace:

${targetUrl}

You can explore all capabilities and get started directly from that page if it aligns with your goals. Does that sound good?`;
      } else {
        replyDraft = `¡Excelente iniciativa, ${sender}! Te comparto aquí el enlace directo a nuestra presentación interactiva y demostración en video para que puedas revisarla a tu propio ritmo:

${targetUrl}

Desde esa misma página puedes evaluar las funcionalidades y activar tu acceso si te resulta de valor. ¿Te parece bien revisarlo por allí?`;
      }
    } else {
      // custom_link
      const pitch = input.config.ctaPitchText || "Te comparto el enlace directo a continuación:";
      if (lang === "pt") {
        replyDraft = `Perfeito, ${sender}! ${pitch}\n\n${targetUrl}\n\nFico à total disposição para qualquer dúvida.`;
      } else if (lang === "en") {
        replyDraft = `Awesome, ${sender}! ${pitch}\n\n${targetUrl}\n\nPlease let me know if you have any questions along the way.`;
      } else {
        replyDraft = `¡Excelente, ${sender}! ${pitch}\n\n${targetUrl}\n\nQuedo a tu total disposición por cualquier duda que te surja al revisarlo.`;
      }
    }
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
    text.includes("presupuesto") ||
    text.includes("price") ||
    text.includes("how much") ||
    text.includes("pricing") ||
    text.includes("cost") ||
    text.includes("plans") ||
    text.includes("preço") ||
    text.includes("quanto custa") ||
    text.includes("valor") ||
    text.includes("planos") ||
    text.includes("orçamento")
  ) {
    intent = "pricing_question";
    confidence = 0.94;
    riskLevel = "low";
    action = "answer";
    requiresHuman = false;
    reasonCode = "transparent_pricing_provided";
    reasoningSummary = "Consulta sobre precios y planes oficiales. Se detalla la estructura multislot aprobada en la base de conocimiento.";
    citations.push("Estructura de Precios y Planes Oficiales");

    if (lang === "pt") {
      replyDraft = `Olá ${sender}, com certeza! A InHubFlow conta com a seguinte estrutura de planos conforme a quantidade de contas do LinkedIn conectadas:

- Plano Starter: $49/mês (1 conta de LinkedIn, 20 inv/dia, 30 DMs/dia, Viral Engine).
- Plano Growth: $149/mês (5 contas em simultâneo, 100 inv/dia, 150 DMs/dia, gestão de equipe multislot).
- Plano Business: $279/mês (10 contas em simultâneo, 200 inv/dia, 300 DMs/dia, API e suporte prioritário).

Todos os planos incluem 20% de desconto no faturamento anual. Quantas contas ou pessoas da sua equipe têm interesse em prospectar?`;
    } else if (lang === "en") {
      replyDraft = `Hi ${sender}, glad to share InHubFlow's plan structure based on how many LinkedIn accounts you want to connect:

- Starter Plan: $49/mo (1 LinkedIn account, 20 inv/day, 30 DMs/day, Viral Engine).
- Growth Plan: $149/mo (5 simultaneous accounts, 100 inv/day, 150 DMs/day, multislot team management).
- Business Plan: $279/mo (10 simultaneous accounts, 200 inv/day, 300 DMs/day, API & priority support).

All plans include a 20% discount on annual billing. How many accounts or SDRs in your team are looking to prospect?`;
    } else {
      replyDraft = `Hola ${sender}, con gusto te comparto la estructura de planes de InHubFlow según la cantidad de cuentas de LinkedIn que desees conectar:

- Plan Starter: $49/mes (1 cuenta de LinkedIn, 20 inv/día, 30 DMs/día, Viral Engine).
- Plan Growth: $149/mes (5 cuentas en simultáneo, 100 inv/día, 150 DMs/día, gestión de equipo multislot).
- Plan Business: $279/mes (10 cuentas en simultáneo, 200 inv/día, 300 DMs/día, API y soporte prioritario).

Todos los planes incluyen 20% de descuento en suscripción anual y garantía de prueba guiada. ¿Cuántas cuentas o personas de tu equipo estarían interesadas en prospectar?`;
    }
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
    text.includes("muy caro") ||
    text.includes("already use") ||
    text.includes("have a tool") ||
    text.includes("too busy") ||
    text.includes("banned") ||
    text.includes("já usamos") ||
    text.includes("temos fornecedor") ||
    text.includes("bloqueio") ||
    text.includes("sem tempo") ||
    text.includes("muito caro")
  ) {
    intent = "objection";
    confidence = 0.91;
    riskLevel = "low";
    action = "answer";
    requiresHuman = false;
    reasonCode = "objection_handled_with_approved_framework";
    reasoningSummary = "Se detectó una objeción común de prospección. Se aplica el marco de diferenciación y seguridad de la base de conocimiento.";
    citations.push("Manejo de Objeciones Comunes", "Propuesta de Valor & Capacidades de InHubFlow");

    if (lang === "pt") {
      if (text.includes("waalaxy") || text.includes("lemlist") || text.includes("já usamos") || text.includes("concorrente")) {
        replyDraft = `Totalmente compreensível, ${sender}. Muitas agências e empresas que hoje usam a InHubFlow já utilizavam ferramentas de prospecção em massa.

A grande diferença é que não enviamos mensagens no escuro: nosso Signal Radar identifica quando um prospect interage com conteúdo do seu nicho (leads aquecidos), alcançando taxas de resposta superiores a 40% e protegendo suas contas do LinkedIn com emulação humana real.

Teria interesse em ver uma breve comparação de 5 minutos sobre como potencializamos o que vocês já utilizam?`;
      } else {
        replyDraft = `Essa é uma preocupação muito válida, ${sender}. Exatamente por isso na InHubFlow não usamos extensões de navegador arriscadas. Todas as conexões operam com emulação humana segura e limites prudentes.

Sua segurança é a prioridade número um. Gostaria de conhecer mais sobre nossas camadas de proteção?`;
      }
    } else if (lang === "en") {
      if (text.includes("waalaxy") || text.includes("lemlist") || text.includes("already use")) {
        replyDraft = `Totally understandable, ${sender}. Many agencies and sales teams using InHubFlow today previously used mass cold outreach tools.

The key difference is we don't message cold contacts blindly: our Signal Radar detects warm prospects engaging with industry content, delivering response rates above 40% while protecting your LinkedIn reputation with real human emulation.

Would you be open to a quick 5-minute comparison on how we complement or amplify your current setup?`;
      } else {
        replyDraft = `A very valid concern, ${sender}. That's precisely why InHubFlow doesn't rely on risky browser extensions. All outreach runs with safe human emulation and conservative daily pacing.

Account safety is our top priority. Would you like to see how our protection framework works?`;
      }
    } else {
      if (text.includes("waalaxy") || text.includes("lemlist") || text.includes("expandi") || text.includes("ya usamos")) {
        replyDraft = `Totalmente comprensible, ${sender}. Muchas agencias y empresas que hoy usan InHubFlow venían de herramientas de prospección masiva en frío.

La gran diferencia es que nosotros no enviamos mensajes a ciegas; nuestro Signal Radar detecta cuando un prospecto comenta o interactúa con contenido de tu sector (leads 'tibios'), logrando tasas de respuesta de más del 40% y protegiendo tu reputación en LinkedIn con emulación humana real.

¿Te interesaría ver una breve comparativa de 5 minutos sobre cómo complementamos o potenciamos lo que ya tienen?`;
      } else {
        replyDraft = `Esa es una preocupación muy válida, ${sender}. Justamente por eso en InHubFlow no usamos extensiones de Chrome riesgosas. Toda la conexión opera con emulación humana segura, respetando rotación de IPs residenciales y límites prudentes de 20 a 25 invitaciones diarias por cuenta.

Tu seguridad es la prioridad número uno. ¿Te gustaría conocer más sobre nuestras capas de protección?`;
      }
    }
  }

  // 7. Not Interested (Polite decline)
  else if (
    text.includes("no me interesa") ||
    text.includes("no gracias") ||
    text.includes("por ahora no") ||
    text.includes("no estamos buscando") ||
    text.includes("not interested") ||
    text.includes("no thank") ||
    text.includes("não tenho interesse") ||
    text.includes("não obrigado") ||
    text.includes("agora não")
  ) {
    intent = "not_interested";
    confidence = 0.93;
    riskLevel = "low";
    action = "no_action";
    requiresHuman = false;
    reasonCode = "polite_decline_acknowledged";
    reasoningSummary = "El contacto rechaza cordialmente. Se responde de manera educada dejando la puerta abierta para el futuro.";
    citations.push("Protocolo de Relación Profesional");

    if (lang === "pt") {
      replyDraft = `Totalmente de acordo, ${sender}! Agradeço muito por me avisar com sinceridade. Permanecemos conectados por aqui para quando fizer mais sentido. Uma excelente semana!`;
    } else if (lang === "en") {
      replyDraft = `Totally fair, ${sender}! I really appreciate your candid reply. Let's stay connected here for whenever the timing is right. Have a great week!`;
    } else {
      replyDraft = `¡Totalmente de acuerdo, ${sender}! Agradezco mucho que me lo hayas comentado con sinceridad. Quedamos en contacto por aquí para cuando sea un mejor momento. ¡Que tengas una excelente semana!`;
    }
  }

  // 8. General Interested / Product Question
  else {
    intent = "interested";
    confidence = 0.92;
    riskLevel = "low";
    action = "answer";
    requiresHuman = false;
    reasonCode = "positive_intent_nurtured";
    reasoningSummary = "Interés abierto en la solución. Se resume la propuesta de valor con llamado a la acción enfocado.";
    citations.push("Propuesta de Valor & Capacidades de InHubFlow");

    if (lang === "pt") {
      replyDraft = `Com muito prazer, ${sender}! A InHubFlow é uma suite de Social Selling projetada para gerar reuniões qualificadas no LinkedIn combinando 3 motores:

1. Signal Radar: Detecta tomadores de decisão ativos comentando publicações do seu mercado.
2. Interação Automatizada: Visitas, curtidas e comentários inteligentes em posts recentes.
3. SDR IA: Mensagens e acompanhamento contextual que convertem conversas em reuniões.

Você teria 15 minutos esta semana para vermos uma demonstração rápida adaptada ao seu time?`;
    } else if (lang === "en") {
      replyDraft = `With pleasure, ${sender}! InHubFlow is a Social Selling suite designed to generate qualified sales meetings on LinkedIn combining 3 engines:

1. Signal Radar: Identifies active decision-makers engaging with industry content.
2. Smart Engagement: Automated visits, likes, and contextual comments on prospects' posts.
3. Virtual SDR AI: Dynamic messaging that turns social conversations into booked meetings.

Would you have 15 minutes this week for a quick walkthrough tailored to your team?`;
    } else {
      replyDraft = `¡Con mucho gusto, ${sender}! InHubFlow es una suite de Social Selling diseñada para generar reuniones comerciales en LinkedIn combinando 3 motores:

1. Signal Radar: Detecta prospectos activos comentando en publicaciones de tu sector.
2. Interacción Automatizada: Visitas, likes y comentarios contextuales en sus publicaciones.
3. Asistente SDR IA: Mensajes personalizados que transforman interacciones en reuniones de venta.

¿Tendrías 15 minutos esta semana para una demo rápida adaptada a tu equipo?`;
    }
  }

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
    latencyMs: Date.now() - start,
    model: input.config.model,
    detectedLanguage: lang,
  };
}
