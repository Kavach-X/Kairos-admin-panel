"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RefreshCw, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { createDeviceModelAction, updateDeviceModelAction } from "@/lib/actions/device.actions";
import type { DeviceModel } from "@/lib/types";
import { readModelSpecs, toModelSpecs } from "./model-specs";

interface CreateModelModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  /** Edit this model instead of creating a new one. */
  model?: DeviceModel | null;
}

/** Add or edit a hardware model. The form mounts fresh on every open, so it always starts from the model's saved values. */
export function CreateModelModal({ open, onOpenChange, onSuccess, model }: CreateModelModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        {open && <ModelForm model={model ?? null} onOpenChange={onOpenChange} onSuccess={onSuccess} />}
      </DialogContent>
    </Dialog>
  );
}

const numOrNull = (v: string) => (v.trim() !== "" && Number(v) > 0 ? Number(v) : null);

function Field({ label, children }: { label: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium text-foreground">{label}</label>
      {children}
    </div>
  );
}

function ModelForm({
  model,
  onOpenChange,
  onSuccess,
}: {
  model: DeviceModel | null;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}) {
  const editing = model !== null;
  const saved = readModelSpecs(model?.specs);
  const str = (n: number | null) => (n === null ? "" : String(n));

  const [code, setCode] = React.useState(model?.code ?? "");
  const [name, setName] = React.useState(model?.name ?? "");
  const [description, setDescription] = React.useState(model?.description ?? "");
  const [processor, setProcessor] = React.useState(saved.processor ?? "");
  const [maxCameras, setMaxCameras] = React.useState(str(saved.maxCameras));
  const [ramGb, setRamGb] = React.useState(str(saved.ramGb));
  const [storageGb, setStorageGb] = React.useState(str(saved.storageGb));
  const [aiTops, setAiTops] = React.useState(str(saved.aiTops));
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim() || !name.trim()) {
      setError("Model code and name are required");
      return;
    }
    setLoading(true);
    setError(null);

    const specs = toModelSpecs(model?.specs, {
      processor: processor.trim() || null,
      aiTops: numOrNull(aiTops),
      ramGb: numOrNull(ramGb),
      storageGb: numOrNull(storageGb),
      maxCameras: numOrNull(maxCameras),
    });
    const res = editing
      ? await updateDeviceModelAction(model.code, { name: name.trim(), description: description.trim(), specs })
      : await createDeviceModelAction({
          code: code.trim().toUpperCase(),
          name: name.trim(),
          description: description.trim() || undefined,
          specs,
          is_active: true,
        });

    setLoading(false);
    if (!res.success) {
      setError(res.error || (editing ? "Failed to update model" : "Failed to create model"));
      return;
    }
    toast.success(editing ? "Model updated" : "Model added");
    onSuccess?.();
    onOpenChange(false);
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>{editing ? `Edit ${model.name}` : "Add device model"}</DialogTitle>
        <DialogDescription>
          {editing ? "Leave a field empty if it is not known." : "A hardware version that devices are registered against."}
        </DialogDescription>
      </DialogHeader>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3.5 py-1">
        {error && (
          <div className="flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/10 p-2.5 text-xs text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Field label={<>Model code <span className="text-destructive">*</span></>}>
            <Input
              placeholder="e.g. RADXA_DRAGON_Q6A"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              required
              disabled={editing}
              className="font-mono text-xs"
            />
          </Field>
          <Field label={<>Model name <span className="text-destructive">*</span></>}>
            <Input placeholder="e.g. Radxa Dragon Q6A" value={name} onChange={(e) => setName(e.target.value)} required className="text-xs" />
          </Field>
        </div>

        <Field label="Description">
          <Input placeholder="Optional" value={description} onChange={(e) => setDescription(e.target.value)} className="text-xs" />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Processor">
            <Input placeholder="e.g. Qualcomm QCS6490" value={processor} onChange={(e) => setProcessor(e.target.value)} className="text-xs" />
          </Field>
          <Field label="Max cameras">
            <Input type="number" min={1} placeholder="e.g. 5" value={maxCameras} onChange={(e) => setMaxCameras(e.target.value)} className="text-xs" />
          </Field>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <Field label="RAM (GB)">
            <Input type="number" min={0} placeholder="e.g. 8" value={ramGb} onChange={(e) => setRamGb(e.target.value)} className="text-xs" />
          </Field>
          <Field label="Storage (GB)">
            <Input type="number" min={0} placeholder="e.g. 128" value={storageGb} onChange={(e) => setStorageGb(e.target.value)} className="text-xs" />
          </Field>
          <Field label="AI compute (TOPS)">
            <Input type="number" min={0} step="any" placeholder="e.g. 12" value={aiTops} onChange={(e) => setAiTops(e.target.value)} className="text-xs" />
          </Field>
        </div>

        <p className="text-[11px] text-muted-foreground">Max cameras also sets how many cameras a device of this model can add.</p>

        <DialogFooter className="mt-1">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading} className="gap-2">
            {loading && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
            {loading ? "Saving..." : editing ? "Save changes" : "Add model"}
          </Button>
        </DialogFooter>
      </form>
    </>
  );
}
