import type { ElementType } from "react";
import { Upload, Edit, Send, Eye, CheckCircle2, XCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatRelativeTime } from "@/lib/utils";
import { ACTIVITY_LABELS } from "@/lib/constants";
import type { ActivityLogEntry, ActivityAction } from "@/types";

const ACTION_ICONS: Record<ActivityAction, ElementType> = {
  document_uploaded: Upload,
  document_prepared: Edit,
  signature_requested: Send,
  document_viewed: Eye,
  document_signed: CheckCircle2,
  request_cancelled: XCircle,
};

export function ActivityTimeline({
  activities,
}: {
  activities: ActivityLogEntry[];
}) {
  if (activities.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          No activity yet.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Activity Log</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activities.map((entry) => {
            const Icon = ACTION_ICONS[entry.action] || Upload;
            const user = entry.user as any;
            const doc = entry.document as any;

            return (
              <div key={entry.id} className="flex items-start gap-3">
                <div className="h-8 w-8 rounded-full bg-primary-50 flex items-center justify-center shrink-0 mt-0.5">
                  <Icon className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm">
                    <span className="font-medium">
                      {user?.full_name || user?.email || "System"}
                    </span>{" "}
                    {ACTIVITY_LABELS[entry.action]}
                    {doc?.title && (
                      <>
                        {" "}
                        — <span className="font-medium">{doc.title}</span>
                      </>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatRelativeTime(entry.created_at)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
