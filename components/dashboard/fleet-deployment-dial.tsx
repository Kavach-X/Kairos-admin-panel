"use client";

import * as React from "react";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";

interface FleetDeploymentChartProps {
  totalDevices: number;
  deployedDevices: number;
  inStockDevices: number;
  withVendorDevices: number;
  maintenanceDevices: number;
}

export function FleetDeploymentChart({
  totalDevices,
  deployedDevices,
  inStockDevices,
  withVendorDevices,
  maintenanceDevices,
}: FleetDeploymentChartProps) {
  const deploymentRate =
    totalDevices > 0 ? Math.round((deployedDevices / totalDevices) * 100) : 0;

  // Rich multi-segment breakdown across entire inventory lifecycle
  const segments = [
    {
      name: "At Stores",
      value: deployedDevices,
      color: "var(--color-primary)",
      dotColor: "bg-primary",
      label: "Stores",
    },
    {
      name: "Warehouse Stock",
      value: inStockDevices,
      color: "hsl(217, 91%, 60%)",
      dotColor: "bg-blue-500",
      label: "Stock",
    },
    {
      name: "With Partners",
      value: withVendorDevices,
      color: "hsl(38, 92%, 50%)",
      dotColor: "bg-amber-500",
      label: "Vendors",
    },
    {
      name: "Maintenance",
      value: maintenanceDevices,
      color: "hsl(350, 89%, 60%)",
      dotColor: "bg-rose-500",
      label: "Repair",
    },
  ];

  const activeSegments = segments.filter((s) => s.value > 0);
  const data =
    activeSegments.length > 0
      ? activeSegments
      : [
          {
            name: "Unassigned",
            value: 1,
            color: "hsl(var(--muted-foreground) / 0.2)",
            dotColor: "bg-muted",
            label: "Stock",
          },
        ];

  return (
    <div className="flex flex-col items-center">
      {/* Sleek, centered Donut Chart with centered percentage */}
      <div className="relative w-full h-[135px] flex items-center justify-center">
        <ResponsiveContainer width="100%" height={135}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={43}
              outerRadius={59}
              paddingAngle={activeSegments.length > 1 ? 3 : 0}
              dataKey="value"
              stroke="transparent"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>

        {/* Crisp centered text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="font-mono text-xl font-bold tracking-tight text-foreground">
            {deploymentRate}%
          </span>
          <span className="text-[10px] text-muted-foreground">
            Deployed
          </span>
        </div>
      </div>

      {/* Multi-category inventory legend */}
      <div className="w-full grid grid-cols-3 gap-1.5 px-1 pt-2 text-xs border-t border-border/30 mt-1">
        <div className="flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-primary shrink-0" />
          <span className="text-[11px] text-muted-foreground truncate">
            Stores: <strong className="font-mono text-foreground">{deployedDevices}</strong>
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-blue-500 shrink-0" />
          <span className="text-[11px] text-muted-foreground truncate">
            Stock: <strong className="font-mono text-foreground">{inStockDevices}</strong>
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-amber-500 shrink-0" />
          <span className="text-[11px] text-muted-foreground truncate">
            Vendors: <strong className="font-mono text-foreground">{withVendorDevices}</strong>
          </span>
        </div>

        {maintenanceDevices > 0 && (
          <div className="flex items-center gap-1.5 col-span-3 pt-1">
            <span className="size-2 rounded-full bg-rose-500 shrink-0" />
            <span className="text-[11px] text-muted-foreground">
              Maintenance / Repair: <strong className="font-mono text-foreground">{maintenanceDevices}</strong>
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
