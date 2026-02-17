"use server";

import { createServerClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { SigningRequest } from "@/types";

export async function createSigningRequests(data: {
  document_id: string;
  recipients: { email: string; name?: string }[];
  message?: string;
}) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { data: doc } = await supabase
    .from("documents")
    .select("id, sender_id, title")
    .eq("id", data.document_id)
    .single();

  if (!doc || doc.sender_id !== user.id) return { error: "Not authorized" };

  const requests: {
    document_id: string;
    recipient_email: string;
    recipient_id: string | null;
    message: string | null;
  }[] = [];

  for (const recipient of data.recipients) {
    const { data: recipientProfile } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", recipient.email)
      .single();

    requests.push({
      document_id: data.document_id,
      recipient_email: recipient.email,
      recipient_id: recipientProfile?.id || null,
      message: data.message || null,
    });
  }

  const { data: createdRequests, error } = await supabase
    .from("signing_requests")
    .insert(requests)
    .select();

  if (error) return { error: error.message };

  await supabase
    .from("documents")
    .update({ status: "pending" })
    .eq("id", data.document_id);

  await supabase.from("activity_log").insert({
    document_id: data.document_id,
    user_id: user.id,
    action: "signature_requested",
    metadata: {
      recipient_count: data.recipients.length,
      recipients: data.recipients.map((r) => r.email),
    },
  });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  let emailsSent = false;

  if (process.env.RESEND_API_KEY) {
    emailsSent = true;
    for (const req of createdRequests || []) {
      try {
        await sendSigningEmail({
          to: req.recipient_email,
          documentTitle: doc.title,
          senderName: user.email || "Someone",
          message: data.message || "",
          signingUrl: `${appUrl}/sign/${req.token}`,
        });
      } catch (emailErr) {
        console.error("Failed to send email to", req.recipient_email, emailErr);
      }
    }
  }

  revalidatePath(`/dashboard/documents/${data.document_id}`);
  revalidatePath("/dashboard");

  return {
    data: createdRequests as SigningRequest[],
    emailsSent,
    signingLinks: (createdRequests || []).map((r) => ({
      email: r.recipient_email,
      url: `${appUrl}/sign/${r.token}`,
    })),
  };
}

export async function cancelSigningRequest(requestId: string) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { data: request } = await supabase
    .from("signing_requests")
    .select("*, document:documents(sender_id)")
    .eq("id", requestId)
    .single();

  const doc = request?.document as { sender_id: string } | null;
  if (!request || doc?.sender_id !== user.id) {
    return { error: "Not authorized" };
  }

  const { error } = await supabase
    .from("signing_requests")
    .update({ status: "cancelled" })
    .eq("id", requestId);

  if (error) return { error: error.message };

  await supabase.from("activity_log").insert({
    document_id: request.document_id,
    user_id: user.id,
    action: "request_cancelled",
    metadata: { recipient_email: request.recipient_email },
  });

  revalidatePath(`/dashboard/documents/${request.document_id}`);
  return { success: true };
}

export async function getRecipientSigningRequests() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: profile } = await supabase
    .from("profiles")
    .select("email")
    .eq("id", user.id)
    .single();
  if (!profile) return [];

  const { data } = await supabase
    .from("signing_requests")
    .select("*, document:documents(*, sender:profiles!sender_id(*))")
    .eq("recipient_email", profile.email)
    .order("created_at", { ascending: false });

  return (data as SigningRequest[]) || [];
}

export async function resendSigningEmail(requestId: string) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { data: request } = await supabase
    .from("signing_requests")
    .select("*, document:documents(id, title, sender_id)")
    .eq("id", requestId)
    .single();

  const resendDoc = request?.document as { sender_id: string; title: string } | null;
  if (!request || resendDoc?.sender_id !== user.id) {
    return { error: "Not authorized" };
  }

  if (request.status !== "pending" && request.status !== "viewed") {
    return { error: "Can only resend email for pending or viewed requests" };
  }

  if (!process.env.RESEND_API_KEY) {
    return { error: "Email not configured" };
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  try {
    await sendSigningEmail({
      to: request.recipient_email,
      documentTitle: resendDoc?.title ?? "",
      senderName: user.email || "Someone",
      message: request.message || "",
      signingUrl: `${appUrl}/sign/${request.token}`,
    });
    return { success: true };
  } catch (err) {
    console.error("Failed to resend email", err);
    return { error: "Failed to send email" };
  }
}

async function sendSigningEmail(params: {
  to: string;
  documentTitle: string;
  senderName: string;
  message: string;
  signingUrl: string;
}) {
  const { Resend } = await import("resend");
  const resend = new Resend(process.env.RESEND_API_KEY);

  const fromAddress =
    process.env.RESEND_FROM_EMAIL ?? "onboarding@resend.dev";

  await resend.emails.send({
    from: fromAddress,
    to: params.to,
    subject: `Please sign: ${params.documentTitle}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #7C3AED;">DocSeal</h2>
        <p><strong>${params.senderName}</strong> has requested your signature on:</p>
        <h3>${params.documentTitle}</h3>
        ${params.message ? `<p style="color: #666;">"${params.message}"</p>` : ""}
        <a href="${params.signingUrl}"
           style="display: inline-block; background: #7C3AED; color: white; padding: 12px 24px;
                  border-radius: 8px; text-decoration: none; margin-top: 16px;">
          Sign Now
        </a>
        <p style="color: #999; margin-top: 24px; font-size: 12px;">
          Or copy this link: ${params.signingUrl}
        </p>
      </div>
    `,
  });
}
