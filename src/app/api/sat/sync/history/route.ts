import { NextResponse } from "next/server";
import { getCurrentUserAndOrg } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const sessionData = await getCurrentUserAndOrg();
    if (!sessionData?.user || !sessionData.activeOrg) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const { activeOrg } = sessionData;

    const jobs = await prisma.satSyncJob.findMany({
      where: { organizationId: activeOrg.id },
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    return NextResponse.json({
      success: true,
      jobs,
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: (error as Error).message || "Error al obtener historial de sincronizaciones" },
      { status: 500 }
    );
  }
}
