/**
 * ContaFácil MX - Motor Fiscal SAT 2026
 * Implementación de reglas fiscales oficiales para:
 * - 626: Régimen Simplificado de Confianza (RESICO PF) - Art. 113-E a 113-J LISR
 * - 612: Personas Físicas con Actividades Empresariales y Profesionales (AE) - Art. 96 / 106 LISR
 * - 606: Régimen de Arrendamiento (Deducción Ciega 35% o Comprobadas) - Art. 114 a 118 LISR
 * - 601: General de Ley Personas Morales (Coeficiente de Utilidad, Tasa 30%) - Art. 9 y 14 LISR
 */

export interface TaxCalculationInput {
  regimenFiscal: "626" | "612" | "606" | "601" | string;
  tipoPersona: "PF" | "PM";
  ingresosCobrados: number; // Cobrados flujo de efectivo (o nominales devengados en PM)
  deduccionesPagadas: number; // Gastos comprobados pagados
  retencionesIsr: number; // Retenciones efectuadas por terceros (ej. PM a PF)
  retencionesIva: number; // Retenciones de IVA efectuadas por terceros
  ivaCobrado: number; // IVA trasladado cobrado (16%)
  ivaPagado: number; // IVA acreditable pagado en gastos
  pagosProvisionalesPreviosIsr?: number; // Pagos provisionales acumulados previos en el año
  coeficienteUtilidad?: number; // Para PM General (ej. 0.0825 = 8.25%)
  usaDeduccionCiega?: boolean; // Para Arrendamiento PF (35% sin comprobante)
  impuestoPredial?: number; // Para Arrendamiento con deducción ciega
  perdidasFiscalesAnteriores?: number; // Amortización pérdidas fiscales
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
 * Calcula el ISR aplicando la tarifa progresiva del Art. 96 LISR
 */
export function calcularIsrArt96(baseGravable: number): {
  isrDeterminado: number;
  limiteInferior: number;
  cuotaFija: number;
  tasaMarginal: number;
} {
  if (baseGravable <= 0) {
    return { isrDeterminado: 0, limiteInferior: 0, cuotaFija: 0, tasaMarginal: 0 };
  }

  // Buscar el renglón correspondiente en la tabla
  let tramo = TARIFA_ART96_MENSUAL_2026[0];
  for (let i = TARIFA_ART96_MENSUAL_2026.length - 1; i >= 0; i--) {
    if (baseGravable >= TARIFA_ART96_MENSUAL_2026[i].limiteInferior) {
      tramo = TARIFA_ART96_MENSUAL_2026[i];
      break;
    }
  }

  const excedente = Math.max(0, baseGravable - tramo.limiteInferior);
  const impuestoMarginal = excedente * tramo.porcentajeExcedente;
  const isrDeterminado = tramo.cuotaFija + impuestoMarginal;

  return {
    isrDeterminado: Number(isrDeterminado.toFixed(2)),
    limiteInferior: tramo.limiteInferior,
    cuotaFija: tramo.cuotaFija,
    tasaMarginal: tramo.porcentajeExcedente * 100,
  };
}

/**
 * Motor Fiscal Central SAT 2026
 */
export function calcularImpuestosSat2026(input: TaxCalculationInput): TaxCalculationResult {
  const regimen = input.regimenFiscal;
  const pasos: Array<{ paso: string; detalle: string; monto: number }> = [];

  let nombreRegimen = "";
  let deduccionesAplicadas = 0;
  let baseGravable = 0;
  let tasaOcuotaIsr = 0;
  let isrDeterminado = 0;

  // 1. CÁLCULO DE ISR SEGÚN RÉGIMEN
  switch (regimen) {
    case "626": {
      // RESICO PERSONA FÍSICA
      nombreRegimen = "Régimen Simplificado de Confianza (RESICO PF)";
      pasos.push({
        paso: "1. Ingresos Cobrados",
        detalle: "Total efectivamente cobrado en el mes (Flujo de efectivo sin IVA)",
        monto: input.ingresosCobrados,
      });

      // En RESICO PF NO se aplican deducciones para ISR
      deduccionesAplicadas = 0;
      pasos.push({
        paso: "2. Deducciones para ISR",
        detalle: "En RESICO PF no aplican deducciones autorizadas para ISR (Art. 113-E LISR)",
        monto: 0,
      });

      baseGravable = input.ingresosCobrados;

      // Determinar tasa RESICO progresiva
      let tasaAplicable = 0.025; // Default máximo
      for (const rango of TABLA_RESICO_PF_2026) {
        if (baseGravable <= rango.limiteSuperior) {
          tasaAplicable = rango.tasa;
          break;
        }
      }
      tasaOcuotaIsr = Number((tasaAplicable * 100).toFixed(2));
      isrDeterminado = Number((baseGravable * tasaAplicable).toFixed(2));

      pasos.push({
        paso: "3. Tasa de ISR RESICO",
        detalle: `Tasa aplicable según rango mensual 2026: ${tasaOcuotaIsr}%`,
        monto: tasaOcuotaIsr,
      });
      pasos.push({
        paso: "4. ISR Determinado",
        detalle: `Base gravable ($${baseGravable.toLocaleString("es-MX")}) × ${tasaOcuotaIsr}%`,
        monto: isrDeterminado,
      });
      break;
    }

    case "612": {
      // ACTIVIDAD EMPRESARIAL Y PROFESIONAL
      nombreRegimen = "Personas Físicas con Actividades Empresariales y Profesionales";
      pasos.push({
        paso: "1. Ingresos Cobrados",
        detalle: "Ingresos acumulables cobrados en el mes",
        monto: input.ingresosCobrados,
      });

      deduccionesAplicadas = input.deduccionesPagadas;
      pasos.push({
        paso: "2. Deducciones Autorizadas",
        detalle: "Gastos e inversiones indispensables pagados con CFDI",
        monto: deduccionesAplicadas,
      });

      baseGravable = Math.max(0, input.ingresosCobrados - deduccionesAplicadas);
      pasos.push({
        paso: "3. Base Gravable",
        detalle: "Ingresos cobrados menos deducciones pagadas",
        monto: baseGravable,
      });

      const calcArt96 = calcularIsrArt96(baseGravable);
      isrDeterminado = calcArt96.isrDeterminado;
      tasaOcuotaIsr = Number(calcArt96.tasaMarginal.toFixed(2));

      pasos.push({
        paso: "4. Aplicación Tarifa Art. 96 LISR",
        detalle: `Límite Inferior: $${calcArt96.limiteInferior.toFixed(2)}, Cuota Fija: $${calcArt96.cuotaFija.toFixed(2)}, Tasa Marginal: ${calcArt96.tasaMarginal.toFixed(2)}%`,
        monto: isrDeterminado,
      });
      break;
    }

    case "606": {
      // ARRENDAMIENTO
      nombreRegimen = "Régimen de Arrendamiento de Inmuebles";
      pasos.push({
        paso: "1. Ingresos por Arrendamiento",
        detalle: "Rentas efectivamente cobradas en el mes",
        monto: input.ingresosCobrados,
      });

      if (input.usaDeduccionCiega !== false) {
        // Deducción ciega 35% + Predial
        const deduccion35 = Number((input.ingresosCobrados * 0.35).toFixed(2));
        const predial = input.impuestoPredial || 0;
        deduccionesAplicadas = deduccion35 + predial;
        pasos.push({
          paso: "2. Deducción Ciega (35%) + Predial",
          detalle: `35% sin comprobante ($${deduccion35.toFixed(2)}) + Impuesto Predial pagado ($${predial.toFixed(2)})`,
          monto: deduccionesAplicadas,
        });
      } else {
        deduccionesAplicadas = input.deduccionesPagadas;
        pasos.push({
          paso: "2. Deducciones Comprobadas",
          detalle: "Mantenimiento, seguros e intereses reales pagados con CFDI",
          monto: deduccionesAplicadas,
        });
      }

      baseGravable = Math.max(0, input.ingresosCobrados - deduccionesAplicadas);
      pasos.push({
        paso: "3. Base Gravable",
        detalle: "Ingresos cobrados menos deducciones autorizadas",
        monto: baseGravable,
      });

      const calcArt96Arr = calcularIsrArt96(baseGravable);
      isrDeterminado = calcArt96Arr.isrDeterminado;
      tasaOcuotaIsr = Number(calcArt96Arr.tasaMarginal.toFixed(2));

      pasos.push({
        paso: "4. ISR Determinado (Tarifa Art. 96)",
        detalle: `Impuesto calculado con tarifa mensual de personas físicas`,
        monto: isrDeterminado,
      });
      break;
    }

    case "601":
    default: {
      // PERSONA MORAL RÉGIMEN GENERAL
      nombreRegimen = "General de Ley Personas Morales (Título II LISR)";
      const cu = input.coeficienteUtilidad || 0.0825; // Default 8.25%
      tasaOcuotaIsr = 30.0; // Tasa corporativa 30% fija

      pasos.push({
        paso: "1. Ingresos Nominales del Periodo",
        detalle: "Ingresos devengados / facturados acumulables",
        monto: input.ingresosCobrados,
      });

      const utilidadFiscalEstimada = Number((input.ingresosCobrados * cu).toFixed(2));
      pasos.push({
        paso: "2. Coeficiente de Utilidad (CU)",
        detalle: `CU aplicable: ${(cu * 100).toFixed(4)}% = Utilidad estimada: $${utilidadFiscalEstimada.toFixed(2)}`,
        monto: cu,
      });

      const perdidas = input.perdidasFiscalesAnteriores || 0;
      if (perdidas > 0) {
        pasos.push({
          paso: "3. Pérdidas Fiscales de Ejercicios Anteriores",
          detalle: "Amortización de pérdidas fiscales",
          monto: perdidas,
        });
      }

      baseGravable = Math.max(0, utilidadFiscalEstimada - perdidas);
      isrDeterminado = Number((baseGravable * 0.3).toFixed(2));

      pasos.push({
        paso: "4. ISR Provisional Determinado (30%)",
        detalle: `Base estimada ($${baseGravable.toFixed(2)}) × 30% Tasa Ley`,
        monto: isrDeterminado,
      });
      break;
    }
  }

  // Descuentos y Acreditamientos de ISR
  const retencionesIsr = input.retencionesIsr || 0;
  const pagosPreviosIsr = input.pagosProvisionalesPreviosIsr || 0;

  if (retencionesIsr > 0) {
    pasos.push({
      paso: "5. Retenciones de ISR Acreditables",
      detalle: "Retenciones de ISR practicadas por Personas Morales u otras entidades",
      monto: retencionesIsr,
    });
  }

  if (pagosPreviosIsr > 0) {
    pasos.push({
      paso: "6. Pagos Provisionales Previos de ISR",
      detalle: "Pagos de ISR efectuados en meses anteriores del ejercicio",
      monto: pagosPreviosIsr,
    });
  }

  // ISR a pagar neto
  const isrAPagar = Math.max(0, Number((isrDeterminado - retencionesIsr - pagosPreviosIsr).toFixed(2)));
  pasos.push({
    paso: "7. ISR a Pagar Neto",
    detalle: "Importe a pagar ante el SAT / bancos",
    monto: isrAPagar,
  });

  // 2. CÁLCULO DE IVA (Flujo de Efectivo Oficial SAT)
  const ivaTrasladado = Number(input.ivaCobrado.toFixed(2));
  const ivaAcreditable = Number(input.ivaPagado.toFixed(2));
  const retencionesIva = Number(input.retencionesIva.toFixed(2));

  // IVA a pagar = IVA Trasladado - IVA Acreditable - Retenciones de IVA
  const balanceIva = Number((ivaTrasladado - ivaAcreditable - retencionesIva).toFixed(2));
  const esSaldoAFavorIva = balanceIva < 0;
  const ivaAPagar = esSaldoAFavorIva ? 0 : balanceIva;
  const saldoAFavorIvaMonto = esSaldoAFavorIva ? Math.abs(balanceIva) : 0;

  pasos.push({
    paso: "8. IVA Trasladado (Cobrado)",
    detalle: "16% cobrado a clientes en facturas efectivamente pagadas",
    monto: ivaTrasladado,
  });
  pasos.push({
    paso: "9. IVA Acreditable (Gastos)",
    detalle: "16% efectivamente pagado a proveedores en gastos deducibles",
    monto: ivaAcreditable,
  });
  if (retencionesIva > 0) {
    pasos.push({
      paso: "10. Retenciones de IVA Acreditables",
      detalle: "Retenciones de IVA practicadas por Personas Morales (Art. 1-A LIVA)",
      monto: retencionesIva,
    });
  }
  pasos.push({
    paso: esSaldoAFavorIva ? "11. Saldo a Favor de IVA" : "11. IVA Neto a Pagar",
    detalle: esSaldoAFavorIva
      ? "Saldo a favor susceptible de acreditamiento posterior o devolución"
      : "Importe neto a pagar de IVA ante el SAT",
    monto: esSaldoAFavorIva ? saldoAFavorIvaMonto : ivaAPagar,
  });

  return {
    regimenFiscal: regimen,
    nombreRegimen,
    ingresosBase: input.ingresosCobrados,
    deduccionesAplicadas,
    baseGravable,
    tasaOcuotaIsr,
    isrDeterminado,
    retencionesIsr,
    pagosPreviosIsr,
    isrAPagar,
    ivaTrasladado,
    ivaAcreditable,
    retencionesIva,
    ivaAPagar,
    esSaldoAFavorIva,
    saldoAFavorIvaMonto,
    desglosePasoAPaso: pasos,
  };
}

/**
 * Calcula la fecha de vencimiento fiscal SAT según regla 6to dígito de RFC
 * Fecha base: Día 17 del mes posterior.
 * Más días adicionales por el sexto dígito numérico del RFC (Resolución Miscelánea Fiscal SAT).
 */
export function calcularFechaVencimientoSat(rfc: string, year: number, month: number): {
  fechaLimite: Date;
  diasAdicionales: number;
  descripcion: string;
} {
  // Siguiente mes (1 mes posterior al mes declarado)
  const mesDeclaracion = month === 12 ? 1 : month + 1;
  const anioDeclaracion = month === 12 ? year + 1 : year;

  // Extraer el sexto carácter numérico del RFC
  // Formato PM: AAA 00 00 00 -> el 6to dígito es el índice 5
  // Formato PF: AAAA 00 00 00 -> el 6to dígito es el índice 6
  let sextoCaracter = "0";
  const digitos = rfc.replace(/^[A-Z&Ñ]+/i, "");
  if (digitos.length > 0) {
    sextoCaracter = digitos[digitos.length - 1]; // Último dígito de la homoclave o fecha
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
