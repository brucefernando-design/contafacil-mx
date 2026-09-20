import { redirect } from "next/navigation";
import { getCurrentUserAndOrg } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { AdminView } from "./AdminView";

export const metadata = {
  title: "Panel Super Admin | EasyConta MX",
};

export default async function AdminPage() {
  const sessionData = await getCurrentUserAndOrg();

  if (!sessionData?.user) {
    redirect("/login");
  }

  // Protección de seguridad estricta: solo ADMIN puede acceder
  if (sessionData.user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  // Cargar usuarios y métricas iniciales
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isDespacho: true,
      createdAt: true,
      subscription: {
        select: {
          plan: true,
          status: true,
          periodEnd: true,
          timbresIncluidos: true,
          timbresUsados: true,
          mpPaymentId: true,
          updatedAt: true,
        },
      },
      memberships: {
        select: {
          role: true,
          organization: {
            select: {
              id: true,
              rfc: true,
              razonSocial: true,
              regimenFiscal: true,
            },
          },
        },
      },
    },
  });

  const totalOrgs = await prisma.organization.count();
  const totalInvoices = await prisma.invoice.count();

  const metrics = {
    totalUsers: users.length,
    totalOrgs,
    totalInvoices,
    freeUsers: users.filter((u) => (u.subscription?.plan || "FREE") === "FREE").length,
    proUsers: users.filter((u) => u.subscription?.plan === "PRO").length,
    despachoUsers: users.filter((u) => u.subscription?.plan === "DESPACHO").length,
    admins: users.filter((u) => u.role === "ADMIN").length,
    contadores: users.filter((u) => u.role === "CONTADOR").length,
  };

  return (
    <AdminView
      initialUsers={JSON.parse(JSON.stringify(users))}
      initialMetrics={metrics}
      currentAdminEmail={sessionData.user.email}
    />
  );
}
