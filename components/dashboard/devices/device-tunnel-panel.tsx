"use client";

import * as React from "react";
import { AlertTriangle, Check, Copy, Loader2, Network, Plus, RefreshCw, Terminal, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import {
  createDeviceTunnelAction,
  deleteDeviceTunnelAction,
  getDeviceTunnelAction,
} from "@/lib/actions/device.actions";
import type { DeviceTunnelHealth, DeviceTunnelInfo } from "@/lib/types";
import { CARD, Field, SectionTitle } from "./section";
import { TunnelMorph } from "./tunnel-morph";

const HEALTH_POLL_MS = 20_000;
const PENDING_POLL_MS = 3_000;
// Even a fast repair gets a moment of animation, so the UI doesn't flash.
const MIN_ANIMATION_MS = 1_500;

const HEALTH_BADGE: Record<DeviceTunnelHealth, { label: string; variant: "success" | "warning" | "destructive" | "outline" }> = {
  healthy: { label: "Connected", variant: "success" },
  degraded: { label: "Degraded", variant: "warning" },
  down: { label: "Device not connected", variant: "destructive" },
  inactive: { label: "Waiting for device", variant: "outline" },
  unknown: { label: "Health unknown", variant: "outline" },
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = React.useState(false);
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-xs"
      aria-label={`Copy ${label}`}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          toast.error("Could not copy to the clipboard");
        }
      }}
    >
      {copied ? <Check className="text-emerald-500" /> : <Copy />}
    </Button>
  );
}

/** Mount with `key={deviceId}` so state resets per device. */
export function DeviceTunnelPanel({
  deviceId,
  inventoryStatus,
}: {
  deviceId: string;
  inventoryStatus?: string;
}) {
  const [info, setInfo] = React.useState<DeviceTunnelInfo | null>(null);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState<"create" | "delete" | null>(null);
  const [elapsed, setElapsed] = React.useState(0);
  const [confirmDelete, setConfirmDelete] = React.useState(false);

  const apply = React.useCallback((res: Awaited<ReturnType<typeof getDeviceTunnelAction>>) => {
    if (res.success && res.data) {
      setInfo(res.data);
      setLoadError(null);
    } else {
      setLoadError(res.error || "Failed to load tunnel status");
    }
  }, []);

  const refresh = React.useCallback(async () => {
    apply(await getDeviceTunnelAction(deviceId));
  }, [deviceId, apply]);

  // Initial load
  React.useEffect(() => {
    let cancelled = false;
    void getDeviceTunnelAction(deviceId).then((res) => {
      if (!cancelled) apply(res);
    });
    return () => {
      cancelled = true;
    };
  }, [deviceId, apply]);

  // Follow a tunnel that is being built elsewhere (another admin, or a crashed attempt waiting on the sweeper).
  const state = info?.state;
  React.useEffect(() => {
    if (state !== "PENDING" || busy) return;
    const id = setInterval(() => void refresh(), PENDING_POLL_MS);
    return () => clearInterval(id);
  }, [state, busy, refresh]);

  // Keep the health badge fresh while the tunnel exists (paused while the tab is hidden).
  React.useEffect(() => {
    if (state !== "CREATED") return;
    const id = setInterval(() => {
      if (document.visibilityState === "visible") void refresh();
    }, HEALTH_POLL_MS);
    return () => clearInterval(id);
  }, [state, refresh]);

  // Elapsed-seconds counter while we wait on Cloudflare.
  React.useEffect(() => {
    if (!busy) return;
    const started = Date.now();
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - started) / 1000)), 500);
    return () => clearInterval(id);
  }, [busy]);

  const run = async (kind: "create" | "delete") => {
    setElapsed(0);
    setBusy(kind);
    const action = kind === "create" ? createDeviceTunnelAction : deleteDeviceTunnelAction;
    const [res] = await Promise.all([action(deviceId), sleep(MIN_ANIMATION_MS)]);
    if (res.success) {
      toast.success(kind === "create" ? "Tunnel is ready" : "Tunnel removed");
    } else {
      toast.error(res.error || "Something went wrong");
    }
    await refresh(); // pulls the authoritative state (incl. last_error after a failure) and live health
    setBusy(null);
    setConfirmDelete(false);
  };

  const decommissioned = inventoryStatus === "DECOMMISSIONED";
  const working = busy !== null || state === "PENDING";
  const health = info?.health ?? "unknown";

  let badge: React.ReactNode = null;
  let blurb = "";
  if (working) {
    badge = <Badge variant="info">{busy === "delete" ? "Removing" : "Provisioning"}</Badge>;
    blurb =
      busy === "delete"
        ? "Removing the DNS record and tunnel from Cloudflare."
        : "Creating the tunnel, SSH route and DNS record on Cloudflare. This usually takes 5 to 10 seconds.";
  } else if (state === "CREATED") {
    badge = (
      <>
        <Badge variant="success">Active</Badge>
        <Badge variant={HEALTH_BADGE[health].variant}>{HEALTH_BADGE[health].label}</Badge>
      </>
    );
    blurb =
      health === "healthy"
        ? "The device is connected. You can reach it over SSH with the command below."
        : health === "inactive"
        ? "The tunnel is ready. Run the activation script on the device to bring it online."
        : health === "unknown"
        ? "The tunnel exists. Live health could not be read right now."
        : "The tunnel exists, but the device is not fully connected to Cloudflare.";
  } else if (state === "FAILED") {
    badge = <Badge variant="destructive">Failed</Badge>;
    blurb = "The last attempt did not finish. Retry is safe: it continues from where it stopped.";
  } else if (state === "NOT_CREATED") {
    badge = <Badge variant="outline">Not created</Badge>;
    blurb = decommissioned
      ? "This device is decommissioned, so a tunnel cannot be created."
      : "No remote SSH tunnel yet. Create one to reach this device over SSH through Cloudflare.";
  }

  const sshCommand = info?.hostname
    ? `ssh -o ProxyCommand="cloudflared access ssh --hostname %h" <user>@${info.hostname}`
    : null;

  return (
    <div className="flex flex-col gap-3">
      <SectionTitle icon={Network}>Remote SSH Tunnel</SectionTitle>

      <div className={`${CARD} flex flex-col gap-4`}>
        {loadError && !info ? (
          <div className="flex items-center justify-between gap-3 text-xs text-destructive">
            <span className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              {loadError}
            </span>
            <Button variant="outline" size="xs" onClick={() => void refresh()}>
              Try again
            </Button>
          </div>
        ) : !info ? (
          <div className="flex items-center gap-2 py-6 text-xs text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading tunnel status…
          </div>
        ) : (
          <>
            <div className="flex flex-col items-center gap-4 sm:flex-row">
              <TunnelMorph
                active={working}
                aria-label={working ? "Tunnel is being provisioned" : "Tunnel"}
                className="h-36 w-36 shrink-0 text-sky-500"
              />
              <div className="flex min-w-0 flex-1 flex-col gap-3 text-center sm:text-left">
                <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                  {badge}
                  {working && (
                    <span className="font-mono text-[11px] text-muted-foreground" aria-live="polite">
                      {busy ? `${elapsed}s` : "in progress"}
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">{blurb}</p>

                {state === "FAILED" && info.last_error && (
                  <p className="rounded-lg border border-destructive/25 bg-destructive/5 px-3 py-2 text-left font-mono text-[11px] break-words text-destructive">
                    {info.last_error}
                  </p>
                )}

                <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                  {(state === "NOT_CREATED" || state === "FAILED") && (
                    <Button
                      size="sm"
                      disabled={working || decommissioned}
                      onClick={() => void run("create")}
                    >
                      {working ? (
                        <Loader2 className="animate-spin" />
                      ) : state === "FAILED" ? (
                        <RefreshCw />
                      ) : (
                        <Plus />
                      )}
                      {state === "FAILED" ? "Retry" : "Create tunnel"}
                    </Button>
                  )}
                  {(state === "CREATED" || state === "FAILED") && info.tunnel_id && (
                    <Button
                      variant="destructive"
                      size="sm"
                      disabled={working}
                      onClick={() => setConfirmDelete(true)}
                    >
                      <Trash2 />
                      Remove tunnel
                    </Button>
                  )}
                  {state === "CREATED" && (
                    <Button variant="ghost" size="sm" disabled={working} onClick={() => void refresh()}>
                      <RefreshCw />
                      Refresh
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {info.hostname && (
              <div className="grid gap-x-4 gap-y-3 border-t border-border/60 pt-4 sm:grid-cols-2">
                <Field label="Hostname" mono>
                  <span className="flex items-center gap-1">
                    <span className="truncate">{info.hostname}</span>
                    <CopyButton value={info.hostname} label="hostname" />
                  </span>
                </Field>
                <Field label="Tunnel ID" mono>
                  {info.tunnel_id ?? "—"}
                </Field>
                <Field label="Last attempt">
                  {info.last_attempt_at ? new Date(info.last_attempt_at).toLocaleString() : "—"}
                </Field>
                <Field label="Attempts">{info.attempt_count}</Field>
              </div>
            )}

            {sshCommand && state === "CREATED" && (
              <div className="flex items-start gap-2 rounded-lg bg-muted/40 px-3 py-2">
                <Terminal className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <code className="min-w-0 flex-1 font-mono text-[11px] break-all text-foreground">{sshCommand}</code>
                <CopyButton value={sshCommand} label="SSH command" />
              </div>
            )}

            {info.audit && info.audit.length > 0 && (
              <details className="border-t border-border/60 pt-3 text-xs">
                <summary className="cursor-pointer text-muted-foreground select-none hover:text-foreground">
                  Recent activity ({info.audit.length})
                </summary>
                <ul className="mt-2 flex flex-col gap-1.5">
                  {info.audit.slice(0, 6).map((a, i) => (
                    <li key={`${a.createdAt}-${i}`} className="flex flex-wrap items-center gap-2 font-mono text-[11px]">
                      <span className={a.result === "SUCCESS" ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"}>
                        {a.result === "SUCCESS" ? "✓" : "✗"}
                      </span>
                      <span className="text-foreground">{a.action}</span>
                      <span className="text-muted-foreground">{new Date(a.createdAt).toLocaleString()}</span>
                      {a.detail && <span className="text-muted-foreground">· {a.detail}</span>}
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </>
        )}
      </div>

      <ConfirmModal
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Remove SSH tunnel"
        description={
          <>
            This deletes the Cloudflare tunnel and DNS record for <strong>{deviceId}</strong>. Remote SSH stops
            working immediately. You can create a new tunnel afterwards, but the device will need to fetch its new
            token and reinstall.
          </>
        }
        confirmText="Remove tunnel"
        variant="destructive"
        loading={busy === "delete"}
        onConfirm={() => run("delete")}
      />
    </div>
  );
}
