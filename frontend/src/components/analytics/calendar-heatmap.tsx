"use client";

import { eachDayOfInterval, format, subDays } from "date-fns";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { formatMoney } from "@/lib/format";

interface CalendarHeatmapProps {
  data: { date: string; total: number }[];
  weeks?: number;
}

/** Sequential, single-hue intensity ramp (deposit activity) — never categorical, per dataviz guidance for a magnitude-over-a-grid chart. */
const INTENSITY_STEPS = [
  "bg-muted",
  "bg-haven-accent/25",
  "bg-haven-accent/50",
  "bg-haven-accent/75",
  "bg-haven-accent",
];

export function CalendarHeatmap({ data, weeks = 18 }: CalendarHeatmapProps) {
  const totalsByDay = new Map(data.map((d) => [d.date, d.total]));
  const days = eachDayOfInterval({ start: subDays(new Date(), weeks * 7 - 1), end: new Date() });
  const max = Math.max(...data.map((d) => d.total), 1);

  const columns: Date[][] = [];
  for (let i = 0; i < days.length; i += 7) {
    columns.push(days.slice(i, i + 7));
  }

  function intensityClass(amount: number) {
    if (amount <= 0) return INTENSITY_STEPS[0];
    const ratio = amount / max;
    if (ratio < 0.25) return INTENSITY_STEPS[1];
    if (ratio < 0.5) return INTENSITY_STEPS[2];
    if (ratio < 0.75) return INTENSITY_STEPS[3];
    return INTENSITY_STEPS[4];
  }

  return (
    <div>
      <div className="flex gap-1 overflow-x-auto pb-2">
        {columns.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-1">
            {week.map((day) => {
              const key = format(day, "yyyy-MM-dd");
              const amount = totalsByDay.get(key) ?? 0;
              return (
                <Tooltip key={key}>
                  <TooltipTrigger className={`size-3.5 rounded-[3px] ${intensityClass(amount)}`} aria-label={`${key}: ${formatMoney(amount)}`} />
                  <TooltipContent>
                    {format(day, "MMM d, yyyy")} · {formatMoney(amount)}
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </div>
        ))}
      </div>
      <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
        Less
        {INTENSITY_STEPS.map((step, i) => (
          <span key={i} className={`size-3 rounded-[3px] ${step}`} />
        ))}
        More
      </div>
    </div>
  );
}
