"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Plus, X } from "lucide-react";
import type { PlacedField } from "../types";

interface PropertiesPanelProps {
  field: PlacedField | null;
  onUpdate: (fieldId: string, updates: Partial<PlacedField>) => void;
}

export function PropertiesPanel({ field, onUpdate }: PropertiesPanelProps) {
  if (!field) {
    return (
      <div className="w-72 border-l border-border bg-white p-6 flex items-center justify-center">
        <p className="text-sm text-muted-foreground text-center">
          Select a field on the document to edit its properties
        </p>
      </div>
    );
  }

  const update = (updates: Partial<PlacedField>) =>
    onUpdate(field.id, updates);

  return (
    <div className="w-72 border-l border-border bg-white p-4 space-y-5 overflow-y-auto">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        Field Properties
      </h3>

      <div className="space-y-1.5">
        <Label className="text-xs">Label</Label>
        <Input
          value={field.label}
          onChange={(e) => update({ label: e.target.value })}
          placeholder="Field label"
        />
      </div>

      {field.type !== "checkbox" && (
        <div className="space-y-1.5">
          <Label className="text-xs">Placeholder</Label>
          <Input
            value={field.placeholder}
            onChange={(e) => update({ placeholder: e.target.value })}
            placeholder="Placeholder text"
          />
        </div>
      )}

      <div className="flex items-center justify-between">
        <Label className="text-xs">Required</Label>
        <Switch
          checked={field.required}
          onCheckedChange={(checked) => update({ required: checked })}
        />
      </div>

      {field.type === "text" && (
        <div className="space-y-1.5">
          <Label className="text-xs">Validation</Label>
          <Select
            value={field.validation}
            onValueChange={(v) =>
              update({ validation: v as PlacedField["validation"] })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
              <SelectItem value="number">Number only</SelectItem>
              <SelectItem value="email">Email</SelectItem>
              <SelectItem value="phone">Phone</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {["text", "date", "initials"].includes(field.type) && (
        <div className="space-y-1.5">
          <Label className="text-xs">Font Size: {field.font_size}px</Label>
          <input
            type="range"
            min={8}
            max={32}
            step={1}
            value={field.font_size}
            onChange={(e) => update({ font_size: Number(e.target.value) })}
            className="w-full"
          />
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1.5">
          <Label className="text-xs">Width (%)</Label>
          <Input
            type="number"
            min={1}
            max={100}
            value={field.width}
            onChange={(e) => update({ width: Number(e.target.value) })}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Height (%)</Label>
          <Input
            type="number"
            min={1}
            max={100}
            value={field.height}
            onChange={(e) => update({ height: Number(e.target.value) })}
          />
        </div>
      </div>

      {field.type === "dropdown" && (
        <div className="space-y-2">
          <Label className="text-xs">Options</Label>
          {field.options.map((opt, i) => (
            <div key={i} className="flex gap-2">
              <Input
                value={opt}
                onChange={(e) => {
                  const newOptions = [...field.options];
                  newOptions[i] = e.target.value;
                  update({ options: newOptions });
                }}
                placeholder={`Option ${i + 1}`}
              />
              <Button
                variant="ghost"
                size="icon"
                onClick={() =>
                  update({
                    options: field.options.filter((_, idx) => idx !== i),
                  })
                }
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))}
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() =>
              update({
                options: [
                  ...field.options,
                  `Option ${field.options.length + 1}`,
                ],
              })
            }
          >
            <Plus className="h-3 w-3 mr-1" /> Add Option
          </Button>
        </div>
      )}
    </div>
  );
}
