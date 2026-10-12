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

        return {
          id: `acc-li-${acc.id}`,
          unipileAccountId: acc.id,
          name,
          email,
          headline,
          publicProfileUrl,
          profilePictureUrl,
          status,
          authMode: (im?.connection_method === 'credentials' ? 'credentials' : 'hosted') as ConnectedLinkedInAccount['authMode'],
          connectedAt: acc.created_at || new Date().toISOString(),
          lastSyncAt: 'Sincronizado con Unipile',
          dailyActionsCount: {
            invitationsSent: 0,
            messagesSent: 0,
            profilesVisited: 0,
          },
        };
      })
    );

    return NextResponse.json({
      configured: true,
      items: linkedinAccounts,
      accounts: mappedAccounts,
    });
  } catch (error: unknown) {
    console.error('[api/unipile/accounts] Error listando cuentas:', error);
    return NextResponse.json(
      {
        error: 'No se pudieron consultar las cuentas desde Unipile',
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
