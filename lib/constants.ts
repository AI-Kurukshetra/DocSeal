import {
  FileText,
  Upload,
  Users,
  Activity,
  PenTool,
  LayoutDashboard,
  type LucideIcon,
} from "lucide-react";
import type { UserRole, DocumentStatus, ActivityAction } from "@/types";

// Navigation config per role
export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

export const NAV_ITEMS: Record<UserRole, NavItem[]> = {
  sender: [
    { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { label: "My Documents", href: "/dashboard/documents", icon: FileText },
    { label: "Upload Document", href: "/dashboard/upload", icon: Upload },
  ],
  recipient: [
    { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { label: "Signing", href: "/dashboard/signing", icon: PenTool },
  ],
  admin: [
    { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { label: "All Documents", href: "/dashboard/documents", icon: FileText },
    { label: "Users", href: "/dashboard/users", icon: Users },
    { label: "Activity Log", href: "/dashboard/activity", icon: Activity },
  ],
};

// Status badge colors
export const STATUS_COLORS: Record<
  DocumentStatus,
  { bg: string; text: string }
> = {
  draft: { bg: "bg-gray-100", text: "text-gray-700" },
  pending: { bg: "bg-yellow-100", text: "text-yellow-700" },
  signed: { bg: "bg-blue-100", text: "text-blue-700" },
  completed: { bg: "bg-green-100", text: "text-green-700" },
};

// Activity action labels
export const ACTIVITY_LABELS: Record<ActivityAction, string> = {
  document_uploaded: "uploaded a document",
  document_prepared: "prepared document for signing",
  signature_requested: "sent a signing request",
  document_viewed: "viewed the document",
  document_signed: "signed the document",
  request_cancelled: "cancelled a signing request",
};

// Accepted file types for upload
export const ACCEPTED_FILE_TYPES = {
  "application/pdf": [".pdf"],
};

export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
