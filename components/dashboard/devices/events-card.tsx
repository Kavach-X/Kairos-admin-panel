import { CARD } from "./section";
import { formatGapTime, type TelemetryEvent } from "./telemetry-utils";

/** Recent events as a quiet timeline: time on the left, a connected dot, then what happened. */
export function EventsCard({ events }: { events: TelemetryEvent[] }) {
  if (events.length === 0) return null;
  return (
    <ol className={`${CARD} flex flex-col`}>
      {events.map((e, i) => (
        <li key={`${e.kind}-${e.t}-${i}`} className="grid grid-cols-[7.5rem_1rem_1fr] items-start gap-x-2 text-sm">
          <span className="pt-0.5 font-mono text-xs text-muted-foreground">{formatGapTime(e.t)}</span>
          <span className="relative flex h-full justify-center">
            <span className="mt-1.5 h-2 w-2 rounded-full bg-muted-foreground/50" />
            {i < events.length - 1 && <span className="absolute bottom-0 top-4 w-px bg-border" />}
          </span>
          <span className={`pb-3 text-foreground ${i === events.length - 1 ? "pb-0" : ""}`}>{e.text}</span>
        </li>
      ))}
    </ol>
  );
}
