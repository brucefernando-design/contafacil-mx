import { redirect } from "next/navigation";
import { getCurrentUserAndOrg } from "@/lib/session";
import { Navbar } from "@/components/layout/Navbar";
import { Sidebar } from "@/components/layout/Sidebar";
import { prisma } from "@/lib/prisma";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const sessionData = await getCurrentUserAndOrg();

  if (!sessionData?.user) {
    redirect("/login");
  }

  const { user, activeOrg, allOrgs } = sessionData;

  // Si no tiene organizaciones registradas aún, enviarlo al onboarding inicial
  if (!activeOrg && allOrgs.length === 0) {
    redirect("/dashboard/onboarding");
  }

  // Contar alertas pendientes no leídas
  const alertsCount = activeOrg
    ? await prisma.fiscalAlert.count({
        where: { organizationId: activeOrg.id, leida: false },
      })
    : 0;

  return (
    <div className="min-h-screen bg-slate-100/60 flex flex-col font-sans">
      <Navbar
        user={{
          name: user.name,
          email: user.email,
          role: user.role,
          isDespacho: user.isDespacho,
        }}
        activeOrg={{
          id: activeOrg!.id,
          rfc: activeOrg!.rfc,
          razonSocial: activeOrg!.razonSocial,
          tipoPersona: activeOrg!.tipoPersona,
          regimenFiscal: activeOrg!.regimenFiscal,
          opinionCumplimiento: activeOrg!.opinionCumplimiento,
        }}
        allOrgs={allOrgs.map((org) => ({
          id: org.id,
          rfc: org.rfc,
          razonSocial: org.razonSocial,
          tipoPersona: org.tipoPersona,
          regimenFiscal: org.regimenFiscal,
          opinionCumplimiento: org.opinionCumplimiento,
        }))}
        alertsCount={alertsCount}
      />

      <div className="flex flex-1">
        <Sidebar
          activeOrg={{
            rfc: activeOrg!.rfc,
            razonSocial: activeOrg!.razonSocial,
            tipoPersona: activeOrg!.tipoPersona,
            regimenFiscal: activeOrg!.regimenFiscal,
            codigoPostal: activeOrg!.codigoPostal,
          }}
          isDespacho={user.isDespacho}
        />

        <main className="flex-1 p-4 md:p-8 max-w-7xl overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}
