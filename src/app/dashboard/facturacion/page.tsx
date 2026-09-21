import { getCurrentUserAndOrg } from "@/lib/session";
import { FacturacionForm } from "./FacturacionForm";
import { AyudaTermino } from "@/components/asistente/AyudaTermino";

/** Devuelve el banner correcto según PAC_MODE y FACTURAMA_URL. */
function getPacBanner(): { text: string; variant: "amber" | "green" | "slate" } {
  const mode = (process.env.PAC_MODE || "mock").toLowerCase().trim();
  const url = (process.env.FACTURAMA_URL || process.env.PAC_BASE_URL || "").toLowerCase();

  if (mode === "mock" || (mode !== "facturama" && mode !== "http")) {
    return {
      text: "Timbrado de demostración. Este CFDI NO fue enviado al SAT.",
      variant: "amber",
    };
  }
  if (url.includes("apisandbox")) {
    return {
      text: "PAC Facturama SANDBOX. Sin valor fiscal.",
      variant: "amber",
    };
  }
  if (url.includes("api.facturama.mx") || url.includes("facturama.mx")) {
    return {
      text: "PAC Facturama producción. Verifica el UUID en el SAT.",
      variant: "green",
    };
  }
  return {
    text: "PAC configurado. Verifica el UUID en el portal del SAT.",
    variant: "slate",
  };
}

export default async function FacturacionPage() {
  const sessionData = await getCurrentUserAndOrg();
  if (!sessionData?.activeOrg) return null;

  const { activeOrg } = sessionData;
  const banner = getPacBanner();

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
        <h1 className="text-2xl font-black text-slate-900 tracking-tight inline-flex items-center gap-2">
          Emisión de Facturas CFDI 4.0
          <AyudaTermino terminoId="cfdi" />
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Emisor activo: <strong className="font-mono text-emerald-800">{activeOrg.rfc}</strong> -{" "}
          {activeOrg.razonSocial}
        </p>
      </div>

      <FacturacionForm activeOrg={activeOrg} pacBanner={banner} />
    </div>
  );
}
