import { NextResponse } from 'next/server';
import { unipile } from '@/lib/unipile/client';

export async function GET() {
  const isConfigured = unipile.isConfigured();
  const dsn = unipile.getDsn();

  return NextResponse.json({
    configured: isConfigured,
    mode: isConfigured ? 'live' : 'sandbox',
    dsn: isConfigured ? 'https://cloud.inhubflow.com (Nodo Seguro)' : 'https://cloud.inhubflow.com (Sandbox Seguro)',
    provider: 'LINKEDIN',
    trialNotice: isConfigured
      ? 'Credenciales de enlace LinkedIn Cloud conectadas a entorno de produccion.'
      : 'Modo Sandbox Activo: Probando todas las funciones con el motor seguro InHubFlow.',
    webhookEndpoint: '/api/unipile/webhook',
  });
}
