"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createTicketAction } from "@/lib/actions/ticket.actions";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import type { CustomerItem, TicketPriority } from "@/lib/types";

interface CreateTicketModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customers: CustomerItem[];
  onSuccess?: () => void;
}

export function CreateTicketModal({
  open,
  onOpenChange,
  customers,
  onSuccess,
}: CreateTicketModalProps) {
  const [loading, setLoading] = useState(false);
  const [customerId, setCustomerId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<TicketPriority>("MEDIUM");

  useEffect(() => {
    if (!open) {
      setCustomerId("");
      setTitle("");
      setDescription("");
      setPriority("MEDIUM");
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerId) {
      toast.error("Please select a customer");
      return;
    }
    if (!title.trim()) {
      toast.error("Please enter a ticket title");
      return;
    }
    if (!description.trim()) {
      toast.error("Please enter a ticket description");
      return;
    }

    setLoading(true);
    try {
      const res = await createTicketAction({
        businessAccountId: customerId,
        title: title.trim(),
        description: description.trim(),
        priority,
      });

      if (!res.success) {
        toast.error(res.error || "Failed to create ticket");
        return;
      }

      toast.success("Support ticket created successfully");
      onOpenChange(false);
      setTitle("");
      setDescription("");
      setCustomerId("");
      setPriority("MEDIUM");
      onSuccess?.();
    } catch {
      toast.error("Failed to create ticket");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create Support Ticket</DialogTitle>
          <DialogDescription>
            Report a hardware fault, camera lag, or network issue for a customer site.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="customer" className="text-xs font-medium text-foreground">
              Customer Site *
            </label>
            <select
              id="customer"
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              className="h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              required
            >
              <option value="">Select customer site</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="title" className="text-xs font-medium text-foreground">
              Issue Summary *
            </label>
            <Input
              id="title"
              placeholder="e.g. EdgeBox Offline - No Ping"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="priority" className="text-xs font-medium text-foreground">
              Priority
            </label>
            <select
              id="priority"
              value={priority}
              onChange={(e) => setPriority(e.target.value as TicketPriority)}
              className="h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="URGENT">Urgent</option>
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="description" className="text-xs font-medium text-foreground">
              Details / Error Logs *
            </label>
            <textarea
              id="description"
              placeholder="Describe the issue, symptoms observed, or steps to reproduce..."
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              required
            />
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 size-4 animate-spin" />}
              Create Ticket
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
