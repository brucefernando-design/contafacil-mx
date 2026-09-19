import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function getCurrentUserAndOrg() {
  const session = await auth();
  if (!session?.user?.id) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      memberships: {
        include: {
          organization: true,
        },
      },
    },
  });

  if (!user) return null;

  // Determinar la organización activa
  let activeOrg = null;
  if (user.activeCompanyId) {
    activeOrg = user.memberships.find((m) => m.organizationId === user.activeCompanyId)?.organization;
  }

  // Si no hay empresa activa o no se encontró, tomar la primera
  if (!activeOrg && user.memberships.length > 0) {
    activeOrg = user.memberships[0].organization;
  }

  return {
    user,
    activeOrg,
    allOrgs: user.memberships.map((m) => m.organization),
  };
}
