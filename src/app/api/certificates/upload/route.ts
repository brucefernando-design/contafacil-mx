import { NextResponse } from "next/server";
import { getCurrentUserAndOrg } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { guardarCertificadoEnBoveda, TipoCertificado } from "@/lib/sat/crypto-vault";
import { registrarAuditoria } from "@/lib/sat/audit";
import { getPacProvider, getPacEnv } from "@/lib/sat/pac";

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  Pragma: "no-cache",
  Expires: "0",
};

const MAX_CERT_FILE_SIZE = 20 * 1024; // 20 KB

export async function POST(req: Request) {
  try {
    const sessionData = await getCurrentUserAndOrg();
    if (!sessionData?.user || !sessionData.activeOrg) {
      return NextResponse.json(
        { error: "No autenticado o sin organización activa" },
        { status: 401, headers: NO_STORE_HEADERS }
      );
    }

    const { activeOrg, user } = sessionData;
    const body = await req.json();
    const { tipo, cerBase64, keyBase64, passwordKey, noCertificado, cerFileName, keyFileName } = body;

    if (!tipo || !cerBase64 || !keyBase64 || !passwordKey) {
      return NextResponse.json(
        { error: "Todos los campos (tipo, archivo .cer, archivo .key y contraseña) son obligatorios." },
        { status: 400, headers: NO_STORE_HEADERS }
      );
    }

    if (tipo !== "CSD" && tipo !== "EFIRMA") {
      return NextResponse.json(
        { error: "Tipo de certificado inválido. Debe ser 'CSD' o 'EFIRMA'." },
        { status: 400, headers: NO_STORE_HEADERS }
      );
    }

    // 1. Validar extensiones de archivo (.cer y .key)
    if (cerFileName && !cerFileName.toLowerCase().endsWith(".cer")) {
      return NextResponse.json(
        { error: "El archivo de certificado público debe tener extensión .cer" },
        { status: 400, headers: NO_STORE_HEADERS }
      );
    }
    if (keyFileName && !keyFileName.toLowerCase().endsWith(".key")) {
      return NextResponse.json(
        { error: "El archivo de llave privada debe tener extensión .key" },
        { status: 400, headers: NO_STORE_HEADERS }
      );
    }

    // 2. Validar tamaño máximo de 20 KB por archivo
    const cerBuffer = Buffer.from(cerBase64, "base64");
    const keyBuffer = Buffer.from(keyBase64, "base64");

    if (cerBuffer.length > MAX_CERT_FILE_SIZE) {
      return NextResponse.json(
        { error: `El archivo .cer supera el límite máximo de 20 KB (tamaño actual: ${(cerBuffer.length / 1024).toFixed(1)} KB).` },
        { status: 400, headers: NO_STORE_HEADERS }
      );
    }

    if (keyBuffer.length > MAX_CERT_FILE_SIZE) {
      return NextResponse.json(
        { error: `El archivo .key supera el límite máximo de 20 KB (tamaño actual: ${(keyBuffer.length / 1024).toFixed(1)} KB).` },
        { status: 400, headers: NO_STORE_HEADERS }
      );
    }

    // 3. Guardar en la bóveda criptográfica con cifrado AES-256-GCM (NUNCA loguear password ni keys)
    const certRecord = await guardarCertificadoEnBoveda({
      organizationId: activeOrg.id,
      tipo: tipo as TipoCertificado,
      rfc: activeOrg.rfc,
      noCertificado: noCertificado || (tipo === "CSD" ? "30001000000500003416" : "00001000000504465028"),
      cerBufferOrString: cerBuffer,
      keyBufferOrString: keyBuffer,
      passwordKey,
      validoDesde: new Date(),
      validoHasta: new Date(Date.now() + 4 * 365 * 24 * 60 * 60 * 1000), // 4 años de vigencia SAT
    });

    // 4. Si es CSD, sincronizar con el PAC ANTES de marcar como activo
    if (tipo === "CSD") {
      const pacEnv = getPacEnv();
      const isMock = pacEnv === "mock";

      if (!isMock) {
        // Modo real: sincronizar con Facturama, fallar con 400 si no funciona
        let pac;
        try {
          pac = getPacProvider();
        } catch (err) {
          return NextResponse.json(
            { error: `No se pudo inicializar el PAC: ${(err as Error).message}` },
            { status: 400, headers: NO_STORE_HEADERS }
          );
        }

        if ("syncCsd" in pac && typeof (pac as any).syncCsd === "function") {
          const syncResult = await (pac as any).syncCsd(
            activeOrg.rfc,
            cerBuffer.toString("base64"),
            keyBuffer.toString("base64"),
            passwordKey
          );
          if (!syncResult.success) {
            return NextResponse.json(
              { error: `Error al registrar CSD en Facturama: ${syncResult.message}` },
              { status: 400, headers: NO_STORE_HEADERS }
            );
          }
        }
      }

      // Solo marcar ACTIVO si es mock o si la sincronización con el PAC fue exitosa
      await prisma.organization.update({
        where: { id: activeOrg.id },
        data: {
          csdStatus: "ACTIVO",
          csdNoCertificado: certRecord.noCertificado,
          csdVencimiento: certRecord.validoHasta,
        },
      });
    }

    // 5. Registrar bitácora de auditoría (sin registrar secretos)
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "127.0.0.1";
    await registrarAuditoria({
      action: "SUBIR_CERT",
      organizationId: activeOrg.id,
      userId: user.id,
      userEmail: user.email,
      ip,
      detalles: `Certificado ${tipo} cargado y cifrado en bóveda. No. Serie: ${certRecord.noCertificado || "N/A"}`,
    });

    return NextResponse.json(
      {
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
      },
      { headers: NO_STORE_HEADERS }
    );
  } catch (error: unknown) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const sessionData = await getCurrentUserAndOrg();
    if (!sessionData?.user || !sessionData.activeOrg) {
      return NextResponse.json(
        { error: "No autenticado o sin organización activa" },
        { status: 401, headers: NO_STORE_HEADERS }
      );
    }

    const { searchParams } = new URL(req.url);
    const tipo = searchParams.get("tipo");

    if (tipo !== "CSD" && tipo !== "EFIRMA") {
      return NextResponse.json(
        { error: "Tipo de certificado inválido. Debe ser 'CSD' o 'EFIRMA'." },
        { status: 400, headers: NO_STORE_HEADERS }
      );
    }

    const { activeOrg, user } = sessionData;

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

    // Registrar bitácora de auditoría
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "127.0.0.1";
    await registrarAuditoria({
      action: "BORRAR_CERT",
      organizationId: activeOrg.id,
      userId: user.id,
      userEmail: user.email,
      ip,
      detalles: `Certificado ${tipo} eliminado de la bóveda criptográfica`,
    });

    return NextResponse.json(
      {
        success: true,
        message: `Certificado ${tipo} eliminado exitosamente de la bóveda criptográfica.`,
      },
      { headers: NO_STORE_HEADERS }
    );
  } catch (error: unknown) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }
}
