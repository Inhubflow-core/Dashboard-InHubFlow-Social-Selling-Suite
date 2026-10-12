import { NextRequest, NextResponse } from 'next/server';
import { unipile } from '@/lib/unipile/client';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { name, successUrl, failureUrl, reconnectAccountId } = body;

    const host = req.headers.get('host') || 'localhost:3000';
    const proto = req.headers.get('x-forwarded-proto') || 'https';
    const baseUrl = `${proto}://${host}`;

    if (!unipile.isConfigured()) {
      // Si aún no está configurado con claves en .env, devolvemos enlace simulado seguro para pruebas de interfaz
      return NextResponse.json({
        mock: true,
        url: `https://mock.unipile.com/hosted/linkedin-connect?account=${encodeURIComponent(name || 'linkedin-account')}&redirect=${encodeURIComponent(successUrl || `${baseUrl}/linkedin-accounts?status=success`)}`,
        message: 'Modo demostracion activo: configura UNIPILE_DSN y UNIPILE_API_KEY en variables de entorno para enlaces de produccion.',
      });
    }

    const type = reconnectAccountId ? 'reconnect' : 'create';
    const response = await unipile.getHostedAuthLink({
      type,
      reconnect_account: reconnectAccountId,
      providers: ['LINKEDIN'],
      name: name || undefined,
      success_redirect_url: successUrl || `${baseUrl}/auth/linkedin-callback?status=success`,
      failure_redirect_url: failureUrl || `${baseUrl}/auth/linkedin-callback?status=error`,
      notify_url: `${baseUrl}/api/unipile/webhook`,
    });

    return NextResponse.json({
      url: response.url,
      provider: 'LINKEDIN',
    });
  } catch (error: unknown) {
    console.error('[api/unipile/hosted-link] Error generando enlace Hosted Auth:', error);
    return NextResponse.json(
      {
        error: 'No se pudo generar el enlace seguro de conexion con LinkedIn',
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
