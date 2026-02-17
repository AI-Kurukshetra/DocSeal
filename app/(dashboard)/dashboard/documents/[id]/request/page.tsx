import { redirect } from "next/navigation";
import { getDocument } from "@/features/documents/actions";
import { RequestForm } from "@/features/signing/components/request-form";

export default async function RequestPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const document = await getDocument(id);
  if (!document) redirect("/dashboard/documents");

  return <RequestForm document={document} />;
}
