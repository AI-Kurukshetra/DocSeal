"use client";

import { usePathname } from "next/navigation";

function getPageTitle(pathname: string): string {
  const segments = pathname.split("/").filter(Boolean);

  if (segments.length <= 1) return "Dashboard";
  if (segments[1] === "documents" && segments.length === 2) return "Documents";
  if (segments[1] === "upload") return "Upload Document";
  if (segments[1] === "users") return "User Management";
  if (segments[1] === "activity") return "Activity Log";
  if (segments[1] === "signing") return "Signing";
  if (segments.includes("prepare")) return "Prepare Document";
  if (segments.includes("request")) return "Request Signature";

  return "Dashboard";
}

export function Topbar() {
  const pathname = usePathname();
  const title = getPageTitle(pathname);

  return (
    <div className="hidden md:flex items-center h-16 px-8 border-b border-border bg-white">
      <h1 className="text-xl font-semibold text-foreground">{title}</h1>
    </div>
  );
}
