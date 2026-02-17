import { z } from "zod";
import { MAX_FILE_SIZE } from "@/lib/constants";

export const uploadSchema = z.object({
  title: z.string().min(1, "Title is required").max(200, "Title too long"),
});

export function validateFile(file: File): string | null {
  const allowedTypes = ["application/pdf"];

  if (!allowedTypes.includes(file.type)) {
    return "Unsupported file type. Please upload a PDF.";
  }

  if (file.size > MAX_FILE_SIZE) {
    return "File size must be under 10MB.";
  }

  return null;
}

export function getFileType(mimeType: string): "pdf" | "image" | "doc" {
  if (mimeType === "application/pdf") return "pdf";
  throw new Error("Unsupported file type");
}
