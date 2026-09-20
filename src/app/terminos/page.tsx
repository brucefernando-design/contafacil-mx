import Link from "next/link";
import { ArrowLeft, Shield, FileText } from "lucide-react";

export const metadata = {
  title: "Términos y Condiciones de Uso | EasyConta MX",
  description: "Términos y condiciones de uso del servicio de software contable EasyConta MX (Borrador para México).",
};

export default function TerminosPage() {
  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto bg-white rounded-2xl border border-slate-200 p-8 sm:p-12 shadow-xs space-y-8">
        <div>
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 hover:text-emerald-600 mb-6"
          >
            <ArrowLeft className="w-4 h-4" /> Volver al Inicio de Sesión
          </Link>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                Términos y Condiciones de Uso
              </h1>
              <p className="text-xs text-slate-500">
                EasyConta MX • Borrador de Contrato de Adhesión (México) • Última actualización: Septiembre 2026
              </p>
            </div>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-950 space-y-1">
          <p className="font-bold">Aviso Relevante de Naturaleza Tecnológica e Independiente:</p>
          <p className="leading-relaxed">
            EasyConta MX es un software como servicio (SaaS) independiente desarrollado con fines de gestión administrativa, contable y simulación fiscal. No es una autoridad tributaria, no tiene afiliación gubernamental con el Servicio de Administración Tributaria (SAT) de México, ni presta servicios de asesoría jurídica o contable profesional vinculante.
          </p>
        </div>

        <div className="prose prose-slate prose-xs max-w-none text-slate-700 space-y-6 text-xs leading-relaxed">
          <section className="space-y-2">
            <h2 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-1">
              1. Aceptación de los Términos
            </h2>
            <p>
              Al registrarse, acceder o utilizar la plataforma EasyConta MX, el usuario (en lo sucesivo, el &quot;Usuario&quot;) declara haber leído, comprendido y aceptado en su totalidad los presentes Términos y Condiciones, obligándose a cumplirlos conforme a los principios de buena fe y la legislación mercantil de los Estados Unidos Mexicanos.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-1">
              2. Descripción del Servicio y Entorno de Pruebas (Mock)
            </h2>
            <p>
              EasyConta MX proporciona herramientas para la lectura y parseo de archivos CFDI 4.0 en formato XML, conciliación de pólizas, generación de balanzas de comprobación demostrativas y estimación de pagos provisionales de impuestos (ISR e IVA). En este entorno, el timbrado digital opera a través de un Proveedor Autorizado de Certificación simulado (PAC Mock) para pruebas educativas y de control interno; los CFDI emitidos dentro de este sistema no se transmiten a los servidores productivos del SAT.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-1">
              3. Custodia de Certificados y Claves de Seguridad
            </h2>
            <p>
              La plataforma implementa una Bóveda Criptográfica con cifrado de grado industrial (AES-256-GCM) para el almacenamiento de Certificados de Sello Digital (CSD) y archivos de e.firma. Por diseño estricto de seguridad, la e.firma nunca es utilizada para timbrar facturas electrónicas. El Usuario es el único responsable de la confidencialidad de sus contraseñas y claves de acceso.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-1">
              4. Deslinde de Responsabilidad Profesional y Fiscal
            </h2>
            <p>
              Los cálculos aritméticos, proyecciones fiscales y catálogos de cuentas generados por el sistema constituyen estimaciones informativas de carácter preliminar. En ningún caso sustituyen el dictamen u opinión de un Contador Público Titulado. El Usuario es el único obligado ante las autoridades fiscales respecto a la veracidad, materialidad y pago oportuno de sus declaraciones tributarias en el portal oficial del SAT.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-1">
              5. Legislación Aplicable y Jurisdicción
            </h2>
            <p>
              Para la interpretación y cumplimiento de estos Términos, las partes se someten a las leyes federales de los Estados Unidos Mexicanos y al Código de Comercio, renunciando a cualquier otro fuero que pudiera corresponderles por razón de sus domicilios presentes o futuros.
            </p>
          </section>
        </div>

        <div className="pt-6 border-t border-slate-200 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-slate-500">
          <span>EasyConta MX © 2026. Todos los derechos reservados.</span>
          <Link href="/privacidad" className="text-emerald-700 hover:underline font-semibold">
            Consultar Aviso de Privacidad →
          </Link>
        </div>
      </div>
    </div>
  );
}
