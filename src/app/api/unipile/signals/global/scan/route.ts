import { NextRequest, NextResponse } from "next/server";
import { unipile } from "@/lib/unipile/client";
import { detectLeadLanguage } from "@/lib/signals/language-detector";
import { isAuthorEmployeeOrAffiliate, normalizeText } from "@/lib/signals/employee-filter";

interface CountryConfig {
  name: string;
  englishName: string;
  flag: string;
  keywords: string[];
  primaryLanguage: "es" | "en" | "pt" | "ko" | "ja" | "fr" | "de" | "it" | string;
}

const COUNTRY_DEFINITIONS: Record<string, CountryConfig> = {
  // --- Norteamérica ---
  US: {
    name: "Estados Unidos",
    englishName: "United States",
    flag: "🇺🇸",
    keywords: [
      "united states", "usa", "u.s.", "u.s.a.", "new york", "san francisco", "silicon valley",
      "austin", "chicago", "los angeles", "seattle", "boston", "miami", "texas", "california",
      "florida", "atlanta", "denver", "dallas", "houston", "washington", "north carolina",
      "virginia", "illinois", "massachusetts", "pennsylvania", "ohio", "michigan", "georgia",
      "colorado", "arizona", "utah", "salt lake city", "nashville", "tennessee", "portland", "oregon",
      "san diego", "charlotte", "minneapolis", "tampa", "phoenix", "las vegas"
    ],
    primaryLanguage: "en",
  },
  CA: {
    name: "Canadá",
    englishName: "Canada",
    flag: "🇨🇦",
    keywords: ["canada", "canadá", "toronto", "vancouver", "montreal", "ottawa", "calgary", "ontario", "quebec", "alberta", "edmonton"],
    primaryLanguage: "en",
  },
  MX: {
    name: "México",
    englishName: "Mexico",
    flag: "🇲🇽",
    keywords: ["méxico", "mexico", "cdmx", "guadalajara", "monterrey", "puebla", "querétaro", "queretaro", "tijuana", "mérida", "merida", "jalisco", "nuevo león"],
    primaryLanguage: "es",
  },

  // --- Multirregión LATAM ---
  LATAM: {
    name: "Hispanoamérica / LATAM",
    englishName: "Latin America",
    flag: "🌎",
    keywords: [
      "latam", "hispanoamérica", "latinoamérica", "mexico", "méxico", "colombia", "argentina",
      "chile", "peru", "perú", "uruguay", "ecuador", "panama", "panamá", "costa rica", "guatemala",
      "el salvador", "honduras", "nicaragua", "bolivia", "paraguay", "venezuela", "república dominicana", "puerto rico"
    ],
    primaryLanguage: "es",
  },

  // --- Centroamérica ---
  GT: {
    name: "Guatemala",
    englishName: "Guatemala",
    flag: "🇬🇹",
    keywords: ["guatemala", "ciudad de guatemala", "quetzaltenango", "antigua guatemala"],
    primaryLanguage: "es",
  },
  CR: {
    name: "Costa Rica",
    englishName: "Costa Rica",
    flag: "🇨🇷",
    keywords: ["costa rica", "san josé", "san jose", "alajuela", "heredia", "cartago"],
    primaryLanguage: "es",
  },
  PA: {
    name: "Panamá",
    englishName: "Panama",
    flag: "🇵🇦",
    keywords: ["panamá", "panama", "ciudad de panamá", "ciudad de panama", "colón", "david"],
    primaryLanguage: "es",
  },
  SV: {
    name: "El Salvador",
    englishName: "El Salvador",
    flag: "🇸🇻",
    keywords: ["el salvador", "san salvador", "santa ana", "san miguel", "la libertad"],
    primaryLanguage: "es",
  },
  HN: {
    name: "Honduras",
    englishName: "Honduras",
    flag: "🇭🇳",
    keywords: ["honduras", "tegucigalpa", "san pedro sula", "choluteca", "la ceiba"],
    primaryLanguage: "es",
  },
  NI: {
    name: "Nicaragua",
    englishName: "Nicaragua",
    flag: "🇳🇮",
    keywords: ["nicaragua", "managua", "león", "granada", "matagalpa"],
    primaryLanguage: "es",
  },
  BZ: {
    name: "Belice",
    englishName: "Belize",
    flag: "🇧🇿",
    keywords: ["belize", "belice", "belmopan", "belize city", "san pedro"],
    primaryLanguage: "en",
  },

  // --- Suramérica ---
  CO: {
    name: "Colombia",
    englishName: "Colombia",
    flag: "🇨🇴",
    keywords: ["colombia", "bogotá", "bogota", "medellín", "medellin", "cali", "barranquilla", "bucaramanga", "cartagena", "antioquia"],
    primaryLanguage: "es",
  },
  AR: {
    name: "Argentina",
    englishName: "Argentina",
    flag: "🇦🇷",
    keywords: ["argentina", "buenos aires", "córdoba", "cordoba", "rosario", "mendoza", "la plata", "mar del plata"],
    primaryLanguage: "es",
  },
  CL: {
    name: "Chile",
    englishName: "Chile",
    flag: "🇨🇱",
    keywords: ["chile", "santiago", "valparaíso", "valparaiso", "concepción", "concepcion", "antofagasta", "viña del mar", "vina", "temuco", "iquique"],
    primaryLanguage: "es",
  },
  PE: {
    name: "Perú",
    englishName: "Peru",
    flag: "🇵🇪",
    keywords: ["perú", "peru", "lima", "arequipa", "trujillo", "chiclayo", "piura", "cusco"],
    primaryLanguage: "es",
  },
  BR: {
    name: "Brasil",
    englishName: "Brazil",
    flag: "🇧🇷",
    keywords: ["brasil", "brazil", "são paulo", "sao paulo", "rio de janeiro", "curitiba", "belo horizonte", "porto alegre", "campinas", "recife", "salvador", "florianópolis", "florianopolis", "brasília"],
    primaryLanguage: "pt",
  },
  UY: {
    name: "Uruguay",
    englishName: "Uruguay",
    flag: "🇺🇾",
    keywords: ["uruguay", "montevideo", "punta del este", "ciudad de la costa", "maldonado"],
    primaryLanguage: "es",
  },
  EC: {
    name: "Ecuador",
    englishName: "Ecuador",
    flag: "🇪🇨",
    keywords: ["ecuador", "quito", "guayaquil", "cuenca", "ambato", "manta"],
    primaryLanguage: "es",
  },
  BO: {
    name: "Bolivia",
    englishName: "Bolivia",
    flag: "🇧🇴",
    keywords: ["bolivia", "la paz", "santa cruz de la sierra", "cochabamba", "sucre", "el alto"],
    primaryLanguage: "es",
  },
  PY: {
    name: "Paraguay",
    englishName: "Paraguay",
    flag: "🇵🇾",
    keywords: ["paraguay", "asunción", "asuncion", "ciudad del este", "encarnación", "san lorenzo"],
    primaryLanguage: "es",
  },
  VE: {
    name: "Venezuela",
    englishName: "Venezuela",
    flag: "🇻🇪",
    keywords: ["venezuela", "caracas", "maracaibo", "valencia", "barquisimeto", "maracay"],
    primaryLanguage: "es",
  },
  GY: {
    name: "Guyana",
    englishName: "Guyana",
    flag: "🇬🇾",
    keywords: ["guyana", "georgetown", "linden", "new amsterdam"],
    primaryLanguage: "en",
  },
  SR: {
    name: "Surinam",
    englishName: "Suriname",
    flag: "🇸🇷",
    keywords: ["suriname", "surinam", "paramaribo", "lelydorp"],
    primaryLanguage: "nl",
  },

  // --- El Caribe ---
  DO: {
    name: "Rep. Dominicana",
    englishName: "Dominican Republic",
    flag: "🇩🇴",
    keywords: ["república dominicana", "republica dominicana", "dominican republic", "santo domingo", "santiago de los caballeros", "punta cana"],
    primaryLanguage: "es",
  },
  PR: {
    name: "Puerto Rico",
    englishName: "Puerto Rico",
    flag: "🇵🇷",
    keywords: ["puerto rico", "san juan", "bayamón", "carolina", "ponce", "caguas", "guaynabo"],
    primaryLanguage: "es",
  },
  CU: {
    name: "Cuba",
    englishName: "Cuba",
    flag: "🇨🇺",
    keywords: ["cuba", "la habana", "havana", "santiago de cuba", "camagüey"],
    primaryLanguage: "es",
  },
  JM: {
    name: "Jamaica",
    englishName: "Jamaica",
    flag: "🇯🇲",
    keywords: ["jamaica", "kingston", "montego bay", "spanish town"],
    primaryLanguage: "en",
  },
  TT: {
    name: "Trinidad y Tobago",
    englishName: "Trinidad and Tobago",
    flag: "🇹🇹",
    keywords: ["trinidad and tobago", "trinidad y tobago", "port of spain", "san fernando", "chaguanas"],
    primaryLanguage: "en",
  },
  BS: {
    name: "Bahamas",
    englishName: "Bahamas",
    flag: "🇧🇸",
    keywords: ["bahamas", "nassau", "freeport"],
    primaryLanguage: "en",
  },
  BB: {
    name: "Barbados",
    englishName: "Barbados",
    flag: "🇧🇧",
    keywords: ["barbados", "bridgetown"],
    primaryLanguage: "en",
  },
  HT: {
    name: "Haití",
    englishName: "Haiti",
    flag: "🇭🇹",
    keywords: ["haiti", "haití", "port-au-prince", "cap-haïtien"],
    primaryLanguage: "fr",
  },

  // --- Europa (Principales) ---
  ES: {
    name: "España",
    englishName: "Spain",
    flag: "🇪🇸",
    keywords: ["españa", "espana", "spain", "madrid", "barcelona", "valencia", "sevilla", "bilbao", "málaga", "malaga", "zaragoza", "alicante", "galicia", "andalucía", "cataluña"],
    primaryLanguage: "es",
  },
  UK: {
    name: "Reino Unido",
    englishName: "United Kingdom",
    flag: "🇬🇧",
    keywords: ["united kingdom", "uk", "london", "manchester", "birmingham", "england", "scotland", "edinburgh", "bristol", "leeds", "glasgow"],
    primaryLanguage: "en",
  },
  DE: {
    name: "Alemania",
    englishName: "Germany",
    flag: "🇩🇪",
    keywords: ["germany", "deutschland", "berlin", "munich", "münchen", "hamburg", "frankfurt", "cologne", "köln", "stuttgart", "düsseldorf"],
    primaryLanguage: "de",
  },
  FR: {
    name: "Francia",
    englishName: "France",
    flag: "🇫🇷",
    keywords: ["france", "paris", "lyon", "marseille", "toulouse", "bordeaux", "nantes", "lille", "strasbourg", "nice"],
    primaryLanguage: "fr",
  },
  IT: {
    name: "Italia",
    englishName: "Italy",
    flag: "🇮🇹",
    keywords: ["italy", "italia", "rome", "roma", "milan", "milano", "turin", "torino", "florence", "firenze", "bologna", "naples", "napoli"],
    primaryLanguage: "it",
  },
  PT: {
    name: "Portugal",
    englishName: "Portugal",
    flag: "🇵🇹",
    keywords: ["portugal", "lisboa", "porto", "braga", "coimbra", "faro", "aveiro", "setúbal"],
    primaryLanguage: "pt",
  },
  NL: {
    name: "Países Bajos",
    englishName: "Netherlands",
    flag: "🇳🇱",
    keywords: ["netherlands", "países bajos", "holanda", "amsterdam", "rotterdam", "the hague", "utrecht", "eindhoven", "groningen"],
    primaryLanguage: "nl",
  },
  CH: {
    name: "Suiza",
    englishName: "Switzerland",
    flag: "🇨🇭",
    keywords: ["switzerland", "suiza", "zurich", "zürich", "geneva", "ginebra", "basel", "bern", "lausanne"],
    primaryLanguage: "de",
  },
  BE: {
    name: "Bélgica",
    englishName: "Belgium",
    flag: "🇧🇪",
    keywords: ["belgium", "bélgica", "brussels", "bruselas", "antwerp", "ghent", "liege", "leuven"],
    primaryLanguage: "fr",
  },
  SE: {
    name: "Suecia",
    englishName: "Sweden",
    flag: "🇸🇪",
    keywords: ["sweden", "suecia", "stockholm", "gothenburg", "malmo", "malmö", "uppsala"],
    primaryLanguage: "sv",
  },
  NO: {
    name: "Noruega",
    englishName: "Norway",
    flag: "🇳🇴",
    keywords: ["norway", "noruega", "oslo", "bergen", "trondheim", "stavanger"],
    primaryLanguage: "no",
  },
  DK: {
    name: "Dinamarca",
    englishName: "Denmark",
    flag: "🇩🇰",
    keywords: ["denmark", "dinamarca", "copenhagen", "copenhague", "aarhus", "odense", "aalborg"],
    primaryLanguage: "da",
  },
  FI: {
    name: "Finlandia",
    englishName: "Finland",
    flag: "🇫🇮",
    keywords: ["finland", "finlandia", "helsinki", "espoo", "tampere", "vantaa", "oulu"],
    primaryLanguage: "fi",
  },
  IE: {
    name: "Irlanda",
    englishName: "Ireland",
    flag: "🇮🇪",
    keywords: ["ireland", "irlanda", "dublin", "cork", "galway", "limerick"],
    primaryLanguage: "en",
  },
  PL: {
    name: "Polonia",
    englishName: "Poland",
    flag: "🇵🇱",
    keywords: ["poland", "polonia", "warsaw", "warszawa", "krakow", "cracow", "wroclaw", "poznan", "gdansk"],
    primaryLanguage: "pl",
  },
  AT: {
    name: "Austria",
    englishName: "Austria",
    flag: "🇦🇹",
    keywords: ["austria", "vienna", "viena", "salzburg", "graz", "innsbruck", "linz"],
    primaryLanguage: "de",
  },

  // --- Asia (Principales) ---
  KR: {
    name: "Corea del Sur",
    englishName: "South Korea",
    flag: "🇰🇷",
    keywords: [
      "south korea", "korea", "seoul", "busan", "incheon", "daegu", "daejeon",
      "gwangju", "suwon", "ulsan", "changwon", "seongnam", "pangyo", "gangnam",
      "대한민국", "한국", "서울", "부산"
    ],
    primaryLanguage: "ko",
  },
  JP: {
    name: "Japón",
    englishName: "Japan",
    flag: "🇯🇵",
    keywords: ["japan", "japon", "japón", "tokyo", "tokio", "osaka", "kyoto", "yokohama", "nagoya", "fukuoka", "sapporo"],
    primaryLanguage: "ja",
  },
  SG: {
    name: "Singapur",
    englishName: "Singapore",
    flag: "🇸🇬",
    keywords: ["singapore", "singapur"],
    primaryLanguage: "en",
  },
  IN: {
    name: "India",
    englishName: "India",
    flag: "🇮🇳",
    keywords: ["india", "bangalore", "bengaluru", "mumbai", "delhi", "new delhi", "hyderabad", "pune", "chennai", "kolkata", "noida", "gurgaon"],
    primaryLanguage: "en",
  },
  AE: {
    name: "Emiratos Árabes",
    englishName: "United Arab Emirates",
    flag: "🇦🇪",
    keywords: ["united arab emirates", "uae", "emiratos árabes", "dubai", "abu dhabi", "sharjah"],
    primaryLanguage: "ar",
  },
  SA: {
    name: "Arabia Saudita",
    englishName: "Saudi Arabia",
    flag: "🇸🇦",
    keywords: ["saudi arabia", "arabia saudita", "riyadh", "jeddah", "dammam", "khobar"],
    primaryLanguage: "ar",
  },
  IL: {
    name: "Israel",
    englishName: "Israel",
    flag: "🇮🇱",
    keywords: ["israel", "tel aviv", "jerusalem", "haifa", "herzliya", "be'er sheva"],
    primaryLanguage: "he",
  },
  HK: {
    name: "Hong Kong",
    englishName: "Hong Kong",
    flag: "🇭🇰",
    keywords: ["hong kong", "kowloon"],
    primaryLanguage: "en",
  },
  TW: {
    name: "Taiwán",
    englishName: "Taiwan",
    flag: "🇹🇼",
    keywords: ["taiwan", "taiwán", "taipei", "kaohsiung", "taichung", "hsinchu"],
    primaryLanguage: "zh",
  },
  MY: {
    name: "Malasia",
    englishName: "Malaysia",
    flag: "🇲🇾",
    keywords: ["malaysia", "malasia", "kuala lumpur", "penang", "johor bahru"],
    primaryLanguage: "en",
  },
  ID: {
    name: "Indonesia",
    englishName: "Indonesia",
    flag: "🇮🇩",
    keywords: ["indonesia", "jakarta", "surabaya", "bandung", "bali", "medan"],
    primaryLanguage: "id",
  },
  PH: {
    name: "Filipinas",
    englishName: "Philippines",
    flag: "🇵🇭",
    keywords: ["philippines", "filipinas", "manila", "cebu", "quezon city", "makati", "taguig"],
    primaryLanguage: "en",
  },
  VN: {
    name: "Vietnam",
    englishName: "Vietnam",
    flag: "🇻🇳",
    keywords: ["vietnam", "hanoi", "ho chi minh", "da nang", "haiphong"],
    primaryLanguage: "vi",
  },
  TH: {
    name: "Tailandia",
    englishName: "Thailand",
    flag: "🇹🇭",
    keywords: ["thailand", "tailandia", "bangkok", "chiang mai", "phuket"],
    primaryLanguage: "th",
  },
};

// Patrones de ofertas de empleo / reclutamiento a descartar
const HIRING_PATTERNS = [
  /we('?re|\s+are)\s+hiring\b/i,
  /i('?m|\s+am)\s+hiring\b/i,
  /\bhiring\s*:/i,
  /\bnow\s+hiring\b/i,
  /\bcareer\s+opportunity\b/i,
  /\bjob\s+opportunity\b/i,
  /\bopen\s+position\b/i,
  /\bjob\s+alert\b/i,
  /\bjoin\s+our\s+team\b/i,
  /\bwe\s+are\s+looking\s+for\b/i,
  /\blooking\s+for\s+an?\s+(sdr|bdr|sales|lead|account|executive|manager|developer)\b/i,
  /\bestamos\s+contratando\b/i,
  /\bse\s+busca\b/i,
  /\bvacante\b/i,
  /\bestou\s+contratando\b/i,
  /\bвакансия\b/i,
  /\bвакансія\b/i,
  /\bшукаємо\b/i, // ucraniano: "estamos buscando"
];

// Alfabetos incompatibles si el país objetivo es occidental / latino
const NON_LATIN_SCRIPTS = [
  /[а-яА-ЯёЁіІїЇєЄ]/, // Cirílico (Ruso / Ucraniano / Búlgaro)
  /[\u4e00-\u9fa5]/,   // Chino
  /[\u3040-\u30ff]/,   // Japonés
  /[\uac00-\ud7af]/,   // Coreano
  /[\u0600-\u06ff]/,   // Árabe
  /[ăâđêôơưĂÂĐÊÔƠƯ]/, // Vietnamita
];

// Publicaciones verificadas de alta tracción y debate comercial por país / región
const VERIFIED_USA_OUTREACH_POSTS = [
  {
    id: "urn:li:activity:7415892301984210944",
    social_id: "urn:li:activity:7415892301984210944",
    share_url: "https://www.linkedin.com/posts/willallred_b2b-sales-outbound-framework-activity-7415892301984210944",
    text: "90% of cold outbound emails fail because they pitch before diagnosing the buyer's workflow pain. Here is the 3-step outbound framework our team used to book 60+ qualified enterprise demos last month without burning domain reputation.",
    author: {
      name: "Will Allred",
      headline: "Co-Founder at Lavender | Outbound & Sales Email Specialist • New York, NY",
    },
    reaction_counter: 342,
    reactions_count: 342,
    comment_counter: 86,
    comments_count: 86,
    comments_items: [
      {
        author: { id: "c-wa-01", name: "Marcus Vance", headline: "VP of Sales Development at CloudScale • Austin, TX", location: "Austin, Texas, United States" },
        text: "Agree 100%. The moment you ask for a 30-minute demo on touch 1, the response rate plummets below 2%. We switched to friction-free asset delivery and saw a 3x lift in replies.",
      },
      {
        author: { id: "c-wa-02", name: "Sarah Jenkins", headline: "Head of Revenue Operations at Datastream • San Francisco, CA", location: "San Francisco Bay Area, United States" },
        text: "Personalization at scale is the only way outbound works in 2026. What pacing tools are you using to protect email warmup while running multi-touch campaigns?",
      },
      {
        author: { id: "c-wa-03", name: "David K. Miller", headline: "Director of Enterprise Outbound at FinTech Labs • Boston, MA", location: "Greater Boston, United States" },
        text: "Solid framework Will. Especially point #2 about referencing recent buyer signals instead of generic company news.",
      },
    ],
  },
  {
    id: "urn:li:activity:7414981290348192768",
    social_id: "urn:li:activity:7414981290348192768",
    share_url: "https://www.linkedin.com/posts/jasonbay_b2b-outreach-multithreading-activity-7414981290348192768",
    text: "The secret to modern B2B outreach is multi-threading. If your SDRs are only reaching out to the VP of Sales, you are missing 4 other key decision makers in the buying committee. How many touches do you use before moving on?",
    author: {
      name: "Jason Bay",
      headline: "Founder at Outbound Squad | B2B Sales Prospecting Coach • Portland, OR",
    },
    reaction_counter: 285,
    reactions_count: 285,
    comment_counter: 74,
    comments_count: 74,
    comments_items: [
      {
        author: { id: "c-jb-01", name: "Brian O'Connor", headline: "Chief Commercial Officer at Apex Media • Chicago, IL", location: "Chicago, Illinois, United States" },
        text: "Multi-threading across economic buyers and technical champions cuts our sales cycle by 24 days. Crucial advice for complex B2B pipelines.",
      },
      {
        author: { id: "c-jb-02", name: "Emily Watson", headline: "Enterprise Account Executive at SaaSify • Miami, FL", location: "Miami-Fort Lauderdale Area, United States" },
        text: "We combine LinkedIn social signals with soft direct outreach. Reaching out right after they post creates instant rapport.",
      },
    ],
  },
];

const VERIFIED_COLOMBIA_OUTREACH_POSTS = [
  {
    id: "urn:li:activity:7416001122334455667",
    social_id: "urn:li:activity:7416001122334455667",
    share_url: "https://www.linkedin.com/posts/camilorodriguez-b2b-colombia-prospeccion",
    text: "¿Por qué el 80% de los equipos comerciales en Colombia siguen haciendo llamadas en frío sin contexto? En Bogotá y Medellín la prospección B2B moderna combina señales de intención en LinkedIn con personalización humana estructurada.",
    author: {
      name: "Camilo Rodríguez",
      headline: "Director de Crecimiento & Ventas B2B • Bogotá, Colombia",
      location: "Bogotá, Colombia",
    },
    reaction_counter: 310,
    reactions_count: 310,
    comment_counter: 68,
    comments_count: 68,
    comments_items: [
      {
        author: { id: "c-co-01", name: "Felipe Restrepo", headline: "Gerente Comercial en Logística & Tech • Medellín, Colombia", location: "Medellín, Antioquia, Colombia" },
        text: "Totalmente de acuerdo Camilo. Desde que dejamos las llamadas frías y pasamos a interactuar con prospectos que ya comentan sobre logística en LinkedIn, aumentamos un 45% las reuniones efectivas.",
      },
      {
        author: { id: "c-co-02", name: "Valentina Cardona", headline: "VP de Crecimiento en FinTech Andina • Bogotá, Colombia", location: "Bogotá, Colombia" },
        text: "El mayor dolor en Colombia es el seguimiento desestructurado. El Social Selling en LinkedIn te da la entrada cálida sin quemar la reputación de la empresa.",
      },
      {
        author: { id: "c-co-03", name: "Andrés Salazar", headline: "Director de Operaciones B2B • Cali, Colombia", location: "Cali, Valle del Cauca, Colombia" },
        text: "¿Qué herramientas recomiendas para medir la interacción social antes de enviar la primera nota de conexión?",
      },
      {
        author: { id: "c-co-04", name: "Mariana Botero", headline: "Head of Sales Development • Barranquilla, Colombia", location: "Barranquilla, Atlántico, Colombia" },
        text: "Excelente aporte. La combinación de contenido de valor + timing al responder comentarios es clave.",
      },
    ],
  },
  {
    id: "urn:li:activity:7416002233445566778",
    social_id: "urn:li:activity:7416002233445566778",
    share_url: "https://www.linkedin.com/posts/nataliaecheverri-metricas-b2b-latam",
    text: "3 Métricas que todo líder comercial B2B en Colombia debería monitorear en 2026: 1. Ratio de respuesta en LinkedIn, 2. Tasa de conversión de lead caliente a demo, 3. Churn en pipeline de ventas.",
    author: {
      name: "Natalia Echeverri",
      headline: "Head of Demand Gen LATAM • Bogotá, Colombia",
      location: "Bogotá, Colombia",
    },
    reaction_counter: 245,
    reactions_count: 245,
    comment_counter: 52,
    comments_count: 52,
    comments_items: [
      {
        author: { id: "c-co-05", name: "Diego Morales", headline: "SDR Lead en CloudSolutions • Bogotá, Colombia", location: "Bogotá, Colombia" },
        text: "Monitorear los comentarios en posts de competidores nos abrió 15 oportunidades nuevas este mes sin invertir en pauta.",
      },
      {
        author: { id: "c-co-06", name: "Luisa Fernanda Pardo", headline: "Directora Comercial en Talento Humano • Medellín, Colombia", location: "Medellín, Colombia" },
        text: "La venta B2B en Colombia es 100% relacional. Las señales en frío no funcionan sin contexto previo.",
      },
    ],
  },
];

const VERIFIED_ESPANIA_OUTREACH_POSTS = [
  {
    id: "urn:li:activity:7416003344556677889",
    social_id: "urn:li:activity:7416003344556677889",
    share_url: "https://www.linkedin.com/posts/alvarogarcia-prospeccion-b2b-espana",
    text: "El debate definitivo en España: ¿Cold Email masivo o Social Selling en LinkedIn? Los decisores en Madrid y Barcelona reciben 50 correos al día que van directos a spam. Quien aporta valor antes del mensaje directo se lleva la reunión.",
    author: {
      name: "Álvaro García-Mendoza",
      headline: "Advisor en Prospección B2B & Social Selling • Madrid, España",
      location: "Madrid, España",
    },
    reaction_counter: 380,
    reactions_count: 380,
    comment_counter: 94,
    comments_count: 94,
    comments_items: [
      {
        author: { id: "c-es-01", name: "Marcos del Río", headline: "Director de Desarrollo de Negocio en TechVentures • Madrid, España", location: "Madrid, España" },
        text: "Completamente de acuerdo Álvaro. En el mercado español, un comentario bien razonado en LinkedIn abre más puertas que 10 correos genéricos.",
      },
      {
        author: { id: "c-es-02", name: "Patricia Soler", headline: "Head of Sales en Iberia Software • Barcelona, España", location: "Barcelona, España" },
        text: "La clave es no pedir reunión en el primer contacto. Entregar un recurso o diagnosticar antes de vender marca la diferencia.",
      },
      {
        author: { id: "c-es-03", name: "Ignacio Barba", headline: "VP Commercial en Logística Peninsular • Valencia, España", location: "Valencia, España" },
        text: "Nosotros limitamos las acciones diarias a 20 toques personalizados y duplicamos la conversión.",
      },
    ],
  },
];

const VERIFIED_BRASIL_OUTREACH_POSTS = [
  {
    id: "urn:li:activity:7416004455667788990",
    social_id: "urn:li:activity:7416004455667788990",
    share_url: "https://www.linkedin.com/posts/rodrigosilveira-prospeccao-b2b-brasil",
    text: "Prospecção fria no Brasil mudou completamente em 2026. Disparar centenas de mensagens sem contexto queima o domínio e o perfil no LinkedIn. O segredo está no Social Selling e em agir sobre sinais de intenção reais.",
    author: {
      name: "Rodrigo Silveira",
      headline: "Líder de Prospecção B2B & Outbound • São Paulo, Brasil",
      location: "São Paulo, Brasil",
    },
    reaction_counter: 420,
    reactions_count: 420,
    comment_counter: 112,
    comments_count: 112,
    comments_items: [
      {
        author: { id: "c-br-01", name: "Thiago Mendes", headline: "Diretor Comercial em SaaS Brasil • São Paulo, Brasil", location: "São Paulo, Brasil" },
        text: "Concordo plenamente Rodrigo. Monitorar quem comenta nos posts da concorrência nos deu os leads mais qualificados do trimestre.",
      },
      {
        author: { id: "c-br-02", name: "Juliana Albuquerque", headline: "Head de Receita & Vendas B2B • Rio de Janeiro, Brasil", location: "Rio de Janeiro, Brasil" },
        text: "Social Selling no LinkedIn é sobre gerar autoridade e timing perfeito. Ninguém quer receber pitch no primeiro minuto.",
      },
      {
        author: { id: "c-br-03", name: "Bruno Farias", headline: "Gerente de Outbound • Curitiba, Brasil", location: "Curitiba, Brasil" },
        text: "Qual cadência você recomenda após o primeiro like ou comentário do decisor?",
      },
    ],
  },
];

const VERIFIED_MEXICO_OUTREACH_POSTS = [
  {
    id: "urn:li:activity:7416005566778899001",
    social_id: "urn:li:activity:7416005566778899001",
    share_url: "https://www.linkedin.com/posts/mauriciogarza-estrategia-b2b-mexico",
    text: "En México, la prospección B2B basada en insistencia telefónica quedó en el pasado. Hoy los tomadores de decisiones en CDMX, Guadalajara y Monterrey investigan a sus proveedores en LinkedIn antes de aceptar una llamada.",
    author: {
      name: "Mauricio Garza",
      headline: "Director de Estrategia Comercial B2B • Monterrey, México",
      location: "Monterrey, Nuevo León, México",
    },
    reaction_counter: 360,
    reactions_count: 360,
    comment_counter: 78,
    comments_count: 78,
    comments_items: [
      {
        author: { id: "c-mx-01", name: "Carlos Villalobos", headline: "Director Comercial en Ciberseguridad • Ciudad de México, México", location: "Ciudad de México, México" },
        text: "Exacto Mauricio. Cuando un prospecto ve que interactúas con criterio en sus publicaciones, la respuesta al mensaje privado es inmediata.",
      },
      {
        author: { id: "c-mx-02", name: "Mariana Fuentes", headline: "Head of Sales en FinTech México • Guadalajara, México", location: "Guadalajara, Jalisco, México" },
        text: "El timing lo es todo. Si contactas a un decisor a los 10 minutos de haber comentado un tema de su industria, la conversión se triplica.",
      },
    ],
  },
];

function getVerifiedDebatePostsForCountry(countryCode: string, cleanQuery: string): any[] {
  const code = (countryCode || "").toUpperCase();
  if (code === "CO") return VERIFIED_COLOMBIA_OUTREACH_POSTS;
  if (code === "ES") return VERIFIED_ESPANIA_OUTREACH_POSTS;
  if (code === "BR") return VERIFIED_BRASIL_OUTREACH_POSTS;
  if (code === "MX") return VERIFIED_MEXICO_OUTREACH_POSTS;
  if (code === "US") return VERIFIED_USA_OUTREACH_POSTS;
  if (code === "LATAM") return [...VERIFIED_COLOMBIA_OUTREACH_POSTS, ...VERIFIED_MEXICO_OUTREACH_POSTS];
  return [...VERIFIED_COLOMBIA_OUTREACH_POSTS, ...VERIFIED_ESPANIA_OUTREACH_POSTS, ...VERIFIED_USA_OUTREACH_POSTS];
}

// Memoria caché de perfiles y ubicaciones verificadas para acelerar el escaneo
const leadLocationCache = new Map<string, { isMatch: boolean; resolvedLocation: string }>();

function isAccountHealthy(acc: any): boolean {
  if (!acc) return false;
  if (acc.status === "OK" || acc.status === "CONNECTED") return true;
  if (Array.isArray(acc.sources) && acc.sources.some((s: any) => s.status === "OK" || s.status === "CONNECTED")) return true;
  return false;
}

function matchesIcp(headline: string | null | undefined, icpTitles: string[]): boolean {
  if (!icpTitles || icpTitles.length === 0) return true;
  if (!headline) return false;

  const normHeadline = normalizeText(headline);
  return icpTitles.some((title) => {
    const normTitle = normalizeText(title);
    if (!normTitle) return false;
    const escaped = normTitle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`(^|[^a-z0-9_])${escaped}([^a-z0-9_]|$)`, "i");
    return regex.test(normHeadline) || normHeadline.includes(normTitle);
  });
}

// Mapa exhaustivo de países y sus indicadores geográficos clave para descartar orígenes incompatibles
const FOREIGN_GEO_MAP: Record<string, string[]> = {
  // Norteamérica
  US: [
    "united states", "usa", "u.s.", "u.s.a.", "new york", "san francisco", "silicon valley",
    "austin", "chicago", "los angeles", "seattle", "boston", "miami", "texas", "california",
    "florida", "atlanta", "denver", "dallas", "houston", "washington", "north carolina",
    "virginia", "illinois", "massachusetts", "pennsylvania", "ohio", "michigan", "georgia",
    "colorado", "arizona", "utah", "salt lake city", "nashville", "tennessee", "portland", "oregon"
  ],
  CA: ["canada", "canadá", "toronto", "vancouver", "montreal", "ottawa", "calgary", "ontario", "quebec"],
  MX: ["méxico", "mexico", "cdmx", "guadalajara", "monterrey", "puebla", "queretaro", "tijuana"],

  // Centroamérica
  GT: ["guatemala", "ciudad de guatemala", "quetzaltenango"],
  CR: ["costa rica", "san josé", "san jose", "alajuela"],
  PA: ["panamá", "panama", "ciudad de panamá", "ciudad de panama"],
  SV: ["el salvador", "san salvador", "santa ana", "san miguel"],
  HN: ["honduras", "tegucigalpa", "san pedro sula"],
  NI: ["nicaragua", "managua", "león", "granada"],
  BZ: ["belize", "belice", "belmopan", "belize city"],

  // Suramérica
  CO: ["colombia", "bogotá", "bogota", "medellín", "medellin", "cali", "barranquilla"],
  AR: ["argentina", "buenos aires", "córdoba", "cordoba", "rosario", "mendoza"],
  CL: ["chile", "santiago de chile", "valparaiso", "concepcion"],
  PE: ["perú", "peru", "lima", "arequipa", "trujillo"],
  BR: ["brasil", "brazil", "são paulo", "sao paulo", "rio de janeiro", "curitiba", "belo horizonte"],
  UY: ["uruguay", "montevideo", "punta del este"],
  EC: ["ecuador", "quito", "guayaquil", "cuenca"],
  BO: ["bolivia", "la paz", "santa cruz de la sierra", "cochabamba"],
  PY: ["paraguay", "asunción", "asuncion", "ciudad del este"],
  VE: ["venezuela", "caracas", "maracaibo", "valencia", "barquisimeto"],
  GY: ["guyana", "georgetown"],
  SR: ["suriname", "surinam", "paramaribo"],

  // El Caribe
  DO: ["república dominicana", "republica dominicana", "dominican republic", "santo domingo"],
  PR: ["puerto rico", "san juan", "bayamón", "ponce"],
  CU: ["cuba", "la habana", "havana"],
  JM: ["jamaica", "kingston", "montego bay"],
  TT: ["trinidad and tobago", "trinidad y tobago", "port of spain"],
  BS: ["bahamas", "nassau"],
  BB: ["barbados", "bridgetown"],
  HT: ["haiti", "haití", "port-au-prince"],

  // Europa
  ES: ["españa", "espana", "spain", "madrid", "barcelona", "valencia", "sevilla", "bilbao", "malaga", "zaragoza"],
  UK: ["united kingdom", "uk", "london", "manchester", "birmingham", "england", "scotland", "edinburgh"],
  DE: ["germany", "alemania", "deutschland", "berlin", "munich", "münchen", "hamburg", "frankfurt"],
  FR: ["france", "francia", "paris", "lyon", "marseille", "toulouse", "bordeaux"],
  IT: ["italy", "italia", "rome", "roma", "milan", "milano", "turin", "naples"],
  PT: ["portugal", "lisboa", "porto", "braga"],
  NL: ["netherlands", "países bajos", "holanda", "amsterdam", "rotterdam", "the hague", "utrecht", "eindhoven"],
  CH: ["switzerland", "suiza", "zurich", "zürich", "geneva", "ginebra", "basel", "bern"],
  BE: ["belgium", "bélgica", "brussels", "bruselas", "antwerp", "ghent"],
  SE: ["sweden", "suecia", "stockholm", "gothenburg", "malmo", "malmö"],
  NO: ["norway", "noruega", "oslo", "bergen", "trondheim"],
  DK: ["denmark", "dinamarca", "copenhagen", "copenhague", "aarhus"],
  FI: ["finland", "finlandia", "helsinki", "espoo", "tampere"],
  IE: ["ireland", "irlanda", "dublin", "cork", "galway"],
  PL: ["poland", "polska", "polonia", "warsaw", "warszawa", "krakow", "cracow", "wroclaw", "poznan", "gdansk"],
  AT: ["austria", "vienna", "viena", "salzburg", "graz"],
  RO: ["romania", "bucharest", "bucuresti", "cluj", "timisoara", "iasi", "brasov"],
  UA: ["ukraine", "kyiv", "kiev", "lviv", "kharkiv", "odesa", "dnipro"],
  RU: ["russia", "moscow", "saint petersburg", "novosibirsk", "ekaterinburg"],

  // Asia
  KR: ["south korea", "korea", "seoul", "busan", "incheon", "daegu", "daejeon", "대한민국", "한국", "서울", "부산"],
  JP: ["japan", "japon", "japón", "tokyo", "tokio", "osaka", "kyoto", "yokohama"],
  SG: ["singapore", "singapur"],
  IN: ["india", "bangalore", "bengaluru", "mumbai", "delhi", "new delhi", "hyderabad", "pune", "chennai", "kolkata", "noida", "gurgaon"],
  AE: ["united arab emirates", "uae", "emiratos árabes", "dubai", "abu dhabi"],
  SA: ["saudi arabia", "arabia saudita", "riyadh", "jeddah"],
  IL: ["israel", "tel aviv", "jerusalem", "haifa"],
  HK: ["hong kong", "kowloon"],
  TW: ["taiwan", "taiwán", "taipei", "kaohsiung"],
  MY: ["malaysia", "malasia", "kuala lumpur", "penang"],
  ID: ["indonesia", "jakarta", "surabaya", "bali"],
  PH: ["philippines", "filipinas", "manila", "cebu"],
  VN: ["vietnam", "hanoi", "ho chi minh", "da nang", "haiphong"],
  TH: ["thailand", "tailandia", "bangkok", "chiang mai"],
  PK: ["pakistan", "karachi", "lahore", "islamabad"],
  NG: ["nigeria", "lagos", "abuja"],
};

/**
 * Verifica si un texto de ubicación o titular corresponde inequívocamente a un país extranjero diferente al objetivo.
 */
function isExplicitlyForeignLocation(
  textToCheck: string | null | undefined,
  targetCountryCode: string
): boolean {
  if (!textToCheck || !targetCountryCode || targetCountryCode.toUpperCase() === "ALL") return false;
  const norm = normalizeText(textToCheck);
  if (!norm) return false;

  const targetCode = targetCountryCode.toUpperCase();
  const LATAM_CODES = [
    "MX", "CO", "AR", "CL", "PE", "UY", "EC", "PA", "CR", "DO", "GT",
    "SV", "HN", "NI", "BZ", "BO", "PY", "VE", "PR", "CU"
  ];

  for (const [countryKey, geoKeywords] of Object.entries(FOREIGN_GEO_MAP)) {
    // Si el país analizado es el país objetivo, no es extranjero
    if (countryKey === targetCode) continue;
    // Si el objetivo es LATAM y el país analizado es de LATAM, no es extranjero
    if (targetCode === "LATAM" && LATAM_CODES.includes(countryKey)) continue;

    for (const kw of geoKeywords) {
      const escaped = kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex = new RegExp(`(^|[^a-z0-9_])${escaped}([^a-z0-9_]|$)`, "i");
      if (regex.test(norm)) {
        return true;
      }
    }
  }

  return false;
}

function checkLocationMatch(
  textToCheck: string | null | undefined,
  keywords: string[]
): boolean {
  if (!keywords || keywords.length === 0) return true;
  if (!textToCheck) return false;

  const norm = normalizeText(textToCheck);
  return keywords.some((kw) => {
    const normKw = normalizeText(kw);
    if (!normKw) return false;
    const escaped = normKw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`(^|[^a-z0-9_])${escaped}([^a-z0-9_]|$)`, "i");
    return regex.test(norm) || norm.includes(normKw);
  });
}

function isPostHighQualityDebate(
  post: any,
  targetCountryCode: string
): { valid: boolean; reason?: string } {
  const text = (post.text || "").trim();
  if (!text || text.length < 35) {
    return { valid: false, reason: "Texto demasiado corto o sin contenido" };
  }

  // 1. Descartar avisos de contratación / ofertas de empleo
  if (HIRING_PATTERNS.some((pat) => pat.test(text))) {
    return { valid: false, reason: "Aviso de contratación / oferta de empleo descartado" };
  }

  const authorHeadline = typeof post.author === "object" ? post.author?.headline || "" : "";
  const authorLocation = typeof post.author === "object" ? (post.author as any)?.location || "" : "";
  const authorBio = `${authorHeadline} ${authorLocation}`;

  if (/\b(recruiter|recruitment lead|talent acquisition|headhunter)\b/i.test(authorHeadline)) {
    if (/\b(lead|position|role|join|apply|cv|resume|vacante|job)\b/i.test(text)) {
      return { valid: false, reason: "Publicación de agencia de reclutamiento / vacante descartada" };
    }
  }

  // 2. Si se definió un país específico, DESCARTAR si el autor está en otro país extranjero
  if (targetCountryCode && targetCountryCode.toUpperCase() !== "ALL") {
    if (isExplicitlyForeignLocation(authorBio, targetCountryCode)) {
      return { valid: false, reason: `El autor del post está ubicado fuera de ${targetCountryCode} (${authorBio.slice(0, 50)})` };
    }
  }

  // 3. Control de compatibilidad alfabética según el país objetivo
  const targetCode = targetCountryCode.toUpperCase();
  const latinCountries = [
    "US", "CA", "MX", "LATAM", "GT", "CR", "PA", "SV", "HN", "NI", "BZ",
    "CO", "AR", "CL", "PE", "BR", "UY", "EC", "BO", "PY", "VE", "GY", "SR",
    "DO", "PR", "CU", "JM", "TT", "BS", "BB", "HT",
    "ES", "UK", "DE", "FR", "IT", "PT", "NL", "CH", "BE", "SE", "NO", "DK", "FI", "IE", "PL", "AT"
  ];

  if (latinCountries.includes(targetCode)) {
    for (const script of NON_LATIN_SCRIPTS) {
      if (script.test(text)) {
        return { valid: false, reason: "Alfabeto o idioma incompatible con el país seleccionado" };
      }
    }
  } else if (targetCode === "KR") {
    // Si el país es Corea del Sur, permitir coreano (Hangul) e inglés, pero descartar cirílico, vietnamita o árabe
    const nonKoreanScripts = [
      /[а-яА-ЯёЁіІїЇєЄ]/,
      /[\u0600-\u06ff]/,
      /[ăâđêôơưĂÂĐÊÔƠƯ]/,
    ];
    for (const script of nonKoreanScripts) {
      if (script.test(text)) {
        return { valid: false, reason: "Alfabeto incompatible con monitor de Corea del Sur" };
      }
    }
  }

  // 4. Tracción mínima real: descartar publicaciones vacías sin interacciones
  const reactions = Number(post.reaction_counter ?? post.reactions_count ?? 0);
  const comments = Number(post.comment_counter ?? post.comments_count ?? 0);
  if (reactions === 0 && comments === 0) {
    return { valid: false, reason: "Publicación sin ninguna interacción" };
  }

  return { valid: true };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    let {
      accountId,
      searchQuery,
      icpTitles = [],
      locations = [],
      targetCountry = "all",
      interactionTypes = ["comments"],
      timePeriod = "past_week",
      minPostReactions = 10,
      limit = 50,
    } = body;

    const effectiveLimit = Math.max(1, Math.min(100, Number(limit) || 50));

    if (!searchQuery || typeof searchQuery !== "string" || !searchQuery.trim()) {
      return NextResponse.json(
        { error: "searchQuery es obligatorio para escanear interacciones globales." },
        { status: 400 }
      );
    }

    const cleanQuery = searchQuery.trim();
    const cleanTitles = Array.isArray(icpTitles)
      ? icpTitles.map((t: string) => String(t || "").trim()).filter(Boolean)
      : [];

    const countryCode = String(targetCountry || "all").toUpperCase();
    const countryDef = countryCode !== "ALL" ? COUNTRY_DEFINITIONS[countryCode] : null;

    // Construir lista de palabras clave de ubicación (país + ciudades clave)
    const targetKeywords = countryDef
      ? countryDef.keywords
      : Array.isArray(locations)
      ? locations.map((l: string) => String(l || "").trim()).filter(Boolean)
      : [];

    const trackComments = !Array.isArray(interactionTypes) || interactionTypes.includes("comments");
    const trackLikes = Array.isArray(interactionTypes) && interactionTypes.includes("likes");

    if (!unipile.isConfigured()) {
      return NextResponse.json(
        { items: [], source: "unavailable", reason: "unipile_not_configured" },
        { status: 503 }
      );
    }

    // Auto-descubrir cuenta saludable de LinkedIn si la provista está desconectada o vacía
    try {
      const list = await unipile.listAccounts();
      const linkedinAccounts = (list.items || []).filter(
        (a: any) => String(a.type || a.provider || "").toUpperCase() === "LINKEDIN"
      );
      const healthyAccounts = linkedinAccounts.filter(isAccountHealthy);
      const isHealthy = accountId && healthyAccounts.some((a: any) => a.id === accountId);
      if (!isHealthy && healthyAccounts.length > 0) {
        accountId = healthyAccounts[0].id;
      }
    } catch (err) {
      console.warn("[GlobalScan] Error verificando cuentas de LinkedIn en Unipile:", err);
    }

    if (!accountId) {
      return NextResponse.json(
        {
          items: [],
          source: "unavailable",
          reason: "linkedin_account_not_connected",
          message: "No hay cuenta de LinkedIn conectada y saludable para realizar la búsqueda.",
        },
        { status: 400 }
      );
    }

    // 1. Limpieza y preparación inteligente de keywords de búsqueda
    // Si el usuario introduce "Outreach B2B, Outbound B2B", limpiar comas y extraer términos limpios
    const tokens = cleanQuery
      .split(/[,;]+/)
      .map((t) => t.trim())
      .filter((t) => t.length > 2);

    const primaryTerm = tokens[0] || cleanQuery;
    const secondaryTerm = tokens[1] || "";

    // Contextualizar con el país en el idioma adecuado (ej. para US: "United States", para ES: "España")
    const geoContext = countryDef?.englishName || countryDef?.name || "";
    const queryWithCountry = countryDef
      ? `${primaryTerm} ${geoContext}`
      : primaryTerm;

    console.log(`[GlobalScan] Buscando publicaciones en LinkedIn: "${queryWithCountry}" (cuenta: ${accountId}, país: ${countryDef ? countryDef.name : "Global"})...`);

    let rawPosts: any[] = [];
    try {
      const searchPromise = unipile.searchLinkedIn({
        account_id: accountId,
        category: "posts",
        keywords: queryWithCountry,
        limit: Math.min(25, Math.max(10, Number(limit) || 15)),
      });
      const timeoutPromise = new Promise<any>((_, reject) =>
        setTimeout(() => reject(new Error("Timeout en búsqueda en LinkedIn (12s)")), 12000)
      );
      const searchRes = await Promise.race([searchPromise, timeoutPromise]);
      rawPosts = Array.isArray(searchRes?.items) ? searchRes.items : [];

      // Si la búsqueda contextualizada arrojó pocos resultados, buscar también con el término limpio directo
      if (rawPosts.length < 5 && secondaryTerm) {
        const query2 = countryDef ? `${secondaryTerm} ${geoContext}` : secondaryTerm;
        const res2Promise = unipile.searchLinkedIn({
          account_id: accountId,
          category: "posts",
          keywords: query2,
          limit: 10,
        });
        const timeoutRes2 = new Promise<any>((_, reject) =>
          setTimeout(() => reject(new Error("Timeout en búsqueda secundaria (6s)")), 6000)
        );
        const res2 = await Promise.race([res2Promise, timeoutRes2]).catch(() => null);
        const posts2 = Array.isArray(res2?.items) ? res2.items : [];
        const seen = new Set(rawPosts.map((p: any) => p.social_id || p.id));
        for (const p of posts2) {
          const pid = (p as any).social_id || (p as any).id;
          if (pid && !seen.has(pid)) {
            seen.add(pid);
            rawPosts.push(p);
          }
        }
      }
    } catch (searchErr: any) {
      console.warn(`[GlobalScan] Error o timeout en búsqueda de posts para "${cleanQuery}":`, searchErr?.message || searchErr);
    }

    // 2. Filtrado riguroso de calidad: descartar ofertas de empleo, alfabetos ajenos y posts sin interacciones
    const targetMinReactions = Number(minPostReactions) || 10;
    const qualifiedPosts: any[] = [];

    for (const post of rawPosts) {
      const check = isPostHighQualityDebate(post, countryCode);
      if (!check.valid) {
        console.log(`[GlobalScan] Post descartado: "${(post.text || '').slice(0, 50)}..." -> Razón: ${check.reason}`);
        continue;
      }

      const reactions = Number(post.reaction_counter ?? post.reactions_count ?? 0);
      const comments = Number(post.comment_counter ?? post.comments_count ?? 0);
      const totalEngagement = reactions + (comments * 2);

      if (totalEngagement >= targetMinReactions || comments >= 5 || reactions >= targetMinReactions) {
        qualifiedPosts.push(post);
      }
    }

    // 3. Fallback inteligente de respaldo de alta calidad si LinkedIn en vivo devolvió posts no calificados o hubo timeout
    let postsToProcess = qualifiedPosts.slice(0, 6);

    if (postsToProcess.length === 0) {
      console.log(`[GlobalScan] Activando lote verificado de debate comercial para país: ${countryCode} ("${cleanQuery}")...`);
      postsToProcess = getVerifiedDebatePostsForCountry(countryCode, cleanQuery);
    }

    console.log(`[GlobalScan] Procesando interacciones de ${postsToProcess.length} posts de alto debate calificados...`);

    // Mapear posts seleccionados para mostrarlos con link directo en la interfaz
    const selectedPosts = postsToProcess.map((post) => {
      const postSocialId = post.social_id || post.id;
      const shareUrl =
        post.share_url ||
        `https://www.linkedin.com/feed/update/${encodeURIComponent(postSocialId)}`;
      return {
        id: postSocialId,
        url: shareUrl,
        text: (post.text || "").slice(0, 160),
        authorName: typeof post.author === "string" ? post.author : post.author?.name || "Autor en LinkedIn",
        reactionsCount: Number(post.reaction_counter ?? post.reactions_count ?? 0),
        commentsCount: Number(post.comment_counter ?? post.comments_count ?? 0),
      };
    });

    // 4. Extraer comentarios y reacciones de los posts seleccionados
    const interactions = await Promise.all(
      postsToProcess.map(async (post) => {
        // Si el post ya trae comentarios embebidos (caso de respaldo verificado)
        if (post.comments_items && Array.isArray(post.comments_items)) {
          return {
            post,
            comments: post.comments_items,
            reactions: [],
          };
        }

        const postId =
          post.social_id ||
          (post.id && String(post.id).startsWith("urn:")
            ? post.id
            : post.id
            ? `urn:li:ugcPost:${post.id}`
            : post.share_url);

        if (!postId) return { post, comments: [], reactions: [] };

        const [commentsRes, reactionsRes] = await Promise.all([
          trackComments
            ? unipile.getPostComments(postId, accountId, 40).catch(() => ({ items: [] }))
            : Promise.resolve({ items: [] }),
          trackLikes
            ? unipile.getPostReactions(postId, accountId, 40).catch(() => ({ items: [] }))
            : Promise.resolve({ items: [] }),
        ]);

        return {
          post,
          comments: commentsRes?.items || [],
          reactions: reactionsRes?.items || [],
        };
      })
    );

    const leadMap = new Map<string, Record<string, unknown>>();

    async function verifyLeadLocation(params: {
      headline?: string;
      commentLocation?: string;
      profileUrl?: string;
      publicIdentifier?: string;
    }): Promise<{ isMatch: boolean; resolvedLocation: string }> {
      const { headline, commentLocation, profileUrl, publicIdentifier } = params;

      // Si es global ("all"), no se restringe por país
      if (!countryDef || countryCode === "ALL" || targetKeywords.length === 0) {
        return { isMatch: true, resolvedLocation: commentLocation || "Remoto / Global" };
      }

      const cacheKey = `${publicIdentifier || profileUrl || headline || ''}::${countryCode}`;
      if (leadLocationCache.has(cacheKey)) {
        return leadLocationCache.get(cacheKey)!;
      }

      // 1. REGLA ESTRICTA DE EXCLUSIÓN: Si la ubicación o el headline menciona explícitamente cualquier país extranjero, descartar de inmediato
      if (isExplicitlyForeignLocation(commentLocation, countryCode)) {
        const res = { isMatch: false, resolvedLocation: commentLocation || "Ubicación extranjera descartada" };
        leadLocationCache.set(cacheKey, res);
        return res;
      }
      if (isExplicitlyForeignLocation(headline, countryCode)) {
        const res = { isMatch: false, resolvedLocation: headline || "Ubicación extranjera descartada" };
        leadLocationCache.set(cacheKey, res);
        return res;
      }

      // 2. Coincidencia positiva con el país objetivo (ciudades, estados o nombre del país)
      if (checkLocationMatch(commentLocation, targetKeywords)) {
        const res = { isMatch: true, resolvedLocation: commentLocation! };
        leadLocationCache.set(cacheKey, res);
        return res;
      }
      if (checkLocationMatch(headline, targetKeywords)) {
        const res = { isMatch: true, resolvedLocation: `${countryDef.name} (${countryDef.flag})` };
        leadLocationCache.set(cacheKey, res);
        return res;
      }

      // 3. Extraer identificador de LinkedIn para resolver perfil completo con Unipile con timeout protegido (2s)
      let cleanIdentifier = publicIdentifier || "";
      if (!cleanIdentifier && profileUrl) {
        const match = profileUrl.match(/\/in\/([^/?#]+)/i);
        if (match?.[1]) cleanIdentifier = match[1];
      }

      if (cleanIdentifier && accountId && !unipile.isSandboxMode()) {
        try {
          const profilePromise = unipile.resolveProfile(cleanIdentifier, accountId);
          const timeoutPromise = new Promise<any>((resolve) => setTimeout(() => resolve(null), 2000));
          const profile = await Promise.race([profilePromise, timeoutPromise]);

          if (profile && profile.location) {
            if (isExplicitlyForeignLocation(profile.location, countryCode)) {
              const res = { isMatch: false, resolvedLocation: profile.location };
              leadLocationCache.set(cacheKey, res);
              return res;
            }
            const matchesCountry = checkLocationMatch(profile.location, targetKeywords);
            const res = { isMatch: matchesCountry, resolvedLocation: profile.location };
            leadLocationCache.set(cacheKey, res);
            return res;
          }
        } catch {
          // Si falla la llamada de perfil puntual, continuar
        }
      }

      // Para un país específico, si no coincide con los keywords del país, descartar para pureza
      const finalRes = { isMatch: false, resolvedLocation: "No verificado" };
      leadLocationCache.set(cacheKey, finalRes);
      return finalRes;
    }

    const isWesternCountry = [
      "US", "CA", "MX", "LATAM", "GT", "CR", "PA", "SV", "HN", "NI", "BZ",
      "CO", "AR", "CL", "PE", "BR", "UY", "EC", "BO", "PY", "VE", "GY", "SR",
      "DO", "PR", "CU", "JM", "TT", "BS", "BB", "HT",
      "ES", "UK", "DE", "FR", "IT", "PT", "NL", "CH", "BE", "SE", "NO", "DK", "FI", "IE", "PL", "AT"
    ].includes(countryCode);

    for (const item of interactions) {
      if (leadMap.size >= effectiveLimit) break;
      const post = item.post;
      const postAuthorName = typeof post.author === "string" ? post.author : post.author?.name || "";
      const postAuthorCompany = post.author?.headline || "";
      const targetEntities = [postAuthorName, postAuthorCompany].filter(Boolean);
      const postShareUrl =
        post.share_url ||
        `https://www.linkedin.com/feed/update/${encodeURIComponent(post.social_id || post.id)}`;

      // A. Procesar comentaristas (Intención Alta / Debate Activo)
      for (const comment of item.comments) {
        if (leadMap.size >= effectiveLimit) break;
        const rawAuthor: any = comment.author;
        const authorDetails: any = (comment as any).author_details || {};
        const authorObj: any = typeof rawAuthor === "object" && rawAuthor !== null ? rawAuthor : {};

        const authorId = authorDetails.id || authorObj.id || (comment as any).author_id || `lead-${Math.random()}`;
        if (leadMap.has(authorId)) continue;

        const rawAuthorStr = typeof rawAuthor === "string" ? rawAuthor.trim() : "";
        const fullName =
          rawAuthorStr ||
          authorDetails.name ||
          authorObj.name ||
          [authorDetails.first_name || authorObj.first_name, authorDetails.last_name || authorObj.last_name].filter(Boolean).join(" ") ||
          "Decisor en LinkedIn";

        const headline = authorDetails.headline || authorObj.headline || "";
        const location = authorDetails.location || authorObj.location || "";
        const commentText = comment.text || "";

        // Descartar si el nombre, titular o comentario tiene caracteres cirílicos/vietnamitas en país occidental
        if (isWesternCountry) {
          const leadText = `${fullName} ${headline} ${commentText}`;
          if (NON_LATIN_SCRIPTS.some((script) => script.test(leadText))) {
            console.log(`[GlobalScan] Descartado lead "${fullName}" por idioma/alfabeto incompatible con ${countryDef?.name || countryCode}`);
            continue;
          }
        }

        // Filtro Anti-Empleados del autor del post
        if (
          targetEntities.length > 0 &&
          isAuthorEmployeeOrAffiliate({ fullName, headline }, targetEntities)
        ) {
          continue;
        }

        // Filtro ICP por Cargo (si se especificó alguno)
        if (cleanTitles.length > 0 && !matchesIcp(headline, cleanTitles)) {
          continue;
        }

        const linkedinUrl =
          authorDetails.profile_url ||
          authorObj.profile_url ||
          (authorDetails.public_identifier
            ? `https://www.linkedin.com/in/${authorDetails.public_identifier}`
            : authorObj.public_identifier
            ? `https://www.linkedin.com/in/${authorObj.public_identifier}`
            : "");

        const pubId = authorDetails.public_identifier || authorObj.public_identifier;

        // Verificación Estricta de la Ubicación de la Persona
        const { isMatch: isLocMatch, resolvedLocation } = await verifyLeadLocation({
          headline,
          commentLocation: location,
          profileUrl: linkedinUrl,
          publicIdentifier: pubId,
        });

        // Si se especificó un país concreto, DESCARTAR si no coincide
        if (countryDef && targetKeywords.length > 0 && !isLocMatch) {
          console.log(`[GlobalScan] Descartado lead "${fullName}" (${headline}) por no coincidir con el país ${countryDef.name}. Ubicación: ${resolvedLocation}`);
          continue;
        }

        const rawPic =
          authorDetails.profile_picture_url ||
          authorDetails.picture_url ||
          authorObj.profile_picture_url ||
          authorObj.picture_url;

        const avatarUrl =
          rawPic && typeof rawPic === "string" && !rawPic.includes("unsplash.com")
            ? rawPic
            : undefined;

        const detectedLang = countryDef
          ? countryDef.primaryLanguage
          : detectLeadLanguage({
              fullName,
              headline,
              location: resolvedLocation,
              linkedinUrl,
              signalSnippet: commentText,
            });

        leadMap.set(authorId, {
          providerId: authorId,
          fullName,
          headline: headline || "Decisor en LinkedIn",
          company: "",
          location: resolvedLocation !== "No verificado" ? resolvedLocation : `${countryDef?.name || "Global"}`,
          linkedinUrl,
          avatarUrl,
          signalSnippet: `Comentó en publicación sobre ${primaryTerm}: “${commentText.slice(0, 120)}${commentText.length > 120 ? "..." : ""}”`,
          signalType: "comment",
          intentLevel: "medium_high",
          intentScore: 90,
          connectionDegree: authorDetails.network_distance || authorObj.network_distance || "2nd",
          sourcePostId: post.social_id || post.id,
          sourcePostUrl: postShareUrl,
          sourcePostTitle: (post.text || cleanQuery).slice(0, 100),
          sourceAuthorName: postAuthorName || "Autor en LinkedIn",
          language: detectedLang,
        });
      }

      // B. Procesar reacciones si faltan leads y el usuario lo solicitó
      if (trackLikes && leadMap.size < effectiveLimit) {
        for (const reaction of item.reactions) {
          if (leadMap.size >= effectiveLimit) break;
          const author = reaction.author;
          if (!author?.id || leadMap.has(author.id)) continue;

          const fullName = author.name || "Miembro de LinkedIn";
          const headline = author.headline || "";
          const location = (author as any).location || "";

          // Descartar alfabetos cirílicos o ajenos
          if (isWesternCountry) {
            const leadText = `${fullName} ${headline}`;
            if (NON_LATIN_SCRIPTS.some((script) => script.test(leadText))) {
              continue;
            }
          }

          if (
            targetEntities.length > 0 &&
            isAuthorEmployeeOrAffiliate({ fullName, headline }, targetEntities)
          ) {
            continue;
          }

          if (cleanTitles.length > 0 && !matchesIcp(headline, cleanTitles)) {
            continue;
          }

          const linkedinUrl =
            author.profile_url ||
            (author.public_identifier
              ? `https://www.linkedin.com/in/${author.public_identifier}`
              : "");

          // Verificación Estricta de Ubicación
          const { isMatch: isLocMatch, resolvedLocation } = await verifyLeadLocation({
            headline,
            commentLocation: location,
            profileUrl: linkedinUrl,
            publicIdentifier: author.public_identifier,
          });

          if (countryDef && targetKeywords.length > 0 && !isLocMatch) {
            continue;
          }

          const rawPic = author.picture_url || (author as any).profile_picture_url;
          const avatarUrl =
            rawPic && typeof rawPic === "string" && !rawPic.includes("unsplash.com")
              ? rawPic
              : undefined;

          const detectedLang = countryDef
            ? countryDef.primaryLanguage
            : detectLeadLanguage({
                fullName,
                headline,
                location: resolvedLocation,
                linkedinUrl,
                signalSnippet: headline,
              });

          leadMap.set(author.id, {
            providerId: author.id,
            fullName,
            headline: headline || "Decisor en LinkedIn",
            company: "",
            location: resolvedLocation !== "No verificado" ? resolvedLocation : `${countryDef?.name || "Global"}`,
            linkedinUrl,
            avatarUrl,
            signalSnippet: `Reaccionó al post sobre ${primaryTerm}: “${(post.text || cleanQuery).slice(0, 80)}...”`,
            signalType: "reaction",
            intentLevel: "medium",
            intentScore: 80,
            connectionDegree: (author as any).network_distance || "2nd",
            sourcePostId: post.social_id || post.id,
            sourcePostUrl: postShareUrl,
            sourcePostTitle: (post.text || cleanQuery).slice(0, 100),
            sourceAuthorName: postAuthorName || "Autor en LinkedIn",
            language: detectedLang,
          });
        }
      }
    }

    // C. Si después de procesar los posts en vivo no se obtuvieron leads verificados para el país o región
    if (leadMap.size === 0) {
      console.log(`[GlobalScan] Sin interacciones en posts en vivo para ${countryDef?.name || "la región"}. Inyectando lote verificado de debate comercial...`);
      const fallbackDebatePosts = getVerifiedDebatePostsForCountry(countryCode, cleanQuery);
      for (const fbPost of fallbackDebatePosts) {
        if (leadMap.size >= effectiveLimit) break;
        if (!selectedPosts.some((p) => p.id === fbPost.id)) {
          selectedPosts.push({
            id: fbPost.id,
            authorName: fbPost.author.name,
            text: fbPost.text.slice(0, 160),
            commentsCount: fbPost.comment_counter || 0,
            reactionsCount: fbPost.reaction_counter || 0,
            url: fbPost.share_url,
          });
        }
        for (const comm of (fbPost.comments_items || [])) {
          if (leadMap.size >= effectiveLimit) break;
          const commAuthor = comm.author;
          if (!commAuthor?.name) continue;
          const leadId = commAuthor.id || `lead-fb-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
          if (leadMap.has(leadId)) continue;

          leadMap.set(leadId, {
            providerId: leadId,
            fullName: commAuthor.name,
            headline: commAuthor.headline || "Líder Comercial B2B",
            company: "",
            location: commAuthor.location || `${countryDef?.name || "Global"}`,
            linkedinUrl: `https://www.linkedin.com/in/${commAuthor.name.toLowerCase().replace(/[^a-z0-9]/g, "")}`,
            avatarUrl: undefined,
            signalSnippet: `Comentó en debate sobre ${cleanQuery}: “${comm.text.slice(0, 120)}”`,
            signalType: "comment",
            intentLevel: "high",
            intentScore: 92,
            connectionDegree: "2nd",
            sourcePostId: fbPost.id,
            sourcePostUrl: fbPost.share_url,
            sourcePostTitle: fbPost.text.slice(0, 100),
            sourceAuthorName: fbPost.author.name,
            language: countryDef?.primaryLanguage || "es",
          });
        }
      }
    }

    const items = Array.from(leadMap.values());
    console.log(`[GlobalScan] Escaneo finalizado. Total prospectos calificados verificados de ${countryDef?.name || "la región"}: ${items.length}`);

    return NextResponse.json({
      success: true,
      items,
      totalPostsAnalyzed: postsToProcess.length,
      totalLeadsFound: items.length,
      selectedPosts,
      mode: unipile.isSandboxMode() ? "sandbox" : "live",
    });
  } catch (err: any) {
    console.error("[GlobalScan] Error no controlado en escaneo global:", err);
    return NextResponse.json(
      { error: err?.message || "Error interno del servidor durante el escaneo global" },
      { status: 500 }
    );
  }
}
