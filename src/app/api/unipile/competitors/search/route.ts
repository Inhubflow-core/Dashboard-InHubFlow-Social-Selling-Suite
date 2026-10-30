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
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase().trim();
}

function cleanUrl(url?: any): string {
  if (!url || typeof url !== 'string') return '';
  const trimmed = url.trim();
  if (trimmed === 'undefined' || trimmed === 'null' || !trimmed.startsWith('http')) return '';
  return trimmed;
}

function isAccountHealthy(acc: any): boolean {
  if (!acc) return false;
  if (acc.status === 'OK' || acc.status === 'CONNECTED') return true;
  if (Array.isArray(acc.sources) && acc.sources.some((s: any) => s.status === 'OK' || s.status === 'CONNECTED')) return true;
  return false;
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
        const healthyAccounts = linkedinAccounts.filter(isAccountHealthy);

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

        // Procesar los resultados de empresa
        const companiesRes = companiesOffset < 0 ? null : results[companiesOffset];
        if (companiesRes && Array.isArray(companiesRes.items)) {
          const companyItems = await Promise.all(
            companiesRes.items.map(async (item: any, idx: number) => {
              if (!item || (!item.name && item.type !== 'COMPANY')) return null;
              const identifier = item.public_identifier || item.universal_name || item.id;
              
              let profile: Record<string, any> = {};
              const existingUrl = cleanUrl(item.profile_url) || cleanUrl(item.public_profile_url);
              const existingLogo = cleanUrl(item.logo) || cleanUrl(item.logo_url) || cleanUrl(item.profile_picture_url) || cleanUrl(item.picture_url);

              // Solo enriquecer con perfil si falta URL o logo
              if ((!existingUrl || !existingLogo) && identifier) {
                try {
                  const profilePromise = unipile.getCompanyProfile({ account_id: cleanAccountId, identifier });
                  const timeoutPromise = new Promise<Record<string, any>>((resolve) => setTimeout(() => resolve({}), 2500));
                  profile = await Promise.race([profilePromise, timeoutPromise]);
                } catch (error) {
                  console.warn(`[CompetitorsSearch] No se pudo enriquecer empresa ${identifier}:`, error);
                }
              }

              let linkedinUrl = cleanUrl(profile.profile_url) || existingUrl;
              if (!linkedinUrl) {
                const slug = profile.public_identifier || item.public_identifier || item.universal_name;
                if (slug && slug !== 'undefined') {
                  linkedinUrl = `https://www.linkedin.com/company/${slug}/`;
                } else if (item.id && item.id !== 'undefined') {
                  linkedinUrl = `https://www.linkedin.com/company/${item.id}/`;
                }
              }
              if (!linkedinUrl) return null;

              const logoUrl =
                cleanUrl(profile.logo) ||
                cleanUrl(profile.logo_url) ||
                existingLogo ||
                undefined;

              const name = String(profile.name || item.name || '').trim();
              if (!name) return null;

              return {
                id: String(item.id || profile.id || `comp-live-${idx}`),
                name,
                linkedinUrl,
                logoUrl,
                headline: profile.description || item.summary || item.headline || item.tagline || item.industry || undefined,
                industry: profile.industry || item.industry || undefined,
                location: item.location || undefined,
                followers: item.followers_count ? `${item.followers_count} seguidores` : (item.headcount ? `${item.headcount} empleados` : undefined),
                type: 'company' as const,
              };
            })
          );
          liveItems.push(...companyItems.filter((item): item is CompetitorSearchResult => Boolean(item)));
        }

        // Procesar personas desde Unipile
        const peopleRes = results[peopleOffset];
        if (peopleRes && Array.isArray(peopleRes.items)) {
          peopleRes.items.forEach((item: any, idx: number) => {
            if (!item || (!item.name && !item.first_name && item.type !== 'PEOPLE')) return;
            const personSlug = item.public_identifier || (item.name ? item.name.toLowerCase().replace(/[^a-z0-9]/g, '-') : `person-${idx}`);
            const linkedinUrl =
              cleanUrl(item.public_profile_url) ||
              cleanUrl(item.profile_url) ||
              `https://www.linkedin.com/in/${personSlug}`;

            const logoUrl =
              cleanUrl(item.profile_picture_url) ||
              cleanUrl(item.profile_picture_url_large) ||
              cleanUrl(item.picture_url) ||
              cleanUrl(item.logo) ||
              undefined;

            let displayName = (item.name || [item.first_name, item.last_name].filter(Boolean).join(' ') || '').trim();
            if (!displayName || displayName === 'Usuário do LinkedIn' || displayName === 'LinkedIn Member' || displayName === 'Usuario de LinkedIn') {
              if (item.headline && item.headline !== '--') {
                const parts = item.headline.split('|');
                displayName = parts[0]?.trim() || displayName || 'Profesional de LinkedIn';
              } else {
                displayName = 'Profesional de LinkedIn';
              }
            }

            if (!linkedinUrl) return;
            liveItems.push({
              id: item.id || `person-live-${idx}`,
              name: displayName,
              linkedinUrl,
              logoUrl,
              headline: item.headline && item.headline !== '--' ? item.headline : undefined,
              industry: item.industry || undefined,
              location: item.location || undefined,
              followers: item.network_distance ? `${item.network_distance.replace(/_/g, ' ')}` : (item.followers_count ? `${item.followers_count} seguidores` : undefined),
              type: 'person' as const,
            });
          });
        }

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

