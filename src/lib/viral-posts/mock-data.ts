import type { CreatedPost, ViralPostTemplate } from "./types";

export const initialViralTemplates: ViralPostTemplate[] = [
  {
    id: "viral-01",
    author: "Elena Morales",
    authorHeadline: "VP of Growth en SaaS B2B | 48K seguidores",
    publishedDate: "Hace 2 dias",
    topic: "Social Selling B2B",
    format: "carousel",
    hook: "La mayoria de las agencias cometen este error fatal al prospectar en frio por LinkedIn:",
    fullContent: `La mayoria de las agencias cometen este error fatal al prospectar en frio por LinkedIn:

Intentan vender en el primer mensaje a personas que ni siquiera saben quienes son.

El outbound en frio tradicional tiene una tasa de respuesta inferior al 3%.
En cambio, el enfoque Inbound basado en activos de alto valor (Lead Magnets) supera el 35%.

El proceso que usamos en nuestro equipo:
1. Publicar un post o carrusel resolviendo un dolor critico de la industria.
2. Añadir un llamado a la accion pidiendo una palabra clave especifica.
3. El sistema detecta el comentario y envia el PDF de inmediato por mensaje directo.
4. Quien recibe el material percibe autoridad inmediata y abre la puerta a una conversacion comercial genuina.

Desliza el carrusel completo para ver la plantilla de mensajes paso a paso.

Comenta "SISTEMA" y te envio la plantilla en PDF sin coste por privado.`,
    carouselSlides: [
      {
        slideNumber: 1,
        isCover: true,
        title: "Como Convertir Comentarios en Clientes B2B",
        subtitle: "Framework Inbound de 4 Pasos para LinkedIn",
        content: ["Por Elena Morales | Growth B2B", "Guia Operativa para Fundadores y Agencias"],
        footerText: "@elenagrowth",
      },
      {
        slideNumber: 2,
        title: "El Problema del Mensaje en Frio",
        content: [
          "Tasa de apertura promedio en frio: 18%",
          "Tasa de respuesta: Menor al 3%",
          "El decisor percibe spam antes de entender tu valor.",
          "Resultado: Bloqueos y esfuerzo comercial desperdiciado.",
        ],
        footerText: "Paso 1: Diagnostico",
      },
      {
        slideNumber: 3,
        title: "La Alternativa Inbound",
        content: [
          "Crea un activo de valor concreto (Playbook, Plantilla, Calculadora).",
          "Publica el contenido mostrando los resultados tangibles.",
          "Solicita una palabra clave de activacion en los comentarios.",
        ],
        footerText: "Paso 2: Activacion",
      },
      {
        slideNumber: 4,
        title: "Entrega Instantanea en DM",
        content: [
          "El sistema detecta el comentario con la palabra clave.",
          "Valida el grado de conexion en LinkedIn.",
          "Despacha el PDF directamente al chat privado.",
        ],
        footerText: "Paso 3: Automatizacion",
      },
      {
        slideNumber: 5,
        isCta: true,
        title: "¿Quieres Implementar Este Sistema?",
        subtitle: "Recibe el documento de trabajo completo",
        content: [
          "Comenta SISTEMA en esta publicacion",
          "Te envio la plantilla en formato PDF por mensaje privado hoy mismo.",
        ],
        footerText: "InHubFlow Social Selling",
      },
    ],
    likes: 1840,
    comments: 420,
    shares: 115,
    engagementRatio: "7.8%",
    mediaUrl: "https://images.unsplash.com/photo-1542744094-3a31f272c490?auto=format&fit=crop&w=700&q=80",
    hasMedia: true,
  },
  {
    id: "viral-02",
    author: "Carlos Mendez",
    authorHeadline: "Founder & Lead Strategist en OutboundLab",
    publishedDate: "Hace 3 dias",
    topic: "Prospeccion con IA",
    format: "text",
    hook: "Como generamos 48 reuniones comerciales el mes pasado sin enviar un solo correo en frio:",
    fullContent: `Como generamos 48 reuniones comerciales el mes pasado sin enviar un solo correo en frio:

No enviamos 1,000 correos masivos.
No contratamos 3 SDRs junior adicionales.
No compramos bases de datos recicladas de Apollo.

Hicimos una sola cosa bien:
Transformamos nuestro perfil de LinkedIn en una maquina de atraccion con 3 publicaciones semanales enfocadas en dolor.

Cada publicacion incluia un gancho directo:
"Comenta AUDITORIA y reviso tus 3 metricas clave de prospeccion".

De cada post:
- 70 personas comentaron la palabra clave.
- Nuestro flujo envio el diagnostico en privado en menos de 5 minutos.
- 16 de esas personas solicitaron una llamada para que nosotros implementaramos la solucion.

El Social Selling no es publicar por publicar.
Es diseñar un puente directo entre el contenido y tu calendario de ventas.

¿Cual es el mayor obstaculo que tienes hoy para generar pipeline en LinkedIn? Los leo en comentarios.`,
    likes: 2450,
    comments: 530,
    shares: 180,
    engagementRatio: "8.4%",
  },
  {
    id: "viral-03",
    author: "Sofia Restrepo",
    authorHeadline: "Consultora de Marca Personal para C-Levels B2B",
    publishedDate: "Hace 5 dias",
    topic: "Marca Personal Ejecutiva",
    format: "image",
    hook: "Tu perfil de LinkedIn no es un curriculum vitae. Es una pagina de ventas que trabaja 24/7.",
    fullContent: `Tu perfil de LinkedIn no es un curriculum vitae. Es una pagina de ventas que trabaja 24/7.

Si tu titular dice "Ayudo a empresas a escalar con soluciones integrales", nadie va a entender que haces.

Aqui la formula exacta para un titular de alto impacto:
[Cargo / Rol] para [Nicho Exacto] | Te ayudo a lograr [Resultado Deseado] sin [Objecion Principal] | [Prueba Social].

Ejemplo real:
"Especialista en Growth para SaaS B2B | Te ayudo a duplicar tu pipeline calificado sin llamadas en frio ni bases de datos basura | +120 empresas asesoradas".

El titular despierta la curiosidad.
El contenido demuestra la competencia.
El mensaje privado cierra el trato.

Guarda esta estructura para auditar tu perfil hoy mismo.`,
    imagePrompt: "A sleek modern minimalist B2B desk setup with a high-end laptop displaying an analytics growth chart, soft studio lighting, deep blue and slate tones, 8k resolution, photorealistic corporate style.",
    likes: 3120,
    comments: 670,
    shares: 240,
    engagementRatio: "9.2%",
    mediaUrl: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=700&q=80",
    hasMedia: true,
  },
  {
    id: "viral-04",
    author: "Martin Gomez",
    authorHeadline: "Head of Sales Pipeline en B2B Mastery",
    publishedDate: "Hace 1 semana",
    topic: "Lead Magnets & Automatización",
    format: "carousel",
    hook: "5 lead magnets en formato PDF que generan mas de 20 clientes al mes en LinkedIn:",
    fullContent: `5 lead magnets en formato PDF que generan mas de 20 clientes al mes en LinkedIn:

El contenido generico ya no funciona. Tu audiencia busca frameworks accionables que puedan implementar en 15 minutos.

En este carrusel desgloso los 5 formatos con mayor tasa de conversion probada:
1. La Plantilla Operativa en Hoja de Calculo.
2. El Check-list de Auditoria Rapida.
3. El Swipe File de Mensajes de Prospeccion.
4. El Mapa de Arquitectura Tecnologica.
5. El Caso de Estudio Desglosado con Metricas.

Desliza para ver la estructura de cada uno.

Comenta RECURSOS y te paso el enlace al documento editable.`,
    carouselSlides: [
      {
        slideNumber: 1,
        isCover: true,
        title: "5 Lead Magnets de Alta Conversion B2B",
        subtitle: "Formatos que convierten comentarios en reuniones de venta",
        content: ["Por Martin Gomez", "B2B Mastery"],
        footerText: "@martinsales",
      },
      {
        slideNumber: 2,
        title: "1. La Plantilla Operativa",
        content: [
          "Resuelve un proceso repetitivo en 1 solo clic.",
          "Facil de usar, alto valor percibido inmediato.",
          "Ejemplo: Hoja de calculo para planificar 30 dias de contenido.",
        ],
        footerText: "Formato 1",
      },
      {
        slideNumber: 3,
        title: "2. El Checklist de Auditoria",
        content: [
          "Permite al cliente diagnosticar donde esta perdiendo dinero.",
          "Genera urgencia para contratar tu solucion experta.",
          "Ejemplo: 12 puntos para auditar tu secuencia de outreach.",
        ],
        footerText: "Formato 2",
      },
      {
        slideNumber: 4,
        title: "3. El Swipe File de Mensajes",
        content: [
          "Muestra ejemplos reales de mensajes que generaron respuestas.",
          "Ahorra tiempo de redaccion a tu cliente ideal.",
          "Demuestra maestria en comunicacion comercial.",
        ],
        footerText: "Formato 3",
      },
      {
        slideNumber: 5,
        isCta: true,
        title: "Recibe los 5 Ejemplos Listos para Usar",
        subtitle: "Documento en PDF con enlaces editables",
        content: ["Comenta RECURSOS abajo", "Te lo envio por privado de inmediato"],
        footerText: "InHubFlow Social Selling",
      },
    ],
    likes: 2150,
    comments: 480,
    shares: 130,
    engagementRatio: "7.9%",
    mediaUrl: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=700&q=80",
    hasMedia: true,
  },
  {
    id: "viral-05",
    author: "Valeria Ortiz",
    authorHeadline: "Inbound Strategist & Speaker B2B",
    publishedDate: "Hace 4 dias",
    topic: "Outbound vs Inbound",
    format: "text",
    hook: "El outbound agresivo esta muerto. El futuro de las ventas B2B es la prospeccion por afinidad:",
    fullContent: `El outbound agresivo esta muerto. El futuro de las ventas B2B es la prospeccion por afinidad.

Cuando una persona interactua con una publicacion tuya o de tu competidor, esta emitiendo una señal clara:
"Este tema me interesa hoy".

Ignorar esa señal y seguir enviando mensajes en frio a directores que no te conocen es tirar tu presupuesto a la basura.

La estrategia moderna:
1. Escanear quien comenta o da like en publicaciones clave del sector.
2. Visitar su perfil para figurar en sus notificaciones.
3. Iniciar conversacion referenciando el contexto exacto:
   "Vi tu comentario sobre la dificultad de agendar citas en el post de X... ¿como lo estan resolviendo en tu equipo?"

Cero presion. Cero pitch en el primer contacto. Maxima afinidad.`,
    likes: 1980,
    comments: 395,
    shares: 110,
    engagementRatio: "7.5%",
  },
  {
    id: "viral-06",
    author: "Javier Fernandez",
    authorHeadline: "Co-Founder en RevOps Latam | Pipeline Engine",
    publishedDate: "Hace 6 dias",
    topic: "Cierre de Ventas High-Ticket",
    format: "image",
    hook: "De 0 a 100K USD en pipeline mensual siguiendo esta regla de oro en el chat de LinkedIn:",
    fullContent: `De 0 a 100K USD en pipeline mensual siguiendo esta regla de oro en el chat de LinkedIn:

Regla: "Nunca intentes cerrar la venta en el chat; tu unico objetivo es cerrar los siguientes 15 minutos en el calendario".

Muchos fundadores cometen el error de enviar parrafos gigantes explicando precios, metodologia y modulos tecnicos.
El decisor se abruma y deja de responder.

En su lugar:
1. Haz una pregunta de calificacion breve.
2. Reconoce el dolor.
3. Ofrece una llamada sin compromiso de 15 minutos con una promesa de valor concreta:
   "Tengo una hoja de ruta de 3 pasos para esto. ¿Tendras 15 minutos este jueves a las 10:00 para mostratela sin compromiso?"

La simplicidad convierte.`,
    imagePrompt: "Executive boardroom glass meeting room with a clean laptop and espresso cup, panoramic view of a modern city skyline at golden hour, elegant corporate atmosphere, 8k hyper-realistic.",
    likes: 2600,
    comments: 540,
    shares: 165,
    engagementRatio: "8.6%",
    mediaUrl: "https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&w=700&q=80",
    hasMedia: true,
  },
  {
    id: "viral-07",
    author: "Andrea Montero",
    authorHeadline: "Especialista en Automatizacion & SDR con IA",
    publishedDate: "Hace 1 semana",
    topic: "Automatizacion & Pacing",
    format: "carousel",
    hook: "Como prospectar en LinkedIn sin que restrinjan tu cuenta: La guia de seguridad definitiva",
    fullContent: `Como prospectar en LinkedIn sin que restrinjan tu cuenta: La guia de seguridad definitiva.

El mayor miedo de cualquier director comercial es perder su perfil personal o el de su equipo.

LinkedIn no penaliza la actividad; penaliza la actividad robotica predecible.

Si envias 50 mensajes en 2 minutos con el mismo texto, seras bloqueado.
Si utilizas intervalos de jitter humano (3 a 12 minutos aleatorios) y respetas el limite de 20 invitaciones diarias, tu cuenta permanecera 100% segura.

En este carrusel explicamos las mejores practicas de seguridad tecnica.

Comenta SEGURIDAD para enviarte la guia tecnica completa en PDF.`,
    carouselSlides: [
      {
        slideNumber: 1,
        isCover: true,
        title: "Guia de Seguridad y Pacing para LinkedIn",
        subtitle: "Como prospectar de forma consistente sin poner en riesgo tu cuenta",
        content: ["Por Andrea Montero", "Automatizacion Responsable B2B"],
        footerText: "@andreaia",
      },
      {
        slideNumber: 2,
        title: "Los Limites Seguros Diarios",
        content: [
          "Maximo 20 a 25 solicitudes de conexion por dia.",
          "Maximo 30 a 40 mensajes directos diarios.",
          "Espaciados a lo largo de un horario comercial realista.",
        ],
        footerText: "Regla 1",
      },
      {
        slideNumber: 3,
        title: "El Factor Jitter (Retardo Humano)",
        content: [
          "Nunca ejecutes dos acciones al mismo segundo.",
          "Introduce pausas variables de 3 a 12 minutos.",
          "Simula el patron de navegacion de una persona real.",
        ],
        footerText: "Regla 2",
      },
      {
        slideNumber: 4,
        isCta: true,
        title: "Descarga la Matriz de Seguridad",
        subtitle: "Protocolo de proteccion de cuentas B2B",
        content: ["Comenta SEGURIDAD", "Te envio el documento por privado"],
        footerText: "InHubFlow Social Selling",
      },
    ],
    likes: 3400,
    comments: 720,
    shares: 310,
    engagementRatio: "9.8%",
    mediaUrl: "https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=700&q=80",
    hasMedia: true,
  },
  {
    id: "viral-08",
    author: "Tomas Herrera",
    authorHeadline: "Director en Growth Latam | Copywriter B2B",
    publishedDate: "Hace 3 dias",
    topic: "Copywriting Viral",
    format: "text",
    hook: "La anatomia de un post de LinkedIn que genera 50,000 visualizaciones y 30 leads:",
    fullContent: `La anatomia de un post de LinkedIn que genera 50,000 visualizaciones y 30 leads:

Linea 1 (Gancho): Una afirmacion contraria a la creencia comun.
Linea 2 (Espacio en blanco): Despertar la curiosidad antes de que den clic en 'ver mas'.
Lineas 3 a 6 (Desarrollo): La historia o la leccion en puntos claros.
Lineas 7 a 9 (El framework): Que hacer exactamente.
Linea final (CTA): La accion concreta requerida.

Guarda este post y usalo como plantilla para tu publicacion de mañana.`,
    likes: 1720,
    comments: 310,
    shares: 98,
    engagementRatio: "6.9%",
  },
  {
    id: "viral-09",
    author: "Lucia Navarro",
    authorHeadline: "Founder en Agencia Inbound Sales",
    publishedDate: "Hace 2 dias",
    topic: "Social Selling B2B",
    format: "image",
    hook: "Por que publicar 5 veces al dia no te traera clientes si tu mensaje no tiene intencion comercial:",
    fullContent: `Por que publicar 5 veces al dia no te traera clientes si tu mensaje no tiene intencion comercial:

La vanidad de los likes no paga las nominas.
Tener 1,000 reacciones de personas que nunca te van a comprar no sirve de nada.

Es preferible tener 30 reacciones de Directores Comerciales que necesitan tu producto hoy.

Enfoca cada publicacion en un problema que tu servicio soluciona directamente.`,
    imagePrompt: "Minimalist executive workspace with clean notebook, pen, cup of coffee and morning sunlight reflecting on desk surface, cinematic lighting, ultra professional.",
    likes: 1450,
    comments: 290,
    shares: 84,
    engagementRatio: "7.1%",
    mediaUrl: "https://images.unsplash.com/photo-1553877522-43269d4ea984?auto=format&fit=crop&w=700&q=80",
    hasMedia: true,
  },
  {
    id: "viral-10",
    author: "Federico Rossi",
    authorHeadline: "Consultor de Embudo Comercial B2B",
    publishedDate: "Hace 5 dias",
    topic: "Prospeccion con IA",
    format: "carousel",
    hook: "El mapa completo de un embudo automatizado aplicado a LinkedIn para captar leads en piloto automatico:",
    fullContent: `El mapa completo de un embudo automatizado aplicado a LinkedIn para captar leads en piloto automatico:

Paso 1: Post con Lead Magnet.
Paso 2: Disparador por palabra clave en comentarios.
Paso 3: Verificacion de conexion de 1er grado.
Paso 4: Entrega de PDF + invitacion contextual si no estan conectados.
Paso 5: Agendamiento de llamada comercial en el Inbox.

Revisa el diagrama visual completo en las diapositivas adjuntas.

Comenta FLUJO para recibir el mapa editable.`,
    carouselSlides: [
      {
        slideNumber: 1,
        isCover: true,
        title: "Mapa del Embudo Inbound en LinkedIn",
        subtitle: "De comentario publico a reunion agendada",
        content: ["Por Federico Rossi", "Consultor B2B"],
        footerText: "@federicorossi",
      },
      {
        slideNumber: 2,
        title: "Fase 1: Atraccion y Señal",
        content: [
          "Publicacion con valor concreto.",
          "Llamado a comentar palabra clave.",
          "Deteccion instantanea por el monitor de señales.",
        ],
        footerText: "Fase 1",
      },
      {
        slideNumber: 3,
        title: "Fase 2: Entrega y Relacion",
        content: [
          "Like automatico al comentario del lead.",
          "Respuesta publica confirmando envio.",
          "Mensaje directo con PDF adjunto.",
        ],
        footerText: "Fase 2",
      },
      {
        slideNumber: 4,
        isCta: true,
        title: "¿Quieres el Diagrama Completo?",
        subtitle: "Documento en alta resolucion",
        content: ["Comenta FLUJO", "Te lo envio por privado"],
        footerText: "InHubFlow Social Selling",
      },
    ],
    likes: 2890,
    comments: 610,
    shares: 205,
    engagementRatio: "8.9%",
    mediaUrl: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=700&q=80",
    hasMedia: true,
  },
  {
    id: "viral-11",
    author: "Mariana Delgado",
    authorHeadline: "VP of People & Sales Alignment",
    publishedDate: "Hace 1 semana",
    topic: "Marca Personal Ejecutiva",
    format: "text",
    hook: "La razon numero 1 por la que los fundadores tecnicos fallan en LinkedIn:",
    fullContent: `La razon numero 1 por la que los fundadores tecnicos fallan en LinkedIn:

Hablan de caracteristicas tecnicas en vez de transformaciones de negocio.

Al comprador B2B no le importa si tu codigo usa Rust, Python o Microservicios.
Le importa si tu solucion le permite ahorrar costes, reducir el ciclo de venta o evitar fugas de clientes.

Traduce cada feature tecnica a una ventaja economica tangible.`,
    likes: 1650,
    comments: 320,
    shares: 94,
    engagementRatio: "7.0%",
  },
  {
    id: "viral-12",
    author: "Gabriel Santos",
    authorHeadline: "Outreach Automation Specialist",
    publishedDate: "Hace 4 dias",
    topic: "Automatizacion & Pacing",
    format: "image",
    hook: "Por que los audios de 20 segundos por mensaje directo tienen una tasa de conversion 4 veces mayor que el texto:",
    fullContent: `Por que los audios de 20 segundos por mensaje directo tienen una tasa de conversion 4 veces mayor que el texto:

En un mundo saturado de plantillas generadas por IA, la voz humana rompe cualquier barrera de escepticismo.

Nuestra estructura para audios de prospeccion:
1. Saludo cordial con su nombre (3 seg).
2. Referencia al motivo del contacto (7 seg).
3. Una sola pregunta abierta sobre su proceso (10 seg).

Pruebalo en tus proximos 10 prospectos calificados y compara la tasa de respuesta.`,
    imagePrompt: "Modern podcast microphone and headphones sitting on a warm oak wood desk in a creative studio, ambient soft lighting, hyper-detailed photography.",
    likes: 2110,
    comments: 440,
    shares: 125,
    engagementRatio: "7.7%",
    mediaUrl: "https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&w=700&q=80",
    hasMedia: true,
  },
];

export const initialCreatedPosts: CreatedPost[] = [
  {
    id: "created-roberto-fracasan",
    title: "El 90 de las empresas fracasan en su prospección B2B porque confian en",
    format: "text",
    content: "El 90 de las empresas fracasan en su prospección B2B porque confían en la suerte y en envíos masivos a ciegas.\n\nLa realidad es que cuando el targeting, la captura de señales de compra en tiempo real y la personalización basada en IA se alinean, el outbound deja de ser una molestia y se convierte en reuniones calificadas.",
    leadMagnetKeyword: "SISTEMA",
    status: "published",
    publishedAt: "2026-10-20T12:47:00.000Z",
    scheduledAt: "2026-10-20T12:47:00.000Z",
    createdAt: "2026-10-20T12:00:00.000Z",
    linkedinPostId: "7518660758377840640",
    postUrl: "https://www.linkedin.com/posts/robertoorse-agencia_el-90-de-las-empresas-fracasan-en-su-prospecci%C3%B3n-activity-7518660758377840640-m8zx?utm_source=social_share_send&utm_medium=member_desktop_web&rcm=ACoAAF6cQ1YBvZ8OnTP5kVc_ulf5r9m-0SaHNzU",
    targetAccountId: "HfrdagEmSrONX8jqE9IYjQ",
    metrics: {
      likes: 0,
      comments: 0,
      impressions: 1,
      leadsCaptured: 0,
    },
  },
  {
    id: "created-roberto-secuencias",
    title: "Escribir secuencias de prospección en frío que suenen naturales parece",
    format: "text",
    content: "Escribir secuencias de prospección en frío que suenen naturales parece una misión imposible.\n\nPasas minutos intentando que la inteligencia artificial no suene como un robot corporativo, borrando viñetas extrañas y guiones innecesarios.\n\nAun así, cuando presionas 'enviar', el resultado es ignorado porque los algoritmos de patrón detectan la estructura sintética de inmediato.\n\n¿Quieres conocer el framework exacto que utilizamos para escalar reuniones calificadas sin arriesgar tu perfil?\n\nComenta la palabra SISTEMA y te comparto el documento completo por mensaje privado.",
    leadMagnetKeyword: "SISTEMA",
    status: "published",
    publishedAt: "2026-10-19T15:45:16.663Z",
    createdAt: "2026-10-19T15:00:00.000Z",
    linkedinPostId: "7517974158799003648",
    postUrl: "https://www.linkedin.com/posts/robertoorse-agencia_escribir-secuencias-de-prospecci%C3%B3n-en-fr%C3%ADo-activity-7517974158799003648-Rh8S?utm_source=social_share_send&utm_medium=member_desktop_web&rcm=ACoAAF6cQ1YBvZ8OnTP5kVc_ulf5r9m-0SaHNzU",
    targetAccountId: "HfrdagEmSrONX8jqE9IYjQ",
    metrics: {
      likes: 0,
      comments: 1,
      impressions: 16,
      leadsCaptured: 1,
    },
  },
];

