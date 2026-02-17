"use client";

import { useState, useCallback, useTransition } from "react";
import { useRouter } from "next/navigation";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Save, Send } from "lucide-react";
import { FieldToolbar } from "./field-toolbar";
import { PdfCanvas } from "./pdf-canvas";
import { PropertiesPanel } from "./properties-panel";
import { saveFields } from "../actions";
import type { PlacedField } from "../types";
import type { Document, DocumentField } from "@/types";

interface PrepareEditorProps {
  document: Document;
  existingFields: DocumentField[];
  fileUrl: string;
}

export function PrepareEditor({
  document,
  existingFields,
  fileUrl,
}: PrepareEditorProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [fields, setFields] = useState<PlacedField[]>(
    existingFields.map((f) => ({
      id: crypto.randomUUID(),
      db_id: f.id,
      type: f.type,
      label: f.label,
      placeholder: f.placeholder || "",
      required: f.required,
      validation: f.validation || "none",
      font_size: f.font_size,
      page_number: f.page_number,
      position_x: f.position_x,
      position_y: f.position_y,
      width: f.width,
      height: f.height,
      options: Array.isArray(f.options) ? f.options : [],
    })),
  );

  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);

  const selectedField = fields.find((f) => f.id === selectedFieldId) || null;

  const handleFieldAdd = useCallback((field: PlacedField) => {
    setFields((prev) => [...prev, field]);
    setSelectedFieldId(field.id);
  }, []);

  const handleFieldMove = useCallback((fieldId: string, x: number, y: number) => {
    setFields((prev) =>
      prev.map((f) =>
        f.id === fieldId ? { ...f, position_x: x, position_y: y } : f,
      ),
    );
  }, []);

  const handleFieldResize = useCallback(
    (fieldId: string, width: number, height: number) => {
      setFields((prev) =>
        prev.map((f) =>
          f.id === fieldId ? { ...f, width, height } : f,
        ),
      );
    },
    [],
  );

  const handleFieldUpdate = useCallback(
    (fieldId: string, updates: Partial<PlacedField>) => {
      setFields((prev) =>
        prev.map((f) => (f.id === fieldId ? { ...f, ...updates } : f)),
      );
    },
    [],
  );

  const handleFieldDelete = useCallback(
    (fieldId: string) => {
      setFields((prev) => prev.filter((f) => f.id !== fieldId));
      if (selectedFieldId === fieldId) setSelectedFieldId(null);
    },
    [selectedFieldId],
  );

  async function handleSave(andContinue = false) {
    startTransition(async () => {
      const result = await saveFields(
        document.id,
        fields.map((f) => ({
          type: f.type,
          label: f.label,
          placeholder: f.placeholder || null,
          required: f.required,
          validation: f.validation || "none",
          font_size: f.font_size,
          page_number: f.page_number,
          position_x: f.position_x,
          position_y: f.position_y,
          width: f.width,
          height: f.height,
          options: f.options,
        })),
      );

      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Fields saved");
        if (andContinue) {
          router.push(`/dashboard/documents/${document.id}/request`);
        }
      }
    });
  }

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Delete" || e.key === "Backspace") {
        if (selectedFieldId && !(e.target instanceof HTMLInputElement)) {
          handleFieldDelete(selectedFieldId);
        }
      }
    },
    [selectedFieldId, handleFieldDelete],
  );

  return (
    <DndProvider backend={HTML5Backend}>
      <div
        className="flex flex-col h-[calc(100vh-8rem)]"
        onKeyDown={handleKeyDown}
        tabIndex={0}
      >
        <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-border">
          <div>
            <h2 className="font-semibold">{document.title}</h2>
            <p className="text-xs text-muted-foreground">
              {fields.length} field(s) placed
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => handleSave(false)}
              disabled={isPending}
            >
              <Save className="h-4 w-4 mr-2" />
              {isPending ? "Saving..." : "Save Draft"}
            </Button>
            <Button onClick={() => handleSave(true)} disabled={isPending}>
              <Send className="h-4 w-4 mr-2" />
              Continue to Send
            </Button>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          <FieldToolbar />
          <PdfCanvas
            fileUrl={fileUrl}
            fields={fields}
            selectedFieldId={selectedFieldId}
            onFieldAdd={handleFieldAdd}
            onFieldMove={handleFieldMove}
            onFieldResize={handleFieldResize}
            onFieldSelect={setSelectedFieldId}
            onFieldDelete={handleFieldDelete}
          />
          <PropertiesPanel field={selectedField} onUpdate={handleFieldUpdate} />
        </div>
      </div>
    </DndProvider>
  );
}
