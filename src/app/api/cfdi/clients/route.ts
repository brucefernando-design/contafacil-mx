import { NextResponse } from "next/server";
import { getCurrentUserAndOrg } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const sessionData = await getCurrentUserAndOrg();
    if (!sessionData?.user || !sessionData.activeOrg) {
      return NextResponse.json({ clients: [] }, { status: 401 });
    }

    const { activeOrg } = sessionData;

    // Obtener clientes únicos a partir de facturas emitidas históricamente
    const pastInvoices = await prisma.invoice.findMany({
      where: {
        organizationId: activeOrg.id,
      },
      select: {
        receptorRfc: true,
        receptorNombre: true,
        receptorCp: true,
        receptorRegimen: true,
        receptorUsoCfdi: true,
        formaPago: true,
        metodoPago: true,
      },
      orderBy: {
        fecha: "desc",
      },
      take: 100,
    });

    const seenRfcs = new Set<string>();
    const clients: Array<{
      rfc: string;
      nombre: string;
      codigoPostal: string;
      regimenFiscal: string;
      usoCfdi: string;
      formaPago?: string;
      metodoPago?: "PUE" | "PPD";
    }> = [];

    for (const inv of pastInvoices) {
      const cleanRfc = inv.receptorRfc.trim().toUpperCase();
      if (!seenRfcs.has(cleanRfc)) {
        seenRfcs.add(cleanRfc);
        clients.push({
          rfc: cleanRfc,
          nombre: inv.receptorNombre.trim().toUpperCase(),
          codigoPostal: inv.receptorCp,
          regimenFiscal: inv.receptorRegimen,
          usoCfdi: inv.receptorUsoCfdi,
          formaPago: inv.formaPago,
          metodoPago: inv.metodoPago as "PUE" | "PPD",
        });
      }
    }

    return NextResponse.json({ clients });
  } catch (error) {
    return NextResponse.json({ clients: [] }, { status: 500 });
  }
}
