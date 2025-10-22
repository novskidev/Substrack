"use client";

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
import { getCurrencyFormatter } from "@/lib/currency";

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
  status: string;
}

interface ExpenseChartProps {
  subscriptions: Subscription[];
  currency: string;
}

export default function ExpenseChart({
  subscriptions,
  currency,
}: ExpenseChartProps) {
  const activeSubscriptions = subscriptions.filter(
    (sub) => sub.status === "active"
  );

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
  const categoryData = activeSubscriptions.reduce(
    (acc, sub) => {
      const category = sub.category || "other";
      const monthlyCost = convertToMonthly(sub.cost, sub.billingCycle);
      acc[category] = (acc[category] || 0) + monthlyCost;
      return acc;
    },
    {} as Record<string, number>
  );

  const pieData = {
    labels: Object.keys(categoryData).map(
      (key) => key.charAt(0).toUpperCase() + key.slice(1)
    ),
    datasets: [
      {
        data: Object.values(categoryData),
        backgroundColor: [
          "rgba(147, 51, 234, 0.8)",
          "rgba(59, 130, 246, 0.8)",
          "rgba(6, 182, 212, 0.8)",
          "rgba(34, 197, 94, 0.8)",
          "rgba(156, 163, 175, 0.8)",
        ],
        borderColor: [
          "rgba(147, 51, 234, 1)",
          "rgba(59, 130, 246, 1)",
          "rgba(6, 182, 212, 1)",
          "rgba(34, 197, 94, 1)",
          "rgba(156, 163, 175, 1)",
        ],
        borderWidth: 2,
      },
    ],
  };

  // Monthly expenses breakdown
  const sortedSubscriptions = [...activeSubscriptions]
    .sort((a, b) => {
      const costA = convertToMonthly(a.cost, a.billingCycle);
      const costB = convertToMonthly(b.cost, b.billingCycle);
      return costB - costA;
    })
    .slice(0, 10);

  const formatter = getCurrencyFormatter(currency);
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

  if (activeSubscriptions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Expense Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[300px] text-muted-foreground">
            No active subscriptions to display
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
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
  );
}
