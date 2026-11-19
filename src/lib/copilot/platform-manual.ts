export type CopilotLocale = "es" | "en" | "pt-BR";

export interface CopilotActionLink {
  label: string;
  href: string;
  actionType?: "navigate" | "start_training";
}

export interface RouteCopilotContext {
  routeKey: string;
  sectionTitle: string;
  proactiveBubble: string;
  quickChips: string[];
  sectionExplanation: string;
  defaultActions: CopilotActionLink[];
}

export function normalizeCopilotLocale(raw?: string): CopilotLocale {
  if (raw === "en") return "en";
  if (raw === "pt-BR" || raw === "pt") return "pt-BR";
  return "es";
}

export function stripLocaleFromPath(pathname: string): string {
  const clean = (pathname || "/").replace(/^\/(es|en|pt-BR)(?=\/|$)/, "");
  return clean || "/";
}

export function getRouteCopilotContext(
  pathname: string,
  localeInput?: string
): RouteCopilotContext {
  const locale = normalizeCopilotLocale(localeInput);
  const cleanPath = stripLocaleFromPath(pathname);

  if (cleanPath.startsWith("/viral-posts")) {
    const map: Record<CopilotLocale, RouteCopilotContext> = {
      es: {
        routeKey: "viral-posts",
        sectionTitle: "Viral Post Engine",
        proactiveBubble:
          "Estás en Viral Post Engine. ¿Quieres que te explique cómo generar 12 posts para todo el mes o diseñar un carrusel PDF?",
        quickChips: [
          "¿Cómo funciona esta sección?",
          "¿Cómo genero 12 posts para 1 mes?",
          "¿Cómo creo imágenes y carruseles PDF?",
          "Entrenar a Inhub con mi empresa",
        ],
        sectionExplanation:
          "En **Viral Post Engine** construyes tu autoridad en LinkedIn en minutos:\n\n1. **Buscador Viral (Radar):** escribe tu temática y encuentra publicaciones con alta tracción real.\n2. **Modelado con IA (12 posts/mes):** selecciona un post o pega cualquier enlace para que yo lo reescriba con la voz de tu empresa y programe tu calendario Lunes, Miércoles y Viernes.\n3. **Editor Visual Integrado:** diseña imágenes y carruseles PDF diapositiva por diapositiva sin salir de InhubFlow.",
        defaultActions: [
          { label: "Abrir Radar Viral →", href: "/viral-posts/radar" },
          { label: "Crear Post / Carrusel →", href: "/viral-posts/create" },
          { label: "Ver Calendario →", href: "/viral-posts/calendar" },
        ],
      },
      en: {
        routeKey: "viral-posts",
        sectionTitle: "Viral Post Engine",
        proactiveBubble:
          "You're in Viral Post Engine. Want me to explain how to generate 12 monthly posts or design a PDF carousel?",
        quickChips: [
          "How does this section work?",
          "How do I generate 12 posts for 1 month?",
          "How do I build images & PDF carousels?",
          "Train Inhub on my company",
        ],
        sectionExplanation:
          "In **Viral Post Engine** you build LinkedIn authority in minutes:\n\n1. **Viral Finder (Radar):** enter your niche to discover top-performing LinkedIn posts.\n2. **AI Modeling (12 posts/month):** pick any viral post or paste a link so I can rewrite it in your brand voice and schedule your Mon/Wed/Fri calendar.\n3. **Built-in Visual Editor:** design images and multi-slide PDF carousels right inside InhubFlow.",
        defaultActions: [
          { label: "Open Viral Radar →", href: "/viral-posts/radar" },
          { label: "Create Post / Carousel →", href: "/viral-posts/create" },
          { label: "View Calendar →", href: "/viral-posts/calendar" },
        ],
      },
      "pt-BR": {
        routeKey: "viral-posts",
        sectionTitle: "Viral Post Engine",
        proactiveBubble:
          "Você está no Viral Post Engine. Quer que eu explique como gerar 12 posts para o mês ou criar um carrossel PDF?",
        quickChips: [
          "Como funciona esta seção?",
          "Como gero 12 posts para 1 mês?",
          "Como crio imagens e carrosséis PDF?",
          "Treinar o Inhub com minha empresa",
        ],
        sectionExplanation:
          "No **Viral Post Engine** você constrói autoridade no LinkedIn em minutos:\n\n1. **Buscador Viral (Radar):** digite seu tema e encontre publicações com alto engajamento.\n2. **Modelagem com IA (12 posts/mês):** escolha um post ou cole um link para eu reescrever com a voz da sua empresa e agendar Seg, Qua e Sex.\n3. **Editor Visual Integrado:** crie imagens e carrosséis PDF slide por slide sem sair da plataforma.",
        defaultActions: [
          { label: "Abrir Radar Viral →", href: "/viral-posts/radar" },
          { label: "Criar Post / Carrossel →", href: "/viral-posts/create" },
          { label: "Ver Calendário →", href: "/viral-posts/calendar" },
        ],
      },
    };
    return map[locale];
  }

  if (cleanPath.startsWith("/signals")) {
    const map: Record<CopilotLocale, RouteCopilotContext> = {
      es: {
        routeKey: "signals",
        sectionTitle: "Signal Radar",
        proactiveBubble:
          "Estás en Signal Radar. ¿Quieres que te explique cómo detectar prospectos en tus posts, en la competencia o en todo LinkedIn?",
        quickChips: [
          "¿Cómo funciona esta sección?",
          "Diferencia entre Nivel 1, 2 y 3",
          "¿Cómo monitoreo a mi competencia?",
          "¿Cómo envío señales a una campaña?",
        ],
        sectionExplanation:
          "**Signal Radar** vigila LinkedIn en 3 niveles para capturar compradores con intención real:\n\n1. **Nivel 1 (Tu propio contenido):** detecta quién comenta o reacciona en tus publicaciones y Lead Magnets.\n2. **Nivel 2 (Audiencia de competidores):** pega o monitorea posts de tu competencia directa para captar a quienes ya buscan solución.\n3. **Nivel 3 (Todo LinkedIn):** rastrea palabras clave en toda la red y alimenta tus listas en tiempo real descartando empleados de la competencia.",
        defaultActions: [
          { label: "Ver Listas de Leads →", href: "/leads" },
          { label: "Crear Campaña con Señales →", href: "/campaigns" },
        ],
      },
      en: {
        routeKey: "signals",
        sectionTitle: "Signal Radar",
        proactiveBubble:
          "You're in Signal Radar. Want me to explain how to capture buyers from your posts, competitors, or across LinkedIn?",
        quickChips: [
          "How does this section work?",
          "Difference between Level 1, 2 & 3",
          "How do I monitor competitors?",
          "How do I send signals to a campaign?",
        ],
        sectionExplanation:
          "**Signal Radar** monitors LinkedIn across 3 intent levels:\n\n1. **Level 1 (Your own content):** captures prospects commenting or reacting to your posts and Lead Magnets.\n2. **Level 2 (Competitor audience):** tracks your direct competitors' posts to attract buyers looking for a solution.\n3. **Level 3 (All of LinkedIn):** monitors keywords across the network and grows your prospect lists in real time.",
        defaultActions: [
          { label: "View Lead Lists →", href: "/leads" },
          { label: "Create Signal Campaign →", href: "/campaigns" },
        ],
      },
      "pt-BR": {
        routeKey: "signals",
        sectionTitle: "Signal Radar",
        proactiveBubble:
          "Você está no Signal Radar. Quer que eu explique como detectar prospects nos seus posts, nos concorrentes ou em todo o LinkedIn?",
        quickChips: [
          "Como funciona esta seção?",
          "Diferença entre Nível 1, 2 e 3",
          "Como monitoro meus concorrentes?",
          "Como envio sinais para uma campanha?",
        ],
        sectionExplanation:
          "O **Signal Radar** monitora o LinkedIn em 3 níveis de intenção:\n\n1. **Nível 1 (Seu próprio conteúdo):** captura quem comenta ou reage nos seus posts e Lead Magnets.\n2. **Nível 2 (Audiência de concorrentes):** monitora posts de concorrentes diretos para atrair quem já busca solução.\n3. **Nível 3 (Todo o LinkedIn):** rastreia palavras-chave na rede e abastece suas listas em tempo real.",
        defaultActions: [
          { label: "Ver Listas de Leads →", href: "/leads" },
          { label: "Criar Campanha com Sinais →", href: "/campaigns" },
        ],
      },
    };
    return map[locale];
  }

  if (cleanPath.startsWith("/campaigns")) {
    const map: Record<CopilotLocale, RouteCopilotContext> = {
      es: {
        routeKey: "campaigns",
        sectionTitle: "Campañas de Prospección",
        proactiveBubble:
          "Estás en Campañas. ¿Te explico cómo armar tu secuencia segura (visita, like, comentario, conexión y DM)?",
        quickChips: [
          "¿Cómo funciona esta sección?",
          "¿Qué pasos incluye una secuencia ideal?",
          "¿Cuál es el límite diario seguro?",
          "¿Qué pasa cuando un prospecto responde?",
        ],
        sectionExplanation:
          "En **Campañas** automatizas tu acercamiento en LinkedIn con ritmo 100% humano:\n\n1. **Calentamiento previo:** Visitar perfil → Dar Like y comentar su último post → Seguir y enviar solicitud de conexión.\n2. **Conversación:** Mensaje DM *Icebreaker* contextualizado con la señal detectada + Follow-ups con esperas de 1 a 3 días.\n3. **Seguridad y Stop on Reply:** opera de lunes a viernes respetando el límite seguro (hasta 20 interacciones/día por cuenta). Apenas el prospecto responde, la secuencia se detiene y yo (Inhub SDR IA) tomo la conversación.",
        defaultActions: [
          { label: "Configurar mi Cerebro SDR →", href: "/sdr" },
          { label: "Ver Inbox Unificado →", href: "/inbox" },
        ],
      },
      en: {
        routeKey: "campaigns",
        sectionTitle: "Outreach Campaigns",
        proactiveBubble:
          "You're in Campaigns. Want me to explain how to build a safe sequence (visit, like, comment, connect & DM)?",
        quickChips: [
          "How does this section work?",
          "What steps make an ideal sequence?",
          "What is the safe daily limit?",
          "What happens when a prospect replies?",
        ],
        sectionExplanation:
          "In **Campaigns** you automate LinkedIn outreach with humanized pacing:\n\n1. **Warm-up touches:** Visit profile → Like & comment on their latest post → Follow & request connection.\n2. **Messaging:** Contextual *Icebreaker* DM based on their intent signal + smart follow-ups.\n3. **Safety & Stop on Reply:** runs Mon–Fri within the safe cap (up to 20 interactions/day per account). As soon as a prospect replies, the sequence stops and I (Inhub AI SDR) take over.",
        defaultActions: [
          { label: "Configure AI SDR Brain →", href: "/sdr" },
          { label: "Open Unified Inbox →", href: "/inbox" },
        ],
      },
      "pt-BR": {
        routeKey: "campaigns",
        sectionTitle: "Campanhas de Prospecção",
        proactiveBubble:
          "Você está em Campanhas. Quer que eu explique como montar sua sequência segura (visita, like, comentário, conexão e DM)?",
        quickChips: [
          "Como funciona esta seção?",
          "Quais passos formam a sequência ideal?",
          "Qual é o limite diário seguro?",
          "O que acontece quando o lead responde?",
        ],
        sectionExplanation:
          "Em **Campanhas** você automatiza sua abordagem no LinkedIn com ritmo humano:\n\n1. **Aquecimento:** Visitar perfil → Curtir e comentar o último post → Seguir e pedir conexão.\n2. **Conversa:** DM *Icebreaker* contextualizada com o sinal detectado + Follow-ups automáticos.\n3. **Segurança e Stop on Reply:** opera de Seg a Sex respeitando o limite seguro (até 20 interações/dia por conta). Assim que o prospect responde, a campanha pausa e eu (Inhub SDR IA) assumo.",
        defaultActions: [
          { label: "Configurar Cérebro SDR →", href: "/sdr" },
          { label: "Ver Inbox Unificado →", href: "/inbox" },
        ],
      },
    };
    return map[locale];
  }

  if (cleanPath.startsWith("/sdr")) {
    const map: Record<CopilotLocale, RouteCopilotContext> = {
      es: {
        routeKey: "sdr",
        sectionTitle: "Asistente SDR IA (Inhub)",
        proactiveBubble:
          "¡Aquí vive mi cerebro comercial! ¿Quieres que te entrene ahora mismo haciéndote 3 preguntas sobre tu empresa?",
        quickChips: [
          "Entrenar a Inhub con mi empresa ahora",
          "¿Cómo funciona esta sección?",
          "Diferencia entre Copiloto y Automático",
          "¿Cuándo transfieres la conversación a un humano?",
        ],
        sectionExplanation:
          "En **Asistente SDR IA** configuras cómo atiendo a tus prospectos 24/7:\n\n1. **Base de Conocimiento (RAG):** aquí guardo el nombre de tu empresa, tus productos/servicios, precios, objeciones y link de agenda. ¡Puedo entrenarme contigo aquí mismo por chat!\n2. **Modo de Operación:** elige **Modo Copiloto** (redacto borradores para que los apruebes con un clic) o **Piloto Automático** (respondo y agendo reuniones al instante).\n3. **Handoff Seguro:** si el lead pide hablar con un humano o requiere una negociación especial, te transfiero el chat de inmediato.",
        defaultActions: [
          {
            label: "Entrenarme por Chat Ahora ✦",
            href: "#train",
            actionType: "start_training",
          },
          { label: "Ir al Inbox Unificado →", href: "/inbox" },
        ],
      },
      en: {
        routeKey: "sdr",
        sectionTitle: "AI SDR Assistant (Inhub)",
        proactiveBubble:
          "This is where my sales brain lives! Want me to train on your company right now by asking you 3 quick questions?",
        quickChips: [
          "Train Inhub on my company now",
          "How does this section work?",
          "Copilot vs Autopilot Mode",
          "When do you hand off to a human?",
        ],
        sectionExplanation:
          "In **AI SDR Assistant** you control how I handle prospects 24/7:\n\n1. **Knowledge Base (RAG):** stores your company name, products/services, pricing, objections, and booking link. You can train me right here in this chat!\n2. **Operating Mode:** pick **Copilot Mode** (I draft replies for your 1-click approval) or **Autopilot Mode** (I reply and book meetings automatically).\n3. **Safe Handoff:** whenever a buyer asks for a human or custom enterprise terms, I transfer the thread to you right away.",
        defaultActions: [
          {
            label: "Train Me via Chat Now ✦",
            href: "#train",
            actionType: "start_training",
          },
          { label: "Open Unified Inbox →", href: "/inbox" },
        ],
      },
      "pt-BR": {
        routeKey: "sdr",
        sectionTitle: "Assistente SDR IA (Inhub)",
        proactiveBubble:
          "Aqui vive meu cérebro comercial! Quer me treinar agora mesmo respondendo 3 perguntas rápidas sobre sua empresa?",
        quickChips: [
          "Treinar o Inhub com minha empresa agora",
          "Como funciona esta seção?",
          "Diferença entre Copiloto e Automático",
          "Quando você transfere para um humano?",
        ],
        sectionExplanation:
          "Em **Assistente SDR IA** você define como eu atendo seus prospects 24/7:\n\n1. **Base de Conhecimento (RAG):** guarda o nome da sua empresa, produtos/serviços, preços, objeções e link de agenda. Posso fazer seu treinamento aqui mesmo pelo chat!\n2. **Modo de Operação:** escolha **Modo Copiloto** (crio rascunhos para você aprovar em 1 clique) ou **Piloto Automático** (respondo e agendo reuniões sozinho).\n3. **Transbordo Seguro:** se o lead pedir um humano ou negociação especial, transfiro o chat na hora.",
        defaultActions: [
          {
            label: "Me Treinar pelo Chat Agora ✦",
            href: "#train",
            actionType: "start_training",
          },
          { label: "Ir ao Inbox Unificado →", href: "/inbox" },
        ],
      },
    };
    return map[locale];
  }

  if (cleanPath.startsWith("/inbox")) {
    const map: Record<CopilotLocale, RouteCopilotContext> = {
      es: {
        routeKey: "inbox",
        sectionTitle: "Smart Inbox Unificado",
        proactiveBubble:
          "Estás en el Inbox Unificado. ¿Quieres que te explique cómo aprobar mis respuestas o tomar el control humano de un chat?",
        quickChips: [
          "¿Cómo funciona esta sección?",
          "¿Cómo apruebo respuestas de Inhub?",
          "¿Cómo tomo el control humano?",
          "Ver etapas en el Pipeline CRM",
        ],
        sectionExplanation:
          "En el **Smart Inbox Unificado** gestionas las conversaciones de todas tus cuentas de LinkedIn conectadas:\n\n1. **Bandeja Multi-cuenta:** filtra por cuenta, etapa del CRM o mensajes no leídos.\n2. **Sugerencias del SDR IA:** revisa la respuesta que preparé desde tu Base de Conocimiento, edítala si deseas o envíala en un clic.\n3. **Intervención Humana:** puedes responder manualmente en cualquier hilo y mover al prospecto de etapa en el Pipeline CRM.",
        defaultActions: [
          { label: "Ver Pipeline CRM →", href: "/pipeline" },
          { label: "Ajustar Base de Conocimiento →", href: "/sdr" },
        ],
      },
      en: {
        routeKey: "inbox",
        sectionTitle: "Unified Smart Inbox",
        proactiveBubble:
          "You're in the Unified Inbox. Want me to explain how to approve my drafts or jump into a conversation manually?",
        quickChips: [
          "How does this section work?",
          "How do I approve Inhub's drafts?",
          "How do I take human control?",
          "View CRM Pipeline stages",
        ],
        sectionExplanation:
          "In the **Unified Smart Inbox** you manage threads across all connected LinkedIn accounts:\n\n1. **Multi-account view:** filter by account, CRM stage, or unread status.\n2. **AI SDR Suggestions:** review the reply I drafted from your Knowledge Base, tweak it, or send with one click.\n3. **Human Takeover:** jump into any thread manually and update the lead's CRM Pipeline stage.",
        defaultActions: [
          { label: "View CRM Pipeline →", href: "/pipeline" },
          { label: "Edit Knowledge Base →", href: "/sdr" },
        ],
      },
      "pt-BR": {
        routeKey: "inbox",
        sectionTitle: "Smart Inbox Unificado",
        proactiveBubble:
          "Você está no Inbox Unificado. Quer que eu explique como aprovar minhas respostas ou assumir uma conversa manualmente?",
        quickChips: [
          "Como funciona esta seção?",
          "Como aprovo rascunhos do Inhub?",
          "Como assumo o atendimento humano?",
          "Ver etapas no Pipeline CRM",
        ],
        sectionExplanation:
          "No **Smart Inbox Unificado** você gerencia conversas de todas as contas do LinkedIn conectadas:\n\n1. **Caixa Multi-conta:** filtre por conta, etapa do CRM ou não lidas.\n2. **Sugestões do SDR IA:** revise a resposta preparada com sua Base de Conhecimento e envie em 1 clique.\n3. **Atendimento Humano:** responda manualmente quando quiser e atualize a etapa do lead no Pipeline CRM.",
        defaultActions: [
          { label: "Ver Pipeline CRM →", href: "/pipeline" },
          { label: "Ajustar Base de Conhecimento →", href: "/sdr" },
        ],
      },
    };
    return map[locale];
  }

  if (cleanPath.startsWith("/pipeline") || cleanPath.startsWith("/leads")) {
    const map: Record<CopilotLocale, RouteCopilotContext> = {
      es: {
        routeKey: "pipeline",
        sectionTitle: "Pipeline CRM & Leads 360",
        proactiveBubble:
          "Estás en el Pipeline CRM. ¿Quieres ver cómo avanzan tus prospectos por las 8 etapas o cómo exportarlos a CSV?",
        quickChips: [
          "¿Cómo funciona esta sección?",
          "¿Cuáles son las etapas del Pipeline?",
          "¿Cómo exporto mis leads a CSV?",
          "¿Cómo asigno una lista a una campaña?",
        ],
        sectionExplanation:
          "En **Pipeline CRM y Leads 360** tienes trazabilidad total de tus oportunidades:\n\n1. **Avance Automático:** a medida que los prospectos entran por Signal Radar, aceptan conexión, responden en el Inbox o agendan reunión, su etapa se actualiza en el tablero Kanban.\n2. **Arrastrar y Soltar:** mueve tarjetas manualmente entre las 8 etapas (Capturado, En Secuencia, Conectado, En Conversación, Calificado, Reunión Agendada, Ganado).\n3. **Exportación:** descarga tus listas filtradas en CSV en cualquier momento.",
        defaultActions: [
          { label: "Ver Tablero Pipeline →", href: "/pipeline" },
          { label: "Ver Listas de Leads →", href: "/leads" },
          { label: "Ir a Campañas →", href: "/campaigns" },
        ],
      },
      en: {
        routeKey: "pipeline",
        sectionTitle: "CRM Pipeline & Leads 360",
        proactiveBubble:
          "You're in the CRM Pipeline. Want to see how prospects move across the 8 stages or how to export them to CSV?",
        quickChips: [
          "How does this section work?",
          "What are the Pipeline stages?",
          "How do I export leads to CSV?",
          "How do I assign a list to a campaign?",
        ],
        sectionExplanation:
          "In **CRM Pipeline & Leads 360** you track every opportunity end-to-end:\n\n1. **Automatic Progression:** as leads enter via Signal Radar, connect, reply in the Inbox, or book calls, their stage updates on the Kanban board.\n2. **Drag & Drop:** move cards across the 8 stages anytime.\n3. **CSV Export:** export your filtered lead lists with one click.",
        defaultActions: [
          { label: "Open Pipeline Board →", href: "/pipeline" },
          { label: "Open Lead Lists →", href: "/leads" },
          { label: "Go to Campaigns →", href: "/campaigns" },
        ],
      },
      "pt-BR": {
        routeKey: "pipeline",
        sectionTitle: "Pipeline CRM & Leads 360",
        proactiveBubble:
          "Você está no Pipeline CRM. Quer ver como seus prospects avançam pelas 8 etapas ou como exportar para CSV?",
        quickChips: [
          "Como funciona esta seção?",
          "Quais são as etapas do Pipeline?",
          "Como exporto meus leads em CSV?",
          "Como vinculo uma lista a uma campanha?",
        ],
        sectionExplanation:
          "No **Pipeline CRM e Leads 360** você acompanha cada oportunidade:\n\n1. **Avanço Automático:** conforme os leads entram pelo Signal Radar, aceitam conexão, respondem no Inbox ou agendam reunião, a etapa atualiza no Kanban.\n2. **Arrastar e Soltar:** mova os cards manualmente entre as 8 etapas.\n3. **Exportação CSV:** baixe suas listas filtradas quando quiser.",
        defaultActions: [
          { label: "Ver Quadro Pipeline →", href: "/pipeline" },
          { label: "Ver Listas de Leads →", href: "/leads" },
          { label: "Ir para Campanhas →", href: "/campaigns" },
        ],
      },
    };
    return map[locale];
  }

  if (cleanPath.startsWith("/linkedin-accounts")) {
    const map: Record<CopilotLocale, RouteCopilotContext> = {
      es: {
        routeKey: "linkedin-accounts",
        sectionTitle: "Cuentas de LinkedIn",
        proactiveBubble:
          "Aquí conectas tus perfiles de LinkedIn de forma segura. ¿Quieres que te guíe paso a paso y luego me entrenes con los datos de tu empresa?",
        quickChips: [
          "¿Cómo conecto mi cuenta de LinkedIn?",
          "Entrenar a Inhub con mi empresa",
          "¿Cuántas cuentas incluye mi plan?",
          "¿Cómo protege Inhub mi cuenta?",
        ],
        sectionExplanation:
          "En **Cuentas de LinkedIn** vinculas los perfiles que ejecutarán contenido, radar y campañas:\n\n1. Haz clic en **Conectar cuenta de LinkedIn** para iniciar la sesión segura mediante Unipile.\n2. Una vez que el estado marque **Conectada (OK)**, el siguiente paso clave es **entrenarme con la información de tu empresa** (nombre, productos/servicios y link de agenda).",
        defaultActions: [
          {
            label: "Entrenarme con tu Empresa ✦",
            href: "#train",
            actionType: "start_training",
          },
          { label: "Ir a Base de Conocimiento →", href: "/sdr" },
        ],
      },
      en: {
        routeKey: "linkedin-accounts",
        sectionTitle: "LinkedIn Accounts",
        proactiveBubble:
          "Here you connect your LinkedIn profiles safely. Want me to guide you step by step and then train on your company?",
        quickChips: [
          "How do I connect my LinkedIn account?",
          "Train Inhub on my company",
          "How many accounts are in my plan?",
          "How does Inhub keep my account safe?",
        ],
        sectionExplanation:
          "In **LinkedIn Accounts** you link the profiles that run content, radar, and campaigns:\n\n1. Click **Connect LinkedIn Account** to authenticate securely via Unipile.\n2. Once status shows **Connected (OK)**, the next key step is **training me on your company details** (company name, products/services, and booking link).",
        defaultActions: [
          {
            label: "Train Me on Your Company ✦",
            href: "#train",
            actionType: "start_training",
          },
          { label: "Go to Knowledge Base →", href: "/sdr" },
        ],
      },
      "pt-BR": {
        routeKey: "linkedin-accounts",
        sectionTitle: "Contas do LinkedIn",
        proactiveBubble:
          "Aqui você conecta seus perfis do LinkedIn com segurança. Quer que eu te guie passo a passo e depois me treine com sua empresa?",
        quickChips: [
          "Como conecto minha conta do LinkedIn?",
          "Treinar o Inhub com minha empresa",
          "Quantas contas meu plano inclui?",
          "Como o Inhub protege minha conta?",
        ],
        sectionExplanation:
          "Em **Contas do LinkedIn** você vincula os perfis que rodarão conteúdo, radar e campanhas:\n\n1. Clique em **Conectar conta do LinkedIn** para autenticar com segurança via Unipile.\n2. Assim que o status ficar **Conectada (OK)**, o próximo passo é **me treinar com as informações da sua empresa** (nome, produtos/serviços e link de agenda).",
        defaultActions: [
          {
            label: "Me Treinar com sua Empresa ✦",
            href: "#train",
            actionType: "start_training",
          },
          { label: "Ir à Base de Conhecimento →", href: "/sdr" },
        ],
      },
    };
    return map[locale];
  }

  // Default: Dashboard Home or Settings/Support
  const homeMap: Record<CopilotLocale, RouteCopilotContext> = {
    es: {
      routeKey: "dashboard",
      sectionTitle: "Panel Principal InhubFlow",
      proactiveBubble:
        "¡Hola! Soy Inhub, tu Asistente SDR IA. ¿Quieres que revise tu cuenta y te lleve paso a paso a configurarla?",
      quickChips: [
        "¿Qué debo hacer primero en mi cuenta?",
        "Entrenar a Inhub con mi empresa",
        "¿Cómo genero contenido para 1 mes?",
        "¿Cómo detecto señales de compra?",
      ],
      sectionExplanation:
        "¡Bienvenido a **InhubFlow Social Selling Suite**! Este es el orden ideal de 4 pasos para llenar tu calendario en LinkedIn:\n\n1. **Conectar tu cuenta de LinkedIn** en Configuración → Cuentas de LinkedIn.\n2. **Entrenarme a mí (Inhub)** con el nombre de tu empresa, tus productos/servicios y tu link de agenda.\n3. **Crear tu mes de contenido** en Viral Post Engine (12 posts Lun/Mié/Vie + carruseles PDF).\n4. **Activar Signal Radar y tu primera Campaña** para convertir interacciones en reuniones.",
      defaultActions: [
        { label: "1. Conectar LinkedIn →", href: "/linkedin-accounts" },
        {
          label: "2. Entrenar a Inhub por Chat ✦",
          href: "#train",
          actionType: "start_training",
        },
        { label: "3. Ir a Viral Post Engine →", href: "/viral-posts" },
      ],
    },
    en: {
      routeKey: "dashboard",
      sectionTitle: "InhubFlow Main Dashboard",
      proactiveBubble:
        "Hi! I'm Inhub, your AI SDR Assistant. Want me to check your account status and guide you step by step?",
      quickChips: [
        "What should I set up first?",
        "Train Inhub on my company",
        "How do I create 1 month of content?",
        "How do I detect buying signals?",
      ],
      sectionExplanation:
        "Welcome to **InhubFlow Social Selling Suite**! Here is the ideal 4-step path to book meetings on LinkedIn:\n\n1. **Connect your LinkedIn account** in Settings → LinkedIn Accounts.\n2. **Train me (Inhub)** with your company name, products/services, and booking link.\n3. **Create your month of content** in Viral Post Engine (12 Mon/Wed/Fri posts + PDF carousels).\n4. **Activate Signal Radar & your first Campaign** to turn engagement into meetings.",
      defaultActions: [
        { label: "1. Connect LinkedIn →", href: "/linkedin-accounts" },
        {
          label: "2. Train Inhub via Chat ✦",
          href: "#train",
          actionType: "start_training",
        },
        { label: "3. Open Viral Post Engine →", href: "/viral-posts" },
      ],
    },
    "pt-BR": {
      routeKey: "dashboard",
      sectionTitle: "Painel Principal InhubFlow",
      proactiveBubble:
        "Olá! Sou o Inhub, seu Assistente SDR IA. Quer que eu verifique sua conta e te guie passo a passo?",
      quickChips: [
        "O que devo configurar primeiro?",
        "Treinar o Inhub com minha empresa",
        "Como crio conteúdo para 1 mês?",
        "Como detecto sinais de compra?",
      ],
      sectionExplanation:
        "Bem-vindo ao **InhubFlow Social Selling Suite**! Este é o passo a passo ideal em 4 etapas para lotar sua agenda no LinkedIn:\n\n1. **Conectar sua conta do LinkedIn** em Configurações → Contas do LinkedIn.\n2. **Me treinar (Inhub)** com o nome da sua empresa, produtos/serviços e link de agenda.\n3. **Criar 1 mês de conteúdo** no Viral Post Engine (12 posts Seg/Qua/Sex + carrosséis PDF).\n4. **Ativar o Signal Radar e sua primeira Campanha** para transformar sinais em reuniões.",
      defaultActions: [
        { label: "1. Conectar LinkedIn →", href: "/linkedin-accounts" },
        {
          label: "2. Treinar o Inhub pelo Chat ✦",
          href: "#train",
          actionType: "start_training",
        },
        { label: "3. Abrir Viral Post Engine →", href: "/viral-posts" },
      ],
    },
  };

  return homeMap[locale];
}
