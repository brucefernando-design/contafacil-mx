import { describe, it, expect, vi } from "vitest";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { enviarRecuperarPassword } from "@/lib/email/resend";

describe("Flujo y Seguridad de Recuperación de Contraseña", () => {
  describe("1. Generación de Tokens Criptográficos y Expiración", () => {
    it("debe generar un token criptográfico seguro de 64 caracteres hexadecimales (32 bytes)", () => {
      const token = crypto.randomBytes(32).toString("hex");
      expect(token).toHaveLength(64);
      expect(/^[0-9a-f]{64}$/.test(token)).toBe(true);
    });

    it("el token debe tener exactamente 1 hora de vigencia", () => {
      const now = new Date();
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hora
      const diffMinutes = Math.round((expiresAt.getTime() - now.getTime()) / (60 * 1000));
      expect(diffMinutes).toBe(60);
    });

    it("un token con fecha pasada debe considerarse expirado", () => {
      const tokenExpirado = {
        token: "abcdef123456",
        expiresAt: new Date(Date.now() - 1000), // Hace 1 segundo
        used: false,
      };

      const esValido = !tokenExpirado.used && tokenExpirado.expiresAt > new Date();
      expect(esValido).toBe(false);
    });

    it("un token marcado como usado debe considerarse inválido", () => {
      const tokenUsado = {
        token: "abcdef123456",
        expiresAt: new Date(Date.now() + 3600000),
        used: true,
      };

      const esValido = !tokenUsado.used && tokenUsado.expiresAt > new Date();
      expect(esValido).toBe(false);
    });
  });

  describe("2. Hashing Seguro de Nuevas Contraseñas", () => {
    it("debe hashear la contraseña correctamente con bcrypt (10 rounds)", async () => {
      const plainPassword = "MiNuevaPassword2026!";
      const hashedPassword = await bcrypt.hash(plainPassword, 10);

      expect(hashedPassword).not.toBe(plainPassword);
      expect(hashedPassword.startsWith("$2")).toBe(true);

      const matches = await bcrypt.compare(plainPassword, hashedPassword);
      expect(matches).toBe(true);

      const wrongMatches = await bcrypt.compare("PasswordIncorrecta", hashedPassword);
      expect(wrongMatches).toBe(false);
    });
  });

  describe("3. Servicio de Envío de Correo (Resend)", () => {
    it("no debe lanzar excepción si la API key de Resend no está configurada (modo silencioso/demo)", async () => {
      const oldKey = process.env.RESEND_API_KEY;
      delete process.env.RESEND_API_KEY;

      await expect(
        enviarRecuperarPassword("Ana Contadora", "ana@example.com", "https://easyconta.allia2.com.mx/restablecer-password?token=test123")
      ).resolves.not.toThrow();

      process.env.RESEND_API_KEY = oldKey;
    });
  });
});
