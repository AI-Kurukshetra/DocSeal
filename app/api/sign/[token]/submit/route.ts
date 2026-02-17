import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { createServiceClient } from "@/lib/supabase/server";

type SignaturePayload = {
  document_field_id: string;
  data_url?: string;
  signature_path?: string;
};

type FieldValuePayload = {
  document_field_id: string;
  value: string;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function sanitizeFilename(input: string) {
  const base = input.trim() || "signed-document";
  return `${base.replace(/[^a-z0-9-_]+/gi, "_")}.pdf`;
}

async function sendSignedEmail(params: {
  to: string;
  documentTitle: string;
  signerEmail: string;
  senderName: string;
  downloadUrl: string | null;
  attachment: Buffer;
}) {
  if (!process.env.RESEND_API_KEY) return;

  const { Resend } = await import("resend");
  const resend = new Resend(process.env.RESEND_API_KEY);

  const subject = `Signed: ${params.documentTitle}`;
  const downloadLink = params.downloadUrl
    ? `<a href="${params.downloadUrl}" style="color: #7C3AED;">Download signed PDF</a>`
    : "";

  await resend.emails.send({
    from: "onboarding@resend.dev",
    to: params.to,
    subject,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #7C3AED;">DocSeal</h2>
        <p>The document <strong>${params.documentTitle}</strong> has been signed.</p>
        <p>Signer: ${params.signerEmail}</p>
        <p>Sender: ${params.senderName}</p>
        ${downloadLink ? `<p>${downloadLink}</p>` : ""}
        <p style="color: #999; margin-top: 24px; font-size: 12px;">
          If the download link expires, contact the sender for a new copy.
        </p>
      </div>
    `,
    attachments: [
      {
        filename: sanitizeFilename(params.documentTitle),
        content: params.attachment,
        contentType: "application/pdf",
      },
    ],
  });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const supabase = createServiceClient();

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { field_values, signature_data } = body as {
    field_values: FieldValuePayload[];
    signature_data?: SignaturePayload[] | string;
  };

  const normalizedFieldValues = Array.isArray(field_values)
    ? field_values
    : [];

  try {

  const { data: signingRequest } = await supabase
    .from("signing_requests")
    .select(
      `
        *,
        document:documents(
          id,
          sender_id,
          title,
          file_url,
          converted_pdf_url,
          sender:profiles!sender_id(full_name, email),
          document_fields(*)
        )
      `,
    )
    .eq("token", token)
    .single();

  if (!signingRequest) {
    return NextResponse.json({ error: "Invalid signing link" }, { status: 404 });
  }

  if (signingRequest.status === "signed") {
    return NextResponse.json({ error: "Already signed" }, { status: 409 });
  }

  if (signingRequest.status === "cancelled") {
    return NextResponse.json({ error: "Request cancelled" }, { status: 410 });
  }

  const doc = signingRequest.document as any;
  if (!doc) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }
  const recipientEmail = signingRequest.recipient_email.trim().toLowerCase();
  const fields = (doc.document_fields || []) as Array<{
    id: string;
    type: string;
    label: string;
    font_size: number;
    page_number: number;
    position_x: number;
    position_y: number;
    width: number;
    height: number;
  }>;

  const normalizedSignaturePayloads: SignaturePayload[] = Array.isArray(
    signature_data,
  )
    ? signature_data
    : [];

  const signaturePayloadByField = new Map(
    normalizedSignaturePayloads.map((payload) => [
      payload.document_field_id,
      payload,
    ]),
  );

  const signaturePathsByField: Record<string, string> = {};
  const signatureBuffersByField: Record<string, Buffer> = {};
  let primarySignatureFieldId: string | null = null;
  let primaryInitialsFieldId: string | null = null;

  for (const field of fields) {
    if (field.type !== "signature" && field.type !== "initials") continue;
    const payload = signaturePayloadByField.get(field.id);
    if (!payload) continue;

    let buffer: Buffer | null = null;
    if (payload.data_url) {
      buffer = Buffer.from(
        payload.data_url.replace(/^data:image\/\w+;base64,/, ""),
        "base64",
      );
    } else if (payload.signature_path) {
      const { data: signatureData, error: signatureDownloadError } =
        await supabase.storage
          .from("signatures")
          .download(payload.signature_path);
      if (signatureDownloadError || !signatureData) {
        return NextResponse.json(
          { error: "Failed to load saved signature" },
          { status: 500 },
        );
      }
      buffer = Buffer.from(await signatureData.arrayBuffer());
    }

    if (!buffer) continue;

    const signaturePath = `requests/${signingRequest.id}/${field.id}.png`;
    const { error: uploadError } = await supabase.storage
      .from("signatures")
      .upload(signaturePath, buffer, {
        contentType: "image/png",
        upsert: true,
      });

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    signaturePathsByField[field.id] = signaturePath;
    signatureBuffersByField[field.id] = buffer;

    if (field.type === "signature" && !primarySignatureFieldId) {
      primarySignatureFieldId = field.id;
    } else if (field.type === "initials" && !primaryInitialsFieldId) {
      primaryInitialsFieldId = field.id;
    }
  }

  const primaryFieldId = primarySignatureFieldId || primaryInitialsFieldId;
  const primarySignaturePath = primaryFieldId
    ? signaturePathsByField[primaryFieldId]
    : null;
  const primarySignatureBuffer = primaryFieldId
    ? signatureBuffersByField[primaryFieldId]
    : null;

  if (primarySignatureBuffer) {
    const emailHash = createHash("sha256")
      .update(recipientEmail)
      .digest("hex");
    const savedSignaturePath = `saved/${emailHash}/signature.png`;

    const { error: savedUploadError } = await supabase.storage
      .from("signatures")
      .upload(savedSignaturePath, primarySignatureBuffer, {
        contentType: "image/png",
        upsert: true,
      });

    if (savedUploadError) {
      return NextResponse.json(
        { error: savedUploadError.message },
        { status: 500 },
      );
    }

    const { error: savedUpsertError } = await supabase
      .from("recipient_signatures")
      .upsert(
        {
          recipient_email: recipientEmail,
          signature_path: savedSignaturePath,
        },
        { onConflict: "recipient_email" },
      );

    if (savedUpsertError) {
      return NextResponse.json(
        { error: savedUpsertError.message },
        { status: 500 },
      );
    }
  }

  if (normalizedFieldValues.length > 0) {
    const { error: valuesError } = await supabase.from("field_values").insert(
      normalizedFieldValues.map((fv) => ({
        signing_request_id: signingRequest.id,
        document_field_id: fv.document_field_id,
        value: fv.value,
      })),
    );

    if (valuesError) {
      return NextResponse.json({ error: valuesError.message }, { status: 500 });
    }
  }

  const docBucket = doc.converted_pdf_url ? "converted" : "documents";
  const docPath = doc.converted_pdf_url || doc.file_url;
  const { data: pdfData, error: pdfError } = await supabase.storage
    .from(docBucket)
    .download(docPath);

  if (pdfError || !pdfData) {
    return NextResponse.json({ error: "Failed to load document" }, { status: 500 });
  }

  const pdfBuffer = await pdfData.arrayBuffer();
  const pdfDoc = await PDFDocument.load(pdfBuffer);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

  const fieldValueMap = new Map(
    normalizedFieldValues.map((fv) => [fv.document_field_id, fv.value]),
  );

  for (const field of fields) {
    const pageIndex = field.page_number - 1;
    if (pageIndex < 0 || pageIndex >= pdfDoc.getPageCount()) continue;
    const page = pdfDoc.getPage(pageIndex);

    const { width: pageWidth, height: pageHeight } = page.getSize();
    const boxWidth = (field.width / 100) * pageWidth;
    const boxHeight = (field.height / 100) * pageHeight;
    const x = (field.position_x / 100) * pageWidth;
    const y = pageHeight - (field.position_y / 100) * pageHeight - boxHeight;
    const value = fieldValueMap.get(field.id) || "";

    switch (field.type) {
      case "text":
      case "date":
      case "dropdown": {
        if (!value) break;
        const fontSize = clamp(field.font_size || 12, 8, 28);
        page.drawText(value, {
          x: x + 4,
          y: y + (boxHeight - fontSize) / 2,
          size: fontSize,
          font,
          color: rgb(0, 0, 0),
          maxWidth: Math.max(boxWidth - 8, 0),
        });
        break;
      }
      case "checkbox": {
        if (value !== "true") break;
        const cbSize = clamp(field.font_size || 12, 8, 18);
        const cbX = x + 2;
        const cbY = y + (boxHeight - cbSize) / 2;
        // Draw checkbox border
        page.drawRectangle({
          x: cbX,
          y: cbY,
          width: cbSize,
          height: cbSize,
          borderColor: rgb(0, 0, 0),
          borderWidth: 1,
          color: rgb(1, 1, 1),
        });
        // Draw checkmark lines inside the box
        const inset = cbSize * 0.2;
        const lw = clamp(cbSize * 0.12, 0.8, 2);
        page.drawLine({
          start: { x: cbX + inset, y: cbY + cbSize * 0.5 },
          end: { x: cbX + cbSize * 0.4, y: cbY + inset },
          thickness: lw,
          color: rgb(0, 0, 0),
        });
        page.drawLine({
          start: { x: cbX + cbSize * 0.4, y: cbY + inset },
          end: { x: cbX + cbSize - inset, y: cbY + cbSize - inset },
          thickness: lw,
          color: rgb(0, 0, 0),
        });
        // Draw label text next to checkbox
        if (field.label) {
          const labelSize = clamp(field.font_size || 10, 8, 16);
          page.drawText(field.label, {
            x: cbX + cbSize + 4,
            y: cbY + (cbSize - labelSize) / 2,
            size: labelSize,
            font,
            color: rgb(0, 0, 0),
            maxWidth: Math.max(boxWidth - cbSize - 8, 0),
          });
        }
        break;
      }
      case "signature":
      case "initials": {
        const signatureBuffer = signatureBuffersByField[field.id];
        if (!signatureBuffer) break;
        const image = await pdfDoc.embedPng(signatureBuffer);
        const scale = Math.min(
          boxWidth / image.width,
          boxHeight / image.height,
        );
        const drawWidth = image.width * scale;
        const drawHeight = image.height * scale;
        page.drawImage(image, {
          x: x + (boxWidth - drawWidth) / 2,
          y: y + (boxHeight - drawHeight) / 2,
          width: drawWidth,
          height: drawHeight,
        });
        break;
      }
      default:
        break;
    }
  }

  const signedPdfBytes = await pdfDoc.save();
  const signedPdfBuffer = Buffer.from(signedPdfBytes);
  const signedPdfPath = `signed/${doc.id}/${signingRequest.id}.pdf`;

  const { error: signedUploadError } = await supabase.storage
    .from("signed")
    .upload(signedPdfPath, signedPdfBuffer, {
      contentType: "application/pdf",
      upsert: true,
    });

  if (signedUploadError) {
    return NextResponse.json(
      { error: signedUploadError.message },
      { status: 500 },
    );
  }

  const { data: signedUrlData } = await supabase.storage
    .from("signed")
    .createSignedUrl(signedPdfPath, 60 * 60 * 24 * 7);

  await supabase
    .from("signing_requests")
    .update({
      status: "signed",
      signed_at: new Date().toISOString(),
      signature_url: primarySignaturePath,
      signed_file_url: signedPdfPath,
    })
    .eq("id", signingRequest.id);

  const { data: allRequests } = await supabase
    .from("signing_requests")
    .select("status")
    .eq("document_id", doc.id);

  const allSigned = allRequests?.every(
    (r) => r.status === "signed" || r.status === "cancelled",
  );

  if (allSigned) {
    await supabase
      .from("documents")
      .update({ status: "completed" })
      .eq("id", doc.id);
  }

  await supabase.from("activity_log").insert({
    document_id: doc.id,
    user_id: signingRequest.recipient_id,
    action: "document_signed",
    metadata: { recipient_email: signingRequest.recipient_email },
  });

  try {
    const senderEmail = doc.sender?.email;
    const senderName = doc.sender?.full_name || doc.sender?.email || "Sender";

    if (senderEmail) {
      await sendSignedEmail({
        to: senderEmail,
        documentTitle: doc.title,
        signerEmail: signingRequest.recipient_email,
        senderName,
        downloadUrl: signedUrlData?.signedUrl || null,
        attachment: signedPdfBuffer,
      });
    }

    await sendSignedEmail({
      to: signingRequest.recipient_email,
      documentTitle: doc.title,
      signerEmail: signingRequest.recipient_email,
      senderName,
      downloadUrl: signedUrlData?.signedUrl || null,
      attachment: signedPdfBuffer,
    });
  } catch (emailError) {
    console.error("Failed to send signed email", emailError);
  }

  return NextResponse.json({ success: true });

  } catch (err) {
    console.error("Signing submit error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 },
    );
  }
}
