import { NextResponse } from "next/server";
import { getCurrentUserAndOrg } from "@/lib/session";
import { SatSyncService } from "@/lib/sat/sync/sat-sync-service";
import { SatSyncTipo } from "@/lib/sat/sync/types";

export async function POST(req: Request) {
  try {
    const sessionData = await getCurrentUserAndOrg();
    if (!sessionData?.user || !sessionData.activeOrg) {
      return NextResponse.json({ error: "No autenticado o sin empresa activa" }, { status: 401 });
    }

    const { user, activeOrg } = sessionData;
    const body = await req.json();

    const tipo = (body.tipo || "TODAS").toUpperCase() as SatSyncTipo;
    if (!["EMITIDAS", "RECIBIDAS", "TODAS"].includes(tipo)) {
      return NextResponse.json({ error: "Tipo de sincronización inválido" }, { status: 400 });
    }

    const now = new Date();
    const defaultInicio = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
    const defaultFin = now.toISOString().split("T")[0];

    const fechaInicio = body.fechaInicio || defaultInicio;
    const fechaFin = body.fechaFin || defaultFin;

    const result = await SatSyncService.ejecutarSincronizacion({
      organizationId: activeOrg.id,
      userId: user.id,
      tipo,
      fechaInicio,
      fechaFin,
    });

    return NextResponse.json({
      success: true,
      result,
    });
  } catch (error: unknown) {
    console.error("[api/sat/sync/request]", error);
    return NextResponse.json(
      { error: (error as Error).message || "Error al solicitar sincronización con el SAT" },
      { status: 500 }
    );
  }
}
