import { describe, it, expect } from "vitest";
import { CHECKLIST_INICIO, FAQ_ASISTENTE } from "@/lib/ayuda/guias";
import { AccountingEngine } from "@/lib/sat/accounting-engine";

describe("Fase 6: Landing Pública, Cancelación, Asistente y Navegación", () => {
  describe("1. FAQ del Asistente SAT", () => {
    it("debe contener la pregunta '¿Ya facturé ante el SAT?' respondiendo NO categóricamente", () => {
      const faqFacturas = FAQ_ASISTENTE.find((f) => f.pregunta === "¿Ya facturé ante el SAT?");
      expect(faqFacturas).toBeDefined();
      expect(faqFacturas?.respuesta.startsWith("NO.")).toBe(true);
    });

    it("la FAQ debe mencionar los planes y el aviso de demostración", () => {
      const faqFacturas = FAQ_ASISTENTE.find((f) => f.pregunta === "¿Ya facturé ante el SAT?");
      const resp = faqFacturas?.respuesta.toLowerCase() || "";

      expect(resp).toContain("timbrado de demostración");
      expect(resp).toContain("este cfdi no fue enviado al sat");
      expect(resp).toContain("planes");
      expect(resp).toContain("/precios");
    });
  });

  describe("2. Checklist de Primera Vez", () => {
    it("debe contener los 4 pasos clave: crear cuenta, emitir PUE, ver watermark, ver plan", () => {
      const ids = CHECKLIST_INICIO.map((c) => c.id);
      expect(ids).toContain("check-crear-cuenta");
      expect(ids).toContain("check-factura-pue");
      expect(ids).toContain("check-ver-watermark");
      expect(ids).toContain("check-ver-plan");
    });

    it("cada item del checklist debe tener descripción y ruta sugerida clara", () => {
      const crearCuenta = CHECKLIST_INICIO.find((c) => c.id === "check-crear-cuenta");
      expect(crearCuenta?.rutaSugerida).toBe("/registro");

      const emitirPue = CHECKLIST_INICIO.find((c) => c.id === "check-factura-pue");
      expect(emitirPue?.rutaSugerida).toBe("/dashboard/facturacion");

      const watermark = CHECKLIST_INICIO.find((c) => c.id === "check-ver-watermark");
      expect(watermark?.rutaSugerida).toBe("/dashboard/boveda");

      const plan = CHECKLIST_INICIO.find((c) => c.id === "check-ver-plan");
      expect(plan?.rutaSugerida).toBe("/dashboard/plan");
    });
  });

  describe("3. Cancelación de CFDI y Póliza de Reversión", () => {
    it("debe generar póliza de reversión contable cuadrada al cancelar un CFDI", () => {
      const mockInvoice = {
        id: "inv-test-1",
        organizationId: "org-test-1",
        tipo: "EMITIDA",
        tipoDeComprobante: "I",
        uuid: "UUID-TEST-CANCEL-1234",
        folio: "101",
        serie: "F",
        fecha: new Date("2026-09-15"),
        formaPago: "03",
        metodoPago: "PUE",
        lugarExpedicion: "06700",
        moneda: "MXN",
        tipoCambio: 1.0,
        subtotal: 1000.0,
        descuento: 0,
        total: 1160.0,
        emisorRfc: "GAMA850512XYZ",
        emisorNombre: "Gabriel Morales",
        emisorRegimen: "626",
        receptorRfc: "XAXX010101000",
        receptorNombre: "Público en General",
        receptorCp: "06700",
        receptorRegimen: "616",
        receptorUsoCfdi: "S01",
        totalIvaTrasladado: 160.0,
        totalIvaRetenido: 0,
        totalIsrRetenido: 0,
        estatus: "VIGENTE",
        fechaTimbrado: new Date("2026-09-15"),
        selloCFD: null,
        selloSAT: null,
        noCertificadoSAT: null,
        cadenaOriginal: null,
        qrCodeData: null,
        rawXml: null,
        saldoPendiente: 0,
        fechaEfectivoCobro: new Date("2026-09-15"),
        estaConciliada: true,
        createdAt: new Date("2026-09-15"),
        updatedAt: new Date("2026-09-15"),
      };

      const polizaReversion = AccountingEngine.generarPolizaReversion(
        mockInvoice as unknown as Parameters<typeof AccountingEngine.generarPolizaReversion>[0],
        2,
        new Date("2026-09-16"),
        "02"
      );

      expect(polizaReversion.tipo).toBe("DIARIO");
      expect(polizaReversion.estaCuadrada).toBe(true);
      expect(polizaReversion.totalDebe).toBe(1160.0);
      expect(polizaReversion.totalHaber).toBe(1160.0);
      expect(polizaReversion.concepto).toContain("Cancelación");
      expect(polizaReversion.entries[0].concepto).toContain("Reversión");
      expect(polizaReversion.uuidRelacionado).toBe("UUID-TEST-CANCEL-1234");
    });
  });
});
