import { CheckCircle2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export function SigningSuccess({ documentTitle }: { documentTitle: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="max-w-md w-full">
        <CardContent className="pt-8 pb-8 text-center">
          <div className="flex justify-center mb-4">
            <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
          </div>
          <h2 className="text-xl font-semibold mb-2">Successfully Signed!</h2>
          <p className="text-muted-foreground">
            You have successfully signed <strong>{documentTitle}</strong>. The
            sender will be notified of your signature.
          </p>
          <p className="text-sm text-muted-foreground mt-4">
            You can close this page.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
