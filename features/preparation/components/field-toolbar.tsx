"use client";

import type React from "react";
import { useDrag } from "react-dnd";
import { cn } from "@/lib/utils";
import { FIELD_COLORS, FIELD_TYPES, DND_FIELD_ITEM } from "../constants";
import type { FieldConfig } from "../types";

export function FieldToolbar() {
  return (
    <div className="w-56 border-r border-border bg-white p-4 space-y-3 overflow-y-auto">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Field Types
      </h3>
      <div className="space-y-2">
        {FIELD_TYPES.map((field) => (
          <FieldButton key={field.type} field={field} />
        ))}
      </div>
    </div>
  );
}

function FieldButton({
  field,
}: {
  field: FieldConfig & { icon: React.ElementType };
}) {
  const [{ isDragging }, dragRef] = useDrag(() => ({
    type: DND_FIELD_ITEM,
    item: { config: field },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  }));

  const colors = FIELD_COLORS[field.type];
  const Icon = field.icon;

  return (
    <div
      ref={dragRef}
      className={cn(
        "flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium cursor-grab",
        colors.border,
        colors.bg,
        colors.text,
        isDragging && "opacity-60",
      )}
    >
      <Icon className="h-4 w-4" />
      {field.label}
    </div>
  );
}
