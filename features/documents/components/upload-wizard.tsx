"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Check, Upload, FileText, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { UploadDropzone } from "./upload-dropzone";
import { createDocument } from "../actions";
import { uploadSchema, getFileType } from "../schemas";
import { createClient } from "@/lib/supabase/client";
import { PrepareEditor } from "@/features/preparation/components/prepare-editor";
import { RequestForm } from "@/features/signing/components/request-form";
import { getFields } from "@/features/preparation/actions";
import type { Document, DocumentField } from "@/types";

const STEPS = [
  { number: 1, label: "Upload", icon: Upload },
  { number: 2, label: "Preview", icon: FileText },
  { number: 3, label: "Recipients", icon: Users },
] as const;

export function UploadWizard() {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [document, setDocument] = useState<Document | null>(null);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [existingFields, setExistingFields] = useState<DocumentField[]>([]);
  const [isPending, startTransition] = useTransition();
  const [file, setFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  const form = useForm({
    resolver: zodResolver(uploadSchema),
    defaultValues: { title: "" },
  });

  async function onUploadSubmit(data: { title: string }) {
    if (!file) {
      toast.error("Please select a file");
      return;
    }

    startTransition(async () => {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) throw new Error("Not authenticated");

        const fileExt = file.name.split(".").pop();
        const filePath = `${user.id}/${crypto.randomUUID()}.${fileExt}`;

        setUploadProgress(30);

        const { error: uploadError } = await supabase.storage
          .from("documents")
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        setUploadProgress(70);

        const fileType = getFileType(file.type);

        let convertedPdfUrl: string | undefined;
        if (fileType === "doc") {
          const conversionRes = await fetch("/api/convert", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ filePath, bucket: "documents" }),
          });
          if (conversionRes.ok) {
            const conversionData = await conversionRes.json();
            convertedPdfUrl = conversionData.convertedPath;
          }
        }

        setUploadProgress(90);

        const result = await createDocument({
          title: data.title,
          file_url: filePath,
          file_type: fileType,
          converted_pdf_url: convertedPdfUrl,
        });

        if (result.error) throw new Error(result.error);

        setUploadProgress(100);

        const pdfPath = convertedPdfUrl || filePath;
        const { data: signedUrlData } = await supabase.storage
          .from(convertedPdfUrl ? "converted" : "documents")
          .createSignedUrl(pdfPath, 3600);

        if (!signedUrlData?.signedUrl) throw new Error("Failed to get file URL");

        setDocument(result.data as Document);
        setFileUrl(signedUrlData.signedUrl);
        setStep(2);
        toast.success("Document uploaded successfully");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Upload failed");
        setUploadProgress(0);
      }
    });
  }

  async function handleBackToStep2() {
    if (!document) return;
    const fields = await getFields(document.id);
    setExistingFields(fields);
    setStep(2);
  }

  return (
    <div className={cn("space-y-6", step !== 2 && "max-w-5xl mx-auto")}>
      {/* Stepper */}
      <nav className="flex items-center justify-center gap-2">
        {STEPS.map((s, i) => {
          const isCompleted = step > s.number;
          const isCurrent = step === s.number;
          const Icon = s.icon;
          return (
            <div key={s.number} className="flex items-center">
              {i > 0 && (
                <div
                  className={cn(
                    "w-12 h-0.5 mx-2",
                    step > s.number ? "bg-primary" : "bg-border",
                  )}
                />
              )}
              <div className="flex items-center gap-2">
                <div
                  className={cn(
                    "h-8 w-8 rounded-full flex items-center justify-center text-sm font-medium border-2 transition-colors",
                    isCompleted &&
                      "bg-primary border-primary text-primary-foreground",
                    isCurrent && "border-primary text-primary bg-primary/10",
                    !isCompleted &&
                      !isCurrent &&
                      "border-muted-foreground/30 text-muted-foreground",
                  )}
                >
                  {isCompleted ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Icon className="h-4 w-4" />
                  )}
                </div>
                <span
                  className={cn(
                    "text-sm font-medium hidden sm:inline",
                    isCurrent && "text-primary",
                    !isCurrent && "text-muted-foreground",
                  )}
                >
                  {s.label}
                </span>
              </div>
            </div>
          );
        })}
      </nav>

      {/* Step 1: Upload */}
      {step === 1 && (
        <Card className="max-w-2xl mx-auto">
          <form onSubmit={form.handleSubmit(onUploadSubmit)}>
            <CardContent className="space-y-6 pt-6">
              {document ? (
                <div className="border-2 border-primary border-dashed rounded-lg p-6">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <FileText className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{document.title}</p>
                      <p className="text-xs text-muted-foreground">
                        Already uploaded
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="title">Document Title</Label>
                    <Input
                      id="title"
                      placeholder="e.g. Employment Contract"
                      {...form.register("title")}
                    />
                    {form.formState.errors.title && (
                      <p className="text-sm text-destructive">
                        {form.formState.errors.title.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>File</Label>
                    <UploadDropzone
                      onFileSelect={setFile}
                      selectedFile={file}
                      onClear={() => setFile(null)}
                    />
                  </div>

                  {uploadProgress > 0 && uploadProgress < 100 && (
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-primary h-2 rounded-full transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  )}

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={isPending || !file}
                  >
                    {isPending ? "Uploading..." : "Upload & Continue"}
                  </Button>
                </>
              )}

              {document && (
                <Button
                  type="button"
                  className="w-full"
                  onClick={() => setStep(2)}
                >
                  Continue to Preview
                </Button>
              )}
            </CardContent>
          </form>
        </Card>
      )}

      {/* Step 2: Preview/Prepare */}
      {step === 2 && document && fileUrl && (
        <PrepareEditor
          document={document}
          existingFields={existingFields}
          fileUrl={fileUrl}
          wizardMode
          onWizardComplete={() => setStep(3)}
          onWizardBack={() => setStep(1)}
        />
      )}

      {/* Step 3: Recipients */}
      {step === 3 && document && (
        <RequestForm
          document={document}
          wizardMode
          onBack={handleBackToStep2}
        />
      )}
    </div>
  );
}
