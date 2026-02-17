"use client";

import { Badge } from "@/components/ui/badge";
import { STATUS_COLORS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { DocumentStatus } from "@/types";

export function StatusBadge({ status }: { status: DocumentStatus }) {
  const colors = STATUS_COLORS[status];
  return (
    <Badge
      variant="secondary"
      className={cn(colors.bg, colors.text, "capitalize")}
    >
      {status}
    </Badge>
  );
}
