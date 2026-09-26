import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  parsearCsv69B,
  normalizarSituacion69B,
  esRfcValido,
  actualizarLista69BOficial,
} from "@/lib/sat/sat-69b-sync";
import { SatAlertsEngine } from "@/lib/sat/sat-alerts-engine";
import { prisma } from "@/lib/prisma";

describe("Sprint 4: Actualización Lista 69-B del SAT y Cruce Preventivo", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  const fixtureCsvValido = `
"Número","RFC","Nombre del Contribuyente","Situación del contribuyente","Número y fecha de oficio global de presunción","Publicación DOF presuntos","Número y fecha de oficio global de definitivos","Publicación DOF definitivos","Número y fecha de oficio global de desvirtuados","Publicación DOF desvirtuados"
1,"FSO160412KJ9","Facturas y Servicios del Occidente SA de CV","Definitivo","500-05-2024-18492","18/05/2024","500-05-2024-20100","20/06/2024","",""
2,"GMB190304PL3","Grupo Multiservicios del Bajío SA de CV","Presunto","500-05-2025-09123","04/11/2025","","","",""
3,"DES880101AA1","Desvirtuados de México SA de CV","Desvirtuado","500-05-2023-01010","01/02/2023","","","500-05-2023-99999","15/04/2023"
4,"RFC_INVALIDO_XXX","Empresa con RFC Roto","Definitivo","","","","","",""
`;

  it("1. Normaliza las situaciones del contribuyente según catálogo SAT", () => {
    expect(normalizarSituacion69B("Definitivo")).toBe("DEFINITIVO");
    expect(normalizarSituacion69B("Presunto")).toBe("PRESUNTO");
    expect(normalizarSituacion69B("Desvirtuado")).toBe("DESVIRTUADO");
    expect(normalizarSituacion69B("Sentencia Favorable")).toBe("SENTENCIA_FAVORABLE");
    expect(normalizarSituacion69B("Cualquier otra cosa")).toBe("OTRO");
  });

  it("2. Valida la estructura sintáctica de RFC mexicanos e ignora RFCs malformados", () => {
    expect(esRfcValido("FSO160412KJ9")).toBe(true);
    expect(esRfcValido("GMB190304PL3")).toBe(true);
    expect(esRfcValido("DES880101AA1")).toBe(true);
    expect(esRfcValido("RFC_INVALIDO_XXX")).toBe(false);
    expect(esRfcValido("123")).toBe(false);
    expect(esRfcValido("")).toBe(false);
  });

  it("3. Parsea correctamente el fixture CSV filtrando cabeceras y RFCs inválidos", () => {
    const records = parsearCsv69B(fixtureCsvValido);

    expect(records.length).toBe(3); // Solo los 3 válidos, ignora cabecera y el inválido

    expect(records[0].rfc).toBe("FSO160412KJ9");
    expect(records[0].situacion).toBe("DEFINITIVO");
    expect(records[0].razonSocial).toBe("Facturas y Servicios del Occidente SA de CV");

    expect(records[1].rfc).toBe("GMB190304PL3");
    expect(records[1].situacion).toBe("PRESUNTO");

    expect(records[2].rfc).toBe("DES880101AA1");
    expect(records[2].situacion).toBe("DESVIRTUADO");
  });

  it("4. Protege la base de datos: un CSV con menos de 100 filas (o vacío) rechaza la actualización y no vacía la lista", async () => {
    // Intentar actualizar con umbral por defecto (100) pasando fixture de solo 3 filas
    const resultado = await actualizarLista69BOficial({
      csvContentOverride: fixtureCsvValido,
      minRowsThreshold: 100,
    });

    expect(resultado.ok).toBe(false);
    expect(resultado.error).toContain("Descarga incompleta o corrupta");
    expect(resultado.upserts).toBe(0);
  });

  it("5. Sincroniza y hace upsert cuando el CSV supera el umbral configurado", async () => {
    vi.spyOn(prisma.satBlacklist, "upsert").mockResolvedValue({} as any);

    const resultado = await actualizarLista69BOficial({
      csvContentOverride: fixtureCsvValido,
      minRowsThreshold: 2, // Para efectos de test unitario
    });

    expect(resultado.ok).toBe(true);
    expect(resultado.totalEnCsv).toBe(3);
    expect(resultado.upserts).toBe(3);
    expect(resultado.desvirtuados).toBe(1);
    expect(prisma.satBlacklist.upsert).toHaveBeenCalledTimes(3);
  });

  it("6. verificarListaNegra69B detecta el RFC definitivo del fixture en la base de datos", async () => {
    vi.spyOn(prisma.satBlacklist, "findUnique").mockResolvedValue({
      id: "efo-1",
      rfc: "FSO160412KJ9",
      razonSocial: "Facturas y Servicios del Occidente SA de CV",
      situacion: "DEFINITIVO",
      publicacionDof: new Date("2024-05-18"),
      oficio: "500-05-2024-18492",
      motivo: "Operaciones inexistentes",
      createdAt: new Date(),
    } as any);

    const check = await SatAlertsEngine.verificarListaNegra69B("FSO160412KJ9");
    expect(check.esEfo).toBe(true);
    expect(check.situacion).toBe("DEFINITIVO");
    expect(check.razonSocial).toBe("Facturas y Servicios del Occidente SA de CV");
  });
});
