import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { registrarAuditoria } from "@/lib/sat/audit";

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

export async function POST(
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
    const { action, status, periodEnd, reason } = body;

    const targetUser = await prisma.user.findUnique({
      where: { id },
      include: { subscription: true },
    });

    if (!targetUser) {
      return NextResponse.json({ error: "Usuario no encontrado." }, { status: 404 });
    }

    let newStatus = "ACTIVE";
    if (action === "PAUSE" || status === "PAUSED") {
      newStatus = "PAUSED";
    } else if (action === "RESUME" || status === "ACTIVE") {
      newStatus = "ACTIVE";
    } else {
      // Toggle if not specified
      newStatus = targetUser.subscription?.status === "PAUSED" ? "ACTIVE" : "PAUSED";
    }

    let newPeriodEnd = targetUser.subscription?.periodEnd;
    if (periodEnd !== undefined) {
      newPeriodEnd = periodEnd ? new Date(periodEnd) : null;
    }

    const updatedSub = await prisma.subscription.upsert({
      where: { userId: id },
      create: {
        userId: id,
        plan: "FREE",
        status: newStatus,
        periodEnd: newPeriodEnd,
        timbresIncluidos: 10,
        timbresUsados: 0,
      },
      update: {
        status: newStatus,
        periodEnd: newPeriodEnd,
      },
    });

    // Registrar bitácora de auditoría
    await registrarAuditoria({
      action: "CAMBIO_PLAN",
      userId: targetUser.id,
      userEmail: targetUser.email,
      detalles: `Super Admin ${authCheck.admin?.email} cambió estado de cuenta a ${newStatus}. Motivo: ${reason || "Ajuste manual de cortesía / reactivación"}`,
    });

    return NextResponse.json({
      success: true,
      message: `Cuenta de ${targetUser.name} ${newStatus === "PAUSED" ? "puesta en pausa" : "reactivada exitosamente"}.`,
      status: newStatus,
      subscription: updatedSub,
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: (error as Error).message || "Error al actualizar estado de la cuenta." },
      { status: 500 }
    );
  }
}
