"use client";

import { useState } from "react";
import Link from "next/link";
import { Calculator, ArrowRight, DollarSign, Sparkles, TrendingDown, CheckCircle2 } from "lucide-react";

export function CalculadoraResico() {
  const [ingresoMensual, setIngresoMensual] = useState<number>(35000);

  // Cálculo RESICO según Art. 113-E LISR 2026
  const getTasaResico = (ingreso: number) => {
    if (ingreso <= 25000) return 0.01;
    if (ingreso <= 50000) return 0.011;
    if (ingreso <= 83333.33) return 0.015;
    if (ingreso <= 208333.33) return 0.02;
    return 0.025;
  };

  // Estimación promedio de ISR en Actividad Empresarial (Art. 96 LISR)
  const getIsrActividadEmpresarial = (ingreso: number) => {
    if (ingreso <= 10000) return ingreso * 0.06;
    if (ingreso <= 25000) return ingreso * 0.12;
    if (ingreso <= 50000) return ingreso * 0.18;
    if (ingreso <= 100000) return ingreso * 0.23;
    return ingreso * 0.28;
  };

  const tasaResico = getTasaResico(ingresoMensual);
  const isrResico = Math.round(ingresoMensual * tasaResico);
  const isrActividad = Math.round(getIsrActividadEmpresarial(ingresoMensual));
  const ahorroMensual = Math.max(0, isrActividad - isrResico);
  const ahorroAnual = ahorroMensual * 12;

  return (
    <div className="w-full max-w-4xl mx-auto my-12">
      <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-6 sm:p-10 shadow-2xl backdrop-blur-xl relative">
        <div className="text-center max-w-2xl mx-auto space-y-2 mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-950/80 border border-emerald-600/50 text-emerald-400 text-xs font-bold">
            <Calculator className="w-3.5 h-3.5" />
            <span>Simulador Interactivo SAT 2026</span>
          </div>
          <h3 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            ¿Cuánto pagarías de ISR en RESICO vs Régimen Tradicional?
          </h3>
          <p className="text-xs sm:text-sm text-slate-400">
            Mueve la barra para simular tus ingresos mensuales brutos y conoce tu ahorro fiscal real en México.
          </p>
        </div>

        {/* Slider de Ingresos */}
        <div className="max-w-xl mx-auto bg-slate-950/80 p-6 rounded-2xl border border-slate-800/80 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Tus Ingresos Mensuales Cobrados:
            </span>
            <span className="text-2xl font-black text-white font-mono">
              ${ingresoMensual.toLocaleString("es-MX")} MXN
            </span>
          </div>

          <input
            type="range"
            min="5000"
            max="250000"
            step="5000"
            value={ingresoMensual}
            onChange={(e) => setIngresoMensual(Number(e.target.value))}
            className="w-full h-2.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
          />

          <div className="flex justify-between text-[11px] text-slate-500 font-mono">
            <span>$5,000</span>
            <span>$100,000</span>
            <span>$250,000</span>
          </div>
        </div>

        {/* Comparativa Visual de Resultados */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
          {/* Régimen Tradicional */}
          <div className="p-6 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase">
                Actividad Empresarial / Honorarios
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-semibold">
                Tarifa Art. 96
              </span>
            </div>
            <div className="text-3xl font-black text-slate-200">
              ${isrActividad.toLocaleString("es-MX")} <span className="text-xs text-slate-400 font-normal">/ mes</span>
            </div>
            <p className="text-xs text-slate-400">
              Sujeto a deducciones estrictas con comprobante, retención y tarifas progresivas de hasta el 35%.
            </p>
          </div>

          {/* RESICO con EasyConta */}
          <div className="p-6 rounded-2xl bg-gradient-to-br from-emerald-950/60 to-slate-900 border border-emerald-500/40 space-y-3 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-300 uppercase flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" /> RESICO PF (Régimen Simplificado)
              </span>
              <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-600 font-bold">
                Tasa {(tasaResico * 100).toFixed(2)}%
              </span>
            </div>
            <div className="text-3xl font-black text-emerald-400">
              ${isrResico.toLocaleString("es-MX")} <span className="text-xs text-emerald-200/70 font-normal">/ mes</span>
            </div>
            <p className="text-xs text-emerald-200/80">
              Tasa fija mensual directa sobre ingresos cobrados. Fácil, legal y automatizado en EasyConta MX.
            </p>
          </div>
        </div>

        {/* Resumen del Ahorro & CTA */}
        <div className="mt-6 p-6 rounded-2xl bg-gradient-to-r from-emerald-600/20 via-teal-600/10 to-transparent border border-emerald-500/30 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="space-y-1 text-center sm:text-left">
            <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center justify-center sm:justify-start gap-1.5">
              <TrendingDown className="w-4 h-4" /> Ahorro Estimado con RESICO:
            </span>
            <div className="text-2xl sm:text-3xl font-black text-white">
              ${ahorroMensual.toLocaleString("es-MX")} MXN al mes
            </div>
            <span className="text-xs text-slate-300">
              Hasta <strong className="text-emerald-300">${ahorroAnual.toLocaleString("es-MX")} MXN al año</strong> que conservas en tu negocio.
            </span>
          </div>

          <Link
            href="/registro"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-sm shadow-xl shadow-emerald-500/20 hover:scale-105 transition-all shrink-0 cursor-pointer"
          >
            <span>Crear cuenta y calcular mis impuestos</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
