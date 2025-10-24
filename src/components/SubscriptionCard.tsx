"use client";

import { Calendar, Edit2, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useState } from "react";
import { formatCurrency } from "@/lib/currency";
import {
  SUBSCRIPTION_STATUS_LABELS,
  type SubscriptionStatusValue,
} from "@/constants/subscription-statuses";

const STATUS_BADGE_STYLES: Record<SubscriptionStatusValue, string> = {
  active: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  paused: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  cancelled: "bg-destructive/10 text-destructive",
  trial: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  expired: "bg-slate-500/10 text-slate-600 dark:text-slate-400",
};

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

interface SubscriptionCardProps {
  subscription: Subscription;
  onEdit: (subscription: Subscription) => void;
  onDelete: (id: number) => void;
  currency: string;
}

export default function SubscriptionCard({
  subscription,
  onEdit,
  onDelete,
  currency,
}: SubscriptionCardProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const getDaysUntilPayment = (dateString: string) => {
    const today = new Date();
    const paymentDate = new Date(dateString);
    const diffTime = paymentDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const daysUntil = getDaysUntilPayment(subscription.nextPaymentDate);
  const isOverdue = daysUntil < 0;
  const isDueSoon = daysUntil >= 0 && daysUntil <= 7;

  const getCategoryColor = (category?: string) => {
    switch (category) {
      case "streaming":
        return "bg-purple-500/10 text-purple-700 dark:text-purple-400";
      case "software":
        return "bg-blue-500/10 text-blue-700 dark:text-blue-400";
      case "cloud":
        return "bg-cyan-500/10 text-cyan-700 dark:text-cyan-400";
      case "domain":
        return "bg-green-500/10 text-green-700 dark:text-green-400";
      default:
        return "bg-gray-500/10 text-gray-700 dark:text-gray-400";
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await onDelete(subscription.id);
      setShowDeleteDialog(false);
    } catch (error) {
      console.error("Delete failed:", error);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <Card className="hover:shadow-md transition-shadow">
        <CardHeader className="pb-3 sm:pb-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-base font-semibold sm:text-lg">
                  {subscription.name}
                </h3>
                {subscription.status !== "active" && (
                  <Badge
                    variant="secondary"
                    className={`text-xs ${STATUS_BADGE_STYLES[subscription.status]}`}
                  >
                    {SUBSCRIPTION_STATUS_LABELS[subscription.status]}
                  </Badge>
                )}
              </div>
              {subscription.category && (
                <Badge
                  variant="secondary"
                  className={`text-xs ${getCategoryColor(subscription.category)}`}
                >
                  {subscription.category}
                </Badge>
              )}
            </div>
            <div className="flex gap-1 self-end sm:self-auto">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => onEdit(subscription)}
              >
                <Edit2 className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive hover:text-destructive"
                onClick={() => setShowDeleteDialog(true)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 sm:space-y-4">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-xl font-bold sm:text-2xl">
            <span className="leading-tight text-lg sm:text-2xl">
              {formatCurrency(subscription.cost, currency)}
            </span>
            <span className="text-sm font-normal text-muted-foreground">
              / {subscription.billingCycle}
            </span>
          </div>

          <div
            className={`flex flex-wrap items-center gap-2 text-xs sm:text-sm ${
              isOverdue
                ? "text-destructive"
                : isDueSoon
                  ? "text-orange-600 dark:text-orange-400"
                  : "text-muted-foreground"
            }`}
          >
            <Calendar className="h-4 w-4" />
            <span>
              {isOverdue
                ? `Overdue by ${Math.abs(daysUntil)} days`
                : isDueSoon
                  ? `Due in ${daysUntil} days`
                  : `Next: ${formatDate(subscription.nextPaymentDate)}`}
            </span>
          </div>

          {subscription.description && (
            <p className="text-sm text-muted-foreground line-clamp-2">
              {subscription.description}
            </p>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Subscription</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {subscription.name}? This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
