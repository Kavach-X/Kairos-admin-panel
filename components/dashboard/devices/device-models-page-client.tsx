"use client";

import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Cpu, Pencil, Plus } from "lucide-react";
import { EmptyTableRow, PageHeader, SearchBox } from "@/components/dashboard/list-page";
import { SURFACE, TH, THEAD } from "@/components/dashboard/detail-header";
import type { DeviceModel } from "@/lib/types";
import { getDeviceModelsAction } from "@/lib/actions/device.actions";
import { CreateModelModal } from "@/components/dashboard/devices/create-model-modal";
import { readModelSpecs } from "./model-specs";

const dash = <span className="text-muted-foreground/60">—</span>;

export function DeviceModelsPageClient({ initialModels }: { initialModels: DeviceModel[] }) {
  const [models, setModels] = React.useState<DeviceModel[]>(initialModels);
  const [search, setSearch] = React.useState("");
  const [isCreateOpen, setIsCreateOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<DeviceModel | null>(null);

  const fetchModels = React.useCallback(async () => {
    const res = await getDeviceModelsAction();
    if (res.success && res.data) setModels(res.data);
  }, []);

  const term = search.toLowerCase();
  const filtered = models.filter(
    (m) => m.name.toLowerCase().includes(term) || m.code.toLowerCase().includes(term) || (m.description ?? "").toLowerCase().includes(term)
  );
  const totalDevices = models.reduce((acc, m) => acc + (m._count?.devices || 0), 0);
  const retired = models.filter((m) => !m.is_active).length;

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Hardware Models"
        subtitle={`${models.length} ${models.length === 1 ? "model" : "models"}${retired ? ` (${retired} retired)` : ""} · ${totalDevices} devices registered`}
        actions={
          <>
            {models.length > 5 && <SearchBox value={search} onChange={setSearch} placeholder="Search models..." className="w-56" />}
            <Button size="sm" onClick={() => setIsCreateOpen(true)} className="h-8 gap-1.5 text-xs font-normal">
              <Plus className="h-3.5 w-3.5" />
              Add Model
            </Button>
          </>
        }
      />

      <div className={`${SURFACE} overflow-hidden`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className={THEAD}>
              <tr>
                <th className={TH}>Model</th>
                <th className={TH}>Processor</th>
                <th className={`${TH} text-right`}>AI compute</th>
                <th className={`${TH} text-right`}>RAM</th>
                <th className={`${TH} text-right`}>Storage</th>
                <th className={`${TH} text-right`}>Max cameras</th>
                <th className={`${TH} w-44`}>Devices</th>
                <th className={TH}>
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {filtered.length === 0 ? (
                <EmptyTableRow
                  colSpan={8}
                  icon={Cpu}
                  title={search ? "No matching models" : "No models yet"}
                  hint={search ? "Try a different search." : "Add a model before registering devices."}
                />
              ) : (
                filtered.map((model) => {
                  const s = readModelSpecs(model.specs);
                  const count = model._count?.devices || 0;
                  const share = totalDevices > 0 ? count / totalDevices : 0;
                  return (
                    <tr key={model.id} className={model.is_active ? "" : "text-muted-foreground"}>
                      <td className="max-w-xs px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-foreground">{model.name}</span>
                          {!model.is_active && (
                            <Badge variant="outline" className="px-1.5 py-0 text-[10px] text-muted-foreground">
                              Retired
                            </Badge>
                          )}
                        </div>
                        <span className="block truncate font-mono text-[10px] text-muted-foreground" title={model.description ?? undefined}>
                          {model.code}
                          {model.description ? <span className="font-sans"> · {model.description}</span> : null}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-foreground">{s.processor ?? dash}</td>
                      <td className="px-4 py-3 text-right font-mono">{s.aiTops !== null ? `${s.aiTops} TOPS` : dash}</td>
                      <td className="px-4 py-3 text-right font-mono">{s.ramGb !== null ? `${s.ramGb} GB` : dash}</td>
                      <td className="px-4 py-3 text-right font-mono">{s.storageGb !== null ? `${s.storageGb} GB` : dash}</td>
                      <td className="px-4 py-3 text-right font-mono">{s.maxCameras ?? dash}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="w-8 text-right font-mono text-foreground">{count}</span>
                          <div className="h-1.5 flex-1 rounded-full bg-muted" aria-hidden="true">
                            <div className="h-full rounded-full bg-primary" style={{ width: `${share * 100}%` }} />
                          </div>
                          <span className="w-8 text-right text-[11px] text-muted-foreground">{Math.round(share * 100)}%</span>
                        </div>
                      </td>
                      <td className="px-2 py-3 text-right">
                        <Button variant="ghost" size="sm" className="h-7 gap-1 px-2 text-xs" onClick={() => setEditing(model)}>
                          <Pencil className="size-3" />
                          Edit
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <CreateModelModal open={isCreateOpen} onOpenChange={setIsCreateOpen} onSuccess={fetchModels} />
      <CreateModelModal open={editing !== null} onOpenChange={(open) => !open && setEditing(null)} model={editing} onSuccess={fetchModels} />
    </div>
  );
}
