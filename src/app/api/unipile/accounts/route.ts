import { NextRequest, NextResponse } from 'next/server';
import { unipile } from '@/lib/unipile/client';
import type { ConnectedLinkedInAccount } from '@/lib/unipile/types';

export async function GET() {
  try {
    if (!unipile.isConfigured()) {
      return NextResponse.json({
        configured: false,
        items: [],
        accounts: [],
      });
    }

    const res = await unipile.listAccounts();
    const linkedinAccounts = (res.items || []).filter(
      (acc) => String(acc.type || acc.provider || '').toUpperCase() === 'LINKEDIN'
    );

    const mappedAccounts: ConnectedLinkedInAccount[] = await Promise.all(
      linkedinAccounts.map(async (acc) => {
        const im = (acc.connection_params as Record<string, any>)?.im;
        const statusSource = acc.sources?.find((s) => s.id?.includes('MESSAGING')) || acc.sources?.[0];
        const rawStatus = (statusSource?.status || acc.status || 'OK').toUpperCase();
        const status: ConnectedLinkedInAccount['status'] =
          rawStatus === 'OK' ? 'OK' :
          rawStatus === 'CHECKPOINT' ? 'CHECKPOINT' :
          rawStatus === 'STOPPED' ? 'STOPPED' :
          rawStatus === 'CONNECTING' ? 'CONNECTING' :
          rawStatus === 'CREDENTIALS' ? 'CREDENTIALS' : 'ERROR';

        let name = acc.name || im?.username || 'Cuenta LinkedIn';
        let email = im?.username && im.username.includes('@') ? im.username : undefined;
        let headline = 'Perfil LinkedIn Conectado';
        let publicProfileUrl = im?.publicIdentifier ? `https://www.linkedin.com/in/${im.publicIdentifier}` : undefined;
        let profilePictureUrl = '/images/user/owner.png';

        try {
          const profile = await unipile.getOwnProfile(acc.id);
          if (profile) {
            const fullName = `${profile.first_name || ''} ${profile.last_name || ''}`.trim();
            if (fullName) name = fullName;
            if ((profile as any).occupation || profile.headline) {
              headline = ((profile as any).occupation || profile.headline || headline).trim();
            }
            if ((profile as any).email) {
              email = (profile as any).email;
            }
            if (profile.public_identifier) {
              publicProfileUrl = `https://www.linkedin.com/in/${profile.public_identifier}`;
            }
            if (profile.profile_picture_url || (profile as any).picture_url) {
              profilePictureUrl = profile.profile_picture_url || (profile as any).picture_url || profilePictureUrl;
            }
          }
        } catch {
          // Si el perfil no se puede consultar de inmediato, mantener los datos base de la cuenta
        }

        const isCashgrow =
          acc.id === "7VSGKBGlTNGRbzZKuh6VpQ" ||
          (email && email.toLowerCase().includes("cashgrow")) ||
          name.toLowerCase().includes("cashgrow") ||
          name.toLowerCase().includes("lynn") ||
          name.toLowerCase().includes("linn");

        if (isCashgrow) {
          name = "ADS CASHGROW";
          email = "ads.cashgrow.app@gmail.com";
          headline = "Gerente de vendas da empresa ADS CASHGROW";
        }

        return {
          id: isCashgrow ? `acc-li-7VSGKBGlTNGRbzZKuh6VpQ` : `acc-li-${acc.id}`,
          unipileAccountId: acc.id,
          name,
          email,
          headline,
          publicProfileUrl,
          profilePictureUrl,
          status,
          authMode: (im?.connection_method === 'credentials' ? 'credentials' : 'hosted') as ConnectedLinkedInAccount['authMode'],
          connectedAt: acc.created_at || new Date().toISOString(),
          lastSyncAt: 'Sincronizado con InHubFlow Cloud',
          dailyActionsCount: {
            invitationsSent: 0,
            messagesSent: 0,
            profilesVisited: 0,
          },
          daily_connection_limit: 20,
          daily_message_limit: 20,
          daily_visit_limit: 20,
          active_hours_start: 9,
          active_hours_end: 18,
          timezone: 'Europe/Madrid',
          working_days: '1,2,3,4,5',
          ownerId: "usr-client-roberto-agencia",
          assignedUserId: isCashgrow ? "usr-team-lynn-01" : undefined,
          assignedUserName: isCashgrow ? "ADS CASHGROW (Team)" : undefined,
        };
      })
    );

    // Deduplicación inteligente por identidad: Si Unipile reporta múltiples cuentas para la misma persona/perfil
    // (por ejemplo, una sesión vieja caída en STOPPED/CREDENTIALS y una nueva reconectada en OK),
    // priorizar la que esté en OK y descartar/purgar la zombi obsoleta.
    const norm = (s?: string) => (s || "").trim().toLowerCase().replace(/[^a-z0-9]/g, "");
    const deduplicatedAccounts: ConnectedLinkedInAccount[] = [];

    for (const acc of mappedAccounts) {
      const accEmail = acc.email?.trim().toLowerCase();
      const accNormName = norm(acc.name);

      const existingIndex = deduplicatedAccounts.findIndex((d) => {
        const dEmail = d.email?.trim().toLowerCase();
        const dNormName = norm(d.name);
        if (accEmail && dEmail && accEmail === dEmail) return true;
        if (accNormName && dNormName && accNormName === dNormName) return true;
        return false;
      });

      if (existingIndex === -1) {
        deduplicatedAccounts.push(acc);
      } else {
        const existing = deduplicatedAccounts[existingIndex];
        // Si la nueva está OK y la existente no, reemplazarla y purgar la cuenta huérfana de Unipile
        if (acc.status === 'OK' && existing.status !== 'OK') {
          if (!existing.unipileAccountId.startsWith('demo-')) {
            unipile.deleteAccount(existing.unipileAccountId).catch(() => {});
          }
          deduplicatedAccounts[existingIndex] = acc;
        } else if (existing.status === 'OK' && acc.status !== 'OK') {
          // La existente ya está OK, purgar la que llegó con error
          if (!acc.unipileAccountId.startsWith('demo-')) {
            unipile.deleteAccount(acc.unipileAccountId).catch(() => {});
          }
        } else {
          // Si ambas tienen el mismo estado, conservar la más reciente
          const accTime = new Date(acc.connectedAt).getTime() || 0;
          const existTime = new Date(existing.connectedAt).getTime() || 0;
          if (accTime >= existTime) {
            deduplicatedAccounts[existingIndex] = acc;
          }
        }
      }
    }

    // Ordenar de forma determinista para que la cuenta principal de Roberto OrSe siempre encabece el listado
    const isRoberto = (a: any) => {
      const name = (a.name || '').toLowerCase();
      const email = (a.email || (a.connection_params as any)?.im?.username || '').toLowerCase();
      return name.includes('roberto') || email.includes('inhubflow');
    };

    linkedinAccounts.sort((a, b) => (isRoberto(b) ? 1 : 0) - (isRoberto(a) ? 1 : 0));
    deduplicatedAccounts.sort((a, b) => (isRoberto(b) ? 1 : 0) - (isRoberto(a) ? 1 : 0));

    return NextResponse.json({
      configured: true,
      items: linkedinAccounts,
      accounts: deduplicatedAccounts,
    });
  } catch (error: unknown) {
    console.error('[api/unipile/accounts] Error listando cuentas:', error);
    return NextResponse.json(
      {
        error: 'No se pudieron consultar las cuentas de LinkedIn',
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
