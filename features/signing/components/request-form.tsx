"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { ArrowLeft, CheckCircle2, Plus, Trash2, Copy, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { requestSchema, type RequestInput } from "../schemas";
import { createSigningRequests } from "../actions";
import type { Document } from "@/types";

interface RequestFormProps {
  document: Document;
  wizardMode?: boolean;
  onBack?: () => void;
}

export function RequestForm({ document, wizardMode, onBack }: RequestFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [signingLinks, setSigningLinks] = useState<
    { email: string; url: string }[] | null
  >(null);
  const [emailsSent, setEmailsSent] = useState(false);

  const form = useForm<RequestInput>({
    resolver: zodResolver(requestSchema),
    defaultValues: {
      document_id: document.id,
      recipients: [{ email: "", name: "" }],
      message: "",
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "recipients",
  });

  function onSubmit(data: RequestInput) {
    startTransition(async () => {
      const result = await createSigningRequests(data);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Signing requests sent!");
        setEmailsSent(!!result.emailsSent);
        if (result.signingLinks) {
          setSigningLinks(result.signingLinks);
        }
      }
    });
  }

  function copyLink(url: string) {
    navigator.clipboard.writeText(url);
    toast.success("Link copied to clipboard");
  }

  // Wizard mode: show signing links inline instead of in a dialog
  if (wizardMode && signingLinks) {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
            <CheckCircle2 className="h-6 w-6 text-green-600" />
          </div>
          <CardTitle>Signing Requests Sent!</CardTitle>
          <p className="text-sm text-muted-foreground">
            {emailsSent
              ? "Emails have been sent. You can also share these links directly:"
              : "Share these links with your recipients:"}
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          {signingLinks.map((link) => (
            <div
              key={link.email}
              className="flex items-center gap-2 p-3 border rounded-lg"
            >
              <Link2 className="h-4 w-4 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{link.email}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {link.url}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyLink(link.url)}
              >
                <Copy className="h-3 w-3 mr-1" /> Copy
              </Button>
            </div>
          ))}
          <Button
            className="w-full mt-4"
            onClick={() => router.push(`/dashboard/documents/${document.id}`)}
          >
            View Document
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Request Signatures</CardTitle>
          <p className="text-sm text-muted-foreground">
            for <span className="font-medium">{document.title}</span>
            {" · "}
            {document.document_fields?.length || 0} field(s) to fill
          </p>
        </CardHeader>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-6">
            <div className="space-y-3">
              <Label>Recipients</Label>
              {fields.map((field, index) => (
                <div key={field.id} className="flex gap-2">
                  <Input
                    placeholder="recipient@email.com"
                    {...form.register(`recipients.${index}.email`)}
                    className="flex-1"
                  />
                  <Input
                    placeholder="Name (optional)"
                    {...form.register(`recipients.${index}.name`)}
                    className="w-40"
                  />
                  {fields.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => remove(index)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </div>
              ))}
              {form.formState.errors.recipients && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.recipients.message ||
                    form.formState.errors.recipients[0]?.email?.message}
                </p>
              )}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => append({ email: "", name: "" })}
              >
                <Plus className="h-4 w-4 mr-1" /> Add Recipient
              </Button>
            </div>

            <div className="space-y-2">
              <Label>Message (optional)</Label>
              <Textarea
                placeholder="Please review and sign this document..."
                {...form.register("message")}
                rows={3}
              />
            </div>

            <div className="flex gap-2">
              {wizardMode && onBack && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={onBack}
                  disabled={isPending}
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
              )}
              <Button type="submit" className="flex-1" disabled={isPending}>
                {isPending ? "Sending..." : "Send Signing Request"}
              </Button>
            </div>
          </CardContent>
        </form>
      </Card>

      <Dialog
        open={!!signingLinks}
        onOpenChange={() => {
          setSigningLinks(null);
          router.push(`/dashboard/documents/${document.id}`);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Signing Links</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {emailsSent
                ? "Emails have been sent. You can also share these links directly:"
                : "Share these links with your recipients:"}
            </p>
            {signingLinks?.map((link) => (
              <div
                key={link.email}
                className="flex items-center gap-2 p-3 border rounded-lg"
              >
                <Link2 className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{link.email}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {link.url}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyLink(link.url)}
                >
                  <Copy className="h-3 w-3 mr-1" /> Copy
                </Button>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
