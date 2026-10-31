import { STATUS_DOT, STATUS_LABEL, type Status } from "./telemetry-utils";

/**
 * Status marker for warn / crit. "Normal" renders nothing: a green dot beside every value is noise,
 * and the verdict already says everything is fine.
 */
export function StatusDot({ status, className = "" }: { status: Status; className?: string }) {
  if (status === "ok") return null;
  return (
    <span
      role="img"
      aria-label={STATUS_LABEL[status]}
      title={STATUS_LABEL[status]}
      className={`inline-block h-2 w-2 shrink-0 rounded-full ${STATUS_DOT[status]} ${className}`}
    />
  );
}
