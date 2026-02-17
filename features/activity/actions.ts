"use server";

import { createServerClient } from "@/lib/supabase/server";
import type { ActivityLogEntry } from "@/types";

export async function getGlobalActivity(
  limit: number = 50,
): Promise<ActivityLogEntry[]> {
  const supabase = await createServerClient();
  const { data } = await supabase
    .from("activity_log")
    .select("*, user:profiles(full_name, email), document:documents(title)")
    .order("created_at", { ascending: false })
    .limit(limit);

  return (data as ActivityLogEntry[]) || [];
}

export async function getDocumentActivity(
  documentId: string,
): Promise<ActivityLogEntry[]> {
  const supabase = await createServerClient();
  const { data } = await supabase
    .from("activity_log")
    .select("*, user:profiles(full_name, email)")
    .eq("document_id", documentId)
    .order("created_at", { ascending: false });

  return (data as ActivityLogEntry[]) || [];
}
