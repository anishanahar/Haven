"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { format, parseISO } from "date-fns";
import { formatMoney } from "@/lib/format";

interface ContributionChartProps {
  data: { date: string; total: number; count: number }[];
}

export function ContributionChart({ data }: ContributionChartProps) {
  const chartData = data.map((d) => ({ ...d, label: format(parseISO(d.date), "MMM d") }));

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barCategoryGap="30%">
          <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="0" />
          <XAxis
            dataKey="label"
            axisLine={false}
            tickLine={false}
            tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
            interval="preserveStartEnd"
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
            tickFormatter={(v) => (v === 0 ? "0" : `$${v}`)}
            width={48}
          />
          <Tooltip
            cursor={{ fill: "var(--muted)" }}
            contentStyle={{
              background: "var(--popover)",
              border: "1px solid var(--border)",
              borderRadius: 12,
              fontSize: 13,
            }}
            labelStyle={{ color: "var(--foreground)", marginBottom: 4, fontWeight: 500 }}
            formatter={(value) => [formatMoney(Number(value)), "Deposited"]}
          />
          <Bar dataKey="total" fill="var(--primary)" radius={[4, 4, 0, 0]} maxBarSize={24} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
