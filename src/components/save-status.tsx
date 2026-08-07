import { AlertTriangle, Loader2, RefreshCw } from "lucide-react";

export class ValidationError extends Error {
  readonly isValidation = true;
}

export function isValidationError(err: unknown): boolean {
  return !!err && typeof err === "object" && "isValidation" in err;
}

/**
 * Persistent, impossible-to-miss save state. Connectivity in the field is
 * unreliable, so a failed save must never disappear like a toast does.
 */
export function SaveStatus({
  error,
  retrying,
  onRetry,
  className = "",
}: {
  error: string | null;
  retrying: boolean;
  onRetry: () => void;
  className?: string;
}) {
  if (!error && !retrying) return null;
  if (retrying) {
    return (
      <div
        className={`flex items-center gap-2 rounded-md border border-border bg-surface px-3 py-2 text-sm text-muted-foreground ${className}`}
      >
        <Loader2 className="h-4 w-4 animate-spin" /> Saving…
      </div>
    );
  }
  return (
    <button
      type="button"
      onClick={onRetry}
      className={`flex w-full items-center gap-2 rounded-md border border-destructive bg-destructive/10 px-3 py-2 text-left text-sm font-medium text-destructive ${className}`}
    >
      <AlertTriangle className="h-4 w-4 shrink-0" />
      <span className="flex-1">Not saved — tap to retry</span>
      <RefreshCw className="h-4 w-4 shrink-0" />
    </button>
  );
}
