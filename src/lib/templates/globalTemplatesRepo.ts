import { getSocialSellingDb } from "@/lib/persistence/db";
import { newId } from "@doory/lib/document";
import type {
  Page,
  TemplateCategory,
  TemplateDetail,
  TemplateQuery,
  TemplateSummary,
} from "@doory/types/api";
import type { DoryDocument } from "@doory/types/document";

export interface GlobalTemplateRow {
  id: string;
  slug: string;
  title: string;
  category_id: string;
  category_name: string;
  tags_json: string;
  width: number;
  height: number;
  orientation: "portrait" | "landscape" | "square";
  thumbnail_url: string | null;
  document_json: string;
  created_by: string | null;
  use_count: number;
  is_featured: number;
  created_at: string;
  updated_at: string;
}

export interface SaveGlobalTemplateInput {
  title: string;
  category: string;
  categoryName?: string;
  tags?: string[];
  width: number;
  height: number;
  orientation: "portrait" | "landscape" | "square";
  thumbnailUrl?: string | null;
  document: DoryDocument;
  createdBy?: string | null;
}

const DEFAULT_CATEGORIES: { id: string; slug: string; name: string }[] = [
  { id: "cat-autoridad", slug: "autoridad", name: "Autoridad & Thought Leadership" },
  { id: "cat-carruseles", slug: "carruseles", name: "Carruseles & Slides" },
  { id: "cat-anuncios", slug: "anuncios", name: "Lanzamientos & Ofertas" },
  { id: "cat-preguntas", slug: "preguntas", name: "Preguntas & Debates" },
  { id: "cat-consejos", slug: "consejos", name: "Consejos & Frameworks" },
  { id: "cat-general", slug: "general", name: "General B2B" },
];

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

function ensureTableAndSeed(db = getSocialSellingDb()) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS global_templates (
      id TEXT PRIMARY KEY,
      slug TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      category_id TEXT NOT NULL,
      category_name TEXT NOT NULL,
      tags_json TEXT NOT NULL DEFAULT '[]',
      width INTEGER NOT NULL,
      height INTEGER NOT NULL,
      orientation TEXT NOT NULL,
      thumbnail_url TEXT,
      document_json TEXT NOT NULL,
      created_by TEXT,
      use_count INTEGER NOT NULL DEFAULT 0,
      is_featured INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_global_templates_category ON global_templates(category_id);
    CREATE INDEX IF NOT EXISTS idx_global_templates_created ON global_templates(created_at DESC);
  `);

  const countRow = db.prepare("SELECT COUNT(*) as count FROM global_templates").get() as { count: number };
  if (countRow.count === 0) {
    seedInitialTemplates(db);
  }
}

function seedInitialTemplates(db: ReturnType<typeof getSocialSellingDb>) {
  const insert = db.prepare(`
    INSERT INTO global_templates (
      id, slug, title, category_id, category_name, tags_json, width, height, orientation, thumbnail_url, document_json, created_by, use_count, is_featured
    ) VALUES (
      @id, @slug, @title, @category_id, @category_name, @tags_json, @width, @height, @orientation, @thumbnail_url, @document_json, @created_by, @use_count, @is_featured
    )
  `);

  // Template 1: Post de Autoridad B2B (Vertical 4:5 - 1200 x 1500 px)
  const doc1: DoryDocument = {
    schemaVersion: 1,
    width: 1200,
    height: 1500,
    unit: "px",
    pages: [
      {
        id: "page-1",
        background: { type: "solid", color: "#0b0f19" },
        objects: [
          {
            id: "rect-badge",
            type: "rect",
            left: 108,
            top: 120,
            width: 180,
            height: 44,
            rx: 22,
            ry: 22,
            fill: "#0099ff",
            originX: "left",
            originY: "top",
          },
          {
            id: "txt-badge",
            type: "textbox",
            left: 124,
            top: 132,
            width: 150,
            fontSize: 18,
            fontFamily: "Outfit",
            fontWeight: 700,
            fill: "#ffffff",
            text: "ESTRATEGIA B2B",
            originX: "left",
            originY: "top",
          },
          {
            id: "txt-headline",
            type: "textbox",
            left: 108,
            top: 220,
            width: 864,
            fontSize: 62,
            lineHeight: 1.15,
            fontFamily: "Outfit",
            fontWeight: 800,
            fill: "#ffffff",
            text: "3 Errores Críticos que Arruinan tu Prospección en LinkedIn",
            originX: "left",
            originY: "top",
          },
          {
            id: "txt-sub",
            type: "textbox",
            left: 108,
            top: 480,
            width: 864,
            fontSize: 32,
            lineHeight: 1.35,
            fontFamily: "Outfit",
            fontWeight: 400,
            fill: "#94a3b8",
            text: "Y el método exacto para generar +15 reuniones al mes sin quemar tu perfil ni parecer spam.",
            originX: "left",
            originY: "top",
          },
          {
            id: "rect-card",
            type: "rect",
            left: 108,
            top: 660,
            width: 864,
            height: 480,
            rx: 24,
            ry: 24,
            fill: "#131c2e",
            stroke: "#1e293b",
            strokeWidth: 2,
            originX: "left",
            originY: "top",
          },
          {
            id: "txt-bullet1",
            type: "textbox",
            left: 156,
            top: 720,
            width: 768,
            fontSize: 28,
            fontFamily: "Outfit",
            fontWeight: 600,
            fill: "#f87171",
            text: "❌ 1. Enviar pitch comercial en el primer mensaje de conexión.",
            originX: "left",
            originY: "top",
          },
          {
            id: "txt-bullet2",
            type: "textbox",
            left: 156,
            top: 840,
            width: 768,
            fontSize: 28,
            fontFamily: "Outfit",
            fontWeight: 600,
            fill: "#f87171",
            text: "❌ 2. Prospectar sin investigar las señales de intención del lead.",
            originX: "left",
            originY: "top",
          },
          {
            id: "txt-bullet3",
            type: "textbox",
            left: 156,
            top: 960,
            width: 768,
            fontSize: 28,
            fontFamily: "Outfit",
            fontWeight: 700,
            fill: "#38bdf8",
            text: "✅ 3. El cambio: Interactuar con su contenido antes de invitar.",
            originX: "left",
            originY: "top",
          },
        ],
      },
    ],
  };

  // Template 2: Anuncio / Lanzamiento Estratégico (Cuadrada 1:1 - 1200 x 1200 px)
  const doc2: DoryDocument = {
    schemaVersion: 1,
    width: 1200,
    height: 1200,
    unit: "px",
    pages: [
      {
        id: "page-1",
        background: { type: "solid", color: "#0066cc" },
        objects: [
          {
            id: "rect-badge-2",
            type: "rect",
            left: 90,
            top: 100,
            width: 220,
            height: 46,
            rx: 8,
            ry: 8,
            fill: "#ffffff",
            originX: "left",
            originY: "top",
          },
          {
            id: "txt-badge-2",
            type: "textbox",
            left: 108,
            top: 112,
            width: 190,
            fontSize: 18,
            fontFamily: "Outfit",
            fontWeight: 800,
            fill: "#0066cc",
            text: "NUEVO FRAMEWORK",
            originX: "left",
            originY: "top",
          },
          {
            id: "txt-headline-2",
            type: "textbox",
            left: 90,
            top: 210,
            width: 900,
            fontSize: 68,
            lineHeight: 1.12,
            fontFamily: "Outfit",
            fontWeight: 800,
            fill: "#ffffff",
            text: "Social Selling Suite para Equipos B2B",
            originX: "left",
            originY: "top",
          },
          {
            id: "txt-sub-2",
            type: "textbox",
            left: 90,
            top: 480,
            width: 900,
            fontSize: 34,
            lineHeight: 1.35,
            fontFamily: "Outfit",
            fontWeight: 400,
            fill: "#e0f2fe",
            text: "Automatiza la interacción, modela posts virales con IA y agenda reuniones sin fricción.",
            originX: "left",
            originY: "top",
          },
          {
            id: "rect-cta",
            type: "rect",
            left: 90,
            top: 760,
            width: 380,
            height: 80,
            rx: 40,
            ry: 40,
            fill: "#ffffff",
            originX: "left",
            originY: "top",
          },
          {
            id: "txt-cta",
            type: "textbox",
            left: 130,
            top: 785,
            width: 300,
            fontSize: 24,
            fontFamily: "Outfit",
            fontWeight: 800,
            fill: "#0066cc",
            text: "Comienza Gratis →",
            originX: "left",
            originY: "top",
          },
        ],
      },
    ],
  };

  // Template 3: Post de Análisis / Reporte B2B (Horizontal 1.91:1 - 1200 x 627 px)
  const doc3: DoryDocument = {
    schemaVersion: 1,
    width: 1200,
    height: 627,
    unit: "px",
    pages: [
      {
        id: "page-1",
        background: { type: "solid", color: "#0f172a" },
        objects: [
          {
            id: "rect-badge-h",
            type: "rect",
            left: 80,
            top: 70,
            width: 200,
            height: 38,
            rx: 19,
            ry: 19,
            fill: "#0099ff",
            originX: "left",
            originY: "top",
          },
          {
            id: "txt-badge-h",
            type: "textbox",
            left: 96,
            top: 80,
            width: 170,
            fontSize: 16,
            fontFamily: "Outfit",
            fontWeight: 700,
            fill: "#ffffff",
            text: "REPORTE B2B",
            originX: "left",
            originY: "top",
          },
          {
            id: "txt-headline-h",
            type: "textbox",
            left: 80,
            top: 135,
            width: 1040,
            fontSize: 48,
            lineHeight: 1.15,
            fontFamily: "Outfit",
            fontWeight: 800,
            fill: "#ffffff",
            text: "Benchmark de Conversión en LinkedIn Outreach 2026",
            originX: "left",
            originY: "top",
          },
          {
            id: "txt-sub-h",
            type: "textbox",
            left: 80,
            top: 270,
            width: 1040,
            fontSize: 24,
            lineHeight: 1.3,
            fontFamily: "Outfit",
            fontWeight: 400,
            fill: "#94a3b8",
            text: "Datos extraídos de más de 120,000 interacciones multicanal B2B en el ecosistema InHubFlow.",
            originX: "left",
            originY: "top",
          },
          {
            id: "rect-metric-h",
            type: "rect",
            left: 80,
            top: 380,
            width: 320,
            height: 160,
            rx: 16,
            ry: 16,
            fill: "#1e293b",
            stroke: "#334155",
            strokeWidth: 2,
            originX: "left",
            originY: "top",
          },
          {
            id: "txt-metric-val-h",
            type: "textbox",
            left: 104,
            top: 404,
            width: 280,
            fontSize: 48,
            fontFamily: "Outfit",
            fontWeight: 800,
            fill: "#38bdf8",
            text: "+42.8%",
            originX: "left",
            originY: "top",
          },
          {
            id: "txt-metric-lbl-h",
            type: "textbox",
            left: 104,
            top: 476,
            width: 280,
            fontSize: 18,
            fontFamily: "Outfit",
            fontWeight: 500,
            fill: "#cbd5e1",
            text: "Tasa de Aceptación con Señales",
            originX: "left",
            originY: "top",
          },
        ],
      },
    ],
  };

  const svgThumb1 = `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 300" width="240" height="300"><rect width="240" height="300" fill="#0b0f19"/><rect x="24" y="24" width="60" height="12" rx="6" fill="#0099ff"/><rect x="24" y="52" width="192" height="40" rx="4" fill="#ffffff"/><rect x="24" y="106" width="160" height="16" rx="3" fill="#94a3b8"/><rect x="24" y="145" width="192" height="120" rx="8" fill="#131c2e" stroke="#1e293b"/></svg>`
  )}`;

  const svgThumb2 = `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240" width="240" height="240"><rect width="240" height="240" fill="#0066cc"/><rect x="24" y="24" width="70" height="12" rx="3" fill="#ffffff"/><rect x="24" y="50" width="192" height="48" rx="4" fill="#ffffff"/><rect x="24" y="112" width="170" height="24" rx="3" fill="#e0f2fe"/><rect x="24" y="170" width="90" height="24" rx="12" fill="#ffffff"/></svg>`
  )}`;

  const svgThumb3 = `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 157" width="300" height="157"><rect width="300" height="157" fill="#0f172a"/><rect x="20" y="20" width="80" height="12" rx="4" fill="#0099ff"/><rect x="20" y="44" width="260" height="36" rx="4" fill="#ffffff"/><rect x="20" y="92" width="200" height="16" rx="3" fill="#94a3b8"/><rect x="20" y="118" width="100" height="20" rx="10" fill="#10b981"/></svg>`
  )}`;

  insert.run({
    id: "tpl_seed_1",
    slug: "post-autoridad-b2b-dark",
    title: "Post de Autoridad B2B (Vertical 4:5)",
    category_id: "autoridad",
    category_name: "Autoridad & Thought Leadership",
    tags_json: JSON.stringify(["b2b", "autoridad", "estrategia", "vertical", "linkedin"]),
    width: 1200,
    height: 1500,
    orientation: "portrait",
    thumbnail_url: svgThumb1,
    document_json: JSON.stringify(doc1),
    created_by: "Sistema InHubFlow",
    use_count: 85,
    is_featured: 1,
  });

  insert.run({
    id: "tpl_seed_2",
    slug: "lanzamiento-estrategico-cuadrado",
    title: "Anuncio / Lanzamiento Estratégico (Cuadrada 1:1)",
    category_id: "anuncios",
    category_name: "Lanzamientos & Ofertas",
    tags_json: JSON.stringify(["anuncio", "lanzamiento", "oferta", "cuadrada", "b2b"]),
    width: 1200,
    height: 1200,
    orientation: "square",
    thumbnail_url: svgThumb2,
    document_json: JSON.stringify(doc2),
    created_by: "Sistema InHubFlow",
    use_count: 64,
    is_featured: 1,
  });

  insert.run({
    id: "tpl_seed_3",
    slug: "reporte-benchmark-horizontal",
    title: "Reporte / Análisis de Tendencias B2B (Horizontal 1.91:1)",
    category_id: "autoridad",
    category_name: "Autoridad & Thought Leadership",
    tags_json: JSON.stringify(["reporte", "benchmark", "estadisticas", "horizontal", "b2b"]),
    width: 1200,
    height: 627,
    orientation: "landscape",
    thumbnail_url: svgThumb3,
    document_json: JSON.stringify(doc3),
    created_by: "Sistema InHubFlow",
    use_count: 51,
    is_featured: 1,
  });
}

export function getTemplateCategories(): TemplateCategory[] {
  ensureTableAndSeed();
  const db = getSocialSellingDb();

  const rows = db.prepare(`
    SELECT category_id as id, category_name as name, COUNT(*) as template_count
    FROM global_templates
    GROUP BY category_id, category_name
    ORDER BY template_count DESC
  `).all() as { id: string; name: string; template_count: number }[];

  const map = new Map<string, { id: string; slug: string; name: string; count: number }>();
  
  // Base default categories
  for (const c of DEFAULT_CATEGORIES) {
    map.set(c.slug, { id: c.id, slug: c.slug, name: c.name, count: 0 });
  }

  // Populate counts from DB
  for (const r of rows) {
    const slug = r.id.replace(/^cat-/, "");
    map.set(slug, {
      id: r.id.startsWith("cat-") ? r.id : `cat-${r.id}`,
      slug,
      name: r.name,
      count: r.template_count,
    });
  }

  return Array.from(map.values()).map((c, i) => ({
    id: c.id,
    slug: c.slug,
    name: c.name,
    icon: "",
    template_count: c.count,
    sort_order: i,
  }));
}

export function listGlobalTemplates(q: TemplateQuery = {}): Page<TemplateSummary> {
  ensureTableAndSeed();
  const db = getSocialSellingDb();

  const pageNum = Math.max(1, q.page || 1);
  const pageSize = Math.min(100, Math.max(1, q.page_size || 24));
  const offset = (pageNum - 1) * pageSize;

  const conditions: string[] = [];
  const params: Record<string, any> = {};

  if (q.category && q.category !== "all") {
    conditions.push("(category_id = @cat OR category_id = @catPref)");
    params.cat = q.category.replace(/^cat-/, "");
    params.catPref = `cat-${params.cat}`;
  }

  if (q.orientation) {
    conditions.push("orientation = @orientation");
    params.orientation = q.orientation;
  }

  if (q.q) {
    conditions.push("(LOWER(title) LIKE @search OR LOWER(tags_json) LIKE @search)");
    params.search = `%${q.q.trim().toLowerCase()}%`;
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const countRow = db.prepare(`SELECT COUNT(*) as count FROM global_templates ${whereClause}`).get(params) as { count: number };
  const total = countRow.count;

  const rows = db.prepare(`
    SELECT * FROM global_templates
    ${whereClause}
    ORDER BY is_featured DESC, created_at DESC
    LIMIT @limit OFFSET @offset
  `).all({ ...params, limit: pageSize, offset }) as GlobalTemplateRow[];

  const results: TemplateSummary[] = rows.map((r, index) => {
    let tags: string[] = [];
    try {
      tags = JSON.parse(r.tags_json);
    } catch {}

    return {
      id: r.id,
      slug: r.slug,
      title: r.title,
      category: {
        id: r.category_id,
        slug: r.category_id.replace(/^cat-/, ""),
        name: r.category_name,
      },
      tags,
      width: r.width,
      height: r.height,
      orientation: r.orientation,
      preset: "",
      page_count: 1,
      thumbnail_url: r.thumbnail_url,
      is_featured: Boolean(r.is_featured),
      use_count: r.use_count,
      created_at: r.created_at,
    };
  });

  return {
    count: total,
    next: offset + pageSize < total ? String(pageNum + 1) : null,
    previous: pageNum > 1 ? String(pageNum - 1) : null,
    results,
  };
}

export function getGlobalTemplateBySlug(slug: string): TemplateDetail | null {
  ensureTableAndSeed();
  const db = getSocialSellingDb();

  const row = db.prepare("SELECT * FROM global_templates WHERE slug = ?").get(slug) as GlobalTemplateRow | undefined;
  if (!row) return null;

  let tags: string[] = [];
  try {
    tags = JSON.parse(row.tags_json);
  } catch {}

  let document: DoryDocument;
  try {
    document = JSON.parse(row.document_json);
  } catch {
    throw new Error("El documento de la plantilla está dañado");
  }

  // Increment use_count
  db.prepare("UPDATE global_templates SET use_count = use_count + 1 WHERE id = ?").run(row.id);

  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    description: `Plantilla global creada por ${row.created_by || "Super Admin"}`,
    category: {
      id: row.category_id,
      slug: row.category_id.replace(/^cat-/, ""),
      name: row.category_name,
    },
    tags,
    width: row.width,
    height: row.height,
    orientation: row.orientation,
    preset: "",
    page_count: document.pages.length || 1,
    thumbnail_url: row.thumbnail_url,
    is_featured: Boolean(row.is_featured),
    use_count: row.use_count + 1,
    created_at: row.created_at,
    document,
  };
}

export function saveGlobalTemplate(input: SaveGlobalTemplateInput): TemplateDetail {
  ensureTableAndSeed();
  const db = getSocialSellingDb();

  const id = `tpl_${newId()}`;
  const baseSlug = slugify(input.title) || "plantilla-b2b";
  const uniqueSlug = `${baseSlug}-${Date.now().toString(36)}`;

  const categorySlug = (input.category || "general").replace(/^cat-/, "");
  const categoryName =
    input.categoryName ||
    DEFAULT_CATEGORIES.find((c) => c.slug === categorySlug)?.name ||
    "General B2B";

  const orientation = input.orientation || (input.width === input.height ? "square" : input.width > input.height ? "landscape" : "portrait");

  const rowData = {
    id,
    slug: uniqueSlug,
    title: input.title.trim(),
    category_id: categorySlug,
    category_name: categoryName,
    tags_json: JSON.stringify(input.tags || ["b2b", "plantilla"]),
    width: input.width,
    height: input.height,
    orientation,
    thumbnail_url: input.thumbnailUrl || null,
    document_json: JSON.stringify(input.document),
    created_by: input.createdBy || "Super Admin",
    use_count: 0,
    is_featured: 1,
  };

  db.prepare(`
    INSERT INTO global_templates (
      id, slug, title, category_id, category_name, tags_json, width, height, orientation, thumbnail_url, document_json, created_by, use_count, is_featured
    ) VALUES (
      @id, @slug, @title, @category_id, @category_name, @tags_json, @width, @height, @orientation, @thumbnail_url, @document_json, @created_by, @use_count, @is_featured
    )
  `).run(rowData);

  return {
    id,
    slug: uniqueSlug,
    title: rowData.title,
    description: `Plantilla global creada por ${rowData.created_by}`,
    category: {
      id: rowData.category_id,
      slug: rowData.category_id,
      name: rowData.category_name,
    },
    tags: input.tags || ["b2b", "plantilla"],
    width: rowData.width,
    height: rowData.height,
    orientation,
    preset: "",
    page_count: input.document.pages.length || 1,
    thumbnail_url: rowData.thumbnail_url,
    is_featured: true,
    use_count: 0,
    created_at: new Date().toISOString(),
    document: input.document,
  };
}

export function deleteGlobalTemplate(slugOrId: string): boolean {
  ensureTableAndSeed();
  const db = getSocialSellingDb();

  const res = db.prepare("DELETE FROM global_templates WHERE slug = ? OR id = ?").run(slugOrId, slugOrId);
  return res.changes > 0;
}
