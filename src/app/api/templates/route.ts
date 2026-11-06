import { NextRequest, NextResponse } from "next/server";
import {
  getTemplateCategories,
  getGlobalTemplateBySlug,
  listGlobalTemplates,
  saveGlobalTemplate,
  deleteGlobalTemplate,
} from "@/lib/templates/globalTemplatesRepo";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const action = searchParams.get("action");
  const slug = searchParams.get("slug");

  try {
    if (action === "categories") {
      const categories = getTemplateCategories();
      return NextResponse.json({ categories });
    }

    if (slug) {
      const template = getGlobalTemplateBySlug(slug);
      if (!template) {
        return NextResponse.json(
          { error: "Plantilla no encontrada" },
          { status: 404 }
        );
      }
      return NextResponse.json({ template });
    }

    const page = parseInt(searchParams.get("page") || "1", 10);
    const pageSize = parseInt(searchParams.get("page_size") || "24", 10);
    const q = searchParams.get("q") || undefined;
    const category = searchParams.get("category") || undefined;
    const orientation = searchParams.get("orientation") as any || undefined;

    const list = listGlobalTemplates({
      page,
      page_size: pageSize,
      q,
      category,
      orientation,
    });

    return NextResponse.json(list);
  } catch (error: any) {
    console.error("[Templates API] GET Error:", error);
    return NextResponse.json(
      { error: error.message || "Error al procesar plantillas" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { title, document, width, height, category, categoryName, tags, orientation, thumbnailUrl, createdBy } = body;

    if (!title || !title.trim()) {
      return NextResponse.json(
        { error: "El título de la plantilla es obligatorio." },
        { status: 400 }
      );
    }

    if (!document || !document.pages || document.pages.length === 0) {
      return NextResponse.json(
        { error: "El documento de la plantilla está vacío o no es válido." },
        { status: 400 }
      );
    }

    const template = saveGlobalTemplate({
      title: title.trim(),
      category: category || "general",
      categoryName: categoryName || undefined,
      tags: Array.isArray(tags) ? tags : ["b2b", "plantilla"],
      width: Number(width) || document.width || 1080,
      height: Number(height) || document.height || 1350,
      orientation: orientation || (width === height ? "square" : "portrait"),
      thumbnailUrl: thumbnailUrl || null,
      document,
      createdBy: createdBy || "Super Admin",
    });

    return NextResponse.json({
      success: true,
      message: "¡Plantilla global guardada con éxito!",
      template,
    });
  } catch (error: any) {
    console.error("[Templates API] POST Error:", error);
    return NextResponse.json(
      { error: error.message || "Error al guardar plantilla global" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const slug = searchParams.get("slug") || searchParams.get("id");

  if (!slug) {
    return NextResponse.json(
      { error: "Se requiere slug o id de la plantilla a eliminar." },
      { status: 400 }
    );
  }

  try {
    const deleted = deleteGlobalTemplate(slug);
    if (!deleted) {
      return NextResponse.json(
        { error: "Plantilla no encontrada o ya eliminada." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Plantilla global eliminada correctamente.",
    });
  } catch (error: any) {
    console.error("[Templates API] DELETE Error:", error);
    return NextResponse.json(
      { error: error.message || "Error al eliminar plantilla" },
      { status: 500 }
    );
  }
}
