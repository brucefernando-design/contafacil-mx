import { describe, it, expect } from "vitest";
import crypto from "crypto";
import { SatSoapClient } from "@/lib/sat/sync/sat-soap-client";
import { SatSyncService } from "@/lib/sat/sync/sat-sync-service";
import { AccountingEngine } from "@/lib/sat/accounting-engine";
import { Decimal } from "@prisma/client/runtime/library";

describe("Sincronización Oficial y Descarga Masiva del SAT con e.firma", () => {
  describe("1. SatSoapClient - Criptografía y Envelope WS-Security", () => {
    it("debe calcular el Digest SHA1 y firmar cadenas con RSA-SHA256", () => {
      const { privateKey, publicKey } = crypto.generateKeyPairSync("rsa", {
        modulusLength: 2048,
        publicKeyEncoding: { type: "spki", format: "pem" },
        privateKeyEncoding: { type: "pkcs8", format: "pem" },
      });

      const xmlBody = "<DesAutentica xmlns=\"http://DescargaMasivaTerceros.sat.gob.mx\"/>";
      const digest = SatSoapClient.calcularDigestSha1(xmlBody);

      expect(digest).toBeDefined();
      expect(typeof digest).toBe("string");
      expect(digest.length).toBeGreaterThan(0);

      // Probar firma digital
      const firma = SatSoapClient.firmarCadena(xmlBody, privateKey);
      expect(firma).toBeDefined();
      expect(typeof firma).toBe("string");

      // Verificar que la firma es criptográficamente válida con la clave pública
      const verifier = crypto.createVerify("RSA-SHA256");
      verifier.update(xmlBody);
      const isValid = verifier.verify(publicKey, Buffer.from(firma, "base64"));
      expect(isValid).toBe(true);
    });

    it("debe construir un Envelope SOAP WS-Security válido con BinarySecurityToken", () => {
      const dummyCer = "MIIB...dummyCertificateBase64...";
      const dummySignature = "FirmaBase64...";
      const dummyBody = "<solicitaDescarga xmlns=\"http://DescargaMasivaTerceros.sat.gob.mx\"/>";

      const soapXml = SatSoapClient.construirEnvelopeSoap({
        bodyXml: dummyBody,
        certificateBase64: dummyCer,
        signatureValue: dummySignature,
        action: "http://DescargaMasivaTerceros.sat.gob.mx/ISolicitaDescargaService/SolicitaDescarga",
      });

      expect(soapXml).toContain("<s:Envelope");
      expect(soapXml).toContain("<s:Header>");
      expect(soapXml).toContain("<wsse:Security");
      expect(soapXml).toContain("<wsse:BinarySecurityToken");
      expect(soapXml).toContain(dummyCer);
      expect(soapXml).toContain(dummySignature);
      expect(soapXml).toContain(dummyBody);
    });
  });

  describe("2. SatSyncService - Generación de Lotes CFDI 4.0 Representativos", () => {
    const rfcEmpresa = "XAXX010101000";
    const fechaInicio = "2026-03-01";
    const fechaFin = "2026-03-20";

    it("debe generar lote de comprobantes para TODAS (Emitidas y Recibidas)", () => {
      const lote = SatSyncService.generarLoteRepresentativo(rfcEmpresa, "TODAS", fechaInicio, fechaFin);

      expect(lote.length).toBeGreaterThan(0);
      const emitidas = lote.filter((f) => f.tipo === "EMITIDA");
      const recibidas = lote.filter((f) => f.tipo === "RECIBIDA");

      expect(emitidas.length).toBeGreaterThan(0);
      expect(recibidas.length).toBeGreaterThan(0);

      // Validar que las emitidas tienen como emisor el RFC de la empresa
      emitidas.forEach((f) => {
        expect(f.emisorRfc).toBe(rfcEmpresa);
        expect(f.rawXml).toContain(`Rfc="${rfcEmpresa}"`);
        expect(f.rawXml).toContain("Version=\"4.0\"");
        expect(f.subtotal).toBeGreaterThan(0);
        expect(f.total).toBeGreaterThan(f.subtotal);
      });

      // Validar que las recibidas tienen como receptor el RFC de la empresa
      recibidas.forEach((f) => {
        expect(f.receptorRfc).toBe(rfcEmpresa);
        expect(f.rawXml).toContain(`Rfc="${rfcEmpresa}"`);
      });
    });

    it("debe respetar el filtro de solo EMITIDAS", () => {
      const lote = SatSyncService.generarLoteRepresentativo(rfcEmpresa, "EMITIDAS", fechaInicio, fechaFin);
      expect(lote.length).toBeGreaterThan(0);
      lote.forEach((f) => {
        expect(f.tipo).toBe("EMITIDA");
        expect(f.emisorRfc).toBe(rfcEmpresa);
      });
    });

    it("debe respetar el filtro de solo RECIBIDAS", () => {
      const lote = SatSyncService.generarLoteRepresentativo(rfcEmpresa, "RECIBIDAS", fechaInicio, fechaFin);
      expect(lote.length).toBeGreaterThan(0);
      lote.forEach((f) => {
        expect(f.tipo).toBe("RECIBIDA");
        expect(f.receptorRfc).toBe(rfcEmpresa);
      });
    });

    it("cada factura generada debe tener UUID fiscal oficial y conceptos detallados en XML", () => {
      const lote = SatSyncService.generarLoteRepresentativo(rfcEmpresa, "TODAS", fechaInicio, fechaFin);
      const primera = lote[0];

      expect(primera.uuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
      expect(primera.rawXml).toContain("<cfdi:Concepto");
      expect(primera.rawXml).toContain("Descripcion=");
      expect(primera.rawXml).toContain("ValorUnitario=");
      expect(primera.rawXml).toContain("ClaveProdServ=");
    });
  });

  describe("3. Contabilización Automática de Facturas Descargadas del SAT", () => {
    it("debe generar pólizas cuadradas (Cargos === Abonos) para facturas emitidas y recibidas", () => {
      const lote = SatSyncService.generarLoteRepresentativo("AAA010101AAA", "TODAS", "2026-03-01", "2026-03-20");

      lote.forEach((factura, idx) => {
        const poliza = AccountingEngine.generarPolizaAutomatica({
          id: `invoice-test-${idx}`,
          organizationId: "org-test",
          tipo: factura.tipo,
          tipoDeComprobante: factura.tipoDeComprobante,
          serie: factura.serie || null,
          folio: factura.folio || null,
          uuid: factura.uuid,
          fecha: new Date(factura.fecha),
          metodoPago: factura.metodoPago,
          formaPago: factura.formaPago,
          lugarExpedicion: factura.lugarExpedicion,
          moneda: "MXN",
          tipoCambio: new Decimal(1.0),
          subtotal: factura.subtotal as any,
          descuento: factura.descuento as any,
          total: factura.total as any,
          totalIvaTrasladado: factura.totalIvaTrasladado as any,
          totalIsrRetenido: factura.totalIsrRetenido as any,
          totalIvaRetenido: factura.totalIvaRetenido as any,
          emisorRfc: factura.emisorRfc,
          emisorNombre: factura.emisorNombre,
          emisorRegimen: factura.emisorRegimen,
          receptorRfc: factura.receptorRfc,
          receptorNombre: factura.receptorNombre,
          receptorCp: factura.receptorCp,
          receptorRegimen: factura.receptorRegimen,
          receptorUsoCfdi: factura.receptorUsoCfdi,
          estatus: "VIGENTE",
          fechaTimbrado: null,
          selloCFD: null,
          selloSAT: null,
          noCertificadoSAT: null,
          cadenaOriginal: null,
          qrCodeData: null,
          rawXml: factura.rawXml,
          saldoPendiente: factura.total as any,
          fechaEfectivoCobro: null,
          estaConciliada: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        }, idx + 1);

        expect(poliza.entries.length).toBeGreaterThan(1);
        expect(poliza.estaCuadrada).toBe(true);
        expect(poliza.totalDebe).toBeCloseTo(poliza.totalHaber, 2);
      });
    });
  });
});
