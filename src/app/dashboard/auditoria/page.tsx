import { redirect } from "next/navigation";
import { getCurrentUserAndOrg } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { AuditoriaView } from "./AuditoriaView";

export default async function AuditoriaPage() {
  const sessionData = await getCurrentUserAndOrg();

  if (!sessionData?.user || !sessionData.activeOrg) {
    redirect("/login");
  }

  const { user, activeOrg } = sessionData;

  // Verificar rol del usuario en la organización activa
  const membership = await prisma.organizationMember.findUnique({
    where: {
      userId_organizationId: {
        userId: user.id,
        organizationId: activeOrg.id,
      },
    },
  });

  const isOwner = membership?.role === "OWNER";
  const currentUserRole = membership?.role || "SIN_ROL";

  let logs: Array<{
    id: string;
    action: string;
    userId: string | null;
    userEmail: string | null;
    ip: string | null;
    detalles: string | null;
    createdAt: string;
  }> = [];

  // Solo si es OWNER se consultan los registros de la bitácora
  if (isOwner) {
    const rawLogs = await prisma.auditLog.findMany({
      where: {
        OR: [
          { organizationId: activeOrg.id },
          { userId: user.id, organizationId: null },
        ],
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    logs = rawLogs.map((l) => ({
      id: l.id,
      action: l.action,
      userId: l.userId,
      userEmail: l.userEmail,
      ip: l.ip,
      detalles: l.detalles,
      createdAt: l.createdAt.toISOString(),
    }));
  }

  return (
    <AuditoriaView
      isOwner={isOwner}
      activeOrg={{
        id: activeOrg.id,
        rfc: activeOrg.rfc,
        razonSocial: activeOrg.razonSocial,
      }}
      currentUserRole={currentUserRole}
      logs={logs}
    />
  );
}
