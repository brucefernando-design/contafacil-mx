import { prisma } from "@/lib/prisma";
import { CfdiXmlParser, ParsedCfdi40 } from "@/lib/sat/xml-parser";
import { AccountingEngine } from "@/lib/sat/accounting-engine";
import { SatAlertsEngine } from "@/lib/sat/sat-alerts-engine";

export interface ImportarCfdiParams {
  organizationId: string;
  orgRfc: string;
  xmlContent: string;
  nombreArchivo?: string;
}

export interface ImportarCfdiResult {
  status: "NUEVO" | "DUPLICADO" | "INVALIDO";
  invoice?: any;
  poliza?: any;
  alertaEfo?: any;
  parsed?: ParsedCfdi40;
  error?: string;
}

/**
 * Importa y procesa un archivo XML de CFDI 4.0:
 * - Valida y parsea el XML con CfdiXmlParser.
 * - Deduplica contra la base de datos por UUID.
 * - Verifica lista negra EFOS 69-B si es recibida.
 * - Inserta la factura e ítems en la tabla `invoices`.
 * - Genera e inserta la póliza contable automática.
 */
export async function importarCfdiXml(params: {
  organizationId: string;
  orgRfc: string;
  xmlContent: string;
  nombreArchivo?: string;
}): Promise<ImportarCfdiResult> {
  const { organizationId, orgRfc, xmlContent, nombreArchivo } = params;

  if (!xmlContent || typeof xmlContent !== "string" || !xmlContent.trim()) {
    return {
      status: "INVALIDO",
      error: `Contenido XML vacío o inválido${nombreArchivo ? ` en archivo ${nombreArchivo}` : ""}.`,
    };
  }

  // 1. Parsear el XML con CfdiXmlParser
  let parsed: ParsedCfdi40;
  try {
    parsed = CfdiXmlParser.parse(xmlContent);
    if (!parsed || !parsed.timbre || !parsed.timbre.uuid) {
      return {
        status: "INVALIDO",
        error: `El XML no contiene un Timbre Fiscal Digital (UUID) válido${nombreArchivo ? ` (${nombreArchivo})` : ""}.`,
      };
    }
  } catch (err: any) {
    return {
      status: "INVALIDO",
      error: `Error al parsear CFDI: ${err?.message || "Estructura XML incompatible"}${nombreArchivo ? ` (${nombreArchivo})` : ""}.`,
    };
  }

  const cleanUuid = parsed.timbre.uuid.trim().toUpperCase();

  // 2. Deduplicar por UUID en la base de datos
  const existing = await prisma.invoice.findUnique({
    where: { uuid: cleanUuid },
  });

  if (existing) {
    return {
      status: "DUPLICADO",
      invoice: existing,
      parsed,
      error: `El CFDI con UUID ${cleanUuid} ya fue registrado previamente en el sistema.`,
    };
  }

  // 3. Determinar tipo (EMITIDA o RECIBIDA)
  const esEmitida = parsed.emisor.rfc.trim().toUpperCase() === orgRfc.trim().toUpperCase();
  const tipo = esEmitida ? "EMITIDA" : "RECIBIDA";

  // 4. Auditoría preventiva EFOS 69-B (si es recibida)
  let alertaEfo = null;
  if (!esEmitida) {
    try {
      const efoCheck = await SatAlertsEngine.verificarListaNegra69B(parsed.emisor.rfc);
      if (efoCheck.esEfo) {
        alertaEfo = await prisma.fiscalAlert.create({
          data: {
            organizationId,
            tipo: "EFOS_DETECTADO",
            titulo: `¡Alerta Lista Negra 69-B! Emisor: ${parsed.emisor.rfc}`,
            descripcion: `El proveedor ${parsed.emisor.nombre} está catalogado como ${efoCheck.situacion} por el SAT. Esta factura por $${parsed.total.toFixed(2)} presenta alto riesgo fiscal.`,
            severidad: "CRITICAL",
          },
        });
      }
    } catch {
      // No frenar la importación si la alerta falla
    }
  }

  const esPue = parsed.metodoPago === "PUE";
  const saldoPendiente = esPue ? 0.0 : parsed.total;
  const estaConciliada = esPue;
  const fechaEfectivoCobro = esPue ? parsed.fecha : null;

  // 5. Inserción de factura en Bóveda XML
  const invoice = await prisma.invoice.create({
    data: {
      organizationId,
      tipo,
      tipoDeComprobante: parsed.tipoDeComprobante,
      serie: parsed.serie,
      folio: parsed.folio,
      uuid: cleanUuid,
      fecha: parsed.fecha,
      formaPago: parsed.formaPago,
      metodoPago: parsed.metodoPago,
      lugarExpedicion: parsed.lugarExpedicion,
      subtotal: parsed.subtotal,
      descuento: parsed.descuento,
      total: parsed.total,
      emisorRfc: parsed.emisor.rfc,
      emisorNombre: parsed.emisor.nombre,
      emisorRegimen: parsed.emisor.regimenFiscal,
      receptorRfc: parsed.receptor.rfc,
      receptorNombre: parsed.receptor.nombre,
      receptorCp: parsed.receptor.domicilioFiscalReceptor,
      receptorRegimen: parsed.receptor.regimenFiscalReceptor,
      receptorUsoCfdi: parsed.receptor.usoCfdi,
      totalIvaTrasladado: parsed.totalIvaTrasladado,
      totalIvaRetenido: parsed.totalIvaRetenido,
      totalIsrRetenido: parsed.totalIsrRetenido,
      estatus: "VIGENTE",
      fechaTimbrado: parsed.timbre.fechaTimbrado,
      selloCFD: parsed.timbre.selloCFD,
      selloSAT: parsed.timbre.selloSAT,
      noCertificadoSAT: parsed.timbre.noCertificadoSAT,
      rawXml: xmlContent,
      saldoPendiente,
      fechaEfectivoCobro,
      estaConciliada,
      items: {
        create: parsed.conceptos.map((c) => ({
          claveProdServ: c.claveProdServ,
          claveUnidad: c.claveUnidad,
          unidad: c.unidad,
          descripcion: c.descripcion,
          cantidad: c.cantidad,
          valorUnitario: c.valorUnitario,
          importe: c.importe,
          descuento: c.descuento,
          objetoImp: c.objetoImp,
          ivaTasa: c.ivaTasa ?? 0.16,
          ivaImporte: c.ivaImporte ?? 0.0,
          retIsrTasa: c.retIsrTasa ?? 0.0,
          retIsrImporte: c.retIsrImporte ?? 0.0,
          retIvaTasa: c.retIvaTasa ?? 0.0,
          retIvaImporte: c.retIvaImporte ?? 0.0,
        })),
      },
    },
    include: {
      items: true,
    },
  });

  // 6. Generación de Póliza Contable Automática
  let poliza = null;
  try {
    const polizasCount = await prisma.poliza.count({
      where: { organizationId },
    });
    const polizaDraft = AccountingEngine.generarPolizaAutomatica(invoice, polizasCount + 1);

    poliza = await prisma.poliza.create({
      data: {
        organizationId,
        invoiceId: invoice.id,
        tipo: polizaDraft.tipo,
        numero: polizaDraft.numero,
        fecha: polizaDraft.fecha,
        concepto: polizaDraft.concepto,
        uuidRelacionado: polizaDraft.uuidRelacionado,
        totalDebe: polizaDraft.totalDebe,
        totalHaber: polizaDraft.totalHaber,
        estaCuadrada: polizaDraft.estaCuadrada,
        entries: {
          create: polizaDraft.entries.map((e) => ({
            cuentaCodigo: e.cuentaCodigo,
            cuentaNombre: e.cuentaNombre,
            concepto: e.concepto,
            debe: e.debe,
            haber: e.haber,
          })),
        },
      },
    });
  } catch {
    // Si la póliza automática falla, la factura queda registrada en bóveda
  }

  return {
    status: "NUEVO",
    invoice,
    poliza,
    alertaEfo,
    parsed,
  };
}
