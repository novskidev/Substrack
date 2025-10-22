"use client";

import { useCallback, useEffect, useState } from "react";
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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

interface Subscription {
  id: number;
  name: string;
  cost: number;
  billingCycle: string;
  nextPaymentDate: string;
  category?: string;
  description?: string;
  status: string;
}

interface SubscriptionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subscription?: Subscription | null;
  onSuccess: () => void;
}

export default function SubscriptionDialog({
  open,
  onOpenChange,
  subscription,
  onSuccess,
}: SubscriptionDialogProps) {
  const createFormState = useCallback((sub?: Subscription | null) => {
    return {
      name: sub?.name || "",
      cost:
        sub?.cost !== undefined && sub?.cost !== null
          ? sub.cost.toString()
          : "",
      billingCycle: sub?.billingCycle || "monthly",
      nextPaymentDate: sub?.nextPaymentDate
        ? new Date(sub.nextPaymentDate).toISOString().split("T")[0]
        : new Date().toISOString().split("T")[0],
      category: sub?.category || "",
      description: sub?.description || "",
      status: sub?.status || "active",
    };
  }, []);

  const [formData, setFormData] = useState(() => createFormState(subscription));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setError("");
    if (subscription) {
      setFormData(createFormState(subscription));
    } else if (open) {
      setFormData(createFormState());
    }
  }, [subscription, open, createFormState]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const payload = {
        ...formData,
        cost: parseFloat(formData.cost),
        nextPaymentDate: new Date(formData.nextPaymentDate).toISOString(),
      };

      const url = subscription
        ? `/api/subscriptions?id=${subscription.id}`
        : "/api/subscriptions";
      const method = subscription ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to save subscription");
      }

      onSuccess();
      onOpenChange(false);
      setFormData(createFormState());
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {subscription ? "Edit Subscription" : "Add New Subscription"}
          </DialogTitle>
          <DialogDescription>
            {subscription
              ? "Update your subscription details below."
              : "Fill in the details for your new subscription."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Service Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="Netflix, Spotify, etc."
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="cost">Cost *</Label>
                <Input
                  id="cost"
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={formData.cost}
                  onChange={(e) =>
                    setFormData({ ...formData, cost: e.target.value })
                  }
                  placeholder="15.99"
                  required
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="billingCycle">Billing Cycle *</Label>
                <Select
                  value={formData.billingCycle}
                  onValueChange={(value) =>
                    setFormData({ ...formData, billingCycle: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="quarterly">Quarterly</SelectItem>
                    <SelectItem value="yearly">Yearly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="category">Category</Label>
                <Input
                  id="category"
                  value={formData.category}
                  onChange={(e) =>
                    setFormData({ ...formData, category: e.target.value })
                  }
                  placeholder="e.g. Streaming, SaaS, Utilities"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) =>
                    setFormData({ ...formData, status: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="nextPaymentDate">Next Payment Date *</Label>
              <Input
                id="nextPaymentDate"
                type="date"
                value={formData.nextPaymentDate}
                onChange={(e) =>
                  setFormData({ ...formData, nextPaymentDate: e.target.value })
                }
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Optional notes about this subscription"
                rows={3}
              />
            </div>

            {error && (
              <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
                {error}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : subscription ? "Update" : "Add"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
