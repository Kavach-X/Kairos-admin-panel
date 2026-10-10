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
  Terminal,
  FileCode2,
} from "lucide-react";
import type { DeviceModel, FactoryRegisterPayload } from "@/lib/types";
import { factoryRegisterDeviceAction } from "@/lib/actions/device.actions";

interface FactoryRegisterModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  models: DeviceModel[];
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

export function FactoryRegisterModal({
  open,
  onOpenChange,
  models,
  onSuccess,
}: FactoryRegisterModalProps) {
  const [mode, setMode] = React.useState<"form" | "edgebox">("form");

  const [deviceId, setDeviceId] = React.useState("");
  const [modelCode, setModelCode] = React.useState("");
  const [rawSecret, setRawSecret] = React.useState("");
  const [ethMac, setEthMac] = React.useState("");
  const [socSerial, setSocSerial] = React.useState("");

  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [registeredSuccess, setRegisteredSuccess] = React.useState<boolean>(false);
  const [copiedSecret, setCopiedSecret] = React.useState(false);
  const [copiedConfig, setCopiedConfig] = React.useState(false);
  const [copiedCmd, setCopiedCmd] = React.useState(false);

  React.useEffect(() => {
    if (!open) {
      setDeviceId("");
      setEthMac("");
      setSocSerial("");
      setRawSecret("");
      setError(null);
      setRegisteredSuccess(false);
      setMode("form");
    } else {
      if (models.length > 0) {
        setModelCode(models[0].code);
      }
      setRawSecret(generateSecret());
      setError(null);
      setRegisteredSuccess(false);
    }
  }, [open, models]);

  const envSnippet = `# /etc/kairos/device.env
KAIROS_DEVICE_ID="${deviceId}"
KAIROS_DEVICE_SECRET="${rawSecret}"
KAIROS_MODEL_CODE="${modelCode}"
`;

  const edgeboxAutoCmd = `# Run directly in EdgeBox terminal:
ETH_MAC=$(cat /sys/class/net/eth0/address 2>/dev/null || cat /sys/class/net/eth*/address 2>/dev/null | head -n1)
SOC_SR=$(cat /proc/cpuinfo | grep -m1 "Serial" | awk '{print $3}')
DEV_ID="KBX-$(echo $ETH_MAC | tr -d ':' | tail -c 5 | tr 'a-z' 'A-Z')"
SEC=$(openssl rand -hex 12)

echo "Device ID: $DEV_ID"
echo "MAC: $ETH_MAC"

# Register into cloud
curl -s -X POST "https://kairos-backend-351319738025.asia-south1.run.app/api/v1/devices/factory-register" \\
  -H "Content-Type: application/json" \\
  -d '{
    "device_id": "'$DEV_ID'",
    "model_code": "RADXA_DRAGON_Q6A",
    "raw_secret": "'$SEC'",
    "eth_mac": "'$ETH_MAC'",
    "soc_serial": "'$SOC_SR'"
  }'

# Save local identity
mkdir -p /etc/kairos
cat <<EOF > /etc/kairos/device.env
KAIROS_DEVICE_ID="$DEV_ID"
KAIROS_DEVICE_SECRET="$SEC"
EOF
echo "Device registered and configured!"
`;

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

    setLoading(true);
    const payload: FactoryRegisterPayload = {
      device_id: deviceId.trim().toUpperCase(),
      model_code: modelCode,
      raw_secret: rawSecret.trim(),
      eth_mac: ethMac.trim().toLowerCase(),
      soc_serial: socSerial.trim() || undefined,
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
    setSocSerial("");
    setRegisteredSuccess(false);
    setError(null);
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
                onClick={() => setMode("form")}
                className={`flex-1 py-1 text-xs font-medium rounded transition-colors ${
                  mode === "form" ? "bg-card text-foreground shadow-xs" : "text-muted-foreground"
                }`}
              >
                Manual Form
              </button>
              <button
                type="button"
                onClick={() => setMode("edgebox")}
                className={`flex-1 py-1 text-xs font-medium rounded transition-colors flex items-center justify-center gap-1.5 ${
                  mode === "edgebox" ? "bg-card text-foreground shadow-xs" : "text-muted-foreground"
                }`}
              >
                <Terminal className="h-3 w-3" />
                Run on EdgeBox (1-Command)
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
                  <FileCode2 className="h-3.5 w-3.5 text-primary" />
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
        ) : mode === "edgebox" ? (
          <div className="flex flex-col gap-3 py-2">
            <p className="text-xs text-muted-foreground leading-relaxed">
              If you have SSH or terminal access to the edgebox, run this command on the device. It reads the MAC and CPU serial automatically and registers into stock:
            </p>
            <div className="relative rounded-lg border border-border bg-muted/60 p-3">
              <Button
                size="sm"
                variant="outline"
                className="absolute top-2.5 right-2.5 h-7 text-xs gap-1 bg-background"
                onClick={() => {
                  navigator.clipboard.writeText(edgeboxAutoCmd);
                  setCopiedCmd(true);
                  setTimeout(() => setCopiedCmd(false), 2000);
                }}
              >
                {copiedCmd ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                {copiedCmd ? "Copied" : "Copy Command"}
              </Button>
              <pre className="text-[11px] font-mono overflow-x-auto text-foreground pr-20 pt-1 leading-relaxed">
                {edgeboxAutoCmd}
              </pre>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Close
              </Button>
            </DialogFooter>
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
                <select
                  value={modelCode}
                  onChange={(e) => setModelCode(e.target.value)}
                  className="h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  required
                >
                  {models.length === 0 ? (
                    <option value="">No models available</option>
                  ) : (
                    models.map((m) => (
                      <option key={m.code} value={m.code}>
                        {m.name}
                      </option>
                    ))
                  )}
                </select>
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
                  CPU / SoC Serial (Optional)
                </label>
                <Input
                  placeholder="e.g. 02c00081d5930b56"
                  value={socSerial}
                  onChange={(e) => setSocSerial(e.target.value)}
                  className="font-mono text-xs"
                />
              </div>
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
