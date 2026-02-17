"use server";

import { createServerClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { DocumentField } from "@/types";

export async function getFields(documentId: string): Promise<DocumentField[]> {
  const supabase = await createServerClient();
  const { data } = await supabase
    .from("document_fields")
    .select("*")
    .eq("document_id", documentId)
    .order("created_at", { ascending: true });

  return (data as DocumentField[]) || [];
}

export async function saveFields(
  documentId: string,
  fields: Array<{
    type: DocumentField["type"];
    label: DocumentField["label"];
    placeholder: DocumentField["placeholder"];
    required: DocumentField["required"];
    validation: DocumentField["validation"];
    font_size: DocumentField["font_size"];
    page_number: DocumentField["page_number"];
    position_x: DocumentField["position_x"];
    position_y: DocumentField["position_y"];
    width: DocumentField["width"];
    height: DocumentField["height"];
    options: DocumentField["options"];
  }>,
) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { error: deleteError } = await supabase
    .from("document_fields")
    .delete()
    .eq("document_id", documentId);

  if (deleteError) return { error: deleteError.message };

  if (fields.length > 0) {
    const { error: insertError } = await supabase
      .from("document_fields")
      .insert(
        fields.map((field) => ({
          ...field,
          document_id: documentId,
        })),
      );

    if (insertError) return { error: insertError.message };
  }

  await supabase.from("activity_log").insert({
    document_id: documentId,
    user_id: user.id,
    action: "document_prepared",
    metadata: { field_count: fields.length },
  });

  revalidatePath(`/dashboard/documents/${documentId}/prepare`);
  return { success: true };
}
