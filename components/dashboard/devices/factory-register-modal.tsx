"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Plus,
  KeyRound,
  RefreshCw,
  Copy,
  Check,
  CheckCircle2,
  AlertCircle,
  Timer,
  QrCode,
  ClipboardList,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import type { DeviceModel, FactoryRegisterPayload, DeviceRegisterToken } from "@/lib/types";
import {
  factoryRegisterDeviceAction,
  generateDeviceRegisterTokenAction,
} from "@/lib/actions/device.actions";

interface FactoryRegisterModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  models: DeviceModel[];
  modelsLoading?: boolean;
  onSuccess?: () => void;
}

function generateSecret(): string {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let secret = "sec_";
  for (let i = 0; i < 20; i++) {
    secret += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return secret;
}

function formatCountdown(msRemaining: number): string {
  if (msRemaining <= 0) return "Expired";
  const totalSeconds = Math.floor(msRemaining / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function FactoryRegisterModal({
  open,
  onOpenChange,
  models,
  modelsLoading = false,
  onSuccess,
}: FactoryRegisterModalProps) {
  const [mode, setMode] = React.useState<"token" | "manual">("token");

  // ─── Token tab state ───────────────────────────────────────────────
  const [tokenModelCode, setTokenModelCode] = React.useState("");
  const [tokenLoading, setTokenLoading] = React.useState(false);
  const [tokenError, setTokenError] = React.useState<string | null>(null);
  const [issuedToken, setIssuedToken] = React.useState<DeviceRegisterToken | null>(null);
  const [copiedToken, setCopiedToken] = React.useState(false);
  const [nowTick, setNowTick] = React.useState(() => Date.now());

  // ─── Manual tab state ──────────────────────────────────────────────
  const [deviceId, setDeviceId] = React.useState("");
  const [modelCode, setModelCode] = React.useState("");
  const [rawSecret, setRawSecret] = React.useState("");
  const [ethMac, setEthMac] = React.useState("");
  const [bleMac, setBleMac] = React.useState("");
  const [socSerial, setSocSerial] = React.useState("");
  const [wlanMac, setWlanMac] = React.useState("");
  const [machine, setMachine] = React.useState("");
  const [socId, setSocId] = React.useState("");
  const [storageSerial, setStorageSerial] = React.useState("");
  const [showAdvanced, setShowAdvanced] = React.useState(false);

  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [registeredSuccess, setRegisteredSuccess] = React.useState<boolean>(false);
  const [copiedSecret, setCopiedSecret] = React.useState(false);
  const [copiedConfig, setCopiedConfig] = React.useState(false);

  React.useEffect(() => {
    if (!open) {
      setDeviceId("");
      setEthMac("");
      setBleMac("");
      setSocSerial("");
      setWlanMac("");
      setMachine("");
      setSocId("");
      setStorageSerial("");
      setShowAdvanced(false);
      setRawSecret("");
      setError(null);
      setRegisteredSuccess(false);
      setMode("token");
      setIssuedToken(null);
      setTokenError(null);
    } else {
      if (models.length > 0) {
        setModelCode(models[0].code);
        setTokenModelCode(models[0].code);
      }
      setRawSecret(generateSecret());
      setError(null);
      setRegisteredSuccess(false);
    }
  }, [open, models]);

  // Live countdown tick while a token is on screen
  React.useEffect(() => {
    if (!issuedToken) return;
    const interval = setInterval(() => setNowTick(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [issuedToken]);

  const envSnippet = `# /etc/kairos/device.env
KAIROS_DEVICE_ID="${deviceId}"
KAIROS_DEVICE_SECRET="${rawSecret}"
KAIROS_MODEL_CODE="${modelCode}"
`;

  const msRemaining = issuedToken ? new Date(issuedToken.expires_at).getTime() - nowTick : 0;
  const tokenExpired = issuedToken ? msRemaining <= 0 : false;

  async function handleGenerateToken() {
    setTokenError(null);
    if (!tokenModelCode) {
      setTokenError("Please select a device model");
      return;
    }

    setTokenLoading(true);
    const res = await generateDeviceRegisterTokenAction(tokenModelCode);
    setTokenLoading(false);

    if (!res.success || !res.data) {
      setTokenError(res.error || "Failed to generate registration token");
      return;
    }
    setIssuedToken(res.data);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!deviceId.trim()) {
      setError("Device ID is required (e.g. KBX-001)");
      return;
    }
    if (!modelCode) {
      setError("Please select a device model");
      return;
    }
    if (!rawSecret || rawSecret.length < 16) {
      setError("Secret key must be at least 16 characters");
      return;
    }
    const macRegex = /^([0-9a-fA-F]{2}[:-]){5}([0-9a-fA-F]{2})$/;
    if (!macRegex.test(ethMac.trim())) {
      setError("Invalid MAC address (e.g. 00:1A:2B:3C:4D:5E)");
      return;
    }
    if (!bleMac.trim()) {
      setError("Bluetooth MAC is required — the mobile app connects to the device over BLE using this address");
      return;
    }
    if (!macRegex.test(bleMac.trim())) {
      setError("Invalid Bluetooth MAC address (e.g. 00:1A:2B:3C:4D:5E)");
      return;
    }
    if (wlanMac.trim() && !macRegex.test(wlanMac.trim())) {
      setError("Invalid WLAN MAC address (e.g. 00:1A:2B:3C:4D:5E)");
      return;
    }

    setLoading(true);
    const payload: FactoryRegisterPayload = {
      device_id: deviceId.trim().toUpperCase(),
      model_code: modelCode,
      raw_secret: rawSecret.trim(),
      eth_mac: ethMac.trim().toLowerCase(),
      ble_mac: bleMac.trim().toLowerCase(),
      soc_serial: socSerial.trim() || undefined,
      wlan_mac: wlanMac.trim().toLowerCase() || undefined,
      machine: machine.trim() || undefined,
      soc_id: socId.trim() || undefined,
      storage_serial: storageSerial.trim() || undefined,
    };

    const res = await factoryRegisterDeviceAction(payload);
    setLoading(false);

    if (!res.success) {
      setError(res.error || "Failed to add device");
    } else {
      setRegisteredSuccess(true);
      onSuccess?.();
    }
  }

  function handleClose() {
    setDeviceId("");
    setRawSecret(generateSecret());
    setEthMac("");
    setBleMac("");
    setSocSerial("");
    setWlanMac("");
    setMachine("");
    setSocId("");
    setStorageSerial("");
    setShowAdvanced(false);
    setRegisteredSuccess(false);
    setError(null);
    setIssuedToken(null);
    setTokenError(null);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Plus className="h-4 w-4" />
            </span>
            <div>
              <DialogTitle>Add Device</DialogTitle>
              <DialogDescription>
                Register a new device into stock.
              </DialogDescription>
            </div>
          </div>

          {/* Mode Switcher */}
          {!registeredSuccess && (
            <div className="flex items-center gap-1 mt-3 p-1 bg-muted/60 rounded-md">
              <button
                type="button"
                onClick={() => setMode("token")}
                className={`flex-1 py-1 text-xs font-medium rounded transition-colors flex items-center justify-center gap-1.5 ${
                  mode === "token" ? "bg-card text-foreground shadow-xs" : "text-muted-foreground"
                }`}
              >
                <QrCode className="h-3 w-3" />
                Factory Token
              </button>
              <button
                type="button"
                onClick={() => setMode("manual")}
                className={`flex-1 py-1 text-xs font-medium rounded transition-colors flex items-center justify-center gap-1.5 ${
                  mode === "manual" ? "bg-card text-foreground shadow-xs" : "text-muted-foreground"
                }`}
              >
                <ClipboardList className="h-3 w-3" />
                Manual Form
              </button>
            </div>
          )}
        </DialogHeader>

        {registeredSuccess ? (
          <div className="flex flex-col gap-4 py-2">
            <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-3.5">
              <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-medium text-xs">
                <CheckCircle2 className="h-4 w-4" />
                Device {deviceId} Added Successfully!
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Device is now in <strong>In Stock</strong>. Save the config below onto the device before shipping.
              </p>
            </div>

            <div className="flex flex-col gap-2 rounded-lg border border-border bg-muted/40 p-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <KeyRound className="h-3.5 w-3.5 text-primary" />
                  Device Config (/etc/kairos/device.env)
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs gap-1"
                  onClick={() => {
                    navigator.clipboard.writeText(envSnippet);
                    setCopiedConfig(true);
                    setTimeout(() => setCopiedConfig(false), 2000);
                  }}
                >
                  {copiedConfig ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                  {copiedConfig ? "Copied" : "Copy"}
                </Button>
              </div>
              <pre className="text-xs font-mono bg-background p-2.5 rounded border border-border/70 overflow-x-auto text-foreground">
                {envSnippet}
              </pre>
            </div>

            <DialogFooter>
              <Button onClick={handleClose} className="w-full sm:w-auto">
                Done
              </Button>
            </DialogFooter>
          </div>
        ) : mode === "token" ? (
          <div className="flex flex-col gap-3.5 py-1">
            {tokenError && (
              <div className="flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/10 p-2.5 text-xs text-destructive">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{tokenError}</span>
              </div>
            )}

            {!issuedToken ? (
              <>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Generate a short-lived, one-time code. Type it into the factory-floor script running on the EdgeBox — the device registers itself with no admin credential needed.
                </p>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-foreground">
                    Device Model <span className="text-destructive">*</span>
                  </label>
                  <div className="relative">
                    <select
                      value={tokenModelCode}
                      onChange={(e) => setTokenModelCode(e.target.value)}
                      disabled={modelsLoading}
                      className="h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50"
                      required
                    >
                      {modelsLoading ? (
                        <option value="">Loading models...</option>
                      ) : models.length === 0 ? (
                        <option value="">No models available</option>
                      ) : (
                        models.map((m) => (
                          <option key={m.code} value={m.code}>
                            {m.name}
                          </option>
                        ))
                      )}
                    </select>
                    {modelsLoading && (
                      <RefreshCw className="absolute right-8 top-1/2 -translate-y-1/2 h-3.5 w-3.5 animate-spin text-muted-foreground pointer-events-none" />
                    )}
                  </div>
                </div>

                <DialogFooter className="mt-2">
                  <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={tokenLoading}>
                    Cancel
                  </Button>
                  <Button type="button" onClick={handleGenerateToken} disabled={tokenLoading} className="gap-2">
                    {tokenLoading && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
                    {tokenLoading ? "Generating..." : "Generate Token"}
                  </Button>
                </DialogFooter>
              </>
            ) : (
              <>
                <div
                  className={`rounded-lg border p-3.5 ${
                    tokenExpired
                      ? "border-destructive/20 bg-destructive/10"
                      : "border-emerald-500/20 bg-emerald-500/10"
                  }`}
                >
                  <div
                    className={`flex items-center gap-2 font-medium text-xs ${
                      tokenExpired ? "text-destructive" : "text-emerald-600 dark:text-emerald-400"
                    }`}
                  >
                    <Timer className="h-4 w-4" />
                    {tokenExpired ? "Token expired" : `Expires in ${formatCountdown(msRemaining)}`}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Reserved for model <strong>{issuedToken.device_model}</strong>. Single use only.
                  </p>
                </div>

                <div className="flex flex-col gap-2 rounded-lg border border-border bg-muted/40 p-4">
                  <span className="text-xs font-medium text-muted-foreground">Enter this code on the EdgeBox</span>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 text-center text-3xl font-mono font-bold tracking-[0.3em] text-foreground bg-background rounded-md border border-border/70 py-3">
                      {issuedToken.token}
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-full px-3"
                      onClick={() => {
                        navigator.clipboard.writeText(issuedToken.token);
                        setCopiedToken(true);
                        setTimeout(() => setCopiedToken(false), 2000);
                      }}
                    >
                      {copiedToken ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                <DialogFooter className="mt-2">
                  <Button type="button" variant="outline" onClick={() => setIssuedToken(null)}>
                    Generate Another
                  </Button>
                  <Button type="button" onClick={() => onOpenChange(false)}>
                    Done
                  </Button>
                </DialogFooter>
              </>
            )}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-3.5 py-1">
            {error && (
              <div className="flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/10 p-2.5 text-xs text-destructive">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-foreground">
                  Device ID <span className="text-destructive">*</span>
                </label>
                <Input
                  placeholder="e.g. KBX-001"
                  value={deviceId}
                  onChange={(e) => setDeviceId(e.target.value.toUpperCase())}
                  required
                  className="font-mono text-xs"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-foreground">
                  Device Model <span className="text-destructive">*</span>
                </label>
                <div className="relative">
                  <select
                    value={modelCode}
                    onChange={(e) => setModelCode(e.target.value)}
                    disabled={modelsLoading}
                    className="h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50"
                    required
                  >
                    {modelsLoading ? (
                      <option value="">Loading models...</option>
                    ) : models.length === 0 ? (
                      <option value="">No models available</option>
                    ) : (
                      models.map((m) => (
                        <option key={m.code} value={m.code}>
                          {m.name}
                        </option>
                      ))
                    )}
                  </select>
                  {modelsLoading && (
                    <RefreshCw className="absolute right-8 top-1/2 -translate-y-1/2 h-3.5 w-3.5 animate-spin text-muted-foreground pointer-events-none" />
                  )}
                </div>
              </div>
            </div>

            {/* Secret */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-foreground flex items-center gap-1">
                  <KeyRound className="h-3 w-3 text-primary" />
                  Secret Key <span className="text-destructive">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => setRawSecret(generateSecret())}
                  className="text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-1"
                >
                  <RefreshCw className="h-3 w-3" />
                  Generate New
                </button>
              </div>
              <div className="flex gap-2">
                <Input
                  value={rawSecret}
                  onChange={(e) => setRawSecret(e.target.value)}
                  placeholder="At least 16 characters"
                  className="font-mono text-xs"
                  required
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="px-2.5 shrink-0"
                  onClick={() => {
                    navigator.clipboard.writeText(rawSecret);
                    setCopiedSecret(true);
                    setTimeout(() => setCopiedSecret(false), 2000);
                  }}
                >
                  {copiedSecret ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                </Button>
              </div>
            </div>

            {/* MAC & Serial */}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-foreground">
                  Ethernet MAC <span className="text-destructive">*</span>
                </label>
                <Input
                  placeholder="00:1A:2B:3C:4D:5E"
                  value={ethMac}
                  onChange={(e) => setEthMac(e.target.value)}
                  required
                  className="font-mono text-xs"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-foreground">
                  Bluetooth MAC <span className="text-destructive">*</span>
                </label>
                <Input
                  placeholder="00:1A:2B:3C:4D:5E"
                  value={bleMac}
                  onChange={(e) => setBleMac(e.target.value)}
                  required
                  className="font-mono text-xs"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-foreground">
                CPU / SoC Serial (Optional)
              </label>
              <Input
                placeholder="e.g. 02c00081d5930b56"
                value={socSerial}
                onChange={(e) => setSocSerial(e.target.value)}
                className="font-mono text-xs"
              />
            </div>

            {/* Advanced Hardware Info */}
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => setShowAdvanced((v) => !v)}
                className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground self-start"
              >
                {showAdvanced ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                Advanced Hardware Info (Optional)
              </button>

              {showAdvanced && (
                <div className="flex flex-col gap-3 rounded-lg border border-border bg-muted/30 p-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-medium text-foreground">WLAN MAC</label>
                      <Input
                        placeholder="00:1A:2B:3C:4D:5E"
                        value={wlanMac}
                        onChange={(e) => setWlanMac(e.target.value)}
                        className="font-mono text-xs"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-medium text-foreground">SoC ID</label>
                      <Input
                        placeholder="e.g. QCS6490"
                        value={socId}
                        onChange={(e) => setSocId(e.target.value)}
                        className="font-mono text-xs"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-medium text-foreground">Machine / Architecture</label>
                      <Input
                        placeholder="e.g. aarch64"
                        value={machine}
                        onChange={(e) => setMachine(e.target.value)}
                        className="font-mono text-xs"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-medium text-foreground">Storage Serial</label>
                      <Input
                        placeholder="e.g. S4J2NX0M123456"
                        value={storageSerial}
                        onChange={(e) => setStorageSerial(e.target.value)}
                        className="font-mono text-xs"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            <DialogFooter className="mt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading} className="gap-2">
                {loading && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
                {loading ? "Adding..." : "Add to Stock"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
