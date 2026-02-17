import { redirect } from "next/navigation";
import { getCurrentUser } from "@/features/auth/actions";
import { getDocumentStats, getDocuments } from "@/features/documents/actions";
import { getRecipientSigningRequests } from "@/features/signing/actions";
import { SenderDashboard } from "@/features/documents/components/sender-dashboard";
import { RecipientDashboard } from "@/features/signing/components/recipient-dashboard";
import { AdminDashboard } from "@/features/admin/components/admin-dashboard";

export default async function DashboardPage() {
  const profile = await getCurrentUser();
  if (!profile) redirect("/login");

  switch (profile.role) {
    case "sender": {
      const [stats, documents, signingRequests] = await Promise.all([
        getDocumentStats(),
        getDocuments(),
        getRecipientSigningRequests(),
      ]);
      return (
        <SenderDashboard
          stats={stats}
          documents={documents}
          signingRequests={signingRequests}
        />
      );
    }
    case "recipient":
      return <RecipientDashboard />;
    case "admin":
      return <AdminDashboard />;
    default: {
      const [stats, documents, signingRequests] = await Promise.all([
        getDocumentStats(),
        getDocuments(),
        getRecipientSigningRequests(),
      ]);
      return (
        <SenderDashboard
          stats={stats}
          documents={documents}
          signingRequests={signingRequests}
        />
      );
    }
  }
}
