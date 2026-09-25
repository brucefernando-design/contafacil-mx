import { describe, it, expect, beforeEach, vi } from "vitest";
import JSZip from "jszip";
import fs from "fs";
import path from "path";
import { importarCfdiXml } from "@/lib/sat/import-cfdi";
import { prisma } from "@/lib/prisma";

describe("Carga Masiva de XML en Bóveda / Unzip y Lote", () => {
  const xmlIngreso = fs.readFileSync(
    path.join(process.cwd(), "fixtures", "cfdi", "cfdi40_ingreso_pue.xml"),
    "utf-8"
  );
  const xmlGasto = fs.readFileSync(
    path.join(process.cwd(), "fixtures", "cfdi", "cfdi40_gasto_recibido.xml"),
    "utf-8"
  );

  const mockOrgId = "org-test-lote-123";
  const mockOrgRfc = "LOMA900101ABC";

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("1. Debe procesar un ZIP con 2 XMLs válidos y extraer exactamente los 2 archivos .xml ignorando no-xml", async () => {
    const zip = new JSZip();
    zip.file("factura_1.xml", xmlIngreso);
    zip.file("factura_2.xml", xmlGasto);
    zip.file("comprobante.pdf", "%PDF-1.4 mock content");
    zip.file("__MACOSX/._factura_1.xml", "mac junk");
    zip.file(".DS_Store", "ds store");

    const zipBuffer = await zip.generateAsync({ type: "nodebuffer" });
    const loadedZip = await JSZip.loadAsync(zipBuffer);

    const validXmlEntries: Array<{ name: string; content: string }> = [];

    for (const [relativePath, zipEntry] of Object.entries(loadedZip.files)) {
      if (
        zipEntry.dir ||
        relativePath.includes("__MACOSX") ||
        relativePath.includes(".DS_Store") ||
        relativePath.startsWith(".") ||
        relativePath.endsWith("/")
      ) {
        continue;
      }

      if (relativePath.toLowerCase().endsWith(".xml")) {
        const text = await zipEntry.async("text");
        validXmlEntries.push({ name: relativePath, content: text });
      }
    }

    expect(validXmlEntries.length).toBe(2);
    expect(validXmlEntries.map((e) => e.name).sort()).toEqual(["factura_1.xml", "factura_2.xml"]);
  });

  it("2. importarCfdiXml clasifica como NUEVO cuando el UUID no existe previamente", async () => {
    vi.spyOn(prisma.invoice, "findUnique").mockResolvedValueOnce(null);
    vi.spyOn(prisma.invoice, "create").mockResolvedValueOnce({
      id: "inv-1",
      uuid: "D4F3A812-7B34-4C2E-99A1-8845D9B02111",
      total: 26020.83,
      emisorRfc: "LOMA900101ABC",
      emisorNombre: "MARIANA LOPEZ ASESORIAS",
      subtotal: 25000,
      totalIvaTrasladado: 4000,
      totalIsrRetenido: 312.5,
      totalIvaRetenido: 2666.67,
      tipo: "EMITIDA",
      metodoPago: "PUE",
      fecha: new Date(),
    } as any);
    vi.spyOn(prisma.poliza, "count").mockResolvedValueOnce(0);
    vi.spyOn(prisma.poliza, "create").mockResolvedValueOnce({
      id: "pol-1",
      numero: 1,
    } as any);

    const res = await importarCfdiXml({
      organizationId: mockOrgId,
      orgRfc: mockOrgRfc,
      xmlContent: xmlIngreso,
    });

    expect(res.status).toBe("NUEVO");
    expect(res.invoice).toBeDefined();
    expect(res.invoice.uuid).toBe("D4F3A812-7B34-4C2E-99A1-8845D9B02111");
    expect(res.poliza).toBeDefined();
  });

  it("3. importarCfdiXml clasifica como DUPLICADO cuando el UUID ya existe en la BD", async () => {
    vi.spyOn(prisma.invoice, "findUnique").mockResolvedValueOnce({
      id: "inv-existing",
      uuid: "D4F3A812-7B34-4C2E-99A1-8845D9B02111",
    } as any);

    const res = await importarCfdiXml({
      organizationId: mockOrgId,
      orgRfc: mockOrgRfc,
      xmlContent: xmlIngreso,
    });

    expect(res.status).toBe("DUPLICADO");
    expect(res.error).toContain("ya fue registrado previamente");
  });

  it("4. importarCfdiXml clasifica como INVALIDO si el contenido no es un XML o está roto", async () => {
    const res = await importarCfdiXml({
      organizationId: mockOrgId,
      orgRfc: mockOrgRfc,
      xmlContent: "ESTO NO ES UN XML DE CFDI",
      nombreArchivo: "archivo_invalido.xml",
    });

    expect(res.status).toBe("INVALIDO");
    expect(res.error).toBeDefined();
  });

  it("5. Detecta alerta EFOS 69-B si el emisor de una factura recibida está en la lista negra", async () => {
    vi.spyOn(prisma.invoice, "findUnique").mockResolvedValueOnce(null);
    vi.spyOn(prisma.satBlacklist, "findUnique").mockResolvedValueOnce({
      id: "efo-1",
      rfc: "OXX990523471",
      razonSocial: "CADENA COMERCIAL OXXO SA DE CV",
      situacion: "DEFINITIVO",
      oficio: "500-05-2026-1234",
      publicacionDof: new Date(),
      createdAt: new Date(),
    } as any);
    vi.spyOn(prisma.fiscalAlert, "create").mockResolvedValueOnce({
      id: "alert-1",
      tipo: "EFOS_DETECTADO",
    } as any);
    vi.spyOn(prisma.invoice, "create").mockResolvedValueOnce({
      id: "inv-gasto",
      uuid: "E7C8B923-1A56-4D8F-B234-9912E8C04322",
      emisorRfc: "OXX990523471",
      tipo: "RECIBIDA",
    } as any);
    vi.spyOn(prisma.poliza, "count").mockResolvedValueOnce(1);
    vi.spyOn(prisma.poliza, "create").mockResolvedValueOnce({ id: "pol-2" } as any);

    const res = await importarCfdiXml({
      organizationId: mockOrgId,
      orgRfc: mockOrgRfc, // Receptor es LOMA900101ABC, emisor es OXX990523471 (Recibida)
      xmlContent: xmlGasto,
    });

    expect(res.status).toBe("NUEVO");
    expect(res.alertaEfo).toBeDefined();
  });

  it("6. Rechaza archivo que no es XML ni ZIP", () => {
    const fileName = "reporte_mensual.xlsx";
    const fileNameLower = fileName.toLowerCase();
    const esValido = fileNameLower.endsWith(".zip") || fileNameLower.endsWith(".xml");
    expect(esValido).toBe(false);
  });
});
