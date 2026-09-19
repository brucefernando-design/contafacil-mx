import { redirect } from 'next/navigation';

export default async function ImpuestosPage(props: {
  searchParams?: Promise<{ year?: string; month?: string }>;
}) {
  const sp = props.searchParams ? await props.searchParams : {};
  const params = new URLSearchParams();
  if (sp.year) params.set('year', sp.year);
  if (sp.month) params.set('month', sp.month);
  const qs = params.toString() ? `?${params.toString()}` : '';
  redirect(`/dashboard/motor-fiscal${qs}`);
}
