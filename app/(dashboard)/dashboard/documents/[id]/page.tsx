import { redirect } from "next/navigation";
import { getDocument } from "@/features/documents/actions";
import { DocumentDetail } from "@/features/documents/components/document-detail";
import { getDocumentActivity } from "@/features/activity/actions";

export default async function DocumentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const document = await getDocument(id);
  if (!document) redirect("/dashboard/documents");

  const activity = await getDocumentActivity(id);

  return (
    <DocumentDetail document={document} activity={activity} />
  );
}
