import { NextResponse } from "next/server";
import { getCurrentUserAndOrg } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { getPlanDetails, PlanType } from "@/lib/sat/subscription-engine";
import { registrarAuditoria } from "@/lib/sat/audit";

export async function POST(req: Request) {
  try {
    const sessionData = await getCurrentUserAndOrg();
    if (!sessionData?.user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const { user, activeOrg } = sessionData;
    const body = await req.json();

    if (body.packageId) {
      const packageId = String(body.packageId).toUpperCase();
      const timbresMap: Record<string, number> = {
        TIMBRES_50: 50,
        TIMBRES_100: 100,
        TIMBRES_500: 500,
        TIMBRES_1000: 1000,
      };
      const extra = timbresMap[packageId];
      if (!extra) {
        return NextResponse.json({ error: "Paquete de timbres no válido" }, { status: 400 });
      }

      const subscription = await prisma.subscription.upsert({
        where: { userId: user.id },
        create: {
          userId: user.id,
          plan: "FREE",
          status: "ACTIVE",
          timbresIncluidos: 10 + extra,
          timbresUsados: 0,
        },
        update: {
          timbresIncluidos: { increment: extra },
        },
      });

      const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "127.0.0.1";
      await registrarAuditoria({
        action: "CAMBIO_PLAN",
        organizationId: activeOrg?.id || null,
        userId: user.id,
        userEmail: user.email,
        ip,
        detalles: `Recarga de paquete ${packageId} (+${extra} timbres CFDI 4.0)`,
      });

      return NextResponse.json({
        success: true,
        message: `¡Paquete de ${extra} timbres CFDI 4.0 acreditado exitosamente!`,
        subscription,
      });
    }

    const targetPlan = String(body.plan || "").toUpperCase() as PlanType;

    if (!["FREE", "PRO", "DESPACHO"].includes(targetPlan)) {
      return NextResponse.json({ error: "Plan no válido" }, { status: 400 });
    }

    const planConfig = getPlanDetails(targetPlan);
    const periodEnd = new Date();
    periodEnd.setDate(periodEnd.getDate() + 30);

    // Actualizar o crear la suscripción del usuario
    const subscription = await prisma.subscription.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        plan: targetPlan,
        status: "ACTIVE",
        timbresIncluidos: planConfig.timbresIncluidos,
        timbresUsados: 0,
        periodEnd,
      },
      update: {
        plan: targetPlan,
        status: "ACTIVE",
        timbresIncluidos: planConfig.timbresIncluidos,
        timbresUsados: 0,
        periodEnd,
      },
    });

    // Registrar bitácora de auditoría
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "127.0.0.1";
    await registrarAuditoria({
      action: "CAMBIO_PLAN",
      organizationId: activeOrg?.id || null,
      userId: user.id,
      userEmail: user.email,
      ip,
      detalles: `Cambio de plan a ${targetPlan} (${planConfig.timbresIncluidos} timbres incluidos)`,
    });

    return NextResponse.json({
      success: true,
      message: `¡Plan ${planConfig.name} activado con éxito!`,
      subscription,
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: (error as Error).message || "Error al actualizar plan." },
      { status: 500 }
    );
  }
}
