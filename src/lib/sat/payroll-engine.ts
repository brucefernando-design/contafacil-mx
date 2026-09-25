/**
 * EasyConta MX - Motor de Cálculo de Nómina e Impuestos Salarios 2026
 *
 * Implementa la normatividad fiscal y laboral mexicana:
 * - Tarifa de Retención de ISR para Sueldos y Salarios (Art. 96 LISR)
 *   Soporta periodicidades: Mensual, Quincenal, Semanal.
 * - Subsidio para el Empleo (Decreto oficial DOF 2024 / UMA 2026):
 *   Hasta el 11.82% del valor mensual de la UMA para ingresos gravables hasta el tope de ley.
 * - Cuotas Obreras IMSS (LSS Ley del Seguro Social):
 *   - Enfermedad y Maternidad (Prestaciones en Dinero: 0.25%, Gastos Médicos Pensionados: 0.375%)
 *   - Invalidez y Vida (0.625%)
 *   - Cesantía en Edad Avanzada y Vejez (1.125%)
 *   - Excedente de 3 UMA en Especie si SBC > 3 UMA (0.40%)
 *
 * Cálculos con decimal.js de alta precisión.
 */

import Decimal from "decimal.js";
import { toDec, roundSat } from "./tax-engine";

export interface TarifaTramo {
  limiteInferior: number;
  limiteSuperior: number;
  cuotaFija: number;
  porcentajeExcedente: number; // porcentaje (ej. 10.88 para 10.88%)
}

// UMA Oficial 2026 (Valor de referencia diario y mensual)
export const UMA_DIARIA_2026 = 113.14; // Referencia UMA
export const UMA_MENSUAL_2026 = UMA_DIARIA_2026 * 30.4; // 3,439.46

// -------------------------------------------------------------
// TABLAS ARTÍCULO 96 LISR (Base Mensual Oficial)
// -------------------------------------------------------------
export const TABLA_ISR_MENSUAL: TarifaTramo[] = [
  { limiteInferior: 0.01, limiteSuperior: 746.04, cuotaFija: 0.00, porcentajeExcedente: 1.92 },
  { limiteInferior: 746.05, limiteSuperior: 6332.05, cuotaFija: 14.32, porcentajeExcedente: 6.40 },
  { limiteInferior: 6332.06, limiteSuperior: 11128.01, cuotaFija: 371.83, porcentajeExcedente: 10.88 },
  { limiteInferior: 11128.02, limiteSuperior: 12935.82, cuotaFija: 893.63, porcentajeExcedente: 16.00 },
  { limiteInferior: 12935.83, limiteSuperior: 15487.71, cuotaFija: 1182.88, porcentajeExcedente: 17.92 },
  { limiteInferior: 15487.72, limiteSuperior: 31236.49, cuotaFija: 1640.18, porcentajeExcedente: 21.36 },
  { limiteInferior: 31236.50, limiteSuperior: 49233.00, cuotaFija: 5000.70, porcentajeExcedente: 23.52 },
  { limiteInferior: 49233.01, limiteSuperior: 93993.90, cuotaFija: 9236.65, porcentajeExcedente: 30.00 },
  { limiteInferior: 93993.91, limiteSuperior: 125325.20, cuotaFija: 22664.92, porcentajeExcedente: 32.00 },
  { limiteInferior: 125325.21, limiteSuperior: 375975.61, cuotaFija: 32690.94, porcentajeExcedente: 34.00 },
  { limiteInferior: 375975.62, limiteSuperior: Infinity, cuotaFija: 117912.08, porcentajeExcedente: 35.00 },
];

/**
 * Convierte la tabla mensual a quincenal (/ 2) o semanal (/ 4.3333 o / 30.4 * 7)
 */
export function getTablaIsr(periodicidad: "MENSUAL" | "QUINCENAL" | "SEMANAL"): TarifaTramo[] {
  const divisor = periodicidad === "MENSUAL" ? 1 : periodicidad === "QUINCENAL" ? 2 : (30.4 / 7);
  return TABLA_ISR_MENSUAL.map((t) => ({
    limiteInferior: t.limiteInferior === 0.01 ? 0.01 : roundSat(t.limiteInferior / divisor),
    limiteSuperior: t.limiteSuperior === Infinity ? Infinity : roundSat(t.limiteSuperior / divisor),
    cuotaFija: roundSat(t.cuotaFija / divisor),
    porcentajeExcedente: t.porcentajeExcedente,
  }));
}

/**
 * Cálculo del Subsidio para el Empleo (Decreto DOF 2024 / 2026)
 * Se otorga a trabajadores cuyo ingreso mensual no exceda el límite legal (aprox 9,081 MXN / 2.6 UMAs mensuales).
 * Cuota mensual tope: 11.82% del valor mensual de la UMA.
 */
export function calcularSubsidioAlEmpleo(
  ingresoGravable: Decimal,
  periodicidad: "MENSUAL" | "QUINCENAL" | "SEMANAL"
): Decimal {
  const divisor = periodicidad === "MENSUAL" ? 1 : periodicidad === "QUINCENAL" ? 2 : (30.4 / 7);
  const topeMensualIngreso = new Decimal(9081.00); // Límite de ingreso para aplicar subsidio
  const topePeriodoIngreso = topeMensualIngreso.dividedBy(divisor);

  if (ingresoGravable.greaterThan(topePeriodoIngreso)) {
    return new Decimal(0);
  }

  // Subsidio = 11.82% de UMA mensual prorrateado al periodo
  const subsidioMensualMax = new Decimal(UMA_MENSUAL_2026).times(0.1182);
  const subsidioPeriodo = subsidioMensualMax.dividedBy(divisor);
  return subsidioPeriodo;
}

/**
 * Cálculo de ISR Art. 96 según base gravable y periodicidad
 */
export function calcularRetencionIsr(
  baseGravable: number | Decimal,
  periodicidad: "MENSUAL" | "QUINCENAL" | "SEMANAL" = "QUINCENAL"
): {
  baseGravable: number;
  limiteInferior: number;
  excedente: number;
  tasaMarginal: number;
  impuestoMarginal: number;
  cuotaFija: number;
  isrAntesSubsidio: number;
  subsidioEmpleo: number;
  isrRetenidoNeto: number;
} {
  const base = toDec(baseGravable);
  if (base.lessThanOrEqualTo(0)) {
    return {
      baseGravable: 0,
      limiteInferior: 0,
      excedente: 0,
      tasaMarginal: 0,
      impuestoMarginal: 0,
      cuotaFija: 0,
      isrAntesSubsidio: 0,
      subsidioEmpleo: 0,
      isrRetenidoNeto: 0,
    };
  }

  const tabla = getTablaIsr(periodicidad);
  const tramo = tabla.find(
    (t) => base.toNumber() >= t.limiteInferior && base.toNumber() <= t.limiteSuperior
  ) || tabla[tabla.length - 1];

  const limInf = new Decimal(tramo.limiteInferior);
  const excedente = Decimal.max(0, base.minus(limInf));
  const tasaDec = new Decimal(tramo.porcentajeExcedente).dividedBy(100);
  const impuestoMarginal = excedente.times(tasaDec);
  const cuotaFija = new Decimal(tramo.cuotaFija);
  const isrAntesSubsidio = impuestoMarginal.plus(cuotaFija);

  const subsidio = calcularSubsidioAlEmpleo(base, periodicidad);
  const isrNeto = Decimal.max(0, isrAntesSubsidio.minus(subsidio));

  return {
    baseGravable: roundSat(base),
    limiteInferior: roundSat(limInf),
    excedente: roundSat(excedente),
    tasaMarginal: tramo.porcentajeExcedente,
    impuestoMarginal: roundSat(impuestoMarginal),
    cuotaFija: roundSat(cuotaFija),
    isrAntesSubsidio: roundSat(isrAntesSubsidio),
    subsidioEmpleo: roundSat(subsidio),
    isrRetenidoNeto: roundSat(isrNeto),
  };
}

/**
 * Cálculo de Cuota Obrera IMSS retenida al trabajador
 * Basada en el Salario Base de Cotización (SBC) y los días del periodo.
 * 
 * Tasas obreras según Ley del Seguro Social:
 * 1. Enfermedad y Maternidad:
 *    - Prestaciones en Dinero: 0.250% del SBC
 *    - Gastos Médicos Pensionados: 0.375% del SBC
 *    - Excedente de 3 UMA: 0.400% sobre (SBC - 3 * UMA) si SBC > 3 UMA
 * 2. Invalidez y Vida: 0.625% del SBC
 * 3. Cesantía en Edad Avanzada y Vejez: 1.125% del SBC
 * Total estándar sobre SBC (sin excedente): ~ 2.375%
 */
export function calcularCuotaObreraImss(
  sbc: number | Decimal,
  diasPeriodo: number = 15
): {
  sbc: number;
  dias: number;
  enfermedadMaternidadDinero: number;
  gastosMedicosPensionados: number;
  excedenteTresUma: number;
  invalidezVida: number;
  cesantiaVejez: number;
  totalImssObrero: number;
} {
  const sbcDec = toDec(sbc);
  const dias = new Decimal(diasPeriodo);

  if (sbcDec.lessThanOrEqualTo(0) || dias.lessThanOrEqualTo(0)) {
    return {
      sbc: 0,
      dias: diasPeriodo,
      enfermedadMaternidadDinero: 0,
      gastosMedicosPensionados: 0,
      excedenteTresUma: 0,
      invalidezVida: 0,
      cesantiaVejez: 0,
      totalImssObrero: 0,
    };
  }

  // Base salarial del periodo
  const basePeriodo = sbcDec.times(dias);

  // Prestaciones en dinero: 0.25%
  const enfDinero = basePeriodo.times(0.0025);

  // Gastos médicos pensionados: 0.375%
  const gastosMed = basePeriodo.times(0.00375);

  // Excedente 3 UMA: 0.40% sobre la diferencia si SBC > 3 * UMA_DIARIA
  const tresUmaDiaria = new Decimal(UMA_DIARIA_2026).times(3);
  let excedenteUma = new Decimal(0);
  if (sbcDec.greaterThan(tresUmaDiaria)) {
    const diffDiaria = sbcDec.minus(tresUmaDiaria);
    excedenteUma = diffDiaria.times(dias).times(0.0040);
  }

  // Invalidez y Vida: 0.625%
  const invVida = basePeriodo.times(0.00625);

  // Cesantía y Vejez: 1.125%
  const cesantia = basePeriodo.times(0.01125);

  const totalObrero = enfDinero
    .plus(gastosMed)
    .plus(excedenteUma)
    .plus(invVida)
    .plus(cesantia);

  return {
    sbc: roundSat(sbcDec),
    dias: diasPeriodo,
    enfermedadMaternidadDinero: roundSat(enfDinero),
    gastosMedicosPensionados: roundSat(gastosMed),
    excedenteTresUma: roundSat(excedenteUma),
    invalidezVida: roundSat(invVida),
    cesantiaVejez: roundSat(cesantia),
    totalImssObrero: roundSat(totalObrero),
  };
}

export interface CalculoReciboInput {
  salarioDiario: number | Decimal;
  salarioBaseCotApor?: number | Decimal; // SBC (si no se proporciona se asume igual a salarioDiario)
  diasTrabajados: number;
  periodicidad?: "MENSUAL" | "QUINCENAL" | "SEMANAL";
  otrasPercepcionesGravadas?: number | Decimal;
  otrasPercepcionesExentas?: number | Decimal;
  otrasDeducciones?: number | Decimal;
  aplicaImss?: boolean; // false para asimilados a salarios
}

export interface CalculoReciboResult {
  sueldoBruto: number;
  diasTrabajados: number;
  percepciones: Array<{
    claveSat: string;
    tipoPercepcion: string;
    descripcion: string;
    importeGravado: number;
    importeExento: number;
  }>;
  totalPercepciones: number;
  totalGravado: number;
  totalExento: number;
  
  deducciones: Array<{
    claveSat: string;
    tipoDeduccion: string;
    descripcion: string;
    importe: number;
  }>;
  totalDeducciones: number;
  retencionIsr: number;
  imssObrero: number;
  
  otrosPagos: Array<{
    claveSat: string;
    tipoOtroPago: string;
    descripcion: string;
    importe: number;
  }>;
  totalOtrosPagos: number;
  subsidioEmpleoEntregado: number;
  
  netoPagar: number;
}

/**
 * Genera el desglose completo del recibo de nómina (Percepciones, Deducciones, Otros Pagos, Neto)
 */
export function calcularReciboNomina(input: CalculoReciboInput): CalculoReciboResult {
  const periodicidad = input.periodicidad || "QUINCENAL";
  const sd = toDec(input.salarioDiario);
  const dias = new Decimal(input.diasTrabajados);
  const sueldoBase = sd.times(dias);

  const otrasGravadas = toDec(input.otrasPercepcionesGravadas);
  const otrasExentas = toDec(input.otrasPercepcionesExentas);
  const otrasDeduc = toDec(input.otrasDeducciones);

  const totalGravado = sueldoBase.plus(otrasGravadas);
  const totalExento = otrasExentas;
  const totalPercepciones = totalGravado.plus(totalExento);

  // Percepciones SAT 001 - Sueldos y Salarios
  const percepciones = [
    {
      claveSat: "001",
      tipoPercepcion: "001",
      descripcion: "Sueldos, Salarios Rayas y Jornales",
      importeGravado: roundSat(sueldoBase),
      importeExento: 0,
    },
  ];

  if (otrasGravadas.greaterThan(0) || otrasExentas.greaterThan(0)) {
    percepciones.push({
      claveSat: "038",
      tipoPercepcion: "038",
      descripcion: "Otros ingresos por salarios",
      importeGravado: roundSat(otrasGravadas),
      importeExento: roundSat(otrasExentas),
    });
  }

  // Cálculo de ISR
  const resIsr = calcularRetencionIsr(totalGravado, periodicidad);

  // Cálculo de IMSS Obrero
  const aplicaImss = input.aplicaImss !== false;
  const sbc = toDec(input.salarioBaseCotApor || input.salarioDiario);
  const resImss = aplicaImss ? calcularCuotaObreraImss(sbc, input.diasTrabajados) : null;
  const imssTotal = resImss ? new Decimal(resImss.totalImssObrero) : new Decimal(0);

  // Deducciones SAT (001 Seguridad Social IMSS, 002 ISR)
  const deducciones: Array<{
    claveSat: string;
    tipoDeduccion: string;
    descripcion: string;
    importe: number;
  }> = [];

  if (resIsr.isrRetenidoNeto > 0) {
    deducciones.push({
      claveSat: "002",
      tipoDeduccion: "002",
      descripcion: "ISR Retenido Sueldos (Art. 96 LISR)",
      importe: resIsr.isrRetenidoNeto,
    });
  }

  if (imssTotal.greaterThan(0)) {
    deducciones.push({
      claveSat: "001",
      tipoDeduccion: "001",
      descripcion: "Seguridad Social (Cuota Obrera IMSS)",
      importe: roundSat(imssTotal),
    });
  }

  if (otrasDeduc.greaterThan(0)) {
    deducciones.push({
      claveSat: "004",
      tipoDeduccion: "004",
      descripcion: "Otras deducciones",
      importe: roundSat(otrasDeduc),
    });
  }

  const totalDeducciones = deducciones.reduce((acc, d) => acc.plus(d.importe), new Decimal(0));

  // Otros pagos (002 Subsidio para el empleo efectivamente entregado al trabajador si supera al ISR)
  const otrosPagos: Array<{
    claveSat: string;
    tipoOtroPago: string;
    descripcion: string;
    importe: number;
  }> = [];

  let subsidioEntregado = new Decimal(0);
  if (resIsr.subsidioEmpleo > resIsr.isrAntesSubsidio) {
    subsidioEntregado = new Decimal(resIsr.subsidioEmpleo).minus(resIsr.isrAntesSubsidio);
    otrosPagos.push({
      claveSat: "002",
      tipoOtroPago: "002",
      descripcion: "Subsidio para el empleo (efectivamente entregado)",
      importe: roundSat(subsidioEntregado),
    });
  }

  const totalOtrosPagos = otrosPagos.reduce((acc, op) => acc.plus(op.importe), new Decimal(0));

  // Neto = Percepciones - Deducciones + OtrosPagos
  const netoPagar = totalPercepciones.minus(totalDeducciones).plus(totalOtrosPagos);

  return {
    sueldoBruto: roundSat(sueldoBase),
    diasTrabajados: input.diasTrabajados,
    percepciones,
    totalPercepciones: roundSat(totalPercepciones),
    totalGravado: roundSat(totalGravado),
    totalExento: roundSat(totalExento),
    deducciones,
    totalDeducciones: roundSat(totalDeducciones),
    retencionIsr: resIsr.isrRetenidoNeto,
    imssObrero: roundSat(imssTotal),
    otrosPagos,
    totalOtrosPagos: roundSat(totalOtrosPagos),
    subsidioEmpleoEntregado: roundSat(subsidioEntregado),
    netoPagar: roundSat(netoPagar),
  };
}
