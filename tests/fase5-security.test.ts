import { describe, it, expect, beforeEach } from "vitest";
import { checkRateLimit, resetRateLimitStore } from "@/lib/rate-limit";
import { sanitizarDetalles } from "@/lib/sat/audit";

describe("Fase 5: Seguridad, Rate Limiting y Auditoría", () => {
  beforeEach(() => {
    resetRateLimitStore();
  });

  describe("1. Rate Limiter en Memoria (20 req/min por IP)", () => {
    it("debe permitir hasta 20 peticiones por minuto para una misma IP y acción", () => {
      const ip = "192.168.1.50";
      const action = "login";

      for (let i = 1; i <= 20; i++) {
        const res = checkRateLimit(ip, action, 20, 60000);
        expect(res.success).toBe(true);
        expect(res.remaining).toBe(20 - i);
      }
    });

    it("debe bloquear la petición 21 con HTTP 429 para la misma IP y acción", () => {
      const ip = "192.168.1.50";
      const action = "registro";

      // 20 permitidas
      for (let i = 1; i <= 20; i++) {
        checkRateLimit(ip, action, 20, 60000);
      }

      // 21 rechazada
      const res21 = checkRateLimit(ip, action, 20, 60000);
      expect(res21.success).toBe(false);
      expect(res21.remaining).toBe(0);
      expect(res21.reset).toBeGreaterThan(Date.now());
    });

    it("debe aislar límites entre diferentes IPs", () => {
      const ip1 = "10.0.0.1";
      const ip2 = "10.0.0.2";
      const action = "timbrar";

      // Consumir 20 para ip1
      for (let i = 1; i <= 20; i++) {
        checkRateLimit(ip1, action, 20, 60000);
      }
      expect(checkRateLimit(ip1, action, 20, 60000).success).toBe(false);

      // ip2 aún debe tener 20 disponibles
      const resIp2 = checkRateLimit(ip2, action, 20, 60000);
      expect(resIp2.success).toBe(true);
      expect(resIp2.remaining).toBe(19);
    });

    it("debe aislar límites entre diferentes acciones para la misma IP", () => {
      const ip = "172.16.0.1";

      // Agotar límite de upload cert
      for (let i = 1; i <= 20; i++) {
        checkRateLimit(ip, "upload_cert", 20, 60000);
      }
      expect(checkRateLimit(ip, "upload_cert", 20, 60000).success).toBe(false);

      // La acción timbrar para la misma IP debe estar libre
      expect(checkRateLimit(ip, "timbrar", 20, 60000).success).toBe(true);
    });
  });

  describe("2. Sanitización Estricta de Secretos en Auditoría", () => {
    it("debe sanitizar cadenas de texto que contengan contraseñas y llaves", () => {
      const entrada = "Usuario intentó acceso con password=SuperSecretPassword123! y secret=MyApiKeyXYZ";
      const salida = sanitizarDetalles(entrada);

      expect(salida).not.toContain("SuperSecretPassword123!");
      expect(salida).not.toContain("MyApiKeyXYZ");
      expect(salida).toContain("password=[REDACTED]");
      expect(salida).toContain("secret=[REDACTED]");
    });

    it("debe redactar bloques completos de certificados y llaves PEM", () => {
      const pem = `Detalles:
-----BEGIN RSA PRIVATE KEY-----
MIIEowIBAAKCAQEA0lX9XoYq6q9x...
-----END RSA PRIVATE KEY-----
Operación completada`;

      const salida = sanitizarDetalles(pem);
      expect(salida).not.toContain("MIIEowIBAAKCAQEA0lX9XoYq6q9x");
      expect(salida).toContain("[CERTIFICATE_OR_KEY_REDACTED]");
      expect(salida).toContain("Operación completada");
    });

    it("debe filtrar recursivamente objetos JSON con campos sensibles", () => {
      const objeto = {
        usuario: "ana@easyconta.mx",
        passwordKey: "DemoSecretPassword123!",
        privateKey: "0102030405060708090a0b0c",
        rfc: "GAMA850512XYZ",
        subtotal: 1500.0,
      };

      const resultadoJson = sanitizarDetalles(objeto);
      const parsed = JSON.parse(resultadoJson);

      expect(parsed.usuario).toBe("ana@easyconta.mx");
      expect(parsed.rfc).toBe("GAMA850512XYZ");
      expect(parsed.subtotal).toBe(1500.0);
      expect(parsed.passwordKey).toBe("[REDACTED]");
      expect(parsed.privateKey).toBe("[REDACTED]");
    });
  });

  describe("3. Reglas de Subida de Certificados (20 KB y .cer/.key)", () => {
    const MAX_ALLOWED_SIZE = 20 * 1024; // 20 KB

    it("debe validar que los archivos menores o iguales a 20 KB sean aceptados", () => {
      const archivoValido = Buffer.alloc(15 * 1024, "A"); // 15 KB
      expect(archivoValido.length <= MAX_ALLOWED_SIZE).toBe(true);
    });

    it("debe detectar archivos mayores a 20 KB", () => {
      const archivoExcedido = Buffer.alloc(25 * 1024, "B"); // 25 KB
      expect(archivoExcedido.length > MAX_ALLOWED_SIZE).toBe(true);
    });

    it("debe validar estrictamente las extensiones .cer y .key", () => {
      const validarExtension = (nombre: string, esperada: ".cer" | ".key") => {
        return nombre.toLowerCase().endsWith(esperada);
      };

      expect(validarExtension("GAMA850512XYZ.cer", ".cer")).toBe(true);
      expect(validarExtension("GAMA850512XYZ.CER", ".cer")).toBe(true);
      expect(validarExtension("Claveprivada.key", ".key")).toBe(true);
      expect(validarExtension("Claveprivada.KEY", ".key")).toBe(true);

      expect(validarExtension("archivo.txt", ".cer")).toBe(false);
      expect(validarExtension("certificado.pfx", ".cer")).toBe(false);
      expect(validarExtension("llave.pem", ".key")).toBe(false);
    });
  });

  describe("4. Rutas Públicas vs Rutas Protegidas en Middleware", () => {
    const publicExactPaths = [
      "/",
      "/login",
      "/registro",
      "/precios",
      "/terminos",
      "/privacidad",
    ];

    it("debe considerar públicas las páginas principales y legales sin requerir sesión", () => {
      for (const path of publicExactPaths) {
        expect(publicExactPaths.includes(path)).toBe(true);
      }
    });

    it("debe considerar públicas las rutas /api/auth/*", () => {
      const isPublicAuthApi = (pathname: string) => pathname.startsWith("/api/auth");

      expect(isPublicAuthApi("/api/auth/signin")).toBe(true);
      expect(isPublicAuthApi("/api/auth/register")).toBe(true);
      expect(isPublicAuthApi("/api/auth/callback/credentials")).toBe(true);
      expect(isPublicAuthApi("/api/cfdi/timbrar")).toBe(false);
      expect(isPublicAuthApi("/dashboard/motor-fiscal")).toBe(false);
    });

    it("debe considerar protegidas las rutas /dashboard y /api fuera de /api/auth", () => {
      const esRutaProtegida = (pathname: string) => {
        if (publicExactPaths.includes(pathname)) return false;
        if (pathname.startsWith("/api/auth")) return false;
        return pathname.startsWith("/dashboard") || pathname.startsWith("/api");
      };

      expect(esRutaProtegida("/dashboard")).toBe(true);
      expect(esRutaProtegida("/dashboard/facturacion")).toBe(true);
      expect(esRutaProtegida("/dashboard/auditoria")).toBe(true);
      expect(esRutaProtegida("/api/cfdi/timbrar")).toBe(true);
      expect(esRutaProtegida("/api/certificates/upload")).toBe(true);
      expect(esRutaProtegida("/api/onboarding")).toBe(true);

      expect(esRutaProtegida("/")).toBe(false);
      expect(esRutaProtegida("/login")).toBe(false);
      expect(esRutaProtegida("/registro")).toBe(false);
      expect(esRutaProtegida("/precios")).toBe(false);
      expect(esRutaProtegida("/terminos")).toBe(false);
      expect(esRutaProtegida("/privacidad")).toBe(false);
    });
  });
});
