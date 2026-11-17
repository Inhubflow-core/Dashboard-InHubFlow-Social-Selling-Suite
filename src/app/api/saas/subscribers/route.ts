import { NextRequest, NextResponse } from "next/server";
import {
  listSaasSubscribers,
  createSaasSubscriber,
  updateSaasSubscriber,
  deleteSaasSubscriber,
  getGlobalSaaSStatsFromDb,
} from "@/lib/saas/subscribers-db";
import { getPlanConfig } from "@/lib/saas/plans";
import type { PlanTier, SubscriptionStatus } from "@/lib/saas/types";

export async function GET() {
  try {
    const subscribers = listSaasSubscribers();
    const stats = getGlobalSaaSStatsFromDb();

    return NextResponse.json({
      success: true,
      subscribers,
      stats,
    });
  } catch (error: unknown) {
    return NextResponse.json(
      {
        error: "Error al listar suscriptores",
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, name, companyName, planTier, slotsLimit, subscriptionStatus } = body;

    if (!email || !companyName) {
      return NextResponse.json(
        { error: "Correo electronico y nombre de empresa son obligatorios." },
        { status: 400 }
      );
    }

    const plan = getPlanConfig((planTier as PlanTier) || "starter");
    const slots = typeof slotsLimit === "number" ? Math.max(1, slotsLimit) : plan.slots;

    const newSubscriber = createSaasSubscriber({
      email,
      name,
      companyName,
      planTier: (planTier as PlanTier) || "starter",
      slotsLimit: slots,
      subscriptionStatus: (subscriptionStatus as SubscriptionStatus) || "active",
    });

    return NextResponse.json(
      {
        success: true,
        user: newSubscriber,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    const status = message.includes("Ya existe") ? 409 : 500;
    return NextResponse.json(
      {
        error: "Error al crear suscriptor",
        message,
      },
      { status }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, companyName, name, planTier, slotsLimit, subscriptionStatus } = body;

    if (!id) {
      return NextResponse.json(
        { error: "El ID del suscriptor es requerido." },
        { status: 400 }
      );
    }

    const updated = updateSaasSubscriber(id, {
      companyName,
      name,
      planTier: planTier as PlanTier,
      slotsLimit,
      subscriptionStatus: subscriptionStatus as SubscriptionStatus,
    });

    if (!updated) {
      return NextResponse.json(
        { error: "Suscriptor no encontrado." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      user: updated,
    });
  } catch (error: unknown) {
    return NextResponse.json(
      {
        error: "Error al actualizar suscriptor",
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "El ID del suscriptor es requerido." },
        { status: 400 }
      );
    }

    const success = deleteSaasSubscriber(id);
    if (!success) {
      return NextResponse.json(
        { error: "No se puede eliminar la cuenta principal de Super Administrador o el suscriptor no existe." },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Suscriptor eliminado exitosamente.",
    });
  } catch (error: unknown) {
    return NextResponse.json(
      {
        error: "Error al eliminar suscriptor",
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
