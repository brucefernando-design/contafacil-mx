"use client";

import React, { useTransition } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Calendar, ChevronDown, Sparkles } from "lucide-react";

export const MESES_SAT = [
  { numero: 1, nombre: "Enero" },
  { numero: 2, nombre: "Febrero" },
  { numero: 3, nombre: "Marzo" },
  { numero: 4, nombre: "Abril" },
  { numero: 5, nombre: "Mayo" },
  { numero: 6, nombre: "Junio" },
  { numero: 7, nombre: "Julio" },
  { numero: 8, nombre: "Agosto" },
  { numero: 9, nombre: "Septiembre" },
  { numero: 10, nombre: "Octubre" },
  { numero: 11, nombre: "Noviembre" },
  { numero: 12, nombre: "Diciembre" },
];

export const ANIOS_DISPONIBLES = [2025, 2026, 2027];

interface PeriodSelectorProps {
  currentYear: number;
  currentMonth: number;
  className?: string;
  showDemoNotice?: boolean;
}

export function PeriodSelector({
  currentYear,
  currentMonth,
  className = "",
  showDemoNotice = true,
}: PeriodSelectorProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const handlePeriodChange = (newYear: number, newMonth: number) => {
    const params = new URLSearchParams(searchParams?.toString() || "");
    params.set("year", String(newYear));
    params.set("month", String(newMonth));

    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  };

  const handleYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    handlePeriodChange(Number(e.target.value), currentMonth);
  };

  const handleMonthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    handlePeriodChange(currentYear, Number(e.target.value));
  };

  const handleGoToDemo = () => {
    handlePeriodChange(2026, 9);
  };

  const esPeriodoDemo = currentYear === 2026 && currentMonth === 9;
  const nombreMesActual = MESES_SAT.find((m) => m.numero === currentMonth)?.nombre || "Mes";

  return (
    <div
      className={`inline-flex flex-wrap items-center gap-2 p-1.5 bg-slate-100/90 rounded-xl border border-slate-200 text-xs ${className} ${
        isPending ? "opacity-70" : ""
      }`}
    >
      <div className="flex items-center gap-1.5 px-2 text-slate-500 font-semibold">
        <Calendar className="w-3.5 h-3.5 text-emerald-600" />
        <span className="hidden sm:inline">Periodo:</span>
      </div>

      {/* Selector de Mes */}
      <div className="relative">
        <select
          value={currentMonth}
          onChange={handleMonthChange}
          aria-label="Seleccionar mes fiscal"
          className="appearance-none pl-3 pr-7 py-1.5 bg-white border border-slate-200 hover:border-slate-300 rounded-lg font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer text-xs shadow-2xs"
        >
          {MESES_SAT.map((mes) => (
            <option key={mes.numero} value={mes.numero}>
              {mes.nombre}
            </option>
          ))}
        </select>
        <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
      </div>

      {/* Selector de Año */}
      <div className="relative">
        <select
          value={currentYear}
          onChange={handleYearChange}
          aria-label="Seleccionar año fiscal"
          className="appearance-none pl-3 pr-7 py-1.5 bg-white border border-slate-200 hover:border-slate-300 rounded-lg font-bold font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer text-xs shadow-2xs"
        >
          {ANIOS_DISPONIBLES.map((anio) => (
            <option key={anio} value={anio}>
              {anio}
            </option>
          ))}
        </select>
        <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
      </div>

      {/* Botón rápido / badge periodo demo */}
      {!esPeriodoDemo && showDemoNotice ? (
        <button
          type="button"
          onClick={handleGoToDemo}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-800 font-bold text-[11px] transition-colors cursor-pointer"
          title="Ver datos demo cargados en Septiembre 2026"
        >
          <Sparkles className="w-3 h-3 text-emerald-600" />
          <span>Ver Demo (Sep 2026)</span>
        </button>
      ) : (
        <span className="text-[10px] px-2 py-0.5 rounded-md font-mono bg-emerald-50 text-emerald-700 font-bold border border-emerald-200 hidden md:inline">
          Septiembre 2026 Activo
        </span>
      )}
    </div>
  );
}
