import { getCurrentUserAndOrg } from "@/lib/session";
import { FacturacionForm } from "./FacturacionForm";
import { AyudaTermino } from "@/components/asistente/AyudaTermino";

export default async function FacturacionPage() {
  const sessionData = await getCurrentUserAndOrg();
  if (!sessionData?.activeOrg) return null;

  const { activeOrg } = sessionData;

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
        <h1 className="text-2xl font-black text-slate-900 tracking-tight inline-flex items-center gap-2">
          Emisión de Facturas CFDI 4.0
          <AyudaTermino terminoId="cfdi" />
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Emisor activo: <strong className="font-mono text-emerald-800">{activeOrg.rfc}</strong> - {activeOrg.razonSocial} • Timbrado oficial certificado con PAC EasyConta MX Mock
        </p>
      </div>

      <FacturacionForm activeOrg={activeOrg} />
    </div>
  );
}
