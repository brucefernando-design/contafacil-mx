import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { getCurrentUserAndOrg } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { CfdiXmlParser } from "@/lib/sat/xml-parser";
import { AccountingEngine } from "@/lib/sat/accounting-engine";

export async function POST() {
  try {
    const sessionData = await getCurrentUserAndOrg();
    if (!sessionData?.user || !sessionData.activeOrg) {
      return NextResponse.json({ error: "No autenticado o sin organización activa" }, { status: 401 });
    }

    const { activeOrg } = sessionData;
    const fixturesDir = path.resolve(process.cwd(), "fixtures", "cfdi");

    const file1Path = path.join(fixturesDir, "cfdi40_ingreso_pue.xml");
    const file2Path = path.join(fixturesDir, "cfdi40_gasto_recibido.xml");

    if (!fs.existsSync(file1Path) || !fs.existsSync(file2Path)) {
      return NextResponse.json(
        { error: "No se encontraron los archivos XML en fixtures/cfdi" },
        { status: 404 }
      );
    }

    const xmlIngreso = fs.readFileSync(file1Path, "utf-8");
    const xmlGasto = fs.readFileSync(file2Path, "utf-8");

    const fixturesToLoad = [
      { raw: xmlIngreso, tipoPredefinido: "EMITIDA" },
      { raw: xmlGasto, tipoPredefinido: "RECIBIDA" },
    ];

    const results = [];

    for (const fixture of fixturesToLoad) {
      // Ajustar RFC a la empresa activa para que coincida exactamente
      let xmlContent = fixture.raw;
      if (fixture.tipoPredefinido === "EMITIDA") {
        xmlContent = xmlContent
          .replace(/Rfc="LOMA900101ABC"/g, `Rfc="${activeOrg.rfc}"`)
          .replace(/Nombre="MARIANA LOPEZ ASESORIAS"/g, `Nombre="${activeOrg.razonSocial.toUpperCase()}"`);
      } else {
        xmlContent = xmlContent
          .replace(/Rfc="LOMA900101ABC"/g, `Rfc="${activeOrg.rfc}"`)
          .replace(/Nombre="MARIANA LOPEZ ASESORIAS"/g, `Nombre="${activeOrg.razonSocial.toUpperCase()}"`);
      }

      const parsed = CfdiXmlParser.parse(xmlContent);

      // Verificar si ya existe este UUID
      let invoice = await prisma.invoice.findUnique({
        where: { uuid: parsed.timbre.uuid },
      });

      if (!invoice) {
        const esEmitida = parsed.emisor.rfc.toUpperCase() === activeOrg.rfc.toUpperCase();
        const tipo = esEmitida ? "EMITIDA" : "RECIBIDA";
        const esPue = parsed.metodoPago === "PUE";

        invoice = await prisma.invoice.create({
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
            saldoPendiente: esPue ? 0.0 : parsed.total,
            fechaEfectivoCobro: esPue ? parsed.fecha : null,
            estaConciliada: esPue,
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
        });

        // Generar póliza contable automática
        const polizasCount = await prisma.poliza.count({
          where: { organizationId: activeOrg.id },
        });
        const polizaDraft = AccountingEngine.generarPolizaAutomatica(invoice, polizasCount + 1);

        await prisma.poliza.create({
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

        results.push({ uuid: invoice.uuid, folio: invoice.folio, cargado: true });
      } else {
        results.push({ uuid: invoice.uuid, folio: invoice.folio, cargado: false, mensaje: "Ya existía" });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Se procesaron exitosamente los 2 fixtures CFDI 4.0 (${results.filter(r => r.cargado).length} nuevos registrados).`,
      results,
    });
  } catch (error: unknown) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
