"use client";

import Link from "next/link";
import { FileText, MoreHorizontal, Trash2, Send, Edit } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { formatDate } from "@/lib/utils";
import { deleteDocument } from "../actions";
import { toast } from "sonner";
import { useTransition } from "react";
import type { Document } from "@/types";

export function DocumentList({ documents }: { documents: Document[] }) {
  const [isPending, startTransition] = useTransition();

  if (documents.length === 0) {
    return (
      <EmptyState
        title="No documents yet"
        description="Upload your first document to get started with digital signing."
        actionLabel="Upload Document"
        actionHref="/dashboard/upload"
      />
    );
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      const result = await deleteDocument(id);
      if (result.error) toast.error(result.error);
      else toast.success("Document deleted");
    });
  }

  return (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Title</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Recipients</TableHead>
            <TableHead>Created</TableHead>
            <TableHead className="w-12"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {documents.map((doc) => (
            <TableRow key={doc.id}>
              <TableCell>
                <Link
                  href={`/dashboard/documents/${doc.id}`}
                  className="flex items-center gap-2 hover:text-primary"
                >
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{doc.title}</span>
                </Link>
              </TableCell>
              <TableCell>
                <StatusBadge status={doc.status} />
              </TableCell>
              <TableCell className="text-muted-foreground">
                {doc.signing_requests?.length || 0}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {formatDate(doc.created_at)}
              </TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem asChild>
                      <Link href={`/dashboard/documents/${doc.id}/prepare`}>
                        <Edit className="h-4 w-4 mr-2" /> Prepare
                      </Link>
                    </DropdownMenuItem>
                    {doc.status !== "draft" ? null : (
                      <DropdownMenuItem asChild>
                        <Link href={`/dashboard/documents/${doc.id}/request`}>
                          <Send className="h-4 w-4 mr-2" /> Send for Signing
                        </Link>
                      </DropdownMenuItem>
                    )}
                    {doc.status === "draft" && (
                      <DropdownMenuItem
                        onClick={() => handleDelete(doc.id)}
                        className="text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-2" /> Delete
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
