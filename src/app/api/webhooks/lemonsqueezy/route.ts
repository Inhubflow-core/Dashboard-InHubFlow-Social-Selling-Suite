import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import {
  upsertSubscriberFromLemonWebhook,
  updateSubscriberStatusFromWebhook,
} from "@/lib/saas/subscribers-db";
import type { PlanTier, SubscriptionStatus } from "@/lib/saas/types";

function resolvePlanFromWebhook(customData: Record<string, any>, attributes: Record<string, any>): {
  planTier: PlanTier;
  slots: number;
} {
  const variantId = String(attributes.variant_id || "");
  if (variantId === "2088581") return { planTier: "business", slots: 10 };
  if (variantId === "2088578") return { planTier: "growth", slots: 5 };
  if (variantId === "2088572") return { planTier: "starter", slots: 1 };

  const planHint = String(
    customData.plan_id || attributes.variant_name || attributes.product_name || ""
  ).toLowerCase();

  if (planHint.includes("10") || planHint.includes("business")) {
    return { planTier: "business", slots: 10 };
  }
  if (planHint.includes("5") || planHint.includes("growth")) {
    return { planTier: "growth", slots: 5 };
  }
  return { planTier: "starter", slots: 1 };
}

function mapLemonStatus(lemonStatus?: string): SubscriptionStatus {
  const normalized = String(lemonStatus || "active").toLowerCase();
  if (normalized === "past_due" || normalized === "unpaid") return "past_due";
  if (normalized === "cancelled" || normalized === "expired" || normalized === "paused") return "canceled";
  if (normalized === "on_trial") return "trial";
  return "active";
}

export async function POST(req: NextRequest) {
  try {
    const rawBodyString = await req.text();
    const signature = req.headers.get("x-signature") || "";
    const secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET?.trim() || "";

    if (secret) {
      if (!signature) {
        return NextResponse.json(
          { error: "Falta la cabecera de firma x-signature obligatoria" },
          { status: 401 }
        );
      }

      const hmac = crypto.createHmac("sha256", secret).update(rawBodyString).digest("hex");
      const hmacBuf = Buffer.from(hmac, "utf8");
      const sigBuf = Buffer.from(signature, "utf8");

      if (hmacBuf.length !== sigBuf.length || !crypto.timingSafeEqual(hmacBuf, sigBuf)) {
        return NextResponse.json(
          { error: "Firma criptografica invalida de Lemon Squeezy" },
          { status: 401 }
        );
      }
    }

    let body: any;
    try {
      body = JSON.parse(rawBodyString);
    } catch {
      return NextResponse.json({ error: "JSON malformado" }, { status: 400 });
    }

    const eventName = body?.meta?.event_name || req.headers.get("x-event-name") || "unknown";
    const customData = body?.meta?.custom_data || {};
    const data = body?.data || {};
    const attributes = data?.attributes || {};

    const customerEmail = (
      customData.admin_email ||
      attributes.user_email ||
      data?.customer?.email ||
      ""
    )
      .trim()
      .toLowerCase();

    const companyName = (
      customData.company_name ||
      attributes.user_name ||
      (customerEmail ? customerEmail.split("@")[0] : "Empresa")
    ).trim();

    const { planTier, slots } = resolvePlanFromWebhook(customData, attributes);
    const subscriptionId = String(attributes.subscription_id || data.id || attributes.order_id || `sub_${Date.now()}`);
    const customerId = attributes.customer_id ? String(attributes.customer_id) : undefined;
    const billingPeriod = String(customData.billing_period || "monthly");

    console.log(
      `[LemonSqueezy Webhook] Evento: ${eventName} | Plan: ${planTier} | Slots: ${slots} | Email: ${customerEmail}`
    );

    if (
      eventName === "order_created" ||
      eventName === "subscription_created" ||
      eventName === "subscription_resumed" ||
      eventName === "subscription_payment_success"
    ) {
      if (!customerEmail) {
        return NextResponse.json(
          { ok: false, error: "El webhook no incluye email del cliente para aprovisionar." },
          { status: 400 }
        );
      }

      const result = upsertSubscriberFromLemonWebhook({
        email: customerEmail,
        name: attributes.user_name || companyName,
        companyName,
        planTier,
        slotsLimit: slots,
        subscriptionStatus: mapLemonStatus(attributes.status || "active"),
        lemonSubscriptionId: subscriptionId,
        lemonCustomerId: customerId,
        billingPeriod,
      });

      return NextResponse.json({
        ok: true,
        received: true,
        event: eventName,
        action: result.action,
        subscriberId: result.user.id,
        customerEmail,
        planTier,
        slots,
        subscriptionId,
        status: result.user.subscriptionStatus,
        timestamp: new Date().toISOString(),
      });
    }

    if (eventName === "subscription_updated") {
      if (customerEmail) {
        const result = upsertSubscriberFromLemonWebhook({
          email: customerEmail,
          name: attributes.user_name || companyName,
          companyName,
          planTier,
          slotsLimit: slots,
          subscriptionStatus: mapLemonStatus(attributes.status),
          lemonSubscriptionId: subscriptionId,
          lemonCustomerId: customerId,
          billingPeriod,
        });
        return NextResponse.json({
          ok: true,
          received: true,
          event: eventName,
          action: result.action,
          subscriberId: result.user.id,
          status: result.user.subscriptionStatus,
        });
      }
    }

    if (eventName === "subscription_payment_failed") {
      const updated = updateSubscriberStatusFromWebhook({
        lemonSubscriptionId: subscriptionId,
        email: customerEmail,
        subscriptionStatus: "past_due",
      });
      return NextResponse.json({
        ok: true,
        received: true,
        event: eventName,
        subscriberId: updated?.id || null,
        status: "past_due",
      });
    }

    if (eventName === "subscription_cancelled" || eventName === "subscription_expired") {
      const updated = updateSubscriberStatusFromWebhook({
        lemonSubscriptionId: subscriptionId,
        email: customerEmail,
        subscriptionStatus: "canceled",
      });
      return NextResponse.json({
        ok: true,
        received: true,
        event: eventName,
        subscriberId: updated?.id || null,
        status: "canceled",
      });
    }

    return NextResponse.json({
      ok: true,
      received: true,
      event: eventName,
      ignored: true,
      timestamp: new Date().toISOString(),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error procesando webhook de Lemon Squeezy";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    status: "online",
    endpoint: "/api/webhooks/lemonsqueezy",
    service: "Lemon Squeezy SaaS Billing & Multislot Provisioning",
    supportedPlans: {
      starter: { slots: 1, priceMonthly: 40, priceAnnual: 32, variantId: "2088572" },
      growth: { slots: 5, priceMonthly: 160, priceAnnual: 128, variantId: "2088578" },
      business: { slots: 10, priceMonthly: 240, priceAnnual: 192, variantId: "2088581" },
    },
    timestamp: new Date().toISOString(),
  });
}
