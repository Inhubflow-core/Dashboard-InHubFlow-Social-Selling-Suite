import { KnowledgeSource } from "./types";

export const INITIAL_KNOWLEDGE_SOURCES: KnowledgeSource[] = [
  {
    id: "kb-01",
    title: "Propuesta de Valor & Capacidades de InHubFlow",
    category: "value_prop",
    content: `InHubFlow | Social Selling Suite es una plataforma integral impulsada por IA para empresas B2B, agencias y fundadores que buscan generar reuniones comerciales calificadas en LinkedIn de forma predecible y segura.
Sus 4 pilares diferenciales son:
1. Viral Post Engine: Modelador de publicaciones virales con IA calibrada en copywriting de alta tracción y calendario editorial.
2. Signal Radar (3 Niveles): Detección en tiempo real de leads interactuando con nuestros posts (Nivel 1), posts de la competencia (Nivel 2) o tendencias globales de LinkedIn (Nivel 3).
3. Campañas (Workflow): Flujos multi-paso con pausas inteligentes, comprobación de conexión y envío de DMs contextuales.
4. Asistente SDR IA con Sistema Multislots: Agente autónomo con supervisión que clasifica respuestas, resuelve dudas fundamentadas y coordina llamadas comerciales respetando cuotas por cuenta conectada.`,
    status: "approved",
    updatedAt: "2026-10-01T12:00:00Z",
  },
  {
    id: "kb-02",
    title: "Estructura de Precios y Planes Oficiales",
    category: "pricing",
    content: `InHubFlow opera con un modelo SaaS transparente basado en cuentas conectadas (slots de LinkedIn):
- Plan Starter: $49/mes ($39/mes facturado anualmente). Incluye 1 cuenta conectada, 20 invitaciones/día, 30 DMs/día, Viral Engine y soporte estándar.
- Plan Growth: $149/mes ($119/mes facturado anualmente). Incluye 5 cuentas de LinkedIn en paralelo, 100 invitaciones/día, 150 DMs/día, gestión de equipo y SDR IA colaborativo.
- Plan Business: $279/mes ($223/mes facturado anualmente). Incluye 10 cuentas de LinkedIn, 200 invitaciones/día, 300 DMs/día, API dedicada, analíticas avanzadas y soporte prioritario 24/7.
Garantía: Todos los planes cuentan con periodo de prueba guiado y sin contratos de permanencia a largo plazo.`,
    status: "approved",
    updatedAt: "2026-10-02T10:30:00Z",
  },
  {
    id: "kb-03",
    title: "Manejo de Objeciones Comunes",
    category: "objections",
    content: `Guías de respuesta rápida para objeciones de prospectos:
- Objeción: "Ya usamos Waalaxy, Expandi o Lemlist".
  Respuesta clave: Destacar que InHubFlow no hace prospección en frío ciega; captura leads 'tibios' mediante el Signal Radar cuando interactúan con contenido relevante, logrando tasas de aceptación superiores al 45% frente al 12% del outreach tradicional.
- Objeción: "Tengo miedo de que LinkedIn bloquee o restrinja mi perfil personal".
  Respuesta clave: InHubFlow opera con infraestructura de nube segura, rotando User-Agents residenciales y respetando estrictamente los intervalos humanos de actividad (máximo 20-25 invitaciones diarias por cuenta, distribuidas en horario laboral).
- Objeción: "No tengo tiempo para capacitar a mi equipo en otra herramienta".
  Respuesta clave: La plataforma está diseñada con una interfaz visual intuitiva sin código. El Asistente SDR IA redacta los mensajes y solo requiere 10 minutos al día para revisar y aprobar la cola de respuestas.`,
    status: "approved",
    updatedAt: "2026-10-03T15:00:00Z",
  },
  {
    id: "kb-04",
    title: "Protocolo de Agendamiento de Reuniones",
    category: "company",
    content: `Cuando un prospecto muestre interés explícito en conocer el servicio o solicite una videollamada demostrativa:
1. Confirmar el interés de forma breve y profesional.
2. Proponer 2 opciones de horario en días hábiles (ejemplo: '¿Te vendría bien este jueves por la mañana o el viernes a primera hora?').
3. Proporcionar el enlace directo al Calendario Comercial de InHubFlow para que el prospecto escoja su franja preferida en 30 segundos.
4. Duración de la sesión: 20 minutos de demo ejecutiva orientada a sus objetivos comerciales.`,
    status: "approved",
    updatedAt: "2026-10-04T09:15:00Z",
  },
  {
    id: "kb-05",
    title: "Criterios Estrictos de Handoff a Humano",
    category: "company",
    content: `El Asistente SDR IA DEBE transferir inmediatamente la conversación a un operador humano (sin enviar respuesta automática) en los siguientes casos:
1. El prospecto solicita explícitamente hablar con una persona ('Quiero hablar con un humano', 'Pásame con tu director').
2. Se detecta tono hostil, queja o advertencia legal/privacidad.
3. El prospecto solicita un descuento fuera de los planes oficiales o acuerdos corporativos personalizados (>10 cuentas).
4. El nivel de confianza del modelo de lenguaje sea inferior al 80% o la consulta no esté fundamentada en los documentos aprobados.`,
    status: "approved",
    updatedAt: "2026-10-05T14:45:00Z",
  },
];
