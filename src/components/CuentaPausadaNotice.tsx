"use client";

import Link from "next/link";
import { ShieldCheck, PauseCircle, Sparkles, MessageCircle, ArrowRight, Lock } from "lucide-react";

interface CuentaPausadaNoticeProps {
  userName: string;
  userEmail: string;
}

export function CuentaPausadaNotice({ userName, userEmail }: CuentaPausadaNoticeProps) {
  const whatsappUrl = `https://wa.me/5215512345678?text=${encodeURIComponent(
    `Hola, mi cuenta en EasyConta MX (${userEmail}) está en pausa y me gustaría reactivarla o adquirir un plan.`
  )}`;

  return (
    <div className="max-w-3xl mx-auto my-6 p-6 sm:p-10 bg-white rounded-3xl border border-amber-200 shadow-xl text-center space-y-6 animate-in fade-in-50 zoom-in-95">
      {/* Icon Badge */}
      <div className="relative w-20 h-20 mx-auto">
        <div className="absolute inset-0 rounded-full bg-amber-400/20 animate-ping"></div>
        <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 text-white flex items-center justify-center shadow-lg shadow-orange-500/30">
          <PauseCircle className="w-10 h-10" />
        </div>
      </div>

      {/* Header */}
      <div className="space-y-2">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-amber-100 text-amber-900 border border-amber-300">
          <Lock className="w-3.5 h-3.5" />
          Cuenta en Pausa
        </span>
        <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
          Tu periodo de cortesía ha concluido
        </h2>
        <p className="text-sm text-slate-600 max-w-lg mx-auto leading-relaxed">
          Hola <strong className="text-slate-900">{userName}</strong>, tu acceso de prueba o cortesía temporal ha sido pausado.
        </p>
      </div>

      {/* Data Protection Guarantee */}
      <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-950 flex items-start sm:items-center gap-3 text-left max-w-xl mx-auto shadow-xs">
        <div className="p-2 rounded-xl bg-emerald-600 text-white shrink-0">
          <ShieldCheck className="w-5 h-5" />
        </div>
        <div className="text-xs leading-relaxed">
          <p className="font-bold text-emerald-900">Tus datos y comprobantes fiscales están 100% seguros</p>
          <p className="text-emerald-700 mt-0.5">
            Ninguna factura, XML ni póliza ha sido borrada. Todo tu historial fiscal permanece íntegro y protegido.
          </p>
        </div>
      </div>

      {/* Plans preview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xl mx-auto text-left">
        <div className="p-4 rounded-2xl border-2 border-emerald-500 bg-emerald-50/40 relative">
          <span className="absolute -top-2.5 right-4 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-600 text-white">
            RECOMENDADO
          </span>
          <p className="font-black text-slate-900 text-sm">Plan PRO</p>
          <p className="text-2xl font-black text-emerald-700 mt-1">
            $499 <span className="text-xs text-slate-500 font-normal">MXN / mes</span>
          </p>
          <ul className="mt-2 text-xs text-slate-600 space-y-1">
            <li>✓ Hasta 3 RFCs</li>
            <li>✓ Sincronización oficial con el SAT</li>
            <li>✓ Pólizas contables automáticas</li>
            <li>✓ 50 folios al mes</li>
          </ul>
        </div>

        <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50">
          <p className="font-black text-slate-900 text-sm">Plan DESPACHO</p>
          <p className="text-2xl font-black text-slate-800 mt-1">
            $1,499 <span className="text-xs text-slate-500 font-normal">MXN / mes</span>
          </p>
          <ul className="mt-2 text-xs text-slate-600 space-y-1">
            <li>✓ Hasta 25 RFCs</li>
            <li>✓ Portal para contadores externos</li>
            <li>✓ Descarga SAT multi-cliente</li>
            <li>✓ 200 folios al mes</li>
          </ul>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
        <Link
          href="/dashboard/plan"
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-sm shadow-lg shadow-emerald-700/20 hover:shadow-xl transition-all cursor-pointer"
        >
          <Sparkles className="w-4 h-4 text-emerald-200" />
          <span>Activar Suscripción con MercadoPago</span>
          <ArrowRight className="w-4 h-4" />
        </Link>

        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm border border-slate-200 transition-colors cursor-pointer"
        >
          <MessageCircle className="w-4 h-4 text-emerald-600" />
          <span>Hablar con el Administrador</span>
        </a>
      </div>

      <p className="text-[11px] text-slate-400">
        Al procesar tu pago por MercadoPago, tu cuenta se reactivará automáticamente en cuestión de segundos.
      </p>
    </div>
  );
}
