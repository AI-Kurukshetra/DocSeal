import { SignTokenPage } from "../../../features/signing/components/signing-token-page";

export default async function SignTokenRoute({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return <SignTokenPage token={token} />;
}
