import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { obtenerPago } from "@/lib/payments/mercadopago";
import { getPlanDetails } from "@/lib/sat/subscription-engine";
import { enviarConfirmacionPlan } from "@/lib/email/resend";

/**
 * POST /api/payments/webhook
 *
 * Recibe las notificaciones de MercadoPago (payment.updated, payment.created).
 * Cuando el pago está "approved", actualiza la suscripción del usuario.
 *
 * Formato de external_reference: "userId__PLAN"
 * Ej: "clxxxx1234__PRO"
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();

    // MercadoPago envía notificaciones con topic "payment" y data.id = payment_id
    const topic = body?.type || body?.topic;
    const paymentId = body?.data?.id || body?.id;

    if (!paymentId) {
      return NextResponse.json({ ok: true, skipped: "sin payment_id" });
    }

    // Solo procesamos notificaciones de pago
    if (topic && topic !== "payment") {
      return NextResponse.json({ ok: true, skipped: `topic ${topic} ignorado` });
    }

    // Obtener los datos del pago desde la API de MercadoPago
    const pago = await obtenerPago(String(paymentId));

    if (!pago || !pago.status) {
      return NextResponse.json({ ok: true, skipped: "pago no encontrado" });
    }

    // Solo procesamos pagos aprobados
    if (pago.status !== "approved") {
      console.info(`[webhook/MP] Pago ${paymentId} con status "${pago.status}" — ignorado`);
      return NextResponse.json({ ok: true, status: pago.status });
    }

    // Extraer userId y plan de external_reference: "userId__PLAN"
    const externalRef = pago.external_reference || "";
    const [userId, plan] = externalRef.split("__");

    if (!userId || !plan) {
      console.error("[webhook/MP] external_reference inválido:", externalRef);
      return NextResponse.json({ ok: false, error: "external_reference inválido" }, { status: 400 });
    }

    const planUpper = plan.toUpperCase() as "PRO" | "DESPACHO";
    if (!["PRO", "DESPACHO"].includes(planUpper)) {
      return NextResponse.json({ ok: false, error: "Plan no válido" }, { status: 400 });
    }

    const planConfig = getPlanDetails(planUpper);

    // Actualizar suscripción en la base de datos
    const subscription = await prisma.subscription.upsert({
      where: { userId },
      create: {
        userId,
        plan: planUpper,
        status: "ACTIVE",
        timbresIncluidos: planConfig.timbresIncluidos,
        timbresUsados: 0,
        mpPaymentId: String(paymentId),
        mpStatus: "approved",
      },
      update: {
        plan: planUpper,
        status: "ACTIVE",
        timbresIncluidos: planConfig.timbresIncluidos,
        mpPaymentId: String(paymentId),
        mpStatus: "approved",
      },
      include: { user: { select: { name: true, email: true } } },
    });

    console.info(
      `[webhook/MP] Plan ${planUpper} activado para userId=${userId} (payment_id=${paymentId})`
    );

    // Enviar email de confirmación (en background, sin bloquear la respuesta)
    void enviarConfirmacionPlan(
      subscription.user.name,
      subscription.user.email,
      planUpper
    );

    return NextResponse.json({
      ok: true,
      userId,
      plan: planUpper,
      paymentId: String(paymentId),
    });
  } catch (error: unknown) {
    console.error("[webhook/MP] Error:", error);
    // Devolvemos 200 para evitar que MP reintente indefinidamente
    return NextResponse.json(
      { ok: false, error: (error as Error).message },
      { status: 200 }
    );
  }
}

// MercadoPago también hace GET al webhook para verificar que existe
export async function GET() {
  return NextResponse.json({ ok: true, service: "EasyConta MX Webhook MP" });
}
