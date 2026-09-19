import { obtenerNombreMes } from "./tax-engine";

export interface ResolvedFiscalPeriod {
  year: number;
  month: number;
  startDate: Date;
  endDate: Date;
  nombreMes: string;
}

/**
 * Resuelve el periodo fiscal activo a partir de los query params de Next.js App Router.
 * Por defecto selecciona Septiembre 2026 para garantizar que los datos de prueba y seed
 * se muestren inmediatamente sin desaparecer si la fecha del sistema varía.
 */
export async function resolveFiscalPeriod(
  searchParams?: Promise<{ year?: string; month?: string }> | { year?: string; month?: string }
): Promise<ResolvedFiscalPeriod> {
  let resolved: { year?: string; month?: string } = {};

  if (searchParams) {
    resolved = await Promise.resolve(searchParams);
  }

  const yearParam = resolved.year ? parseInt(resolved.year, 10) : null;
  const monthParam = resolved.month ? parseInt(resolved.month, 10) : null;

  // Si el usuario seleccionó un periodo específico en el selector, usarlo
  // De lo contrario, por defecto mostrar Septiembre 2026 (donde reside el seed demo)
  const year = yearParam && !isNaN(yearParam) ? yearParam : 2026;
  const month =
    monthParam && !isNaN(monthParam) && monthParam >= 1 && monthParam <= 12
      ? monthParam
      : 9;

  const startDate = new Date(year, month - 1, 1, 0, 0, 0, 0);
  const endDate = new Date(year, month, 0, 23, 59, 59, 999);
  const nombreMes = obtenerNombreMes(month);

  return {
    year,
    month,
    startDate,
    endDate,
    nombreMes,
  };
}
