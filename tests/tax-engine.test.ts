import { describe, it, expect } from "vitest";
import {
  calcularImpuestosSat2026,
  calcularIsrArt96,
  calcularFechaVencimientoSat,
  obtenerNombreMes,
  TABLA_RESICO_PF_2026,
  TARIFA_ART96_MENSUAL_2026,
} from "../src/lib/sat/tax-engine";

describe("EasyConta MX - Motor Fiscal SAT 2026 (Tax Engine)", () => {
  // 1. RESICO PF Rango 1 (1.00%)
  it("1. RESICO PF: Aplica tasa 1.00% para ingresos hasta $25,000", () => {
    const res = calcularImpuestosSat2026({
      regimenFiscal: "626",
      tipoPersona: "PF",
      ingresosCobrados: 20000,
      deduccionesPagadas: 5000,
      retencionesIsr: 0,
      retencionesIva: 0,
      ivaCobrado: 3200,
      ivaPagado: 800,
    });

    expect(res.regimenFiscal).toBe("626");
    expect(res.tasaOcuotaIsr).toBe(1.0);
    expect(res.isrDeterminado).toBe(200); // 20000 * 0.01
    expect(res.isrAPagar).toBe(200);
    expect(res.deduccionesAplicadas).toBe(0); // En RESICO no aplican deducciones para ISR
  });

  // 2. RESICO PF Rango 2 (1.10%)
  it("2. RESICO PF: Aplica tasa 1.10% para ingresos hasta $50,000", () => {
    const res = calcularImpuestosSat2026({
      regimenFiscal: "626",
      tipoPersona: "PF",
      ingresosCobrados: 40000,
      deduccionesPagadas: 0,
      retencionesIsr: 0,
      retencionesIva: 0,
      ivaCobrado: 6400,
      ivaPagado: 0,
    });

    expect(res.tasaOcuotaIsr).toBe(1.1);
    expect(res.isrDeterminado).toBe(440); // 40000 * 0.011
    expect(res.isrAPagar).toBe(440);
  });

  // 3. RESICO PF Rango 3 (1.50%)
  it("3. RESICO PF: Aplica tasa 1.50% para ingresos hasta $83,333.33", () => {
    const res = calcularImpuestosSat2026({
      regimenFiscal: "626",
      tipoPersona: "PF",
      ingresosCobrados: 75000,
      deduccionesPagadas: 0,
      retencionesIsr: 0,
      retencionesIva: 0,
      ivaCobrado: 12000,
      ivaPagado: 0,
    });

    expect(res.tasaOcuotaIsr).toBe(1.5);
    expect(res.isrDeterminado).toBe(1125); // 75000 * 0.015
    expect(res.isrAPagar).toBe(1125);
  });

  // 4. RESICO PF Rango 4 (2.00%)
  it("4. RESICO PF: Aplica tasa 2.00% para ingresos hasta $208,333.33", () => {
    const res = calcularImpuestosSat2026({
      regimenFiscal: "626",
      tipoPersona: "PF",
      ingresosCobrados: 150000,
      deduccionesPagadas: 0,
      retencionesIsr: 0,
      retencionesIva: 0,
      ivaCobrado: 24000,
      ivaPagado: 0,
    });

    expect(res.tasaOcuotaIsr).toBe(2.0);
    expect(res.isrDeterminado).toBe(3000); // 150000 * 0.02
    expect(res.isrAPagar).toBe(3000);
  });

  // 5. RESICO PF Rango 5 (2.50%)
  it("5. RESICO PF: Aplica tasa 2.50% para ingresos hasta $291,666.67", () => {
    const res = calcularImpuestosSat2026({
      regimenFiscal: "626",
      tipoPersona: "PF",
      ingresosCobrados: 250000,
      deduccionesPagadas: 0,
      retencionesIsr: 0,
      retencionesIva: 0,
      ivaCobrado: 40000,
      ivaPagado: 0,
    });

    expect(res.tasaOcuotaIsr).toBe(2.5);
    expect(res.isrDeterminado).toBe(6250); // 250000 * 0.025
    expect(res.isrAPagar).toBe(6250);
  });

  // 6. RESICO PF con retención de Persona Moral (1.25%)
  it("6. RESICO PF: Acredita retención de PM correctamente", () => {
    // Si cobró 100,000 a PM, la PM le retiene 1.25% ($1,250)
    // Tasa RESICO mensual = 2.00% ($2,000)
    // ISR a pagar = 2,000 - 1,250 = 750
    const res = calcularImpuestosSat2026({
      regimenFiscal: "626",
      tipoPersona: "PF",
      ingresosCobrados: 100000,
      deduccionesPagadas: 10000,
      retencionesIsr: 1250,
      retencionesIva: 10666.67,
      ivaCobrado: 16000,
      ivaPagado: 1600,
    });

    expect(res.isrDeterminado).toBe(2000);
    expect(res.retencionesIsr).toBe(1250);
    expect(res.isrAPagar).toBe(750);
  });

  // 7. Actividad Empresarial (612): deducciones mayores a ingresos resultan en base 0
  it("7. Actividad Empresarial (612): Base gravable cero y cero ISR si deducciones superan ingresos", () => {
    const res = calcularImpuestosSat2026({
      regimenFiscal: "612",
      tipoPersona: "PF",
      ingresosCobrados: 25000,
      deduccionesPagadas: 30000,
      retencionesIsr: 0,
      retencionesIva: 0,
      ivaCobrado: 4000,
      ivaPagado: 4800,
    });

    expect(res.deduccionesAplicadas).toBe(30000);
    expect(res.baseGravable).toBe(0);
    expect(res.isrDeterminado).toBe(0);
    expect(res.isrAPagar).toBe(0);
  });

  // 8. Actividad Empresarial (612): Cálculo Art. 96 tramo intermedio
  it("8. Actividad Empresarial (612): Aplica tarifa progresiva Art. 96 LISR", () => {
    // Ingresos 40,000, deducciones 15,000 -> base gravable 25,000
    // Tramo 15,487.72 a 31,236.50: cuota fija 1,640.67, excedente * 23.52%
    // Excedente: 25,000 - 15,487.72 = 9,512.28
    // Impuesto marginal: 9,512.28 * 0.2352 = 2,237.288
    // ISR: 1,640.67 + 2,237.288 = 3,877.96
    const res = calcularImpuestosSat2026({
      regimenFiscal: "612",
      tipoPersona: "PF",
      ingresosCobrados: 40000,
      deduccionesPagadas: 15000,
      retencionesIsr: 0,
      retencionesIva: 0,
      ivaCobrado: 6400,
      ivaPagado: 2400,
    });

    expect(res.baseGravable).toBe(25000);
    expect(res.isrDeterminado).toBeCloseTo(3877.96, 1);
    expect(res.tasaOcuotaIsr).toBe(23.52);
  });

  // 9. Actividad Empresarial (612) con pagos provisionales y retenciones previas
  it("9. Actividad Empresarial (612): Acredita retenciones y pagos provisionales previos", () => {
    const res = calcularImpuestosSat2026({
      regimenFiscal: "612",
      tipoPersona: "PF",
      ingresosCobrados: 40000,
      deduccionesPagadas: 15000,
      retencionesIsr: 1000,
      pagosProvisionalesPreviosIsr: 2000,
      retencionesIva: 0,
      ivaCobrado: 6400,
      ivaPagado: 2400,
    });

    // ISR det ~3877.96 - 1000 - 2000 = 877.96
    expect(res.isrAPagar).toBeCloseTo(877.96, 1);
  });

  // 10. Arrendamiento (606) con Deducción Ciega 35% + Predial
  it("10. Arrendamiento (606): Aplica Deducción Ciega (35%) más impuesto predial", () => {
    // Renta cobrada: 30,000
    // Deducción ciega 35% = 10,500
    // Predial = 1,500
    // Deducciones totales = 12,000
    // Base gravable = 18,000
    // Tramo Art 96 (15,487.72 a 31,236.50): cuota 1640.67 + (18000 - 15487.72) * 0.2352
    // = 1640.67 + 590.89 = 2231.56
    const res = calcularImpuestosSat2026({
      regimenFiscal: "606",
      tipoPersona: "PF",
      ingresosCobrados: 30000,
      deduccionesPagadas: 0,
      usaDeduccionCiega: true,
      impuestoPredial: 1500,
      retencionesIsr: 0,
      retencionesIva: 0,
      ivaCobrado: 4800,
      ivaPagado: 0,
    });

    expect(res.deduccionesAplicadas).toBe(12000);
    expect(res.baseGravable).toBe(18000);
    expect(res.isrDeterminado).toBeCloseTo(2231.56, 1);
  });

  // 11. Arrendamiento (606) con Gastos Comprobados (sin deducción ciega)
  it("11. Arrendamiento (606): Aplica deducciones comprobadas cuando usaDeduccionCiega es falso", () => {
    const res = calcularImpuestosSat2026({
      regimenFiscal: "606",
      tipoPersona: "PF",
      ingresosCobrados: 30000,
      deduccionesPagadas: 8000,
      usaDeduccionCiega: false,
      retencionesIsr: 0,
      retencionesIva: 0,
      ivaCobrado: 4800,
      ivaPagado: 1280,
    });

    expect(res.deduccionesAplicadas).toBe(8000);
    expect(res.baseGravable).toBe(22000);
  });

  // 12. General PM (601): Cálculo con Coeficiente de Utilidad y Tasa 30%
  it("12. General de Ley PM (601): Aplica CU configurado y tasa 30% corporativa", () => {
    // Ingresos: 500,000, CU: 0.10 (10%)
    // Utilidad fiscal = 50,000
    // ISR 30% = 15,000
    const res = calcularImpuestosSat2026({
      regimenFiscal: "601",
      tipoPersona: "PM",
      ingresosCobrados: 500000,
      deduccionesPagadas: 300000,
      coeficienteUtilidad: 0.1,
      retencionesIsr: 0,
      retencionesIva: 0,
      ivaCobrado: 80000,
      ivaPagado: 48000,
    });

    expect(res.regimenFiscal).toBe("601");
    expect(res.baseGravable).toBe(50000);
    expect(res.tasaOcuotaIsr).toBe(30.0);
    expect(res.isrDeterminado).toBe(15000);
    expect(res.isrAPagar).toBe(15000);
  });

  // 13. General PM (601): Amortización de pérdidas fiscales anteriores
  it("13. General de Ley PM (601): Amortiza pérdidas fiscales anteriores de la base", () => {
    // Ingresos: 500,000, CU: 0.10 -> Utilidad 50,000
    // Pérdidas fiscales anteriores: 20,000
    // Base gravable neta: 30,000
    // ISR 30% = 9,000
    const res = calcularImpuestosSat2026({
      regimenFiscal: "601",
      tipoPersona: "PM",
      ingresosCobrados: 500000,
      deduccionesPagadas: 0,
      coeficienteUtilidad: 0.1,
      perdidasFiscalesAnteriores: 20000,
      retencionesIsr: 0,
      retencionesIva: 0,
      ivaCobrado: 80000,
      ivaPagado: 48000,
    });

    expect(res.baseGravable).toBe(30000);
    expect(res.isrDeterminado).toBe(9000);
    expect(res.isrAPagar).toBe(9000);
  });

  // 14. IVA: Cálculo de Saldo a Favor
  it("14. IVA SAT: Detecta correctamente saldo a favor cuando IVA pagado supera al cobrado", () => {
    const res = calcularImpuestosSat2026({
      regimenFiscal: "612",
      tipoPersona: "PF",
      ingresosCobrados: 20000,
      deduccionesPagadas: 35000,
      retencionesIsr: 0,
      retencionesIva: 0,
      ivaCobrado: 3200,
      ivaPagado: 5600,
    });

    expect(res.ivaTrasladado).toBe(3200);
    expect(res.ivaAcreditable).toBe(5600);
    expect(res.esSaldoAFavorIva).toBe(true);
    expect(res.saldoAFavorIvaMonto).toBe(2400); // 5600 - 3200
    expect(res.ivaAPagar).toBe(0);
  });

  // 15. IVA: Cálculo de IVA a pagar con retenciones de IVA
  it("15. IVA SAT: Determina IVA a pagar neto descontando retenciones de IVA", () => {
    // IVA cobrado: 16,000
    // IVA acreditable (pagado): 6,000
    // Retención IVA por PM: 5,000
    // IVA neto a pagar: 16,000 - 6,000 - 5,000 = 5,000
    const res = calcularImpuestosSat2026({
      regimenFiscal: "612",
      tipoPersona: "PF",
      ingresosCobrados: 100000,
      deduccionesPagadas: 37500,
      retencionesIsr: 0,
      retencionesIva: 5000,
      ivaCobrado: 16000,
      ivaPagado: 6000,
    });

    expect(res.esSaldoAFavorIva).toBe(false);
    expect(res.saldoAFavorIvaMonto).toBe(0);
    expect(res.ivaAPagar).toBe(5000);
  });

  // 16. Error ante régimen fiscal no soportado
  it("16. Motor Fiscal: Lanza excepción explícita si el régimen no es soportado (sin fallback silencioso a PM)", () => {
    expect(() => {
      calcularImpuestosSat2026({
        regimenFiscal: "999",
        tipoPersona: "PF",
        ingresosCobrados: 10000,
        deduccionesPagadas: 2000,
        retencionesIsr: 0,
        retencionesIva: 0,
        ivaCobrado: 1600,
        ivaPagado: 320,
      });
    }).toThrowError(/Régimen fiscal no soportado: '999'/);
  });

  // 17. Tarifa Art. 96: Rango mínimo base <= 0
  it("17. Tarifa Art. 96: Retorna 0 si base gravable es menor o igual a cero", () => {
    const calc = calcularIsrArt96(0);
    expect(calc.isrDeterminado).toBe(0);
    expect(calc.tasaMarginal).toBe(0);

    const calcNeg = calcularIsrArt96(-500);
    expect(calcNeg.isrDeterminado).toBe(0);
  });

  // 18. Tarifa Art. 96: Rango máximo superior (> $125,325.21)
  it("18. Tarifa Art. 96: Aplica tasa máxima de 35% en rango superior", () => {
    const base = 200000;
    const calc = calcularIsrArt96(base);
    expect(calc.tasaMarginal).toBe(35);
    // Tramo 10: cuota 35719.53 + (200000 - 125325.21) * 0.35 = 35719.53 + 26136.1765 = 61855.71
    expect(calc.isrDeterminado).toBeCloseTo(61855.71, 1);
  });

  // 19. Regla 6to dígito RFC para vencimiento fiscal
  it("19. Calendario SAT: Calcula fecha límite con días adicionales según 6to dígito de RFC", () => {
    // RFC con dígito 1 o 2 -> 1 día adicional (17 + 1 = 18)
    const res1 = calcularFechaVencimientoSat("XAXX010101001", 2026, 1); // Enero 2026 declara en Feb
    expect(res1.diasAdicionales).toBe(1);
    expect(res1.fechaLimite.getDate()).toBe(18);

    // RFC con dígito 9 o 0 -> 5 días adicionales (17 + 5 = 22)
    const res9 = calcularFechaVencimientoSat("XAXX010101009", 2026, 1);
    expect(res9.diasAdicionales).toBe(5);
    expect(res9.fechaLimite.getDate()).toBe(22);
  });

  // 20. Helper de nombres de mes
  it("20. Utilidades: Devuelve nombre de meses en español correctamente", () => {
    expect(obtenerNombreMes(1)).toBe("Enero");
    expect(obtenerNombreMes(9)).toBe("Septiembre");
    expect(obtenerNombreMes(12)).toBe("Diciembre");
  });
});

