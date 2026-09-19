import { prisma } from "@/lib/prisma";

export interface SatAlertNotification {
  tipo: "EFOS_DETECTADO" | "OPINION_CUMPLIMIENTO" | "VENCIMIENTO_PROXIMO" | "PPD_SIN_PAGO";
  titulo: string;
  descripcion: string;
  severidad: "INFO" | "WARNING" | "CRITICAL";
}

export class SatAlertsEngine {
  /**
   * Verifica si un RFC se encuentra listado en el Artículo 69-B del SAT (EFOS / Factureras)
   */
  public static async verificarListaNegra69B(rfc: string): Promise<{
    esEfo: boolean;
    situacion?: string;
    razonSocial?: string;
    oficio?: string;
  }> {
    const cleanRfc = rfc.trim().toUpperCase();
    const record = await prisma.satBlacklist.findUnique({
      where: { rfc: cleanRfc },
    });

    if (record) {
      return {
        esEfo: true,
        situacion: record.situacion,
        razonSocial: record.razonSocial,
        oficio: record.oficio,
      };
    }

    return { esEfo: false };
  }

  /**
   * Ejecuta una auditoría de alertas preventivas para una empresa/RFC
   */
  public static async auditarAlertasEmpresa(organizationId: string): Promise<SatAlertNotification[]> {
    const alertas: SatAlertNotification[] = [];

    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      include: {
        invoices: {
          where: { estatus: "VIGENTE" },
          take: 100,
        },
      },
    });

    if (!org) return alertas;

    // 1. Alerta de Opinión de Cumplimiento (32-D)
    if (org.opinionCumplimiento === "NEGATIVA") {
      alertas.push({
        tipo: "OPINION_CUMPLIMIENTO",
        titulo: "Opinión de Cumplimiento 32-D en Sentido Negativo",
        descripcion: `El SAT ha detectado omisiones en declaraciones de ${org.rfc}. Regulariza tus obligaciones para evitar la cancelación de sellos CSD.`,
        severidad: "CRITICAL",
      });
    }

    // 2. Alerta de Vencimiento de Declaración Mensual (Día 17 SAT)
    const hoy = new Date();
    const diaDelMes = hoy.getDate();
    if (diaDelMes >= 10 && diaDelMes <= 22) {
      alertas.push({
        tipo: "VENCIMIENTO_PROXIMO",
        titulo: "Vencimiento Próximo: Pago Provisional SAT 2026",
        descripcion: `La declaración del periodo vence este mes. Presenta a tiempo antes de la fecha límite según el 6to dígito de ${org.rfc}.`,
        severidad: "WARNING",
      });
    }

    // 3. Revisión de Facturas Recibidas contra EFOS Lista Negra 69-B
    const facturasRecibidas = org.invoices.filter((i) => i.tipo === "RECIBIDA");
    for (const f of facturasRecibidas) {
      const efoCheck = await this.verificarListaNegra69B(f.emisorRfc);
      if (efoCheck.esEfo) {
        alertas.push({
          tipo: "EFOS_DETECTADO",
          titulo: `¡Alerta Crítica EFOS 69-B! Proveedor: ${f.emisorRfc}`,
          descripcion: `El proveedor ${f.emisorNombre} (${f.emisorRfc}) figura como ${efoCheck.situacion} en el listado del DOF/SAT. Factura ${f.folio || f.uuid.slice(0, 8)} por $${f.total.toFixed(2)}.`,
          severidad: "CRITICAL",
        });
      }
    }

    // 4. Facturas PPD emitidas sin pago recibido hace más de 30 días
    const facturasPpdVencidas = org.invoices.filter((i) => {
      if (i.tipo === "EMITIDA" && i.metodoPago === "PPD" && !i.estaConciliada && i.saldoPendiente > 0) {
        const diasAntiguedad = (hoy.getTime() - new Date(i.fecha).getTime()) / (1000 * 3600 * 24);
        return diasAntiguedad > 30;
      }
      return false;
    });

    if (facturasPpdVencidas.length > 0) {
      alertas.push({
        tipo: "PPD_SIN_PAGO",
        titulo: `${facturasPpdVencidas.length} Factura(s) PPD con más de 30 días de crédito`,
        descripcion: `Tienes comprobantes PPD con saldo pendiente. Recuerda emitir el Complemento de Recepción de Pagos al cobrar para acumular el flujo de efectivo.`,
        severidad: "INFO",
      });
    }

    return alertas;
  }
}
