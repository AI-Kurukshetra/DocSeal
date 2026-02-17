"use client";

import { useEffect, useState } from "react";
import { SigningPage } from "@/features/signing/components/signing-page";
import { SigningError } from "@/features/signing/components/signing-error";
import { Skeleton } from "@/components/ui/skeleton";
import type { DocumentField } from "@/types";
import type { SavedSignature } from "@/features/signing/types";

interface SigningData {
  request: {
    id: string;
    status: string;
    recipient_email: string;
    message: string | null;
  };
  document: {
    id: string;
    title: string;
    file_type: string;
    file_url: string | null;
    sender_name: string;
  };
  fields: DocumentField[];
  saved_signature?: SavedSignature | null;
}

export function SignTokenPage({ token }: { token: string }) {
  const [data, setData] = useState<SigningData | null>(null);
  const [error, setError] = useState<{ message: string; status?: string } | null>(
    null,
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch(`/api/sign/${token}`);
        const json = await res.json();

        if (!res.ok) {
          setError({ message: json.error, status: json.status });
        } else {
          setData(json);
        }
      } catch {
        setError({ message: "Failed to load signing page" });
      } finally {
        setLoading(false);
      }
    }

    if (token) {
      fetchData();
    }
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="space-y-4 w-full max-w-2xl p-8">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  if (error) {
    return <SigningError message={error.message} status={error.status} />;
  }

  if (!data) {
    return <SigningError message="Something went wrong" />;
  }

  return (
    <SigningPage
      token={token}
      request={data.request}
      document={data.document}
      fields={data.fields}
      savedSignature={data.saved_signature || null}
    />
  );
}
