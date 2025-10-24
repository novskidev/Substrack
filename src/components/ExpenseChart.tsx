"use client";

import { useMemo, useState } from "react";
import type { DateRange } from "react-day-picker";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
} from "chart.js";
import { Pie, Bar } from "react-chartjs-2";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Calendar as CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { getCurrencyFormatter } from "@/lib/currency";
import {
  CHARGEABLE_SUBSCRIPTION_STATUSES,
  type SubscriptionStatusValue,
} from "@/constants/subscription-statuses";

const FALLBACK_PIE_BACKGROUND_COLORS = [
  "rgba(147, 51, 234, 0.8)",
  "rgba(59, 130, 246, 0.8)",
  "rgba(6, 182, 212, 0.8)",
  "rgba(34, 197, 94, 0.8)",
  "rgba(156, 163, 175, 0.8)",
];

const FALLBACK_PIE_BORDER_COLORS = [
  "rgba(147, 51, 234, 1)",
  "rgba(59, 130, 246, 1)",
  "rgba(6, 182, 212, 1)",
  "rgba(34, 197, 94, 1)",
  "rgba(156, 163, 175, 1)",
];

ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  Title
);

interface Subscription {
  id: number;
  name: string;
  cost: number;
  billingCycle: string;
  category?: string;
  status: SubscriptionStatusValue;
  nextPaymentDate: string;
}

interface ExpenseChartProps {
  subscriptions: Subscription[];
  currency: string;
}

export default function ExpenseChart({
  subscriptions,
  currency,
}: ExpenseChartProps) {
  const chargeableSubscriptions = useMemo(
    () =>
      subscriptions.filter((sub) =>
        CHARGEABLE_SUBSCRIPTION_STATUSES.includes(sub.status)
      ),
    [subscriptions]
  );

  const [dateRange, setDateRange] = useState<DateRange | undefined>();

  const filteredSubscriptions = useMemo(() => {
    if (!dateRange?.from && !dateRange?.to) {
      return chargeableSubscriptions;
    }

    const fromDate = dateRange?.from ? new Date(dateRange.from) : undefined;
    if (fromDate) {
      fromDate.setHours(0, 0, 0, 0);
    }

    const rangeEnd = dateRange?.to ?? dateRange?.from;
    const toDate = rangeEnd ? new Date(rangeEnd) : undefined;
    if (toDate) {
      toDate.setHours(23, 59, 59, 999);
    }

    return chargeableSubscriptions.filter((sub) => {
      const paymentDate = new Date(sub.nextPaymentDate);
      if (Number.isNaN(paymentDate.getTime())) {
        return false;
      }

      paymentDate.setHours(0, 0, 0, 0);

      if (fromDate && paymentDate < fromDate) {
        return false;
      }

      if (toDate && paymentDate > toDate) {
        return false;
      }

      return true;
    });
  }, [chargeableSubscriptions, dateRange]);

  const formatDateLabel = (date: Date) =>
    date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

  const dateLabel = useMemo(() => {
    if (dateRange?.from && dateRange.to) {
      return `${formatDateLabel(dateRange.from)} – ${formatDateLabel(
        dateRange.to
      )}`;
    }

    if (dateRange?.from) {
      return formatDateLabel(dateRange.from);
    }

    return "Filter by date";
  }, [dateRange]);

  const isFiltering = Boolean(dateRange?.from || dateRange?.to);

  const generateColorPalette = (count: number) => {
    if (count <= 0) {
      return { backgroundColors: [], borderColors: [] };
    }

    const backgroundColors: string[] = [];
    const borderColors: string[] = [];

    for (let i = 0; i < count; i++) {
      const hue = Math.round((360 / count) * i);
      backgroundColors.push(`hsla(${hue}, 70%, 60%, 0.8)`);
      borderColors.push(`hsla(${hue}, 70%, 45%, 1)`);
    }

    return { backgroundColors, borderColors };
  };

  const convertToMonthly = (cost: number, cycle: string) => {
    if (cycle === "monthly") return cost;
    if (cycle === "yearly") return cost / 12;
    if (cycle === "quarterly") return cost / 3;
    return cost;
  };

  // Category breakdown data
  const categoryData = useMemo(
    () =>
      filteredSubscriptions.reduce((acc, sub) => {
        const category = sub.category || "other";
        const monthlyCost = convertToMonthly(sub.cost, sub.billingCycle);
        acc[category] = (acc[category] || 0) + monthlyCost;
        return acc;
      }, {} as Record<string, number>),
    [filteredSubscriptions]
  );

  const categoryKeys = Object.keys(categoryData);
  const categoryLabels = categoryKeys.map(
    (key) => key.charAt(0).toUpperCase() + key.slice(1)
  );
  const categoryValues = categoryKeys.map((key) => categoryData[key]);

  const {
    backgroundColors: categoryBackgroundColors,
    borderColors: categoryBorderColors,
  } = generateColorPalette(categoryLabels.length);

  const pieData = {
    labels: categoryLabels,
    datasets: [
      {
        data: categoryValues,
        backgroundColor:
          categoryBackgroundColors.length > 0
            ? categoryBackgroundColors
            : FALLBACK_PIE_BACKGROUND_COLORS.slice(
                0,
                categoryValues.length || FALLBACK_PIE_BACKGROUND_COLORS.length
              ),
        borderColor:
          categoryBorderColors.length > 0
            ? categoryBorderColors
            : FALLBACK_PIE_BORDER_COLORS.slice(
                0,
                categoryValues.length || FALLBACK_PIE_BORDER_COLORS.length
              ),
        borderWidth: 2,
      },
    ],
  };

  // Monthly expenses breakdown
  const sortedSubscriptions = useMemo(
    () =>
      [...filteredSubscriptions]
        .sort((a, b) => {
          const costA = convertToMonthly(a.cost, a.billingCycle);
          const costB = convertToMonthly(b.cost, b.billingCycle);
          return costB - costA;
        })
        .slice(0, 10),
    [filteredSubscriptions]
  );

  const formatter = useMemo(
    () => getCurrencyFormatter(currency),
    [currency]
  );
  const { backgroundColors, borderColors } = generateColorPalette(
    sortedSubscriptions.length
  );

  const barData = {
    labels: sortedSubscriptions.map((sub) => sub.name),
    datasets: [
      {
        label: "Monthly Cost",
        data: sortedSubscriptions.map((sub) =>
          convertToMonthly(sub.cost, sub.billingCycle)
        ),
        backgroundColor: backgroundColors,
        borderColor: borderColors,
        borderWidth: 2,
      },
    ],
  };

  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      title: {
        display: false,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: function (value: number | string) {
            const numericValue =
              typeof value === "number" ? value : Number(value);
            if (Number.isNaN(numericValue)) {
              return value;
            }
            return formatter.format(numericValue);
          },
        },
      },
    },
    layout: {
      padding: { top: 8, bottom: 8, left: 8, right: 8 },
    },
  };

  const pieOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "bottom" as const,
      },
      tooltip: {
        callbacks: {
          label: function (context: any) {
            const label = context.label || "";
            const value = context.parsed || 0;
            return `${label}: ${formatter.format(value)}`;
          },
        },
      },
    },
  };

  const filterControls = (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
      <Popover>
        <PopoverTrigger asChild>
          <Button
            id="date-range"
            variant="outline"
            className={cn(
              "w-full justify-start text-left font-normal sm:w-[260px]",
              !isFiltering && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {dateLabel}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="end">
          <Calendar
            initialFocus
            mode="range"
            selected={dateRange}
            onSelect={setDateRange}
            defaultMonth={dateRange?.from}
            numberOfMonths={2}
          />
        </PopoverContent>
      </Popover>
      {isFiltering ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="w-full sm:w-auto"
          onClick={() => setDateRange(undefined)}
        >
          Clear filter
        </Button>
      ) : null}
    </div>
  );

  if (filteredSubscriptions.length === 0) {
    return (
      <div className="space-y-4">
        {filterControls}
        <Card>
          <CardHeader>
            <CardTitle>Expense Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex h-[300px] items-center justify-center text-center text-sm text-muted-foreground">
              {isFiltering
                ? "No subscriptions match the selected dates."
                : "No active or trial subscriptions to display."}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {filterControls}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Monthly Expenses by Service</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[180px] sm:h-[320px]">
              <div className="h-full w-full overflow-x-auto sm:overflow-visible">
                <div className="relative h-full min-w-[240px] sm:min-w-0">
                  <Bar data={barData} options={barOptions} />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Expenses by Category</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex h-[180px] w-full items-center justify-center sm:h-[320px]">
              <div className="relative h-full w-full max-w-[220px] sm:max-w-none">
                <Pie data={pieData} options={pieOptions} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
