"use client";

import type { ElementType } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { FileText, Clock, CheckCircle2, XCircle } from "lucide-react";
import { formatDate } from "@/lib/utils";
import type { Document, SigningRequest } from "@/types";

interface SenderDashboardProps {
  stats: { total: number; pending: number; completed: number; declined: number };
  documents: Document[];
  signingRequests: SigningRequest[];
}

export function SenderDashboard({
  stats,
  documents,
  signingRequests,
}: SenderDashboardProps) {
  const pendingRequests = signingRequests.filter((r) =>
    ["pending", "viewed"].includes(r.status),
  );
  const completedRequests = signingRequests.filter(
    (r) => r.status === "signed",
  );
  const recentDocuments = documents.slice(0, 5);

  return (
    <Tabs defaultValue="documents" className="space-y-6">
      <TabsList>
        <TabsTrigger value="documents">My Documents</TabsTrigger>
        <TabsTrigger value="signing" className="gap-2">
          Signing Requests
          {pendingRequests.length > 0 && (
            <Badge variant="destructive" className="ml-1 h-5 min-w-5 px-1.5 text-xs">
              {pendingRequests.length}
            </Badge>
          )}
        </TabsTrigger>
      </TabsList>

      <TabsContent value="documents" className="space-y-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard title="Total Documents" value={String(stats.total)} icon={FileText} />
          <StatsCard title="Pending" value={String(stats.pending)} icon={Clock} />
          <StatsCard title="Completed" value={String(stats.completed)} icon={CheckCircle2} />
          <StatsCard title="Declined" value={String(stats.declined)} icon={XCircle} />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Recent Documents</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentDocuments.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                No documents yet. Upload your first document to get started.
              </p>
            ) : (
              recentDocuments.map((doc) => (
                <Link
                  key={doc.id}
                  href={`/dashboard/documents/${doc.id}`}
                  className="flex items-center justify-between border rounded-lg p-3 hover:bg-muted/50 transition-colors"
                >
                  <div>
                    <p className="font-medium">{doc.title}</p>
                    <p className="text-xs text-muted-foreground">
                      Created {formatDate(doc.created_at)}
                    </p>
                  </div>
                  <span className="text-xs font-medium capitalize text-muted-foreground">
                    {doc.status}
                  </span>
                </Link>
              ))
            )}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="signing" className="space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>Pending Signatures</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {pendingRequests.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                No documents waiting for your signature.
              </p>
            ) : (
              pendingRequests.map((req) => (
                <div
                  key={req.id}
                  className="flex items-center justify-between border rounded-lg p-3"
                >
                  <div>
                    <p className="font-medium">{req.document?.title}</p>
                    <p className="text-xs text-muted-foreground">
                      Requested {formatDate(req.created_at)}
                    </p>
                  </div>
                  <Button asChild>
                    <Link href={`/sign/${req.token}`}>Sign Now</Link>
                  </Button>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Completed</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {completedRequests.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                No completed signatures yet.
              </p>
            ) : (
              completedRequests.map((req) => (
                <div
                  key={req.id}
                  className="flex items-center justify-between border rounded-lg p-3"
                >
                  <div>
                    <p className="font-medium">{req.document?.title}</p>
                    <p className="text-xs text-muted-foreground">
                      Signed {req.signed_at ? formatDate(req.signed_at) : "—"}
                    </p>
                  </div>
                  <span className="text-xs font-medium text-green-700 bg-green-100 px-2 py-1 rounded">
                    Signed
                  </span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}

function StatsCard({
  title,
  value,
  icon: Icon,
}: {
  title: string;
  value: string;
  icon: ElementType;
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold">{value}</p>
          </div>
          <div className="h-10 w-10 rounded-full bg-primary-50 flex items-center justify-center">
            <Icon className="h-5 w-5 text-primary" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
