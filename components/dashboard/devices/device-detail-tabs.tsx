"use client";

import * as React from "react";
import { StatusTabs } from "@/components/dashboard/list-page";

type Tab = "health" | "events" | "cameras" | "hardware";

/**
 * Tabs for the device page. A panel mounts the first time its tab is opened and then stays mounted
 * (hidden), so switching back never refetches telemetry or redraws charts from scratch.
 */
export function DeviceDetailTabs({
  cameraCount,
  health,
  events,
  cameras,
  hardware,
}: {
  cameraCount: number;
  health: React.ReactNode;
  events: React.ReactNode;
  cameras: React.ReactNode;
  hardware: React.ReactNode;
}) {
  const [active, setActive] = React.useState<Tab>("health");
  const [opened, setOpened] = React.useState<Set<Tab>>(() => new Set(["health"]));
  const panels: Record<Tab, React.ReactNode> = { health, events, cameras, hardware };

  const open = (tab: Tab) => {
    setActive(tab);
    setOpened((prev) => (prev.has(tab) ? prev : new Set(prev).add(tab)));
  };

  return (
    <>
      <StatusTabs<Tab>
        label="Device sections"
        tabs={[
          { value: "health", label: "Health" },
          { value: "events", label: "Events" },
          { value: "cameras", label: "Cameras", count: cameraCount },
          { value: "hardware", label: "Hardware & access" },
        ]}
        active={active}
        onChange={open}
      />
      {(Object.keys(panels) as Tab[]).map((tab) =>
        opened.has(tab) ? (
          <div key={tab} role="tabpanel" hidden={tab !== active} className="flex flex-col gap-5">
            {panels[tab]}
          </div>
        ) : null
      )}
    </>
  );
}
