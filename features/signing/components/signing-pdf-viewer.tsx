"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FieldRenderer } from "./field-renderer";
import type { DocumentField } from "@/types";
import type { SavedSignature, SignaturePayload } from "@/features/signing/types";

type PdfModule = {
  Document: React.ComponentType<any>;
  Page: React.ComponentType<any>;
  pdfjs: { GlobalWorkerOptions: { workerSrc: string } };
};

interface SigningPdfViewerProps {
  fileUrl: string;
  fields: DocumentField[];
  fieldValues: Record<string, string>;
  onFieldChange: (fieldId: string, value: string) => void;
  onSignatureChange: (fieldId: string, payload: SignaturePayload) => void;
  savedSignature?: SavedSignature | null;
}

export function SigningPdfViewer({
  fileUrl,
  fields,
  fieldValues,
  onFieldChange,
  onSignatureChange,
  savedSignature = null,
}: SigningPdfViewerProps) {
  const measureRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [pdf, setPdf] = useState<PdfModule | null>(null);
  const [numPages, setNumPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageWidth, setPageWidth] = useState(720);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      const mod = await import("react-pdf");
      mod.pdfjs.GlobalWorkerOptions.workerSrc = new URL(
        "pdfjs-dist/build/pdf.worker.min.mjs",
        import.meta.url,
      ).toString();
      if (isMounted) {
        setPdf({ Document: mod.Document, Page: mod.Page, pdfjs: mod.pdfjs });
      }
    })();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!measureRef.current) return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        setPageWidth(Math.floor(entry.contentRect.width));
      }
    });
    observer.observe(measureRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (currentPage > numPages) setCurrentPage(numPages);
  }, [numPages, currentPage]);

  const pageFields = useMemo(
    () => fields.filter((f) => f.page_number === currentPage),
    [fields, currentPage],
  );

  const setRef = useCallback((node: HTMLDivElement | null) => {
    containerRef.current = node;
  }, []);

  const PdfDocument = pdf?.Document;
  const PdfPage = pdf?.Page;

  return (
    <div className="flex flex-col items-center py-8">
      <div className="flex items-center gap-4 mb-4">
        <Button
          variant="outline"
          size="icon"
          onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
          disabled={currentPage <= 1}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm">
          Page {currentPage} of {numPages || "..."}
        </span>
        <Button
          variant="outline"
          size="icon"
          onClick={() => setCurrentPage((p) => Math.min(numPages, p + 1))}
          disabled={currentPage >= numPages}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <div ref={measureRef} className="w-full max-w-5xl">
        <div ref={setRef} className="relative shadow-lg bg-white w-full">
          {!PdfDocument || !PdfPage ? (
            <div className="p-6 text-sm text-muted-foreground">
              Loading PDF...
            </div>
          ) : (
            <PdfDocument
              file={fileUrl}
              onLoadSuccess={({ numPages: pages }) => setNumPages(pages)}
              loading={<div className="p-6 text-sm text-muted-foreground">Loading PDF...</div>}
              error={<div className="p-6 text-sm text-destructive">Failed to load PDF.</div>}
            >
              <PdfPage
                pageNumber={currentPage}
                width={pageWidth}
                renderAnnotationLayer={false}
                renderTextLayer={false}
              />
            </PdfDocument>
          )}

          {pageFields.map((field) => (
            <FieldRenderer
              key={field.id}
              field={field}
              value={fieldValues[field.id] || ""}
              onChange={(value) => onFieldChange(field.id, value)}
              onSignatureChange={(data) => onSignatureChange(field.id, data)}
              savedSignature={savedSignature}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
