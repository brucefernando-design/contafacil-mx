export interface ParsedBankTransaction {
  fecha: Date;
  concepto: string;
  monto: number;
  tipo: "CARGO" | "ABONO";
  referencia?: string;
}

/**
 * Limpia cadenas de monto con formato moneda mexicana ($12,345.67 -> 12345.67)
 */
export function limpiarMontoMoneda(str: string): number {
  if (!str) return 0;
  const clean = str
    .replace(/[^0-9.-]/g, "")
    .replace(/--+/g, "-");
  const val = parseFloat(clean);
  return isNaN(val) ? 0 : Math.abs(val);
}

/**
 * Parsea fechas en formatos comunes: YYYY-MM-DD, DD/MM/YYYY, DD-MM-YYYY
 */
export function parsearFechaBanco(fechaStr: string): Date {
  if (!fechaStr) return new Date();
  const trimmed = fechaStr.trim();

  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
    const parts = trimmed.split(/[-T ]/);
    return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
  }

  // DD/MM/YYYY o DD-MM-YYYY
  const dmyMatch = trimmed.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  if (dmyMatch) {
    const dia = parseInt(dmyMatch[1], 10);
    const mes = parseInt(dmyMatch[2], 10) - 1;
    const anio = parseInt(dmyMatch[3], 10);
    return new Date(anio, mes, dia, 12, 0, 0);
  }

  const d = new Date(trimmed);
  return isNaN(d.getTime()) ? new Date() : d;
}

export function parseCsvLine(text: string): string[] {
  const result: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '"') {
      if (inQuotes && text[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      result.push(cur.trim());
      cur = "";
    } else {
      cur += char;
    }
  }
  result.push(cur.trim());
  return result;
}

/**
 * Parsea un archivo CSV bancario con soporte para formatos mexicanos estándar:
 * Formato 1: Fecha, Concepto, Monto, Tipo (CARGO/ABONO), Referencia
 * Formato 2: Fecha, Concepto, Cargo, Abono, Saldo, Referencia
 */
export function parsearCsvBancario(csvText: string): ParsedBankTransaction[] {
  const lines = csvText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length === 0) return [];

  const transactions: ParsedBankTransaction[] = [];
  let headerIndex = -1;
  let headers: string[] = [];

  // Buscar línea de encabezado
  for (let i = 0; i < Math.min(10, lines.length); i++) {
    const cols = parseCsvLine(lines[i]).map((c) => c.toLowerCase());
    if (cols.some((c) => c.includes("fecha") || c.includes("date"))) {
      headerIndex = i;
      headers = cols;
      break;
    }
  }

  const startLine = headerIndex >= 0 ? headerIndex + 1 : 0;

  // Índices de columnas
  let idxFecha = headers.findIndex((h) => h.includes("fecha") || h.includes("date"));
  let idxConcepto = headers.findIndex((h) => h.includes("concepto") || h.includes("descripcion") || h.includes("detalle"));
  let idxMonto = headers.findIndex((h) => h === "monto" || h === "importe" || h === "amount");
  let idxTipo = headers.findIndex((h) => h === "tipo" || h === "type");
  let idxCargo = headers.findIndex((h) => h.includes("cargo") || h.includes("retiro") || h.includes("debit"));
  let idxAbono = headers.findIndex((h) => h.includes("abono") || h.includes("deposito") || h.includes("credit"));
  let idxRef = headers.findIndex((h) => h.includes("ref") || h.includes("folio") || h.includes("rastreo"));

  // Si no se detectaron encabezados, usar posiciones por defecto: fecha, concepto, monto, tipo, referencia
  if (idxFecha === -1) idxFecha = 0;
  if (idxConcepto === -1) idxConcepto = 1;
  if (idxMonto === -1 && idxCargo === -1) idxMonto = 2;
  if (idxTipo === -1 && idxAbono === -1) idxTipo = 3;
  if (idxRef === -1) idxRef = 4;

  for (let i = startLine; i < lines.length; i++) {
    const rawLine = lines[i];
    const row = parseCsvLine(rawLine);

    if (row.length < 2) continue;

    const rawFecha = row[idxFecha];
    const concepto = row[idxConcepto] || "Movimiento Bancario";
    const ref = idxRef >= 0 && row[idxRef] ? row[idxRef] : undefined;

    let monto = 0;
    let tipo: "CARGO" | "ABONO" = "ABONO";

    // Si existen columnas separadas Cargo / Abono
    if (idxCargo >= 0 && idxAbono >= 0) {
      const cargoVal = limpiarMontoMoneda(row[idxCargo] || "");
      const abonoVal = limpiarMontoMoneda(row[idxAbono] || "");

      if (abonoVal > 0) {
        monto = abonoVal;
        tipo = "ABONO";
      } else if (cargoVal > 0) {
        monto = cargoVal;
        tipo = "CARGO";
      }
    } else {
      // Columna de monto único
      const rawMontoStr = row[idxMonto] || "0";
      monto = limpiarMontoMoneda(rawMontoStr);

      const rawTipo = idxTipo >= 0 && row[idxTipo] ? row[idxTipo].toUpperCase() : "";
      if (rawTipo.includes("CARGO") || rawTipo.includes("RET") || rawTipo.includes("DEBIT") || rawMontoStr.includes("-")) {
        tipo = "CARGO";
      } else {
        tipo = "ABONO";
      }
    }

    if (monto > 0) {
      transactions.push({
        fecha: parsearFechaBanco(rawFecha),
        concepto,
        monto: Number(monto.toFixed(2)),
        tipo,
        referencia: ref,
      });
    }
  }

  return transactions;
}
