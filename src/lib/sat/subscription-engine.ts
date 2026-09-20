/**
 * Motor de Gestión de Planes y Suscripciones para EasyConta MX
 * Reglas de negocio SAT 2026: FREE (1 RFC, 10 timbres), PRO (3 RFCs, 50 timbres), DESPACHO (25 RFCs, 200 timbres)
 */

export type PlanType = "FREE" | "PRO" | "DESPACHO";

export interface PlanDetails {
  name: string;
  plan: PlanType;
  rfcLimit: number;
  timbresIncluidos: number;
  usuarios: number;
  multiCliente: boolean;
  precioMensual: number;
  descripcion: string;
  features: string[];
}

export const PLANES_CONFIG: Record<PlanType, PlanDetails> = {
  FREE: {
    name: "Plan FREE (Emprendedor)",
    plan: "FREE",
    rfcLimit: 1,
    timbresIncluidos: 10,
    usuarios: 1,
    multiCliente: false,
    precioMensual: 0,
    descripcion: "Ideal para profesionistas y personas físicas en RESICO que inician.",
    features: [
      "1 RFC activo",
      "10 timbres mock / mes",
      "1 usuario de acceso",
      "Motor fiscal provisional (RESICO / AE / Arrendamiento)",
      "Bóveda criptográfica y catálogo Anexo 24",
    ],
  },
  PRO: {
    name: "Plan PRO (Negocio)",
    plan: "PRO",
    rfcLimit: 3,
    timbresIncluidos: 50,
    usuarios: 3,
    multiCliente: false,
    precioMensual: 199,
    descripcion: "Para negocios en crecimiento, pymes y personas morales con flujo regular.",
    features: [
      "Hasta 3 RFCs activos",
      "50 timbres mock / mes",
      "Hasta 3 usuarios de acceso",
      "Conciliación bancaria con extractos CSV",
      "Generación automática de pólizas y balanza Anexo 24",
    ],
  },
  DESPACHO: {
    name: "Plan DESPACHO (Contadores)",
    plan: "DESPACHO",
    rfcLimit: 25,
    timbresIncluidos: 200,
    usuarios: 10,
    multiCliente: true,
    precioMensual: 599,
    descripcion: "Para despachos contables y firmas fiscales que gestionan carteras multi-cliente.",
    features: [
      "Hasta 25 RFCs activos",
      "200 timbres mock / mes",
      "Modo Multi-Cliente y switch rápido de RFC",
      "Auditoría automatizada en lista negra SAT 69-B (EFOS)",
      "Descarga masiva de XMLs y soporte prioritario",
    ],
  },
};

/**
 * Obtiene la configuración de un plan específico.
 */
export function getPlanDetails(plan?: string | null): PlanDetails {
  const normalized = (plan?.toUpperCase() || "FREE") as PlanType;
  return PLANES_CONFIG[normalized] || PLANES_CONFIG.FREE;
}

/**
 * Valida si el usuario puede dar de alta un RFC adicional según su plan.
 */
export function puedeCrearRfc(
  plan: string | null | undefined,
  rfcsActuales: number
): { permitido: boolean; limite: number; error?: string } {
  const config = getPlanDetails(plan);

  if (rfcsActuales >= config.rfcLimit) {
    if (config.plan === "FREE") {
      return {
        permitido: false,
        limite: config.rfcLimit,
        error: "El plan FREE sólo permite 1 RFC activo. Actualiza a PRO (3 RFCs) o DESPACHO (25 RFCs) para gestionar contribuyentes adicionales.",
      };
    }
    return {
      permitido: false,
      limite: config.rfcLimit,
      error: `Has alcanzado el límite máximo de ${config.rfcLimit} RFCs para tu plan ${config.name}. Actualiza a un plan superior para continuar agregando empresas.`,
    };
  }

  return { permitido: true, limite: config.rfcLimit };
}

/**
 * Valida si el usuario cuenta con timbres mock disponibles para emitir un comprobante.
 */
export function puedeTimbrar(
  timbresUsados: number,
  timbresIncluidos: number
): { permitido: boolean; restantes: number; error?: string } {
  const restantes = Math.max(0, timbresIncluidos - timbresUsados);

  if (timbresUsados >= timbresIncluidos) {
    return {
      permitido: false,
      restantes: 0,
      error: "Has agotado los timbres de tu plan. Actualiza tu plan en /precios para continuar timbrando comprobantes CFDI 4.0.",
    };
  }

  return { permitido: true, restantes };
}
