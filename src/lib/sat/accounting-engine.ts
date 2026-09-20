import { Invoice, InvoiceItem } from "@prisma/client";

export interface PolizaEntryDraft {
  cuentaCodigo: string; // Código SAT agrupador
  cuentaNombre: string;
  concepto: string;
  debe: number;
  haber: number;
}

export interface PolizaDraft {
  tipo: "INGRESO" | "EGRESO" | "DIARIO";
  numero: number;
  fecha: Date;
  concepto: string;
  uuidRelacionado?: string;
  entries: PolizaEntryDraft[];
  totalDebe: number;
  totalHaber: number;
  estaCuadrada: boolean;
}

/**
 * Catálogo Base de Códigos Agrupadores del SAT (Anexo 24)
 */
export const CATALOGO_SAT_BASE = [
  { codigoSat: "102.01", nombre: "Bancos Nacionales", tipo: "ACTIVO", nivel: 2 },
  { codigoSat: "105.01", nombre: "Clientes Nacionales", tipo: "ACTIVO", nivel: 2 },
  { codigoSat: "113.01", nombre: "Impuestos a Favor - ISR Retenido", tipo: "ACTIVO", nivel: 2 },
  { codigoSat: "118.01", nombre: "IVA Acreditable Pagado", tipo: "ACTIVO", nivel: 2 },
  { codigoSat: "119.01", nombre: "IVA Pendiente de Pago / Acreditar", tipo: "ACTIVO", nivel: 2 },
  { codigoSat: "201.01", nombre: "Proveedores Nacionales", tipo: "PASIVO", nivel: 2 },
  { codigoSat: "208.01", nombre: "IVA Trasladado Cobrado", tipo: "PASIVO", nivel: 2 },
  { codigoSat: "209.01", nombre: "IVA Trasladado No Cobrado (PPD)", tipo: "PASIVO", nivel: 2 },
  { codigoSat: "216.01", nombre: "Retenciones de ISR por Pagar", tipo: "PASIVO", nivel: 2 },
  { codigoSat: "216.02", nombre: "Retenciones de IVA por Pagar", tipo: "PASIVO", nivel: 2 },
  { codigoSat: "301.01", nombre: "Capital Social", tipo: "CAPITAL", nivel: 1 },
  { codigoSat: "401.01", nombre: "Ingresos por Ventas o Servicios al 16%", tipo: "RESULTADOS_ACREEDORA", nivel: 2 },
  { codigoSat: "401.02", nombre: "Ingresos por Arrendamiento", tipo: "RESULTADOS_ACREEDORA", nivel: 2 },
  { codigoSat: "601.01", nombre: "Gastos Generales y de Administración", tipo: "RESULTADOS_DEUDORA", nivel: 2 },
  { codigoSat: "601.42", nombre: "Honorarios Profesionales Pagados", tipo: "RESULTADOS_DEUDORA", nivel: 2 },
  { codigoSat: "601.84", nombre: "Servicios de Software y Telecomunicaciones", tipo: "RESULTADOS_DEUDORA", nivel: 2 },
];

export class AccountingEngine {
  /**
   * Genera la Póliza contable automática a partir de un CFDI emitido o recibido
   */
  public static generarPolizaAutomatica(
    invoice: Invoice & { items?: InvoiceItem[] },
    numeroPoliza: number = 1
  ): PolizaDraft {
    const entries: PolizaEntryDraft[] = [];
    let tipoPoliza: "INGRESO" | "EGRESO" | "DIARIO" = "DIARIO";
    let concepto = "";

    const subtotal = Number(invoice.subtotal);
    const ivaTrasladado = Number(invoice.totalIvaTrasladado);
    const isrRetenido = Number(invoice.totalIsrRetenido);
    const ivaRetenido = Number(invoice.totalIvaRetenido);
    const total = Number(invoice.total);
    const folioRef = invoice.folio ? `Folio ${invoice.serie || ""}-${invoice.folio}` : `UUID ${invoice.uuid.slice(0, 8)}`;

    if (invoice.tipo === "EMITIDA") {
      if (invoice.metodoPago === "PUE") {
        // PÓLIZA DE INGRESO (PUE - Cobro inmediato al momento de emitir)
        tipoPoliza = "INGRESO";
        concepto = `Cobro de factura ${folioRef} - ${invoice.receptorNombre}`;

        // Cargo a Bancos por el efectivo neto recibido
        entries.push({
          cuentaCodigo: "102.01",
          cuentaNombre: "Bancos Nacionales",
          concepto: `Depósito cliente ${invoice.receptorRfc}`,
          debe: total,
          haber: 0.0,
        });

        // Cargo a ISR Retenido (si hubo retención)
        if (isrRetenido > 0) {
          entries.push({
            cuentaCodigo: "113.01",
            cuentaNombre: "Impuestos a Favor - ISR Retenido",
            concepto: `Retención 1.25% ISR ${invoice.receptorRfc}`,
            debe: isrRetenido,
            haber: 0.0,
          });
        }

        // Cargo a IVA Retenido (si hubo retención)
        if (ivaRetenido > 0) {
          entries.push({
            cuentaCodigo: "119.01",
            cuentaNombre: "IVA Pendiente de Pago / Acreditar",
            concepto: `Retención IVA ${invoice.receptorRfc}`,
            debe: ivaRetenido,
            haber: 0.0,
          });
        }

        // Abono a Ingresos por Servicios / Ventas por el Subtotal
        entries.push({
          cuentaCodigo: "401.01",
          cuentaNombre: "Ingresos por Ventas o Servicios al 16%",
          concepto: `Venta factura ${folioRef}`,
          debe: 0.0,
          haber: subtotal,
        });

        // Abono a IVA Trasladado Cobrado
        if (ivaTrasladado > 0) {
          entries.push({
            cuentaCodigo: "208.01",
            cuentaNombre: "IVA Trasladado Cobrado",
            concepto: `IVA 16% cobrado en ${folioRef}`,
            debe: 0.0,
            haber: ivaTrasladado,
          });
        }
      } else {
        // PÓLIZA DE DIARIO (PPD - Venta a crédito pendiente de cobro)
        tipoPoliza = "DIARIO";
        concepto = `Provisión venta a crédito ${folioRef} - ${invoice.receptorNombre}`;

        // Cargo a Clientes por el Total
        entries.push({
          cuentaCodigo: "105.01",
          cuentaNombre: "Clientes Nacionales",
          concepto: `Cuenta por cobrar ${invoice.receptorRfc}`,
          debe: total + isrRetenido + ivaRetenido,
          haber: 0.0,
        });

        // Abono a Ingresos por Subtotal
        entries.push({
          cuentaCodigo: "401.01",
          cuentaNombre: "Ingresos por Ventas o Servicios al 16%",
          concepto: `Ingreso devengado ${folioRef}`,
          debe: 0.0,
          haber: subtotal,
        });

        // Abono a IVA Trasladado Pendiente de Cobro
        if (ivaTrasladado > 0) {
          entries.push({
            cuentaCodigo: "209.01",
            cuentaNombre: "IVA Trasladado No Cobrado (PPD)",
            concepto: `IVA pendiente cobrar ${folioRef}`,
            debe: 0.0,
            haber: ivaTrasladado,
          });
        }
      }
    } else {
      // FACTURA RECIBIDA (EGRESO / GASTO)
      tipoPoliza = "EGRESO";
      concepto = `Pago a proveedor ${invoice.emisorNombre} - ${folioRef}`;

      // Cargo a Gastos por el Subtotal
      entries.push({
        cuentaCodigo: "601.01",
        cuentaNombre: "Gastos Generales y de Administración",
        concepto: `Gasto deducible ${invoice.emisorRfc}`,
        debe: subtotal,
        haber: 0.0,
      });

      // Cargo a IVA Acreditable Pagado
      if (ivaTrasladado > 0) {
        entries.push({
          cuentaCodigo: "118.01",
          cuentaNombre: "IVA Acreditable Pagado",
          concepto: `IVA 16% pagado ${invoice.emisorRfc}`,
          debe: ivaTrasladado,
          haber: 0.0,
        });
      }

      // Abono a Bancos por el Neto pagado
      entries.push({
        cuentaCodigo: "102.01",
        cuentaNombre: "Bancos Nacionales",
        concepto: `Transferencia SPEI a ${invoice.emisorRfc}`,
        debe: 0.0,
        haber: total,
      });

      // Abono a Retenciones por pagar si nosotros retuvimos
      if (isrRetenido > 0) {
        entries.push({
          cuentaCodigo: "216.01",
          cuentaNombre: "Retenciones de ISR por Pagar",
          concepto: `ISR retenido a ${invoice.emisorRfc}`,
          debe: 0.0,
          haber: isrRetenido,
        });
      }
      if (ivaRetenido > 0) {
        entries.push({
          cuentaCodigo: "216.02",
          cuentaNombre: "Retenciones de IVA por Pagar",
          concepto: `IVA retenido a ${invoice.emisorRfc}`,
          debe: 0.0,
          haber: ivaRetenido,
        });
      }
    }

    const totalDebe = Number(entries.reduce((sum, e) => sum + e.debe, 0).toFixed(2));
    const totalHaber = Number(entries.reduce((sum, e) => sum + e.haber, 0).toFixed(2));
    const estaCuadrada = Math.abs(totalDebe - totalHaber) < 0.05;

    return {
      tipo: tipoPoliza,
      numero: numeroPoliza,
      fecha: invoice.fecha,
      concepto,
      uuidRelacionado: invoice.uuid,
      entries,
      totalDebe,
      totalHaber,
      estaCuadrada,
    };
  }

  /**
   * Póliza por Complemento de Recepción de Pagos (PPD Cobrado)
   */
  public static generarPolizaCobroPpd(
    invoicePpd: Invoice,
    montoPago: number,
    fechaPago: Date,
    numeroPoliza: number = 1
  ): PolizaDraft {
    const entries: PolizaEntryDraft[] = [];
    const concepto = `Cobro parcialidad PPD ${invoicePpd.folio || invoicePpd.uuid.slice(0, 8)} - ${invoicePpd.receptorNombre}`;

    // Cargo a Bancos por el monto cobrado
    entries.push({
      cuentaCodigo: "102.01",
      cuentaNombre: "Bancos Nacionales",
      concepto: `SPEI recibido por cobro PPD`,
      debe: montoPago,
      haber: 0.0,
    });

    // Abono a Clientes para saldar la cuenta por cobrar
    entries.push({
      cuentaCodigo: "105.01",
      cuentaNombre: "Clientes Nacionales",
      concepto: `Amortización saldo cliente ${invoicePpd.receptorRfc}`,
      debe: 0.0,
      haber: montoPago,
    });

    // Reclasificación de IVA no cobrado a IVA efectivamente cobrado
    // Proporción de IVA = (montoPago / totalFactura) * ivaTotal
    const propIva = Number(((montoPago / (Number(invoicePpd.total) || 1)) * Number(invoicePpd.totalIvaTrasladado)).toFixed(2));
    if (propIva > 0) {
      entries.push({
        cuentaCodigo: "209.01",
        cuentaNombre: "IVA Trasladado No Cobrado (PPD)",
        concepto: `Cancelación IVA no cobrado por pago recibido`,
        debe: propIva,
        haber: 0.0,
      });

      entries.push({
        cuentaCodigo: "208.01",
        cuentaNombre: "IVA Trasladado Cobrado",
        concepto: `IVA efectivamente cobrado por pago`,
        debe: 0.0,
        haber: propIva,
      });
    }

    const totalDebe = Number(entries.reduce((sum, e) => sum + e.debe, 0).toFixed(2));
    const totalHaber = Number(entries.reduce((sum, e) => sum + e.haber, 0).toFixed(2));
    const estaCuadrada = Math.abs(totalDebe - totalHaber) < 0.05;

    return {
      tipo: "INGRESO",
      numero: numeroPoliza,
      fecha: fechaPago,
      concepto,
      uuidRelacionado: invoicePpd.uuid,
      entries,
      totalDebe,
      totalHaber,
      estaCuadrada,
    };
  }

  /**
   * Genera la Póliza de Reversión por Cancelación de Factura
   * Invierte exactamente los cargos y abonos para cancelar los efectos contables en la balanza Anexo 24
   */
  public static generarPolizaReversion(
    invoice: Invoice,
    numeroPoliza: number = 1,
    fechaCancelacion: Date = new Date(),
    motivoCancelacion: string = "02"
  ): PolizaDraft {
    const polizaOriginal = this.generarPolizaAutomatica(invoice, numeroPoliza);

    // Invertir cada partida: el debe se convierte en haber y el haber en debe
    const entriesInvertidas: PolizaEntryDraft[] = polizaOriginal.entries.map((e) => ({
      cuentaCodigo: e.cuentaCodigo,
      cuentaNombre: e.cuentaNombre,
      concepto: `Reversión por cancelación: ${e.concepto}`,
      debe: e.haber,
      haber: e.debe,
    }));

    const folioRef = invoice.folio
      ? `Folio ${invoice.serie || ""}-${invoice.folio}`
      : `UUID ${invoice.uuid.slice(0, 8)}`;

    const totalDebe = Number(entriesInvertidas.reduce((sum, e) => sum + e.debe, 0).toFixed(2));
    const totalHaber = Number(entriesInvertidas.reduce((sum, e) => sum + e.haber, 0).toFixed(2));
    const estaCuadrada = Math.abs(totalDebe - totalHaber) < 0.05;

    return {
      tipo: "DIARIO",
      numero: numeroPoliza,
      fecha: fechaCancelacion,
      concepto: `Cancelación CFDI ${folioRef} - Motivo SAT ${motivoCancelacion}`,
      uuidRelacionado: invoice.uuid,
      entries: entriesInvertidas,
      totalDebe,
      totalHaber,
      estaCuadrada,
    };
  }
}
