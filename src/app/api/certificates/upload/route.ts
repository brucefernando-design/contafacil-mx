import { NextResponse } from "next/server";
import { getCurrentUserAndOrg } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { guardarCertificadoEnBoveda, TipoCertificado } from "@/lib/sat/crypto-vault";

export async function POST(req: Request) {
  try {
    const sessionData = await getCurrentUserAndOrg();
    if (!sessionData?.user || !sessionData.activeOrg) {
      return NextResponse.json({ error: "No autenticado o sin organización activa" }, { status: 401 });
    }

    const { activeOrg } = sessionData;
    const body = await req.json();
    const { tipo, cerBase64, keyBase64, passwordKey, noCertificado } = body;

    if (!tipo || !cerBase64 || !keyBase64 || !passwordKey) {
      return NextResponse.json(
        { error: "Todos los campos (tipo, archivo .cer, archivo .key y contraseña) son obligatorios." },
        { status: 400 }
      );
    }

    if (tipo !== "CSD" && tipo !== "EFIRMA") {
      return NextResponse.json(
        { error: "Tipo de certificado inválido. Debe ser 'CSD' o 'EFIRMA'." },
        { status: 400 }
      );
    }

    // Guardar en la bóveda criptográfica con cifrado AES-256-GCM
    const certRecord = await guardarCertificadoEnBoveda({
      organizationId: activeOrg.id,
      tipo: tipo as TipoCertificado,
      rfc: activeOrg.rfc,
      noCertificado: noCertificado || (tipo === "CSD" ? "30001000000500003416" : "00001000000504465028"),
      cerBufferOrString: cerBase64,
      keyBufferOrString: keyBase64,
      passwordKey,
      validoDesde: new Date(),
      validoHasta: new Date(Date.now() + 4 * 365 * 24 * 60 * 60 * 1000), // 4 años de vigencia SAT
    });

    // Si es CSD, actualizar estatus en la organización
    if (tipo === "CSD") {
      await prisma.organization.update({
        where: { id: activeOrg.id },
        data: {
          csdStatus: "ACTIVO",
          csdNoCertificado: certRecord.noCertificado,
          csdVencimiento: certRecord.validoHasta,
        },
      });
    }

    return NextResponse.json({
      success: true,
      tipo,
      message: `Certificado ${tipo} resguardado exitosamente en Bóveda Criptográfica AES-256-GCM. ${
        tipo === "EFIRMA"
          ? "Aviso de Seguridad: La e.firma queda protegida exclusivamente para trámites y consultas SAT, NUNCA se utilizará para timbrado de facturas."
          : "El CSD está listo y activo para timbrado de comprobantes CFDI 4.0."
      }`,
      certificado: {
        id: certRecord.id,
        tipo: certRecord.tipo,
        rfc: certRecord.rfc,
        noCertificado: certRecord.noCertificado,
        validoHasta: certRecord.validoHasta,
        activo: certRecord.activo,
      },
    });
  } catch (error: unknown) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const sessionData = await getCurrentUserAndOrg();
    if (!sessionData?.user || !sessionData.activeOrg) {
      return NextResponse.json({ error: "No autenticado o sin organización activa" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const tipo = searchParams.get("tipo");

    if (tipo !== "CSD" && tipo !== "EFIRMA") {
      return NextResponse.json(
        { error: "Tipo de certificado inválido. Debe ser 'CSD' o 'EFIRMA'." },
        { status: 400 }
      );
    }

    const { activeOrg } = sessionData;

    // Eliminar registros de la bóveda para la organización y tipo
    await prisma.certificateVault.deleteMany({
      where: {
        organizationId: activeOrg.id,
        tipo: tipo as TipoCertificado,
      },
    });

    // Si es CSD, actualizar el estado en la organización
    if (tipo === "CSD") {
      await prisma.organization.update({
        where: { id: activeOrg.id },
        data: {
          csdStatus: "PENDIENTE",
          csdNoCertificado: null,
          csdVencimiento: null,
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: `Certificado ${tipo} eliminado exitosamente de la bóveda criptográfica.`,
    });
  } catch (error: unknown) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

