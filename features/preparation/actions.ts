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
    db_id?: string; // present if field already exists in DB
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

  // Separate fields into those being kept/updated vs freshly inserted
  const incomingDbIds = fields
    .map((f) => f.db_id)
    .filter((id): id is string => !!id);

  // Delete only the fields that are no longer in the incoming list
  if (incomingDbIds.length > 0) {
    const { error: deleteError } = await supabase
      .from("document_fields")
      .delete()
      .eq("document_id", documentId)
      .not("id", "in", `(${incomingDbIds.join(",")})`);

    if (deleteError) return { error: deleteError.message };
  } else {
    // No fields have a db_id — delete all existing ones for this document
    const { error: deleteError } = await supabase
      .from("document_fields")
      .delete()
      .eq("document_id", documentId);

    if (deleteError) return { error: deleteError.message };
  }

  if (fields.length > 0) {
    const toUpsert = fields.map((field) => ({
      ...(field.db_id ? { id: field.db_id } : {}),
      document_id: documentId,
      type: field.type,
      label: field.label,
      placeholder: field.placeholder,
      required: field.required,
      validation: field.validation,
      font_size: field.font_size,
      page_number: field.page_number,
      position_x: field.position_x,
      position_y: field.position_y,
      width: field.width,
      height: field.height,
      options: field.options,
    }));

    const { error: upsertError } = await supabase
      .from("document_fields")
      .upsert(toUpsert, { onConflict: "id" });

    if (upsertError) return { error: upsertError.message };
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
