import { NextRequest, NextResponse } from 'next/server';
import { unipile } from '@/lib/unipile/client';

// Cache en memoria para resolución rápida de chats por (accountId + leadName)
const chatResolutionCache = new Map<string, string>();

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { chatId, text, accountId, attendeesIds, leadName, leadId } = body;

    if (!text || !text.trim()) {
      return NextResponse.json({ error: 'El texto del mensaje es obligatorio' }, { status: 400 });
    }

    let targetChatId = chatId;

    // Si el chatId es un ID sintético interno (ej. 'conv-lead-roberto-orse') o falta:
    if (!targetChatId || targetChatId.startsWith('conv-')) {
      // 1. Obtener accountId de Unipile
      let targetAccountId = accountId;
      if (!targetAccountId) {
        try {
          const accounts = await unipile.listAccounts();
          const accList = Array.isArray(accounts) ? accounts : ((accounts as any).items || []);
          const activeAcc = accList.find((a: any) => a.status === 'OK' || a.id) || accList[0];
          if (activeAcc) targetAccountId = activeAcc.id;
        } catch (err) {
          console.warn('[api/unipile/messages] Error buscando cuenta Unipile:', err);
        }
      }

      const cacheKey = `${targetAccountId || 'default'}:${(leadName || '').toLowerCase().trim()}`;
      if (chatResolutionCache.has(cacheKey)) {
        targetChatId = chatResolutionCache.get(cacheKey)!;
      } else if (targetAccountId && leadName) {
        try {
          // Listar los chats de la cuenta
          const chatsRes = await unipile.listChats(targetAccountId, 50);
          const chats = Array.isArray(chatsRes) ? chatsRes : (chatsRes.items || []);
          const normalizedTarget = leadName.toLowerCase().trim();

          for (const chat of chats) {
            // A. Coincidencia directa en el título/nombre del chat si existe
            if (chat.name && chat.name.toLowerCase().includes(normalizedTarget)) {
              targetChatId = chat.id;
              chatResolutionCache.set(cacheKey, chat.id);
              break;
            }

            // B. Coincidencia en los asistentes (attendees) del chat
            try {
              const attRes = await unipile.listChatAttendees(chat.id);
              const attendees = Array.isArray(attRes) ? attRes : ((attRes as any).items || []);
              const match = attendees.find((att: any) =>
                att.name && (
                  att.name.toLowerCase().includes(normalizedTarget) ||
                  normalizedTarget.includes(att.name.toLowerCase())
                )
              );
              if (match) {
                targetChatId = chat.id;
                chatResolutionCache.set(cacheKey, chat.id);
                break;
              }
            } catch {
              // Continuar revisando siguientes chats
            }
          }
        } catch (err) {
          console.warn('[api/unipile/messages] Error en búsqueda de chats en Unipile:', err);
        }
      }
    }

    // Si se logró resolver un targetChatId real de Unipile:
    if (targetChatId && !targetChatId.startsWith('conv-')) {
      try {
        const response = await unipile.sendMessage({
          chat_id: targetChatId,
          text: text.trim(),
        });
        return NextResponse.json({
          ok: true,
          type: 'message_sent',
          chatId: targetChatId,
          response,
          mode: unipile.isSandboxMode() ? 'sandbox' : 'live',
        });
      } catch (sendErr: unknown) {
        console.warn(`[api/unipile/messages] Error enviando a chatId ${targetChatId}:`, sendErr instanceof Error ? sendErr.message : sendErr);
        // Continuar abajo si hay alternativa de startChat
      }
    }

    // Si no hay chatId pero hay attendeesIds y accountId, iniciar nuevo chat
    if (accountId && attendeesIds && attendeesIds.length > 0) {
      const response = await unipile.startChat({
        account_id: accountId,
        attendees_ids: attendeesIds,
        text: text.trim(),
      });
      return NextResponse.json({
        ok: true,
        type: 'chat_started',
        chatId: response.chat_id,
        response,
        mode: unipile.isSandboxMode() ? 'sandbox' : 'live',
      });
    }

    return NextResponse.json({
      ok: false,
      error: 'No se pudo encontrar o resolver un chat activo de LinkedIn para este destinatario.',
      attemptedChatId: chatId,
    }, { status: 400 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error al enviar mensaje';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const chatId = searchParams.get('chatId');
    const accountId = searchParams.get('accountId');

    if (chatId) {
      const messages = await unipile.listMessages(chatId);
      return NextResponse.json({ ok: true, data: messages });
    }

    if (accountId) {
      const chats = await unipile.listChats(accountId);
      return NextResponse.json({ ok: true, data: chats });
    }

    return NextResponse.json({ error: 'Especifica chatId o accountId' }, { status: 400 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error al consultar mensajes';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
