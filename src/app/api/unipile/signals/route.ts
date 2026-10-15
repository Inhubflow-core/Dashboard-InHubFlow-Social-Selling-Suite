import { NextRequest, NextResponse } from 'next/server';
import { unipile } from '@/lib/unipile/client';

export function extractLinkedInActivityUrn(input: string): string {
  if (!input || typeof input !== 'string') return '';
  const trimmed = input.trim();

  // 1. Si contiene urn:li:activity:\d+
  const urnMatch = trimmed.match(/urn:li:activity:(\d+)/i);
  if (urnMatch) return `urn:li:activity:${urnMatch[1]}`;

  // 2. Si contiene activity-\d+ o activity:(\d+)
  const activityMatch = trimmed.match(/activity-([0-9]{10,25})/i);
  if (activityMatch) return `urn:li:activity:${activityMatch[1]}`;

  // 3. Si contiene urn:li:share:\d+
  const shareMatch = trimmed.match(/urn:li:share:(\d+)/i);
  if (shareMatch) return `urn:li:share:${shareMatch[1]}`;

  // 4. Si es puramente un número largo (ID numérico)
  const numMatch = trimmed.match(/^([0-9]{10,25})$/);
  if (numMatch) return `urn:li:activity:${numMatch[1]}`;

  // 5. Si ya tiene formato urn:li:
  if (trimmed.startsWith('urn:li:')) return trimmed;

  return trimmed;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, accountId, postId: rawPostId, text, reactionType } = body;

    if (!accountId || !rawPostId) {
      return NextResponse.json({ error: 'accountId y postId son obligatorios' }, { status: 400 });
    }

    const postId = extractLinkedInActivityUrn(rawPostId);

    if (action === 'react') {
      const result = await unipile.reactToPost({
        account_id: accountId,
        post_id: postId,
        reaction_type: reactionType || 'like',
      });
      return NextResponse.json({
        ok: true,
        action: 'react',
        result,
        mode: unipile.isSandboxMode() ? 'sandbox' : 'live',
      });
    }

    if (action === 'comment') {
      if (!text || !text.trim()) {
        return NextResponse.json({ error: 'El texto del comentario es obligatorio' }, { status: 400 });
      }
      const result = await unipile.commentOnPost({
        account_id: accountId,
        post_id: postId,
        text: text.trim(),
      });
      return NextResponse.json({
        ok: true,
        action: 'comment',
        result,
        mode: unipile.isSandboxMode() ? 'sandbox' : 'live',
      });
    }

    return NextResponse.json({ error: 'Accion no valida (usa react o comment)' }, { status: 400 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error al interactuar con el post';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const rawPostId = searchParams.get('postId');
    const accountId = searchParams.get('accountId') || undefined;

    if (!rawPostId) {
      return NextResponse.json({ error: 'Especifica el postId' }, { status: 400 });
    }

    const postId = extractLinkedInActivityUrn(rawPostId);

    const [commentsResult, reactionsResult, postResult] = await Promise.allSettled([
      unipile.getPostComments(postId, accountId),
      unipile.getPostReactions(postId, accountId),
      unipile.getPost(postId, accountId),
    ]);

    const comments = commentsResult.status === 'fulfilled' ? commentsResult.value.items || [] : [];
    const reactions = reactionsResult.status === 'fulfilled' ? reactionsResult.value.items || [] : [];
    const postDetails = postResult.status === 'fulfilled' ? postResult.value : null;

    return NextResponse.json({
      ok: true,
      postId,
      post: postDetails,
      comments,
      reactions,
      mode: unipile.isSandboxMode() ? 'sandbox' : 'live',
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error al obtener datos del post';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
