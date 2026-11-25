import { notFound, redirect } from "next/navigation";
import { requireSession } from "@/lib/session";

export default async function SiteIndex({ params }: { params: Promise<{ site: string }> }) {
  const { site } = await params;
  const session = await requireSession();
  if (!session.sites.some((s) => s.id === site)) notFound();
  redirect(`/sites/${site}/${session.collections[0]?.id ?? "dest"}`);
}
