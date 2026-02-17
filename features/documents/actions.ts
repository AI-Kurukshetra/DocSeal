"use server";

import { createServerClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { Document, DocumentStatus } from "@/types";

export async function createDocument(data: {
  title: string;
  file_url: string;
  file_type: "pdf" | "image" | "doc";
  converted_pdf_url?: string;
}) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { data: doc, error } = await supabase
    .from("documents")
    .insert({
      title: data.title,
      file_url: data.file_url,
      file_type: data.file_type,
      converted_pdf_url: data.converted_pdf_url || null,
      status: "draft" as DocumentStatus,
      sender_id: user.id,
    })
    .select()
    .single();

  if (error) return { error: error.message };

  await supabase.from("activity_log").insert({
    document_id: doc.id,
    user_id: user.id,
    action: "document_uploaded",
    metadata: { file_type: data.file_type, title: data.title },
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/documents");
  return { data: doc };
}

export async function getDocuments(): Promise<Document[]> {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  let query = supabase
    .from("documents")
    .select("*, sender:profiles!sender_id(*), signing_requests(*)")
    .order("created_at", { ascending: false });

  if (profile?.role !== "admin") {
    query = query.eq("sender_id", user.id);
  }

  const { data } = await query;
  return (data as Document[]) || [];
}

export async function getDocument(id: string): Promise<Document | null> {
  const supabase = await createServerClient();
  const { data } = await supabase
    .from("documents")
    .select(
      "*, sender:profiles!sender_id(*), signing_requests(*), document_fields(*)",
    )
    .eq("id", id)
    .single();

  return data as Document | null;
}

export async function deleteDocument(id: string) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { error } = await supabase
    .from("documents")
    .delete()
    .eq("id", id)
    .eq("sender_id", user.id)
    .eq("status", "draft");

  if (error) return { error: error.message };

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/documents");
  return { success: true };
}

export async function getDocumentStats() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { total: 0, pending: 0, completed: 0, declined: 0 };

  const { data } = await supabase
    .from("documents")
    .select("status")
    .eq("sender_id", user.id);

  const docs = data || [];
  return {
    total: docs.length,
    pending: docs.filter((d) => d.status === "pending").length,
    completed: docs.filter(
      (d) => d.status === "completed" || d.status === "signed",
    ).length,
    declined: 0,
  };
}
