import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { registrarAuditoria } from "@/lib/sat/audit";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const body = await req.json();
    const { organizationId } = body;

    if (!organizationId) {
      return NextResponse.json({ error: "organizationId es requerido" }, { status: 400 });
    }

    // Verificar que el usuario pertenezca a esta organización
    const membership = await prisma.organizationMember.findUnique({
      where: {
        userId_organizationId: {
          userId: session.user.id,
          organizationId,
        },
      },
      include: { organization: true },
    });

    if (!membership) {
      return NextResponse.json({ error: "No tienes acceso a esta empresa" }, { status: 403 });
    }

    // Actualizar empresa activa en el perfil del usuario
    await prisma.user.update({
      where: { id: session.user.id },
      data: { activeCompanyId: organizationId },
    });

    // Registrar bitácora de auditoría de cambio de empresa / RFC
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "127.0.0.1";
    await registrarAuditoria({
      action: "CAMBIO_RFC",
      organizationId,
      userId: session.user.id,
      userEmail: session.user.email,
      ip,
      detalles: `Cambio de RFC activo a ${membership.organization.rfc} (${membership.organization.razonSocial})`,
    });

    return NextResponse.json({
      success: true,
      activeCompanyId: organizationId,
      organization: membership.organization,
    });
  } catch (error: unknown) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
