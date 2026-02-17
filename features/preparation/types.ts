import type { FieldType, FieldValidation } from "@/types";

export interface PlacedField {
  id: string;
  db_id?: string;
  type: FieldType;
  label: string;
  placeholder: string;
  required: boolean;
  validation: FieldValidation;
  font_size: number;
  page_number: number;
  position_x: number;
  position_y: number;
  width: number;
  height: number;
  options: string[];
}

export interface FieldConfig {
  type: FieldType;
  label: string;
  defaultWidth: number;
  defaultHeight: number;
  placeholder?: string;
  options?: string[];
}
