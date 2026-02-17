"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDrop } from "react-dnd";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { DND_FIELD_ITEM } from "../constants";
import { FieldOverlay } from "./field-overlay";
import type { FieldConfig, PlacedField } from "../types";

type PdfModule = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Document: React.ComponentType<any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Page: React.ComponentType<any>;
  pdfjs: { GlobalWorkerOptions: { workerSrc: string } };
};

interface PdfCanvasProps {
  fileUrl: string;
  fields: PlacedField[];
  selectedFieldId: string | null;
  onFieldAdd: (field: PlacedField) => void;
  onFieldMove: (fieldId: string, x: number, y: number) => void;
  onFieldResize: (fieldId: string, width: number, height: number) => void;
  onFieldSelect: (fieldId: string | null) => void;
  onFieldDelete: (fieldId: string) => void;
}

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

export function PdfCanvas({
  fileUrl,
  fields,
  selectedFieldId,
  onFieldAdd,
  onFieldMove,
  onFieldResize,
  onFieldSelect,
  onFieldDelete,
}: PdfCanvasProps) {
  const measureRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [pdf, setPdf] = useState<PdfModule | null>(null);
  const [numPages, setNumPages] = useState(1);
  const [pageNumber, setPageNumber] = useState(1);
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
    if (pageNumber > numPages) setPageNumber(numPages);
  }, [numPages, pageNumber]);

  const [{ isOver }, dropRef] = useDrop(() => ({
    accept: DND_FIELD_ITEM,
    drop: (item: { config: FieldConfig }, monitor) => {
      const client = monitor.getClientOffset();
      const container = containerRef.current;
      if (!client || !container) return;

      const rect = container.getBoundingClientRect();
      const x = ((client.x - rect.left) / rect.width) * 100;
      const y = ((client.y - rect.top) / rect.height) * 100;

      const newField: PlacedField = {
        id: crypto.randomUUID(),
        type: item.config.type,
        label: item.config.label,
        placeholder: item.config.placeholder || "",
        required: true,
        validation: "none",
        font_size: 14,
        page_number: pageNumber,
        position_x: clamp(x, 0, 100 - item.config.defaultWidth),
        position_y: clamp(y, 0, 100 - item.config.defaultHeight),
        width: item.config.defaultWidth,
        height: item.config.defaultHeight,
        options: item.config.options || [],
      };

      onFieldAdd(newField);
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
    }),
  }));

  const setRefs = useCallback(
    (node: HTMLDivElement | null) => {
      containerRef.current = node;
      dropRef(node);
    },
    [dropRef],
  );

  const fieldsForPage = useMemo(
    () => fields.filter((f) => f.page_number === pageNumber),
    [fields, pageNumber],
  );

  const PdfDocument = pdf?.Document;
  const PdfPage = pdf?.Page;

  return (
    <div className="flex-1 bg-gray-100 overflow-auto">
      <div className="flex items-center justify-between px-6 py-3 border-b border-border bg-white">
        <div className="text-sm text-muted-foreground">
          Page {pageNumber} of {numPages}
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPageNumber((p) => Math.max(1, p - 1))}
            disabled={pageNumber <= 1}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Prev
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPageNumber((p) => Math.min(numPages, p + 1))}
            disabled={pageNumber >= numPages}
          >
            Next
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </div>

      <div className="flex justify-center p-6">
        <div ref={measureRef} className="w-full max-w-5xl">
          <div
            ref={setRefs}
            className={cn(
              "relative bg-white shadow-md w-full",
              isOver && "ring-2 ring-primary/40",
            )}
          >
            {!PdfDocument || !PdfPage ? (
              <div className="p-6 text-sm text-muted-foreground">
                Loading PDF...
              </div>
            ) : (
              <PdfDocument
                file={fileUrl}
                onLoadSuccess={({ numPages: pages }: { numPages: number }) => setNumPages(pages)}
                loading={<div className="p-6 text-sm text-muted-foreground">Loading PDF...</div>}
                error={<div className="p-6 text-sm text-destructive">Failed to load PDF.</div>}
              >
                <PdfPage
                  pageNumber={pageNumber}
                  width={pageWidth}
                  renderAnnotationLayer={false}
                  renderTextLayer={false}
                />
              </PdfDocument>
            )}

            <div className="absolute inset-0">
              {fieldsForPage.map((field) => (
                <FieldOverlay
                  key={field.id}
                  field={field}
                  isSelected={selectedFieldId === field.id}
                  containerRef={containerRef}
                  onSelect={onFieldSelect}
                  onMove={onFieldMove}
                  onResize={onFieldResize}
                  onDelete={onFieldDelete}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
