import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { PLANES_CONFIG, PlanType } from "@/lib/sat/subscription-engine";

async function verifyAdmin() {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false, status: 401, error: "No autenticado" };
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, email: true, name: true, role: true },
  });

  if (!user || user.role !== "ADMIN") {
    return { ok: false, status: 403, error: "Acceso denegado. Se requiere rol de Super Administrador." };
  }

  return { ok: true, admin: user };
}

export async function PATCH(
  req: Request,
  props: { params: Promise<{ id: string }> }
) {
  const authCheck = await verifyAdmin();
  if (!authCheck.ok) {
    return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
  }

  try {
    const { id } = await props.params;
    const body = await req.json();
    const {
      plan,
      modalidad, // "GRATIS_TOTAL" | "CORTESIA_TIMBRES" | "NORMAL" | "PRUEBA_TEMPORAL" | "CUSTOM"
      vigenciaYears,
      cortesiaDias,
      timbresPersonalizados,
      agregarTimbres,
      resetTimbresUsados,
      role,
      isDespacho,
      status: reqStatus,
      periodEnd: reqPeriodEnd,
    } = body;

    const targetUser = await prisma.user.findUnique({
      where: { id },
      include: { subscription: true },
    });

    if (!targetUser) {
      return NextResponse.json({ error: "Usuario no encontrado." }, { status: 404 });
    }

    const subStatus = reqStatus !== undefined ? reqStatus : (targetUser.subscription?.status || "ACTIVE");

    // 1. Actualizar datos de usuario (rol, isDespacho)
    const userUpdates: Record<string, unknown> = {};
    if (role && ["USER", "CONTADOR", "ADMIN"].includes(role)) {
      userUpdates.role = role;
    }
    if (typeof isDespacho === "boolean") {
      userUpdates.isDespacho = isDespacho;
    } else if (plan === "DESPACHO") {
      userUpdates.isDespacho = true;
    }

    if (Object.keys(userUpdates).length > 0) {
      await prisma.user.update({
        where: { id },
        data: userUpdates,
      });
    }

    // 2. Actualizar suscripción
    const currentSub = targetUser.subscription;
    const planType: PlanType = (plan && ["FREE", "PRO", "DESPACHO"].includes(plan)
      ? plan
      : currentSub?.plan || "FREE") as PlanType;

    let periodEnd = currentSub?.periodEnd;
    let timbresIncluidos = currentSub?.timbresIncluidos ?? PLANES_CONFIG[planType].timbresIncluidos;
    let timbresUsados = currentSub?.timbresUsados ?? 0;

    if (modalidad === "GRATIS_TOTAL") {
      // Vitalicio con timbres
      periodEnd = new Date(Date.now() + (Number(vigenciaYears) || 10) * 365 * 24 * 60 * 60 * 1000);
      timbresIncluidos = timbresPersonalizados !== undefined && timbresPersonalizados !== ""
        ? Number(timbresPersonalizados)
        : Math.max(timbresIncluidos, PLANES_CONFIG[planType].timbresIncluidos);
      if (resetTimbresUsados) timbresUsados = 0;
    } else if (modalidad === "CORTESIA_TIMBRES") {
      // Vitalicio pero con 0 timbres incluidos para que ellos paguen sus timbrados
      periodEnd = new Date(Date.now() + (Number(vigenciaYears) || 10) * 365 * 24 * 60 * 60 * 1000);
      timbresIncluidos = 0;
      timbresUsados = 0;
    } else if (modalidad === "PRUEBA_TEMPORAL" || (modalidad === "PRUEBA_TEMPORAL" && cortesiaDias)) {
      const dias = Number(cortesiaDias) || 15;
      periodEnd = new Date(Date.now() + dias * 24 * 60 * 60 * 1000);
    } else if (modalidad === "NORMAL") {
      periodEnd = planType === "FREE" ? null : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      timbresIncluidos = PLANES_CONFIG[planType].timbresIncluidos;
    }

    // Recarga puntual de timbres
    if (agregarTimbres && Number(agregarTimbres) > 0) {
      timbresIncluidos += Number(agregarTimbres);
    }
    if (resetTimbresUsados) {
      timbresUsados = 0;
    }

    if (reqPeriodEnd !== undefined) {
      periodEnd = reqPeriodEnd ? new Date(reqPeriodEnd) : null;
    }

    const updatedSub = await prisma.subscription.upsert({
      where: { userId: id },
      create: {
        userId: id,
        plan: planType,
        status: subStatus,
        periodEnd,
        timbresIncluidos,
        timbresUsados,
      },
      update: {
        plan: planType,
        status: subStatus,
        periodEnd,
        timbresIncluidos,
        timbresUsados,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Cuenta de ${targetUser.name} actualizada correctamente.`,
      subscription: updatedSub,
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: (error as Error).message || "Error al actualizar usuario." },
      { status: 500 }
    );
  }
}
