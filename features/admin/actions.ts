"use server";

import { createServerClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { Profile, UserRole } from "@/types";

export async function getAdminStats() {
  const supabase = await createServerClient();

  const [usersRes, docsRes, requestsRes] = await Promise.all([
    supabase.from("profiles").select("role"),
    supabase.from("documents").select("status"),
    supabase.from("signing_requests").select("status"),
  ]);

  const users = usersRes.data || [];
  const docs = docsRes.data || [];
  const requests = requestsRes.data || [];

  const signedCount = requests.filter((r) => r.status === "signed").length;

  return {
    total_users: users.length,
    senders: users.filter((u) => u.role === "sender").length,
    recipients: users.filter((u) => u.role === "recipient").length,
    admins: users.filter((u) => u.role === "admin").length,
    total_documents: docs.length,
    pending_documents: docs.filter((d) => d.status === "pending").length,
    completed_documents: docs.filter((d) => d.status === "completed").length,
    total_requests: requests.length,
    signed_requests: signedCount,
    signing_rate:
      requests.length > 0 ? Math.round((signedCount / requests.length) * 100) : 0,
  };
}

export async function getAllUsers(): Promise<Profile[]> {
  const supabase = await createServerClient();
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false });

  return (data as Profile[]) || [];
}

export async function changeUserRole(userId: string, newRole: UserRole) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { data: callerProfile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (callerProfile?.role !== "admin") return { error: "Admin access required" };
  if (userId === user.id) return { error: "Cannot change your own role" };

  const { error } = await supabase
    .from("profiles")
    .update({ role: newRole })
    .eq("id", userId);

  if (error) return { error: error.message };

  revalidatePath("/dashboard/users");
  return { success: true };
}
