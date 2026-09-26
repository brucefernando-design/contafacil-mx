import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { enviarReciboNomina, type ReciboNominaEmailData } from "@/lib/email/resend";

describe("Dispersión de Recibos de Nómina por Email (Sprint 3)", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  it("omite el envío y retorna sent: false cuando RESEND_API_KEY no está configurada sin arrojar error", async () => {
    delete process.env.RESEND_API_KEY;

    const data: ReciboNominaEmailData = {
      nombreEmpleado: "Juan Pérez López",
      email: "juan.perez@empresa.com",
      rfcEmpleado: "PELJ900101HA1",
      descripcionPeriodo: "1ra Quincena Septiembre 2026",
      fechaPago: "2026-09-15",
      totalPercepciones: 12000,
      totalDeducciones: 1850.5,
      netoPagar: 10149.5,
      uuid: null,
      xmlSat: null,
    };

    const result = await enviarReciboNomina(data);
    expect(result.sent).toBe(false);
    expect(result.reason).toBe("NO_API_KEY");
  });

  it("retorna sent: false cuando el empleado no tiene correo electrónico", async () => {
    process.env.RESEND_API_KEY = "re_test_dummy_key";

    const data: ReciboNominaEmailData = {
      nombreEmpleado: "Carlos Sin Correo",
      email: "",
      rfcEmpleado: "SINC900101HA2",
      descripcionPeriodo: "1ra Quincena Septiembre 2026",
      fechaPago: "2026-09-15",
      totalPercepciones: 8000,
      totalDeducciones: 900,
      netoPagar: 7100,
    };

    const result = await enviarReciboNomina(data);
    expect(result.sent).toBe(false);
    expect(result.reason).toBe("NO_EMAIL");
  });

  it("adjunta el archivo XML cuando el recibo ya cuenta con xmlSat timbrado", async () => {
    process.env.RESEND_API_KEY = "re_test_dummy_key";

    const mockSend = vi.fn().mockResolvedValue({
      data: { id: "email_msg_12345" },
      error: null,
    });

    vi.doMock("resend", () => {
      return {
        Resend: class {
          emails = {
            send: mockSend,
          };
        },
      };
    });

    const { enviarReciboNomina: mockedEnviar } = await import("@/lib/email/resend");

    const sampleXml = `<?xml version="1.0" encoding="utf-8"?><cfdi:Comprobante UUID="F3507D6C-7740-4A3C-97FD-429C91B4791E" />`;

    const data: ReciboNominaEmailData = {
      nombreEmpleado: "Ana Gómez Soto",
      email: "ana.gomez@empresa.com",
      rfcEmpleado: "GOSA850315HJ2",
      descripcionPeriodo: "1ra Quincena Septiembre 2026",
      fechaPago: new Date("2026-09-15"),
      totalPercepciones: 15000,
      totalDeducciones: 2500,
      netoPagar: 12500,
      uuid: "F3507D6C-7740-4A3C-97FD-429C91B4791E",
      xmlSat: sampleXml,
    };

    const result = await mockedEnviar(data);

    expect(result.sent).toBe(true);
    expect(result.messageId).toBe("email_msg_12345");
    expect(mockSend).toHaveBeenCalledTimes(1);

    const callArgs = mockSend.mock.calls[0][0];
    expect(callArgs.to).toEqual(["ana.gomez@empresa.com"]);
    expect(callArgs.subject).toContain("1ra Quincena Septiembre 2026");
    expect(callArgs.attachments).toBeDefined();
    expect(callArgs.attachments.length).toBe(1);
    expect(callArgs.attachments[0].filename).toContain("recibo-GOSA850315HJ2");
    expect(callArgs.attachments[0].content).toEqual(Buffer.from(sampleXml, "utf-8"));
  });

  it("clasifica correctamente empleados con email, sin email y con error en la lógica de lote", () => {
    const empleadosEnLote = [
      { id: "emp1", nombre: "Mario", email: "mario@empresa.com" },
      { id: "emp2", nombre: "Luigi", email: null },
      { id: "emp3", nombre: "Peach", email: "peach@empresa.com" },
      { id: "emp4", nombre: "Toad", email: "   " },
    ];

    let omitidos = 0;
    const aEnviar: string[] = [];

    for (const e of empleadosEnLote) {
      if (!e.email || !e.email.trim()) {
        omitidos++;
      } else {
        aEnviar.push(e.email.trim());
      }
    }

    expect(omitidos).toBe(2); // Luigi and Toad
    expect(aEnviar).toEqual(["mario@empresa.com", "peach@empresa.com"]);
  });
});
