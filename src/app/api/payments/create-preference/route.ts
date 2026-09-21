import { NextResponse } from "next/server";
import { getCurrentUserAndOrg } from "@/lib/session";
import { crearPreferencia } from "@/lib/payments/mercadopago";

/**
 * POST /api/payments/create-preference
 * Body: { plan: "PRO" | "DESPACHO" }
 *
 * Crea una preferencia de pago en MercadoPago y devuelve la URL de checkout.
 * Requiere sesión activa.
 */
export async function POST(req: Request) {
  try {
    const sessionData = await getCurrentUserAndOrg();
    if (!sessionData?.user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const { user } = sessionData;
    const body = await req.json();
    const itemKey = String(body.packageId || body.plan || body.itemKey || "").toUpperCase();

    const allowed = ["PRO", "DESPACHO", "TIMBRES_50", "TIMBRES_100", "TIMBRES_500", "TIMBRES_1000"];
    if (!allowed.includes(itemKey)) {
      return NextResponse.json(
        { error: "Artículo no válido. Elige un plan (PRO, DESPACHO) o un paquete de timbres." },
        { status: 400 }
      );
    }

    const preferencia = await crearPreferencia(
      itemKey,
      user.id,
      user.email
    );

    return NextResponse.json({
      success: true,
      preferenceId: preferencia.id,
      // En sandbox redirigimos a sandbox_init_point; en producción a init_point
      checkoutUrl: preferencia.checkoutUrlSandbox,
    });
  } catch (error: unknown) {
    console.error("[create-preference]", error);
    return NextResponse.json(
      { error: (error as Error).message || "Error al crear preferencia de pago." },
      { status: 500 }
    );
  }
}
