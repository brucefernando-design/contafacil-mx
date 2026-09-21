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
// Precios de los planes y paquetes de timbres (MXN)
// ─────────────────────────────────────────────────────────────────────────────

export const PLAN_PRECIOS: Record<string, { titulo: string; monto: number; descripcion: string }> = {
  PRO: {
    titulo: "EasyConta MX — Plan PRO",
    monto: 499,
    descripcion: "3 RFCs · 50 folios/mes · Contabilidad y estimación fiscal",
  },
  DESPACHO: {
    titulo: "EasyConta MX — Plan Despacho",
    monto: 1499,
    descripcion: "25 RFCs · 200 folios/mes · Multi-cliente despachos",
  },
};

export const PAQUETES_TIMBRES_PRECIOS: Record<string, { titulo: string; monto: number; descripcion: string; timbres: number }> = {
  TIMBRES_50: {
    titulo: "EasyConta MX — Paquete 50 Folios",
    monto: 149,
    descripcion: "50 Folios EasyConta (contador interno, se activan con PAC)",
    timbres: 50,
  },
  TIMBRES_100: {
    titulo: "EasyConta MX — Paquete 100 Folios",
    monto: 249,
    descripcion: "100 Folios EasyConta (contador interno, se activan con PAC)",
    timbres: 100,
  },
  TIMBRES_500: {
    titulo: "EasyConta MX — Paquete 500 Folios",
    monto: 799,
    descripcion: "500 Folios EasyConta (contador interno, se activan con PAC)",
    timbres: 500,
  },
  TIMBRES_1000: {
    titulo: "EasyConta MX — Paquete 1,000 Folios",
    monto: 1399,
    descripcion: "1,000 Folios EasyConta (contador interno, se activan con PAC)",
    timbres: 1000,
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
 * Crea una Preferencia de pago en MercadoPago para un plan o paquete de timbres.
 */
export async function crearPreferencia(
  itemKey: string,
  userId: string,
  userEmail: string
): Promise<PreferenciaCreada> {
  const normalizedKey = itemKey.toUpperCase();
  const isPlan = Boolean(PLAN_PRECIOS[normalizedKey]);
  const isTimbre = Boolean(PAQUETES_TIMBRES_PRECIOS[normalizedKey]);

  if (!isPlan && !isTimbre) {
    throw new Error(`Artículo de compra desconocido: ${itemKey}`);
  }

  const itemInfo = isPlan ? PLAN_PRECIOS[normalizedKey] : PAQUETES_TIMBRES_PRECIOS[normalizedKey];

  const client = getMpClient();
  const preference = new Preference(client);

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXTAUTH_URL ||
    "https://easyconta.allia2.com.mx";

  const successUrl = isPlan
    ? `${appUrl}/dashboard/plan/pago-exitoso?plan=${normalizedKey}`
    : `${appUrl}/dashboard/plan?compra=timbres_ok&paquete=${normalizedKey}`;

  const result = await preference.create({
    body: {
      items: [
        {
          id: `EASYCONTA_${normalizedKey}`,
          title: itemInfo.titulo,
          description: itemInfo.descripcion,
          quantity: 1,
          unit_price: itemInfo.monto,
          currency_id: "MXN",
        },
      ],
      payer: {
        email: userEmail,
      },
      back_urls: {
        success: successUrl,
        failure: `${appUrl}/dashboard/plan?pago=fallido`,
        pending: `${appUrl}/dashboard/plan?pago=pendiente`,
      },
      auto_return: "approved",
      notification_url: `${appUrl}/api/payments/webhook`,
      metadata: {
        userId,
        itemKey: normalizedKey,
        isTimbre,
        timbres: isTimbre ? PAQUETES_TIMBRES_PRECIOS[normalizedKey].timbres : 0,
      },
      external_reference: `${userId}__${normalizedKey}`,
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
