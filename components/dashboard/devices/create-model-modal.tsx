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
import { Cpu, RefreshCw, AlertCircle } from "lucide-react";
import { createDeviceModelAction } from "@/lib/actions/device.actions";

interface CreateModelModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function CreateModelModal({
  open,
  onOpenChange,
  onSuccess,
}: CreateModelModalProps) {
  const [code, setCode] = React.useState("");
  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [npuTops, setNpuTops] = React.useState("6");
  const [ramGb, setRamGb] = React.useState("8");
  const [storageGb, setStorageGb] = React.useState("64");
  const [maxStreams, setMaxStreams] = React.useState("8");
  const [soc, setSoc] = React.useState("RK3588S");

  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    setCode("");
    setName("");
    setDescription("");
    setError(null);
  }, [open]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim() || !name.trim()) {
      setError("Model code and name are required");
      return;
    }

    setLoading(true);
    setError(null);

    const res = await createDeviceModelAction({
      code: code.trim().toUpperCase(),
      name: name.trim(),
      description: description.trim() || undefined,
      specs: {
        npuTops: Number(npuTops) || 0,
        ramGb: Number(ramGb) || 4,
        storageGb: Number(storageGb) || 32,
        maxStreams: Number(maxStreams) || 4,
        soc: soc.trim(),
      },
      is_active: true,
    });

    setLoading(false);
    if (!res.success) {
      setError(res.error || "Failed to create model");
    } else {
      onSuccess?.();
      onOpenChange(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Cpu className="h-4 w-4" />
            </span>
            <div>
              <DialogTitle>Add Device Model</DialogTitle>
              <DialogDescription>
                Define a new device hardware model.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

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
                Model Code <span className="text-destructive">*</span>
              </label>
              <Input
                placeholder="e.g. RADXA_DRAGON_Q6A"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                required
                className="font-mono text-xs"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-foreground">
                Model Name <span className="text-destructive">*</span>
              </label>
              <Input
                placeholder="e.g. Kairos EdgeBox Q6A"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="text-xs"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-foreground">
              Description (Optional)
            </label>
            <Input
              placeholder="e.g. 8-channel CCTV Edge AI box"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="text-xs"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-foreground">Processor (SoC)</label>
              <Input
                placeholder="e.g. RK3588S"
                value={soc}
                onChange={(e) => setSoc(e.target.value)}
                className="text-xs"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-foreground">Max Cameras</label>
              <Input
                type="number"
                placeholder="8"
                value={maxStreams}
                onChange={(e) => setMaxStreams(e.target.value)}
                className="text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-foreground">RAM (GB)</label>
              <Input
                type="number"
                placeholder="8"
                value={ramGb}
                onChange={(e) => setRamGb(e.target.value)}
                className="text-xs"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-foreground">Storage (GB)</label>
              <Input
                type="number"
                placeholder="64"
                value={storageGb}
                onChange={(e) => setStorageGb(e.target.value)}
                className="text-xs"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-foreground">AI TOPS</label>
              <Input
                type="number"
                placeholder="6"
                value={npuTops}
                onChange={(e) => setNpuTops(e.target.value)}
                className="text-xs"
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
              {loading ? "Saving..." : "Save Model"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
