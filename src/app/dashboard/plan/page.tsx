import { redirect } from "next/navigation";
import { getCurrentUserAndOrg } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { PlanView } from "./PlanView";
import { PlanType } from "@/lib/sat/subscription-engine";

export default async function PlanPage() {
  const sessionData = await getCurrentUserAndOrg();

  if (!sessionData?.user) {
    redirect("/login");
  }

  const { user } = sessionData;

  // Obtener o inicializar la suscripción del usuario
  let subscription = await prisma.subscription.findUnique({
    where: { userId: user.id },
  });

  if (!subscription) {
    subscription = await prisma.subscription.create({
      data: {
        userId: user.id,
        plan: "FREE",
        status: "ACTIVE",
        timbresIncluidos: 10,
        timbresUsados: 0,
      },
    });
  }

  // Obtener RFCs de los que el usuario es OWNER
  const memberships = await prisma.organizationMember.findMany({
    where: { userId: user.id, role: "OWNER" },
    include: { organization: true },
    orderBy: { createdAt: "asc" },
  });

  const rfcsList = memberships.map((m) => ({
    id: m.organization.id,
    rfc: m.organization.rfc,
    razonSocial: m.organization.razonSocial,
    regimenFiscal: m.organization.regimenFiscal,
  }));

  return (
    <PlanView
      user={{
        id: user.id,
        name: user.name,
        email: user.email,
      }}
      subscription={{
        plan: subscription.plan as PlanType,
        status: subscription.status,
        timbresIncluidos: subscription.timbresIncluidos,
        timbresUsados: subscription.timbresUsados,
      }}
      rfcsCount={rfcsList.length}
      rfcsList={rfcsList}
    />
  );
}
