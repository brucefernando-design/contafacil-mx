"use client";

import { useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Eye, EyeOff, KeyRound, Loader2, Lock, ShieldAlert } from "lucide-react";

export function RestablecerPasswordContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token") || "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exito, setExito] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!token) {
      setError("Token de recuperación no encontrado en la URL.");
      return;
    }

    if (password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }

    if (!/\d/.test(password)) {
      setError("La contraseña debe contener al menos un número.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "No se pudo actualizar la contraseña.");
      }

      setExito(true);
      setTimeout(() => {
        router.push("/login?reset=success");
      }, 2000);
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
            Crear Nueva Contraseña
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Ingresa y confirma tu nueva contraseña de acceso.
          </p>
        </div>

        {/* Tarjeta */}
        <div className="bg-slate-800/90 border border-slate-700/80 backdrop-blur-xl py-8 px-6 shadow-2xl rounded-2xl sm:px-10">
          {!token ? (
            <div className="text-center space-y-4 py-2">
              <div className="w-12 h-12 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-400 flex items-center justify-center mx-auto">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-white">Enlace inválido</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                El enlace de recuperación no contiene un token válido o ha expirado.
              </p>
              <div className="pt-2">
                <Link
                  href="/olvide-password"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-400 hover:text-emerald-300 hover:underline"
                >
                  Solicitar un nuevo enlace
                </Link>
              </div>
            </div>
          ) : exito ? (
            <div className="text-center space-y-4 py-2">
              <div className="w-12 h-12 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-white">¡Contraseña Actualizada!</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Tu contraseña ha sido restablecida correctamente. Redirigiéndote al inicio de sesión...
              </p>
              <div className="pt-3">
                <Link
                  href="/login"
                  className="w-full inline-flex justify-center py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-colors"
                >
                  Iniciar Sesión Ahora
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>{error}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Nueva Contraseña
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Mínimo 8 caracteres y 1 número"
                    className="w-full pl-9 pr-10 py-2 bg-slate-900/80 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-200"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Confirmar Nueva Contraseña
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repite tu contraseña"
                    className="w-full pl-9 pr-3 py-2 bg-slate-900/80 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                  />
                </div>
              </div>

              <div className="p-3 bg-slate-900/50 rounded-xl border border-slate-700/50 text-[11px] text-slate-400 space-y-1">
                <div className="font-semibold text-slate-300">Requisitos de seguridad:</div>
                <div>• Mínimo 8 caracteres</div>
                <div>• Al menos un número (0-9)</div>
              </div>

              <button
                type="submit"
                disabled={loading || !password || !confirmPassword}
                className="w-full flex justify-center items-center gap-2 py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50 transition-colors cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Actualizando contraseña...</span>
                  </>
                ) : (
                  <>
                    <KeyRound className="w-4 h-4" />
                    <span>Guardar Nueva Contraseña</span>
                  </>
                )}
              </button>

              <div className="text-center pt-2">
                <Link
                  href="/login"
                  className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-slate-200"
                >
                  <ArrowLeft className="w-3 h-3" /> Cancelar y volver al inicio
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
