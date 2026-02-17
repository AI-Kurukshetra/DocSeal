"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import {
  FileText,
  Copy,
  Ban,
  Pencil,
  Send,
  Clock,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/shared/status-badge";
import { ACTIVITY_LABELS } from "@/lib/constants";
import { formatDate, formatRelativeTime } from "@/lib/utils";
import { cancelSigningRequest } from "@/features/signing/actions";
import type { Document, ActivityLogEntry, SigningRequest } from "@/types";

interface DocumentDetailProps {
  document: Document;
  activity: ActivityLogEntry[];
}

const signingStatusStyles: Record<
  SigningRequest["status"],
  { label: string; className: string }
> = {
  pending: { label: "Pending", className: "bg-yellow-100 text-yellow-700" },
  viewed: { label: "Viewed", className: "bg-blue-100 text-blue-700" },
  signed: { label: "Signed", className: "bg-green-100 text-green-700" },
  cancelled: { label: "Cancelled", className: "bg-gray-100 text-gray-700" },
  declined: { label: "Declined", className: "bg-red-100 text-red-700" },
};

export function DocumentDetail({ document, activity }: DocumentDetailProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const signingRequests = document.signing_requests || [];
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    (typeof window !== "undefined" ? window.location.origin : "");

  function copyLink(token: string) {
    const url = `${appUrl}/sign/${token}`;
    navigator.clipboard.writeText(url);
    toast.success("Link copied to clipboard");
  }

  function handleCancel(requestId: string) {
    startTransition(async () => {
      const result = await cancelSigningRequest(requestId);
      if (result.error) toast.error(result.error);
      else {
        toast.success("Request cancelled");
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-start justify-between space-y-0">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-muted-foreground" />
              {document.title}
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Uploaded {formatDate(document.created_at)}
            </p>
          </div>
          <StatusBadge status={document.status} />
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href={`/dashboard/documents/${document.id}/prepare`}>
              <Pencil className="h-4 w-4 mr-2" />
              Prepare
            </Link>
          </Button>
          <Button asChild>
            <Link href={`/dashboard/documents/${document.id}/request`}>
              <Send className="h-4 w-4 mr-2" />
              Send for Signing
            </Link>
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recipients</CardTitle>
        </CardHeader>
        <CardContent>
          {signingRequests.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No signing requests yet.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Signed At</TableHead>
                  <TableHead className="w-40"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {signingRequests.map((req) => {
                  const status = signingStatusStyles[req.status];
                  return (
                    <TableRow key={req.id}>
                      <TableCell>{req.recipient_email}</TableCell>
                      <TableCell>
                        <Badge className={status.className}>
                          {status.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {req.signed_at ? formatDate(req.signed_at) : "—"}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => copyLink(req.token)}
                          >
                            <Copy className="h-3 w-3 mr-1" />
                            Copy Link
                          </Button>
                          {req.status === "pending" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleCancel(req.id)}
                              disabled={isPending}
                            >
                              <Ban className="h-3 w-3 mr-1" />
                              Cancel
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Activity</CardTitle>
        </CardHeader>
        <CardContent>
          {activity.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No activity recorded yet.
            </p>
          ) : (
            <div className="space-y-4">
              {activity.map((item) => {
                const label = ACTIVITY_LABELS[item.action] ?? item.action;
                const icon =
                  item.action === "document_signed" ? (
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                  ) : (
                    <Clock className="h-4 w-4 text-muted-foreground" />
                  );
                const userName =
                  item.user?.full_name || item.user?.email || "Someone";
                return (
                  <div key={item.id} className="flex gap-3 text-sm">
                    <div className="mt-0.5">{icon}</div>
                    <div>
                      <p className="text-foreground">
                        <span className="font-medium">{userName}</span> {label}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatRelativeTime(item.created_at)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
