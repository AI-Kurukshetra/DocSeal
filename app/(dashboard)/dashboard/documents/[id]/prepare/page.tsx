import { redirect } from "next/navigation";
import { getDocument } from "@/features/documents/actions";
import { getFields } from "@/features/preparation/actions";
import { PrepareEditor } from "@/features/preparation/components/prepare-editor";
import { createServerClient } from "@/lib/supabase/server";

export default async function PreparePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const document = await getDocument(id);
  if (!document) redirect("/dashboard/documents");

  const fields = await getFields(id);

  const supabase = await createServerClient();
  const bucket = document.converted_pdf_url ? "converted" : "documents";
  const path = document.converted_pdf_url || document.file_url;

  const { data: signedUrl } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, 3600);

  if (!signedUrl?.signedUrl) redirect("/dashboard/documents");

  return (
    <PrepareEditor
      document={document}
      existingFields={fields}
      fileUrl={signedUrl.signedUrl}
    />
  );
}
