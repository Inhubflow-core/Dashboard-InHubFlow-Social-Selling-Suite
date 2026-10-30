import { NextResponse } from 'next/server';
import { unipile } from '@/lib/unipile/client';

export async function GET() {
  const isConfigured = unipile.isConfigured();

  if (!isConfigured) {
    return NextResponse.json({
      configured: false,
      mode: 'sandbox',
      dsn: 'https://cloud.inhubflow.com (Sandbox Seguro)',
      provider: 'LINKEDIN',
      trialNotice: 'Modo Sandbox Activo: Probando todas las funciones con el motor seguro InHubFlow.',
      webhookEndpoint: '/api/unipile/webhook',
    });
  }

  // Ping real a Unipile para verificar si las credenciales siguen válidas o si la prueba de 7 días expiró
  try {
    const res = await unipile.listAccounts();
    return NextResponse.json({
      configured: true,
      mode: 'live',
      dsn: 'https://cloud.inhubflow.com (Nodo Seguro)',
      provider: 'LINKEDIN',
      trialNotice: 'Credenciales de enlace LinkedIn Cloud conectadas y verificadas con Unipile.',
      accountCount: (res?.items || []).length,
      webhookEndpoint: '/api/unipile/webhook',
    });
  } catch (err: any) {
    const errMsg = err?.message || String(err);
    const isAuthError =
      errMsg.includes('401') ||
      errMsg.includes('missing_credentials') ||
      errMsg.includes('invalid_key') ||
      errMsg.includes('Unauthorized');

    return NextResponse.json({
      configured: false,
      isExpired: isAuthError,
      mode: isAuthError ? 'expired' : 'error',
      dsn: 'https://cloud.inhubflow.com (Prueba Expirada)',
      provider: 'LINKEDIN',
      error: isAuthError ? 'trial_expired' : 'connection_error',
      accountEmail: 'adm.cashgrow.app@gmail.com',
      trialNotice: isAuthError
        ? 'El periodo de prueba de 7 días de Unipile ha finalizado (Error 401: Missing credentials). Reconecta una nueva cuenta o actualiza tu clave de Unipile.'
        : `Error de conexión con la pasarela LinkedIn: ${errMsg}`,
      webhookEndpoint: '/api/unipile/webhook',
    });
  }
}
