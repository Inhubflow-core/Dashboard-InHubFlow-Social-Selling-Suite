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

// Pool de avatares reales y profesionales de Unsplash verificados
const authorAvatars = [
  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80",
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80",
  "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=150&q=80",
  "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&q=80",
  "https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=150&q=80",
  "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=150&q=80",
  "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=150&q=80",
  "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=150&q=80",
  "https://images.unsplash.com/photo-1567532939604-b6b5b0db2604?auto=format&fit=crop&w=150&q=80",
  "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=150&q=80",
  "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=150&q=80",
  "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&w=150&q=80",
];

// Obtiene 12 imágenes temáticas de alta definición y totalmente distintas según el nicho buscado
function getNicheImagePool(keyword: string): string[] {
  const kw = keyword.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  // 1. Salud, Nutrición, Bienestar, Medicina, Fitness
  if (
    kw.includes("nutri") ||
    kw.includes("salud") ||
    kw.includes("medic") ||
    kw.includes("fit") ||
    kw.includes("aliment") ||
    kw.includes("dieta") ||
    kw.includes("funcional") ||
    kw.includes("bienestar") ||
    kw.includes("wellness") ||
    kw.includes("entrenam") ||
    kw.includes("clinic") ||
    kw.includes("psico")
  ) {
    return [
      "https://images.unsplash.com/photo-1490645935967-10de6ba17061?auto=format&fit=crop&w=800&q=80", // Plato saludable funcional
      "https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=800&q=80", // Hojas y vegetales orgánicos
      "https://images.unsplash.com/photo-1505576399279-565b52d4ac71?auto=format&fit=crop&w=800&q=80", // Batido funcional & estilo de vida
      "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=800&q=80", // Doctora con tablet en consulta clínica
      "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=800&q=80", // Bowl de superalimentos balanceados
      "https://images.unsplash.com/photo-1498837167922-ddd27525d352?auto=format&fit=crop&w=800&q=80", // Ingredientes frescos y nutrición
      "https://images.unsplash.com/photo-1532938911079-1b06ac7ceec7?auto=format&fit=crop&w=800&q=80", // Consulta médica profesional
      "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?auto=format&fit=crop&w=800&q=80", // Entrenamiento activo & bienestar
      "https://images.unsplash.com/photo-1505751172876-fa1923c5c528?auto=format&fit=crop&w=800&q=80", // Investigación clínica en salud
      "https://images.unsplash.com/photo-1494390248081-4e521a5940db?auto=format&fit=crop&w=800&q=80", // Desayuno nutritivo matutino
      "https://images.unsplash.com/photo-1535914254981-b5012eebbd15?auto=format&fit=crop&w=800&q=80", // Bienestar físico y movilidad
      "https://images.unsplash.com/photo-1556910103-1c02745aae4d?auto=format&fit=crop&w=800&q=80", // Preparación de alimentos saludables
    ];
  }

  // 2. Inmobiliaria, Construcción, Arquitectura, Propiedades
  if (
    kw.includes("inmob") ||
    kw.includes("raic") ||
    kw.includes("real estate") ||
    kw.includes("propied") ||
    kw.includes("arquitec") ||
    kw.includes("construc") ||
    kw.includes("viviend") ||
    kw.includes("inmuebl") ||
    kw.includes("decorac")
  ) {
    return [
      "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1582407947304-fd86f028f716?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1577495508048-b635879837f1?auto=format&fit=crop&w=800&q=80",
    ];
  }

  // 3. Finanzas, Fintech, Inversión, Cripto, Legal, Contabilidad
  if (
    kw.includes("finan") ||
    kw.includes("invers") ||
    kw.includes("crypt") ||
    kw.includes("cripto") ||
    kw.includes("banc") ||
    kw.includes("conta") ||
    kw.includes("fiscal") ||
    kw.includes("legal") ||
    kw.includes("abogad") ||
    kw.includes("patrimon") ||
    kw.includes("trad") ||
    kw.includes("bolsa")
  ) {
    return [
      "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1559526324-4b87b5e36e44?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1450133064473-71024230f91b?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1565372195458-9de0b320ef04?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1553729459-efe14ef6055d?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1591696205602-2f950c417cb9?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1642543492481-44e81e3914a7?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=800&q=80",
    ];
  }

  // 4. Marketing, Ventas, Social Selling, E-commerce, Growth, Leads
  if (
    kw.includes("market") ||
    kw.includes("vent") ||
    kw.includes("social selling") ||
    kw.includes("growth") ||
    kw.includes("ecom") ||
    kw.includes("public") ||
    kw.includes("outreach") ||
    kw.includes("lead") ||
    kw.includes("copy") ||
    kw.includes("funnel")
  ) {
    return [
      "https://images.unsplash.com/photo-1432888622747-4eb9a8efeb07?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1556761175-5973dc0f32e7?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1557838923-2985c318be48?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1533750349088-cd871a92f312?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1542744173-8e7e53415bb0?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=800&q=80",
    ];
  }

  // 5. Tech, Software, IA, Datos, Ciberseguridad
  if (
    kw.includes("tech") ||
    kw.includes("soft") ||
    kw.includes("ia") ||
    kw.includes("ai") ||
    kw.includes("inteligencia") ||
    kw.includes("cloud") ||
    kw.includes("app") ||
    kw.includes("dev") ||
    kw.includes("prog") ||
    kw.includes("data") ||
    kw.includes("cyber")
  ) {
    return [
      "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1531403009284-440f080d1e12?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1504639725590-34d0984388bd?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=800&q=80",
    ];
  }

  // 6. Negocios generales, Gestión, Liderazgo, RRHH, Consultoría
  return [
    "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1521737711867-e3b97375f902?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1556761175-5973dc0f32e7?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1542744095-fcf48d80b0fd?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1515187029135-18ee286d815b?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1531545514256-b1400bc00f31?auto=format&fit=crop&w=800&q=80",
  ];
}

// Función para generar dinámicamente 12 publicaciones virales especializadas con ángulos y ganchos únicos
function generateDynamicNicheTemplates(nicheKeyword: string, targetMarket: string): ViralPostTemplate[] {
  const cleanKeyword = nicheKeyword.trim();
  const lower = cleanKeyword.toLowerCase();
  const imagePool = getNicheImagePool(cleanKeyword);

  const authors = [
    { name: "Laura Benítez", role: `Directora de Estrategia & Crecimiento en ${cleanKeyword}` },
    { name: "Daniel Gómez", role: `Consultor Senior y Mentor en ${cleanKeyword}` },
    { name: "Camila Peixoto", role: `Especialista en Innovación y Tendencias de ${cleanKeyword}` },
    { name: "Alejandro Morales", role: `Founder & Consultor Estratégico en ${cleanKeyword}` },
    { name: "Sofía Valenzuela", role: `Head de Desarrollo e Innovación en ${cleanKeyword}` },
    { name: "Carlos Arismendi", role: `Asesor de Operaciones & Práctica en ${cleanKeyword}` },
    { name: "Mariana Costa", role: `VP de Expansión & Nuevos Modelos en ${cleanKeyword}` },
    { name: "David Krause", role: `Consultor de Negocios y Retención en ${cleanKeyword}` },
    { name: "Elena Salgado", role: `Especialista en Optimización y Procesos en ${cleanKeyword}` },
    { name: "Patricia Ramos", role: `Líder de Adquisición y Autoridad en ${cleanKeyword}` },
    { name: "Lucas Silva", role: `Arquitecto de Estrategia y Fidelización en ${cleanKeyword}` },
    { name: "Andrés Vignolo", role: `Director General & Asesor Ejecutivo en ${cleanKeyword}` },
  ];

  // 12 estructuras y ángulos de viralidad probados, garantizando variedad absoluta en el radar
  const templatesData: Array<{
    format: PostFormat;
    hook: string;
    fullContent: string;
    slides?: CarouselSlide[];
    likes: number;
    comments: number;
    shares: number;
  }> = [
    // 0. Carrusel: Playbook paso a paso
    {
      format: "carousel",
      hook: `El Playbook Operativo de 5 Pasos para liderar en ${cleanKeyword} en 2026 (sin competir por precio):`,
      fullContent: `El Playbook Operativo de 5 Pasos para liderar en ${cleanKeyword} en 2026 (sin competir por precio):

El 90% de los proyectos en el sector de ${cleanKeyword} cometen el error de ofrecer soluciones genéricas a clientes que buscan resultados específicos.

Durante los últimos 6 meses implementamos este framework de 5 fases en más de 25 cuentas:
1. Diagnóstico del cuello de botella: Identificar la causa raíz en lugar del síntoma visible.
2. Oferta de alto impacto: Empaquetar el proceso con entregables claros y medibles.
3. Activo de valor previo: Entregar una guía o auditoría antes de la conversación formal.
4. Secuencia de nutrición relacional: Mantener contacto constante aportando valor sin insistir en la venta.
5. Cierre colaborativo: Diseñar el plan conjunto con métricas de éxito acordadas.

El resultado promedio fue un aumento del 160% en la tasa de retención y clientes más comprometidos.

Desliza el carrusel para ver el diagrama de flujo y la plantilla de implementación paso a paso.

Comenta "${cleanKeyword.toUpperCase().slice(0, 7)} GUIA" abajo y te envío el PDF completo por mensaje privado.`,
      slides: [
        {
          slideNumber: 1,
          isCover: true,
          title: `Playbook de 5 Pasos: ${cleanKeyword}`,
          subtitle: "Cómo liderar el sector en 2026 sin competir por precio",
          content: [`Por Laura Benítez`, `Estrategia y Rentabilidad en ${cleanKeyword}`],
          footerText: "@laurabenitez_estrategia",
        },
        {
          slideNumber: 2,
          title: "1. Diagnóstico del Cuello de Botella",
          content: [
            "La mayoría atiende únicamente los síntomas visibles en lugar del origen.",
            "Mapea el punto exacto donde el cliente se frustra o abandona el proceso.",
            "Una solución precisa y medible justifica tarifas premium.",
          ],
          footerText: "Paso 1: Diagnóstico",
        },
        {
          slideNumber: 3,
          title: "2. La Oferta de Alto Impacto",
          content: [
            "Deja de vender horas o entregables genéricos de catálogo.",
            "Vende la transformación concreta con plazos e hitos verificables.",
            "El cliente busca certidumbre operativa, no horas de trabajo.",
          ],
          footerText: "Paso 2: Empaquetado",
        },
        {
          slideNumber: 4,
          title: "3. Nutrición y Relación Continua",
          content: [
            "Entrega valor real antes de pedir la confianza comercial.",
            "Casos prácticos y comparativas generan una autoridad natural.",
            "La decisión de compra ocurre antes de la llamada de cierre.",
          ],
          footerText: "Paso 3: Conversión",
        },
        {
          slideNumber: 5,
          isCta: true,
          title: "¿Quieres el Playbook Completo?",
          subtitle: `Optimizado para el mercado de ${cleanKeyword}`,
          content: [
            `Comenta ${cleanKeyword.toUpperCase().slice(0, 7)} GUIA en este post.`,
            "Te envío el documento completo con todos los flujos en PDF.",
          ],
          footerText: "InHubFlow Strategic Playbook",
        },
      ],
      likes: 3450,
      comments: 695,
      shares: 215,
    },

    // 1. Texto: El gran error de creer que necesitas más clientes
    {
      format: "text",
      hook: `El mayor error que cometen los profesionales en ${cleanKeyword} (y cómo solucionarlo hoy):`,
      fullContent: `El mayor error que cometen los profesionales en ${cleanKeyword} (y cómo solucionarlo hoy):

Creer que para crecer se necesitan decenas de clientes nuevos todos los meses.

La realidad del sector:
Adquirir un cliente nuevo cuesta entre 4x y 6x más que rentabilizar y fidelizar a tu base existente.

Si tus clientes no renuevan o no recomiendan tu trabajo activamente, tienes una fuga en tu modelo, no un problema de captación.

Las 3 palancas que cambiaron nuestros números este año en ${cleanKeyword}:
• Creamos un proceso de bienvenida (onboarding) impecable en las primeras 48 horas.
• Establecimos revisiones trimestrales de avance basadas en métricas tangibles.
• Premiamos la lealtad con acceso prioritario y activos de conocimiento exclusivos.

¿El resultado? El 45% de nuestro crecimiento este trimestre provino de renovaciones y recomendaciones espontáneas.

¿Qué porcentaje de tu facturación proviene de clientes recurrentes hoy? Los leo en comentarios.`,
      likes: 2980,
      comments: 512,
      shares: 160,
    },

    // 2. Imagen: Patrón común de 30 casos de éxito
    {
      format: "image",
      hook: `Analizamos más de 30 casos de éxito en ${cleanKeyword}. Este es el patrón común que encontramos:`,
      fullContent: `Analizamos más de 30 casos de éxito en ${cleanKeyword}. Este es el patrón común que encontramos:

Quienes lideran este mercado no tienen más presupuesto ni más seguidores en redes sociales.
Tienen un sistema de trabajo con 3 reglas innegociables:

1. Claridad absoluta en el problema que resuelven (cero ambigüedad en su propuesta).
2. Protocolos documentados que garantizan consistencia en cada entrega.
3. Retroalimentación continua de sus clientes para ajustar el servicio cada mes.

En la infografía adjunta les comparto el mapa visual del proceso que utilizamos para estructurar cada fase sin fricciones operativas.

Guarda este post si estás rediseñando tu operativa en ${cleanKeyword} este año.`,
      likes: 2685,
      comments: 420,
      shares: 195,
    },

    // 3. Carrusel: Checklist de Auto-Auditoría (7 señales)
    {
      format: "carousel",
      hook: `Checklist de Auto-Auditoría: 7 señales de que tu propuesta en ${cleanKeyword} necesita actualizarse:`,
      fullContent: `Checklist de Auto-Auditoría: 7 señales de que tu propuesta en ${cleanKeyword} necesita actualizarse:

El mercado ha cambiado más en los últimos 18 meses que en los 5 años anteriores.
Lo que funcionaba en 2023 hoy genera resistencia y desinterés en los decisores.

Prepara papel y lápiz: si marcas más de 3 de estos puntos, es momento de rediseñar tu enfoque:
1. Tus prospectos siempre te preguntan el precio antes de entender el valor real.
2. Dependes exclusivamente del boca a boca sin un canal predecible de adquisición.
3. Te cuesta explicar en una sola frase qué te diferencia de la competencia.
4. El tiempo de decisión de tus clientes supera los 45 días.
5. Inviertes horas en propuestas que terminan en "lo estamos evaluando".

Desliza el carrusel para ver las 7 señales completas y la solución recomendada para cada una.

Comenta "AUDITORIA" y te envío la hoja de cálculo de auto-diagnóstico.`,
      slides: [
        {
          slideNumber: 1,
          isCover: true,
          title: `Checklist de Auditoría: ${cleanKeyword}`,
          subtitle: "7 Señales de que tu modelo comercial necesita actualizarse en 2026",
          content: [`Por Alejandro Morales`, `Consultor de Negocios en ${cleanKeyword}`],
          footerText: "@alejandromorales_biz",
        },
        {
          slideNumber: 2,
          title: "Señales 1 y 2: Fricción en Precios",
          content: [
            "¿La primera pregunta siempre es 'cuánto cuesta'?",
            "Indica falta de claridad en el retorno de inversión percibido.",
            "Solución: Demostrar casos y ahorro tangible antes de la cotización.",
          ],
          footerText: "Diagnóstico Comercial",
        },
        {
          slideNumber: 3,
          title: "Señales 3 y 4: Falta de Predecibilidad",
          content: [
            "El boca a boca es excelente, pero no es escalable ni controlable.",
            "Ciclos de decisión excesivamente largos erosionan la rentabilidad.",
            "Solución: Contenido educativo que acelera la confianza del cliente.",
          ],
          footerText: "Adquisición Activa",
        },
        {
          slideNumber: 4,
          title: "Señales 5, 6 y 7: Propuestas Diluidas",
          content: [
            "Enviar propuestas sin validación mutua tiene una conversión < 15%.",
            "El cliente posterga porque la urgencia del dolor no quedó demostrada.",
            "Solución: Acuerdo previo de criterios de éxito antes de enviar propuesta.",
          ],
          footerText: "Cierre Efectivo",
        },
        {
          slideNumber: 5,
          isCta: true,
          title: "¿Quieres la Plantilla de Diagnóstico?",
          subtitle: `Matriz interactiva para el sector de ${cleanKeyword}`,
          content: [
            "Comenta AUDITORIA en esta publicación.",
            "Te envío el enlace a la plantilla de Notion/Excel por mensaje privado.",
          ],
          footerText: "InHubFlow Audit System",
        },
      ],
      likes: 3120,
      comments: 580,
      shares: 175,
    },

    // 4. Texto: Opinión impopular / Desmitificación
    {
      format: "text",
      hook: `Opinión impopular sobre ${cleanKeyword} que incomodará a los métodos tradicionales:`,
      fullContent: `Opinión impopular sobre ${cleanKeyword} que incomodará a los métodos tradicionales:

El contenido "motivacional" y los consejos genéricos ya no generan oportunidades reales de negocio en LinkedIn.

Hoy, decisores y clientes exigentes buscan profundidad técnica, datos contrastados y metodología comprobada.

Si tu comunicación en ${cleanKeyword} se basa en:
• Frases hechas de liderazgo sin aplicación concreta
• Resúmenes superficiales de noticias
• Consejos que cualquiera encuentra en 5 segundos en Google

Estás atrayendo curiosos, no clientes con presupuesto para invertir en soluciones serias.

La fórmula que multiplica el engagement calificado:
1. Cuenta un problema real y costoso que resolviste esta semana.
2. Explica qué salió mal en el primer intento y qué aprendiste del error.
3. Muestra el número o resultado cuantitativo final obtenido.

Menos teoría, más operativa real.

¿Estás de acuerdo o crees que el contenido inspiracional aún tiene peso? Te leo en comentarios.`,
      likes: 2490,
      comments: 630,
      shares: 140,
    },

    // 5. Imagen: Caso de estudio de saturación a crecimiento
    {
      format: "image",
      hook: `Caso de Estudio: De la saturación operativa a un crecimiento del 140% en ${cleanKeyword}:`,
      fullContent: `Caso de Estudio: De la saturación operativa a un crecimiento del 140% en ${cleanKeyword}:

Cuando comenzamos a trabajar con este proyecto, el equipo estaba completamente sobrepasado:
• Atendían a 6 perfiles de clientes distintos con requerimientos dispares.
• El margen neto de rentabilidad no superaba el 12%.
• La retención de clientes a 90 días era apenas del 38%.

La decisión difícil pero indispensable:
Dijeron "NO" al 60% de los servicios secundarios para concentrar todos sus recursos en su oferta más transformadora.

Los números 6 meses después:
• Margen neto creció al 34%.
• Tasa de satisfacción (NPS) subió a 82 puntos.
• Clientes que renuevan automáticamente: 76%.

A veces el verdadero crecimiento no consiste en sumar más iniciativas, sino en eliminar con coraje todo lo que diluye tu enfoque principal.

En el gráfico adjunto pueden ver la evolución mes a mes de los unit economics.`,
      likes: 2890,
      comments: 440,
      shares: 180,
    },

    // 6. Carrusel: Método de 3 Fases para cerrar clientes
    {
      format: "carousel",
      hook: `El Método de 3 Fases para posicionarte como referente en ${cleanKeyword} en LinkedIn:`,
      fullContent: `El Método de 3 Fases para posicionarte como referente en ${cleanKeyword} en LinkedIn:

La mayoría de profesionales publican con frecuencia pero sin una arquitectura de conversión detrás.
Tienen visualizaciones, pero sus mensajes directos están vacíos.

Este es el sistema estructurado que aplicamos para generar conversaciones de alto valor de manera orgánica:

Fase 1: Atracción por Autoridad
Contenido enfocado en desarmar objeciones y compartir aprendizajes prácticos del día a día en ${cleanKeyword}.

Fase 2: Nutrición con Activos de Intención
Publicaciones con recursos descargables (plantillas, frameworks) que identifican a prospectos altamente calificados.

Fase 3: Conversión Relacional
Iniciar conversaciones genuinas con las personas que solicitaron el recurso, diagnosticando si podemos ayudarlas en su caso concreto.

Desliza el carrusel para ver las plantillas de mensajes y los disparadores de conversación.

Comenta "SISTEMA" y te lo comparto por mensaje privado.`,
      slides: [
        {
          slideNumber: 1,
          isCover: true,
          title: `El Método de 3 Fases: ${cleanKeyword}`,
          subtitle: "Cómo transformar visibilidad en LinkedIn en clientes calificados",
          content: [`Por Mariana Costa`, `Especialista en Conversión B2B`],
          footerText: "@marianacosta_growth",
        },
        {
          slideNumber: 2,
          title: "Fase 1: Atracción por Autoridad",
          content: [
            `Comparte aprendizajes reales de proyectos en ${cleanKeyword}.`,
            "Evita generalidades; aporta datos, porcentajes y metodologías.",
            "Genera confianza sólida antes de cualquier acercamiento comercial.",
          ],
          footerText: "Fase 1: Autoridad",
        },
        {
          slideNumber: 3,
          title: "Fase 2: Activos de Intención",
          content: [
            "Diseña guías, checklists o calculadoras de resolución inmediata.",
            "Utiliza llamadas a la acción con palabras clave activadoras.",
            "Filtra de forma natural a quienes tienen una necesidad prioritaria.",
          ],
          footerText: "Fase 2: Intención",
        },
        {
          slideNumber: 4,
          title: "Fase 3: Conversión Relacional",
          content: [
            "Inicia la conversación privada entregando el recurso sin vender.",
            "Formula preguntas de diagnóstico sobre su situación actual.",
            "Agenda sesiones de trabajo solo con cuentas con encaje mutuo.",
          ],
          footerText: "Fase 3: Relación",
        },
        {
          slideNumber: 5,
          isCta: true,
          title: "¿Quieres los Disparadores de Conversación?",
          subtitle: `Guiones probados para ${cleanKeyword}`,
          content: [
            "Comenta SISTEMA en esta publicación.",
            "Te envío los guiones y ejemplos reales por mensaje privado.",
          ],
          footerText: "InHubFlow Conversion Engine",
        },
      ],
      likes: 3310,
      comments: 615,
      shares: 190,
    },

    // 7. Texto: 3 preguntas de revisión semanal
    {
      format: "text",
      hook: `3 Preguntas que deberías hacerte cada viernes si trabajas en ${cleanKeyword}:`,
      fullContent: `3 Preguntas que deberías hacerte cada viernes si trabajas en ${cleanKeyword}:

En la prisa diaria es fácil confundir estar permanentemente ocupado con estar avanzando hacia metas estratégicas.

Cada semana hago este ejercicio de 10 minutos con mi equipo:

1. ¿Resolvimos el problema más valioso de nuestros clientes esta semana o solo apagamos incendios?
Si el 80% del tiempo se consume en urgencias operativas, el negocio carece de margen para innovar.

2. ¿Qué fricción recurrente podríamos haber eliminado con un proceso claro?
Cada error repetido más de 2 veces es una oportunidad de oro para documentar un procedimiento estándar (SOP).

3. ¿Qué conversación de esta semana nos dejó el aprendizaje más revelador?
Las mejores ideas de producto y posicionamiento siempre provienen de las palabras exactas que usa el cliente cuando describe su dolor.

Un hábito sencillo que ahorra meses de desvío estratégico.

¿Haces alguna revisión semanal similar? ¿Cuál es tu pregunta obligatoria?`,
      likes: 2150,
      comments: 380,
      shares: 110,
    },

    // 8. Imagen: Matriz comparativa entre método obsoleto y moderno
    {
      format: "image",
      hook: `La tabla comparativa que todo líder en ${cleanKeyword} debería tener presente este año:`,
      fullContent: `La tabla comparativa que todo líder en ${cleanKeyword} debería tener presente este año:

Enfrentarse a los desafíos del sector con herramientas y metodologías de hace 3 años es la receta perfecta para el estancamiento.

En el cuadro que comparto a continuación sintetizamos:
• El modelo tradicional: Reactivo, dependiente de esfuerzo manual repetitivo, con clientes que rotan con alta frecuencia.
• El modelo moderno: Proactivo, apalancado en datos e inteligencia relacional, con relaciones de largo plazo y alto valor acumulado.

La transición no ocurre de un día para otro, pero quienes comenzaron este cambio hoy tienen costes de captación 3 veces menores.

Miren la gráfica adjunta y cuéntenme: ¿en qué columna se encuentra su operativa hoy en día?`,
      likes: 2740,
      comments: 465,
      shares: 165,
    },

    // 9. Carrusel: 5 Tendencias críticas del mercado
    {
      format: "carousel",
      hook: `5 Tendencias críticas que transformarán el ecosistema de ${cleanKeyword} en 2026/2027:`,
      fullContent: `5 Tendencias críticas que transformarán el ecosistema de ${cleanKeyword} en 2026/2027:

Los ciclos de adaptación son cada vez más rápidos. Quienes anticipan las curvas de cambio capturan la mayor cuota de mercado; quienes esperan, compiten por los restos.

Estas son las 5 tendencias emergentes que estamos monitoreando de cerca en ${cleanKeyword}:
1. Hiper-personalización basada en datos reales de comportamiento y contexto.
2. Integración de IA para automatizar tareas mecánicas y liberar tiempo estratégico.
3. El auge de la transparencia radical: marcas personales fuertes superan a logos corporativos fríos.
4. Modelos de recurrencia y suscripción reemplazando a la venta transaccional puntual.
5. Comunidades cerradas como principal motor de retención y referidos orgánicos.

Desliza para ver el análisis detallado de cada tendencia y qué acciones inmediatas puedes tomar este trimestre.

Comenta "TENDENCIAS" si quieres recibir el informe ejecutivo completo en PDF.`,
      slides: [
        {
          slideNumber: 1,
          isCover: true,
          title: `5 Tendencias en ${cleanKeyword}`,
          subtitle: "Hacia dónde se mueve el mercado y cómo anticiparse con éxito",
          content: [`Por Patricia Ramos`, `Investigación de Mercados`],
          footerText: "@patriciaramos_trends",
        },
        {
          slideNumber: 2,
          title: "Tendencia 1: Hiper-Personalización",
          content: [
            "Los mensajes genéricos tienen una efectividad decreciente menor al 2%.",
            "Los decisores premian la comprensión profunda de su contexto específico.",
            "El valor comercial está en el detalle relevante.",
          ],
          footerText: "Tendencia 1",
        },
        {
          slideNumber: 3,
          title: "Tendencia 2: Automatización con IA",
          content: [
            "Liberar a los equipos de tareas mecánicas de entrada de datos.",
            "La inteligencia artificial como copiloto analítico y modelador de ideas.",
            "Mayor tiempo disponible para interacciones humanas genuinas.",
          ],
          footerText: "Tendencia 2",
        },
        {
          slideNumber: 4,
          title: "Tendencia 3: Modelos de Recurrencia",
          content: [
            "Vender una única vez es insostenible con los costes de captación actuales.",
            "Estructurar acuerdos continuos donde el valor aumente mes a mes.",
            "La rentabilidad real florece a partir del cuarto mes de relación.",
          ],
          footerText: "Tendencia 3",
        },
        {
          slideNumber: 5,
          isCta: true,
          title: "¿Quieres el Informe de Tendencias?",
          subtitle: `Reporte estratégico para ${cleanKeyword}`,
          content: [
            "Comenta TENDENCIAS en esta publicación.",
            "Te envío el documento con gráficos y proyecciones por privado.",
          ],
          footerText: "InHubFlow Market Intelligence",
        },
      ],
      likes: 3580,
      comments: 720,
      shares: 240,
    },

    // 10. Texto: Cómo cerrar reuniones sin prospección fría invasiva
    {
      format: "text",
      hook: `Cómo cerrar reuniones comerciales en ${cleanKeyword} sin enviar un solo mensaje frío invasivo:`,
      fullContent: `Cómo cerrar reuniones comerciales en ${cleanKeyword} sin enviar un solo mensaje frío invasivo:

El "outreach" tradicional de enviar 500 mensajes genéricos a personas que no te conocen está roto.
La tasa de respuesta promedio cayó al 1.8% y daña la reputación de tu marca personal.

La estrategia que estamos usando con un 28% de tasa de conversión a videollamada:

Paso 1: Monitoreo de Señales de Intención
Identificamos decisores en ${cleanKeyword} que interactúan activamente con publicaciones sobre los dolores específicos que resolvemos.

Paso 2: Aporte de Valor sin Compromiso
En lugar de pedir "15 minutos para una demo", compartimos una auditoría rápida o un checklist útil directamente relacionado con el tema que comentaron.

Paso 3: Conversación Consultiva
Cuando agradecen el recurso, preguntamos con curiosidad genuina cuál es su principal prioridad este trimestre.
Si hay encaje natural, la reunión se agenda a petición del propio cliente.

Vender B2B no es cazar; es cultivar credibilidad y facilitar decisiones informadas.

¿Qué método te funciona mejor para iniciar conversaciones comerciales?`,
      likes: 2790,
      comments: 495,
      shares: 155,
    },

    // 11. Imagen: Marco de trabajo visual de 4 cuadrantes
    {
      format: "image",
      hook: `El marco de trabajo de 4 cuadrantes para simplificar la gestión en ${cleanKeyword}:`,
      fullContent: `El marco de trabajo de 4 cuadrantes para simplificar la gestión en ${cleanKeyword}:

Cuando los procesos se vuelven complejos, la ejecución se ralentiza y los errores se multiplican.

Este cuadrante visual nos ayuda a priorizar cada semana qué iniciativas merecen recursos y cuáles deben descartarse de inmediato:

• Cuadrante 1 (Alto impacto, baja complejidad): Victorias rápidas que implementamos en menos de 48 horas.
• Cuadrante 2 (Alto impacto, alta complejidad): Proyectos estratégicos del trimestre con hitos semanales.
• Cuadrante 3 (Bajo impacto, baja complejidad): Automatizar o delegar por completo.
• Cuadrante 4 (Bajo impacto, alta complejidad): Eliminar sin dudar para no agotar al equipo.

Adjunto la infografía para que puedan guardarla o utilizarla en su próxima reunión de equipo.

¿Cuántas tareas de tu semana pertenecen en realidad al cuadrante 4? Te leo en comentarios.`,
      likes: 2620,
      comments: 395,
      shares: 145,
    },
  ];

  return templatesData.map((data, idx) => {
    const author = authors[idx % authors.length];
    const { viralityScore, viralityTier, viralityBadge, engagementRatio } = calculateVirality(
      data.likes,
      data.comments,
      data.shares
    );

    const hasMedia = data.format !== "text";
    const mediaUrl = hasMedia ? imagePool[idx % imagePool.length] : undefined;

    return {
      id: `niche-${idx + 1}-${lower.replace(/[^a-z0-9]/g, "-")}`,
      author: author.name,
      authorHeadline: author.role,
      authorAvatar: authorAvatars[idx % authorAvatars.length],
      publishedDate: `Hace ${idx + 1} días`,
      topic: `${cleanKeyword} - Tendencias & Estrategia`,
      format: data.format,
      hook: data.hook,
      fullContent: data.fullContent,
      carouselSlides: data.format === "carousel" ? data.slides : undefined,
      likes: data.likes,
      comments: data.comments,
      shares: data.shares,
      viralityScore,
      viralityBadge,
      viralityTier,
      engagementRatio,
      mediaUrl,
      hasMedia,
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
