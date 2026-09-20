"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { CheckCircle, XCircle, Clock, ArrowRight, Sparkles } from "lucide-react";

const PLAN_DETALLES: Record<string, { nombre: string; emoji: string; color: string }> = {
  PRO: { nombre: "PRO", emoji: "⭐", color: "emerald" },
  DESPACHO: { nombre: "Despacho", emoji: "🏢", color: "violet" },
};

export function PagoExitosoContent() {
  const params = useSearchParams();
  const status = params.get("status") || "approved";
  const plan = (params.get("plan") || "PRO").toUpperCase();
  const paymentId = params.get("payment_id");

  const planInfo = PLAN_DETALLES[plan] || PLAN_DETALLES.PRO;

  if (status === "approved") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95">
          {/* Header */}
          <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 p-8 text-center">
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-9 h-9 text-white" />
            </div>
            <h1 className="text-2xl font-black text-white">
              ¡Pago Aprobado! {planInfo.emoji}
            </h1>
            <p className="text-emerald-100 text-sm mt-2">
              Plan <strong>{planInfo.nombre}</strong> activado en EasyConta MX
            </p>
          </div>

          {/* Body */}
          <div className="p-8 space-y-5">
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
              <p className="text-emerald-800 text-sm font-semibold flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                Tu plan {planInfo.nombre} ya está activo
              </p>
              {paymentId && (
                <p className="text-emerald-600 text-xs mt-1 font-mono">
                  Payment ID: {paymentId}
                </p>
              )}
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <p className="text-amber-900 text-xs font-semibold">⚠️ Modo Sandbox (Prueba)</p>
              <p className="text-amber-800 text-xs mt-1 leading-relaxed">
                Este pago fue procesado en el <strong>ambiente de prueba</strong> de MercadoPago.
                No se realizó ningún cargo real. El timbrado sigue siendo de demostración.
              </p>
            </div>

            <Link
              href="/dashboard/plan"
              className="flex items-center justify-between w-full bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-3.5 rounded-xl font-semibold text-sm transition-colors"
            >
              Ver mi Plan y Timbres
              <ArrowRight className="w-4 h-4" />
            </Link>

            <Link
              href="/dashboard"
              className="flex items-center justify-center w-full text-slate-500 hover:text-slate-700 text-sm transition-colors"
            >
              Ir al Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (status === "pending") {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-lg w-full p-8 text-center animate-in fade-in zoom-in-95">
          <Clock className="w-16 h-16 text-amber-500 mx-auto mb-4" />
          <h1 className="text-2xl font-black text-slate-900">Pago Pendiente</h1>
          <p className="text-slate-500 text-sm mt-3 leading-relaxed">
            Tu pago está siendo procesado. Te notificaremos por correo cuando se apruebe y
            tu plan se active automáticamente.
          </p>
          <Link
            href="/dashboard/plan"
            className="mt-6 inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white px-5 py-3 rounded-xl font-semibold text-sm transition-colors"
          >
            Ver mi Plan <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    );
  }

  // failure / default
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-lg w-full p-8 text-center animate-in fade-in zoom-in-95">
        <XCircle className="w-16 h-16 text-rose-500 mx-auto mb-4" />
        <h1 className="text-2xl font-black text-slate-900">Pago no completado</h1>
        <p className="text-slate-500 text-sm mt-3 leading-relaxed">
          El pago no se pudo procesar. Puedes volver a intentarlo o contactarnos si el problema persiste.
        </p>
        <div className="mt-6 flex gap-3 justify-center">
          <Link
            href="/dashboard/plan"
            className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-3 rounded-xl font-semibold text-sm transition-colors"
          >
            Reintentar <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 border border-slate-300 text-slate-600 hover:bg-slate-50 px-5 py-3 rounded-xl font-semibold text-sm transition-colors"
          >
            Ir al Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
