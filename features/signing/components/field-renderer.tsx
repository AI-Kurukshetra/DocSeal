"use client";

import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { SignaturePad } from "./signature-pad";
import { cn } from "@/lib/utils";
import type { DocumentField } from "@/types";
import type { SavedSignature, SignaturePayload } from "@/features/signing/types";

interface FieldRendererProps {
  field: DocumentField;
  value: string;
  onChange: (value: string) => void;
  onSignatureChange: (payload: SignaturePayload) => void;
  savedSignature?: SavedSignature | null;
}

export function FieldRenderer({
  field,
  value,
  onChange,
  onSignatureChange,
  savedSignature = null,
}: FieldRendererProps) {
  const [showSignaturePad, setShowSignaturePad] = useState(false);
  const isFilled = value && value.trim() !== "" && value !== "false";

  const baseStyle: React.CSSProperties = {
    position: "absolute",
    left: `${field.position_x}%`,
    top: `${field.position_y}%`,
    width: `${field.width}%`,
    height: `${field.height}%`,
  };

  const borderClass = cn(
    "rounded border-2 transition-colors",
    field.required && !isFilled
      ? "border-red-400 bg-red-50/80"
      : "border-primary/30 bg-white/90",
    isFilled && "border-green-400 bg-green-50/80",
  );

  switch (field.type) {
    case "text":
      return (
        <div style={baseStyle} className={cn(borderClass, "flex items-center px-2")}>
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder || field.label}
            className="w-full bg-transparent border-none outline-none text-sm"
            style={{ fontSize: `${field.font_size}px` }}
          />
        </div>
      );

    case "date":
      return (
        <div style={baseStyle} className={cn(borderClass, "flex items-center px-2")}>
          <input
            type="date"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-full bg-transparent border-none outline-none text-sm"
            style={{ fontSize: `${field.font_size}px` }}
          />
        </div>
      );

    case "checkbox":
      return (
        <div
          style={baseStyle}
          className={cn(
            borderClass,
            "flex items-center justify-center cursor-pointer",
          )}
          onClick={() => onChange(value === "true" ? "false" : "true")}
        >
          <Checkbox checked={value === "true"} className="pointer-events-none" />
        </div>
      );

    case "dropdown":
      return (
        <div style={baseStyle} className={cn(borderClass, "flex items-center")}>
          <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-full bg-transparent border-none outline-none text-sm px-2"
          >
            <option value="">{field.placeholder || "Select..."}</option>
            {field.options?.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>
      );

    case "signature":
    case "initials":
      return (
        <>
          <div
            style={baseStyle}
            className={cn(
              borderClass,
              "flex items-center justify-center cursor-pointer",
            )}
            onClick={() => setShowSignaturePad(true)}
          >
            {isFilled ? (
              <span className="text-xs text-green-700 font-medium">
                ✓ {field.type === "signature" ? "Signed" : "Initialed"}
              </span>
            ) : (
              <span className="text-xs text-muted-foreground">
                Click to {field.type === "signature" ? "sign" : "initial"}
              </span>
            )}
          </div>

          {showSignaturePad && (
            <SignaturePad
              isInitials={field.type === "initials"}
              savedSignature={savedSignature}
              onSave={(payload) => {
                onSignatureChange(payload);
                onChange("signed");
                setShowSignaturePad(false);
              }}
              onClose={() => setShowSignaturePad(false)}
            />
          )}
        </>
      );

    default:
      return null;
  }
}
