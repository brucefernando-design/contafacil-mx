"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Building2, CheckCircle2, KeyRound, Lock, Mail, ShieldAlert, Sparkles, UserCheck } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!acceptedTerms) {
      setError("Debes aceptar los Términos de Servicio y el Aviso de Privacidad para ingresar.");
      return;
    }
    setError(null);
    setLoading(true);

    try {
      const res = await signIn("credentials", {
        redirect: false,
        email,
        password,
      });

      if (res?.error) {
        setError("Credenciales inválidas. Verifica tu correo y contraseña.");
      } else {
        router.push("/dashboard");
        router.refresh();
      }
    } catch {
      setError("Error de conexión con el servidor de autenticación.");
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = (demoEmail: string, demoPass: string) => {
    if (!acceptedTerms) {
      setError("Debes aceptar los Términos de Servicio y el Aviso de Privacidad para ingresar (incluyendo cuentas demo).");
      return;
    }
    setEmail(demoEmail);
    setPassword(demoPass);
    setError(null);
    setLoading(true);

    signIn("credentials", {
      redirect: false,
      email: demoEmail,
      password: demoPass,
    }).then((res) => {
      if (res?.error) {
        setError("Error al iniciar con credenciales demo.");
        setLoading(false);
      } else {
        router.push("/dashboard");
        router.refresh();
      }
    });
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10 text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white shadow-xl shadow-emerald-500/20 mb-4">
          <span className="font-extrabold text-2xl tracking-tight">EC</span>
        </div>
        <h2 className="text-3xl font-extrabold text-white tracking-tight">
          EasyConta<span className="text-emerald-400">.MX</span>
        </h2>
        <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-950/80 text-emerald-300 border border-emerald-800/80">
          <Sparkles className="w-3.5 h-3.5 text-emerald-400" /> Sistema Contable SAT México 2026
        </div>
        <p className="mt-2 text-sm text-slate-400">
          CFDI 4.0, Motor Fiscal RESICO/AE/Arrendamiento/PM, Balanza y Bóveda XML
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="bg-slate-800/90 backdrop-blur-xl py-8 px-4 shadow-2xl sm:rounded-2xl sm:px-10 border border-slate-700/80">
          <form className="space-y-4" onSubmit={handleLogin}>
            {error && (
              <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Correo Electrónico
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ejemplo@easyconta.mx"
                  className="w-full pl-9 pr-3 py-2 bg-slate-900/80 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Contraseña
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3 py-2 bg-slate-900/80 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                />
              </div>
            </div>

            <div className="flex items-start gap-2 pt-1 pb-1">
              <input
                type="checkbox"
                id="terms"
                required
                checked={acceptedTerms}
                onChange={(e) => setAcceptedTerms(e.target.checked)}
                className="mt-0.5 rounded border-slate-700 bg-slate-900 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
              />
              <label htmlFor="terms" className="text-[11px] text-slate-400 leading-tight cursor-pointer">
                Acepto los{" "}
                <Link href="/terminos" target="_blank" className="text-emerald-400 hover:underline font-semibold">
                  Términos de Servicio
                </Link>{" "}
                y el{" "}
                <Link href="/privacidad" target="_blank" className="text-emerald-400 hover:underline font-semibold">
                  Aviso de Privacidad
                </Link>{" "}
                (Borrador México).
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50 transition-colors"
            >
              {loading ? "Iniciando sesión..." : "Acceder a EasyConta MX"}
            </button>
          </form>

          {/* Botones de Acceso Rápido Demo (1 Clic) */}
          <div className="mt-6 pt-6 border-t border-slate-700/80">
            <span className="block text-xs font-semibold text-slate-400 uppercase tracking-wider text-center mb-3">
              Acceso Rápido con Cuentas Demo
            </span>

            <div className="space-y-2.5">
              <button
                type="button"
                onClick={() => handleQuickLogin("ana@easyconta.mx", "Demo1234!")}
                disabled={loading}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-700/40 hover:bg-slate-700/70 border border-slate-600/60 transition-all text-left group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 flex items-center justify-center">
                    <UserCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white group-hover:text-emerald-300 transition-colors">
                      Ana Sofía Morales (Persona Física)
                    </div>
                    <div className="text-[11px] text-slate-400">
                      ana@easyconta.mx • RESICO PF y Act. Empresarial
                    </div>
                  </div>
                </div>
                <span className="text-[11px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-mono font-medium">
                  Entrar →
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin("despacho@easyconta.mx", "Demo1234!")}
                disabled={loading}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-indigo-950/40 hover:bg-indigo-900/50 border border-indigo-700/40 transition-all text-left group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-500/30 text-indigo-400 flex items-center justify-center">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white group-hover:text-indigo-300 transition-colors">
                      Despacho Contable García & Asoc.
                    </div>
                    <div className="text-[11px] text-slate-400">
                      despacho@easyconta.mx • Modo Multi-RFC y Clientes PM/PF
                    </div>
                  </div>
                </div>
                <span className="text-[11px] px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-300 font-mono font-medium">
                  Entrar →
                </span>
              </button>
            </div>
          </div>
        </div>

        <div className="text-center mt-6 text-xs text-slate-500">
          EasyConta MX © 2026. Conexión segura con esquema SAT CFDI 4.0
        </div>
      </div>
    </div>
  );
}
