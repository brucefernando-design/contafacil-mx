import { NextResponse } from "next/server";
import { getCurrentUserAndOrg } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { calcularReciboNomina } from "@/lib/sat/payroll-engine";
import Decimal from "decimal.js";

// Listar periodos de nómina
export async function GET() {
  try {
    const sessionData = await getCurrentUserAndOrg();
    if (!sessionData?.user || !sessionData.activeOrg) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const periods = await prisma.payrollPeriod.findMany({
      where: {
        organizationId: sessionData.activeOrg.id,
      },
      include: {
        receipts: {
          include: {
            employee: true,
          },
        },
      },
      orderBy: {
        fechaPago: "desc",
      },
    });

    return NextResponse.json({ periods });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Error al obtener periodos de nómina" },
      { status: 500 }
    );
  }
}

// Crear y calcular un nuevo periodo de nómina para todos los empleados activos
export async function POST(req: Request) {
  try {
    const sessionData = await getCurrentUserAndOrg();
    if (!sessionData?.user || !sessionData.activeOrg) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const { activeOrg } = sessionData;
    const orgId = activeOrg.id;

    const body = await req.json();
    const {
      descripcion,
      tipoNomina = "ORDINARIA",
      periodicidad = "QUINCENAL",
      fechaInicio,
      fechaFin,
      fechaPago,
      diasPagados = 15,
      employeeIds, // Opcional: lista de IDs específicos, o todos los activos si no se envía
    } = body;

    if (!descripcion || !fechaInicio || !fechaFin || !fechaPago) {
      return NextResponse.json(
        { error: "Faltan datos obligatorios del periodo: Descripción, Fechas de Inicio, Fin o Pago." },
        { status: 400 }
      );
    }

    // Buscar empleados a procesar
    const whereEmployees: any = {
      organizationId: sessionData.activeOrg.id,
      status: "ACTIVO",
    };

    if (employeeIds && Array.isArray(employeeIds) && employeeIds.length > 0) {
      whereEmployees.id = { in: employeeIds };
    }

    const employees = await prisma.employee.findMany({
      where: whereEmployees,
    });

    if (employees.length === 0) {
      return NextResponse.json(
        { error: "No se encontraron colaboradores activos para calcular la nómina." },
        { status: 400 }
      );
    }

    const numDias = parseFloat(diasPagados);

    // Calcular recibo para cada colaborador
    let sumPercepciones = new Decimal(0);
    let sumDeducciones = new Decimal(0);
    let sumRetIsr = new Decimal(0);
    let sumImssObrero = new Decimal(0);
    let sumOtrosPagos = new Decimal(0);
    let sumNeto = new Decimal(0);

    const calculatedReceiptsData = employees.map((emp) => {
      const calc = calcularReciboNomina({
        salarioDiario: Number(emp.salarioDiario),
        salarioBaseCotApor: Number(emp.salarioBaseCotApor),
        diasTrabajados: numDias,
        periodicidad: emp.periodicidadPago as "MENSUAL" | "QUINCENAL" | "SEMANAL",
        aplicaImss: emp.regimenContratacion === "SUELDOS_SALARIOS",
      });

      sumPercepciones = sumPercepciones.plus(calc.totalPercepciones);
      sumDeducciones = sumDeducciones.plus(calc.totalDeducciones);
      sumRetIsr = sumRetIsr.plus(calc.retencionIsr);
      sumImssObrero = sumImssObrero.plus(calc.imssObrero);
      sumOtrosPagos = sumOtrosPagos.plus(calc.totalOtrosPagos);
      sumNeto = sumNeto.plus(calc.netoPagar);

      return {
        organizationId: orgId,
        employeeId: emp.id,
        diasTrabajados: numDias,
        sueldoBruto: calc.sueldoBruto,
        percepciones: calc.percepciones,
        totalPercepciones: calc.totalPercepciones,
        totalPercepcionesGravadas: calc.totalGravado,
        totalPercepcionesExentas: calc.totalExento,
        deducciones: calc.deducciones,
        totalDeducciones: calc.totalDeducciones,
        retencionIsr: calc.retencionIsr,
        imssObrero: calc.imssObrero,
        otrosPagos: calc.otrosPagos,
        totalOtrosPagos: calc.totalOtrosPagos,
        netoPagar: calc.netoPagar,
        status: "CALCULADA" as const,
      };
    });

    // Guardar periodo y recibos en transacción
    const result = await prisma.$transaction(async (tx) => {
      const period = await tx.payrollPeriod.create({
        data: {
          organizationId: orgId,
          tipoNomina,
          descripcion: descripcion.trim(),
          periodicidad,
          fechaInicio: new Date(fechaInicio),
          fechaFin: new Date(fechaFin),
          fechaPago: new Date(fechaPago),
          diasPagados: numDias,
          totalPercepciones: sumPercepciones.toNumber(),
          totalDeducciones: sumDeducciones.toNumber(),
          totalRetencionIsr: sumRetIsr.toNumber(),
          totalImssObrero: sumImssObrero.toNumber(),
          totalOtrosPagos: sumOtrosPagos.toNumber(),
          totalNeto: sumNeto.toNumber(),
          status: "CALCULADA",
        },
      });

      // Crear recibos asociados
      await Promise.all(
        calculatedReceiptsData.map((rcpt) =>
          tx.payrollReceipt.create({
            data: {
              ...rcpt,
              payrollPeriodId: period.id,
            },
          })
        )
      );

      return period;
    });

    // Obtener periodo completo con recibos
    const finalPeriod = await prisma.payrollPeriod.findUnique({
      where: { id: result.id },
      include: {
        receipts: {
          include: {
            employee: true,
          },
        },
      },
    });

    return NextResponse.json({ period: finalPeriod }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Error al procesar y calcular la nómina" },
      { status: 500 }
    );
  }
}
