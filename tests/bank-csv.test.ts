import { describe, it, expect } from "vitest";
import {
  parsearCsvBancario,
  limpiarMontoMoneda,
  parsearFechaBanco,
} from "../src/lib/bank/csv-parser";

describe("ContaFácil MX - Parser de CSV Bancario y Conciliación", () => {
  it("Limpia correctamente montos con formato moneda, comas y símbolos de dólar/peso", () => {
    expect(limpiarMontoMoneda("$12,345.67")).toBe(12345.67);
    expect(limpiarMontoMoneda(" -5,000.50 ")).toBe(5000.5);
    expect(limpiarMontoMoneda("250.00")).toBe(250.0);
    expect(limpiarMontoMoneda("")).toBe(0);
  });

  it("Parsea fechas en formato YYYY-MM-DD y DD/MM/YYYY", () => {
    const d1 = parsearFechaBanco("2026-09-15");
    expect(d1.getFullYear()).toBe(2026);
    expect(d1.getMonth()).toBe(8); // Septiembre = 8 (0-indexed)
    expect(d1.getDate()).toBe(15);

    const d2 = parsearFechaBanco("20/09/2026");
    expect(d2.getFullYear()).toBe(2026);
    expect(d2.getMonth()).toBe(8);
    expect(d2.getDate()).toBe(20);
  });

  it("Parsea CSV formato 1 con columna Monto y Tipo (CARGO/ABONO)", () => {
    const csv = `Fecha,Concepto,Monto,Tipo,Referencia
2026-09-05,PAGO CLIENTE KIMBERLY CLARK,26020.83,ABONO,SPEI-94812
2026-09-12,COMPRA PAPELERIA OXXO,2146.00,CARGO,TDD-1102`;

    const txs = parsearCsvBancario(csv);
    expect(txs).toHaveLength(2);
    expect(txs[0].concepto).toBe("PAGO CLIENTE KIMBERLY CLARK");
    expect(txs[0].monto).toBe(26020.83);
    expect(txs[0].tipo).toBe("ABONO");
    expect(txs[0].referencia).toBe("SPEI-94812");

    expect(txs[1].concepto).toBe("COMPRA PAPELERIA OXXO");
    expect(txs[1].monto).toBe(2146.0);
    expect(txs[1].tipo).toBe("CARGO");
  });

  it("Parsea CSV formato 2 con columnas separadas Cargo y Abono", () => {
    const csv = `Fecha,Descripcion,Cargo,Abono,Saldo,Referencia
05/09/2026,DEPOSITO SPEI TRANSF,,35000.00,105000.00,REF1001
10/09/2026,PAGO DE SERVICIOS LUZ CFE,3200.00,,101800.00,CFE9982`;

    const txs = parsearCsvBancario(csv);
    expect(txs).toHaveLength(2);
    expect(txs[0].monto).toBe(35000.0);
    expect(txs[0].tipo).toBe("ABONO");

    expect(txs[1].monto).toBe(3200.0);
    expect(txs[1].tipo).toBe("CARGO");
  });
});
