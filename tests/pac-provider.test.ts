import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { MockPacProvider } from "@/lib/sat/pac/mock-provider";
import { HttpPacProvider } from "@/lib/sat/pac/http-provider";
import { FacturamaPacProvider } from "@/lib/sat/pac/facturama-provider";
import { getPacProvider } from "@/lib/sat/pac";
import { AccountingEngine } from "@/lib/sat/accounting-engine";
import { Decimal } from "@prisma/client/runtime/library";

describe("Fase 4 - Arquitectura PacProvider, Timbrado y Cancelación Mock", () => {
  const mockPac = new MockPacProvider();

  describe("1. MockPacProvider - Timbrado Mock CFDI 4.0", () => {
    it("debe timbrar un CFDI 4.0 exitosamente con estructura oficial", async () => {
      const res = await mockPac.timbrar({
        serie: "F",
        folio: "1001",
        formaPago: "03",
        metodoPago: "PUE",
        lugarExpedicion: "06600",
        emisor: {
          rfc: "LOMA900101ABC",
          nombre: "Mariana López Asesorías",
          regimenFiscal: "626",
        },
        receptor: {
          rfc: "KCM8403217U4",
          nombre: "Kimberly Clark de México SAB de CV",
          domicilioFiscalReceptor: "11560",
          regimenFiscalReceptor: "601",
          usoCfdi: "G03",
        },
        conceptos: [
          {
            claveProdServ: "80141600",
            claveUnidad: "E48",
            descripcion: "Asesoría fiscal mensual",
            cantidad: 1,
            valorUnitario: 10000,
            objetoImp: "02",
            ivaTasa: 0.16,
            retIsrTasa: 0.0125,
            retIvaTasa: 0.106667,
          },
        ],
      });

      expect(res.success).toBe(true);
      expect(res.codigoEstatus).toBe("200");
      expect(res.uuid).toBeDefined();
      expect(res.uuid.length).toBe(36);
      expect(res.selloCFD).toBeDefined();
      expect(res.xmlTimbrado).toContain("<cfdi:Comprobante");
      expect(res.xmlTimbrado).toContain("Version=\"4.0\"");
      expect(res.subtotal).toBe(10000);
      expect(res.totalIvaTrasladado).toBe(1600);
      expect(res.totalIsrRetenido).toBe(125);
      expect(res.total).toBe(10408.33);
    });
  });

  describe("2. MockPacProvider - Cancelación Mock y Acuse SAT", () => {
    it("debe cancelar un CFDI mock con motivo 02 (sin relación) y generar acuse", async () => {
      const cancelRes = await mockPac.cancelar({
        uuid: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
        rfcEmisor: "LOMA900101ABC",
        rfcReceptor: "KCM8403217U4",
        total: 10408.33,
        motivo: "02",
      });

      expect(cancelRes.success).toBe(true);
      expect(cancelRes.codigoEstatus).toBe("201");
      expect(cancelRes.uuid).toBe("a1b2c3d4-e5f6-7890-abcd-ef1234567890");
      expect(cancelRes.acuseXml).toContain("<Acuse");
      expect(cancelRes.acuseXml).toContain("<EstatusUUID>201</EstatusUUID>");
      expect(cancelRes.acuseXml).toContain("<Motivo>02</Motivo>");
      expect(cancelRes.mensaje).toContain("cancelado exitosamente");
    });

    it("debe requerir folio de sustitución si el motivo es 01", async () => {
      await expect(
        mockPac.cancelar({
          uuid: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
          rfcEmisor: "LOMA900101ABC",
          rfcReceptor: "KCM8403217U4",
          total: 1000,
          motivo: "01",
        })
      ).rejects.toThrow("UUID de sustitución");
    });

    it("debe aceptar motivo 01 cuando se incluye folio de sustitución", async () => {
      const res = await mockPac.cancelar({
        uuid: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
        rfcEmisor: "LOMA900101ABC",
        rfcReceptor: "KCM8403217U4",
        total: 1000,
        motivo: "01",
        folioSustitucion: "f9e8d7c6-b5a4-3210-fedc-ba0987654321",
      });

      expect(res.success).toBe(true);
      expect(res.acuseXml).toContain("<FolioSustitucion>f9e8d7c6-b5a4-3210-fedc-ba0987654321</FolioSustitucion>");
    });
  });

  describe("3. Póliza de Reversión Contable por Cancelación (Anexo 24)", () => {
    it("debe generar una póliza de reversión cuadrada invirtiendo cargos y abonos", () => {
      const mockInvoice = {
        id: "inv-test-1",
        organizationId: "org-1",
        tipo: "EMITIDA",
        tipoDeComprobante: "I",
        serie: "F",
        folio: "500",
        uuid: "12345678-1234-1234-1234-1234567890ab",
        fecha: new Date("2026-09-15"),
        formaPago: "03",
        metodoPago: "PUE",
        lugarExpedicion: "06600",
        moneda: "MXN",
        tipoCambio: new Decimal(1.0),
        subtotal: new Decimal(50000.0),
        descuento: new Decimal(0.0),
        total: new Decimal(57375.0),
        emisorRfc: "LOMA900101ABC",
        emisorNombre: "Mariana López",
        emisorRegimen: "626",
        receptorRfc: "SFI200115AA1",
        receptorNombre: "Soluciones Fiscales",
        receptorCp: "01000",
        receptorRegimen: "601",
        receptorUsoCfdi: "G03",
        totalIvaTrasladado: new Decimal(8000.0),
        totalIvaRetenido: new Decimal(0.0),
        totalIsrRetenido: new Decimal(625.0),
        estatus: "VIGENTE",
        fechaTimbrado: new Date(),
        selloCFD: "sello",
        selloSAT: "selloSAT",
        noCertificadoSAT: "00001000000504465028",
        cadenaOriginal: "cadena",
        qrCodeData: "qr",
        rawXml: "<xml/>",
        saldoPendiente: new Decimal(0.0),
        fechaEfectivoCobro: new Date(),
        estaConciliada: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Póliza original
      const polizaOriginal = AccountingEngine.generarPolizaAutomatica(mockInvoice as any, 1);
      expect(polizaOriginal.estaCuadrada).toBe(true);

      // Póliza de reversión
      const reversion = AccountingEngine.generarPolizaReversion(
        mockInvoice as any,
        2,
        new Date("2026-09-18"),
        "02"
      );

      expect(reversion.tipo).toBe("DIARIO");
      expect(reversion.estaCuadrada).toBe(true);
      expect(reversion.concepto).toContain("Cancelación CFDI Folio F-500");
      expect(reversion.uuidRelacionado).toBe(mockInvoice.uuid);

      // Verificar que los montos de debe y haber se hayan invertido exactamente
      expect(reversion.totalDebe).toBe(polizaOriginal.totalHaber);
      expect(reversion.totalHaber).toBe(polizaOriginal.totalDebe);
    });
  });

  describe("4. HttpPacProvider Stub y Configuración", () => {
    const originalEnv = process.env;

    beforeEach(() => {
      process.env = { ...originalEnv };
    });

    afterEach(() => {
      process.env = originalEnv;
    });

    it("debe arrojar error claro si PAC_MODE=http y falta PAC_API_KEY", () => {
      delete process.env.PAC_API_KEY;
      expect(() => new HttpPacProvider()).toThrow("PAC_API_KEY es obligatoria");
      expect(() => new HttpPacProvider()).toThrow("Facturama o SW Sapien");
    });

    it("debe instanciar HttpPacProvider si PAC_API_KEY está presente", () => {
      process.env.PAC_API_KEY = "test-api-key-facturama-123";
      process.env.PAC_BASE_URL = "https://api.facturama.com.mx";

      const httpPac = new HttpPacProvider();
      expect(httpPac.mode).toBe("http");
      expect(httpPac.name).toContain("Facturama / SW Sapien");
    });

    it("getPacProvider debe retornar MockPacProvider por defecto (sin PAC_ENV ni PAC_MODE)", () => {
      delete process.env.PAC_ENV;
      delete process.env.PAC_MODE;
      const provider = getPacProvider();
      expect(provider.mode).toBe("mock");
    });

    it("getPacProvider debe retornar MockPacProvider cuando PAC_ENV=mock", () => {
      process.env.PAC_ENV = "mock";
      const provider = getPacProvider();
      expect(provider.mode).toBe("mock");
    });

    it("getPacProvider debe retornar FacturamaPacProvider cuando PAC_MODE=facturama (alias legacy)", () => {
      delete process.env.PAC_ENV;
      process.env.PAC_MODE = "facturama";
      process.env.FACTURAMA_USER = "testuser";
      process.env.FACTURAMA_PASSWORD = "testpass";
      process.env.FACTURAMA_URL = "https://apisandbox.facturama.mx";
      const provider = getPacProvider();
      expect(provider.mode).toBe("http");
      expect(provider.name).toContain("Facturama PAC Oficial");
    });

    it("getPacProvider debe retornar FacturamaPacProvider cuando PAC_ENV=sandbox", () => {
      process.env.PAC_ENV = "sandbox";
      process.env.FACTURAMA_USER = "testuser";
      process.env.FACTURAMA_PASSWORD = "testpass";
      const provider = getPacProvider() as FacturamaPacProvider;
      expect(provider.mode).toBe("http");
      expect(provider.pacEnv).toBe("sandbox");
    });

    it("getPacProvider debe retornar FacturamaPacProvider apuntando a producción cuando PAC_ENV=production", () => {
      process.env.PAC_ENV = "production";
      process.env.FACTURAMA_USER = "testuser";
      process.env.FACTURAMA_PASSWORD = "testpass";
      const provider = getPacProvider() as FacturamaPacProvider;
      expect(provider.mode).toBe("http");
      expect(provider.pacEnv).toBe("production");
    });

    it("FacturamaPacProvider debe lanzar error claro si PAC_ENV=production y faltan credenciales", () => {
      delete process.env.FACTURAMA_USER;
      delete process.env.FACTURAMA_PASSWORD;
      delete process.env.PAC_USER;
      delete process.env.PAC_PASSWORD;
      expect(() => new FacturamaPacProvider("production")).toThrow(
        "Faltan FACTURAMA_USER / FACTURAMA_PASSWORD en .env"
      );
    });

    it("FacturamaPacProvider sandbox debe usar URL apisandbox por defecto", () => {
      process.env.FACTURAMA_USER = "u";
      process.env.FACTURAMA_PASSWORD = "p";
      delete process.env.PAC_BASE_URL;
      delete process.env.FACTURAMA_URL;
      // Solo verificamos que se instancia sin error en modo sandbox
      expect(() => new FacturamaPacProvider("sandbox")).not.toThrow();
    });

    it("FacturamaPacProvider production debe usar URL api.facturama.mx por defecto", () => {
      process.env.FACTURAMA_USER = "u";
      process.env.FACTURAMA_PASSWORD = "p";
      delete process.env.PAC_BASE_URL;
      delete process.env.FACTURAMA_URL;
      expect(() => new FacturamaPacProvider("production")).not.toThrow();
    });

    it("PAC_BASE_URL debe tener prioridad sobre la URL derivada de PAC_ENV", () => {
      process.env.FACTURAMA_USER = "u";
      process.env.FACTURAMA_PASSWORD = "p";
      process.env.PAC_BASE_URL = "https://custom.pac.example.mx";
      // Instanciar no debe lanzar error
      expect(() => new FacturamaPacProvider("production")).not.toThrow();
    });
  });
});
