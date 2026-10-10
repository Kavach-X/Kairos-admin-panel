"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  ShieldCheck,
  Server,
  Bell,
  Save,
  CheckCircle2,
  User,
  Radio,
  Lock,
  Loader2,
} from "lucide-react";

export default function SettingsPage() {
  const [loading, setLoading] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState("5");
  const [soundAlerts, setSoundAlerts] = useState(true);
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    // Load from localStorage if present
    const savedInterval = localStorage.getItem("kairos_poll_interval");
    const savedSound = localStorage.getItem("kairos_sound_alerts");
    const savedEmail = localStorage.getItem("kairos_email_alerts");

    if (savedInterval) setRefreshInterval(savedInterval);
    if (savedSound !== null) setSoundAlerts(savedSound === "true");
    if (savedEmail !== null) setEmailAlerts(savedEmail === "true");
  }, []);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      localStorage.setItem("kairos_poll_interval", refreshInterval);
      localStorage.setItem("kairos_sound_alerts", String(soundAlerts));
      localStorage.setItem("kairos_email_alerts", String(emailAlerts));

      setTimeout(() => {
        setLoading(false);
        setSaved(true);
        toast.success("Settings saved successfully");
        setTimeout(() => setSaved(false), 3000);
      }, 400);
    } catch {
      setLoading(false);
      toast.error("Failed to save settings");
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-3xl">
      <div>
        <h1 className="font-heading text-2xl font-bold tracking-tight">System Settings</h1>
        <p className="text-sm text-muted-foreground">
          Platform preferences, live notification thresholds, and service connections
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Live Notification & Monitoring Preferences */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Bell className="size-4" />
              </div>
              <div>
                <CardTitle className="text-base">Live Monitoring Preferences</CardTitle>
                <CardDescription>
                  Configure telemetry update speed and real-time incident notifications
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="poll-speed" className="text-xs font-medium text-foreground">
                Real-Time Refresh Interval
              </label>
              <select
                id="poll-speed"
                value={refreshInterval}
                onChange={(e) => setRefreshInterval(e.target.value)}
                className="h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="5">Every 5 seconds (Recommended for Live Operations)</option>
                <option value="15">Every 15 seconds (Standard)</option>
                <option value="30">Every 30 seconds (Low Bandwidth)</option>
                <option value="60">Every 60 seconds</option>
              </select>
              <p className="text-[11px] text-muted-foreground">
                Controls how frequently the Audit & Activity timeline queries for newly recorded events.
              </p>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-border/60 p-3 bg-muted/20">
              <div className="space-y-0.5">
                <p className="text-xs font-medium text-foreground">Incident Audio Beep</p>
                <p className="text-[11px] text-muted-foreground">
                  Play an audible notification when a Critical Threat detection is received
                </p>
              </div>
              <input
                type="checkbox"
                checked={soundAlerts}
                onChange={(e) => setSoundAlerts(e.target.checked)}
                className="size-4 rounded border-input text-primary focus:ring-primary cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border border-border/60 p-3 bg-muted/20">
              <div className="space-y-0.5">
                <p className="text-xs font-medium text-foreground">Email Escalations</p>
                <p className="text-[11px] text-muted-foreground">
                  Send high-priority email alerts to platform administrators
                </p>
              </div>
              <input
                type="checkbox"
                checked={emailAlerts}
                onChange={(e) => setEmailAlerts(e.target.checked)}
                className="size-4 rounded border-input text-primary focus:ring-primary cursor-pointer"
              />
            </div>
          </CardContent>
        </Card>

        {/* Security & Access Policy */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="flex size-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600">
                <ShieldCheck className="size-4" />
              </div>
              <div>
                <CardTitle className="text-base">Security & Authentication</CardTitle>
                <CardDescription>
                  Protected by Better Auth with session token verification
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between rounded-lg border border-border/60 p-3 bg-muted/20">
              <div>
                <p className="text-xs font-medium text-foreground">Role Enforcement</p>
                <p className="text-[11px] text-muted-foreground">
                  Strict Super Admin verification on all device and account actions
                </p>
              </div>
              <Badge variant="success">
                Enforced
              </Badge>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-border/60 p-3 bg-muted/20">
              <div>
                <p className="text-xs font-medium text-foreground">Multi-Tenant Context</p>
                <p className="text-[11px] text-muted-foreground">
                  Internal Platform Account (System Tenant)
                </p>
              </div>
              <Badge variant="outline" className="text-xs font-mono">
                INTERNAL
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Connected Services & Infrastructure Health */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="flex size-8 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-600">
                <Server className="size-4" />
              </div>
              <div>
                <CardTitle className="text-base">System Infrastructure</CardTitle>
                <CardDescription>
                  Connected core services and cloud telemetry endpoints
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-2 text-xs">
            <div className="flex items-center justify-between p-2 rounded-md bg-muted/30">
              <span className="text-muted-foreground">Backend API Engine</span>
              <span className="font-mono text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1.5">
                <span className="size-1.5 rounded-full bg-emerald-500" />
                Express 5 (Online)
              </span>
            </div>

            <div className="flex items-center justify-between p-2 rounded-md bg-muted/30">
              <span className="text-muted-foreground">Database Storage</span>
              <span className="font-mono text-foreground font-medium">PostgreSQL (Prisma 7)</span>
            </div>

            <div className="flex items-center justify-between p-2 rounded-md bg-muted/30">
              <span className="text-muted-foreground">Video & Snapshot Storage</span>
              <span className="font-mono text-foreground font-medium">Cloudflare R2 Bucket</span>
            </div>

            <div className="flex items-center justify-between p-2 rounded-md bg-muted/30">
              <span className="text-muted-foreground">IoT Device Gateway</span>
              <span className="font-mono text-foreground font-medium">AWS IoT Core Shadow (MQTT)</span>
            </div>
          </CardContent>
        </Card>

        {/* Save Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          {saved && (
            <span className="text-xs text-emerald-600 font-medium flex items-center gap-1">
              <CheckCircle2 className="size-3.5" />
              Settings saved!
            </span>
          )}
          <Button type="submit" disabled={loading}>
            {loading ? (
              <Loader2 className="mr-1.5 size-4 animate-spin" />
            ) : (
              <Save className="mr-1.5 size-4" />
            )}
            Save Preferences
          </Button>
        </div>
      </form>
    </div>
  );
}
