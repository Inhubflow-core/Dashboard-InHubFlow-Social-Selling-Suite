import { NextRequest, NextResponse } from 'next/server';
import { unipile } from '@/lib/unipile/client';

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

    return NextResponse.json({
      configured: true,
      items: linkedinAccounts,
      accounts: linkedinAccounts,
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
