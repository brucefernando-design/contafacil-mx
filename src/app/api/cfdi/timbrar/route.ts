import { NextResponse } from "next/server";
import { getCurrentUserAndOrg } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { PacMockAdapter } from "@/lib/sat/pac-mock";
import { AccountingEngine } from "@/lib/sat/accounting-engine";

export async function POST(req: Request) {
  try {
    const sessionData = await getCurrentUserAndOrg();
    if (!sessionData?.user || !sessionData.activeOrg) {
      return NextResponse.json({ error: "No autenticado o sin RFC activo" }, { status: 401 });
    }

    const { activeOrg } = sessionData;
    const body = await req.json();

    const {
      metodoPago,
      formaPago,
      receptorRfc,
      receptorNombre,
      receptorCp,
      receptorRegimen,
      receptorUsoCfdi,
      conceptos,
    } = body;

    if (!receptorRfc || !receptorNombre || !conceptos || conceptos.length === 0) {
      return NextResponse.json({ error: "Faltan datos obligatorios para timbrar" }, { status: 400 });
    }

    const serie = activeOrg.serieDefault || "F";
    const folio = String(activeOrg.folioActual || 1);

    // 1. Timbrar con PAC Mock SAT 2026
    const timbradoRes = await PacMockAdapter.timbrarCfdi40({
      serie,
      folio,
      formaPago: formaPago || (metodoPago === "PPD" ? "99" : "03"),
      metodoPago: metodoPago || "PUE",
      lugarExpedicion: activeOrg.codigoPostal,
      tipoDeComprobante: "I",
      emisor: {
        rfc: activeOrg.rfc,
        nombre: activeOrg.razonSocial,
        regimenFiscal: activeOrg.regimenFiscal,
      },
      receptor: {
        rfc: receptorRfc.trim().toUpperCase(),
        nombre: receptorNombre.trim(),
        domicilioFiscalReceptor: receptorCp || activeOrg.codigoPostal,
        regimenFiscalReceptor: receptorRegimen || "601",
        usoCfdi: receptorUsoCfdi || "G03",
      },
      conceptos: conceptos.map((c: {
        claveProdServ: string;
        claveUnidad?: string;
        unidad?: string;
        descripcion: string;
        cantidad: number;
        valorUnitario: number;
        descuento?: number;
        objetoImp?: string;
        ivaTasa?: number;
        retIsrTasa?: number;
        retIvaTasa?: number;
      }) => ({
        claveProdServ: c.claveProdServ || "80141600",
        claveUnidad: c.claveUnidad || "E48",
        unidad: c.unidad || "Servicio",
        descripcion: c.descripcion,
        cantidad: Number(c.cantidad) || 1,
        valorUnitario: Number(c.valorUnitario) || 0,
        descuento: Number(c.descuento) || 0,
        objetoImp: c.objetoImp || "02",
        ivaTasa: c.ivaTasa !== undefined ? Number(c.ivaTasa) : 0.16,
        retIsrTasa: c.retIsrTasa ? Number(c.retIsrTasa) : 0,
        retIvaTasa: c.retIvaTasa ? Number(c.retIvaTasa) : 0,
      })),
    });

    const esPue = metodoPago === "PUE";
    const saldoPendiente = esPue ? 0 : timbradoRes.total;
    const estaConciliada = esPue;
    const fechaEfectivoCobro = esPue ? new Date() : null;

    // 2. Guardar en Base de Datos
    const invoice = await prisma.invoice.create({
      data: {
        organizationId: activeOrg.id,
        tipo: "EMITIDA",
        tipoDeComprobante: "I",
        serie,
        folio,
        uuid: timbradoRes.uuid,
        fecha: new Date(),
        formaPago: formaPago || (esPue ? "03" : "99"),
        metodoPago: metodoPago || "PUE",
        lugarExpedicion: activeOrg.codigoPostal,
        subtotal: timbradoRes.subtotal,
        descuento: timbradoRes.descuento,
        total: timbradoRes.total,
        emisorRfc: activeOrg.rfc,
        emisorNombre: activeOrg.razonSocial,
        emisorRegimen: activeOrg.regimenFiscal,
        receptorRfc: receptorRfc.trim().toUpperCase(),
        receptorNombre: receptorNombre.trim(),
        receptorCp: receptorCp || activeOrg.codigoPostal,
        receptorRegimen: receptorRegimen || "601",
        receptorUsoCfdi: receptorUsoCfdi || "G03",
        totalIvaTrasladado: timbradoRes.totalIvaTrasladado,
        totalIvaRetenido: timbradoRes.totalIvaRetenido,
        totalIsrRetenido: timbradoRes.totalIsrRetenido,
        estatus: "VIGENTE",
        fechaTimbrado: new Date(timbradoRes.fechaTimbrado),
        selloCFD: timbradoRes.selloCFD,
        selloSAT: timbradoRes.selloSAT,
        noCertificadoSAT: timbradoRes.noCertificadoSAT,
        cadenaOriginal: timbradoRes.cadenaOriginalSAT,
        qrCodeData: timbradoRes.qrCodeUrl,
        rawXml: timbradoRes.xmlTimbrado,
        saldoPendiente,
        fechaEfectivoCobro,
        estaConciliada,
        items: {
          create: conceptos.map((c: {
            claveProdServ: string;
            claveUnidad?: string;
            unidad?: string;
            descripcion: string;
            cantidad: number;
            valorUnitario: number;
            descuento?: number;
            objetoImp?: string;
            ivaTasa?: number;
            retIsrTasa?: number;
            retIvaTasa?: number;
          }) => {
            const cant = Number(c.cantidad) || 1;
            const vu = Number(c.valorUnitario) || 0;
            const imp = Number((cant * vu).toFixed(2));
            const ivaTasa = c.ivaTasa !== undefined ? Number(c.ivaTasa) : 0.16;
            const ivaImporte = Number((imp * ivaTasa).toFixed(2));
            const retIsrTasa = Number(c.retIsrTasa) || 0;
            const retIsrImporte = Number((imp * retIsrTasa).toFixed(2));
            const retIvaTasa = Number(c.retIvaTasa) || 0;
            const retIvaImporte = Number((imp * retIvaTasa).toFixed(2));

            return {
              claveProdServ: c.claveProdServ || "80141600",
              claveUnidad: c.claveUnidad || "E48",
              unidad: c.unidad || "Servicio",
              descripcion: c.descripcion,
              cantidad: cant,
              valorUnitario: vu,
              importe: imp,
              descuento: Number(c.descuento) || 0,
              objetoImp: c.objetoImp || "02",
              ivaTasa,
              ivaImporte,
              retIsrTasa,
              retIsrImporte,
              retIvaTasa,
              retIvaImporte,
            };
          }),
        },
      },
      include: {
        items: true,
      },
    });

    // 3. Incrementar folio en la organización
    await prisma.organization.update({
      where: { id: activeOrg.id },
      data: { folioActual: { increment: 1 } },
    });

    // 4. Generar Póliza Contable Automática
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
      include: { entries: true },
    });

    return NextResponse.json({
      success: true,
      invoice,
      timbrado: timbradoRes,
      poliza,
    });
  } catch (error: unknown) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
