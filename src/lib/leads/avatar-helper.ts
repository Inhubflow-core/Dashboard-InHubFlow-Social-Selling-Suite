/**
 * Utilidades para manejo de avatares de prospectos.
 * Se eliminaron todas las fotos falsas de stock (Unsplash).
 * Solo se admiten URLs reales de LinkedIn (media.licdn.com, google/gstatic, etc.)
 * o fallback a iniciales con estilo institucional idéntico a #b2b.
 */

export function getPersonAvatarUrl(fullName: string, existingAvatar?: string): string {
  if (existingAvatar && typeof existingAvatar === "string") {
    const clean = existingAvatar.trim();
    // Descartar URLs de fotos fake de stock
    if (clean.includes("unsplash.com")) {
      return "";
    }
    if (clean.length > 5) {
      return clean;
    }
  }
  return "";
}

export { getProspectAvatarColor, getProspectInitials } from "@/components/leads/ProspectAvatar";
