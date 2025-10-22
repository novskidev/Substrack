"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus, RefreshCw, LogOut, User, Settings, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { authClient, useSession } from "@/lib/auth-client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import DashboardStats from "@/components/DashboardStats";
import ExpenseChart from "@/components/ExpenseChart";
import UpcomingReminders from "@/components/UpcomingReminders";
import SubscriptionCard from "@/components/SubscriptionCard";
import SubscriptionDialog from "@/components/SubscriptionDialog";
import { CURRENCIES } from "@/constants/currencies";
import { getBearerToken } from "@/lib/auth-token";

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

export default function Home() {
  const router = useRouter();
  const { data: session, isPending, refetch } = useSession();
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSubscription, setEditingSubscription] =
    useState<Subscription | null>(null);
  const [currency, setCurrency] = useState("USD");
  const [updatingCurrency, setUpdatingCurrency] = useState(false);

  // Protect route - redirect to login if not authenticated
  useEffect(() => {
    if (!isPending && !session?.user) {
      router.push("/login");
    }
  }, [session, isPending, router]);

  const fetchSubscriptions = async () => {
    try {
      setLoading(true);
      setError("");
      const response = await fetch("/api/subscriptions");
      if (!response.ok) throw new Error("Failed to fetch subscriptions");
      const data = await response.json();
      setSubscriptions(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      toast.error("Failed to load subscriptions");
    } finally {
      setLoading(false);
    }
  };

  const fetchUserCurrency = async () => {
    try {
      const response = await fetch("/api/profile");
      if (!response.ok) {
        return;
      }

      const profile = await response.json();
      if (profile?.currency) {
        setCurrency(profile.currency);
      }
    } catch (err) {
      console.error("Failed to load user currency", err);
    }
  };

  useEffect(() => {
    if (session?.user) {
      setCurrency(session.user.currency ?? "USD");
      fetchSubscriptions();
      fetchUserCurrency();
    }
  }, [session]);

  const handleSignOut = async () => {
    const { error } = await authClient.signOut();
    if (error?.code) {
      toast.error("Failed to sign out");
    } else {
      localStorage.removeItem("bearer_token");
      refetch();
      router.push("/login");
    }
  };

  const handleEdit = (subscription: Subscription) => {
    setEditingSubscription(subscription);
    setDialogOpen(true);
  };

  const handleDelete = async (id: number) => {
    try {
      const response = await fetch(`/api/subscriptions?id=${id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete subscription");
      toast.success("Subscription deleted successfully");
      fetchSubscriptions();
    } catch (err) {
      toast.error("Failed to delete subscription");
    }
  };

  const handleDialogClose = (open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      setEditingSubscription(null);
    }
  };

  const handleSuccess = () => {
    toast.success(
      editingSubscription
        ? "Subscription updated successfully"
        : "Subscription added successfully"
    );
    fetchSubscriptions();
  };

  const handleCurrencyChange = async (value: string) => {
    if (!session?.user || value === currency) {
      return;
    }

    const token = getBearerToken();
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    try {
      setUpdatingCurrency(true);
      setCurrency(value);

      const response = await fetch("/api/profile", {
        method: "PATCH",
        headers,
        body: JSON.stringify({ currency: value }),
      });

      if (!response.ok) {
        throw new Error("Failed to update currency");
      }

      toast.success("Currency updated");
      await refetch();
    } catch (err) {
      toast.error("Could not update currency");
      await fetchUserCurrency();
    } finally {
      setUpdatingCurrency(false);
    }
  };

  if (isPending) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <RefreshCw className="h-12 w-12 animate-spin mx-auto text-muted-foreground" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!session?.user) {
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <RefreshCw className="h-12 w-12 animate-spin mx-auto text-muted-foreground" />
          <p className="text-muted-foreground">Loading subscriptions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Toaster />
      <div className="container mx-auto p-6 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold tracking-tight">
              Subscription Dashboard
            </h1>
            <p className="text-muted-foreground mt-2">
              Manage and track all your subscriptions in one place
            </p>
          </div>
          <div className="flex gap-2 items-center">
            <Button
              variant="outline"
              size="icon"
              onClick={fetchSubscriptions}
              title="Refresh"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Select
              value={currency}
              onValueChange={handleCurrencyChange}
              disabled={updatingCurrency}
            >
              <SelectTrigger className="w-[200px]">
                {updatingCurrency ? (
                  <span className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Updating...
                  </span>
                ) : (
                  <SelectValue placeholder="Select currency" />
                )}
              </SelectTrigger>
              <SelectContent>
                {CURRENCIES.map((curr) => (
                  <SelectItem key={curr.code} value={curr.code}>
                    {curr.symbol} {curr.code} - {curr.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Subscription
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon">
                  <User className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium">{session.user.name}</p>
                    <p className="text-xs text-muted-foreground">{session.user.email}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => router.push("/settings")}>
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleSignOut}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {error && (
          <div className="bg-destructive/10 text-destructive p-4 rounded-lg">
            {error}
          </div>
        )}

        {/* Stats Overview */}
        <DashboardStats
          subscriptions={subscriptions}
          currency={currency}
        />

        {/* Charts */}
        <ExpenseChart subscriptions={subscriptions} currency={currency} />

        {/* Two Column Layout */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Reminders */}
          <div className="lg:col-span-1">
            <UpcomingReminders
              subscriptions={subscriptions}
              currency={currency}
            />
          </div>

          {/* Subscriptions List */}
          <div className="lg:col-span-2 space-y-4">
            <h2 className="text-2xl font-semibold">All Subscriptions</h2>
            {subscriptions.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed rounded-lg">
                <p className="text-muted-foreground mb-4">
                  No subscriptions yet
                </p>
                <Button onClick={() => setDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Your First Subscription
                </Button>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {subscriptions.map((subscription) => (
                  <SubscriptionCard
                    key={subscription.id}
                    subscription={subscription}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    currency={currency}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add/Edit Dialog */}
      <SubscriptionDialog
        open={dialogOpen}
        onOpenChange={handleDialogClose}
        subscription={editingSubscription}
        onSuccess={handleSuccess}
      />
    </div>
  );
}
