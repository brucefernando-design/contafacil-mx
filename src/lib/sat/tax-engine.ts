/**
 * ContaFácil MX - Motor Fiscal SAT 2026
 * Implementación de reglas fiscales oficiales para:
 * - 626: Régimen Simplificado de Confianza (RESICO PF) - Art. 113-E a 113-J LISR
 * - 612: Personas Físicas con Actividades Empresariales y Profesionales (AE) - Art. 96 / 106 LISR
 * - 606: Régimen de Arrendamiento (Deducción Ciega 35% o Comprobadas) - Art. 114 a 118 LISR
 * - 601: General de Ley Personas Morales (Coeficiente de Utilidad, Tasa 30%) - Art. 9 y 14 LISR
 *
 * Utiliza decimal.js para todas las operaciones aritméticas y redondeo a 2 decimales según reglas SAT.
 */

import Decimal from "decimal.js";

// Helper para convertir cualquier número/string/Decimal a Decimal seguro
export function toDec(val: number | string | Decimal | undefined | null): Decimal {
  if (val === undefined || val === null || val === "") return new Decimal(0);
  if (val instanceof Decimal) return val;
  try {
    return new Decimal(val);
  } catch {
    return new Decimal(0);
  }
}

// Redondea a 2 decimales usando ROUND_HALF_UP (regla SAT / bancaria estándar)
export function roundSat(val: Decimal | number | string): number {
  return toDec(val).toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toNumber();
}

export interface TaxCalculationInput {
  regimenFiscal: "626" | "612" | "606" | "601" | string;
  tipoPersona: "PF" | "PM";
  ingresosCobrados: number | Decimal; // Cobrados flujo de efectivo (o nominales devengados en PM)
  deduccionesPagadas: number | Decimal; // Gastos comprobados pagados
  retencionesIsr: number | Decimal; // Retenciones efectuadas por terceros (ej. PM a PF)
  retencionesIva: number | Decimal; // Retenciones de IVA efectuadas por terceros
  ivaCobrado: number | Decimal; // IVA trasladado cobrado (16%)
  ivaPagado: number | Decimal; // IVA acreditable pagado en gastos
  pagosProvisionalesPreviosIsr?: number | Decimal; // Pagos provisionales acumulados previos en el año
  coeficienteUtilidad?: number | Decimal; // Para PM General (ej. 0.0825 = 8.25%)
  usaDeduccionCiega?: boolean; // Para Arrendamiento PF (35% sin comprobante)
  impuestoPredial?: number | Decimal; // Para Arrendamiento con deducción ciega
  perdidasFiscalesAnteriores?: number | Decimal; // Amortización pérdidas fiscales
}

export interface TaxCalculationResult {
  regimenFiscal: string;
  nombreRegimen: string;
  ingresosBase: number;
  deduccionesAplicadas: number;
  baseGravable: number;
  tasaOcuotaIsr: number; // En porcentaje (ej. 1.5% o 30%)
  isrDeterminado: number;
  retencionesIsr: number;
  pagosPreviosIsr: number;
  isrAPagar: number; // ISR neto a pagar en banco / SAT
  ivaTrasladado: number;
  ivaAcreditable: number;
  retencionesIva: number;
  ivaAPagar: number; // Positivo a pagar, negativo saldo a favor
  esSaldoAFavorIva: boolean;
  saldoAFavorIvaMonto: number;
  desglosePasoAPaso: Array<{ paso: string; detalle: string; monto: number }>;
}

/**
 * Tabla mensual RESICO PF SAT 2026 (Art. 113-E LISR)
 */
export const TABLA_RESICO_PF_2026 = [
  { limiteSuperior: 25000.0, tasa: 0.01 }, // 1.00%
  { limiteSuperior: 50000.0, tasa: 0.011 }, // 1.10%
  { limiteSuperior: 83333.33, tasa: 0.015 }, // 1.50%
  { limiteSuperior: 208333.33, tasa: 0.02 }, // 2.00%
  { limiteSuperior: 291666.67, tasa: 0.025 }, // 2.50% (Tope anual $3.5M)
];

/**
 * Tarifa mensual Personas Físicas Art. 96 LISR (SAT 2026)
 */
export const TARIFA_ART96_MENSUAL_2026 = [
  { limiteInferior: 0.01, cuotaFija: 0.0, porcentajeExcedente: 0.0192 },
  { limiteInferior: 746.05, cuotaFija: 14.32, porcentajeExcedente: 0.064 },
  { limiteInferior: 6332.06, cuotaFija: 371.83, porcentajeExcedente: 0.1088 },
  { limiteInferior: 11128.02, cuotaFija: 893.63, porcentajeExcedente: 0.16 },
  { limiteInferior: 12935.83, cuotaFija: 1182.88, porcentajeExcedente: 0.1792 },
  { limiteInferior: 15487.72, cuotaFija: 1640.67, porcentajeExcedente: 0.2352 },
  { limiteInferior: 31236.5, cuotaFija: 5344.46, porcentajeExcedente: 0.3 },
  { limiteInferior: 49233.01, cuotaFija: 10743.41, porcentajeExcedente: 0.32 },
  { limiteInferior: 93993.91, cuotaFija: 25066.89, porcentajeExcedente: 0.34 },
  { limiteInferior: 125325.21, cuotaFija: 35719.53, porcentajeExcedente: 0.35 },
];

/**
 * Calcula el ISR aplicando la tarifa progresiva del Art. 96 LISR usando decimal.js
 */
export function calcularIsrArt96(baseGravableInput: number | Decimal): {
  isrDeterminado: number;
  limiteInferior: number;
  cuotaFija: number;
  tasaMarginal: number;
} {
  const baseGravable = toDec(baseGravableInput);
  if (baseGravable.lte(0)) {
    return { isrDeterminado: 0, limiteInferior: 0, cuotaFija: 0, tasaMarginal: 0 };
  }

  const baseNum = baseGravable.toNumber();

  // Buscar el renglón correspondiente en la tabla
  let tramo = TARIFA_ART96_MENSUAL_2026[0];
  for (let i = TARIFA_ART96_MENSUAL_2026.length - 1; i >= 0; i--) {
    if (baseNum >= TARIFA_ART96_MENSUAL_2026[i].limiteInferior) {
      tramo = TARIFA_ART96_MENSUAL_2026[i];
      break;
    }
  }

  const limInf = toDec(tramo.limiteInferior);
  const cuotaFija = toDec(tramo.cuotaFija);
  const porcExcedente = toDec(tramo.porcentajeExcedente);

  const excedente = Decimal.max(0, baseGravable.minus(limInf));
  const impuestoMarginal = excedente.times(porcExcedente);
  const isrDeterminado = cuotaFija.plus(impuestoMarginal);

  return {
    isrDeterminado: roundSat(isrDeterminado),
    limiteInferior: tramo.limiteInferior,
    cuotaFija: tramo.cuotaFija,
    tasaMarginal: roundSat(porcExcedente.times(100)),
  };
}

/**
 * Motor Fiscal Central SAT 2026 con aritmética precisa Decimal
 */
export function calcularImpuestosSat2026(input: TaxCalculationInput): TaxCalculationResult {
  const regimen = input.regimenFiscal;
  const pasos: Array<{ paso: string; detalle: string; monto: number }> = [];

  const ingresosCobrados = toDec(input.ingresosCobrados);
  const deduccionesPagadas = toDec(input.deduccionesPagadas);
  const retencionesIsr = toDec(input.retencionesIsr);
  const retencionesIva = toDec(input.retencionesIva);
  const ivaCobrado = toDec(input.ivaCobrado);
  const ivaPagado = toDec(input.ivaPagado);
  const pagosPreviosIsr = toDec(input.pagosProvisionalesPreviosIsr);

  let nombreRegimen = "";
  let deduccionesAplicadas = new Decimal(0);
  let baseGravable = new Decimal(0);
  let tasaOcuotaIsr = 0;
  let isrDeterminado = new Decimal(0);

  // 1. CÁLCULO DE ISR SEGÚN RÉGIMEN
  switch (regimen) {
    case "626": {
      // RESICO PERSONA FÍSICA
      nombreRegimen = "Régimen Simplificado de Confianza (RESICO PF)";
      pasos.push({
        paso: "1. Ingresos Cobrados",
        detalle: "Total efectivamente cobrado en el mes (Flujo de efectivo sin IVA)",
        monto: roundSat(ingresosCobrados),
      });

      // En RESICO PF NO se aplican deducciones para ISR
      deduccionesAplicadas = new Decimal(0);
      pasos.push({
        paso: "2. Deducciones para ISR",
        detalle: "En RESICO PF no aplican deducciones autorizadas para ISR (Art. 113-E LISR)",
        monto: 0,
      });

      baseGravable = ingresosCobrados;

      // Determinar tasa RESICO progresiva
      let tasaAplicable = 0.025; // Default máximo
      const baseNum = baseGravable.toNumber();
      for (const rango of TABLA_RESICO_PF_2026) {
        if (baseNum <= rango.limiteSuperior) {
          tasaAplicable = rango.tasa;
          break;
        }
      }
      tasaOcuotaIsr = roundSat(toDec(tasaAplicable).times(100));
      isrDeterminado = baseGravable.times(toDec(tasaAplicable));

      pasos.push({
        paso: "3. Tasa de ISR RESICO",
        detalle: `Tasa aplicable según rango mensual 2026: ${tasaOcuotaIsr}%`,
        monto: tasaOcuotaIsr,
      });
      pasos.push({
        paso: "4. ISR Determinado",
        detalle: `Base gravable ($${roundSat(baseGravable).toLocaleString("es-MX")}) × ${tasaOcuotaIsr}%`,
        monto: roundSat(isrDeterminado),
      });
      break;
    }

    case "612": {
      // ACTIVIDAD EMPRESARIAL Y PROFESIONAL
      nombreRegimen = "Personas Físicas con Actividades Empresariales y Profesionales";
      pasos.push({
        paso: "1. Ingresos Cobrados",
        detalle: "Ingresos acumulables cobrados en el mes",
        monto: roundSat(ingresosCobrados),
      });

      deduccionesAplicadas = deduccionesPagadas;
      pasos.push({
        paso: "2. Deducciones Autorizadas",
        detalle: "Gastos e inversiones indispensables pagados con CFDI",
        monto: roundSat(deduccionesAplicadas),
      });

      baseGravable = Decimal.max(0, ingresosCobrados.minus(deduccionesAplicadas));
      pasos.push({
        paso: "3. Base Gravable",
        detalle: "Ingresos cobrados menos deducciones pagadas",
        monto: roundSat(baseGravable),
      });

      const calcArt96 = calcularIsrArt96(baseGravable);
      isrDeterminado = toDec(calcArt96.isrDeterminado);
      tasaOcuotaIsr = calcArt96.tasaMarginal;

      pasos.push({
        paso: "4. Aplicación Tarifa Art. 96 LISR",
        detalle: `Límite Inferior: $${calcArt96.limiteInferior.toFixed(2)}, Cuota Fija: $${calcArt96.cuotaFija.toFixed(2)}, Tasa Marginal: ${calcArt96.tasaMarginal.toFixed(2)}%`,
        monto: roundSat(isrDeterminado),
      });
      break;
    }

    case "606": {
      // ARRENDAMIENTO
      nombreRegimen = "Régimen de Arrendamiento de Inmuebles";
      pasos.push({
        paso: "1. Ingresos por Arrendamiento",
        detalle: "Rentas efectivamente cobradas en el mes",
        monto: roundSat(ingresosCobrados),
      });

      if (input.usaDeduccionCiega !== false) {
        // Deducción ciega 35% + Predial
        const deduccion35 = ingresosCobrados.times(0.35);
        const predial = toDec(input.impuestoPredial);
        deduccionesAplicadas = deduccion35.plus(predial);
        pasos.push({
          paso: "2. Deducción Ciega (35%) + Predial",
          detalle: `35% sin comprobante ($${roundSat(deduccion35).toFixed(2)}) + Impuesto Predial pagado ($${roundSat(predial).toFixed(2)})`,
          monto: roundSat(deduccionesAplicadas),
        });
      } else {
        deduccionesAplicadas = deduccionesPagadas;
        pasos.push({
          paso: "2. Deducciones Comprobadas",
          detalle: "Mantenimiento, seguros e intereses reales pagados con CFDI",
          monto: roundSat(deduccionesAplicadas),
        });
      }

      baseGravable = Decimal.max(0, ingresosCobrados.minus(deduccionesAplicadas));
      pasos.push({
        paso: "3. Base Gravable",
        detalle: "Ingresos cobrados menos deducciones autorizadas",
        monto: roundSat(baseGravable),
      });

      const calcArt96Arr = calcularIsrArt96(baseGravable);
      isrDeterminado = toDec(calcArt96Arr.isrDeterminado);
      tasaOcuotaIsr = calcArt96Arr.tasaMarginal;

      pasos.push({
        paso: "4. ISR Determinado (Tarifa Art. 96)",
        detalle: `Impuesto calculado con tarifa mensual de personas físicas`,
        monto: roundSat(isrDeterminado),
      });
      break;
    }

    case "601": {
      // PERSONA MORAL RÉGIMEN GENERAL
      nombreRegimen = "General de Ley Personas Morales (Título II LISR)";
      const cu = toDec(input.coeficienteUtilidad || 0.0825);
      tasaOcuotaIsr = 30.0;

      pasos.push({
        paso: "1. Ingresos Nominales del Periodo",
        detalle: "Ingresos devengados / facturados acumulables",
        monto: roundSat(ingresosCobrados),
      });

      const utilidadFiscalEstimada = ingresosCobrados.times(cu);
      pasos.push({
        paso: "2. Coeficiente de Utilidad (CU)",
        detalle: `CU aplicable: ${roundSat(cu.times(100)).toFixed(4)}% = Utilidad estimada: $${roundSat(utilidadFiscalEstimada).toFixed(2)}`,
        monto: cu.toNumber(),
      });

      const perdidas = toDec(input.perdidasFiscalesAnteriores);
      if (perdidas.gt(0)) {
        pasos.push({
          paso: "3. Pérdidas Fiscales de Ejercicios Anteriores",
          detalle: "Amortización de pérdidas fiscales",
          monto: roundSat(perdidas),
        });
      }

      baseGravable = Decimal.max(0, utilidadFiscalEstimada.minus(perdidas));
      isrDeterminado = baseGravable.times(0.3);

      pasos.push({
        paso: "4. ISR Provisional Determinado (30%)",
        detalle: `Base estimada ($${roundSat(baseGravable).toFixed(2)}) × 30% Tasa Ley`,
        monto: roundSat(isrDeterminado),
      });
      break;
    }

    default: {
      throw new Error(
        `Régimen fiscal no soportado: '${regimen}'. Debe ser 626 (RESICO PF), 612 (Actividades Empresariales), 606 (Arrendamiento) o 601 (General de Ley PM).`
      );
    }
  }

  // Descuentos y Acreditamientos de ISR
  if (retencionesIsr.gt(0)) {
    pasos.push({
      paso: "5. Retenciones de ISR Acreditables",
      detalle: "Retenciones de ISR practicadas por Personas Morales u otras entidades",
      monto: roundSat(retencionesIsr),
    });
  }

  if (pagosPreviosIsr.gt(0)) {
    pasos.push({
      paso: "6. Pagos Provisionales Previos de ISR",
      detalle: "Pagos de ISR efectuados en meses anteriores del ejercicio",
      monto: roundSat(pagosPreviosIsr),
    });
  }

  // ISR a pagar neto con decimal.js
  const isrAPagar = Decimal.max(0, isrDeterminado.minus(retencionesIsr).minus(pagosPreviosIsr));
  pasos.push({
    paso: "7. ISR a Pagar Neto",
    detalle: "Importe a pagar ante el SAT / bancos",
    monto: roundSat(isrAPagar),
  });

  // 2. CÁLCULO DE IVA CON DECIMAL.JS (Flujo de Efectivo Oficial SAT)
  const balanceIva = ivaCobrado.minus(ivaPagado).minus(retencionesIva);
  const esSaldoAFavorIva = balanceIva.lt(0);
  const ivaAPagar = esSaldoAFavorIva ? new Decimal(0) : balanceIva;
  const saldoAFavorIvaMonto = esSaldoAFavorIva ? balanceIva.abs() : new Decimal(0);

  pasos.push({
    paso: "8. IVA Trasladado (Cobrado)",
    detalle: "16% cobrado a clientes en facturas efectivamente pagadas",
    monto: roundSat(ivaCobrado),
  });
  pasos.push({
    paso: "9. IVA Acreditable (Gastos)",
    detalle: "16% efectivamente pagado a proveedores en gastos deducibles",
    monto: roundSat(ivaPagado),
  });
  if (retencionesIva.gt(0)) {
    pasos.push({
      paso: "10. Retenciones de IVA Acreditables",
      detalle: "Retenciones de IVA practicadas por Personas Morales (Art. 1-A LIVA)",
      monto: roundSat(retencionesIva),
    });
  }
  pasos.push({
    paso: esSaldoAFavorIva ? "11. Saldo a Favor de IVA" : "11. IVA Neto a Pagar",
    detalle: esSaldoAFavorIva
      ? "Saldo a favor susceptible de acreditamiento posterior o devolución"
      : "Importe neto a pagar de IVA ante el SAT",
    monto: roundSat(esSaldoAFavorIva ? saldoAFavorIvaMonto : ivaAPagar),
  });

  return {
    regimenFiscal: regimen,
    nombreRegimen,
    ingresosBase: roundSat(ingresosCobrados),
    deduccionesAplicadas: roundSat(deduccionesAplicadas),
    baseGravable: roundSat(baseGravable),
    tasaOcuotaIsr,
    isrDeterminado: roundSat(isrDeterminado),
    retencionesIsr: roundSat(retencionesIsr),
    pagosPreviosIsr: roundSat(pagosPreviosIsr),
    isrAPagar: roundSat(isrAPagar),
    ivaTrasladado: roundSat(ivaCobrado),
    ivaAcreditable: roundSat(ivaPagado),
    retencionesIva: roundSat(retencionesIva),
    ivaAPagar: roundSat(ivaAPagar),
    esSaldoAFavorIva,
    saldoAFavorIvaMonto: roundSat(saldoAFavorIvaMonto),
    desglosePasoAPaso: pasos,
  };
}

/**
 * Calcula la fecha de vencimiento fiscal SAT según regla 6to dígito de RFC
 */
export function calcularFechaVencimientoSat(rfc: string, year: number, month: number): {
  fechaLimite: Date;
  diasAdicionales: number;
  descripcion: string;
} {
  const mesDeclaracion = month === 12 ? 1 : month + 1;
  const anioDeclaracion = month === 12 ? year + 1 : year;

  let sextoCaracter = "0";
  const digitos = rfc.replace(/^[A-Z&Ñ]+/i, "");
  if (digitos.length > 0) {
    sextoCaracter = digitos[digitos.length - 1];
  }

  const digitoNum = parseInt(sextoCaracter, 10) || 1;
  let diasAdicionales = 0;
  if (digitoNum === 1 || digitoNum === 2) diasAdicionales = 1;
  else if (digitoNum === 3 || digitoNum === 4) diasAdicionales = 2;
  else if (digitoNum === 5 || digitoNum === 6) diasAdicionales = 3;
  else if (digitoNum === 7 || digitoNum === 8) diasAdicionales = 4;
  else if (digitoNum === 9 || digitoNum === 0) diasAdicionales = 5;

  const diaVencimiento = 17 + diasAdicionales;
  const fechaLimite = new Date(anioDeclaracion, mesDeclaracion - 1, diaVencimiento, 23, 59, 59);

  return {
    fechaLimite,
    diasAdicionales,
    descripcion: `Vence el ${diaVencimiento} de ${obtenerNombreMes(mesDeclaracion)} ${anioDeclaracion} (Día 17 + ${diasAdicionales} días por RFC)`,
  };
}

export function obtenerNombreMes(month: number): string {
  const meses = [
    "Enero",
    "Febrero",
    "Marzo",
    "Abril",
    "Mayo",
    "Junio",
    "Julio",
    "Agosto",
    "Septiembre",
    "Octubre",
    "Noviembre",
    "Diciembre",
  ];
  return meses[month - 1] || `Mes ${month}`;
}
