import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: string;
  icon: LucideIcon;
  trend?: { value: string; positive?: boolean };
  accent?: "primary" | "success" | "warning";
}

const accentClasses: Record<NonNullable<StatCardProps["accent"]>, string> = {
  primary: "bg-primary/15 text-primary",
  success: "bg-success/15 text-success",
  warning: "bg-warning/15 text-warning",
};

export function StatCard({ label, value, icon: Icon, trend, accent = "primary" }: StatCardProps) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{label}</p>
        <div className={cn("flex size-8 items-center justify-center rounded-lg", accentClasses[accent])}>
          <Icon className="size-4" />
        </div>
      </div>
      <p className="mt-3 text-2xl font-semibold tracking-tight">{value}</p>
      {trend && (
        <p className={cn("mt-1 text-xs", trend.positive ? "text-success" : "text-muted-foreground")}>{trend.value}</p>
      )}
    </div>
  );
}
