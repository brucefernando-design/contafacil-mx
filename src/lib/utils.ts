import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number | string | { toNumber?: () => number } | null | undefined): string {
  const num = amount && typeof (amount as any).toNumber === "function"
    ? (amount as any).toNumber()
    : Number(amount) || 0;
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 2,
  }).format(num);
}

export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return "-";
  const d = new Date(date);
  return new Intl.DateTimeFormat("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(d);
}

export function formatDateTime(date: string | Date | null | undefined): string {
  if (!date) return "-";
  const d = new Date(date);
  return new Intl.DateTimeFormat("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

export const REGIMENES_SAT: Record<string, string> = {
  "626": "Régimen Simplificado de Confianza (RESICO PF)",
  "612": "Personas Físicas con Actividades Empresariales y Profesionales",
  "606": "Arrendamiento de Inmuebles",
  "601": "General de Ley Personas Morales",
  "603": "Personas Morales con Fines no Lucrativos",
  "605": "Sueldos y Salarios e Ingresos Asimilados a Salarios",
  "616": "Sin obligaciones fiscales",
};

export const USOS_CFDI: Record<string, string> = {
  "G01": "Adquisición de mercancías",
  "G02": "Devoluciones, descuentos o bonificaciones",
  "G03": "Gastos en general",
  "I01": "Construcciones",
  "I04": "Equipo de cómputo y accesorios",
  "I08": "Otra maquinaria y equipo",
  "D01": "Honorarios médicos, dentales y gastos hospitalarios",
  "CP01": "Pagos",
  "S01": "Sin efectos fiscales",
};

export const FORMAS_PAGO: Record<string, string> = {
  "01": "Efectivo",
  "02": "Cheque nominativo",
  "03": "Transferencia electrónica de fondos (SPEI)",
  "04": "Tarjeta de crédito",
  "28": "Tarjeta de débito",
  "99": "Por definir (PPD)",
};
