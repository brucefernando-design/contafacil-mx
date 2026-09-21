import Link from "next/link";
import { auth } from "@/auth";
import {
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  Calculator,
  Receipt,
  FolderArchive,
  ArrowRight,
  Zap,
  Building2,
  UserCheck,
  FileSpreadsheet,
  Lock,
  Clock,
  HelpCircle,
} from "lucide-react";
import { AuditorExpressHero } from "@/components/marketing/AuditorExpressHero";
import { CalculadoraResico } from "@/components/marketing/CalculadoraResico";
import { WhatsAppButton } from "@/components/marketing/WhatsAppButton";

export default async function HomePage() {
  const session = await auth();
  const isLoggedIn = !!session?.user;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-emerald-500 selection:text-white flex flex-col justify-between relative overflow-hidden">
      {/* Glows ambientales de fondo */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[500px] bg-gradient-to-b from-emerald-500/15 via-teal-500/5 to-transparent blur-3xl pointer-events-none" />
      <div className="absolute top-96 left-1/4 w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* 1. Barra Superior de Anuncio de Valor */}
      <aside aria-label="Novedades SAT 2026" className="bg-gradient-to-r from-emerald-950 via-teal-950 to-slate-950 border-b border-emerald-600/30 px-4 py-2 text-center text-xs font-semibold text-emerald-300 flex items-center justify-center gap-2 relative z-20">
        <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
        <span>
          <strong>SAT México 2026:</strong> Bóveda XML con auditoría en listas negras EFOS (Art. 69-B), conciliación bancaria en 1 clic y cálculo automático de RESICO.
        </span>
      </aside>

      {/* 2. Navbar Pública */}
      <header className="border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-xl sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white flex items-center justify-center font-extrabold text-lg shadow-lg shadow-emerald-500/20 group-hover:scale-105 transition-transform">
                EC
              </div>
              <div className="flex flex-col">
                <span className="font-extrabold text-lg text-white tracking-tight leading-tight">
                  EasyConta<span className="text-emerald-400">.MX</span>
                </span>
                <span className="text-[10px] text-slate-400 font-medium leading-none">
                  Contabilidad SAT 2026
                </span>
              </div>
            </Link>
          </div>

          <nav className="hidden md:flex items-center gap-6 text-xs font-semibold text-slate-300">
            <Link href="#auditor" className="hover:text-emerald-400 transition-colors">
              Auditor Express
            </Link>
            <Link href="#calculadora" className="hover:text-emerald-400 transition-colors">
              Calculadora RESICO
            </Link>
            <Link href="/precios" className="hover:text-emerald-400 transition-colors">
              Planes y Precios
            </Link>
            <Link href="/terminos" className="hover:text-emerald-400 transition-colors">
              Términos
            </Link>
            <Link href="/privacidad" className="hover:text-emerald-400 transition-colors">
              Privacidad
            </Link>
          </nav>

          <div className="flex items-center gap-3">
            {isLoggedIn ? (
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
              >
                <span>Ir a mi Dashboard</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="px-3.5 py-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 text-xs font-bold transition-all"
                >
                  Entrar
                </Link>
                <Link
                  href="/registro"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
                >
                  <span>Crear cuenta gratis</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* 3. Hero Section Principal */}
      <main className="flex-1">
        <section className="relative pt-16 pb-12 px-4 sm:px-6 lg:px-8 text-center max-w-5xl mx-auto space-y-6">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-950/80 border border-emerald-600/60 text-emerald-300 text-xs font-bold shadow-xs">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Plataforma SaaS Contable y Fiscal SAT México • Ejercicio 2026</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-black text-white tracking-tight leading-tight">
            Tu Contabilidad y Cálculo Fiscal SAT{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-200">
              en Piloto Automático
            </span>
          </h1>

          <p className="max-w-3xl mx-auto text-sm sm:text-base text-slate-400 leading-relaxed">
            Ahorra hasta 15 horas al mes. Sube tus facturas XML, audita automáticamente en listas negras del SAT (Art. 69-B EFOS), concilia tu estado de cuenta bancario y obtén tu cálculo provisional de ISR e IVA listo para presentar.
          </p>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/registro"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-sm shadow-xl shadow-emerald-500/25 hover:shadow-emerald-500/40 hover:-translate-y-0.5 transition-all cursor-pointer"
            >
              <span>Comenzar Gratis sin Tarjeta</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <Link
              href="/precios"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 hover:text-white font-bold text-sm border border-slate-700 transition-all cursor-pointer"
            >
              <Zap className="w-4 h-4 text-amber-400" />
              <span>Ver Planes desde $0 MXN</span>
            </Link>
          </div>

          {/* Sellos de Confianza y Seguridad */}
          <div className="pt-6 flex flex-wrap items-center justify-center gap-6 text-xs text-slate-400">
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-emerald-400" />
              <span>Bóveda Criptográfica AES-256-GCM</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-emerald-400" />
              <span>Cálculos con precisión Decimal.js</span>
            </div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Auditoría en Listas Negras EFOS</span>
            </div>
          </div>
        </section>

        {/* 4. IMÁN DE CONVERSIÓN: Auditor Express SAT (Pruébalo sin registro) */}
        <section id="auditor" className="py-8 px-4 sm:px-6 lg:px-8">
          <AuditorExpressHero />
        </section>

        {/* 5. Los 4 Pilares de EasyConta MX */}
        <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto border-t border-slate-800/80">
          <div className="text-center space-y-2 mb-12">
            <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
              Todo lo que necesitas para operar sin miedo al SAT
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 max-w-2xl mx-auto">
              Herramientas diseñadas para que contadores y dueños de negocio lleven el control exacto de su dinero.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800 hover:border-emerald-500/50 transition-colors space-y-3">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <Calculator className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-base text-white">Motor Fiscal SAT 2026</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Cálculo automático de pagos provisionales de ISR e IVA para RESICO PF, Actividad Empresarial, Arrendamiento y PM General con aritmética exacta en Decimal.js.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800 hover:border-emerald-500/50 transition-colors space-y-3">
              <div className="w-12 h-12 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-400 flex items-center justify-center">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-base text-white">Auditoría EFOS Art. 69-B</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Cada factura que subes se audita en tiempo real contra las listas negras definitivas de empresas que facturan operaciones simuladas del SAT.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800 hover:border-emerald-500/50 transition-colors space-y-3">
              <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center">
                <Receipt className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-base text-white">Conciliación Bancaria CSV</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Importa estados de cuenta de BBVA, Banorte, Santander y concilia tus cobros y pagos 1 a 1 contra tus facturas CFDI 4.0 sin capturas manuales.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800 hover:border-emerald-500/50 transition-colors space-y-3">
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
                <FileSpreadsheet className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-base text-white">Exportación a Excel y Pólizas</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Genera balanzas de comprobación Anexo 24 del SAT y exporta reportes contables con codificación oficial UTF-8 con acentos y tildes perfectos.
              </p>
            </div>
          </div>
        </section>

        {/* 6. CALCULADORA INTERACTIVA: Simulación de Ahorro RESICO */}
        <section id="calculadora" className="py-8 px-4 sm:px-6 lg:px-8">
          <CalculadoraResico />
        </section>

        {/* 7. Tabla Comparativa: EasyConta MX vs Software Tradicional */}
        <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto border-t border-slate-800/80">
          <div className="text-center space-y-2 mb-12">
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              ¿Por qué cambiarte a EasyConta MX?
            </h2>
            <p className="text-xs sm:text-sm text-slate-400">
              Compara la nueva era en la nube contra el software pesado y costoso del pasado.
            </p>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-900/70 overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-950 text-slate-300 font-bold border-b border-slate-800 uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="p-4 sm:p-5">Característica</th>
                    <th className="p-4 sm:p-5 text-emerald-400 font-black">EasyConta MX 🚀</th>
                    <th className="p-4 sm:p-5 text-slate-500">Software Tradicional (Contpaqi / Aspel)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  <tr>
                    <td className="p-4 font-bold text-white">Costo de Entrada</td>
                    <td className="p-4 text-emerald-300 font-bold">Desde $0 (Plan Gratuito) o $499/mes</td>
                    <td className="p-4 text-slate-500">$8,000 a $15,000 MXN anuales obligatorios</td>
                  </tr>
                  <tr>
                    <td className="p-4 font-bold text-white">Plataforma y Acceso</td>
                    <td className="p-4 text-emerald-300 font-bold">100% en la Nube (PC, Mac, Celular, Tablet)</td>
                    <td className="p-4 text-slate-500">Instalación obligatoria en Windows local</td>
                  </tr>
                  <tr>
                    <td className="p-4 font-bold text-white">Auditoría EFOS (Listas Negras)</td>
                    <td className="p-4 text-emerald-300 font-bold">Automática en tiempo real con cada XML</td>
                    <td className="p-4 text-slate-500">Proceso manual o con módulos adicionales caros</td>
                  </tr>
                  <tr>
                    <td className="p-4 font-bold text-white">Conciliación Bancaria</td>
                    <td className="p-4 text-emerald-300 font-bold">Arrastra el extracto CSV de tu banco en 1 clic</td>
                    <td className="p-4 text-slate-500">Captura manual y compleja</td>
                  </tr>
                  <tr>
                    <td className="p-4 font-bold text-white">Seguridad de Sellos CSD</td>
                    <td className="p-4 text-emerald-300 font-bold">Bóveda Criptográfica AES-256-GCM</td>
                    <td className="p-4 text-slate-500">Archivos sueltos en carpetas locales de Windows</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* 8. Planes y Precios con llamada directa */}
        <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto border-t border-slate-800/80">
          <div className="text-center space-y-2 mb-12">
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Precios Transparentes para Crecer Contigo
            </h2>
            <p className="text-xs sm:text-sm text-slate-400">
              Paga solo lo que necesitas mediante Mercado Pago con tarjeta de crédito, débito o transferencia.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Plan 1: FREE */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Para empezar</div>
                <h3 className="text-xl font-bold text-white">FREE</h3>
                <div className="text-3xl font-black text-white">$0 <span className="text-xs text-slate-400 font-normal">/mes</span></div>
                <p className="text-xs text-slate-400">Para personas físicas que inician y quieren verificar sus cálculos.</p>
                <ul className="space-y-2 pt-3 text-xs text-slate-300 border-t border-slate-800">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span><strong>1 RFC</strong> activo</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span><strong>10 folios</strong> incluidos/mes</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>Motor Fiscal RESICO / Honorarios</span>
                  </li>
                </ul>
              </div>
              <div className="pt-6">
                <Link
                  href="/registro"
                  className="w-full block py-2.5 px-4 text-center rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition-colors cursor-pointer"
                >
                  Registrarme Gratis
                </Link>
              </div>
            </div>

            {/* Plan 2: PRO (Destacado) */}
            <div className="rounded-2xl border-2 border-emerald-500 bg-slate-900/90 p-6 flex flex-col justify-between relative shadow-xl shadow-emerald-500/10">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-emerald-500 text-slate-950 font-black text-[10px] uppercase tracking-wider">
                El Más Popular
              </div>
              <div className="space-y-3">
                <div className="text-xs font-bold uppercase tracking-wider text-emerald-400">Profesional</div>
                <h3 className="text-xl font-bold text-white">PRO</h3>
                <div className="text-3xl font-black text-white">$499 <span className="text-xs text-slate-400 font-normal">MXN/mes</span></div>
                <p className="text-xs text-slate-400">Para profesionistas y negocios en crecimiento con mayor volumen.</p>
                <ul className="space-y-2 pt-3 text-xs text-slate-300 border-t border-slate-800">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>Hasta <strong>3 RFCs</strong></span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span><strong>50 folios</strong> incluidos/mes</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>Conciliación PUE/PPD y Bancaria CSV</span>
                  </li>
                </ul>
              </div>
              <div className="pt-6">
                <Link
                  href="/precios"
                  className="w-full block py-2.5 px-4 text-center rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black shadow-lg shadow-emerald-500/20 transition-all cursor-pointer"
                >
                  Activar Plan PRO
                </Link>
              </div>
            </div>

            {/* Plan 3: DESPACHO */}
            <div className="rounded-2xl border border-indigo-500/40 bg-slate-900/60 p-6 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="text-xs font-bold uppercase tracking-wider text-indigo-400">Contadores y Firmas</div>
                <h3 className="text-xl font-bold text-white">DESPACHO</h3>
                <div className="text-3xl font-black text-white">$1,499 <span className="text-xs text-slate-400 font-normal">MXN/mes</span></div>
                <p className="text-xs text-slate-400">Para firmas contables que gestionan múltiples clientes a gran escala.</p>
                <ul className="space-y-2 pt-3 text-xs text-slate-300 border-t border-slate-800">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-indigo-400" />
                    <span>Hasta <strong>25 RFCs</strong></span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-indigo-400" />
                    <span><strong>200 folios</strong> incluidos/mes</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-indigo-400" />
                    <span>Multi-empresa y reportes agregados</span>
                  </li>
                </ul>
              </div>
              <div className="pt-6">
                <Link
                  href="/precios"
                  className="w-full block py-2.5 px-4 text-center rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition-colors cursor-pointer"
                >
                  Activar Despacho
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* 9. Preguntas Frecuentes (FAQ) */}
        <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto border-t border-slate-800/80">
          <div className="text-center space-y-2 mb-10">
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Preguntas Frecuentes
            </h2>
            <p className="text-xs sm:text-sm text-slate-400">
              Todo lo que necesitas saber antes de empezar.
            </p>
          </div>

          <div className="space-y-4 text-xs sm:text-sm">
            <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-1.5">
              <h4 className="font-bold text-amber-400 flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-amber-400" />
                ¿Ya facturé ante el SAT al emitir un CFDI en la plataforma?
              </h4>
              <p className="text-slate-400 leading-relaxed">
                <strong>NO.</strong> Actualmente la plataforma opera con timbrado de demostración (sandbox). Los CFDI emitidos permiten evaluar el motor contable y la generación de pólizas sin valor fiscal ante el SAT hasta conectar el PAC productivo.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-1.5">
              <h4 className="font-bold text-white flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-emerald-400" />
                ¿Mis sellos digitales (CSD) y facturas están seguros?
              </h4>
              <p className="text-slate-400 leading-relaxed">
                Totalmente. Utilizamos cifrado autenticado AES-256-GCM con claves maestras únicas. Tus archivos `.key` y contraseñas jamás se guardan en texto plano.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-1.5">
              <h4 className="font-bold text-white flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-emerald-400" />
                ¿Qué regímenes fiscales están soportados para la estimación de impuestos?
              </h4>
              <p className="text-slate-400 leading-relaxed">
                EasyConta MX soporta los principales regímenes de México: RESICO Personas Físicas (tasa del 1% al 2.5%), Actividad Empresarial y Profesional (Art. 96 LISR), Arrendamiento (con opción de deducción ciega del 35%) y Régimen General de Personas Morales con Coeficiente de Utilidad. El motor realiza una estimación técnica y no presenta la declaración directamente ante el SAT.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-1.5">
              <h4 className="font-bold text-white flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-emerald-400" />
                ¿Puedo probar la plataforma sin ingresar mi tarjeta de crédito?
              </h4>
              <p className="text-slate-400 leading-relaxed">
                Sí. Puedes registrarte en el Plan FREE sin tarjeta de crédito, subir tus comprobantes, probar el motor de cálculo y explorar todas las herramientas contables.
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* 10. Botón Flotante de WhatsApp para Ventas */}
      <WhatsAppButton />

      {/* 11. Footer Oficial y Profesional */}
      <footer className="border-t border-slate-800 bg-slate-950 py-8 px-4 sm:px-6 lg:px-8 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-emerald-600 text-white flex items-center justify-center font-bold text-xs">
              EC
            </div>
            <span>EasyConta.MX © 2026. Plataforma SaaS de Facturación y Contabilidad SAT.</span>
          </div>

          <div className="flex items-center gap-5 text-slate-400">
            <Link href="/precios" className="hover:text-white">Precios</Link>
            <Link href="/terminos" className="hover:text-white">Términos de Servicio</Link>
            <Link href="/privacidad" className="hover:text-white">Aviso de Privacidad</Link>
            <Link href="/login" className="hover:text-white">Acceso al Sistema</Link>
          </div>

          <div className="text-[11px] text-emerald-400/90 font-mono flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Cifrado de Grado Bancario AES-256</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
