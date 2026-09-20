import { NextResponse } from "next/server";
import { getCurrentUserAndOrg } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { getPlanDetails, PlanType } from "@/lib/sat/subscription-engine";

export async function POST(req: Request) {
  try {
    const sessionData = await getCurrentUserAndOrg();
    if (!sessionData?.user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const { user } = sessionData;
    const body = await req.json();
    const targetPlan = String(body.plan || "").toUpperCase() as PlanType;

    if (!["FREE", "PRO", "DESPACHO"].includes(targetPlan)) {
      return NextResponse.json({ error: "Plan no válido" }, { status: 400 });
    }

    const planConfig = getPlanDetails(targetPlan);

    // Actualizar o crear la suscripción del usuario
    const subscription = await prisma.subscription.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        plan: targetPlan,
        status: "ACTIVE",
        timbresIncluidos: planConfig.timbresIncluidos,
        timbresUsados: 0,
      },
      update: {
        plan: targetPlan,
        status: "ACTIVE",
        timbresIncluidos: planConfig.timbresIncluidos,
      },
    });

    return NextResponse.json({
      success: true,
      message: `¡Plan demo ${planConfig.name} activado con éxito! (Beta gratuita sin cobro)`,
      subscription,
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: (error as Error).message || "Error al actualizar plan." },
      { status: 500 }
    );
  }
}
