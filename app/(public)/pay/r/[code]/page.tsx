import { redirect } from "next/navigation";

export const instant = false;

export default async function ShortPayRedirectPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  redirect(`/pay/${code}`);
}
