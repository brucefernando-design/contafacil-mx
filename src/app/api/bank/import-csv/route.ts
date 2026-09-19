import { NextResponse } from "next/server";
import { getCurrentUserAndOrg } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { parsearCsvBancario } from "@/lib/bank/csv-parser";

export async function POST(req: Request) {
  try {
    const sessionData = await getCurrentUserAndOrg();
    if (!sessionData?.user || !sessionData.activeOrg) {
      return NextResponse.json({ error: "No autenticado o sin organización activa" }, { status: 401 });
    }

    const { activeOrg } = sessionData;
    const body = await req.json();
    const { csvContent } = body;

    if (!csvContent || typeof csvContent !== "string") {
      return NextResponse.json({ error: "Contenido CSV inválido o vacío" }, { status: 400 });
    }

    const parsedTransactions = parsearCsvBancario(csvContent);

    if (parsedTransactions.length === 0) {
      return NextResponse.json({ error: "No se detectaron transacciones válidas en el archivo CSV." }, { status: 400 });
    }

    // Insertar transacciones bancarias
    const created = [];
    for (const tx of parsedTransactions) {
      const record = await prisma.bankTransaction.create({
        data: {
          organizationId: activeOrg.id,
          fecha: tx.fecha,
          concepto: tx.concepto,
          monto: tx.monto,
          tipo: tx.tipo,
          referencia: tx.referencia || null,
          conciliado: false,
        },
      });
      created.push(record);
    }

    return NextResponse.json({
      success: true,
      count: created.length,
      message: `Se importaron ${created.length} movimientos bancarios exitosamente.`,
      transactions: created,
    });
  } catch (error: unknown) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
