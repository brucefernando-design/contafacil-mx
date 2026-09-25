import { getCurrentUserAndOrg } from "@/lib/session";
import { NominaDashboard } from "./NominaDashboard";
import { redirect } from "next/navigation";

export const metadata = {
  title: "Nómina CFDI 4.0 | EasyConta MX",
  description: "Cálculo y timbrado de recibos de nómina CFDI 4.0 con complemento de nómina 1.2 SAT",
};

export default async function NominaPage() {
  const sessionData = await getCurrentUserAndOrg();
  if (!sessionData?.user || !sessionData.activeOrg) {
    redirect("/login");
  }

  const { activeOrg } = sessionData;

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Módulo de Nómina CFDI 4.0
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
              SAT 1.2
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Empresa patronal activa:{" "}
            <strong className="font-mono text-emerald-700">{activeOrg.rfc}</strong> -{" "}
            {activeOrg.razonSocial}
          </p>
        </div>
      </div>

      <NominaDashboard activeOrg={activeOrg} />
    </div>
  );
}
