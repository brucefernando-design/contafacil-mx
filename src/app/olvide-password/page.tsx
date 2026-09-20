"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, KeyRound, Loader2, Mail, ShieldAlert } from "lucide-react";

export default function OlvidePasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [enviado, setEnviado] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "No se pudo procesar la solicitud.");
      }

      setEnviado(true);
    } catch (err: unknown) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden font-sans">
      {/* Glow de fondo */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10 px-4">
        {/* Logo */}
        <div className="text-center mb-6">
          <Link href="/" className="inline-flex items-center gap-2 mb-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20 font-black text-base">
              EC
            </div>
            <span className="font-black text-2xl text-white tracking-tight">
              EasyConta<span className="text-emerald-400">.MX</span>
            </span>
          </Link>
          <h2 className="text-xl font-bold text-white tracking-tight">
            Recuperar Contraseña
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Ingresa tu correo registrado para enviarte un enlace de acceso seguro.
          </p>
        </div>

        {/* Tarjeta */}
        <div className="bg-slate-800/90 border border-slate-700/80 backdrop-blur-xl py-8 px-6 shadow-2xl rounded-2xl sm:px-10">
          {error && (
            <div className="mb-5 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {enviado ? (
            <div className="text-center space-y-4 py-2">
              <div className="w-12 h-12 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-white">Revisa tu bandeja de entrada</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Si <strong>{email}</strong> está registrado en EasyConta MX, hemos enviado un enlace para restablecer tu contraseña.
              </p>
              <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-700/60 text-[11px] text-slate-400">
                El enlace tiene una vigencia de <strong>1 hora</strong>. Si no lo ves en tu bandeja principal, revisa la carpeta de spam o correo no deseado.
              </div>
              <div className="pt-3">
                <Link
                  href="/login"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-400 hover:text-emerald-300 hover:underline"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Volver a Iniciar Sesión
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
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
                    placeholder="ejemplo@empresa.mx"
                    className="w-full pl-9 pr-3 py-2 bg-slate-900/80 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || !email}
                className="w-full flex justify-center items-center gap-2 py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50 transition-colors cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Enviando enlace...</span>
                  </>
                ) : (
                  <>
                    <KeyRound className="w-4 h-4" />
                    <span>Enviar enlace de recuperación</span>
                  </>
                )}
              </button>

              <div className="text-center pt-2">
                <Link
                  href="/login"
                  className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-slate-200"
                >
                  <ArrowLeft className="w-3 h-3" /> Regresar al inicio de sesión
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
