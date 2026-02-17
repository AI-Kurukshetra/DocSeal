import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getRecipientSigningRequests } from "../actions";
import { formatDate } from "@/lib/utils";

export async function RecipientDashboard() {
  const requests = await getRecipientSigningRequests();
  const pending = requests.filter((r) =>
    ["pending", "viewed"].includes(r.status),
  );
  const completed = requests.filter((r) => r.status === "signed");

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>Pending Signatures</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {pending.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No documents waiting for your signature.
            </p>
          ) : (
            pending.map((req) => (
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
          {completed.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No completed signatures yet.
            </p>
          ) : (
            completed.map((req) => (
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
    </div>
  );
}
