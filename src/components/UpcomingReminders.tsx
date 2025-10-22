"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Clock, Calendar } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { formatCurrency } from "@/lib/currency";

interface Subscription {
  id: number;
  name: string;
  cost: number;
  billingCycle: string;
  nextPaymentDate: string;
  status: string;
}

interface UpcomingRemindersProps {
  subscriptions: Subscription[];
  currency: string;
}

export default function UpcomingReminders({
  subscriptions,
  currency,
}: UpcomingRemindersProps) {
  const getDaysUntilPayment = (dateString: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const paymentDate = new Date(dateString);
    paymentDate.setHours(0, 0, 0, 0);
    const diffTime = paymentDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const activeSubscriptions = subscriptions.filter(
    (sub) => sub.status === "active"
  );

  const overduePayments = activeSubscriptions
    .filter((sub) => getDaysUntilPayment(sub.nextPaymentDate) < 0)
    .sort(
      (a, b) =>
        new Date(a.nextPaymentDate).getTime() -
        new Date(b.nextPaymentDate).getTime()
    );

  const upcomingPayments = activeSubscriptions
    .filter((sub) => {
      const days = getDaysUntilPayment(sub.nextPaymentDate);
      return days >= 0 && days <= 30;
    })
    .sort(
      (a, b) =>
        new Date(a.nextPaymentDate).getTime() -
        new Date(b.nextPaymentDate).getTime()
    );

  return (
    <div className="space-y-4">
      {overduePayments.length > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Overdue Payments</AlertTitle>
          <AlertDescription>
            You have {overduePayments.length} overdue{" "}
            {overduePayments.length === 1 ? "payment" : "payments"}. Please
            review your subscriptions.
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Payment Reminders
          </CardTitle>
        </CardHeader>
        <CardContent>
          {overduePayments.length === 0 && upcomingPayments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Clock className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No upcoming payments in the next 30 days</p>
            </div>
          ) : (
            <div className="space-y-3">
              {overduePayments.map((sub) => {
                const daysOverdue = Math.abs(
                  getDaysUntilPayment(sub.nextPaymentDate)
                );
                return (
                  <div
                    key={sub.id}
                    className="flex items-center justify-between p-3 border border-destructive/50 rounded-lg bg-destructive/5"
                  >
                    <div className="flex-1">
                      <p className="font-medium">{sub.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatCurrency(sub.cost, currency)} / {sub.billingCycle}
                      </p>
                    </div>
                    <div className="text-right">
                      <Badge variant="destructive" className="mb-1">
                        Overdue
                      </Badge>
                      <p className="text-xs text-destructive">
                        {daysOverdue} {daysOverdue === 1 ? "day" : "days"} ago
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(sub.nextPaymentDate)}
                      </p>
                    </div>
                  </div>
                );
              })}

              {upcomingPayments.map((sub) => {
                const daysUntil = getDaysUntilPayment(sub.nextPaymentDate);
                const isDueSoon = daysUntil <= 7;

                return (
                  <div
                    key={sub.id}
                    className={`flex items-center justify-between p-3 border rounded-lg ${
                      isDueSoon
                        ? "border-orange-500/50 bg-orange-500/5"
                        : "border-border bg-card"
                    }`}
                  >
                    <div className="flex-1">
                      <p className="font-medium">{sub.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatCurrency(sub.cost, currency)} / {sub.billingCycle}
                      </p>
                    </div>
                    <div className="text-right">
                      {isDueSoon ? (
                        <Badge
                          variant="secondary"
                          className="mb-1 bg-orange-500/10 text-orange-600 dark:text-orange-400"
                        >
                          Due Soon
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="mb-1">
                          Upcoming
                        </Badge>
                      )}
                      <p
                        className={`text-sm font-medium ${
                          isDueSoon
                            ? "text-orange-600 dark:text-orange-400"
                            : "text-foreground"
                        }`}
                      >
                        In {daysUntil} {daysUntil === 1 ? "day" : "days"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(sub.nextPaymentDate)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
