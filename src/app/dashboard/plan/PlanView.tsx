"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  ExternalLink,
  Flame,
  HelpCircle,
  Infinity as InfinityIcon,
  Layers,
  Loader2,
  PauseCircle,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Users,
  Zap,
} from "lucide-react";
import { PLANES_CONFIG, PAQUETES_TIMBRES, PlanType } from "@/lib/sat/subscription-engine";

interface PlanViewProps {
  user: {
    id: string;
    name: string;
    email: string;
  };
  subscription: {
    plan: PlanType;
    status: string;
    periodEnd?: string | null;
    timbresIncluidos: number;
    timbresUsados: number;
  };
  rfcsCount: number;
  rfcsList: Array<{
    id: string;
    rfc: string;
    razonSocial: string;
    regimenFiscal: string;
  }>;
}

export function PlanView({ user, subscription, rfcsCount, rfcsList }: PlanViewProps) {
  const router = useRouter();
  const [currentSub, setCurrentSub] = useState(subscription);
  const [loadingPlan, setLoadingPlan] = useState<PlanType | null>(null);
  const [loadingTimbre, setLoadingTimbre] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<{ texto: string; tipo: "success" | "error" } | null>(null);

  const handleComprarTimbres = async (packageId: string) => {
    setLoadingTimbre(packageId);
    setMensaje(null);

    try {
      const res = await fetch("/api/payments/create-preference", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packageId }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "No se pudo generar la orden de pago.");
      }

      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else {
        throw new Error("No se recibió la URL de checkout de MercadoPago.");
      }
    } catch (err: unknown) {
      setMensaje({
        texto: (err as Error).message,
        tipo: "error",
      });
      setLoadingTimbre(null);
    }
  };

  const planConfig = PLANES_CONFIG[currentSub.plan] || PLANES_CONFIG.FREE;
  const porcentajeTimbres = Math.min(
    100,
    Math.round((currentSub.timbresUsados / currentSub.timbresIncluidos) * 100)
  );
  const timbresRestantes = Math.max(0, currentSub.timbresIncluidos - currentSub.timbresUsados);
  const porcentajeRfcs = Math.min(100, Math.round((rfcsCount / planConfig.rfcLimit) * 100));

  // Checkout real con MercadoPago Sandbox
  const handleCheckoutMP = async (plan: PlanType) => {
    if (plan === "FREE") return;
    setLoadingPlan(plan);
    setMensaje(null);

    try {
      const res = await fetch("/api/payments/create-preference", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "No se pudo crear la preferencia de pago.");
      }

      // Redirigir al checkout de MercadoPago (sandbox)
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else {
        throw new Error("No se recibió URL de checkout.");
      }
    } catch (err: unknown) {
      setMensaje({
        texto: (err as Error).message,
        tipo: "error",
      });
      setLoadingPlan(null);
    }
  };

  // Activación demo directa (FREE → cualquier plan sin cobro, solo para tests internos)
  const handleActivarPlanDemo = async (plan: PlanType) => {
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

      setCurrentSub(data.subscription);
      setMensaje({
        texto: data.message || `¡Plan demo ${plan} activado con éxito!`,
        tipo: "success",
      });
      router.refresh();
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
    <div className="space-y-6">
      {/* Banner Superior */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
              <Sparkles className="w-3 h-3 text-emerald-600" /> Plan Activo: {planConfig.name}
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">
              ⚡ PAC Facturama Conectado (SAT Oficial)
            </span>
          </div>

          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Gestión de Plan y Consumo de Folios
          </h1>
          <p className="text-xs text-slate-500 mt-1 flex flex-wrap items-center gap-x-4 gap-y-1">
            <span>RFCs: <strong className="text-slate-800">{rfcsCount} / {planConfig.rfcLimit}</strong></span>
            <span>Folios: <strong className="text-slate-800">{timbresRestantes} disponibles</strong></span>
            <span>
              Vigencia:{" "}
              <strong className="text-slate-800">
                {subscription.periodEnd
                  ? new Date(subscription.periodEnd).toLocaleDateString("es-MX")
                  : "Sin expiración (FREE)"}
              </strong>
            </span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/precios"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs border border-slate-200 transition-colors"
          >
            <span>Ver tabla de precios</span>
            <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
          </Link>
        </div>
      </div>

      {currentSub.status === "PAUSED" && (
        <div className="p-5 rounded-2xl bg-amber-50 border-2 border-amber-300 text-amber-950 flex items-start gap-3 shadow-xs animate-in fade-in">
          <div className="p-2.5 rounded-xl bg-amber-500 text-white shrink-0 mt-0.5 shadow-xs">
            <PauseCircle className="w-5 h-5" />
          </div>
          <div className="space-y-1 text-xs">
            <p className="font-black text-amber-950 text-sm">
              🔒 Tu cuenta se encuentra actualmente en pausa
            </p>
            <p className="text-amber-900 leading-relaxed">
              Tu periodo de cortesía o prueba ha concluido. Todos tus comprobantes, catálogo de cuentas y pólizas contables están perfectamente resguardados. Selecciona cualquiera de nuestros planes a continuación para reactivar tu cuenta automáticamente al instante.
            </p>
          </div>
        </div>
      )}

      {mensaje && (
        <div
          className={`p-4 rounded-xl text-xs font-semibold flex items-center gap-2 animate-in fade-in ${
            mensaje.tipo === "success"
              ? "bg-emerald-50 border border-emerald-200 text-emerald-900"
              : "bg-rose-50 border border-rose-200 text-rose-900"
          }`}
        >
          {mensaje.tipo === "success" ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
          )}
          <span>{mensaje.texto}</span>
        </div>
      )}

      {/* Métricas de Consumo (2 Tarjetas) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Tarjeta 1: Folios EasyConta */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center">
                <Flame className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Folios Facturama (PAC SAT)</h3>
                <p className="text-[11px] text-slate-400">Descuento de 1 folio por emisión CFDI 4.0 oficial</p>
              </div>
            </div>
            <span className="text-xs font-mono font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg">
              {currentSub.timbresUsados} / {currentSub.timbresIncluidos}
            </span>
          </div>

          {/* Barra de progreso */}
          <div className="space-y-1.5">
            <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  porcentajeTimbres >= 100
                    ? "bg-rose-600"
                    : porcentajeTimbres >= 80
                    ? "bg-amber-500"
                    : "bg-emerald-600"
                }`}
                style={{ width: `${porcentajeTimbres}%` }}
              />
            </div>
            <div className="flex justify-between text-[11px] text-slate-500">
              <span>{porcentajeTimbres}% utilizado</span>
              <span className="font-semibold text-slate-700">
                {timbresRestantes} {timbresRestantes === 1 ? "timbre disponible" : "timbres disponibles"}
              </span>
            </div>
          </div>

          {timbresRestantes === 0 && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-between gap-2">
              <span>⚠️ Timbres agotados para este periodo.</span>
              <Link href="/precios" className="font-bold underline">
                Recargar
              </Link>
            </div>
          )}
        </div>

        {/* Tarjeta 2: Límite de RFCs */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-600 flex items-center justify-center">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Capacidad de RFCs (Empresas)</h3>
                <p className="text-[11px] text-slate-400">Contribuyentes registrados en tu cuenta</p>
              </div>
            </div>
            <span className="text-xs font-mono font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg">
              {rfcsCount} / {planConfig.rfcLimit}
            </span>
          </div>

          {/* Barra de progreso */}
          <div className="space-y-1.5">
            <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  porcentajeRfcs >= 100 ? "bg-amber-500" : "bg-indigo-600"
                }`}
                style={{ width: `${porcentajeRfcs}%` }}
              />
            </div>
            <div className="flex justify-between text-[11px] text-slate-500">
              <span>{porcentajeRfcs}% capacidad en uso</span>
              <span className="font-semibold text-slate-700">
                Límite de {planConfig.rfcLimit} RFCs en {planConfig.name}
              </span>
            </div>
          </div>

          {currentSub.plan === "FREE" && rfcsCount >= 1 && (
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-600">
              💡 Para registrar un segundo RFC, activa el plan <strong>PRO</strong> o <strong>DESPACHO</strong>.
            </div>
          )}
        </div>
      </div>

      {/* Planes con Checkout MercadoPago */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-500" />
              <span>Cambiar Plan</span>
            </h2>
            <p className="text-xs text-slate-500">
              Pago seguro y encriptado con MercadoPago. Actualización inmediata de tu cuenta.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
          {(["FREE", "PRO", "DESPACHO"] as PlanType[]).map((pKey) => {
            const plan = PLANES_CONFIG[pKey];
            const isCurrent = currentSub.plan === pKey;
            const isPaid = pKey === "PRO" || pKey === "DESPACHO";

            return (
              <div
                key={pKey}
                className={`p-4 rounded-xl border transition-all flex flex-col justify-between gap-3 ${
                  isCurrent
                    ? "border-emerald-500 bg-emerald-50/40 ring-1 ring-emerald-500/20"
                    : "border-slate-200 bg-slate-50/50 hover:bg-slate-100/60"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 text-xs">{plan.name}</span>
                    {isCurrent && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-600 text-white">
                        Actual
                      </span>
                    )}
                  </div>
                  <div className="text-lg font-black text-slate-900 mt-1">${plan.precioMensual} MXN</div>
                  <ul className="text-[11px] text-slate-600 space-y-1 mt-2">
                    <li>• {plan.rfcLimit} RFC{plan.rfcLimit > 1 ? "s" : ""} máximo</li>
                    <li>• {plan.timbresIncluidos} timbres CFDI 4.0 / mes</li>
                    <li>• {plan.usuarios} usuario{plan.usuarios > 1 ? "s" : ""}</li>
                  </ul>
                </div>

                {isPaid && !isCurrent ? (
                  // Checkout real de MercadoPago para PRO/DESPACHO
                  <button
                    type="button"
                    onClick={() => handleCheckoutMP(pKey)}
                    disabled={loadingPlan !== null}
                    className="w-full py-2 px-3 rounded-lg text-xs font-bold cursor-pointer transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                  >
                    {loadingPlan === pKey ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Creando pago...</span>
                      </>
                    ) : (
                      <>
                        <span>Pagar con MercadoPago 🔒</span>
                      </>
                    )}
                  </button>
                ) : !isCurrent && pKey === "FREE" ? (
                  // Volver a FREE
                  <button
                    type="button"
                    onClick={() => handleActivarPlanDemo(pKey)}
                    disabled={loadingPlan !== null}
                    className="w-full py-2 px-3 rounded-lg text-xs font-bold cursor-pointer transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed bg-slate-900 hover:bg-slate-800 text-white shadow-xs"
                  >
                    {loadingPlan === pKey ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Cambiando...</span>
                      </>
                    ) : (
                      <span>Activar FREE</span>
                    )}
                  </button>
                ) : (
                  // Plan actual
                  <button
                    type="button"
                    disabled
                    className="w-full py-2 px-3 rounded-lg text-xs font-bold bg-slate-200 text-slate-500 cursor-not-allowed"
                  >
                    Plan Actual ✓
                  </button>
                )}
              </div>
            );
          })}
        </div>

        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-[11px] text-emerald-800 flex items-start gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          <span>
            <strong className="text-emerald-900">Seguridad Fiscal y Respaldo Permanente:</strong> Todos tus comprobantes se emiten bajo el estándar Anexo 20 CFDI 4.0 del SAT y quedan almacenados con respaldo seguro en tu Bóveda XML.
          </span>
        </div>
      </div>

      {/* Recargar Paquetes de Folios Adicionales */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <InfinityIcon className="w-4 h-4 text-indigo-600" />
              <span>Folios EasyConta (se activan con PAC)</span>
            </h2>
            <p className="text-xs text-slate-500">
              Hoy descuentan el contador interno. El timbrado SAT se enciende al conectar el PAC.
            </p>
          </div>
          <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
            Acreditación Automática
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-1">
          {PAQUETES_TIMBRES.map((pkg) => {
            const isPopular = pkg.popular;
            return (
              <div
                key={pkg.id}
                className={`p-4 rounded-xl border flex flex-col justify-between gap-3 transition-all ${
                  isPopular
                    ? "border-indigo-500 bg-indigo-50/40 ring-1 ring-indigo-500/20 shadow-xs"
                    : "border-slate-200 bg-slate-50/50 hover:bg-slate-100/60"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 text-xs">{pkg.timbres} Folios</span>
                    {isPopular && (
                      <span className="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-indigo-600 text-white">
                        Popular
                      </span>
                    )}
                  </div>
                  <div className="text-lg font-black text-slate-900 mt-1">${pkg.precio} MXN</div>
                  <span className="text-[10px] text-emerald-600 font-bold block mt-0.5">
                    ${pkg.precioUnitario} MXN / folio
                  </span>
                  <p className="text-[11px] text-slate-500 mt-1.5 leading-snug">{pkg.descripcion}</p>
                </div>

                <button
                  type="button"
                  onClick={() => handleComprarTimbres(pkg.id)}
                  disabled={loadingTimbre !== null}
                  className={`w-full py-2 px-3 rounded-lg text-xs font-bold cursor-pointer transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed text-white shadow-xs ${
                    isPopular
                      ? "bg-indigo-600 hover:bg-indigo-700"
                      : "bg-slate-800 hover:bg-slate-700"
                  }`}
                >
                  {loadingTimbre === pkg.id ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Procesando...</span>
                    </>
                  ) : (
                    <>
                      <Zap className="w-3.5 h-3.5 text-amber-300" />
                      <span>Comprar Paquete</span>
                    </>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Lista de RFCs asociados */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
        <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <Layers className="w-4 h-4 text-emerald-600" />
          <span>RFCs Contribuyentes Registrados ({rfcsList.length})</span>
        </h2>

        <div className="divide-y divide-slate-100 border border-slate-100 rounded-xl overflow-hidden">
          {rfcsList.map((org) => (
            <div key={org.id} className="p-3.5 flex items-center justify-between hover:bg-slate-50 transition-colors">
              <div>
                <span className="font-mono font-bold text-xs text-slate-900">{org.rfc}</span>
                <p className="text-xs text-slate-600">{org.razonSocial}</p>
              </div>
              <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                Régimen {org.regimenFiscal}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
