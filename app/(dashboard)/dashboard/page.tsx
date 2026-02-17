import { redirect } from "next/navigation";
import { getCurrentUser } from "@/features/auth/actions";
import { SenderDashboard } from "@/features/documents/components/sender-dashboard";
import { RecipientDashboard } from "@/features/signing/components/recipient-dashboard";
import { AdminDashboard } from "@/features/admin/components/admin-dashboard";

export default async function DashboardPage() {
  const profile = await getCurrentUser();
  if (!profile) redirect("/login");

  switch (profile.role) {
    case "sender":
      return <SenderDashboard />;
    case "recipient":
      return <RecipientDashboard />;
    case "admin":
      return <AdminDashboard />;
    default:
      return <SenderDashboard />;
  }
}
