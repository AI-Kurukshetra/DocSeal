import { AlertCircle, XCircle, CheckCircle2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface SigningErrorProps {
  message: string;
  status?: string;
}

export function SigningError({ message, status }: SigningErrorProps) {
  const Icon =
    status === "signed"
      ? CheckCircle2
      : status === "cancelled"
        ? XCircle
        : AlertCircle;
  const color = status === "signed" ? "text-green-600" : "text-destructive";

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="max-w-md w-full">
        <CardContent className="pt-8 pb-8 text-center">
          <div className="flex justify-center mb-4">
            <div className="h-16 w-16 rounded-full bg-gray-100 flex items-center justify-center">
              <Icon className={`h-8 w-8 ${color}`} />
            </div>
          </div>
          <h2 className="text-xl font-semibold mb-2">
            {status === "signed"
              ? "Already Signed"
              : status === "cancelled"
                ? "Request Cancelled"
                : "Invalid Link"}
          </h2>
          <p className="text-muted-foreground">{message}</p>
        </CardContent>
      </Card>
    </div>
  );
}
