import {
  PenTool,
  Type,
  Calendar,
  CheckSquare,
  User,
  ChevronDown,
  type LucideIcon,
} from "lucide-react";
import type { FieldType } from "@/types";
import type { FieldConfig } from "./types";

export const DND_FIELD_ITEM = "DOCSEAL_FIELD";

export const FIELD_COLORS: Record<
  FieldType,
  { border: string; bg: string; text: string }
> = {
  signature: {
    border: "border-purple-500",
    bg: "bg-purple-50",
    text: "text-purple-700",
  },
  text: {
    border: "border-blue-500",
    bg: "bg-blue-50",
    text: "text-blue-700",
  },
  date: {
    border: "border-emerald-500",
    bg: "bg-emerald-50",
    text: "text-emerald-700",
  },
  checkbox: {
    border: "border-orange-500",
    bg: "bg-orange-50",
    text: "text-orange-700",
  },
  initials: {
    border: "border-pink-500",
    bg: "bg-pink-50",
    text: "text-pink-700",
  },
  dropdown: {
    border: "border-slate-500",
    bg: "bg-slate-50",
    text: "text-slate-700",
  },
};

export const FIELD_ICONS: Record<FieldType, LucideIcon> = {
  signature: PenTool,
  text: Type,
  date: Calendar,
  checkbox: CheckSquare,
  initials: User,
  dropdown: ChevronDown,
};

export const FIELD_TYPES: Array<FieldConfig & { icon: LucideIcon }> = [
  {
    type: "signature",
    label: "Signature",
    icon: PenTool,
    defaultWidth: 22,
    defaultHeight: 8,
  },
  {
    type: "text",
    label: "Text",
    icon: Type,
    defaultWidth: 20,
    defaultHeight: 6,
    placeholder: "Text",
  },
  {
    type: "date",
    label: "Date",
    icon: Calendar,
    defaultWidth: 16,
    defaultHeight: 6,
    placeholder: "MM/DD/YYYY",
  },
  {
    type: "checkbox",
    label: "Checkbox",
    icon: CheckSquare,
    defaultWidth: 6,
    defaultHeight: 6,
  },
  {
    type: "initials",
    label: "Initials",
    icon: User,
    defaultWidth: 12,
    defaultHeight: 6,
    placeholder: "Initials",
  },
  {
    type: "dropdown",
    label: "Dropdown",
    icon: ChevronDown,
    defaultWidth: 18,
    defaultHeight: 6,
    options: ["Option 1", "Option 2"],
  },
];
