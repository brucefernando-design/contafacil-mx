import { describe, it, expect, beforeEach, vi } from "vitest";
import { sumarBaseMensual } from "@/lib/sat/papel-trabajo";
import { prisma } from "@/lib/prisma";

describe("Papel de Trabajo Mensual SAT - Lógica de Flujo de Efectivo", () => {
  const mockOrgId = "org-test-papel-trabajo";
  const year = 2026;
  const month = 9;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("1. Una factura PUE emitida SÍ entra a ingresos cobrados del mes", async () => {
    // Factura PUE por $10,000 + $1,600 IVA
    (vi.spyOn(prisma.invoice, "findMany") as any).mockImplementation((args: any) => {
      if (args?.where?.tipo === "EMITIDA") {
        return Promise.resolve([
          {
            id: "inv-pue",
            tipo: "EMITIDA",
            metodoPago: "PUE",
            subtotal: 10000,
            totalIvaTrasladado: 1600,
            totalIsrRetenido: 125,
            totalIvaRetenido: 1066.67,
            total: 10408.33,
            paymentComplements: [],
          },
        ] as any);
      }
      return Promise.resolve([]);
    });

    vi.spyOn(prisma.paymentComplement, "findMany").mockResolvedValue([]);

    const res = await sumarBaseMensual({ organizationId: mockOrgId, year, month });

    expect(res.ingresosCobrados).toBe(10000);
    expect(res.ivaCobrado).toBe(1600);
    expect(res.retencionesIsr).toBe(125);
    expect(res.conteo.emitidasPueCount).toBe(1);
    expect(res.conteo.emitidasPpdCobradosCount).toBe(0);
  });

  it("2. Una factura PPD emitida NO sube ingresos cobrados si no tiene complemento de pago en el mes", async () => {
    // Factura PPD por $50,000 sin complementos de pago
    (vi.spyOn(prisma.invoice, "findMany") as any).mockImplementation((args: any) => {
      if (args?.where?.tipo === "EMITIDA") {
        return Promise.resolve([
          {
            id: "inv-ppd-sin-pago",
            tipo: "EMITIDA",
            metodoPago: "PPD",
            subtotal: 50000,
            totalIvaTrasladado: 8000,
            totalIsrRetenido: 0,
            totalIvaRetenido: 0,
            total: 58000,
            paymentComplements: [],
          },
        ] as any);
      }
      return Promise.resolve([]);
    });

    vi.spyOn(prisma.paymentComplement, "findMany").mockResolvedValue([]);

    const res = await sumarBaseMensual({ organizationId: mockOrgId, year, month });

    expect(res.ingresosCobrados).toBe(0);
    expect(res.ivaCobrado).toBe(0);
    expect(res.conteo.emitidasPpdCount).toBe(1);
    expect(res.conteo.emitidasPpdCobradosCount).toBe(0);
  });

  it("3. Un complemento de pago de factura PPD prorratea e ingresa en el mes pagado", async () => {
    // Factura PPD total $58,000 (Subtotal $50,000 + IVA $8,000)
    // Pago parcial en septiembre de $29,000 (50% de la factura)
    const fechaSeptiembre = new Date(2026, 8, 15);

    (vi.spyOn(prisma.invoice, "findMany") as any).mockImplementation((args: any) => {
      if (args?.where?.tipo === "EMITIDA") {
        return Promise.resolve([
          {
            id: "inv-ppd-pagada",
            tipo: "EMITIDA",
            metodoPago: "PPD",
            subtotal: 50000,
            totalIvaTrasladado: 8000,
            totalIsrRetenido: 0,
            totalIvaRetenido: 0,
            total: 58000,
            paymentComplements: [
              {
                id: "pay-1",
                monto: 29000,
                fechaPago: fechaSeptiembre,
              },
            ],
          },
        ] as any);
      }
      return Promise.resolve([]);
    });

    vi.spyOn(prisma.paymentComplement, "findMany").mockResolvedValue([]);

    const res = await sumarBaseMensual({ organizationId: mockOrgId, year, month });

    expect(res.ingresosCobrados).toBe(25000); // 50% de 50,000
    expect(res.ivaCobrado).toBe(4000); // 50% de 8,000
    expect(res.conteo.emitidasPpdCobradosCount).toBe(1);
  });

  it("4. Gastos recibidos PPD no pagados NO se suman a deducciones pagadas", async () => {
    (vi.spyOn(prisma.invoice, "findMany") as any).mockImplementation((args: any) => {
      if (args?.where?.tipo === "RECIBIDA") {
        return Promise.resolve([
          // Gasto 1: PUE pagado $5,000
          {
            id: "gasto-pue",
            tipo: "RECIBIDA",
            metodoPago: "PUE",
            subtotal: 5000,
            totalIvaTrasladado: 800,
            estaConciliada: true,
            saldoPendiente: 0,
          },
          // Gasto 2: PPD NO pagado $20,000 (Pendiente de pago)
          {
            id: "gasto-ppd-pendiente",
            tipo: "RECIBIDA",
            metodoPago: "PPD",
            subtotal: 20000,
            totalIvaTrasladado: 3200,
            estaConciliada: false,
            saldoPendiente: 23200,
            fechaEfectivoCobro: null,
          },
        ] as any);
      }
      return Promise.resolve([]);
    });

    vi.spyOn(prisma.paymentComplement, "findMany").mockResolvedValue([]);

    const res = await sumarBaseMensual({ organizationId: mockOrgId, year, month });

    expect(res.deduccionesPagadas).toBe(5000);
    expect(res.ivaPagado).toBe(800);
    expect(res.conteo.gastosPagadosCount).toBe(1);
    expect(res.conteo.gastosPpdPendientesCount).toBe(1);
  });
});
