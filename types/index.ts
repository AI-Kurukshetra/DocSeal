export type UserRole = "sender" | "recipient" | "admin";
export type DocumentStatus = "draft" | "pending" | "signed" | "completed";
export type DocumentFileType = "pdf" | "image" | "doc";
export type FieldType =
  | "signature"
  | "text"
  | "date"
  | "checkbox"
  | "initials"
  | "dropdown";
export type FieldValidation = "none" | "number" | "email" | "phone";
export type SigningStatus =
  | "pending"
  | "viewed"
  | "signed"
  | "cancelled"
  | "declined";
export type ActivityAction =
  | "document_uploaded"
  | "document_prepared"
  | "signature_requested"
  | "document_viewed"
  | "document_signed"
  | "request_cancelled";

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  avatar_url: string | null;
  created_at: string;
}

export interface Document {
  id: string;
  title: string;
  file_url: string;
  file_type: DocumentFileType;
  converted_pdf_url: string | null;
  status: DocumentStatus;
  sender_id: string;
  created_at: string;
  updated_at: string;
  // Joined
  sender?: Profile;
  signing_requests?: SigningRequest[];
  document_fields?: DocumentField[];
}

export interface DocumentField {
  id: string;
  document_id: string;
  type: FieldType;
  label: string;
  placeholder: string | null;
  required: boolean;
  validation: FieldValidation | null;
  font_size: number;
  page_number: number;
  position_x: number;
  position_y: number;
  width: number;
  height: number;
  options: string[];
  created_at: string;
}

export interface SigningRequest {
  id: string;
  document_id: string;
  recipient_email: string;
  recipient_id: string | null;
  token: string;
  status: SigningStatus;
  signature_url: string | null;
  signed_file_url: string | null;
  signed_at: string | null;
  message: string | null;
  created_at: string;
  // Joined
  document?: Document;
  recipient?: Profile;
  field_values?: FieldValue[];
}

export interface FieldValue {
  id: string;
  signing_request_id: string;
  document_field_id: string;
  value: string;
  created_at: string;
}

export interface ActivityLogEntry {
  id: string;
  document_id: string;
  user_id: string | null;
  action: ActivityAction;
  metadata: Record<string, unknown>;
  created_at: string;
  // Joined
  user?: Profile;
  document?: Document;
}
