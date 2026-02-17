"use client";

import { useState, useCallback, useMemo } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { SigningPdfViewer } from "./signing-pdf-viewer";
import { SigningSuccess } from "./signing-success";
import type { DocumentField } from "@/types";
import type { SavedSignature, SignaturePayload } from "@/features/signing/types";

interface SigningPageProps {
  token: string;
  request: {
    id: string;
    status: string;
    recipient_email: string;
    message: string | null;
  };
  document: {
    id: string;
    title: string;
    file_type: string;
    file_url: string | null;
    sender_name: string;
  };
  fields: DocumentField[];
  savedSignature?: SavedSignature | null;
}

export function SigningPage({
  token,
  request,
  document,
  fields,
  savedSignature = null,
}: SigningPageProps) {
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [agreed, setAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [signatureDataByField, setSignatureDataByField] = useState<
    Record<string, SignaturePayload>
  >({});

  const requiredFields = useMemo(
    () => fields.filter((f) => f.required),
    [fields],
  );

  const handleFieldChange = useCallback((fieldId: string, value: string) => {
    setFieldValues((prev) => ({ ...prev, [fieldId]: value }));
  }, []);

  const handleSignatureChange = useCallback(
    (fieldId: string, payload: SignaturePayload) => {
      setSignatureDataByField((prev) => ({ ...prev, [fieldId]: payload }));
      setFieldValues((prev) => ({ ...prev, [fieldId]: "signed" }));
    },
    [],
  );

  const allRequiredFilled = requiredFields.every((f) => {
    const val = fieldValues[f.id];
    if (f.type === "checkbox") return val === "true";
    return val && val.trim() !== "";
  });

  const remainingRequired = requiredFields.filter((f) => {
    const val = fieldValues[f.id];
    if (f.type === "checkbox") return val !== "true";
    return !val || val.trim() === "";
  }).length;

  const canSubmit = allRequiredFilled && agreed && !submitting;

  function validateFieldValue(field: DocumentField, value: string): string | null {
    if (field.required && (!value || value.trim() === "")) {
      return "This field is required";
    }
    if (!value) return null;

    switch (field.validation) {
      case "number":
        if (Number.isNaN(Number(value))) return "Must be a number";
        break;
      case "email":
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          return "Invalid email";
        }
        break;
      case "phone":
        if (!/^[\d\s\-+()]{7,}$/.test(value)) {
          return "Invalid phone number";
        }
        break;
      default:
        break;
    }
    return null;
  }

  async function handleSubmit() {
    for (const field of requiredFields) {
      const val = fieldValues[field.id] || "";
      const error = validateFieldValue(field, val);
      if (error) {
        toast.error(`${field.label || field.type}: ${error}`);
        return;
      }
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/sign/${token}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          field_values: Object.entries(fieldValues).map(([fieldId, value]) => ({
            document_field_id: fieldId,
            value,
          })),
          signature_data: Object.entries(signatureDataByField).map(
            ([fieldId, payload]) => ({
              document_field_id: fieldId,
              data_url: payload.dataUrl,
              signature_path: payload.signaturePath,
            }),
          ),
        }),
      });

      if (!res.ok) {
        let message = "Submission failed";
        try {
          const data = await res.json();
          message = data.error || message;
        } catch {
          // Response was not JSON
        }
        throw new Error(message);
      }

      setCompleted(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to submit");
    } finally {
      setSubmitting(false);
    }
  }

  if (completed) {
    return <SigningSuccess documentTitle={document.title} />;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="bg-white border-b border-border px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded bg-primary flex items-center justify-center">
                <span className="text-white text-xs font-bold">DS</span>
              </div>
              <span className="font-bold text-primary">DocSeal</span>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm font-medium">{document.title}</p>
            <p className="text-xs text-muted-foreground">
              Sent by {document.sender_name}
            </p>
          </div>
        </div>
      </div>

      {request.message && (
        <div className="bg-primary-50 px-6 py-3">
          <p className="max-w-5xl mx-auto text-sm text-primary">
            &quot;{request.message}&quot;
          </p>
        </div>
      )}

      <div className="flex-1 overflow-auto">
        {document.file_url ? (
          <SigningPdfViewer
            fileUrl={document.file_url}
            fields={fields}
            fieldValues={fieldValues}
            onFieldChange={handleFieldChange}
            onSignatureChange={handleSignatureChange}
            savedSignature={savedSignature}
          />
        ) : (
          <div className="max-w-2xl mx-auto px-6 py-12 text-center text-sm text-muted-foreground">
            Unable to load the document file.
          </div>
        )}
      </div>

      <div className="bg-white border-t border-border px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <Checkbox
              id="agree"
              checked={agreed}
              onCheckedChange={(checked) => setAgreed(checked === true)}
            />
            <label htmlFor="agree" className="text-sm text-muted-foreground">
              I agree this constitutes my legal electronic signature
            </label>
          </div>
          <div className="flex items-center gap-4">
            <p className="text-xs text-muted-foreground">
              {remainingRequired} required field(s) remaining
            </p>
            <Button onClick={handleSubmit} disabled={!canSubmit}>
              {submitting ? "Signing..." : "Sign Document"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
