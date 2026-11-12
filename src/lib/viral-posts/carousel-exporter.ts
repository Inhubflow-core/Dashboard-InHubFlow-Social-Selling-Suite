import { jsPDF } from "jspdf";
import type { CarouselSlide } from "./types";

export interface CarouselExportOptions {
  primaryColor?: string;
  authorName?: string;
  authorHandle?: string;
  filename?: string;
}

/**
 * Genera un archivo PDF vectorial y visual optimizado para LinkedIn (carrusel de diapositivas)
 * Formato estándar de LinkedIn: cuadrado (1080x1080 o 210x210mm) o vertical 4:5.
 * Usamos relación cuadrada de alta resolución.
 */
export async function exportCarouselToPdf(
  slides: CarouselSlide[],
  options: CarouselExportOptions = {}
): Promise<void> {
  const primaryColor = options.primaryColor || "#0099ff";
  const authorName = options.authorName || "InHubFlow Social Selling";
  const authorHandle = options.authorHandle || "@inhubflow";
  const filename = options.filename || "InHubFlow_Carrusel_LinkedIn.pdf";

  // Dimensiones en mm (200x200 mm formato cuadrado ideal para LinkedIn)
  const size = 200;
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: [size, size],
  });

  // Convertir color HEX a RGB
  const hexToRgb = (hex: string) => {
    const cleaned = hex.replace("#", "");
    const bigint = parseInt(cleaned, 16);
    return {
      r: (bigint >> 16) & 255,
      g: (bigint >> 8) & 255,
      b: bigint & 255,
    };
  };

  const brandRgb = hexToRgb(primaryColor);

  slides.forEach((slide, index) => {
    if (index > 0) {
      doc.addPage([size, size]);
    }

    // 1. Fondo de la diapositiva
    if (slide.isCover) {
      // Limpiar etiquetas de resalto (** o {}) para PDF vectorial
      const cleanTitle = (slide.title || "")
        .replace(/\*\*/g, "")
        .replace(/__/g, "")
        .replace(/[{}]/g, "");
      const cleanSubtitle = (slide.subtitle || "")
        .replace(/\*\*/g, "")
        .replace(/__/g, "")
        .replace(/[{}]/g, "");

      const layout = slide.coverLayout || "bottom";
      const highlightRgb = slide.highlightColor ? hexToRgb(slide.highlightColor) : { r: 249, g: 115, b: 22 };

      // Fondo base oscuro moderno (#0a122a)
      doc.setFillColor(10, 18, 42);
      doc.rect(0, 0, size, size, "F");

      if (layout === "split_left") {
        // Bloque izquierdo con titular y subtítulo
        doc.setFillColor(15, 23, 42);
        doc.rect(0, 0, 125, size, "F");

        // Acento decorativo
        doc.setFillColor(highlightRgb.r, highlightRgb.g, highlightRgb.b);
        doc.rect(20, 25, 25, 3, "F");

        // Titular
        doc.setTextColor(255, 255, 255);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(22);
        const splitTitle = doc.splitTextToSize(cleanTitle, 95);
        doc.text(splitTitle, 20, 50);

        // Subtítulo
        if (cleanSubtitle) {
          doc.setFont("helvetica", "normal");
          doc.setFontSize(13);
          doc.setTextColor(203, 213, 225);
          const splitSub = doc.splitTextToSize(cleanSubtitle, 95);
          doc.text(splitSub, 20, 110);
        }
      } else if (layout === "split_right") {
        // Bloque derecho con titular y subtítulo
        doc.setFillColor(15, 23, 42);
        doc.rect(75, 0, 125, size, "F");

        // Acento decorativo
        doc.setFillColor(highlightRgb.r, highlightRgb.g, highlightRgb.b);
        doc.rect(90, 25, 25, 3, "F");

        // Titular
        doc.setTextColor(255, 255, 255);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(22);
        const splitTitle = doc.splitTextToSize(cleanTitle, 95);
        doc.text(splitTitle, 90, 50);

        // Subtítulo
        if (cleanSubtitle) {
          doc.setFont("helvetica", "normal");
          doc.setFontSize(13);
          doc.setTextColor(203, 213, 225);
          const splitSub = doc.splitTextToSize(cleanSubtitle, 95);
          doc.text(splitSub, 90, 110);
        }
      } else {
        // "bottom" o default: Bloque inferior con titular centrado
        doc.setFillColor(15, 23, 42);
        doc.rect(0, 85, size, 115, "F");

        // Acento decorativo centrado
        doc.setFillColor(highlightRgb.r, highlightRgb.g, highlightRgb.b);
        doc.rect(85, 95, 30, 3, "F");

        // Titular
        doc.setTextColor(255, 255, 255);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(22);
        const splitTitle = doc.splitTextToSize(cleanTitle, 160);
        doc.text(splitTitle, 100, 115, { align: "center" });

        // Subtítulo
        if (cleanSubtitle) {
          doc.setFont("helvetica", "normal");
          doc.setFontSize(13);
          doc.setTextColor(203, 213, 225);
          const splitSub = doc.splitTextToSize(cleanSubtitle, 150);
          doc.text(splitSub, 100, 145, { align: "center" });
        }
      }

      // Pie de portada con autor y handle
      doc.setFillColor(255, 255, 255);
      doc.rect(20, 175, 160, 0.5, "F");

      doc.setFontSize(11);
      doc.setTextColor(255, 255, 255);
      doc.text(authorName, 20, 185);
      doc.text(authorHandle, 180, 185, { align: "right" });
    } else if (slide.isCta) {
      // Diapositiva final de llamada a la acción (CTA)
      doc.setFillColor(245, 250, 255);
      doc.rect(0, 0, size, size, "F");

      // Borde superior con acento
      doc.setFillColor(brandRgb.r, brandRgb.g, brandRgb.b);
      doc.rect(0, 0, size, 8, "F");

      // Titular del CTA
      doc.setTextColor(brandRgb.r, brandRgb.g, brandRgb.b);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(22);
      const splitTitle = doc.splitTextToSize(slide.title, 160);
      doc.text(splitTitle, 20, 45);

      // Subtítulo
      if (slide.subtitle) {
        doc.setTextColor(71, 84, 103);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(13);
        const splitSub = doc.splitTextToSize(slide.subtitle, 160);
        doc.text(splitSub, 20, 75);
      }

      // Caja central destacada para el Lead Magnet
      doc.setFillColor(brandRgb.r, brandRgb.g, brandRgb.b);
      doc.roundedRect(20, 95, 160, 55, 4, 4, "F");

      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(15);
      doc.text("Llamado a la Accion (CTA):", 30, 112);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(12);
      let ctaY = 125;
      slide.content.forEach((line) => {
        doc.text(line, 30, ctaY);
        ctaY += 8;
      });

      // Pie con autor
      doc.setTextColor(100, 116, 139);
      doc.setFontSize(11);
      doc.text(authorName, 20, 180);
      doc.text(authorHandle, 180, 180, { align: "right" });
    } else {
      // Diapositiva de contenido interior (Cuerpo)
      doc.setFillColor(255, 255, 255);
      doc.rect(0, 0, size, size, "F");

      // Indicador de número de diapositiva
      doc.setFillColor(brandRgb.r, brandRgb.g, brandRgb.b);
      doc.rect(20, 20, 18, 5, "F");

      doc.setTextColor(brandRgb.r, brandRgb.g, brandRgb.b);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.text(`SLIDE 0${slide.slideNumber}`, 45, 24);

      // Titular de la diapositiva
      doc.setTextColor(16, 24, 40);
      doc.setFontSize(20);
      const splitTitle = doc.splitTextToSize(slide.title, 160);
      doc.text(splitTitle, 20, 48);

      // Línea separadora tenue
      doc.setFillColor(230, 235, 245);
      doc.rect(20, 68, 160, 0.5, "F");

      // Puntos de contenido
      doc.setTextColor(51, 65, 85);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(13);

      let bodyY = 82;
      slide.content.forEach((item) => {
        // Viñeta decorativa
        doc.setFillColor(brandRgb.r, brandRgb.g, brandRgb.b);
        doc.circle(23, bodyY - 1.5, 1.5, "F");

        const splitBody = doc.splitTextToSize(item, 150);
        doc.text(splitBody, 30, bodyY);
        bodyY += splitBody.length * 7 + 8;
      });

      // Pie de diapositiva
      doc.setFillColor(241, 245, 249);
      doc.rect(20, 172, 160, 0.5, "F");

      doc.setTextColor(148, 163, 184);
      doc.setFontSize(10);
      doc.text(slide.footerText || authorName, 20, 182);
      doc.text(`${index + 1} / ${slides.length}`, 180, 182, { align: "right" });
    }
  });

  // Guardar archivo PDF
  doc.save(filename);
}
