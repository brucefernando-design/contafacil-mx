import { auth } from "@/auth";
import { PreciosClient } from "./PreciosClient";

export const dynamic = "force-dynamic";

export default async function PreciosPage() {
  const session = await auth();
  return <PreciosClient isAuthenticated={!!session?.user} />;
}
