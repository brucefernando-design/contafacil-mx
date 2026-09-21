import { describe, it, expect } from "vitest";
import {
  PLANES_CONFIG,
  PAQUETES_TIMBRES,
  getPlanDetails,
  puedeCrearRfc,
  puedeTimbrar,
} from "@/lib/sat/subscription-engine";

describe("Fase 3 - Motor de Suscripciones, Cuotas de Timbres y Límites de RFC", () => {
  describe("1. Configuración de Cuotas por Plan", () => {
    it("Plan FREE debe incluir 1 RFC, 10 timbres mock y 1 usuario", () => {
      const free = PLANES_CONFIG.FREE;
      expect(free.rfcLimit).toBe(1);
      expect(free.timbresIncluidos).toBe(10);
      expect(free.usuarios).toBe(1);
      expect(free.multiCliente).toBe(false);
      expect(free.precioMensual).toBe(0);
    });

    it("Plan PRO debe incluir 3 RFCs, 50 timbres mock y 3 usuarios", () => {
      const pro = PLANES_CONFIG.PRO;
      expect(pro.rfcLimit).toBe(3);
      expect(pro.timbresIncluidos).toBe(50);
      expect(pro.usuarios).toBe(3);
      expect(pro.multiCliente).toBe(false);
      expect(pro.precioMensual).toBe(499);
    });

    it("Plan DESPACHO debe incluir 25 RFCs, 200 timbres mock y modo multi-cliente", () => {
      const despacho = PLANES_CONFIG.DESPACHO;
      expect(despacho.rfcLimit).toBe(25);
      expect(despacho.timbresIncluidos).toBe(200);
      expect(despacho.usuarios).toBe(10);
      expect(despacho.multiCliente).toBe(true);
      expect(despacho.precioMensual).toBe(1499);
    });

    it("getPlanDetails debe aplicar fallback seguro a FREE si el plan es nulo o desconocido", () => {
      expect(getPlanDetails(null).plan).toBe("FREE");
      expect(getPlanDetails("").plan).toBe("FREE");
      expect(getPlanDetails("DESCONOCIDO").plan).toBe("FREE");
      expect(getPlanDetails("pro").plan).toBe("PRO");
    });
  });

  describe("2. Control y Límite de RFCs (Empresas)", () => {
    it("debe permitir crear el primer RFC en plan FREE", () => {
      const res = puedeCrearRfc("FREE", 0);
      expect(res.permitido).toBe(true);
      expect(res.limite).toBe(1);
    });

    it("debe impedir segundo RFC en plan FREE", () => {
      const res = puedeCrearRfc("FREE", 1);
      expect(res.permitido).toBe(false);
      expect(res.error).toContain("El plan FREE sólo permite 1 RFC activo");
    });

    it("en plan PRO debe permitir hasta 3 RFCs y bloquear el 4to", () => {
      expect(puedeCrearRfc("PRO", 0).permitido).toBe(true);
      expect(puedeCrearRfc("PRO", 1).permitido).toBe(true);
      expect(puedeCrearRfc("PRO", 2).permitido).toBe(true);

      const res4 = puedeCrearRfc("PRO", 3);
      expect(res4.permitido).toBe(false);
      expect(res4.error).toContain("límite máximo de 3 RFCs");
    });

    it("en plan DESPACHO debe permitir hasta 25 RFCs y bloquear el 26vo", () => {
      expect(puedeCrearRfc("DESPACHO", 24).permitido).toBe(true);

      const res26 = puedeCrearRfc("DESPACHO", 25);
      expect(res26.permitido).toBe(false);
      expect(res26.error).toContain("límite máximo de 25 RFCs");
    });
  });

  describe("3. Control y Descuento de Timbres Mock CFDI 4.0", () => {
    it("debe permitir timbrar si se tienen timbres disponibles", () => {
      const res = puedeTimbrar(0, 10);
      expect(res.permitido).toBe(true);
      expect(res.restantes).toBe(10);
      expect(res.error).toBeUndefined();
    });

    it("debe calcular correctamente los timbres restantes", () => {
      const res = puedeTimbrar(7, 10);
      expect(res.permitido).toBe(true);
      expect(res.restantes).toBe(3);
    });

    it("debe bloquear el timbrado cuando se llega al límite (0 restantes)", () => {
      const res = puedeTimbrar(10, 10);
      expect(res.permitido).toBe(false);
      expect(res.restantes).toBe(0);
      expect(res.error).toContain("Has agotado los timbres de tu plan");
      expect(res.error).toContain("/precios");
    });

    it("debe bloquear el timbrado si se excede el límite", () => {
      const res = puedeTimbrar(12, 10);
      expect(res.permitido).toBe(false);
      expect(res.restantes).toBe(0);
    });

    it("en plan PRO con 50 timbres debe permitir timbrar hasta el límite", () => {
      expect(puedeTimbrar(49, 50).permitido).toBe(true);
      expect(puedeTimbrar(49, 50).restantes).toBe(1);
      expect(puedeTimbrar(50, 50).permitido).toBe(false);
    });

    it("en plan DESPACHO con 200 timbres debe permitir timbrar hasta el límite", () => {
      expect(puedeTimbrar(199, 200).permitido).toBe(true);
      expect(puedeTimbrar(200, 200).permitido).toBe(false);
    });
  });

  describe("4. Catálogo Oficial de Paquetes de Timbres Adicionales (Sin Vencimiento)", () => {
    it("debe contener los 4 paquetes oficiales con precios y costos unitarios", () => {
      expect(PAQUETES_TIMBRES).toHaveLength(4);
      const ids = PAQUETES_TIMBRES.map((p) => p.id);
      expect(ids).toEqual(["TIMBRES_50", "TIMBRES_100", "TIMBRES_500", "TIMBRES_1000"]);

      const p100 = PAQUETES_TIMBRES.find((p) => p.id === "TIMBRES_100");
      expect(p100?.precio).toBe(249);
      expect(p100?.timbres).toBe(100);
      expect(p100?.popular).toBe(true);

      const p1000 = PAQUETES_TIMBRES.find((p) => p.id === "TIMBRES_1000");
      expect(p1000?.precio).toBe(1399);
      expect(p1000?.timbres).toBe(1000);
      expect(p1000?.precioUnitario).toBe("1.40");
    });
  });
});
