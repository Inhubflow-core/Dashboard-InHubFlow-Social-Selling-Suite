import { NextRequest, NextResponse } from 'next/server';
import { unipile } from '@/lib/unipile/client';

export interface CompetitorSearchResult {
  id: string;
  name: string;
  linkedinUrl: string;
  headline?: string;
  industry?: string;
  location?: string;
  logoUrl?: string;
  followers?: string;
  type: 'company' | 'person';
}

function normalizeSearchText(value: string): string {
  return value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLocaleLowerCase().trim();
}

function resultMatchesQuery(item: CompetitorSearchResult, query: string): boolean {
  const normalizedQuery = normalizeSearchText(query);
  const searchableText = normalizeSearchText(
    [item.name, item.headline, item.industry, item.location].filter(Boolean).join(" ")
  );
  const queryTokens = normalizedQuery.split(/\s+/).filter(Boolean);
  return normalizedQuery.length > 0 && queryTokens.every((token) => searchableText.includes(token));
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const query = (searchParams.get('query') || searchParams.get('q') || '').trim();
    const accountId = searchParams.get('accountId') || '';
    const category = searchParams.get('category') || 'all'; // 'all' | 'companies' | 'people'

    if (!query || query.length < 2) {
      return NextResponse.json({ items: [] });
    }

    // 1. Limpieza rigurosa de accountId (remover prefijos internos acc-li-)
    let cleanAccountId = (accountId || '').replace(/^acc-li-/, '').trim();

    // 2. Si Unipile está configurado, verificar el estado de la cuenta provista o autodescubrir la cuenta con status OK
    if (unipile.isConfigured()) {
      try {
        const list = await unipile.listAccounts();
        const linkedinAccounts = (list.items || []).filter(
          (a: any) => String(a.type || a.provider || '').toUpperCase() === 'LINKEDIN'
        );
        const healthyAccounts = linkedinAccounts.filter(
          (a: any) => a.status === 'OK' || a.status === 'CONNECTED'
        );

        // Si la cuenta solicitada está activa y conectada, la usamos; de lo contrario, seleccionamos automáticamente la activa en OK
        const isRequestedHealthy = cleanAccountId && healthyAccounts.some((a: any) => a.id === cleanAccountId);
        if (!isRequestedHealthy) {
          if (healthyAccounts.length > 0) {
            cleanAccountId = healthyAccounts[0].id;
          } else if (linkedinAccounts.length > 0) {
            cleanAccountId = linkedinAccounts[0].id;
          }
        }
      } catch (e) {
        console.warn('[CompetitorsSearch] Error verificando cuentas Unipile:', e);
      }
    }

    // Nunca ofrecer resultados ficticios como si provinieran de LinkedIn.
    if (!unipile.isConfigured()) {
      return NextResponse.json({ items: [], source: 'unavailable', reason: 'unipile_not_configured' });
    }
    if (!cleanAccountId) {
      return NextResponse.json({ items: [], source: 'unavailable', reason: 'linkedin_account_not_connected' });
    }

    // 3. Ejecutar búsqueda en vivo en LinkedIn a través de Unipile
    if (unipile.isConfigured() && cleanAccountId) {
      try {
        const promises: Promise<any>[] = [];

        if (category === 'all' || category === 'companies') {
          promises.push(
            unipile.searchLinkedIn({
              account_id: cleanAccountId,
              category: 'companies',
              keywords: query,
              limit: 12,
            }).catch((err) => {
              console.warn('[CompetitorsSearch] Error en búsqueda de empresas en Unipile:', err);
              return null;
            })
          );
        }

        if (category === 'all' || category === 'people') {
          promises.push(
            unipile.searchLinkedIn({
              account_id: cleanAccountId,
              category: 'people',
              keywords: query,
              limit: 12,
            }).catch((err) => {
              console.warn('[CompetitorsSearch] Error en búsqueda de personas en Unipile:', err);
              return null;
            })
          );
        }

        const results = await Promise.all(promises);
        const liveItems: CompetitorSearchResult[] = [];
        const companiesOffset = category === 'all' || category === 'companies' ? 0 : -1;
        const peopleOffset = category === 'all' ? 1 : category === 'people' ? 0 : -1;

        // Enriquecer los resultados de empresa con su perfil publico real de LinkedIn.
        const companiesRes = companiesOffset < 0 ? null : results[companiesOffset];
        if (companiesRes && Array.isArray(companiesRes.items)) {
          const companyItems = await Promise.all(companiesRes.items.map(async (item: any, idx: number) => {
            if (!item || (!item.name && item.type !== 'COMPANY')) return null;
            const identifier = item.public_identifier || item.universal_name || item.id;
            let profile: Record<string, any> = {};
            if (identifier) {
              try {
                profile = await unipile.getCompanyProfile({ account_id: cleanAccountId, identifier });
              } catch (error) {
                console.warn(`[CompetitorsSearch] No se pudo enriquecer empresa ${identifier}:`, error);
              }
            }
            const linkedinUrl = profile.profile_url || item.profile_url || item.public_profile_url ||
              (profile.public_identifier || item.public_identifier || item.universal_name
                ? `https://www.linkedin.com/company/${profile.public_identifier || item.public_identifier || item.universal_name}/`
                : '');
            if (!linkedinUrl) return null;
            return {
              id: String(item.id || profile.id || `comp-live-${idx}`),
              name: String(profile.name || item.name || ''),
              linkedinUrl,
              logoUrl: profile.logo || profile.logo_url || item.logo || item.logo_url || item.profile_picture_url || item.picture_url || undefined,
              headline: profile.description || item.summary || item.headline || item.tagline || item.industry || undefined,
              industry: profile.industry || item.industry || undefined,
              location: item.location || undefined,
              followers: item.followers_count ? `${item.followers_count} seguidores` : (item.headcount ? `${item.headcount} empleados` : undefined),
              type: 'company' as const,
            };
          }));
          liveItems.push(...companyItems.filter((item): item is CompetitorSearchResult => Boolean(item)));
        }

        // Procesar personas desde Unipile
        const peopleRes = results[peopleOffset];
        if (peopleRes && Array.isArray(peopleRes.items)) {
          peopleRes.items.forEach((item: any, idx: number) => {
            if (!item || (!item.name && item.type !== 'PEOPLE')) return;
            const personSlug = item.public_identifier || (item.name ? item.name.toLowerCase().replace(/[^a-z0-9]/g, '-') : `person-${idx}`);
            const linkedinUrl =
              item.public_profile_url ||
              item.profile_url ||
              `https://www.linkedin.com/in/${personSlug}`;

            // Unipile entrega la foto real de perfil en 'profile_picture_url' o 'profile_picture_url_large'
            const logoUrl =
              item.profile_picture_url ||
              item.profile_picture_url_large ||
              item.picture_url ||
              item.logo ||
              undefined;

            let displayName = item.name || 'Profesional de LinkedIn';
            if (displayName === 'Usuário do LinkedIn' || displayName === 'LinkedIn Member') {
              if (item.headline && item.headline !== '--') {
                const parts = item.headline.split('|');
                displayName = parts[0]?.trim() || displayName;
              }
            }

            if (!linkedinUrl || displayName === 'Profesional de LinkedIn') return;
            liveItems.push({
              id: item.id || `person-live-${idx}`,
              name: displayName,
              linkedinUrl,
              logoUrl,
              headline: item.headline && item.headline !== '--' ? item.headline : undefined,
              industry: item.industry || undefined,
              location: item.location || undefined,
              followers: item.network_distance ? `${item.network_distance.replace(/_/g, ' ')}` : undefined,
              type: 'person',
            });
          });
        }

        // Unipile ya aplica la relevancia de LinkedIn. El filtro local solo se usa
        // para ordenar coincidencias exactas; no se descartan resultados válidos
        // cuyo nombre no contiene literalmente todos los tokens (por ejemplo,
        // resultados de empresa con el término en su descripción).
        const normalizedQuery = normalizeSearchText(query);
        liveItems.sort((a, b) => {
          const aExact = normalizeSearchText(a.name) === normalizedQuery ? 1 : 0;
          const bExact = normalizeSearchText(b.name) === normalizedQuery ? 1 : 0;
          const aMatch = resultMatchesQuery(a, query) ? 1 : 0;
          const bMatch = resultMatchesQuery(b, query) ? 1 : 0;
          return bExact - aExact || bMatch - aMatch;
        });
        return NextResponse.json({ items: liveItems, source: 'unipile_live' });
      } catch (liveErr) {
        console.error('[CompetitorsSearch] Error en búsqueda real de LinkedIn:', liveErr);
        return NextResponse.json({ items: [], source: 'error', reason: 'linkedin_search_failed' }, { status: 502 });
      }
    }

    return NextResponse.json({ items: [], source: 'unavailable', reason: 'linkedin_account_not_connected' });
  } catch (err: any) {
    console.error('[CompetitorsSearch] Error general:', err);
    return NextResponse.json({ items: [] }, { status: 500 });
  }
}
