import { notFound } from "next/navigation";
import { getCurrentUserAndOrg } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { formatCurrency, formatDate, formatDateTime, FORMAS_PAGO, REGIMENES_SAT, USOS_CFDI } from "@/lib/utils";
import { generateSatQrDataUrl, numeroALetrasMx } from "@/lib/sat/qr-helper";
import { ArrowLeft, Download, Printer, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { PrintButton } from "./PrintButton";

interface PdfPageProps {
  params: Promise<{ id: string }>;
}

export default async function InvoicePdfPage({ params }: PdfPageProps) {
  const { id } = await params;
  const sessionData = await getCurrentUserAndOrg();
  if (!sessionData?.activeOrg) return notFound();

  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: {
      items: true,
      paymentComplements: true,
    },
  });

  if (!invoice) return notFound();

  // Generar imagen QR SAT en base64
  const qrCodeUrl =
    invoice.qrCodeData ||
    `https://verificacfdi.facturaelectronica.sat.gob.mx/default.aspx?id=${invoice.uuid}&re=${invoice.emisorRfc}&rr=${invoice.receptorRfc}&tt=${Number(invoice.total).toFixed(6)}&fe=${(invoice.selloCFD || "").slice(-8)}`;

  const qrDataUrl = await generateSatQrDataUrl(qrCodeUrl);
  const totalEnLetra = numeroALetrasMx(Number(invoice.total));

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Botones de Acción (ocultos al imprimir) */}
      <div className="flex items-center justify-between no-print bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <Link
          href="/dashboard/boveda"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="w-4 h-4" /> Volver a Bóveda
        </Link>

        <div className="flex items-center gap-3">
          <PrintButton />
          <a
            href={`data:text/xml;charset=utf-8,${encodeURIComponent(invoice.rawXml || "")}`}
            download={`CFDI40_${invoice.uuid}.xml`}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs border border-slate-200 transition-colors"
          >
            <Download className="w-4 h-4" /> Descargar XML
          </a>
        </div>
      </div>

      {/* Expediente Representación Impresa CFDI 4.0 */}
      <div className="relative overflow-hidden bg-white border border-slate-300 rounded-xl p-8 shadow-sm text-slate-900 text-xs print:border-none print:shadow-none print:p-0">
        {/* Watermark Diagonal */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden select-none z-0 opacity-[0.07] rotate-[-26deg]">
          <p className="text-4xl sm:text-5xl md:text-6xl font-black uppercase text-rose-950 text-center leading-tight tracking-widest max-w-2xl">
            Timbrado de demostración.<br />Este CFDI NO fue enviado al SAT.
          </p>
        </div>

        {/* Watermark Banner */}
        <div className="relative z-10 bg-amber-100 border-2 border-dashed border-amber-400 text-amber-950 rounded-xl px-4 py-2.5 text-center text-xs sm:text-sm font-black uppercase tracking-wider mb-6">
          ⚠️ Timbrado de demostración. Este CFDI NO fue enviado al SAT.
        </div>

        {invoice.estatus === "CANCELADO" && (
          <div className="relative z-10 bg-rose-100 border-2 border-rose-400 text-rose-950 rounded-xl px-4 py-2.5 text-center text-xs sm:text-sm font-black uppercase tracking-wider mb-6">
            ❌ ESTE COMPROBANTE SE ENCUENTRA CANCELADO (SIMULACIÓN SAT)
          </div>
        )}

        {/* Encabezado y Datos del Documento */}
        <div className="relative z-10 flex flex-col sm:flex-row justify-between items-start gap-4 pb-6 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-black tracking-tight text-slate-900">
                {invoice.emisorNombre}
              </span>
            </div>
            <p className="font-mono font-bold text-sm text-emerald-800 mt-1">
              RFC: {invoice.emisorRfc}
            </p>
            <p className="text-slate-600 text-[11px] mt-0.5">
              Régimen Fiscal: {invoice.emisorRegimen} - {REGIMENES_SAT[invoice.emisorRegimen] || "Régimen Fiscal"}
            </p>
            <p className="text-slate-600 text-[11px]">
              Lugar de Expedición (C.P.): {invoice.lugarExpedicion}
            </p>
          </div>

          <div className="text-right sm:max-w-xs space-y-1">
            <div className="inline-block px-2.5 py-1 rounded bg-slate-100 text-slate-800 font-bold text-xs uppercase tracking-wide">
              CFDI 4.0 - Ingreso
            </div>
            <div className="text-sm font-bold text-slate-900">
              {invoice.serie ? `${invoice.serie}-` : ""}{invoice.folio || "S/F"}
            </div>
            <div className="font-mono text-[10px] text-slate-500 break-all">
              <strong>UUID:</strong> {invoice.uuid}
            </div>
            <div className="text-[11px] text-slate-600">
              Fecha de Emisión: {formatDateTime(invoice.fecha)}
            </div>
            <div className="text-[11px] text-slate-600">
              Fecha de Certificación: {formatDateTime(invoice.fechaTimbrado || invoice.fecha)}
            </div>
          </div>
        </div>

        {/* Datos del Receptor */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4 border-b border-slate-200 text-xs">
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
            <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px] block mb-1">
              Receptor del Comprobante
            </span>
            <div className="font-bold text-slate-900 text-sm">
              {invoice.receptorNombre}
            </div>
            <div className="font-mono font-bold text-emerald-800 mt-0.5">
              RFC: {invoice.receptorRfc}
            </div>
            <div className="text-slate-600 text-[11px] mt-1">
              Domicilio Fiscal (C.P.): {invoice.receptorCp}
            </div>
            <div className="text-slate-600 text-[11px]">
              Régimen Fiscal: {invoice.receptorRegimen} - {REGIMENES_SAT[invoice.receptorRegimen] || "General"}
            </div>
            <div className="text-slate-600 text-[11px]">
              Uso de CFDI: {invoice.receptorUsoCfdi} - {USOS_CFDI[invoice.receptorUsoCfdi] || "Gastos en general"}
            </div>
          </div>

          <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
            <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px] block mb-1">
              Condiciones de Pago
            </span>
            <div className="text-slate-700 text-xs space-y-1">
              <div>
                <strong>Método de Pago:</strong> {invoice.metodoPago} - {invoice.metodoPago === "PUE" ? "Pago en una sola exhibición" : "Pago en parcialidades o diferido"}
              </div>
              <div>
                <strong>Forma de Pago:</strong> {invoice.formaPago} - {FORMAS_PAGO[invoice.formaPago] || "Transferencia"}
              </div>
              <div>
                <strong>Moneda:</strong> {invoice.moneda} (Tipo de Cambio: {invoice.tipoCambio ? invoice.tipoCambio.toString() : "1.00"})
              </div>
              <div>
                <strong>Estatus Fiscal SAT:</strong>{" "}
                <span className="font-bold text-emerald-700">{invoice.estatus}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Tabla de Conceptos */}
        <div className="py-4 border-b border-slate-200 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100/80 text-slate-600 uppercase text-[10px] font-bold">
              <tr>
                <th className="p-2 font-mono">Clave SAT</th>
                <th className="p-2">Cant</th>
                <th className="p-2">Unidad</th>
                <th className="p-2">Descripción</th>
                <th className="p-2 text-right">P. Unitario</th>
                <th className="p-2 text-right">Impuestos</th>
                <th className="p-2 text-right">Importe</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {invoice.items.map((item) => (
                <tr key={item.id} className="text-[11px]">
                  <td className="p-2 font-mono font-semibold text-slate-700">
                    {item.claveProdServ}
                  </td>
                  <td className="p-2 font-mono">{item.cantidad.toString()}</td>
                  <td className="p-2 text-slate-600">{item.claveUnidad}</td>
                  <td className="p-2 font-medium text-slate-900">{item.descripcion}</td>
                  <td className="p-2 text-right font-mono font-semibold text-slate-700">
                    {formatCurrency(item.valorUnitario)}
                  </td>
                  <td className="p-2 text-right font-mono text-[10px] text-slate-600">
                    {Number(item.ivaImporte) > 0 && <div>IVA 16%: +{formatCurrency(item.ivaImporte)}</div>}
                    {item.retIsrImporte && Number(item.retIsrImporte) > 0 ? (
                      <div className="text-amber-800">Ret ISR: -{formatCurrency(item.retIsrImporte)}</div>
                    ) : null}
                    {item.retIvaImporte && Number(item.retIvaImporte) > 0 ? (
                      <div className="text-rose-800">Ret IVA: -{formatCurrency(item.retIvaImporte)}</div>
                    ) : null}
                  </td>
                  <td className="p-2 text-right font-mono font-bold text-slate-900">
                    {formatCurrency(item.importe)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Desglose de Totales y Total en Letra */}
        <div className="py-4 border-b border-slate-200 flex flex-col md:flex-row justify-between items-start gap-4">
          <div className="flex-1 text-xs">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
              Importe Total con Letra
            </span>
            <p className="font-semibold text-slate-800 mt-0.5">{totalEnLetra}</p>
          </div>

          <div className="w-full md:w-72 space-y-1.5 text-xs">
            <div className="flex justify-between text-slate-600">
              <span>Subtotal:</span>
              <span className="font-mono font-bold text-slate-900">
                {formatCurrency(invoice.subtotal)}
              </span>
            </div>
            {Number(invoice.descuento) > 0 && (
              <div className="flex justify-between text-rose-600">
                <span>Descuento:</span>
                <span className="font-mono font-bold">
                  -{formatCurrency(invoice.descuento)}
                </span>
              </div>
            )}
            <div className="flex justify-between text-slate-600">
              <span>IVA Trasladado (16%):</span>
              <span className="font-mono font-bold text-slate-900">
                +{formatCurrency(invoice.totalIvaTrasladado)}
              </span>
            </div>
            {Number(invoice.totalIsrRetenido) > 0 && (
              <div className="flex justify-between text-amber-800 font-medium">
                <span>Retención ISR:</span>
                <span className="font-mono font-bold">
                  -{formatCurrency(invoice.totalIsrRetenido)}
                </span>
              </div>
            )}
            {Number(invoice.totalIvaRetenido) > 0 && (
              <div className="flex justify-between text-rose-800 font-medium">
                <span>Retención IVA:</span>
                <span className="font-mono font-bold">
                  -{formatCurrency(invoice.totalIvaRetenido)}
                </span>
              </div>
            )}
            <div className="pt-2 border-t border-slate-200 flex justify-between text-sm font-black text-slate-900">
              <span>TOTAL (MXN):</span>
              <span className="font-mono text-emerald-800">
                {formatCurrency(invoice.total)}
              </span>
            </div>
          </div>
        </div>

        {/* Sellos Digitales y QR SAT */}
        <div className="pt-6 flex flex-col md:flex-row items-center gap-6">
          {/* QR Code */}
          <div className="shrink-0 text-center">
            {qrDataUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={qrDataUrl}
                alt="Código QR SAT"
                className="w-36 h-36 border border-slate-300 rounded p-1 mx-auto"
              />
            )}
            <span className="text-[9px] text-slate-400 block mt-1">
              Verificación SAT CFDI 4.0
            </span>
          </div>

          {/* Cadenas y Sellos Digitales */}
          <div className="flex-1 space-y-2 text-[9px] font-mono break-all text-slate-600 leading-tight">
            <div>
              <strong className="text-slate-800 block">
                Cadena Original del Complemento de Certificación Digital del SAT:
              </strong>
              <p className="bg-slate-50 p-1.5 rounded border border-slate-200 mt-0.5">
                {invoice.cadenaOriginal || "||1.1|" + invoice.uuid + "||"}
              </p>
            </div>

            <div>
              <strong className="text-slate-800 block">Sello Digital del Emisor (CFD):</strong>
              <p className="bg-slate-50 p-1.5 rounded border border-slate-200 mt-0.5">
                {invoice.selloCFD || "SELLO_CFD_MOCK"}
              </p>
            </div>

            <div>
              <strong className="text-slate-800 block">Sello Digital del SAT:</strong>
              <p className="bg-slate-50 p-1.5 rounded border border-slate-200 mt-0.5">
                {invoice.selloSAT || "SELLO_SAT_MOCK"}
              </p>
            </div>

            <div className="flex justify-between text-slate-500 pt-1">
              <span>No. Certificado SAT: {invoice.noCertificadoSAT}</span>
              <span>RFC PAC: CFA110101SAT</span>
            </div>
          </div>
        </div>

        <div className="relative z-10 mt-6 pt-3 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between text-[10px] text-slate-500 gap-2">
          <span>Este documento es una representación impresa de un CFDI versión 4.0</span>
          <div className="flex items-center gap-1.5 font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
            <span>Emitido con EasyConta.MX • Facturación y Contabilidad SAT</span>
          </div>
        </div>
      </div>
    </div>
  );
}
