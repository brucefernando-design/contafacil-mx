import { getCurrentUserAndOrg } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { CertificadosView } from "./CertificadosView";
import { ShieldCheck } from "lucide-react";

export default async function CertificadosPage() {
  const sessionData = await getCurrentUserAndOrg();
  if (!sessionData?.activeOrg) return null;

  const { activeOrg } = sessionData;

  const certificates = await prisma.certificateVault.findMany({
    where: { organizationId: activeOrg.id },
    orderBy: { createdAt: "desc" },
  });

  const serializedCertificates = certificates.map((c) => ({
    id: c.id,
    tipo: c.tipo,
    rfc: c.rfc,
    noCertificado: c.noCertificado,
    validoDesde: c.validoDesde?.toISOString() || null,
    validoHasta: c.validoHasta?.toISOString() || null,
    activo: c.activo,
    createdAt: c.createdAt.toISOString(),
  }));

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1 rounded bg-emerald-100 text-emerald-800">
              <ShieldCheck className="w-4 h-4" />
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">
              Seguridad Criptográfica SAT
            </span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Bóveda de Certificados (CSD y e.firma)
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Resguardo blindado con AES-256-GCM para sellos de facturación y firmas electrónicas de <strong className="font-mono text-emerald-800">{activeOrg.rfc}</strong>
          </p>
        </div>
      </div>

      <CertificadosView
        activeOrg={{
          id: activeOrg.id,
          rfc: activeOrg.rfc,
          razonSocial: activeOrg.razonSocial,
          csdStatus: activeOrg.csdStatus,
          csdNoCertificado: activeOrg.csdNoCertificado,
          csdVencimiento: activeOrg.csdVencimiento?.toISOString() || null,
        }}
        initialCertificates={serializedCertificates}
      />
    </div>
  );
}
