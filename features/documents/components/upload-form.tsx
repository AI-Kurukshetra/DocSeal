"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UploadDropzone } from "./upload-dropzone";
import { createDocument } from "../actions";
import { uploadSchema, getFileType } from "../schemas";
import { createClient } from "@/lib/supabase/client";

export function UploadForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [file, setFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  const form = useForm({
    resolver: zodResolver(uploadSchema),
    defaultValues: { title: "" },
  });

  async function onSubmit(data: { title: string }) {
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
        toast.success("Document uploaded successfully");

        router.push(`/dashboard/documents/${result.data!.id}/prepare`);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Upload failed");
        setUploadProgress(0);
      }
    });
  }

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Upload Document</CardTitle>
      </CardHeader>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <CardContent className="space-y-6">
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

          <Button type="submit" className="w-full" disabled={isPending || !file}>
            {isPending ? "Uploading..." : "Upload & Prepare"}
          </Button>
        </CardContent>
      </form>
    </Card>
  );
}
