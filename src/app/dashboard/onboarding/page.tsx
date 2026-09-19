import { getCurrentUserAndOrg } from "@/lib/session";
import { OnboardingWizard } from "./OnboardingWizard";

export default async function OnboardingPage() {
  const sessionData = await getCurrentUserAndOrg();

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs text-center">
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">
          Alta de Nuevo Contribuyente SAT 2026
        </h1>
        <p className="text-xs text-slate-500 mt-1 max-w-lg mx-auto">
          Registra una nueva Persona Física (PF) o Persona Moral (PM) con su régimen fiscal, CSD mock y catálogo contable automático
        </p>
      </div>

      <OnboardingWizard />
    </div>
  );
}
