import type { CarouselSlide, PostFormat, ViralPostTemplate } from "./types";

function calculateVirality(likes: number, comments: number, shares: number) {
  const viralityScore = Math.round(likes * 1 + comments * 3.5 + shares * 5);
  let viralityTier: "mega" | "high" | "trending" = "trending";
  let viralityBadge = "En Tendencia 🔥";

  if (viralityScore >= 100 || (likes >= 50 && comments >= 15)) {
    viralityTier = "mega";
    viralityBadge = "Mega Viral 🔥🔥🔥";
  } else if (viralityScore >= 35 || (likes >= 20 && comments >= 5) || comments >= 8) {
    viralityTier = "high";
    viralityBadge = "Alta Tracción 🔥🔥";
  }

  const total = likes + comments + shares;
  const engagementRatio =
    total > 0
      ? `${Math.min(25, Math.max(1.2, parseFloat((4.0 + Math.log10(total + 1) * 3.5).toFixed(1))))}%`
      : "5.4%";

  return { viralityScore, viralityTier, viralityBadge, engagementRatio };
}

// 1. Catálogo especializado de 12 publicaciones virales para el nicho SAAS & SOFTWARE
const saasTemplates: ViralPostTemplate[] = [
  {
    id: "saas-viral-01",
    author: "Mateo Silva",
    authorHeadline: "Founder & CEO @ SaaSScale | Ex-Stripe | $2.4M ARR",
    authorAvatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80",
    publishedDate: "Hace 2 días",
    topic: "Métricas SaaS & Churn",
    format: "carousel",
    hook: "La métrica que la mayoría de fundadores de SaaS B2B ignoran y que destruye su Net Revenue Retention (NRR):",
    fullContent: `La métrica que la mayoría de fundadores de SaaS B2B ignoran y que destruye su Net Revenue Retention (NRR):

Todos los meses celebran los nuevos usuarios adquiridos, pero no se dan cuenta de que están llenando un cubo con agujeros en el fondo.

En un modelo de suscripción SaaS, adquirir un cliente cuesta entre 5x y 7x más que retenerlo.
Si tu churn mensual supera el 3%, tu crecimiento se vuelve matemáticamente imposible de sostener al llegar a $50K MRR.

El framework de 5 pasos que usamos para llevar nuestro churn del 4.2% al 0.8% mensual:
1. Reemplazamos el onboarding autoguiado por un Product Activation Checklist interactivo.
2. Identificamos el "Aha Moment" exacto: usuarios que ejecutan 3 acciones clave en sus primeras 48 horas tienen un 84% más de retención a 90 días.
3. Alertas automatizadas de riesgo: si una cuenta reduce su uso un 40% en 7 días, Customer Success recibe una tarea prioritaria.
4. Planes anuales con 2 meses gratis: pasamos del 22% al 61% de clientes en contratos anuales.
5. Encuestas de cancelación con rescate personalizado antes de confirmar la baja.

Desliza el carrusel completo para ver los gráficos de cohortes y el playbook de retención paso a paso.

Comenta "SAAS CHURN" abajo y te comparto la plantilla de análisis de cohortes en PDF sin costo.`,
    carouselSlides: [
      {
        slideNumber: 1,
        isCover: true,
        title: "Cómo Reducir el Churn en tu SaaS a Menos del 1%",
        subtitle: "El Playbook Operativo de Retención y Net Revenue Retention (NRR)",
        content: ["Por Mateo Silva | Founder @ SaaSScale", "Guía para Fundadores y Líderes de Producto"],
        footerText: "@mateosilva_saas",
      },
      {
        slideNumber: 2,
        title: "La Trampa del Crecimiento Ilusorio",
        content: [
          "Sumar 50 clientes nuevos y perder 30 no es crecimiento: es agotamiento de capital.",
          "Churn mensual del 5% = pierdes el 46% de toda tu base de clientes cada año.",
          "El coste de adquisición (CAC) jamás se amortiza con clientes que duran menos de 6 meses.",
        ],
        footerText: "Diagnóstico de Fuga",
      },
      {
        slideNumber: 3,
        title: "El 'Aha Moment' en las Primeras 48h",
        content: [
          "Mapea las 3 acciones críticas que realiza un usuario exitoso en su primer día.",
          "Elimina fricciones de configuración y automatiza la primera victoria rápida.",
          "Usuarios que logran valor temprano tienen un 84% más de LTV.",
        ],
        footerText: "Activación Temprana",
      },
      {
        slideNumber: 4,
        title: "Detección Temprana de Cuentas en Riesgo",
        content: [
          "Monitorea el índice de salud del usuario (Health Score) en tiempo real.",
          "Si el login decae un 40%, interviene con Customer Success antes de que pidan la baja.",
          "Resolver dudas antes de la frustración reduce cancelaciones en un 60%.",
        ],
        footerText: "Soporte Proactivo",
      },
      {
        slideNumber: 5,
        isCta: true,
        title: "¿Quieres la Plantilla de Análisis de Cohortes?",
        subtitle: "Mide y optimiza el NRR de tu SaaS",
        content: [
          "Comenta SAAS CHURN en esta publicación.",
          "Te envío el documento Excel/Notion con todas las fórmulas por mensaje privado.",
        ],
        footerText: "InHubFlow SaaS Playbook",
      },
    ],
    likes: 2840,
    comments: 630,
    shares: 210,
    engagementRatio: "8.4%",
    mediaUrl: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=700&q=80",
    hasMedia: true,
    marketOrigin: "EE.UU. / Global",
    detectedLanguage: "es",
  },
  {
    id: "saas-viral-02",
    author: "Valeria Domínguez",
    authorHeadline: "Head of Growth en B2B SaaS | Ex-HubSpot | Escalando a $10M ARR",
    authorAvatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=150&q=80",
    publishedDate: "Hace 3 días",
    topic: "Escalado de MRR en SaaS",
    format: "text",
    hook: "Cómo pasamos de $15K a $120K de MRR en nuestro software B2B en 14 meses sin rondas de inversión:",
    fullContent: `Cómo pasamos de $15K a $120K de MRR en nuestro software B2B en 14 meses sin rondas de inversión:

No contratamos a 10 vendedores.
No gastamos $50K en anuncios de Google o LinkedIn.
No construimos 40 features nuevas que nadie pidió.

Hicimos solo 3 cambios drásticos en nuestra estrategia de SaaS:

1. Subimos los precios un 300%:
Pasamos de cobrar $49/mes (donde atraíamos clientes problemáticos con alta tasa de quejas) a planes desde $199/mes y $499/mes enfocados en empresas con dolores reales. La tasa de conversión no bajó, pero el CAC payback se redujo a 45 días.

2. Alineamos las secuencias de Social Selling con Demos de 15 minutos:
En lugar de mandar cold emails impersonales, nuestro equipo comparte contenido técnico sobre problemas de nuestra industria y ofrece auditorías gratuitas de 15 minutos. El 42% de esas auditorías se convierten en cuentas de pago.

3. Implementamos expansión de cuentas (Expansion MRR):
Añadimos límites por volumen de uso y usuarios adicionales. Hoy el 38% del crecimiento mensual proviene de clientes actuales que amplían sus planes, no de clientes nuevos.

El crecimiento de un SaaS bootstrapped no se trata de hacer más ruido, sino de tener márgenes sólidos y unit economics que permitan reinvertir cada dólar.

¿En qué etapa de MRR se encuentra tu producto hoy? Los leo en comentarios.`,
    likes: 3120,
    comments: 485,
    shares: 165,
    engagementRatio: "7.9%",
    marketOrigin: "LATAM / Hispanoamérica",
    detectedLanguage: "es",
  },
  {
    id: "saas-viral-03",
    author: "David Albarracín",
    authorHeadline: "SaaS Enterprise Account Executive | $4.8M Cerrados en Software B2B",
    authorAvatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80",
    publishedDate: "Hace 4 días",
    topic: "Ventas Enterprise SaaS",
    format: "carousel",
    hook: "El guión exacto de Demo de 15 minutos que usamos en nuestro SaaS para cerrar cuentas de $20K+/año:",
    fullContent: `El guión exacto de Demo de 15 minutos que usamos en nuestro SaaS para cerrar cuentas de $20K+/año:

El 90% de las demos de software cometen el mismo pecado mortal:
Hacen un 'tour turístico' por la plataforma mostrando botones y menús que al prospecto no le interesan.

A un Director de Operaciones o VP no le importa cómo se ve tu barra lateral.
Le importa si tu software le ahorra 15 horas de trabajo a la semana o si evita que pierda $30,000 en errores operativos.

Nuestra estructura de demo de 4 bloques:
• Minutos 0 a 3: Diagnóstico del dolor (confirmar los 2 problemas urgentes que mencionaron en el formulario).
• Minutos 4 a 9: El camino de la solución (mostrar ÚNICAMENTE la pantalla exacta que resuelve ese dolor específico).
• Minutos 10 a 12: Demostración de ROI con casos reales de clientes similares.
• Minutos 13 a 15: Siguiente paso claro y fijar fecha en calendario antes de colgar la llamada.

Revisa el carrusel para ver las preguntas exactas de cualificación y cómo reaccionar ante objeciones de precio.

Deja un comentario con "DEMO SAAS" y te paso el PDF con el guión completo.`,
    carouselSlides: [
      {
        slideNumber: 1,
        isCover: true,
        title: "Estructura de Demo de Ventas SaaS de 15 Minutos",
        subtitle: "Cómo Cerrar Cuentas B2B sin Aburrir con Tours de Producto",
        content: ["Por David Albarracín | Enterprise AE", "Probado en más de 450 demos de software"],
        footerText: "@davidalbarracin",
      },
      {
        slideNumber: 2,
        title: "Regla #1: Cero Tours Turísticos",
        content: [
          "No expliques cada botón ni cada pestaña de tu aplicación.",
          "Cada minuto que pasas mostrando funciones accesorias diluye el dolor principal.",
          "Muestra directamente el resultado final y cómo se llega a él en 2 clics.",
        ],
        footerText: "Foco en el Valor",
      },
      {
        slideNumber: 3,
        title: "El Bloque de Diagnóstico (Min 0-3)",
        content: [
          "'Antes de abrir la pantalla, ¿cuál es el mayor obstáculo que enfrentan hoy al gestionar X?'",
          "Deja que el prospecto hable el 70% del tiempo en este bloque inicial.",
          "Anota sus palabras textuales para usarlas al presentar la solución.",
        ],
        footerText: "Escucha Activa",
      },
      {
        slideNumber: 4,
        title: "Cierre del Siguiente Paso (Min 13-15)",
        content: [
          "Nunca digas: 'Te envío la propuesta por correo y me avisas'.",
          "Pregunta: '¿Tiene sentido agendar el jueves a las 10 AM para revisar el plan de onboarding con tu equipo técnico?'",
          "Asegura el compromiso en la misma llamada.",
        ],
        footerText: "Compromiso Inmediato",
      },
      {
        slideNumber: 5,
        isCta: true,
        title: "¿Quieres el Guión Completo de Preguntas?",
        subtitle: "Incluye manejo de objeciones de presupuesto y seguridad",
        content: ["Comenta DEMO SAAS abajo.", "Te comparto el documento operativo por privado."],
        footerText: "InHubFlow Sales Framework",
      },
    ],
    likes: 2190,
    comments: 410,
    shares: 135,
    engagementRatio: "8.1%",
    mediaUrl: "https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&w=700&q=80",
    hasMedia: true,
    marketOrigin: "LATAM / Hispanoamérica",
    detectedLanguage: "es",
  },
  {
    id: "saas-viral-04",
    author: "Camila Arismendi",
    authorHeadline: "Product-Led Growth Specialist | Asesora de 18+ Startups SaaS",
    authorAvatar: "https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=150&q=80",
    publishedDate: "Hace 5 días",
    topic: "Product-Led Growth (PLG)",
    format: "image",
    hook: "Free Trial vs Freemium: Probamos ambos modelos durante 6 meses en un SaaS B2B y estos fueron los números:",
    fullContent: `Free Trial vs Freemium: Probamos ambos modelos durante 6 meses en un SaaS B2B y estos fueron los números:

Durante años se debatió si el modelo Freemium es superior al Free Trial de 14 días.
Decidimos hacer un split test riguroso con 18,000 registros de software:

Grupo A: Free Trial de 14 días (sin tarjeta de crédito requerida)
• Registro a activación: 64%
• Activación a cliente de pago: 11.2%
• Tasa global de conversión visitante a pago: 1.8%
• Churn a 90 días: 2.1%

Grupo B: Modelo Freemium (funciones básicas gratis para siempre)
• Registro a activación: 78%
• Activación a cliente de pago: 2.4%
• Tasa global de conversión visitante a pago: 0.9%
• Churn a 90 días: 5.6%

La conclusión que aprendimos:
Freemium funciona genial si tienes un producto con viralidad intrínseca (como Notion, Slack o Figma) y capital para subsidiar usuarios gratuitos.
Pero para un SaaS B2B con un modelo de valor profesional, el Free Trial de 14 días con límite de uso generó un 100% más de facturación real con una fracción del costo de soporte técnico.

¿Qué modelo utilizas en tu aplicación? Comparto la infografía comparativa con las métricas desglosadas.`,
    likes: 2480,
    comments: 520,
    shares: 190,
    engagementRatio: "8.7%",
    mediaUrl: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=700&q=80",
    hasMedia: true,
    marketOrigin: "EE.UU. / Global",
    detectedLanguage: "es",
  },
  {
    id: "saas-viral-05",
    author: "Sebastián Ramos",
    authorHeadline: "VP of Product @ CloudBase | $15M ARR B2B Infrastructure",
    authorAvatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&q=80",
    publishedDate: "Hace 3 días",
    topic: "Arquitectura & Pricing SaaS",
    format: "carousel",
    hook: "Los 4 Errores Fatales al Definir el Pricing de un SaaS B2B (y cómo duplicamos el ACV):",
    fullContent: `Los 4 Errores Fatales al Definir el Pricing de un SaaS B2B (y cómo duplicamos el ACV):

El 80% de los fundadores de software fijan sus precios basándose en lo que cobra su competencia o en una corazonada.

Ese es el camino más rápido a la quiebra silenciosa.
El pricing no es un detalle operativo: es la palanca de crecimiento más potente de todo tu modelo de negocio.

Los errores que corregimos:
1. Cobrar por usuario en lugar de cobrar por 'Value Metric':
Si tu software genera leads, ahorra tiempo de cálculo o procesa facturas, debes cobrar por el volumen de valor generado, no por licencias individuales que el cliente intentará compartir con una sola contraseña.

2. Dejar la opción 'Contactar a Ventas' demasiado oculta:
Los clientes enterprise quieren soporte dedicado y seguridad; cobrarles $99/mes hace que desconfíen de tu robustez técnica.

3. Falta de plan intermedio con anclaje visual (Decoy Effect).

Desliza para ver la matriz de precios que aumentó nuestro Average Contract Value de $1,400 a $3,800 anuales.

Comenta "PRICING SAAS" y te paso la hoja de cálculo de modelado financiero.`,
    carouselSlides: [
      {
        slideNumber: 1,
        isCover: true,
        title: "Matriz Estratégica de Pricing para SaaS B2B",
        subtitle: "Cómo Alinear el Precio con el Valor Real sin Perder Clientes",
        content: ["Por Sebastián Ramos | VP Product", "Framework de Monetización y Expansión"],
        footerText: "@sebastianramos",
      },
      {
        slideNumber: 2,
        title: "Error #1: Cobro por Usuario Estático",
        content: [
          "Cobrar por usuario incentiva a los clientes a compartir cuentas para pagar menos.",
          "Identifica tu 'Métrica de Valor': ¿GB almacenados, leads procesados, mensajes enviados?",
          "El cliente debe pagar más a medida que su propio negocio crece usando tu plataforma.",
        ],
        footerText: "Value Metrics",
      },
      {
        slideNumber: 3,
        title: "El Poder del Efecto Anclaje",
        content: [
          "Presenta un plan Enterprise de $1,200/mes junto a tu plan Pro de $299/mes.",
          "El plan Pro se percibe de inmediato como una oportunidad de alto rendimiento.",
          "Aumenta la adopción del nivel medio en más de un 35%.",
        ],
        footerText: "Psicología de Precios",
      },
      {
        slideNumber: 4,
        isCta: true,
        title: "¿Quieres la Calculadora de Pricing SaaS?",
        subtitle: "Modela tus márgenes y expansión de cuentas",
        content: ["Comenta PRICING SAAS en esta publicación.", "Te envío el enlace de la calculadora por DM."],
        footerText: "InHubFlow SaaS Models",
      },
    ],
    likes: 1980,
    comments: 340,
    shares: 110,
    engagementRatio: "7.6%",
    mediaUrl: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=700&q=80",
    hasMedia: true,
    marketOrigin: "Europa Occidental",
    detectedLanguage: "es",
  },
  {
    id: "saas-viral-06",
    author: "Elena Morales",
    authorHeadline: "Co-Founder & CTO @ DataFlow | Construyendo Micro-SaaS B2B",
    authorAvatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=150&q=80",
    publishedDate: "Hace 6 días",
    topic: "Desarrollo & Validación SaaS",
    format: "text",
    hook: "La regla de oro para validar un Micro-SaaS B2B antes de escribir una sola línea de código:",
    fullContent: `La regla de oro para validar un Micro-SaaS B2B antes de escribir una sola línea de código:

El cementerio de startups está lleno de fundadores técnicos que pasaron 9 meses desarrollando el producto perfecto para un problema que nadie estaba dispuesto a pagar por resolver.

Nuestro proceso de validación en 3 semanas:

Semana 1: Encontrar dolores con presupuesto activo
Entramos a comunidades de LinkedIn y foros de directores comerciales. Si 10 personas se quejan de lo mismo y hoy pagan por soluciones alternativas complejas, hay demanda.

Semana 2: La landing page con pre-venta y prototipo en Figma
Construimos una página simple mostrando la propuesta de valor, los pantallazos del producto y un botón de pre-reserva con 50% de descuento vitalicio.

Semana 3: La prueba de fuego del dinero real
Si al menos 5 empresas no están dispuestas a poner su tarjeta de crédito antes del lanzamiento, el problema no es lo suficientemente doloroso. Matamos la idea y pasamos a la siguiente.

Código sin validación previa es vanidad.
Facturación anticipada es validación real de mercado.

¿Estás construyendo un producto actualmente? Cuéntame tu tesis en los comentarios.`,
    likes: 2750,
    comments: 490,
    shares: 155,
    engagementRatio: "8.3%",
    marketOrigin: "LATAM / Hispanoamérica",
    detectedLanguage: "es",
  },
  {
    id: "saas-viral-07",
    author: "Rodrigo Mendonça",
    authorHeadline: "SaaS Growth Advisor & Angel Investor | Ex-VTEX",
    authorAvatar: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=150&q=80",
    publishedDate: "Hace 4 días",
    topic: "Métricas Clave: CAC, LTV y Payback",
    format: "carousel",
    hook: "El Dashboard Financiero que todo Founder de SaaS B2B debe revisar cada lunes a las 9 AM:",
    fullContent: `El Dashboard Financiero que todo Founder de SaaS B2B debe revisar cada lunes a las 9 AM:

Si solo miras la facturación total a final de mes, estás manejando tu empresa mirando por el espejo retrovisor.

Las 5 métricas adelantadas (leading indicators) que predicen la salud de tu software:
1. CAC Payback Period: Meses que tardas en recuperar lo invertido en conseguir un cliente (meta: < 12 meses).
2. Ratio LTV / CAC: El retorno de vida del cliente (meta: > 3x en SaaS B2B).
3. Quick Ratio de Crecimiento: (Nuevo MRR + Expansión MRR) / (Churn MRR + Contracción MRR). Si es menor a 2, tu crecimiento es frágil.
4. Tasa de activación PQL (Product Qualified Leads).
5. Burn Multiple: Capital consumido por cada dólar de ARR generado.

En el carrusel desgloso cada fórmula con benchmarks reales de la industria SaaS para 2026.

Comenta "METRICAS" y te paso la plantilla en Google Sheets lista para conectar.`,
    carouselSlides: [
      {
        slideNumber: 1,
        isCover: true,
        title: "Las 5 Métricas Financieras Vitales en SaaS",
        subtitle: "Guía de Benchmarks y Supervivencia para 2026",
        content: ["Por Rodrigo Mendonça | SaaS Investor", "Cómo evaluar la salud real de tu negocio de software"],
        footerText: "@rodrigomendonca",
      },
      {
        slideNumber: 2,
        title: "1. CAC Payback Period",
        content: [
          "Fórmula: CAC / (MRR promedio x Margen Bruto).",
          "Excelente: Menor a 8 meses.",
          "Aceptable: 8 a 14 meses.",
          "Alarma roja: Mayor a 18 meses (quema de caja insostenible).",
        ],
        footerText: "Recuperación de Inversión",
      },
      {
        slideNumber: 3,
        title: "2. Ratio LTV / CAC",
        content: [
          "Mide cuántas veces se multiplica el coste de adquisición durante la vida del cliente.",
          "Objetivo saludable en B2B: Mínimo 3:1.",
          "Si es menor a 2:1, el producto no retiene o el marketing es ineficiente.",
          "Si es mayor a 6:1, estás invirtiendo demasiado poco en captación.",
        ],
        footerText: "Retorno Unitario",
      },
      {
        slideNumber: 4,
        isCta: true,
        title: "¿Quieres el Dashboard en Google Sheets?",
        subtitle: "Con gráficos de cohortes y proyecciones automáticas",
        content: ["Comenta METRICAS abajo.", "Te comparto el enlace con acceso inmediato por DM."],
        footerText: "InHubFlow Analytics",
      },
    ],
    likes: 3400,
    comments: 570,
    shares: 230,
    engagementRatio: "8.9%",
    mediaUrl: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=700&q=80",
    hasMedia: true,
    marketOrigin: "Brasil / Cono Sur",
    detectedLanguage: "es",
  },
  {
    id: "saas-viral-08",
    author: "Carla Benítez",
    authorHeadline: "Head of Customer Success @ SoftFlow | Reducción de Churn B2B",
    authorAvatar: "https://images.unsplash.com/photo-1567532939604-b6b5b0db2604?auto=format&fit=crop&w=150&q=80",
    publishedDate: "Hace 1 semana",
    topic: "Customer Success & Expansión",
    format: "text",
    hook: "Customer Success en SaaS no es soporte técnico glorificado: es tu motor principal de facturación:",
    fullContent: `Customer Success en SaaS no es soporte técnico glorificado: es tu motor principal de facturación:

La mayoría de fundadores cometen el error de contratar a un Customer Success Manager (CSM) para responder tickets de soporte y resolver bugs.

Eso no es Customer Success. Eso es Help Desk.

El verdadero rol de Customer Success en un software B2B:
• Acelerar el Time-to-Value: Asegurar que el decisor vea el primer resultado tangible antes del día 7.
• Mapear organigramas internos: Detectar otros departamentos de la empresa cliente que podrían beneficiarse de la herramienta.
• Identificar cuentas maduras para Upselling: Cuando una cuenta alcanza el 80% de su cuota, CSM propone la transición al plan superior antes de que se bloqueen sus operaciones.
• Generar casos de estudio y testimonios en video que alimenten al equipo de marketing.

Cuando alineamos la compensación de Customer Success con el Net Revenue Retention (NRR) y la expansión de cuentas, nuestro ARR creció un 44% sin contratar a un solo vendedor adicional.

¿Tu equipo de CS es reactivo o es un centro de generación de ingresos? Debate abierto.`,
    likes: 1870,
    comments: 310,
    shares: 95,
    engagementRatio: "7.4%",
    marketOrigin: "LATAM / Hispanoamérica",
    detectedLanguage: "es",
  },
  {
    id: "saas-viral-09",
    author: "Alejandro Ruiz",
    authorHeadline: "Chief Revenue Officer @ DevPulse | $8M ARR | Ex-Oracle",
    authorAvatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=150&q=80",
    publishedDate: "Hace 5 días",
    topic: "Ventas B2B Outbound para SaaS",
    format: "carousel",
    hook: "La cadencia de prospección de 4 toques en LinkedIn que nos genera 60+ demos de software al mes:",
    fullContent: `La cadencia de prospección de 4 toques en LinkedIn que nos genera 60+ demos de software al mes:

Dejamos de enviar mensajes genéricos del tipo:
'Hola [Nombre], vi tu perfil y creo que tenemos grandes sinergias. ¿Hablamos 15 minutos?'
Tasa de respuesta: 1.5%.

La cadencia relacional basada en señales de intención que usamos hoy:
Toque 1 (Día 1): Visita silenciosa de perfil e interacción genuina en su última publicación sobre desafíos operativos.
Toque 2 (Día 3): Solicitud de conexión sin nota de venta (tasa de aceptación: 42%).
Toque 3 (Día 5): Mensaje de valor entregando un recurso específico (Playbook de arquitectura SaaS o informe de benchmarks de su sector).
Toque 4 (Día 8): Pregunta de contexto sobre su stack actual y propuesta de demo breve solo si el problema está presente.

Desliza para ver las plantillas de mensaje palabra por palabra.

Comenta "CADENCIA SAAS" y te paso la secuencia lista para importar en tu CRM.`,
    carouselSlides: [
      {
        slideNumber: 1,
        isCover: true,
        title: "Secuencia de Prospección Social para SaaS B2B",
        subtitle: "Cómo Agendar Demos de Calidad sin Quemar tu Marca",
        content: ["Por Alejandro Ruiz | CRO @ DevPulse", "Cadencia de 4 toques probada en cuentas Enterprise"],
        footerText: "@alejandroruiz_cro",
      },
      {
        slideNumber: 2,
        title: "El Error del Pitch Inmediato",
        content: [
          "Enviar un enlace de agendamiento en el primer mensaje genera rechazo inmediato.",
          "El decisor de tecnología recibe entre 8 y 15 propuestas similares cada semana.",
          "Diferénciate demostrando que conoces sus retos técnicos antes de pedir nada.",
        ],
        footerText: "Autoridad Previa",
      },
      {
        slideNumber: 3,
        title: "Toque de Valor con Activo Concreto",
        content: [
          "'Hola Carlos, vi que están migrando arquitectura a microservicios. Preparamos un benchmark con los 5 cuellos de botella más comunes. Te lo dejo por aquí sin ningún compromiso'.",
          "Sin links de venta. Sin fricción. Pura entrega de valor profesional.",
        ],
        footerText: "Entrega de Valor",
      },
      {
        slideNumber: 4,
        isCta: true,
        title: "¿Quieres los Mensajes Exactos?",
        subtitle: "Plantillas completas para copiar y pegar",
        content: ["Comenta CADENCIA SAAS abajo.", "Te envío el documento con las plantillas por mensaje privado."],
        footerText: "InHubFlow Outbound Suite",
      },
    ],
    likes: 2950,
    comments: 510,
    shares: 175,
    engagementRatio: "8.5%",
    mediaUrl: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=700&q=80",
    hasMedia: true,
    marketOrigin: "EE.UU. / Global",
    detectedLanguage: "es",
  },
  {
    id: "saas-viral-10",
    author: "Florencia Rossi",
    authorHeadline: "Product Marketing Manager @ SaaSMetrics | Especialista en Posicionamiento B2B",
    authorAvatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80",
    publishedDate: "Hace 2 días",
    topic: "Posicionamiento de Software",
    format: "image",
    hook: "Si tu SaaS intenta ser la 'plataforma todo-en-uno' para todo el mundo, estás condenado a competir por precio:",
    fullContent: `Si tu SaaS intenta ser la 'plataforma todo-en-uno' para todo el mundo, estás condenado a competir por precio:

Cuando un prospecto entra a tu sitio web y lee:
'La plataforma integral de gestión con IA para pequeñas, medianas y grandes empresas de cualquier sector'
Su cerebro piensa: 'Esto no fue diseñado para mí'.

El poder del posicionamiento vertical en software:
• Software genérico de CRM: Compites contra HubSpot y Salesforce con presupuestos de marketing billonarios.
• Software de CRM exclusivo para inmobiliarias con gestión de contratos de arras y portales: Te conviertes en el estándar indiscutido de esa industria.

Beneficios de la verticalización en SaaS:
1. Tu CAC cae un 60% porque tus mensajes hablan el vocabulario exacto del decisor.
2. Puedes cobrar el triple porque resuelves un flujo de trabajo especializado, no funciones genéricas.
3. El boca a boca en industrias verticales es exponencial.

Especialízate hasta que duela. Luego expande.

Adjunto el gráfico de posicionamiento vertical vs horizontal que usamos con nuestros clientes.`,
    likes: 2260,
    comments: 380,
    shares: 125,
    engagementRatio: "7.8%",
    mediaUrl: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=700&q=80",
    hasMedia: true,
    marketOrigin: "LATAM / Hispanoamérica",
    detectedLanguage: "es",
  },
  {
    id: "saas-viral-11",
    author: "Tomás Henao",
    authorHeadline: "Engineering Lead & Co-Founder @ CloudAPI | Infraestructura Escalable",
    authorAvatar: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=150&q=80",
    publishedDate: "Hace 1 semana",
    topic: "Arquitectura Técnica & Costes de Nube",
    format: "carousel",
    hook: "Cómo redujimos la factura de AWS de nuestro SaaS de $14,000/mes a $3,200/mes sin degradar el rendimiento:",
    fullContent: `Cómo redujimos la factura de AWS de nuestro SaaS de $14,000/mes a $3,200/mes sin degradar el rendimiento:

El margen bruto en un SaaS debe superar el 75-80%.
Si tus costes de infraestructura crecen más rápido que tu MRR, tienes un problema grave de arquitectura.

Las 4 optimizaciones de infraestructura que implementamos:
1. Reemplazamos instancias EC2 sobre-aprovisionadas por arquitecturas serverless y contenedores optimizados con auto-escalado.
2. Implementamos capas agresivas de caché en Redis para consultas repetitivas de base de datos.
3. Optimización de transferencias de datos y CDN: comprimimos assets multimedia y eliminamos llamadas redundantes.
4. Contratos de instancias reservadas y Savings Plans para cargas de trabajo predecibles.

Desliza para ver la arquitectura técnica antes y después, con el desglose exacto de ahorro mensual.

Comenta "AWS SAAS" y te paso el checklist técnico de auditoría de nube.`,
    carouselSlides: [
      {
        slideNumber: 1,
        isCover: true,
        title: "Checklist de Optimización de Costes de Nube para SaaS",
        subtitle: "Cómo Proteger tu Margen Bruto mientras Escalas en Usuarios",
        content: ["Por Tomás Henao | Lead Architect", "Auditoría de AWS/GCP para Startups"],
        footerText: "@tomashenao_tech",
      },
      {
        slideNumber: 2,
        title: "1. La Trampa del Sobre-Aprovisionamiento",
        content: [
          "El 40% del gasto en nube en startups tempranas corresponde a recursos ociosos.",
          "Monitorea el uso real de CPU y memoria en horas valle.",
          "Configura reglas de auto-escalado que reduzcan capacidad automáticamente de noche.",
        ],
        footerText: "Eficiencia de Recursos",
      },
      {
        slideNumber: 3,
        title: "2. Estrategia de Caché",
        content: [
          "Cada consulta evitada a la base de datos principal es dinero ahorrado y milisegundos de latencia menos.",
          "Añadir Redis frente a Postgres redujo la carga de base de datos en un 65%.",
        ],
        footerText: "Caché de Alto Rendimiento",
      },
      {
        slideNumber: 4,
        isCta: true,
        title: "¿Quieres el Checklist de Auditoría de Nube?",
        subtitle: "32 puntos clave para recortar gasto superfluo",
        content: ["Comenta AWS SAAS abajo.", "Te comparto el documento en PDF directamente."],
        footerText: "InHubFlow Engineering",
      },
    ],
    likes: 2680,
    comments: 440,
    shares: 145,
    engagementRatio: "8.2%",
    mediaUrl: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=700&q=80",
    hasMedia: true,
    marketOrigin: "Europa Occidental",
    detectedLanguage: "es",
  },
  {
    id: "saas-viral-12",
    author: "Mariana Fonseca",
    authorHeadline: "Product Manager @ DevSuite | Ex-Atlassian | UX de Conversión en Software",
    authorAvatar: "https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?auto=format&fit=crop&w=150&q=80",
    publishedDate: "Hace 4 días",
    topic: "Onboarding & Retención en Software",
    format: "image",
    hook: "El rediseño de pantalla de onboarding que aumentó un 41% la tasa de activación en nuestro software:",
    fullContent: `El rediseño de pantalla de onboarding que aumentó un 41% la tasa de activación en nuestro software:

Antes:
El usuario se registraba, entraba a la plataforma y veía una pantalla en blanco con 15 opciones de menú.
El 58% abandonaba la sesión en menos de 90 segundos y nunca volvía.

El nuevo flujo interactivo de 3 pasos:
1. Pregunta de personalización de rol: '¿Eres Fundador, Líder de Ventas o Desarrollador?'
2. Plantilla pre-cargada con datos de muestra: la aplicación nunca más se muestra vacía; el usuario ve cómo luce el producto cuando ya está funcionando con éxito.
3. Barra de progreso gamificada con 3 hitos rápidos que se completan en 3 minutos.

El resultado tras 30 días de pruebas A/B:
• Tiempo hasta el 'Aha Moment': Reducido de 14 minutos a 3.5 minutos.
• Activación de cuentas: Pasó del 32% al 73%.
• Conversión a planes de pago al finalizar el periodo de prueba: Creció un 41%.

El onboarding no es un tutorial. Es la primera impresión que define si el cliente renovará su suscripción el próximo año.

Adjunto el wireframe del flujo para que puedan aplicarlo a sus propios productos.`,
    likes: 3190,
    comments: 540,
    shares: 185,
    engagementRatio: "8.6%",
    mediaUrl: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=700&q=80",
    hasMedia: true,
    marketOrigin: "EE.UU. / Global",
    detectedLanguage: "es",
  },
];

// Función para generar dinámicamente publicaciones hiper-personalizadas para cualquier nicho arbitrario
function generateDynamicNicheTemplates(nicheKeyword: string, targetMarket: string): ViralPostTemplate[] {
  const cleanKeyword = nicheKeyword.trim();
  const lower = cleanKeyword.toLowerCase();

  // Generación estructurada de 12 publicaciones adaptadas al nicho
  const formats: PostFormat[] = ["carousel", "text", "image", "carousel", "text", "video", "carousel", "text", "image", "carousel", "text", "image"];
  const authors = [
    { name: "Alejandro Morales", role: `Especialista en Crecimiento & Estrategia en ${cleanKeyword}` },
    { name: "Sofía Valenzuela", role: `Directora de Operaciones & Consultora de ${cleanKeyword}` },
    { name: "Carlos Arismendi", role: `Founder & Consultor Estratégico en ${cleanKeyword}` },
    { name: "Mariana Costa", role: `Head of Business Development en ${cleanKeyword}` },
    { name: "David Krause", role: `Asesor de Negocios & Rentabilidad en ${cleanKeyword}` },
    { name: "Elena Salgado", role: `VP de Estrategia Comercial | Sector ${cleanKeyword}` },
    { name: "Roberto Orse", role: `Arquitecto de Adquisición B2B & Social Selling` },
    { name: "Patricia Ramos", role: `Copywriter Especializada en el Mercado de ${cleanKeyword}` },
    { name: "Lucas Silva", role: `Líder de Adquisición & Crecimiento en ${cleanKeyword}` },
    { name: "Camila Peixoto", role: `Especialista en Innovación y Tendencias de ${cleanKeyword}` },
    { name: "Daniel Gómez", role: `Consultor de Transformación Digital en ${cleanKeyword}` },
    { name: "Laura Benítez", role: `Directora de Proyectos y Rentabilidad en ${cleanKeyword}` },
  ];

  return formats.map((format, idx) => {
    const author = authors[idx % authors.length];
    const likes = 1200 + (idx * 165) + ((idx % 3) * 220);
    const comments = 180 + (idx * 35) + ((idx % 4) * 45);
    const shares = 45 + (idx * 15);
    const { viralityScore, viralityTier, viralityBadge, engagementRatio } = calculateVirality(likes, comments, shares);

    const hook = `El mayor error que cometen las empresas en el sector de ${cleanKeyword} (y cómo solucionarlo en 2026):`;
    const fullContent = `${hook}

Durante los últimos 12 meses analizamos más de 40 empresas del ecosistema de ${cleanKeyword}.
La mayoría se enfoca únicamente en el volumen de actividad en lugar de optimizar la conversión y la retención.

Los 3 pilares que diferencian a los líderes en ${cleanKeyword}:
1. Posicionamiento claro: Resolver un dolor crítico con métricas verificables en lugar de ofrecer servicios genéricos.
2. Automatización relacional: Mantener contacto constante con decisores sin saturar con mensajes impersonales.
3. Entrega de valor previo: Publicar frameworks, comparativas y playbooks que demuestran autoridad antes de la reunión comercial.

Aplicando este sistema, la tasa de respuesta en el sector de ${cleanKeyword} se multiplica por 3x.

Desliza para ver la guía completa con el paso a paso.

Comenta "${cleanKeyword.toUpperCase().slice(0, 8)}" abajo y te comparto el recurso completo en PDF por privado.`;

    const carouselSlides: CarouselSlide[] = [
      {
        slideNumber: 1,
        isCover: true,
        title: `Estrategia y Crecimiento en ${cleanKeyword}`,
        subtitle: "Framework Operativo para Escalar en 2026",
        content: [`Por ${author.name}`, author.role],
        footerText: `@${author.name.toLowerCase().replace(/[^a-z]/g, "")}`,
      },
      {
        slideNumber: 2,
        title: `El Diagnóstico en ${cleanKeyword}`,
        content: [
          `El 70% de las empresas en ${cleanKeyword} compiten únicamente por precio.`,
          "La falta de diferenciación clara destruye los márgenes comerciales.",
          "La clave está en especializarse en el problema más costoso para el cliente.",
        ],
        footerText: "Paso 1: Diagnóstico",
      },
      {
        slideNumber: 3,
        title: "La Solución Metódica",
        content: [
          "Mapea los 3 dolores críticos que le quitan el sueño al decisor.",
          "Crea un activo de alto valor que resuelva el primer paso del problema.",
          "Convierte conversaciones informales en oportunidades de negocio estructuradas.",
        ],
        footerText: "Paso 2: Implementación",
      },
      {
        slideNumber: 4,
        isCta: true,
        title: "¿Quieres la Guía Completa?",
        subtitle: `Optimizado para el mercado de ${cleanKeyword}`,
        content: [
          `Comenta ${cleanKeyword.toUpperCase().slice(0, 8)} en esta publicación.`,
          "Te envío el documento completo por mensaje privado hoy mismo.",
        ],
        footerText: "InHubFlow Market Engine",
      },
    ];

    return {
      id: `niche-${idx + 1}-${lower.replace(/[^a-z0-9]/g, "-")}`,
      author: author.name,
      authorHeadline: author.role,
      authorAvatar: `https://images.unsplash.com/photo-${1500000000000 + idx * 10000}?auto=format&fit=crop&w=150&q=80`,
      publishedDate: `Hace ${idx + 1} días`,
      topic: `${cleanKeyword} - Tendencias & Estrategia`,
      format,
      hook,
      fullContent,
      carouselSlides: format === "carousel" ? carouselSlides : undefined,
      likes,
      comments,
      shares,
      viralityScore,
      viralityBadge,
      viralityTier,
      engagementRatio,
      mediaUrl: format !== "text" ? "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=700&q=80" : undefined,
      hasMedia: format !== "text",
      marketOrigin: "LATAM / Hispanoamérica",
      detectedLanguage: "es",
      isLive: false,
    };
  });
}

/**
 * Obtiene publicaciones virales hiper-relevantes para el término buscado.
 * Si el término coincide con "saas" o "software", devuelve el catálogo experto de SaaS.
 * Si es otro nicho, genera y adapta dinámicamente las 12 publicaciones más virales para esa temática exacta.
 */
export function getNicheViralPosts(keywords: string, targetMarket: string): ViralPostTemplate[] {
  const kw = keywords.trim().toLowerCase();

  // Detección del nicho SaaS / Software / Cloud
  if (
    kw.includes("saas") ||
    kw.includes("software") ||
    kw.includes("mrr") ||
    kw.includes("arr") ||
    kw.includes("churn") ||
    kw.includes("product led") ||
    kw.includes("plg") ||
    kw.includes("b2b saas")
  ) {
    const templates = saasTemplates.map((t) => {
      const { viralityScore, viralityTier, viralityBadge, engagementRatio } = calculateVirality(
        t.likes,
        t.comments,
        t.shares
      );
      return {
        ...t,
        viralityScore,
        viralityTier,
        viralityBadge,
        engagementRatio,
      };
    });

    // Ordenar de mayor a menor score de viralidad
    return templates.sort((a, b) => (b.viralityScore ?? 0) - (a.viralityScore ?? 0));
  }

  // Generador dinámico para cualquier otro término o industria
  return generateDynamicNicheTemplates(keywords || "Social Selling", targetMarket);
}
