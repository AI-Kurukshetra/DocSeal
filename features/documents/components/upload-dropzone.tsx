"use client";

import { useCallback, useState, type ChangeEvent, type DragEvent } from "react";
import { Upload, File, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { validateFile } from "../schemas";

interface UploadDropzoneProps {
  onFileSelect: (file: File) => void;
  selectedFile: File | null;
  onClear: () => void;
}

export function UploadDropzone({
  onFileSelect,
  selectedFile,
  onClear,
}: UploadDropzoneProps) {
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = useCallback(
    (file: File) => {
      const validationError = validateFile(file);
      if (validationError) {
        setError(validationError);
        return;
      }
      setError(null);
      onFileSelect(file);
    },
    [onFileSelect],
  );

  const handleDrop = useCallback(
    (e: DragEvent<HTMLLabelElement>) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  if (selectedFile) {
    return (
      <div className="border-2 border-primary border-dashed rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary-50 flex items-center justify-center">
              <File className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium">{selectedFile.name}</p>
              <p className="text-xs text-muted-foreground">
                {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClear}
            className="text-muted-foreground hover:text-destructive"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <label
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={cn(
          "flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-12 cursor-pointer transition-colors",
          dragOver
            ? "border-primary bg-primary-50"
            : "border-border hover:border-primary/50",
        )}
      >
        <Upload
          className={cn(
            "h-10 w-10 mb-4",
            dragOver ? "text-primary" : "text-muted-foreground",
          )}
        />
        <p className="text-sm font-medium">
          {dragOver ? "Drop your file here" : "Drag & drop your file here"}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          PDF only — up to 10MB
        </p>
        <input
          type="file"
          className="hidden"
          accept=".pdf,application/pdf"
          onChange={handleInputChange}
        />
      </label>
      {error && <p className="text-sm text-destructive mt-2">{error}</p>}
    </div>
  );
}
