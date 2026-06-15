"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { format } from "date-fns";
import { CalendarClock, Loader2, MoreHorizontal, PauseCircle, PlayCircle, Target, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { useDeleteGoal, usePatchGoal } from "@/hooks/use-goals";
import type { Goal } from "@/types/api";

type ActiveDialog = "target" | "deadline" | "delete" | null;

export function GoalActionsMenu({ goal }: { goal: Goal }) {
  const router = useRouter();
  const [activeDialog, setActiveDialog] = useState<ActiveDialog>(null);
  const [targetAmount, setTargetAmount] = useState(String(goal.targetAmount));
  const [unlockDate, setUnlockDate] = useState<Date>(new Date(goal.unlockDate));

  const patch = usePatchGoal(goal.id);
  const del = useDeleteGoal();

  async function togglePause() {
    await patch.mutateAsync({ paused: !goal.paused });
  }

  async function saveTarget(e: React.FormEvent) {
    e.preventDefault();
    await patch.mutateAsync({ targetAmount: Number(targetAmount) });
    setActiveDialog(null);
  }

  async function saveDeadline(e: React.FormEvent) {
    e.preventDefault();
    await patch.mutateAsync({ unlockDate: unlockDate.toISOString() });
    setActiveDialog(null);
  }

  async function confirmDelete() {
    await del.mutateAsync(goal.id);
    router.push("/dashboard/goals");
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          className="flex size-9 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          aria-label="Goal actions"
        >
          <MoreHorizontal className="size-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setActiveDialog("target")}>
            <Target /> Change target
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setActiveDialog("deadline")}>
            <CalendarClock /> Extend deadline
          </DropdownMenuItem>
          <DropdownMenuItem onClick={togglePause} disabled={patch.isPending}>
            {goal.paused ? <PlayCircle /> : <PauseCircle />}
            {goal.paused ? "Resume goal" : "Pause goal"}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onClick={() => setActiveDialog("delete")}>
            <Trash2 /> Close goal
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={activeDialog === "target"} onOpenChange={(open) => !open && setActiveDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change target amount</DialogTitle>
            <DialogDescription>Update how much you&apos;re aiming to save for this goal.</DialogDescription>
          </DialogHeader>
          <form onSubmit={saveTarget} className="flex flex-col gap-4">
            <div>
              <Label htmlFor="new-target">New target (USDC)</Label>
              <Input
                id="new-target"
                type="number"
                min={0.01}
                step="0.01"
                value={targetAmount}
                onChange={(e) => setTargetAmount(e.target.value)}
                className="mt-1.5"
                autoFocus
              />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={patch.isPending}>
                {patch.isPending && <Loader2 className="animate-spin" />} Save
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={activeDialog === "deadline"} onOpenChange={(open) => !open && setActiveDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Extend deadline</DialogTitle>
            <DialogDescription>Deadlines can only move forward.</DialogDescription>
          </DialogHeader>
          <form onSubmit={saveDeadline} className="flex flex-col gap-4">
            <Popover>
              <PopoverTrigger className="flex h-9 w-full items-center rounded-lg border border-input bg-transparent px-3 text-sm">
                {format(unlockDate, "MMMM d, yyyy")}
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={unlockDate}
                  onSelect={(d) => d && setUnlockDate(d)}
                  disabled={{ before: new Date(goal.unlockDate) }}
                  autoFocus
                />
              </PopoverContent>
            </Popover>
            <DialogFooter>
              <Button type="submit" disabled={patch.isPending}>
                {patch.isPending && <Loader2 className="animate-spin" />} Save
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={activeDialog === "delete"} onOpenChange={(open) => !open && setActiveDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Close this goal?</DialogTitle>
            <DialogDescription>
              This returns all remaining principal and claims any outstanding interest to your wallet, then permanently
              closes the vault. This can&apos;t be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="destructive" onClick={confirmDelete} disabled={del.isPending}>
              {del.isPending && <Loader2 className="animate-spin" />} Close goal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
