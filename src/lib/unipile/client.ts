import {
  UnipileAccount,
  UnipileHostedAuthResponse,
  UnipileProfile,
  UnipileSendInvitationParams,
  UnipileSendInvitationResponse,
  UnipileSendMessageParams,
  UnipileSendMessageResponse,
  UnipileStartChatParams,
  UnipileStartChatResponse,
  UnipileChat,
  UnipileChatAttendee,
  UnipileMessage,
  UnipilePostComment,
  UnipilePostReaction,
  UnipileLinkedInSearchParams,
  UnipileLinkedInSearchResponse,
  UnipileSearchParameter,
  UnipileCredentialsAuthResponse,
  UnipileLinkedInAuthParams,
  UnipileSolveCheckpointResponse,
  UnipileFollowUserParams,
  UnipileFollowUserResponse,
  UnipilePostItem,
  UnipileUserPostsResponse,
  UnipileReactPostParams,
  UnipileCommentPostParams,
} from './types';

export class UnipileClient {
  private dsn: string;
  private apiKey: string;
  private forceSandbox: boolean;

  constructor(dsn?: string, apiKey?: string, forceSandbox?: boolean) {
    let rawDsn = (dsn || process.env.UNIPILE_DSN || '').trim().replace(/\/$/, '');
    if (rawDsn && !rawDsn.startsWith('http://') && !rawDsn.startsWith('https://')) {
      rawDsn = `https://${rawDsn}`;
    }
    this.dsn = rawDsn;
    this.apiKey = (apiKey || process.env.UNIPILE_API_KEY || '').trim();
    this.forceSandbox = forceSandbox ?? (process.env.UNIPILE_SANDBOX_MODE === 'true');
  }

  public getDsn(): string {
    let rawDsn = (this.dsn || process.env.UNIPILE_DSN || '').trim().replace(/\/$/, '');
    if (rawDsn && !rawDsn.startsWith('http://') && !rawDsn.startsWith('https://')) {
      rawDsn = `https://${rawDsn}`;
    }
    return rawDsn;
  }

  public getApiKey(): string {
    return (this.apiKey || process.env.UNIPILE_API_KEY || '').trim();
  }

  public isConfigured(): boolean {
    return Boolean(this.getDsn() && this.getApiKey() && !this.forceSandbox);
  }

  public isSandboxMode(): boolean {
    return !this.isConfigured();
  }

  public isV2(): boolean {
    const dsn = this.getDsn().toLowerCase();
    return dsn.includes('api.unipile.com') || dsn.includes('/v2');
  }

  private getHeaders(includeJsonContentType = true): Record<string, string> {
    return {
      'X-API-KEY': this.getApiKey(),
      'Accept': 'application/json',
      ...(includeJsonContentType ? { 'Content-Type': 'application/json' } : {}),
    };
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    if (!this.isConfigured()) {
      throw new Error(
        'El motor de conexion de LinkedIn (Unipile) no esta configurado con credenciales activas.'
      );
    }

    const dsn = this.getDsn();
    const url = `${dsn}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
    const isMultipart = typeof FormData !== 'undefined' && options.body instanceof FormData;
    const headers = {
      ...this.getHeaders(!isMultipart),
      ...(options.headers || {}),
    };

    const res = await fetch(url, {
      ...options,
      headers,
    });

    if (!res.ok) {
      let errorBody = '';
      try {
        errorBody = await res.text();
      } catch {
        // ignore
      }
      const error = new Error(
        `Error del motor de LinkedIn [${res.status} ${res.statusText}]: ${errorBody || 'Sin detalle'}`
      ) as Error & { status?: number; body?: string; endpoint?: string };
      error.status = res.status;
      error.body = errorBody;
      error.endpoint = endpoint;
      throw error;
    }

    return (await res.json()) as T;
  }

  /**
   * Genera un enlace de autenticacion Hosted para conectar la cuenta de LinkedIn
   */
  async getHostedAuthLink(params: {
    type?: 'create' | 'reconnect';
    reconnect_account?: string;
    providers?: string[];
    success_redirect_url?: string;
    failure_redirect_url?: string;
    notify_url?: string;
    name?: string;
  } = {}): Promise<UnipileHostedAuthResponse> {
    if (this.isSandboxMode()) {
      const mockAccId = `up_acc_sim_${Date.now().toString(36)}`;
      const callbackParam = encodeURIComponent(params.success_redirect_url || '/linkedin-accounts');
      return {
        object: 'HostedAuthLink',
        url: `https://auth.unipile.com/sandbox-mock-flow?account_id=${mockAccId}&redirect=${callbackParam}&status=CREATION_SUCCESS`,
      };
    }

    const type = params.type || 'create';

    if (this.isV2()) {
      const redirectUri = params.success_redirect_url || `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/linkedin-accounts`;
      const expiresOn = new Date(Date.now() + 60 * 60 * 1000).toISOString();

      // Validar si el account_id para reconexión cumple con el formato estricto de Unipile v2 (^acc_)
      const isValidV2AccountId =
        type === 'reconnect' &&
        typeof params.reconnect_account === 'string' &&
        params.reconnect_account.startsWith('acc_') &&
        !params.reconnect_account.startsWith('demo-') &&
        !params.reconnect_account.startsWith('up_acc_');

      if (isValidV2AccountId) {
        try {
          const body = {
            account_id: params.reconnect_account,
            expires_on: expiresOn,
            redirect_uri: redirectUri,
          };
          const res = await this.request<{ object?: string; link?: string; url?: string }>('/v2/auth/link', {
            method: 'POST',
            body: JSON.stringify(body),
          });
          return {
            object: 'HostedAuthLink',
            url: res.link || res.url || '',
          };
        } catch (reconnectErr) {
          console.warn('[Unipile v2] Reconnect con account_id falló, generando enlace nuevo:', reconnectErr);
          // Si falla la reconexión de ese ID específico en Unipile, caer al flujo de nueva cuenta
        }
      }

      const body = {
        expires_on: expiresOn,
        redirect_uri: redirectUri,
        providers: ['linkedin'],
      };
      const res = await this.request<{ object?: string; link?: string; url?: string }>('/v2/auth/link', {
        method: 'POST',
        body: JSON.stringify(body),
      });
      return {
        object: 'HostedAuthLink',
        url: res.link || res.url || '',
      };
    }

    const payload = {
      type,
      ...(type === 'reconnect'
        ? { reconnect_account: params.reconnect_account }
        : { providers: params.providers || ['LINKEDIN'] }),
      api_url: this.getDsn(),
      expiresOn: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      ...(params.success_redirect_url ? { success_redirect_url: params.success_redirect_url } : {}),
      ...(params.failure_redirect_url ? { failure_redirect_url: params.failure_redirect_url } : {}),
      ...(params.notify_url ? { notify_url: params.notify_url } : {}),
      ...(params.name ? { name: params.name } : {}),
    };

    return this.request<UnipileHostedAuthResponse>('/api/v1/hosted/accounts/link', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  /**
   * Inicia el flujo de autenticacion UniLogin mediante extension de navegador (Unipile v2)
   */
  async startUniLoginAuth(params: {
    account_id?: string;
    redirect_uri?: string;
  } = {}): Promise<{
    account_id: string;
    extension_code: string;
    extension_code_expires_at: string;
    extension_store_urls: { chrome?: string; firefox?: string; edge?: string; safari?: string };
  }> {
    if (this.isSandboxMode()) {
      return {
        account_id: `acc_sim_${Date.now()}`,
        extension_code: 'SIMU-LATE-2026',
        extension_code_expires_at: new Date(Date.now() + 600000).toISOString(),
        extension_store_urls: {
          chrome: 'https://chromewebstore.google.com/detail/unilogin/kmmoommiihbcemaebamojhchnnjhbkkl',
        },
      };
    }

    const payload: Record<string, unknown> = {
      provider: 'linkedin',
      unilogin: true,
      ...(params.account_id ? { account_id: params.account_id } : {}),
      ...(params.redirect_uri ? { redirect_uri: params.redirect_uri } : {}),
    };

    const res = await this.request<any>('/v2/auth/intent', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    return {
      account_id: res.account_id || res.intent_id,
      extension_code: res.checkpoint?.extension_code || '',
      extension_code_expires_at: res.checkpoint?.extension_code_expires_at || '',
      extension_store_urls: res.checkpoint?.extension_store_urls || {
        chrome: 'https://chromewebstore.google.com/detail/unilogin/kmmoommiihbcemaebamojhchnnjhbkkl',
      },
    };
  }

  /**
   * Conecta una cuenta de LinkedIn usando credenciales o cookie de sesion li_at (Native Auth)
   */
  async startCredentialsAuth(params: UnipileLinkedInAuthParams): Promise<UnipileCredentialsAuthResponse> {
    if (this.isSandboxMode()) {
      const isTwoFactor = Boolean(params.username && !params.accessToken && params.username.includes('2fa'));
      const simId = `up_acc_${Date.now().toString(36)}`;
      if (isTwoFactor) {
        return {
          object: 'Checkpoint',
          id: simId,
          account_id: simId,
          checkpoint: { type: '2FA', message: 'Introduce el codigo de 6 digitos enviado a tu app' },
        };
      }
      return {
        object: 'Account',
        id: simId,
        account_id: simId,
      };
    }

    if (this.isV2()) {
      const defaultUserAgent =
        params.userAgent?.trim() ||
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

      const credentials: Record<string, unknown> = {};
      if (params.accessToken?.trim()) {
        credentials.access_token = params.accessToken.trim();
        credentials.user_agent = defaultUserAgent;
        if (params.premiumToken?.trim()) {
          credentials.premium_token = params.premiumToken.trim();
        }
      } else if (params.username && params.password) {
        credentials.username = params.username.trim();
        credentials.password = params.password;
        credentials.user_agent = defaultUserAgent;
      }

      const v2Payload: Record<string, unknown> = {
        provider: 'linkedin',
        credentials,
        ...(params.country?.trim() ? { auto_proxy_country: params.country.trim().toUpperCase() } : {}),
        ...(params.name ? { name: params.name } : {}),
      };

      if (params.reconnectAccountId && params.reconnectAccountId.startsWith('acc_')) {
        v2Payload.account_id = params.reconnectAccountId;
      }

      const res = await this.request<any>('/v2/auth/intent', {
        method: 'POST',
        body: JSON.stringify(v2Payload),
      });

      if (res.checkpoint || res.object === 'AuthenticationCheckpoint' || res.object === 'Checkpoint') {
        return {
          object: 'Checkpoint',
          id: (res.account_id || res.intent_id) as string,
          account_id: (res.account_id || res.intent_id) as string,
          checkpoint: {
            type: res.checkpoint?.type || '2FA',
            message: res.checkpoint?.message || 'Introduce el código de verificación de LinkedIn',
          },
        };
      }

      const accountId = (res.account_id || res.id || res.intent_id) as string;
      return {
        object: 'Account',
        id: accountId,
        account_id: accountId,
      };
    }

    const payload: Record<string, unknown> = {
      provider: 'LINKEDIN',
      ...(params.name ? { name: params.name } : {}),
      ...(params.country?.trim() ? { country: params.country.trim().toUpperCase() } : {}),
      ...(params.proxy ? { proxy: params.proxy } : {}),
    };

    if (params.accessToken?.trim()) {
      payload.access_token = params.accessToken.trim();
      if (params.premiumToken?.trim()) payload.premium_token = params.premiumToken.trim();
      if (params.userAgent?.trim()) payload.user_agent = params.userAgent.trim();
    } else if (params.username && params.password) {
      payload.username = params.username.trim();
      payload.password = params.password;
    }

    // Si se proporciona una cuenta previa para reconexión, reautenticar esa sesión específica en Unipile
    if (
      params.reconnectAccountId &&
      !params.reconnectAccountId.startsWith("demo-") &&
      !params.reconnectAccountId.startsWith("acc-")
    ) {
      try {
        return await this.request<UnipileCredentialsAuthResponse>(
          `/api/v1/accounts/${encodeURIComponent(params.reconnectAccountId)}`,
          {
            method: "POST",
            body: JSON.stringify(payload),
          }
        );
      } catch (err: unknown) {
        console.warn(
          `[startCredentialsAuth] Re-autenticación en /api/v1/accounts/${params.reconnectAccountId} falló. Intentando vinculación estándar:`,
          err
        );
      }
    }

    return this.request<UnipileCredentialsAuthResponse>('/api/v1/accounts', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  /**
   * Resuelve el checkpoint de verificacion (2FA / SMS) para una cuenta de LinkedIn
   */
  async solveCheckpoint(params: {
    accountId: string;
    code: string;
  }): Promise<UnipileSolveCheckpointResponse> {
    if (this.isSandboxMode()) {
      return {
        object: 'Account',
        id: params.accountId,
        account_id: params.accountId,
      };
    }

    if (this.isV2()) {
      const res = await this.request<any>('/v2/auth/checkpoint', {
        method: 'POST',
        body: JSON.stringify({
          intent_id: params.accountId,
          code: params.code.trim(),
        }),
      });

      return {
        object: 'Account',
        id: (res.account_id || res.id || params.accountId) as string,
        account_id: (res.account_id || res.id || params.accountId) as string,
      };
    }

    const payload = {
      provider: 'LINKEDIN',
      account_id: params.accountId,
      code: params.code.trim(),
    };

    return this.request<UnipileSolveCheckpointResponse>('/api/v1/accounts/checkpoint', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  /**
   * Lista todas las cuentas conectadas a Unipile
   */
  async listAccounts(): Promise<{ items: UnipileAccount[] }> {
    if (this.isSandboxMode()) {
      return {
        items: [
          {
            id: 'up_acc_roberto_orse_main',
            type: 'LINKEDIN',
            provider: 'LINKEDIN',
            status: 'OK',
            name: 'Roberto OrSe',
            created_at: '2026-10-01T10:00:00.000Z',
          },
        ],
      };
    }

    if (this.isV2()) {
      const res = await this.request<{ object?: string; data?: any[]; items?: any[] }>('/v2/accounts');
      const rawAccounts = res.data || res.items || [];
      const items: UnipileAccount[] = rawAccounts.map((acc: any) => {
        const isRunning =
          acc.status === 'running' ||
          acc.status === 'OK' ||
          acc.status === 'CONNECTED';
        const mappedStatus = isRunning ? 'OK' : (acc.status ? String(acc.status).toUpperCase() : 'OK');
        return {
          id: acc.id,
          type: (acc.provider || 'LINKEDIN').toUpperCase() as any,
          provider: (acc.provider || 'LINKEDIN').toUpperCase(),
          status: mappedStatus as any,
          name: acc.name,
          created_at: acc.created_at,
          sources: [
            {
              id: 'LINKEDIN',
              status: mappedStatus as any,
            },
          ],
        };
      });
      return { items };
    }

    return this.request<{ items: UnipileAccount[] }>('/api/v1/accounts');
  }

  /**
   * Obtiene los detalles de una cuenta especifica
   */
  async getAccount(accountId: string): Promise<UnipileAccount> {
    if (this.isSandboxMode()) {
      return {
        id: accountId,
        type: 'LINKEDIN',
        provider: 'LINKEDIN',
        status: 'OK',
        name: 'Roberto OrSe',
        created_at: new Date().toISOString(),
      };
    }

    if (this.isV2()) {
      const acc = await this.request<any>(`/v2/accounts/${encodeURIComponent(accountId)}`);
      const isRunning =
        acc.status === 'running' ||
        acc.status === 'OK' ||
        acc.status === 'CONNECTED';
      const mappedStatus = isRunning ? 'OK' : (acc.status ? String(acc.status).toUpperCase() : 'OK');
      return {
        id: acc.id,
        type: (acc.provider || 'LINKEDIN').toUpperCase() as any,
        provider: (acc.provider || 'LINKEDIN').toUpperCase(),
        status: mappedStatus as any,
        name: acc.name,
        created_at: acc.created_at,
        sources: [
          {
            id: 'LINKEDIN',
            status: mappedStatus as any,
          },
        ],
      };
    }

    return this.request<UnipileAccount>(`/api/v1/accounts/${accountId}`);
  }

  /**
   * Elimina / desconecta una cuenta de Unipile
   */
  async deleteAccount(accountId: string): Promise<{ success: boolean }> {
    if (this.isSandboxMode()) {
      return { success: true };
    }

    const endpoint = this.isV2()
      ? `/v2/accounts/${encodeURIComponent(accountId)}`
      : `/api/v1/accounts/${accountId}`;

    return this.request<{ success: boolean }>(endpoint, {
      method: 'DELETE',
    });
  }

  /**
   * Resuelve el perfil y obtiene provider_id a partir de la vanity URL de LinkedIn
   */
  async resolveProfile(identifier: string, accountId: string): Promise<UnipileProfile> {
    const rawIdentifier = identifier.trim();
    let cleanId = rawIdentifier;
    try {
      const url = new URL(rawIdentifier);
      const match = url.pathname.match(/\/in\/([^/]+)/i);
      cleanId = match?.[1] || url.pathname.split("/").filter(Boolean).pop() || rawIdentifier;
    } catch {
      cleanId = rawIdentifier
        .replace(/^https?:\/\/(?:[a-z]{2,3}\.)?linkedin\.com\/in\//i, '')
        .split(/[/?#]/)[0];
    }
    cleanId = decodeURIComponent(cleanId).trim();
    if (!cleanId) throw new Error('La URL o identificador de LinkedIn no es valido');

    if (this.isSandboxMode()) {
      return {
        object: 'UserProfile',
        provider: 'LINKEDIN',
        provider_id: `urn:li:member:${cleanId}`,
        public_identifier: cleanId,
        public_profile_url: `https://www.linkedin.com/in/${cleanId}`,
        first_name: cleanId.charAt(0).toUpperCase() + cleanId.slice(1),
        last_name: 'Lead',
        headline: 'Director de Tecnologia e Innovacion B2B',
        network_distance: 'SECOND_DEGREE',
        location: 'Madrid, España',
      };
    }

    if (this.isV2()) {
      const res = await this.request<any>(
        `/v2/${encodeURIComponent(accountId)}/users/${encodeURIComponent(cleanId)}`
      );
      const nameParts = (res.display_name || '').trim().split(' ');
      return {
        object: 'UserProfile',
        provider: 'LINKEDIN',
        provider_id: res.id || `urn:li:member:${cleanId}`,
        public_identifier: res.public_identifier || cleanId,
        public_profile_url: res.profile_url || `https://www.linkedin.com/in/${cleanId}`,
        first_name: nameParts[0] || cleanId,
        last_name: nameParts.slice(1).join(' ') || '',
        headline: res.description || res.headline || '',
        picture_url: res.public_picture_url || res.picture_url,
        profile_picture_url: res.public_picture_url || res.profile_picture_url,
        location: res.location || '',
      };
    }

    const query = new URLSearchParams({
      account_id: accountId,
      linkedin_sections: '*',
    });
    return this.request<UnipileProfile>(
      `/api/v1/users/${encodeURIComponent(cleanId)}?${query.toString()}`
    );
  }

  /**
   * Obtiene el perfil propio de la cuenta de LinkedIn conectada
   */
  async getOwnProfile(accountId: string): Promise<UnipileProfile> {
    if (this.isSandboxMode()) {
      return {
        object: 'UserProfile',
        provider: 'LINKEDIN',
        provider_id: 'urn:li:member:roberto-orse',
        public_identifier: 'roberto-orse',
        public_profile_url: 'https://www.linkedin.com/in/roberto-orse',
        first_name: 'Roberto',
        last_name: 'OrSe',
        headline: 'Founder & CEO en InHubFlow | Social Selling & Automatizacion B2B con IA',
        picture_url: '/images/user/owner.png',
        profile_picture_url: '/images/user/owner.png',
      };
    }

    if (this.isV2()) {
      const res = await this.request<any>(
        `/v2/${encodeURIComponent(accountId)}/users/me`
      );
      const nameParts = (res.display_name || '').trim().split(' ');
      return {
        object: 'UserProfile',
        provider: 'LINKEDIN',
        provider_id: res.id || `urn:li:member:${accountId}`,
        public_identifier: res.public_identifier || res.id,
        public_profile_url: res.profile_url || (res.public_identifier ? `https://www.linkedin.com/in/${res.public_identifier}` : undefined),
        first_name: nameParts[0] || 'ADM',
        last_name: nameParts.slice(1).join(' ') || 'CASHGROW',
        headline: res.description || res.headline || 'ADM.CASHGROW',
        picture_url: res.public_picture_url || res.picture_url,
        profile_picture_url: res.public_picture_url || res.profile_picture_url,
      };
    }

    return this.request<UnipileProfile>(
      `/api/v1/users/me?account_id=${encodeURIComponent(accountId)}`
    );
  }

  /**
   * Envia una solicitud de conexion (invitacion) en LinkedIn
   */
  async sendInvitation(params: UnipileSendInvitationParams): Promise<UnipileSendInvitationResponse> {
    if (this.isSandboxMode()) {
      return {
        object: 'UserInvitationSent',
        invitation_id: `inv_sim_${Date.now()}`,
        usage: 1,
        status: 'sent',
      };
    }

    return this.request<UnipileSendInvitationResponse>('/api/v1/users/invite', {
      method: 'POST',
      body: JSON.stringify({
        account_id: params.account_id,
        provider_id: params.provider_id,
        ...(params.message ? { message: params.message } : {}),
      }),
    });
  }

  /**
   * Sigue a un usuario en LinkedIn
   */
  async followUser(params: UnipileFollowUserParams): Promise<UnipileFollowUserResponse> {
    if (this.isSandboxMode()) {
      return { ok: true, success: true, delegated: true };
    }

    try {
      return await this.request<UnipileFollowUserResponse>('/api/v1/users/follow', {
        method: 'POST',
        body: JSON.stringify({
          account_id: params.account_id,
          provider_id: params.provider_id,
        }),
      });
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      if (errMsg.includes('404') || errMsg.includes('Cannot POST /api/v1/users/follow')) {
        return { ok: true, success: true, delegated: true };
      }
      throw err;
    }
  }

  /**
   * Obtiene las publicaciones recientes de un perfil de usuario o empresa
   */
  async getUserPosts(params: {
    account_id: string;
    identifier: string;
    limit?: number;
    is_company?: boolean;
  }): Promise<UnipilePostItem[]> {
    if (this.isSandboxMode()) {
      return [
        {
          id: 'post-mock-01',
          text: 'Como optimizar la prospeccion B2B en LinkedIn utilizando Agentes de Inteligencia Artificial para cualificar prospectos en tiempo record. Comenta "SISTEMA" y te paso el framework completo.',
          date: new Date(Date.now() - 3600000 * 4).toISOString(),
          reaction_counter: 124,
          comment_counter: 68,
          repost_counter: 19,
          author: {
            id: 'urn:li:member:roberto-orse',
            name: 'Roberto OrSe',
            headline: 'Founder & CEO en InHubFlow',
          },
        },
      ];
    }

    const limit = params.limit ?? 10;
    const query = new URLSearchParams({
      account_id: params.account_id,
      limit: String(limit),
      ...(params.is_company ? { is_company: 'true' } : {}),
    });
    const url = `/api/v1/users/${encodeURIComponent(params.identifier)}/posts?${query.toString()}`;
    try {
      const res = await this.request<UnipileUserPostsResponse | UnipilePostItem[]>(url, { method: 'GET' });
      if (Array.isArray(res)) return res;
      if (res && typeof res === 'object' && Array.isArray((res as UnipileUserPostsResponse).items)) {
        return (res as UnipileUserPostsResponse).items || [];
      }
      return [];
    } catch (err: unknown) {
      console.warn(`[Unipile] Error al obtener posts para ${params.identifier}:`, err);
      return [];
    }
  }

  /**
   * Envia una reaccion a una publicacion en LinkedIn
   */
  async reactToPost(params: UnipileReactPostParams): Promise<{ success: boolean; [key: string]: unknown }> {
    if (this.isSandboxMode()) {
      return { success: true, simulated: true };
    }

    const rawId = (params.post_id || '').trim();
    const formattedId = rawId.startsWith('urn:li:') ? rawId : `urn:li:ugcPost:${rawId}`;

    return this.request('/api/v1/posts/reaction', {
      method: 'POST',
      body: JSON.stringify({
        account_id: params.account_id,
        post_id: formattedId,
        reaction_type: params.reaction_type || 'like',
      }),
    });
  }

  /**
   * Publica un comentario en una publicacion de LinkedIn
   */
  async commentOnPost(params: UnipileCommentPostParams): Promise<{ id?: string; comment_id?: string; [key: string]: unknown }> {
    if (this.isSandboxMode()) {
      const id = `cmt_sim_${Date.now()}`;
      return { id, comment_id: id, simulated: true };
    }

    const rawId = (params.post_id || '').trim();
    const formattedId = rawId.startsWith('urn:li:') ? rawId : `urn:li:ugcPost:${rawId}`;

    const body = new FormData();
    body.append('account_id', params.account_id);
    body.append('text', params.text);
    return this.request(`/api/v1/posts/${encodeURIComponent(formattedId)}/comments`, {
      method: 'POST',
      body,
    });
  }

  /**
   * Publica un nuevo post en el perfil de LinkedIn de la cuenta especificada
   */
  async createPost(params: {
    account_id: string;
    text: string;
    attachments?: Array<{ file: Buffer | Blob | string; filename: string; mime_type?: string }>;
  }): Promise<{ id?: string; post_id?: string; [key: string]: unknown }> {
    if (this.isSandboxMode()) {
      const id = `post_sim_${Date.now()}`;
      return { id, post_id: id, simulated: true };
    }

    const body = new FormData();
    body.append('account_id', params.account_id);
    body.append('text', params.text);
    for (const attachment of params.attachments || []) {
      if (typeof attachment.file === 'string') {
        body.append('attachments', attachment.file);
      } else if (typeof Buffer !== 'undefined' && Buffer.isBuffer(attachment.file)) {
        const blob = new Blob([new Uint8Array(attachment.file)], { type: attachment.mime_type || 'application/octet-stream' });
        body.append('attachments', blob, attachment.filename);
      } else {
        body.append('attachments', attachment.file as Blob, attachment.filename);
      }
    }

    return this.request<{ id?: string; post_id?: string; [key: string]: unknown }>('/api/v1/posts', {
      method: 'POST',
      body,
    });
  }

  /**
   * Inicia un nuevo chat en LinkedIn
   */
  async startChat(params: UnipileStartChatParams): Promise<UnipileStartChatResponse> {
    if (this.isSandboxMode()) {
      const chatId = `chat_sim_${Date.now()}`;
      const msgId = `msg_sim_${Date.now()}`;
      return {
        object: 'ChatStarted',
        chat_id: chatId,
        message_id: msgId,
      };
    }

    const body = new FormData();
    body.append('account_id', params.account_id);
    for (const attendeeId of params.attendees_ids) {
      body.append('attendees_ids[]', attendeeId);
    }
    if (params.text) body.append('text', params.text);
    for (const attachment of params.attachments || []) {
      if (typeof attachment.file === 'string') {
        body.append('attachments', attachment.file);
      } else if (typeof Buffer !== 'undefined' && Buffer.isBuffer(attachment.file)) {
        const blob = new Blob([new Uint8Array(attachment.file)], { type: attachment.mime_type || 'application/octet-stream' });
        body.append('attachments', blob, attachment.filename);
      } else {
        body.append('attachments', attachment.file as Blob, attachment.filename);
      }
    }

    return this.request<UnipileStartChatResponse>('/api/v1/chats', {
      method: 'POST',
      body,
    });
  }

  /**
   * Envia un mensaje en un chat existente
   */
  async sendMessage(params: UnipileSendMessageParams): Promise<UnipileSendMessageResponse> {
    if (this.isSandboxMode()) {
      return {
        object: 'MessageSent',
        message_id: `msg_sim_${Date.now()}`,
      };
    }

    const body = new FormData();
    body.append('text', params.text);
    for (const attachment of params.attachments || []) {
      if (typeof attachment.file === 'string') {
        body.append('attachments', attachment.file);
      } else if (typeof Buffer !== 'undefined' && Buffer.isBuffer(attachment.file)) {
        const blob = new Blob([new Uint8Array(attachment.file)], { type: attachment.mime_type || 'application/octet-stream' });
        body.append('attachments', blob, attachment.filename);
      } else {
        body.append('attachments', attachment.file as Blob, attachment.filename);
      }
    }

    return this.request<UnipileSendMessageResponse>(`/api/v1/chats/${encodeURIComponent(params.chat_id)}/messages`, {
      method: 'POST',
      body,
    });
  }

  /**
   * Lista chats de LinkedIn
   */
  async listChats(accountId?: string | string[], limit: number = 100, cursor?: string): Promise<{ items: UnipileChat[]; cursor?: string | null }> {
    if (this.isSandboxMode()) {
      return {
        items: [
          {
            id: 'chat_sim_1',
            account_id: typeof accountId === 'string' ? accountId : 'up_acc_roberto_orse_main',
            name: 'Alejandro Ramos',
            unread_count: 1,
            timestamp: new Date().toISOString(),
          },
        ],
        cursor: null,
      };
    }

    const query = new URLSearchParams();
    if (accountId) query.set('account_id', Array.isArray(accountId) ? accountId.join(',') : accountId);
    query.set('limit', String(Math.min(250, Math.max(1, limit))));
    if (cursor) query.set('cursor', cursor);

    return this.request<{ items: UnipileChat[]; cursor?: string | null }>(`/api/v1/chats?${query.toString()}`);
  }

  /**
   * Lista los mensajes de un chat especifico
   */
  async listMessages(chatId: string, limit: number = 100, cursor?: string): Promise<{ items: UnipileMessage[]; cursor?: string | null }> {
    if (this.isSandboxMode()) {
      return {
        items: [
          {
            id: 'msg_sim_01',
            chat_id: chatId,
            account_id: 'up_acc_roberto_orse_main',
            sender_id: 'lead-alejandro',
            text: 'Hola Roberto, vi tu publicacion sobre Social Selling con IA. Me gustaria conocer mas detalles.',
            timestamp: new Date().toISOString(),
            is_sender: 0,
          },
        ],
        cursor: null,
      };
    }

    const query = new URLSearchParams();
    query.set('limit', String(Math.min(250, Math.max(1, limit))));
    if (cursor) query.set('cursor', cursor);

    return this.request<{ items: UnipileMessage[]; cursor?: string | null }>(
      `/api/v1/chats/${encodeURIComponent(chatId)}/messages?${query.toString()}`
    );
  }

  async listChatAttendees(chatId: string): Promise<{ items: UnipileChatAttendee[]; cursor?: string | null }> {
    if (this.isSandboxMode()) {
      return {
        items: [
          {
            id: 'att_1',
            account_id: 'up_acc_roberto_orse_main',
            provider_id: 'urn:li:member:lead-alejandro',
            name: 'Alejandro Ramos',
            is_self: 0,
          },
        ],
        cursor: null,
      };
    }

    return this.request<{ items: UnipileChatAttendee[]; cursor?: string | null }>(
      `/api/v1/chats/${encodeURIComponent(chatId)}/attendees`
    );
  }

  /**
   * Lista los mensajes mas recientes de una cuenta
   */
  async listAccountMessages(accountId: string, limit: number = 50, cursor?: string): Promise<{ items: UnipileMessage[]; cursor?: string | null }> {
    if (this.isSandboxMode()) {
      return {
        items: [],
        cursor: null,
      };
    }

    const query = new URLSearchParams();
    query.set('account_id', accountId);
    query.set('limit', String(Math.min(250, Math.max(1, limit))));
    if (cursor) query.set('cursor', cursor);

    return this.request<{ items: UnipileMessage[]; cursor?: string | null }>(
      `/api/v1/messages?${query.toString()}`
    );
  }

  /**
   * Obtiene comentarios de una publicacion en LinkedIn para Signal Radar
   */
  async getPostComments(postId: string, accountId?: string, limit: number = 50): Promise<{ items: UnipilePostComment[] }> {
    if (this.isSandboxMode()) {
      return {
        items: [
          {
            id: 'cmt-mock-1',
            post_id: postId,
            text: 'SISTEMA por favor! Excelente enfoque Roberto.',
            created_at: new Date(Date.now() - 3600000).toISOString(),
            author: {
              id: 'urn:li:member:alejandro-mock',
              name: 'Alejandro Ramos',
              headline: 'VP Sales en CloudScale',
              public_identifier: 'alejandro-ramos-cloud',
            },
          },
          {
            id: 'cmt-mock-2',
            post_id: postId,
            text: 'Me interesa mucho la automatizacion. Envia SISTEMA.',
            created_at: new Date(Date.now() - 7200000).toISOString(),
            author: {
              id: 'urn:li:member:marina-mock',
              name: 'Marina Sanchez',
              headline: 'Head of Growth en Fintech Innova',
              public_identifier: 'marina-sanchez-fintech',
            },
          },
        ],
      };
    }

    const safePostId = encodeURIComponent(postId).replace(/%3A/gi, ':');

    if (this.isV2() && accountId) {
      const query = new URLSearchParams({ limit: String(limit) });
      const rawRes = await this.request<any>(
        `/v2/${encodeURIComponent(accountId)}/posts/${safePostId}/comments?${query.toString()}`
      );
      const items = rawRes?.data || rawRes?.items || (Array.isArray(rawRes) ? rawRes : []);
      return { items };
    }

    const query = new URLSearchParams();
    if (accountId) query.set('account_id', accountId);
    query.set('limit', String(limit));

    const rawRes = await this.request<any>(
      `/api/v1/posts/${safePostId}/comments?${query.toString()}`
    );
    if (Array.isArray(rawRes)) return { items: rawRes };
    if (rawRes && Array.isArray(rawRes.items)) return rawRes;
    return { items: [] };
  }

  /**
   * Obtiene reacciones de una publicacion en LinkedIn para Signal Radar
   */
  async getPostReactions(postId: string, accountId?: string, limit: number = 50): Promise<{ items: UnipilePostReaction[] }> {
    if (this.isSandboxMode()) {
      return {
        items: [
          {
            id: 'react-mock-1',
            reaction_type: 'LIKE',
            author: {
              id: 'urn:li:member:diego-mock',
              name: 'Diego Morales',
              headline: 'Managing Director en Iberia Corp',
              public_identifier: 'diego-morales-dir',
            },
          },
        ],
      };
    }

    const safePostId = encodeURIComponent(postId).replace(/%3A/gi, ':');

    if (this.isV2() && accountId) {
      const query = new URLSearchParams({ limit: String(limit) });
      const rawRes = await this.request<any>(
        `/v2/${encodeURIComponent(accountId)}/posts/${safePostId}/reactions?${query.toString()}`
      );
      const items = rawRes?.data || rawRes?.items || (Array.isArray(rawRes) ? rawRes : []);
      return { items };
    }

    const query = new URLSearchParams();
    if (accountId) query.set('account_id', accountId);
    query.set('limit', String(limit));

    const rawRes = await this.request<any>(
      `/api/v1/posts/${safePostId}/reactions?${query.toString()}`
    );
    if (Array.isArray(rawRes)) return { items: rawRes };
    if (rawRes && Array.isArray(rawRes.items)) return rawRes;
    return { items: [] };
  }

  /**
   * Obtiene una publicacion especifica de LinkedIn
   */
  async getPost(postId: string, accountId?: string): Promise<UnipilePostItem | null> {
    if (this.isSandboxMode()) {
      return {
        id: postId,
        text: 'Estrategias de Social Selling comprobadas para 2026. Comenta SISTEMA para recibir la guia.',
        reaction_counter: 95,
        comment_counter: 42,
        repost_counter: 8,
        author: {
          id: 'urn:li:member:roberto-orse',
          name: 'Roberto OrSe',
          headline: 'Founder & CEO en InHubFlow',
        },
      };
    }

    const safePostId = encodeURIComponent(postId).replace(/%3A/gi, ':');
    try {
      if (this.isV2() && accountId) {
        const post = await this.request<any>(
          `/v2/${encodeURIComponent(accountId)}/posts/${safePostId}`
        );
        return post || null;
      }

      const query = new URLSearchParams();
      if (accountId) query.set('account_id', accountId);

      const post = await this.request<UnipilePostItem>(
        `/api/v1/posts/${safePostId}?${query.toString()}`
      );
      return post || null;
    } catch (err) {
      console.warn(`[Unipile] No se pudo obtener el post ${postId}:`, err instanceof Error ? err.message : String(err));
      return null;
    }
  }

  /**
   * Obtiene el perfil publico completo de una empresa en LinkedIn.
   * Unipile entrega aqui el logo oficial y la URL publica de la pagina.
   */
  async getCompanyProfile(params: {
    account_id: string;
    identifier: string;
  }): Promise<Record<string, unknown>> {
    if (this.isSandboxMode()) return {};

    const identifier = params.identifier.trim();
    if (!identifier) return {};

    if (this.isV2()) {
      return this.request<Record<string, unknown>>(
        `/v2/${encodeURIComponent(params.account_id)}/linkedin/company/${encodeURIComponent(identifier)}`
      );
    }

    return this.request<Record<string, unknown>>(
      `/api/v1/linkedin/company/${encodeURIComponent(identifier)}?account_id=${encodeURIComponent(params.account_id)}`
    );
  }

  /**
   * Realiza una busqueda avanzada en LinkedIn
   */
  async searchLinkedIn(params: UnipileLinkedInSearchParams): Promise<UnipileLinkedInSearchResponse> {
    if (this.isSandboxMode()) {
      // El sandbox no tiene acceso a LinkedIn: nunca devolver resultados inventados.
      return {
        object: 'LinkedinSearch',
        items: [],
        cursor: null,
        paging: { start: 0, page_count: 0, total_count: 0 },
      };
    }

    const { account_id, cursor, limit = 25, api = 'classic', category = 'people', ...filters } = params;

    if (this.isV2()) {
      const safeLimit = Math.min(100, Math.max(1, limit));
      const query = new URLSearchParams({ limit: String(safeLimit) });
      if (cursor) query.set('cursor', cursor);

      if (category === 'posts') {
        const body: Record<string, unknown> = {
          keywords: params.keywords || '',
          sort_by: (filters as any).sort_by || 'RELEVANCE',
          date_posted: (filters as any).date_posted || 'PAST_MONTH',
        };
        if ((filters as any).content_type) {
          body.content_type = (filters as any).content_type;
        }

        const res = await this.request<any>(
          `/v2/${encodeURIComponent(account_id)}/linkedin/search/posts?${query.toString()}`,
          {
            method: 'POST',
            body: JSON.stringify(body),
          }
        );

        const rawList = res.data || res.items || [];
        const items = rawList.map((item: any) => {
          let reactionCounter = 0;
          if (typeof item.reaction_counter === 'number') {
            reactionCounter = item.reaction_counter;
          } else if (typeof item.reactions_counter === 'number') {
            reactionCounter = item.reactions_counter;
          } else if (Array.isArray(item.reactions_counter)) {
            reactionCounter = item.reactions_counter.reduce(
              (acc: number, curr: any) => acc + (Number(curr?.count) || 0),
              0
            );
          }

          const commentsCounter = item.comments_counter ?? item.comment_counter ?? 0;
          const repostsCounter = item.reposts_counter ?? item.repost_counter ?? 0;

          return {
            ...item,
            reaction_counter: reactionCounter,
            comment_counter: commentsCounter,
            repost_counter: repostsCounter,
            date: item.created_at || item.date,
            share_url: item.share_url,
            social_id: item.share_url ? item.share_url.split('-').pop() : item.id,
            author: item.author
              ? {
                  ...item.author,
                  name: item.author.display_name || item.author.name || 'Líder de Industria B2B',
                  headline: item.author.description || item.author.headline || 'Especialista B2B',
                  picture_url: item.author.public_picture_url || item.author.picture_url || null,
                  public_identifier: item.author.public_identifier || null,
                }
              : undefined,
          };
        });

        return {
          object: 'LinkedinSearch',
          items,
          cursor: res.next_cursor || res.cursor || null,
          paging: {
            start: 0,
            page_count: items.length,
            total_count: res.total_count ?? items.length,
          },
        };
      }

      if (category === 'people') {
        const res = await this.request<any>(
          `/v2/${encodeURIComponent(account_id)}/linkedin/search/people?${query.toString()}`,
          {
            method: 'POST',
            body: JSON.stringify({ keywords: params.keywords || '', ...filters }),
          }
        );
        const items = res.data || res.items || [];
        return {
          object: 'LinkedinSearch',
          items,
          cursor: res.next_cursor || null,
          paging: {
            start: 0,
            page_count: items.length,
            total_count: res.total_count ?? items.length,
          },
        };
      }

      const res = await this.request<any>(
        `/v2/${encodeURIComponent(account_id)}/linkedin/search?${query.toString()}`,
        {
          method: 'POST',
          body: JSON.stringify({ category, keywords: params.keywords || '', ...filters }),
        }
      );
      return {
        object: 'LinkedinSearch',
        items: res.data || res.items || [],
        cursor: res.next_cursor || null,
        paging: {
          start: 0,
          page_count: (res.data || res.items || []).length,
          total_count: res.total_count ?? (res.data || res.items || []).length,
        },
      };
    }

    const query = new URLSearchParams({
      account_id,
      limit: String(Math.min(100, Math.max(1, limit))),
    });
    if (cursor) query.set('cursor', cursor);
    return this.request<UnipileLinkedInSearchResponse>(`/api/v1/linkedin/search?${query.toString()}`, {
      method: 'POST',
      body: JSON.stringify({ api, category, ...filters }),
    });
  }

  async listLinkedInSearchParameters(params: {
    account_id: string;
    type: 'LOCATION' | 'INDUSTRY' | 'COMPANY' | 'SCHOOL' | 'SERVICE' | string;
    keywords: string;
    limit?: number;
  }): Promise<{ items: UnipileSearchParameter[] }> {
    if (this.isSandboxMode()) {
      return {
        items: [
          { object: 'LinkedinSearchParameter', id: '105646813', title: 'España' },
          { object: 'LinkedinSearchParameter', id: '96', title: 'Tecnologia de la informacion y servicios' },
        ],
      };
    }

    const query = new URLSearchParams({
      account_id: params.account_id,
      type: params.type,
      keywords: params.keywords,
      limit: String(Math.min(100, Math.max(1, params.limit ?? 20))),
    });
    return this.request<{ items: UnipileSearchParameter[] }>(
      `/api/v1/linkedin/search/parameters?${query.toString()}`,
    );
  }
}

// Instancia singleton por defecto
export const unipile = new UnipileClient();
