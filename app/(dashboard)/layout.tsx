import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/features/auth/actions";
import { DashboardShell } from "@/components/layout/dashboard-shell";

async function DashboardContent({ children }: { children: React.ReactNode }) {
  const profile = await getCurrentUser();
  if (!profile) redirect("/login");

  return <DashboardShell profile={profile}>{children}</DashboardShell>;
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50" />}>
      <DashboardContent>{children}</DashboardContent>
    </Suspense>
  );
}
