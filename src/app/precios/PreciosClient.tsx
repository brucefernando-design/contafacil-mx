"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Loader2,
  Sparkles,
  Zap,
} from "lucide-react";
import { PLANES_CONFIG, PlanType } from "@/lib/sat/subscription-engine";

interface PreciosClientProps {
  isAuthenticated: boolean;
}

export function PreciosClient({ isAuthenticated }: PreciosClientProps) {
  const router = useRouter();
  const [loadingPlan, setLoadingPlan] = useState<PlanType | null>(null);
  const [mensaje, setMensaje] = useState<{ texto: string; tipo: "success" | "error" } | null>(null);

  const handleActivarPlanDemo = async (plan: PlanType) => {
    if (!isAuthenticated) {
      router.push(`/registro?plan=${plan}`);
      return;
    }

    setLoadingPlan(plan);
    setMensaje(null);

    try {
      const res = await fetch("/api/plan/upgrade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "No se pudo actualizar el plan.");
      }

      setMensaje({
        texto: data.message || `¡Plan ${plan} activado correctamente!`,
        tipo: "success",
      });

      setTimeout(() => {
        router.push("/dashboard/plan");
        router.refresh();
      }, 1200);
    } catch (err: unknown) {
      setMensaje({
        texto: (err as Error).message,
        tipo: "error",
      });
    } finally {
      setLoadingPlan(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Glow de fondo */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[650px] h-[350px] bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto relative z-10 space-y-10">
        {/* Barra superior */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center text-white shadow-md shadow-emerald-500/20 font-extrabold text-sm">
              EC
            </div>
            <span className="font-black text-lg text-white tracking-tight">
              EasyConta<span className="text-emerald-400">.MX</span>
            </span>
          </Link>

          <div className="flex items-center gap-3 text-xs">
            {isAuthenticated ? (
              <Link
                href="/dashboard"
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-medium transition-colors"
              >
                ← Volver al Dashboard
              </Link>
            ) : (
              <>
                <Link href="/login" className="text-slate-300 hover:text-white font-medium">
                  Iniciar sesión
                </Link>
                <Link
                  href="/registro"
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold transition-colors"
                >
                  Registrarse gratis
                </Link>
              </>
            )}
          </div>
        </div>

        {/* Encabezado */}
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-950/80 text-emerald-300 border border-emerald-800/80">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" /> Planes y Suscripciones SAT 2026
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
            Elige el plan ideal para tu contabilidad
          </h1>
          <p className="text-sm text-slate-400 leading-relaxed">
            Planes flexibles diseñados para Personas Físicas en RESICO, pymes en Actividad Empresarial y despachos contables con carteras multi-cliente.
          </p>
        </div>

        {/* AVISO IMPORTANTE SAT: TIMBRADO REAL NO INCLUIDO */}
        <div className="max-w-4xl mx-auto p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs sm:text-sm flex items-start gap-3 shadow-md">
          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <strong className="block text-amber-300 font-bold uppercase tracking-wider text-xs">
              Aviso de Demostración y Simulación Fiscal:
            </strong>
            <p className="leading-relaxed text-slate-300 text-xs">
              <strong>El timbrado SAT real no está incluido.</strong> EasyConta MX opera actualmente como plataforma de simulación con PAC Mock conforme al Anexo 20 CFDI 4.0 para pruebas fiscales, motor de cálculo provisional y balanzas Anexo 24. Todos los timbres y sellos emitidos son de demostración y no tienen validez fiscal oficial ante el SAT.
            </p>
          </div>
        </div>

        {mensaje && (
          <div
            className={`max-w-md mx-auto p-3.5 rounded-xl text-xs font-semibold text-center animate-in fade-in ${
              mensaje.tipo === "success"
                ? "bg-emerald-500/15 border border-emerald-500/30 text-emerald-300"
                : "bg-rose-500/15 border border-rose-500/30 text-rose-300"
            }`}
          >
            {mensaje.texto}
          </div>
        )}

        {/* Tarjetas de Planes */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {(["FREE", "PRO", "DESPACHO"] as PlanType[]).map((pKey) => {
            const plan = PLANES_CONFIG[pKey];
            const isPopular = pKey === "PRO";
            const isDespacho = pKey === "DESPACHO";

            return (
              <div
                key={pKey}
                className={`relative flex flex-col justify-between rounded-2xl p-6 sm:p-8 backdrop-blur-xl border transition-all ${
                  isPopular
                    ? "bg-gradient-to-b from-slate-800 to-slate-850 border-emerald-500/60 shadow-xl shadow-emerald-950/40 ring-2 ring-emerald-500/20"
                    : isDespacho
                    ? "bg-slate-800/80 border-indigo-500/40 shadow-lg"
                    : "bg-slate-800/60 border-slate-700/80 shadow-md"
                }`}
              >
                {isPopular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-emerald-500 text-slate-950 shadow-sm">
                    Recomendado
                  </div>
                )}

                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-bold text-white tracking-tight">{plan.name}</h3>
                    <p className="text-xs text-slate-400 mt-1 min-h-[32px]">{plan.descripcion}</p>
                  </div>

                  <div className="border-t border-b border-slate-700/80 py-4">
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl sm:text-4xl font-black text-white">
                        ${plan.precioMensual}
                      </span>
                      <span className="text-xs text-slate-400 font-medium">MXN / mes</span>
                    </div>
                    <span className="text-[11px] text-emerald-400 font-semibold block mt-1">
                      Beta Demo (Sin cobro en esta fase)
                    </span>
                  </div>

                  {/* Lista de características */}
                  <ul className="space-y-2.5 text-xs text-slate-300">
                    {plan.features.map((feat, idx) => (
                      <li key={idx} className="flex items-start gap-2.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="pt-6 mt-6 border-t border-slate-700/60">
                  <button
                    type="button"
                    onClick={() => handleActivarPlanDemo(pKey)}
                    disabled={loadingPlan !== null}
                    className={`w-full py-2.5 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-all shadow-md disabled:opacity-50 ${
                      isPopular
                        ? "bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-700/30"
                        : isDespacho
                        ? "bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-700/30"
                        : "bg-slate-700 hover:bg-slate-600 text-white"
                    }`}
                  >
                    {loadingPlan === pKey ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Activando...</span>
                      </>
                    ) : (
                      <>
                        <Zap className="w-4 h-4" />
                        <span>Activar plan demo</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-slate-500 pt-8 border-t border-slate-800">
          EasyConta MX © 2026. Plataforma de contabilidad electrónica y cálculo fiscal en ambiente de simulación.
        </div>
      </div>
    </div>
  );
}
