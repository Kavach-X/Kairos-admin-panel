"use client";

import * as React from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Cpu,
  Plus,
  Search,
  HardDrive,
  Layers,
  Video,
  X,
} from "lucide-react";
import type { DeviceModel } from "@/lib/types";
import { getDeviceModelsAction } from "@/lib/actions/device.actions";
import { CreateModelModal } from "@/components/dashboard/devices/create-model-modal";

export default function DeviceModelsPage() {
  const [models, setModels] = React.useState<DeviceModel[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState("");
  const [isCreateOpen, setIsCreateOpen] = React.useState(false);

  const fetchModels = React.useCallback(async () => {
    setLoading(true);
    const res = await getDeviceModelsAction();
    if (res.success && res.data) {
      setModels(res.data);
    }
    setLoading(false);
  }, []);

  React.useEffect(() => {
    fetchModels();
  }, [fetchModels]);

  const filteredModels = models.filter((m) => {
    const term = search.toLowerCase();
    return (
      m.name.toLowerCase().includes(term) ||
      m.code.toLowerCase().includes(term) ||
      (m.description && m.description.toLowerCase().includes(term))
    );
  });

  const totalModels = models.length;
  const totalDevicesCount = models.reduce((acc, m) => acc + (m._count?.devices || 0), 0);

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between pb-1">
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-foreground">
            Hardware Models
          </h1>
          <p className="text-xs text-muted-foreground">
            Device hardware profiles, chipset configurations, and camera channel capacity
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={() => setIsCreateOpen(true)}
            className="h-8 text-xs font-normal gap-1.5"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Model
          </Button>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Card className="border-border/50 bg-card p-4 shadow-none hover:border-border transition-colors duration-100">
          <CardContent className="p-0 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                Total Models
              </span>
              <span className="font-mono text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                catalog
              </span>
            </div>
            <div className="flex items-baseline justify-between">
              {loading ? (
                <Skeleton className="h-7 w-14" />
              ) : (
                <span className="font-mono text-2xl font-bold tracking-tight text-foreground">
                  {totalModels}
                </span>
              )}
              <span className="text-[11px] text-muted-foreground/70">
                hardware series
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card p-4 shadow-none hover:border-border transition-colors duration-100">
          <CardContent className="p-0 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                Active Devices
              </span>
              <span className="font-mono text-[11px] font-medium text-blue-600 dark:text-blue-400">
                fleet
              </span>
            </div>
            <div className="flex items-baseline justify-between">
              {loading ? (
                <Skeleton className="h-7 w-14" />
              ) : (
                <span className="font-mono text-2xl font-bold tracking-tight text-foreground">
                  {totalDevicesCount}
                </span>
              )}
              <span className="text-[11px] text-muted-foreground/70">
                hardware units registered
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search Bar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <Input
            placeholder="Search models..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 pr-8 text-xs h-8 border-border/50 bg-card shadow-none"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Models Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="h-44 animate-pulse bg-muted/40 border-border/40 shadow-none" />
          ))}
        </div>
      ) : filteredModels.length === 0 ? (
        <Card className="p-12 text-center border-dashed border-border/60 bg-muted/20 shadow-none">
          <Cpu className="h-8 w-8 text-muted-foreground mx-auto mb-2 opacity-40" />
          <h3 className="text-sm font-semibold text-foreground">No Models Found</h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">
            {search ? "No models match your search." : "Add your first device model to get started."}
          </p>
          {!search && (
            <Button
              size="sm"
              onClick={() => setIsCreateOpen(true)}
              className="mt-4 text-xs font-normal gap-1"
            >
              <Plus className="h-3 w-3" />
              Add Model
            </Button>
          )}
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredModels.map((model) => {
            const specs = model.specs || {};
            return (
              <Card
                key={model.id}
                className="overflow-hidden border-border/50 bg-card shadow-none hover:border-border transition-colors flex flex-col justify-between"
              >
                <CardHeader className="p-4 pb-3 border-b border-border/40 bg-muted/20">
                  <div>
                    <CardTitle className="text-sm font-semibold text-foreground">
                      {model.name}
                    </CardTitle>
                    <span className="font-mono text-[11px] text-muted-foreground tracking-wider block mt-0.5">
                      {model.code}
                    </span>
                  </div>
                  {model.description && (
                    <p className="text-xs text-muted-foreground mt-2 line-clamp-2 leading-relaxed">
                      {model.description}
                    </p>
                  )}
                </CardHeader>

                <CardContent className="p-4 flex flex-col gap-3 text-xs">
                  {/* Specs Grid */}
                  <div className="grid grid-cols-2 gap-2 bg-muted/40 p-2.5 rounded-lg border border-border/50 text-[11px]">
                    <div>
                      <span className="text-muted-foreground text-[10px] block">Processor</span>
                      <span className="font-semibold text-foreground truncate block">
                        {specs.soc || "ARM64"}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground text-[10px] block">Max Cameras</span>
                      <span className="font-semibold text-foreground flex items-center gap-1">
                        <Video className="h-3 w-3 text-primary" />
                        {specs.maxStreams || 4} feeds
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground text-[10px] block">RAM / Storage</span>
                      <span className="font-semibold text-foreground">
                        {specs.ramGb || 4}GB / {specs.storageGb || 32}GB
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground text-[10px] block">AI TOPS</span>
                      <span className="font-semibold text-foreground">
                        {specs.npuTops ? `${specs.npuTops} TOPS` : "Standard"}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1">
                    <span>Devices Using This Model:</span>
                    <strong className="text-foreground">{model._count?.devices || 0}</strong>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add Model Modal */}
      <CreateModelModal
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        onSuccess={fetchModels}
      />
    </div>
  );
}
