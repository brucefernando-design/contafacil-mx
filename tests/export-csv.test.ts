import { describe, it, expect } from "vitest";
import { generarCsvString } from "@/lib/export/csv";

describe("Exportación CSV / Excel para Contabilidad Mexicana", () => {
  it("debe incluir el BOM UTF-8 (\\uFEFF) para compatibilidad con Excel en Windows", () => {
    const headers = ["RFC", "Razón Social"];
    const rows = [["XAXX010101000", "Público en General"]];
    const csv = generarCsvString(headers, rows);

    expect(csv.startsWith("\uFEFF")).toBe(true);
  });

  it("debe escapar comillas dobles duplicándolas según estándar RFC 4180", () => {
    const headers = ["Concepto"];
    const rows = [['Venta de "Servicios" Contables']];
    const csv = generarCsvString(headers, rows);

    expect(csv).toContain('""Servicios""');
  });

  it("debe manejar valores con comas, acentos y saltos de línea correctamente", () => {
    const headers = ["Folio", "Emisor", "Total"];
    const rows = [
      ["FAC-001", "Soluciones Tecnológicas, S.A. de C.V.", 15000.5],
      ["FAC-002", "Consultoría México\nDivisión Centro", 8200.0],
    ];
    const csv = generarCsvString(headers, rows);

    expect(csv).toContain('"Soluciones Tecnológicas, S.A. de C.V."');
    expect(csv).toContain('"Consultoría México\nDivisión Centro"');
    expect(csv).toContain('"15000.5"');
  });

  it("debe manejar valores nulos y no definidos como campos vacíos entre comillas", () => {
    const headers = ["ID", "Nota"];
    const rows = [[1, null], [2, undefined]];
    const csv = generarCsvString(headers, rows);

    expect(csv).toContain('"1",""');
    expect(csv).toContain('"2",""');
  });
});
