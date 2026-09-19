import { NextResponse } from "next/server";
import { getCurrentUserAndOrg } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { CfdiXmlParser } from "@/lib/sat/xml-parser";
import { AccountingEngine } from "@/lib/sat/accounting-engine";
import { SatAlertsEngine } from "@/lib/sat/sat-alerts-engine";

export async function POST(req: Request) {
  try {
    const sessionData = await getCurrentUserAndOrg();
    if (!sessionData?.user || !sessionData.activeOrg) {
      return NextResponse.json({ error: "No autenticado o sin RFC activo" }, { status: 401 });
    }

    const { activeOrg } = sessionData;
    const body = await req.json();
    const { xmlContent } = body;

    if (!xmlContent || typeof xmlContent !== "string") {
      return NextResponse.json({ error: "Contenido XML inválido o vacío" }, { status: 400 });
    }

    // 1. Parsear el XML con el parser CFDI 4.0
    const parsed = CfdiXmlParser.parse(xmlContent);

    // Verificar si ya existe este UUID en la organización
    const existing = await prisma.invoice.findUnique({
      where: { uuid: parsed.timbre.uuid },
    });
    if (existing) {
      return NextResponse.json(
        { error: `El CFDI con UUID ${parsed.timbre.uuid} ya fue registrado previamente en el sistema.` },
        { status: 409 }
      );
    }

    // 2. Determinar si es EMITIDA o RECIBIDA
    const esEmitida = parsed.emisor.rfc.toUpperCase() === activeOrg.rfc.toUpperCase();
    const tipo = esEmitida ? "EMITIDA" : "RECIBIDA";

    // 3. Auditoría EFOS 69-B preventiva (si es recibida)
    let alertaEfo = null;
    if (!esEmitida) {
      const efoCheck = await SatAlertsEngine.verificarListaNegra69B(parsed.emisor.rfc);
      if (efoCheck.esEfo) {
        alertaEfo = await prisma.fiscalAlert.create({
          data: {
            organizationId: activeOrg.id,
            tipo: "EFOS_DETECTADO",
            titulo: `¡Alerta Lista Negra 69-B! Emisor: ${parsed.emisor.rfc}`,
            descripcion: `El proveedor ${parsed.emisor.nombre} está catalogado como ${efoCheck.situacion} por el SAT. Esta factura por $${parsed.total.toFixed(2)} presenta alto riesgo fiscal.`,
            severidad: "CRITICAL",
          },
        });
      }
    }

    const esPue = parsed.metodoPago === "PUE";
    const saldoPendiente = esPue ? 0.0 : parsed.total;
    const estaConciliada = esPue;
    const fechaEfectivoCobro = esPue ? parsed.fecha : null;

    // 4. Guardar factura en Bóveda XML
    const invoice = await prisma.invoice.create({
      data: {
        organizationId: activeOrg.id,
        tipo,
        tipoDeComprobante: parsed.tipoDeComprobante,
        serie: parsed.serie,
        folio: parsed.folio,
        uuid: parsed.timbre.uuid,
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

    // 5. Generar Póliza Contable Automática
    const polizasCount = await prisma.poliza.count({
      where: { organizationId: activeOrg.id },
    });
    const polizaDraft = AccountingEngine.generarPolizaAutomatica(invoice, polizasCount + 1);

    const poliza = await prisma.poliza.create({
      data: {
        organizationId: activeOrg.id,
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

    return NextResponse.json({
      success: true,
      invoice,
      poliza,
      alertaEfo,
      parsed,
    });
  } catch (error: unknown) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
