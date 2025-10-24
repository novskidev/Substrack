"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import {
  Plus,
  RefreshCw,
  LogOut,
  Settings,
  Loader2,
  Menu,
  LayoutDashboard,
  Sun,
  Moon,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
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
import DashboardStats from "@/components/DashboardStats";
import ExpenseChart from "@/components/ExpenseChart";
import UpcomingReminders from "@/components/UpcomingReminders";
import SubscriptionCard from "@/components/SubscriptionCard";
import SubscriptionDialog from "@/components/SubscriptionDialog";
import { CURRENCIES } from "@/constants/currencies";
import { getBearerToken } from "@/lib/auth-token";
import { ThemeToggle } from "@/components/ThemeToggle";
import type { SubscriptionStatusValue } from "@/constants/subscription-statuses";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetClose,
} from "@/components/ui/sheet";

interface Subscription {
  id: number;
  name: string;
  cost: number;
  billingCycle: string;
  nextPaymentDate: string;
  category?: string;
  description?: string;
  status: SubscriptionStatusValue;
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
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const pathname = usePathname();
  const { resolvedTheme, setTheme } = useTheme();
  const isDarkMode = resolvedTheme === "dark";
  const toggleSidebarCollapsed = useCallback(
    () => setSidebarCollapsed((prev) => !prev),
    []
  );

  const navigationItems = useMemo(
    () => [
      { label: "Dashboard", href: "/", icon: LayoutDashboard },
      { label: "Settings", href: "/settings", icon: Settings },
    ],
    []
  );

  const userInitials = useMemo(() => {
    const name = session?.user?.name?.trim() ?? "";
    if (name.length > 0) {
      const initials = name
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase() ?? "")
        .join("");
      if (initials.length > 0) {
        return initials;
      }
    }

    const email = session?.user?.email ?? "";
    return email ? email[0]?.toUpperCase() ?? "U" : "U";
  }, [session?.user]);

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
      setSubscriptions(data as Subscription[]);
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
      if (profile && "image" in profile) {
        setProfileImage(profile.image ?? null);
      }
    } catch (err) {
      console.error("Failed to load user currency", err);
    }
  };

  useEffect(() => {
    if (session?.user) {
      setCurrency(session.user.currency ?? "USD");
      setProfileImage(session.user.image ?? null);
      fetchSubscriptions();
      fetchUserCurrency();
    } else {
      setProfileImage(null);
    }
  }, [session]);

  const handleSignOut = useCallback(async () => {
    const { error } = await authClient.signOut();
    if (error?.code) {
      toast.error("Failed to sign out");
    } else {
      localStorage.removeItem("bearer_token");
      refetch();
      router.push("/login");
    }
  }, [refetch, router]);

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
      <div className="flex min-h-screen">
        <aside
          className={cn(
            "hidden flex-col border-r bg-card/40 backdrop-blur transition-all duration-200 lg:flex",
            sidebarCollapsed ? "w-20" : "w-72"
          )}
        >
          <div
            className={cn(
              "border-b py-6",
              sidebarCollapsed ? "px-3" : "px-6"
            )}
          >
            <div className="flex items-center justify-between gap-2">
              <div
                className={cn(
                  "flex items-center gap-3",
                  sidebarCollapsed && "flex-1 justify-center gap-0"
                )}
              >
                <Avatar className="h-12 w-12">
                  {profileImage ? (
                    <AvatarImage
                      src={profileImage}
                      alt={session.user.name ?? "Profile picture"}
                    />
                  ) : null}
                  <AvatarFallback className="text-base font-medium">
                    {userInitials}
                  </AvatarFallback>
                </Avatar>
                {!sidebarCollapsed && (
                  <div className="space-y-1">
                    <p className="text-sm font-semibold leading-none">
                      {session.user.name ?? "User"}
                    </p>
                    <p className="text-xs text-muted-foreground break-all">
                      {session.user.email}
                    </p>
                  </div>
                )}
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleSidebarCollapsed}
                aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                title={sidebarCollapsed ? "Expand" : "Collapse"}
              >
                {sidebarCollapsed ? (
                  <ChevronRight className="h-4 w-4" />
                ) : (
                  <ChevronLeft className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
          <div
            className={cn(
              "flex-1 py-6 flex flex-col",
              sidebarCollapsed ? "px-2" : "px-4"
            )}
          >
            <nav className="space-y-1">
              {navigationItems.map((item) => {
                const Icon = item.icon;
                const isActive =
                  pathname === item.href ||
                  (item.href !== "/" && pathname?.startsWith(item.href));
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-muted/70 hover:text-foreground",
                      sidebarCollapsed && "justify-center gap-0 px-2"
                    )}
                    aria-label={item.label}
                    title={sidebarCollapsed ? item.label : undefined}
                  >
                    <Icon className="h-4 w-4" />
                    <span
                      className={cn(
                        "truncate",
                        sidebarCollapsed && "sr-only"
                      )}
                    >
                      {item.label}
                    </span>
                  </Link>
                );
              })}
              <button
                type="button"
                onClick={() => setTheme(isDarkMode ? "light" : "dark")}
                className={cn(
                  "flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground",
                  sidebarCollapsed && "justify-center gap-0 px-2"
                )}
                aria-label={
                  isDarkMode ? "Switch to light mode" : "Switch to dark mode"
                }
                title={
                  sidebarCollapsed
                    ? isDarkMode
                      ? "Switch to light mode"
                      : "Switch to dark mode"
                    : undefined
                }
              >
                {isDarkMode ? (
                  <Sun className="h-4 w-4" />
                ) : (
                  <Moon className="h-4 w-4" />
                )}
                <span
                  className={cn(
                    "truncate",
                    sidebarCollapsed && "sr-only"
                  )}
                >
                  {isDarkMode ? "Switch to Light" : "Switch to Dark"}
                </span>
              </button>
              <button
                type="button"
                onClick={() => void handleSignOut()}
                className={cn(
                  "flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10",
                  sidebarCollapsed && "justify-center gap-0 px-2"
                )}
                aria-label="Sign out"
                title={sidebarCollapsed ? "Sign Out" : undefined}
              >
                <LogOut className="h-4 w-4" />
                <span
                  className={cn(
                    "truncate",
                    sidebarCollapsed && "sr-only"
                  )}
                >
                  Sign Out
                </span>
              </button>
            </nav>
          </div>
        </aside>
        <main className="flex-1">
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-6 sm:px-6 lg:px-10">
            <div className="flex items-center justify-between lg:hidden">
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="outline" size="icon" aria-label="Open menu">
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left">
                  <SheetHeader>
                    <SheetTitle>Profile & Navigation</SheetTitle>
                    <SheetDescription>
                      Access navigation, preferences, and quick actions.
                    </SheetDescription>
                  </SheetHeader>
                  <div className="flex flex-col gap-4 px-1 pb-6 pt-4">
                    <div className="rounded-lg border p-4">
                      <p className="text-sm font-medium">
                        {session.user.name ?? "User"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {session.user.email}
                      </p>
                    </div>
                    <div className="grid gap-2">
                      {navigationItems.map((item) => {
                        const Icon = item.icon;
                        const isActive =
                          pathname === item.href ||
                          (item.href !== "/" && pathname?.startsWith(item.href));
                        return (
                          <SheetClose asChild key={item.href}>
                            <Link
                              href={item.href}
                              className={cn(
                                "flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium",
                                isActive
                                  ? "border-primary bg-primary/10 text-primary"
                                  : "border-border hover:bg-muted"
                              )}
                            >
                              <Icon className="h-4 w-4" />
                              {item.label}
                            </Link>
                          </SheetClose>
                        );
                      })}
                      <button
                        type="button"
                        onClick={() => setTheme(isDarkMode ? "light" : "dark")}
                        className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted"
                      >
                        {isDarkMode ? (
                          <Sun className="h-4 w-4" />
                        ) : (
                          <Moon className="h-4 w-4" />
                        )}
                        {isDarkMode ? "Switch to Light" : "Switch to Dark"}
                      </button>
                      <SheetClose asChild>
                        <button
                          type="button"
                          onClick={() => void handleSignOut()}
                          className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10"
                        >
                          <LogOut className="h-4 w-4" />
                          Sign Out
                        </button>
                      </SheetClose>
                    </div>
                    <SheetClose asChild>
                      <Button onClick={() => setDialogOpen(true)}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Subscription
                      </Button>
                    </SheetClose>
                    <div className="space-y-2">
                      <p className="text-xs font-medium uppercase text-muted-foreground">
                        Currency
                      </p>
                      <Select
                        value={currency}
                        onValueChange={handleCurrencyChange}
                        disabled={updatingCurrency}
                      >
                        <SelectTrigger className="w-full">
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
                    </div>
                    <div className="space-y-2">
                      <SheetClose asChild>
                        <Button
                          variant="outline"
                          className="justify-start gap-2"
                          onClick={fetchSubscriptions}
                        >
                          <RefreshCw className="h-4 w-4" />
                          Refresh
                        </Button>
                      </SheetClose>
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
              <Button onClick={() => setDialogOpen(true)} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Subscription
              </Button>
            </div>
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
                  Substracker Dashboard
                </h1>
                <p className="text-muted-foreground mt-2">
                  Manage and track all your subscriptions in one place
                </p>
              </div>
              <div className="hidden flex-wrap items-center gap-2 lg:flex">
                <Button onClick={() => setDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Subscription
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
                <Button
                  variant="outline"
                  size="icon"
                  onClick={fetchSubscriptions}
                  title="Refresh"
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
                <ThemeToggle className="hidden lg:inline-flex" />
              </div>
            </div>
            {error && (
              <div className="bg-destructive/10 text-destructive rounded-lg p-4">
                {error}
              </div>
            )}
            <DashboardStats
              subscriptions={subscriptions}
              currency={currency}
            />
            <ExpenseChart subscriptions={subscriptions} currency={currency} />
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              <div className="lg:col-span-1">
                <UpcomingReminders
                  subscriptions={subscriptions}
                  currency={currency}
                />
              </div>
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
        </main>
      </div>
      <SubscriptionDialog
        open={dialogOpen}
        onOpenChange={handleDialogClose}
        subscription={editingSubscription}
        onSuccess={handleSuccess}
      />
    </div>
  );
}
