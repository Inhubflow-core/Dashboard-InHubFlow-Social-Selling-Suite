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

  // 4. Si contiene urn:li:ugcPost:\d+
  const ugcMatch = trimmed.match(/urn:li:ugcPost:(\d+)/i);
  if (ugcMatch) return `urn:li:ugcPost:${ugcMatch[1]}`;

  // 5. Si es puramente un número largo (ID numérico)
  const numMatch = trimmed.match(/^([0-9]{10,25})$/);
  if (numMatch) return `urn:li:activity:${numMatch[1]}`;

  // 6. Si ya tiene formato urn:li:
  if (trimmed.startsWith('urn:li:')) return trimmed;

  return trimmed;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    let { action, accountId, postId: rawPostId, text, reactionType } = body;

    if (!rawPostId) {
      return NextResponse.json({ error: 'postId es obligatorio' }, { status: 400 });
    }

    let cleanAccountId = String(accountId || '').replace(/^acc-li-/, '').trim() || undefined;

    if (unipile.isConfigured() && (!cleanAccountId || cleanAccountId.startsWith('acc-li-'))) {
      try {
        const list = await unipile.listAccounts();
        const healthyAcc = (list.items || []).find((a: any) =>
          (a.type === 'LINKEDIN' || a.provider === 'LINKEDIN') &&
          (a.status === 'OK' || a.status === 'CONNECTED' || (Array.isArray(a.sources) && a.sources.some((s: any) => s.status === 'OK' || s.status === 'CONNECTED')))
        );
        if (healthyAcc) {
          cleanAccountId = healthyAcc.id;
        }
      } catch (e) {
        console.warn("[Unipile] Error al resolver cuenta activa en POST signals:", e);
      }
    }

    if (!cleanAccountId) {
      return NextResponse.json({ error: 'No se encontro una cuenta activa de LinkedIn conectada' }, { status: 400 });
    }

    const postId = extractLinkedInActivityUrn(rawPostId);

    if (action === 'react') {
      const result = await unipile.reactToPost({
        account_id: cleanAccountId,
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
        account_id: cleanAccountId,
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
    let cleanAccountId = (searchParams.get('accountId') || '').replace(/^acc-li-/, '').trim() || undefined;

    if (!rawPostId) {
      return NextResponse.json({ error: 'Especifica el postId' }, { status: 400 });
    }

    // Auto-descubrir cuenta saludable de LinkedIn si la provista está desconectada, vacía o con prefijo
    if (unipile.isConfigured()) {
      try {
        const list = await unipile.listAccounts();
        const healthyAcc = (list.items || []).find((a: any) =>
          (a.type === 'LINKEDIN' || a.provider === 'LINKEDIN') &&
          (a.status === 'OK' || a.status === 'CONNECTED' || (Array.isArray(a.sources) && a.sources.some((s: any) => s.status === 'OK' || s.status === 'CONNECTED')))
        );
        if (healthyAcc && (!cleanAccountId || !(list.items || []).some((a: any) => a.id === cleanAccountId))) {
          cleanAccountId = healthyAcc.id;
        }
      } catch (e) {
        console.warn("[Unipile] Error al resolver cuenta activa en signals:", e);
      }
    }

    const postId = extractLinkedInActivityUrn(rawPostId);

    const [commentsResult, reactionsResult, postResult] = await Promise.allSettled([
      unipile.getPostComments(postId, cleanAccountId),
      unipile.getPostReactions(postId, cleanAccountId),
      unipile.getPost(postId, cleanAccountId),
    ]);

    const rawComments = commentsResult.status === 'fulfilled' ? commentsResult.value.items || [] : [];
    const normalizedComments = rawComments.map((c: any) => {
      const authorStr = typeof c.author === 'string' ? c.author : (c.author?.name || '');
      const details = c.author_details || {};
      const authorObj = typeof c.author === 'object' && c.author !== null ? c.author : {};

      const name =
        authorStr ||
        details.name ||
        authorObj.name ||
        [details.first_name || authorObj.first_name, details.last_name || authorObj.last_name].filter(Boolean).join(' ') ||
        'Decisor en LinkedIn';

      const headline =
        details.headline ||
        authorObj.headline ||
        details.title ||
        authorObj.title ||
        'Profesional B2B en LinkedIn';

      const profileUrl =
        details.profile_url ||
        authorObj.profile_url ||
        details.linkedin_url ||
        authorObj.linkedin_url ||
        (details.public_identifier
          ? `https://www.linkedin.com/in/${details.public_identifier}`
          : authorObj.public_identifier
          ? `https://www.linkedin.com/in/${authorObj.public_identifier}`
          : '');

      const avatarUrl =
        details.profile_picture_url ||
        authorObj.profile_picture_url ||
        details.picture_url ||
        authorObj.picture_url ||
        undefined;

      return {
        ...c,
        author: {
          id: details.id || authorObj.id || (typeof c.author === 'string' ? c.author : '') || `author-${Math.random()}`,
          name,
          headline,
          profile_url: profileUrl,
          picture_url: avatarUrl,
          profile_picture_url: avatarUrl,
          public_identifier:
            details.public_identifier ||
            authorObj.public_identifier ||
            (profileUrl ? profileUrl.split('/in/')[1]?.replace(/\/$/, '') : undefined),
          ...authorObj,
          ...details,
        },
      };
    });

    const reactions = reactionsResult.status === 'fulfilled' ? reactionsResult.value.items || [] : [];
    const postDetails = postResult.status === 'fulfilled' ? postResult.value : null;

    return NextResponse.json({
      ok: true,
      postId,
      post: postDetails,
      comments: normalizedComments,
      reactions,
      mode: unipile.isSandboxMode() ? 'sandbox' : 'live',
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error al obtener datos del post';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
