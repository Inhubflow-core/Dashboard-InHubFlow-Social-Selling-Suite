// Catálogo curado de avatares fotográficos profesionales de alta resolución (estilo InHubFlow B2B)
export const PROFESSIONAL_PERSON_AVATARS: string[] = [
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80", // Hombre ejecutivo 1
  "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80", // Mujer ejecutiva 1
  "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80", // Hombre ejecutivo 2
  "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80", // Mujer ejecutiva 2
  "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80", // Hombre ejecutivo 3
  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80", // Mujer ejecutiva 3
  "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80", // Hombre ejecutivo 4
  "https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=150&auto=format&fit=crop&q=80", // Mujer ejecutiva 4
  "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=150&auto=format&fit=crop&q=80", // Hombre ejecutivo 5
  "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80", // Mujer ejecutiva 5
  "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&auto=format&fit=crop&q=80", // Hombre ejecutivo 6
  "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80", // Mujer ejecutiva 6
  "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150&auto=format&fit=crop&q=80", // Hombre ejecutivo 7
  "https://images.unsplash.com/photo-1568602471122-7832951cc4c5?w=150&auto=format&fit=crop&q=80", // Hombre ejecutivo 8
  "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80", // Hombre ejecutivo 9
];

const FEMALE_NAMES = new Set([
  "mariana",
  "lucia",
  "luciana",
  "debora",
  "marcela",
  "nathalia",
  "valeria",
  "elena",
  "sofia",
  "patricia",
  "alejandra",
  "laura",
  "camila",
  "ana",
  "beatriz",
  "carolina",
  "gabriela",
  "juliana",
  "fernanda",
  "daniela",
]);

const FEMALE_AVATARS = [
  "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=150&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80",
];

const MALE_AVATARS = [
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=150&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1568602471122-7832951cc4c5?w=150&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80",
];

/**
 * Retorna la URL oficial de LinkedIn si existe, o un avatar profesional determinista
 * idéntico al estándar visual de InHubFlow Outreach B2B Suite (#b2b).
 */
export function getPersonAvatarUrl(fullName: string, existingAvatar?: string): string {
  if (existingAvatar && existingAvatar.trim().length > 10) {
    return existingAvatar.trim();
  }

  const cleanName = (fullName || "Prospecto").trim();
  const firstName = cleanName.split(" ")[0].toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  let hash = 0;
  for (let i = 0; i < cleanName.length; i++) {
    hash = (hash << 5) - hash + cleanName.charCodeAt(i);
    hash |= 0;
  }

  if (FEMALE_NAMES.has(firstName)) {
    const idx = Math.abs(hash) % FEMALE_AVATARS.length;
    return FEMALE_AVATARS[idx];
  }

  const idx = Math.abs(hash) % MALE_AVATARS.length;
  return MALE_AVATARS[idx];
}
