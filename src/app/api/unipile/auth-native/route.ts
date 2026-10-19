import { NextRequest, NextResponse } from 'next/server';
import { unipile } from '@/lib/unipile/client';
import type { UnipileProxyConfig } from '@/lib/unipile/types';

function parseProxyString(raw?: string): UnipileProxyConfig | undefined {
  if (!raw || !raw.trim()) return undefined;
  const trimmed = raw.trim();

  try {
    if (/^https?:\/\//i.test(trimmed) || /^socks5:\/\//i.test(trimmed)) {
      const url = new URL(trimmed);
      const proto = url.protocol.replace(":", "").toLowerCase() as "http" | "https" | "socks5";
      return {
        host: url.hostname,
        port: Number(url.port) || (proto === "https" ? 443 : 80),
        protocol: proto === "https" ? "https" : proto === "socks5" ? "socks5" : "http",
        ...(url.username ? { username: decodeURIComponent(url.username) } : {}),
        ...(url.password ? { password: decodeURIComponent(url.password) } : {}),
      };
    }

    if (trimmed.includes("@")) {
      const [auth, hostPort] = trimmed.split("@");
      const [u, p] = auth.split(":");
      const [h, port] = hostPort.split(":");
      if (h && port) {
        return {
          host: h.trim(),
          port: Number(port.trim()) || 80,
          protocol: "http",
          ...(u ? { username: u.trim() } : {}),
          ...(p ? { password: p.trim() } : {}),
        };
      }
    }

    const parts = trimmed.split(":");
    if (parts.length === 4) {
      return {
        host: parts[0].trim(),
        port: Number(parts[1].trim()) || 80,
        protocol: "http",
        username: parts[2].trim(),
        password: parts[3].trim(),
      };
    }

    if (parts.length === 2) {
      return {
        host: parts[0].trim(),
        port: Number(parts[1].trim()) || 80,
        protocol: "http",
      };
    }
  } catch (err) {
    console.warn("[parseProxyString] Error interpretando proxy:", err);
  }

  return undefined;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const {
      mode = "credentials",
      username,
      password,
      accessToken,
      premiumToken,
      country,
      proxy: rawProxy,
      name,
      accountId,
      reconnectAccountId,
    } = body;

    if (mode === "cookie") {
      if (!accessToken?.trim()) {
        return NextResponse.json(
          { error: "Por favor proporciona el valor de la cookie li_at de LinkedIn." },
          { status: 400 }
        );
      }
    } else {
      if (!username?.trim() || !password) {
        return NextResponse.json(
          { error: "Por favor proporciona tu correo y contraseña de LinkedIn." },
          { status: 400 }
        );
      }
    }

    if (!unipile.isConfigured()) {
      // Modo demo / simulación
      const mockId = reconnectAccountId || `up_acc_${Date.now()}`;
      return NextResponse.json({
        success: true,
        checkpoint: false,
        status: "OK",
        remoteAccountId: mockId,
        accountId: accountId || undefined,
        accountName: name || username?.split('@')[0] || "Cuenta LinkedIn",
        mock: true,
      });
    }

    const proxyConfig = parseProxyString(rawProxy);
    const userAgent = req.headers.get("user-agent") || undefined;

    // Si el usuario seleccionó Automático (""), intentar resolver país real desde headers (Cloudflare, Vercel, etc.)
    let resolvedCountry = country?.trim()?.toUpperCase() || undefined;
    if (!resolvedCountry && !proxyConfig) {
      const headerCountry =
        req.headers.get("cf-ipcountry") ||
        req.headers.get("x-vercel-ip-country") ||
        req.headers.get("x-country-code");
      if (headerCountry && headerCountry.length === 2 && headerCountry !== "XX") {
        resolvedCountry = headerCountry.toUpperCase();
      }
    }

    const authRes = await unipile.startCredentialsAuth({
      name: name || undefined,
      reconnectAccountId: reconnectAccountId || undefined,
      ...(mode === "cookie"
        ? {
            accessToken: accessToken.trim(),
            ...(premiumToken?.trim() ? { premiumToken: premiumToken.trim() } : {}),
            userAgent,
          }
        : {
            username: username.trim(),
            password,
          }),
      ...(resolvedCountry ? { country: resolvedCountry } : {}),
      ...(proxyConfig ? { proxy: proxyConfig } : {}),
    });

    // Caso Checkpoint (2FA)
    if (authRes.object === "Checkpoint" || authRes.checkpoint) {
      const remoteAccountId = (authRes.account_id || authRes.id) as string;
      return NextResponse.json({
        success: true,
        checkpoint: true,
        checkpointType: authRes.checkpoint?.type || "2FA",
        remoteAccountId,
        accountId: accountId || undefined,
      });
    }

    const remoteId = (authRes.id || authRes.account_id) as string;

    // Si reconectamos y Unipile asignó un nuevo ID remoto diferente al anterior,
    // limpiar silenciosamente la cuenta obsoleta previa en Unipile para no dejar sesiones zombi
    if (
      reconnectAccountId &&
      remoteId &&
      reconnectAccountId !== remoteId &&
      !reconnectAccountId.startsWith("demo-") &&
      !reconnectAccountId.startsWith("acc-")
    ) {
      unipile.deleteAccount(reconnectAccountId).catch((err) => {
        console.warn(`[auth-native] No se pudo purgar cuenta previa obsoleta ${reconnectAccountId} en Unipile:`, err);
      });
    }

    return NextResponse.json({
      success: true,
      checkpoint: false,
      status: "OK",
      remoteAccountId: remoteId,
      accountId: accountId || undefined,
    });
  } catch (error: unknown) {
    console.error("[api/unipile/auth-native] Error en conexion:", error);
    const errStatus = (error as { status?: number })?.status;
    const errBody = (error as { body?: string })?.body || "";
    const lowerBody = errBody.toLowerCase();

    if (errStatus === 502 || lowerBody.includes("proxy_error") || lowerBody.includes("proxy in use")) {
      return NextResponse.json(
        { error: "El proxy configurado no responde o no es accesible. Por favor verifica los datos del proxy." },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error: "Error al autenticar la cuenta de LinkedIn con InHubFlow Cloud.",
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
