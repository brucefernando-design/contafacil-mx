import { describe, it, expect } from "vitest";
import {
  validarPassword,
  validarEmail,
  validarRfcEstructura,
  validarRegimenFiscal,
  REGIMENES_PF,
  REGIMENES_PM,
} from "@/lib/validation/auth";

describe("Fase 2 - Flujo de Registro y Validaciones Fiscales SAT 2026", () => {
  describe("1. Validación de Contraseña", () => {
    it("debe rechazar contraseñas con menos de 8 caracteres", () => {
      const res = validarPassword("Pass1");
      expect(res.valido).toBe(false);
      expect(res.error).toContain("al menos 8 caracteres");
    });

    it("debe rechazar contraseñas que no contengan al menos un número", () => {
      const res = validarPassword("PasswordSeguroSinNumero");
      expect(res.valido).toBe(false);
      expect(res.error).toContain("al menos un número");
    });

    it("debe aceptar contraseñas válidas (>= 8 caracteres con al menos un número)", () => {
      const res = validarPassword("Demo1234!");
      expect(res.valido).toBe(true);
      expect(res.error).toBeUndefined();
    });

    it("debe rechazar contraseñas vacías o nulas", () => {
      expect(validarPassword("").valido).toBe(false);
      expect(validarPassword(null as unknown as string).valido).toBe(false);
    });
  });

  describe("2. Validación de Correo Electrónico", () => {
    it("debe aceptar correos válidos", () => {
      expect(validarEmail("ana@easyconta.mx").valido).toBe(true);
      expect(validarEmail("despacho@easyconta.mx").valido).toBe(true);
      expect(validarEmail("nuevo.usuario@empresa.com.mx").valido).toBe(true);
    });

    it("debe rechazar correos con formato inválido o vacíos", () => {
      expect(validarEmail("correo-sin-arroba.com").valido).toBe(false);
      expect(validarEmail("@dominio.com").valido).toBe(false);
      expect(validarEmail("").valido).toBe(false);
    });
  });

  describe("3. Validación de Estructura de RFC (13 PF / 12 PM en Mayúsculas)", () => {
    it("debe aceptar RFC válido de 13 caracteres para Persona Física", () => {
      const res = validarRfcEstructura("GAMA850512XYZ", "PF");
      expect(res.valido).toBe(true);
      expect(res.rfcFormateado).toBe("GAMA850512XYZ");
    });

    it("debe convertir RFC a mayúsculas automáticamente", () => {
      const res = validarRfcEstructura("gama850512xyz", "PF");
      expect(res.valido).toBe(true);
      expect(res.rfcFormateado).toBe("GAMA850512XYZ");
    });

    it("debe rechazar RFC de PF con longitud diferente a 13 caracteres", () => {
      const res12 = validarRfcEstructura("SFI200115AA1", "PF"); // 12 chars
      expect(res12.valido).toBe(false);
      expect(res12.error).toContain("13 caracteres");

      const res14 = validarRfcEstructura("GAMA850512XYZ1", "PF"); // 14 chars
      expect(res14.valido).toBe(false);
      expect(res14.error).toContain("13 caracteres");
    });

    it("debe aceptar RFC válido de 12 caracteres para Persona Moral", () => {
      const res = validarRfcEstructura("SFI200115AA1", "PM");
      expect(res.valido).toBe(true);
      expect(res.rfcFormateado).toBe("SFI200115AA1");
    });

    it("debe rechazar RFC de PM con longitud diferente a 12 caracteres", () => {
      const res13 = validarRfcEstructura("GAMA850512XYZ", "PM"); // 13 chars
      expect(res13.valido).toBe(false);
      expect(res13.error).toContain("12 caracteres");
    });
  });

  describe("4. Validación de Régimen Fiscal SAT (626, 612, 606, 601)", () => {
    it("para Persona Física debe aceptar regímenes 626 (RESICO), 612 (Act. Empresarial) y 606 (Arrendamiento)", () => {
      expect(REGIMENES_PF).toEqual(["626", "612", "606"]);
      expect(validarRegimenFiscal("626", "PF").valido).toBe(true);
      expect(validarRegimenFiscal("612", "PF").valido).toBe(true);
      expect(validarRegimenFiscal("606", "PF").valido).toBe(true);
    });

    it("para Persona Física debe rechazar régimen 601 (General de Ley PM)", () => {
      const res = validarRegimenFiscal("601", "PF");
      expect(res.valido).toBe(false);
      expect(res.error).toContain("Persona Física");
    });

    it("para Persona Moral debe aceptar régimen 601 (General de Ley PM)", () => {
      expect(REGIMENES_PM).toEqual(["601"]);
      expect(validarRegimenFiscal("601", "PM").valido).toBe(true);
    });

    it("para Persona Moral debe rechazar régimen 626 (RESICO PF)", () => {
      const res = validarRegimenFiscal("626", "PM");
      expect(res.valido).toBe(false);
      expect(res.error).toContain("Persona Moral");
    });
  });
});
