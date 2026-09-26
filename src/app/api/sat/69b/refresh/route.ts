import { NextResponse } from "next/server";
import { getCurrentUserAndOrg } from "@/lib/session";
import { actualizarLista69BOficial } from "@/lib/sat/sat-69b-sync";

/**
 * POST /api/sat/69b/refresh
 * Sincroniza la lista negra del Artículo 69-B del SAT desde las fuentes oficiales.
 * Cruza automáticamente con facturas recibidas de la organización activa.
 * 
 * Permisos:
 * - ADMIN o CONTADOR (Despacho)
 * - Fallback: Usuario autenticado perteneciente a la organización activa
 */
export async function POST() {
  try {
    const sessionData = await getCurrentUserAndOrg();
    if (!sessionData?.user || !sessionData.activeOrg) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const { user, activeOrg } = sessionData;

    // Verificar permisos: Rol de sistema ADMIN/CONTADOR o miembro con rol activo en la org
    const userRole = (user.role || "").toUpperCase();
    const esAdminODespacho = userRole === "ADMIN" || userRole === "CONTADOR" || Boolean(user.isDespacho);

    // Fallback: Si no tiene rol global de admin/despacho, se valida que sea usuario activo de la organización
    if (!esAdminODespacho) {
      console.info(`[69B Refresh] Ejecutado por usuario de organización: ${user.email} (Org: ${activeOrg.rfc})`);
    }

    // Ejecutar actualización oficial
    const resultado = await actualizarLista69BOficial({
      organizationId: activeOrg.id,
    });

    if (!resultado.ok) {
      return NextResponse.json(
        {
          success: false,
          error: resultado.error || "No se pudo actualizar la lista oficial del SAT",
          resultado,
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Lista 69-B del SAT sincronizada exitosamente (${resultado.upserts} registros procesados).`,
      resultado,
    });
  } catch (error: any) {
    console.error("[69B Refresh] Error:", error);
    return NextResponse.json(
      { error: error?.message || "Error interno al sincronizar la lista 69-B del SAT" },
      { status: 500 }
    );
  }
}
