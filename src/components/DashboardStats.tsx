"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, TrendingUp, Calendar, CreditCard } from "lucide-react";
import { formatCurrency } from "@/lib/currency";
import {
  CHARGEABLE_SUBSCRIPTION_STATUSES,
  type SubscriptionStatusValue,
} from "@/constants/subscription-statuses";

interface Subscription {
  id: number;
  name: string;
  cost: number;
  billingCycle: string;
  nextPaymentDate: string;
  status: SubscriptionStatusValue;
}

interface DashboardStatsProps {
  subscriptions: Subscription[];
  currency: string;
}

export default function DashboardStats({
  subscriptions,
  currency,
}: DashboardStatsProps) {
  const chargeableSubscriptions = subscriptions.filter((sub) =>
    CHARGEABLE_SUBSCRIPTION_STATUSES.includes(sub.status)
  );

  const calculateMonthlyTotal = () => {
    return chargeableSubscriptions.reduce((total, sub) => {
      if (sub.billingCycle === "monthly") {
        return total + sub.cost;
      } else if (sub.billingCycle === "yearly") {
        return total + sub.cost / 12;
      } else if (sub.billingCycle === "quarterly") {
        return total + sub.cost / 3;
      }
      return total;
    }, 0);
  };

  const calculateYearlyTotal = () => {
    return chargeableSubscriptions.reduce((total, sub) => {
      if (sub.billingCycle === "monthly") {
        return total + sub.cost * 12;
      } else if (sub.billingCycle === "yearly") {
        return total + sub.cost;
      } else if (sub.billingCycle === "quarterly") {
        return total + sub.cost * 4;
      }
      return total;
    }, 0);
  };

  const getUpcomingPayments = () => {
    const today = new Date();
    const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

    return chargeableSubscriptions.filter((sub) => {
      const paymentDate = new Date(sub.nextPaymentDate);
      return paymentDate >= today && paymentDate <= nextWeek;
    }).length;
  };

  const monthlyTotal = calculateMonthlyTotal();
  const yearlyTotal = calculateYearlyTotal();
  const upcomingPayments = getUpcomingPayments();

  const monthlyTotalFormatted = formatCurrency(monthlyTotal, currency);
  const yearlyTotalFormatted = formatCurrency(yearlyTotal, currency);
  const averageMonthlyFormatted = formatCurrency(yearlyTotal / 12, currency);

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Monthly Total</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{monthlyTotalFormatted}</div>
          <p className="text-xs text-muted-foreground">
            From {chargeableSubscriptions.length} active or trial subscriptions
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Yearly Total</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{yearlyTotalFormatted}</div>
          <p className="text-xs text-muted-foreground">
            {averageMonthlyFormatted} per month average
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Chargeable Subscriptions
          </CardTitle>
          <CreditCard className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{chargeableSubscriptions.length}</div>
          <p className="text-xs text-muted-foreground">
            {subscriptions.length - chargeableSubscriptions.length} other statuses
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Due This Week</CardTitle>
          <Calendar className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{upcomingPayments}</div>
          <p className="text-xs text-muted-foreground">
            Payments in the next 7 days
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
