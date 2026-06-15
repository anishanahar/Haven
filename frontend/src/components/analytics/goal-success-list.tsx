import { CheckCircle2, TriangleAlert } from "lucide-react";
import { formatMoney } from "@/lib/format";
import type { AnalyticsOverview } from "@/types/api";

/**
 * Status is fixed and reserved (never a chart hue): on-track uses the
 * success token, at-risk the warning token, always paired with an icon
 * and label — never color alone. A meter's unfilled track is a lighter
 * step of the same ramp so the state reads across the whole bar.
 */
export function GoalSuccessList({ predictions }: { predictions: AnalyticsOverview["goalSuccessPredictions"] }) {
  if (predictions.length === 0) {
    return <p className="text-sm text-muted-foreground">No active goals to project yet.</p>;
  }

  return (
    <ul className="flex flex-col gap-4">
      {predictions.map((p) => (
        <li key={p.goalId} className="flex flex-col gap-2">
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2 font-medium">
              {p.onTrack ? (
                <CheckCircle2 className="size-4 text-success" />
              ) : (
                <TriangleAlert className="size-4 text-warning" />
              )}
              {p.name}
            </span>
            <span className={p.onTrack ? "text-success" : "text-warning"}>
              {p.onTrack ? "On track" : "At risk"} · {p.confidencePercent}%
            </span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className={`h-full rounded-full ${p.onTrack ? "bg-success" : "bg-warning"}`}
              style={{ width: `${Math.min(p.confidencePercent, 100)}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Saving {formatMoney(p.impliedDailyRate)}/day · needs {formatMoney(p.requiredDailyRate)}/day to hit the deadline
          </p>
        </li>
      ))}
    </ul>
  );
}
