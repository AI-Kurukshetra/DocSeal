"use client";

import { useCallback, useMemo, type RefObject } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { FIELD_COLORS, FIELD_ICONS } from "../constants";
import type { PlacedField } from "../types";

interface FieldOverlayProps {
  field: PlacedField;
  isSelected: boolean;
  containerRef: RefObject<HTMLDivElement | null>;
  onSelect: (id: string) => void;
  onMove: (id: string, x: number, y: number) => void;
  onResize: (id: string, width: number, height: number) => void;
  onDelete: (id: string) => void;
}

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

export function FieldOverlay({
  field,
  isSelected,
  containerRef,
  onSelect,
  onMove,
  onResize,
  onDelete,
}: FieldOverlayProps) {
  const colors = FIELD_COLORS[field.type];
  const Icon = FIELD_ICONS[field.type];

  const style = useMemo(
    () => ({
      left: `${field.position_x}%`,
      top: `${field.position_y}%`,
      width: `${field.width}%`,
      height: `${field.height}%`,
    }),
    [field.position_x, field.position_y, field.width, field.height],
  );

  const startDrag = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (
        (e.target as HTMLElement).closest("[data-resize-handle]") ||
        (e.target as HTMLElement).closest("[data-delete-button]")
      ) {
        return;
      }
      e.preventDefault();
      e.stopPropagation();
      onSelect(field.id);

      const container = containerRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const startX = e.clientX;
      const startY = e.clientY;
      const startLeft = field.position_x;
      const startTop = field.position_y;

      const handleMove = (moveEvent: MouseEvent) => {
        const dx = moveEvent.clientX - startX;
        const dy = moveEvent.clientY - startY;
        const nextX = clamp(
          startLeft + (dx / rect.width) * 100,
          0,
          100 - field.width,
        );
        const nextY = clamp(
          startTop + (dy / rect.height) * 100,
          0,
          100 - field.height,
        );
        onMove(field.id, nextX, nextY);
      };

      const handleUp = () => {
        window.removeEventListener("mousemove", handleMove);
        window.removeEventListener("mouseup", handleUp);
      };

      window.addEventListener("mousemove", handleMove);
      window.addEventListener("mouseup", handleUp);
    },
    [
      field.height,
      field.id,
      field.position_x,
      field.position_y,
      field.width,
      onMove,
      onSelect,
      containerRef,
    ],
  );

  const startResize = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      onSelect(field.id);

      const container = containerRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const startX = e.clientX;
      const startY = e.clientY;
      const startWidth = field.width;
      const startHeight = field.height;

      const handleMove = (moveEvent: MouseEvent) => {
        const dx = moveEvent.clientX - startX;
        const dy = moveEvent.clientY - startY;
        const nextWidth = clamp(
          startWidth + (dx / rect.width) * 100,
          4,
          100 - field.position_x,
        );
        const nextHeight = clamp(
          startHeight + (dy / rect.height) * 100,
          4,
          100 - field.position_y,
        );
        onResize(field.id, nextWidth, nextHeight);
      };

      const handleUp = () => {
        window.removeEventListener("mousemove", handleMove);
        window.removeEventListener("mouseup", handleUp);
      };

      window.addEventListener("mousemove", handleMove);
      window.addEventListener("mouseup", handleUp);
    },
    [
      field.height,
      field.id,
      field.position_x,
      field.position_y,
      field.width,
      onResize,
      onSelect,
      containerRef,
    ],
  );

  return (
    <div
      role="button"
      tabIndex={0}
      onMouseDown={startDrag}
      onClick={() => onSelect(field.id)}
      className={cn(
        "absolute flex items-center gap-2 rounded border-2 px-2 text-xs font-medium select-none",
        "cursor-grab",
        colors.border,
        colors.bg,
        colors.text,
        isSelected && "ring-2 ring-primary ring-offset-1 ring-offset-background",
      )}
      style={style}
    >
      <Icon className="h-3 w-3" />
      <span className="truncate">
        {field.label || field.type.charAt(0).toUpperCase() + field.type.slice(1)}
      </span>

      {isSelected && (
        <>
          <button
            type="button"
            data-delete-button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(field.id);
            }}
            className="ml-auto text-muted-foreground hover:text-destructive"
          >
            <X className="h-3 w-3" />
          </button>
          <div
            data-resize-handle
            onMouseDown={startResize}
            className="absolute -bottom-1 -right-1 h-3 w-3 rounded-sm bg-white border border-border cursor-se-resize"
          />
        </>
      )}
    </div>
  );
}
