import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const supabase = createServiceClient();

  const { data: signingRequest, error } = await supabase
    .from("signing_requests")
    .select(
      `
      *,
      document:documents(
        *,
        sender:profiles!sender_id(full_name, email),
        document_fields(*)
      )
    `,
    )
    .eq("token", token)
    .single();

  if (error || !signingRequest) {
    return NextResponse.json(
      { error: "Invalid signing link" },
      { status: 404 },
    );
  }

  if (signingRequest.status === "cancelled") {
    return NextResponse.json(
      { error: "This signing request has been cancelled", status: "cancelled" },
      { status: 410 },
    );
  }

  if (signingRequest.status === "signed") {
    return NextResponse.json(
      {
        error: "This document has already been signed",
        status: "signed",
        signed_at: signingRequest.signed_at,
      },
      { status: 409 },
    );
  }

  const doc = signingRequest.document as any;
  const bucket = doc.converted_pdf_url ? "converted" : "documents";
  const path = doc.converted_pdf_url || doc.file_url;

  const { data: fileUrl } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, 3600);

  const recipientEmail = signingRequest.recipient_email.trim().toLowerCase();
  let savedSignature: { url: string; path: string } | null = null;
  const { data: savedSignatureRow } = await supabase
    .from("recipient_signatures")
    .select("signature_path")
    .eq("recipient_email", recipientEmail)
    .maybeSingle();

  if (savedSignatureRow?.signature_path) {
    const { data: signatureUrl } = await supabase.storage
      .from("signatures")
      .createSignedUrl(savedSignatureRow.signature_path, 3600);
    if (signatureUrl?.signedUrl) {
      savedSignature = {
        url: signatureUrl.signedUrl,
        path: savedSignatureRow.signature_path,
      };
    }
  }

  let requestStatus = signingRequest.status;

  if (signingRequest.status === "pending") {
    requestStatus = "viewed";
    await supabase
      .from("signing_requests")
      .update({ status: "viewed" })
      .eq("id", signingRequest.id);

    await supabase.from("activity_log").insert({
      document_id: doc.id,
      user_id: signingRequest.recipient_id,
      action: "document_viewed",
      metadata: { recipient_email: signingRequest.recipient_email },
    });
  }

  return NextResponse.json({
    request: {
      id: signingRequest.id,
      status: requestStatus,
      recipient_email: signingRequest.recipient_email,
      message: signingRequest.message,
    },
    document: {
      id: doc.id,
      title: doc.title,
      file_type: doc.file_type,
      file_url: fileUrl?.signedUrl || null,
      sender_name: doc.sender?.full_name || doc.sender?.email || "Unknown",
    },
    fields: doc.document_fields || [],
    saved_signature: savedSignature,
  });
}
