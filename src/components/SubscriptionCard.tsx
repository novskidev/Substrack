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
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold text-lg">{subscription.name}</h3>
                {subscription.status === "cancelled" && (
                  <Badge variant="secondary" className="text-xs">
                    Cancelled
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
            <div className="flex gap-1">
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
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2 text-2xl font-bold">
            <span>{formatCurrency(subscription.cost, currency)}</span>
            <span className="text-sm font-normal text-muted-foreground">
              / {subscription.billingCycle}
            </span>
          </div>

          <div
            className={`flex items-center gap-2 text-sm ${
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
