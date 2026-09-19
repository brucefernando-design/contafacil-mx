import QRCode from "qrcode";

export async function generateSatQrDataUrl(qrUrl: string): Promise<string> {
  try {
    return await QRCode.toDataURL(qrUrl, {
      width: 200,
      margin: 1,
      color: {
        dark: "#1e293b",
        light: "#ffffff",
      },
    });
  } catch (err) {
    console.error("Error generating QR:", err);
    return "";
  }
}

/**
 * Convierte un número en formato moneda a texto en español (pesos mexicanos)
 */
export function numeroALetrasMx(cantidad: number): string {
  const enteros = Math.floor(cantidad);
  const centavos = Math.round((cantidad - enteros) * 100);
  const centavosStr = `${centavos.toString().padStart(2, "0")}/100 M.N.`;

  if (enteros === 0) return `CERO PESOS ${centavosStr}`;

  function unidad(n: number): string {
    switch (n) {
      case 1: return "UN";
      case 2: return "DOS";
      case 3: return "TRES";
      case 4: return "CUATRO";
      case 5: return "CINCO";
      case 6: return "SEIS";
      case 7: return "SIETE";
      case 8: return "OCHO";
      case 9: return "NUEVE";
      default: return "";
    }
  }

  function decena(n: number): string {
    if (n < 10) return unidad(n);
    if (n === 10) return "DIEZ";
    if (n === 11) return "ONCE";
    if (n === 12) return "DOCE";
    if (n === 13) return "TRECE";
    if (n === 14) return "CATORCE";
    if (n === 15) return "QUINCE";
    if (n < 20) return `DIECI${unidad(n - 10)}`;
    if (n === 20) return "VEINTE";
    if (n < 30) return `VEINTI${unidad(n - 20)}`;
    if (n === 30) return "TREINTA";
    if (n < 40) return `TREINTA Y ${unidad(n - 30)}`;
    if (n === 40) return "CUARENTA";
    if (n < 50) return `CUARENTA Y ${unidad(n - 40)}`;
    if (n === 50) return "CINCUENTA";
    if (n < 60) return `CINCUENTA Y ${unidad(n - 50)}`;
    if (n === 60) return "SESENTA";
    if (n < 70) return `SESENTA Y ${unidad(n - 60)}`;
    if (n === 70) return "SETENTA";
    if (n < 80) return `SETENTA Y ${unidad(n - 70)}`;
    if (n === 80) return "OCHENTA";
    if (n < 90) return `OCHENTA Y ${unidad(n - 80)}`;
    if (n === 90) return "NOVENTA";
    return `NOVENTA Y ${unidad(n - 90)}`;
  }

  function centena(n: number): string {
    if (n < 100) return decena(n);
    if (n === 100) return "CIEN";
    if (n < 200) return `CIENTO ${decena(n - 100)}`;
    if (n < 300) return `DOSCIENTOS ${decena(n - 200)}`;
    if (n < 400) return `TRESCIENTOS ${decena(n - 300)}`;
    if (n < 500) return `CUATROCIENTOS ${decena(n - 400)}`;
    if (n < 600) return `QUINIENTOS ${decena(n - 500)}`;
    if (n < 700) return `SEISCIENTOS ${decena(n - 600)}`;
    if (n < 800) return `SETECIENTOS ${decena(n - 700)}`;
    if (n < 900) return `OCHOCIENTOS ${decena(n - 800)}`;
    return `NOVECIENTOS ${decena(n - 900)}`;
  }

  function miles(n: number): string {
    if (n < 1000) return centena(n);
    const m = Math.floor(n / 1000);
    const resto = n % 1000;
    const mStr = m === 1 ? "MIL" : `${centena(m)} MIL`;
    return resto === 0 ? mStr : `${mStr} ${centena(resto)}`;
  }

  const textoEntero = miles(enteros).trim();
  const palabraPesos = enteros === 1 ? "PESO" : "PESOS";
  return `(${textoEntero} ${palabraPesos} ${centavosStr})`.toUpperCase();
}
