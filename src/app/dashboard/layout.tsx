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

  // Si no tiene organizaciones registradas aún, mostrar interfaz limpia para completar el onboarding
  if (!activeOrg) {
    return (
      <div className="min-h-screen bg-slate-100/60 flex flex-col font-sans">
        <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-200 bg-white/95 backdrop-blur px-4 md:px-6">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 flex items-center justify-center text-white shadow-md shadow-emerald-700/20">
              <span className="font-extrabold text-sm tracking-tight">EC</span>
            </div>
            <span className="font-black text-lg text-slate-900 tracking-tight">
              EasyConta<span className="text-emerald-600">.MX</span>
            </span>
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-600 font-medium">
            <span className="hidden sm:inline">{user.name} ({user.email})</span>
            {user.role === "ADMIN" && (
              <a
                href="/dashboard/admin"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white font-semibold rounded-lg hover:bg-emerald-700 transition-colors shadow-xs"
              >
                Panel Super Admin 🛡️
              </a>
            )}
            <a
              href="/api/auth/signout"
              className="px-2.5 py-1.5 text-slate-500 hover:text-slate-800 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
            >
              Salir
            </a>
          </div>
        </header>
        <main className="flex-1 p-4 md:p-8 max-w-7xl mx-auto w-full">
          {children}
        </main>
      </div>
    );
  }

  // Contar alertas pendientes no leídas
  const alertsCount = await prisma.fiscalAlert.count({
    where: { organizationId: activeOrg.id, leida: false },
  });

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
          role={user.role}
        />

        <main className="flex-1 p-4 md:p-8 max-w-7xl overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}
