import { Suspense } from "react";
import { SignTokenPage } from "../../../features/signing/components/signing-token-page";
import { Skeleton } from "@/components/ui/skeleton";

function SignTokenLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="space-y-4 w-full max-w-2xl p-8">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    </div>
  );
}

async function SignTokenContent({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <SignTokenPage token={token} />;
}

export default function SignTokenRoute({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  return (
    <Suspense fallback={<SignTokenLoading />}>
      <SignTokenContent params={params} />
    </Suspense>
  );
}
