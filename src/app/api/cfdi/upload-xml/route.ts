import { NextResponse } from "next/server";
import { getCurrentUserAndOrg } from "@/lib/session";
import { importarCfdiXml } from "@/lib/sat/import-cfdi";

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

    const result = await importarCfdiXml({
      organizationId: activeOrg.id,
      orgRfc: activeOrg.rfc,
      xmlContent,
    });

    if (result.status === "DUPLICADO") {
      return NextResponse.json(
        { error: result.error || "El CFDI ya fue registrado previamente en el sistema." },
        { status: 409 }
      );
    }

    if (result.status === "INVALIDO") {
      return NextResponse.json(
        { error: result.error || "Error al parsear el CFDI" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      invoice: result.invoice,
      poliza: result.poliza,
      alertaEfo: result.alertaEfo,
      parsed: result.parsed,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Error al procesar el archivo XML CFDI" },
      { status: 500 }
    );
  }
}
