import { MercadoPagoConfig, Preference, Payment } from "mercadopago";

// ─────────────────────────────────────────────────────────────────────────────
// Singleton del cliente MercadoPago
// ─────────────────────────────────────────────────────────────────────────────

function getMpClient(): MercadoPagoConfig {
  const accessToken = process.env.MP_ACCESS_TOKEN;
  if (!accessToken) {
    throw new Error(
      "[MercadoPago] MP_ACCESS_TOKEN no está configurado. Revisa las variables de entorno."
    );
  }
  return new MercadoPagoConfig({
    accessToken,
    options: { timeout: 10000 },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Precios de los planes (MXN) — sandbox demo
// ─────────────────────────────────────────────────────────────────────────────

const PLAN_PRECIOS: Record<string, { titulo: string; monto: number; descripcion: string }> = {
  PRO: {
    titulo: "EasyConta MX — Plan PRO",
    monto: 199,
    descripcion: "3 RFCs · 50 timbres demo/mes · Contabilidad avanzada",
  },
  DESPACHO: {
    titulo: "EasyConta MX — Plan Despacho",
    monto: 599,
    descripcion: "25 RFCs · 200 timbres demo/mes · Multi-cliente",
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Tipos
// ─────────────────────────────────────────────────────────────────────────────

export interface PreferenciaCreada {
  id: string;
  checkoutUrl: string; // init_point (sandbox)
  checkoutUrlSandbox: string; // sandbox_init_point
}

// ─────────────────────────────────────────────────────────────────────────────
// Funciones públicas
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Crea una Preferencia de pago en MercadoPago y retorna la URL de checkout.
 * Usa sandbox cuando MP_ACCESS_TOKEN comienza con APP_USR- de test.
 */
export async function crearPreferencia(
  plan: "PRO" | "DESPACHO",
  userId: string,
  userEmail: string
): Promise<PreferenciaCreada> {
  const planInfo = PLAN_PRECIOS[plan];
  if (!planInfo) {
    throw new Error(`Plan desconocido: ${plan}`);
  }

  const client = getMpClient();
  const preference = new Preference(client);

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXTAUTH_URL ||
    "https://easyconta.allia2.com.mx";

  const result = await preference.create({
    body: {
      items: [
        {
          id: `EASYCONTA_${plan}`,
          title: planInfo.titulo,
          description: planInfo.descripcion,
          quantity: 1,
          unit_price: planInfo.monto,
          currency_id: "MXN",
        },
      ],
      back_urls: {
        success: `${appUrl}/dashboard/plan/pago-exitoso?plan=${plan}`,
        failure: `${appUrl}/dashboard/plan?pago=fallido`,
        pending: `${appUrl}/dashboard/plan?pago=pendiente`,
      },
      auto_return: "approved",
      notification_url: `${appUrl}/api/payments/webhook`,
      // Metadata para el webhook: qué usuario y qué plan
      metadata: {
        userId,
        plan,
      },
      external_reference: `${userId}__${plan}`,
      statement_descriptor: "EASYCONTA MX",
    },
  });

  if (!result.id || !result.init_point) {
    throw new Error("[MercadoPago] La preferencia no se creó correctamente. Revisa las credenciales.");
  }

  return {
    id: result.id,
    checkoutUrl: result.init_point,
    checkoutUrlSandbox: result.sandbox_init_point || result.init_point,
  };
}

/**
 * Obtiene los datos de un pago por su payment_id.
 * Útil para verificar el estatus en el webhook.
 */
export async function obtenerPago(paymentId: string) {
  const client = getMpClient();
  const payment = new Payment(client);
  return payment.get({ id: paymentId });
}
