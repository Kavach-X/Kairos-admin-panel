"use client";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ShieldAlert } from "lucide-react";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <div className="w-full min-w-0 max-w-md">
        <Alert variant="destructive">
          <ShieldAlert className="size-4" />
          {/* Messages can be long unbroken identifiers (bundler module names, ids): wrap anywhere, cap height. */}
          <AlertDescription className="max-h-48 min-w-0 overflow-y-auto break-words [overflow-wrap:anywhere]">
            {error.message || "Something went wrong loading the dashboard."}
          </AlertDescription>
        </Alert>
        <Button onClick={reset} variant="outline" className="mt-4 w-full">
          Try Again
        </Button>
      </div>
    </div>
  );
}
