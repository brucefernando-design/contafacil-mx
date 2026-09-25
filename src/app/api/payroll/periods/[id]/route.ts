import { NextResponse } from "next/server";
import { getCurrentUserAndOrg } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const sessionData = await getCurrentUserAndOrg();
    if (!sessionData?.user || !sessionData.activeOrg) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const { id } = await params;

    const period = await prisma.payrollPeriod.findFirst({
      where: {
        id,
        organizationId: sessionData.activeOrg.id,
      },
      include: {
        receipts: {
          include: {
            employee: true,
          },
          orderBy: {
            createdAt: "asc",
          },
        },
      },
    });

    if (!period) {
      return NextResponse.json({ error: "Periodo de nómina no encontrado" }, { status: 404 });
    }

    return NextResponse.json({ period });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Error al obtener periodo" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const sessionData = await getCurrentUserAndOrg();
    if (!sessionData?.user || !sessionData.activeOrg) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const { id } = await params;

    const period = await prisma.payrollPeriod.findFirst({
      where: {
        id,
        organizationId: sessionData.activeOrg.id,
      },
      include: {
        receipts: true,
      },
    });

    if (!period) {
      return NextResponse.json({ error: "Periodo no encontrado" }, { status: 404 });
    }

    if (period.status === "TIMBRADA") {
      return NextResponse.json(
        { error: "No se puede eliminar un periodo que ya ha sido timbrado ante el SAT." },
        { status: 400 }
      );
    }

    await prisma.payrollPeriod.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: "Periodo eliminado correctamente" });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Error al eliminar periodo" },
      { status: 500 }
    );
  }
}
