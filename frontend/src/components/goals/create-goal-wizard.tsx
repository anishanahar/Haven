"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { addMonths, format } from "date-fns";
import { ArrowLeft, ArrowRight, Check, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { GoalIcon, goalIconMap } from "@/lib/goal-icons";
import { formatMoney } from "@/lib/format";
import { goalTemplates, type GoalTemplateId } from "@/config/site";
import { useCreateGoal } from "@/hooks/use-goals";
import { usePlanner } from "@/hooks/use-planner";
import type { SavingsFrequency } from "@/types/api";

interface WizardData {
  template: GoalTemplateId;
  name: string;
  icon: string;
  targetAmount: number;
  unlockDate: Date;
  savingsFrequency: SavingsFrequency;
}

const STEP_LABELS = ["Template", "Name", "Icon", "Target", "Deadline", "Frequency", "Review", "Deploy"];

function defaultDataFor(templateId: GoalTemplateId): WizardData {
  const template = goalTemplates.find((t) => t.id === templateId)!;
  return {
    template: templateId,
    name: templateId === "CUSTOM" ? "" : template.label,
    icon: template.icon.toLowerCase() === "laptop" ? "laptop" : mapTemplateIcon(templateId),
    targetAmount: template.defaultTarget,
    unlockDate: addMonths(new Date(), 12),
    savingsFrequency: "MANUAL",
  };
}

function mapTemplateIcon(templateId: GoalTemplateId): string {
  const iconByTemplate: Record<GoalTemplateId, string> = {
    LAPTOP: "laptop",
    COLLEGE_FEES: "graduationcap",
    VACATION: "plane",
    EMERGENCY_FUND: "shieldcheck",
    HOUSE_DOWN_PAYMENT: "home",
    WEDDING: "heart",
    CUSTOM: "sparkles",
  };
  return iconByTemplate[templateId];
}

export function CreateGoalWizard() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [data, setData] = useState<WizardData>(() => defaultDataFor("CUSTOM"));
  const createGoal = useCreateGoal();
  // A stable snapshot of "now" taken once at mount rather than read live during
  // render — reading Date.now() directly in render breaks render purity.
  const [nowMs] = useState(() => Date.now());

  const canContinue = useMemo(() => {
    switch (step) {
      case 1:
        return data.name.trim().length > 0;
      case 3:
        return data.targetAmount > 0;
      case 4:
        return data.unlockDate.getTime() > nowMs;
      default:
        return true;
    }
  }, [step, data, nowMs]);

  function update<K extends keyof WizardData>(key: K, value: WizardData[K]) {
    setData((prev) => ({ ...prev, [key]: value }));
  }

  function selectTemplate(templateId: GoalTemplateId) {
    setData(defaultDataFor(templateId));
    setStep(1);
  }

  async function handleDeploy() {
    const goal = await createGoal.mutateAsync({
      name: data.name,
      icon: data.icon,
      template: data.template,
      targetAmount: data.targetAmount,
      unlockDate: data.unlockDate.toISOString(),
      savingsFrequency: data.savingsFrequency,
    });
    router.push(`/dashboard/goals/${goal.id}`);
  }

  return (
    <div className="mx-auto max-w-2xl">
      <ol className="mb-8 flex items-center gap-1.5" aria-label="Progress">
        {STEP_LABELS.map((label, i) => (
          <li key={label} className="flex flex-1 flex-col items-center gap-1.5">
            <div
              className={`h-1.5 w-full rounded-full transition-colors ${i <= step ? "bg-primary" : "bg-muted"}`}
              aria-hidden
            />
            <span className={`hidden text-[11px] sm:block ${i === step ? "text-foreground" : "text-muted-foreground"}`}>
              {label}
            </span>
          </li>
        ))}
      </ol>

      <div className="rounded-3xl border border-border bg-card p-6 sm:p-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -16 }}
            transition={{ duration: 0.25 }}
          >
            {step === 0 && <StepTemplate onSelect={selectTemplate} />}
            {step === 1 && <StepName value={data.name} onChange={(v) => update("name", v)} />}
            {step === 2 && <StepIcon value={data.icon} onChange={(v) => update("icon", v)} />}
            {step === 3 && <StepAmount value={data.targetAmount} onChange={(v) => update("targetAmount", v)} />}
            {step === 4 && <StepDeadline value={data.unlockDate} onChange={(v) => update("unlockDate", v)} />}
            {step === 5 && (
              <StepFrequency
                value={data.savingsFrequency}
                onChange={(v) => update("savingsFrequency", v)}
                targetAmount={data.targetAmount}
                unlockDate={data.unlockDate}
                nowMs={nowMs}
              />
            )}
            {step === 6 && <StepReview data={data} />}
            {step === 7 && <StepDeploy isPending={createGoal.isPending} onDeploy={handleDeploy} />}
          </motion.div>
        </AnimatePresence>

        {step > 0 && step < 7 && (
          <div className="mt-8 flex items-center justify-between border-t border-border pt-6">
            <Button variant="ghost" onClick={() => setStep((s) => s - 1)}>
              <ArrowLeft /> Back
            </Button>
            <Button onClick={() => setStep((s) => s + 1)} disabled={!canContinue}>
              {step === 6 ? "Deploy" : "Continue"} <ArrowRight />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

function StepTemplate({ onSelect }: { onSelect: (id: GoalTemplateId) => void }) {
  return (
    <div>
      <h2 className="text-xl font-semibold">What are you saving for?</h2>
      <p className="mt-1 text-sm text-muted-foreground">Pick a template to get started, or create a custom goal.</p>
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {goalTemplates.map((template) => (
          <button
            key={template.id}
            type="button"
            onClick={() => onSelect(template.id)}
            className="flex flex-col items-center gap-2 rounded-2xl border border-border p-4 text-center transition-colors hover:border-primary/50 hover:bg-primary/5"
          >
            <div className="flex size-11 items-center justify-center rounded-2xl bg-primary/15 text-primary">
              <GoalIcon icon={mapTemplateIcon(template.id)} className="size-5" />
            </div>
            <span className="text-sm font-medium">{template.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function StepName({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <h2 className="text-xl font-semibold">Name your goal</h2>
      <p className="mt-1 text-sm text-muted-foreground">Something you&apos;ll recognize at a glance.</p>
      <div className="mt-6">
        <Label htmlFor="goal-name">Goal name</Label>
        <Input
          id="goal-name"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="e.g. MacBook Pro"
          className="mt-1.5"
          autoFocus
        />
      </div>
    </div>
  );
}

function StepIcon({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const icons = Object.keys(goalIconMap);
  return (
    <div>
      <h2 className="text-xl font-semibold">Choose an icon</h2>
      <p className="mt-1 text-sm text-muted-foreground">Helps you spot this goal at a glance in your dashboard.</p>
      <div className="mt-6 grid grid-cols-4 gap-3 sm:grid-cols-7">
        {icons.map((icon) => (
          <button
            key={icon}
            type="button"
            onClick={() => onChange(icon)}
            aria-pressed={value === icon}
            className={`flex aspect-square items-center justify-center rounded-2xl border transition-colors ${
              value === icon ? "border-primary bg-primary/15 text-primary" : "border-border text-muted-foreground hover:border-primary/40"
            }`}
          >
            <GoalIcon icon={icon} className="size-5" />
          </button>
        ))}
      </div>
    </div>
  );
}

function StepAmount({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div>
      <h2 className="text-xl font-semibold">Set your target</h2>
      <p className="mt-1 text-sm text-muted-foreground">How much do you want to save, in USDC?</p>
      <div className="mt-6">
        <Label htmlFor="target-amount">Target amount</Label>
        <div className="relative mt-1.5">
          <span className="absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground">$</span>
          <Input
            id="target-amount"
            type="number"
            min={1}
            step="0.01"
            value={value || ""}
            onChange={(e) => onChange(Number(e.target.value))}
            className="pl-7"
            autoFocus
          />
        </div>
      </div>
    </div>
  );
}

function StepDeadline({ value, onChange }: { value: Date; onChange: (v: Date) => void }) {
  return (
    <div>
      <h2 className="text-xl font-semibold">When do you need it by?</h2>
      <p className="mt-1 text-sm text-muted-foreground">You can always extend this later.</p>
      <div className="mt-6">
        <Popover>
          <PopoverTrigger className="flex h-9 w-full items-center rounded-lg border border-input bg-transparent px-3 text-sm">
            {format(value, "MMMM d, yyyy")}
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={value}
              onSelect={(d) => d && onChange(d)}
              disabled={{ before: new Date() }}
              autoFocus
            />
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}

function StepFrequency({
  value,
  onChange,
  targetAmount,
  unlockDate,
  nowMs,
}: {
  value: SavingsFrequency;
  onChange: (v: SavingsFrequency) => void;
  targetAmount: number;
  unlockDate: Date;
  nowMs: number;
}) {
  const planner = usePlanner();
  const months = Math.max(Math.round((unlockDate.getTime() - nowMs) / (30.44 * 86_400_000)), 1);

  return (
    <div>
      <h2 className="text-xl font-semibold">How often will you contribute?</h2>
      <p className="mt-1 text-sm text-muted-foreground">This is just a plan — deposits are always manual on-chain actions.</p>
      <div className="mt-6">
        <Label htmlFor="frequency">Savings frequency</Label>
        <Select value={value} onValueChange={(v) => onChange(v as SavingsFrequency)}>
          <SelectTrigger id="frequency" className="mt-1.5 w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ONE_TIME">One-time</SelectItem>
            <SelectItem value="WEEKLY">Weekly</SelectItem>
            <SelectItem value="MONTHLY">Monthly</SelectItem>
            <SelectItem value="MANUAL">Manual</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="mt-6 rounded-2xl border border-primary/30 bg-primary/5 p-4">
        <div className="flex items-center gap-2 text-sm font-medium text-primary">
          <Sparkles className="size-4" /> Goal planner
        </div>
        {planner.data ? (
          <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-muted-foreground">Weekly</p>
              <p className="font-medium">{formatMoney(planner.data.weeklyDeposit)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Monthly</p>
              <p className="font-medium">{formatMoney(planner.data.monthlyDeposit)}</p>
            </div>
            <div className="col-span-2">
              <p className="text-muted-foreground">{planner.data.suggestions[0]}</p>
            </div>
          </div>
        ) : (
          <Button
            variant="link"
            className="mt-2 h-auto p-0"
            onClick={() => planner.mutate({ targetAmount, currentSaved: 0, apyBps: 500, months })}
            disabled={planner.isPending}
          >
            {planner.isPending ? <Loader2 className="animate-spin" /> : "Calculate my contribution plan"}
          </Button>
        )}
      </div>
    </div>
  );
}

function StepReview({ data }: { data: WizardData }) {
  return (
    <div>
      <h2 className="text-xl font-semibold">Review your goal</h2>
      <p className="mt-1 text-sm text-muted-foreground">Confirm the details before deploying your vault.</p>

      <div className="mt-6 flex items-center gap-4 rounded-2xl border border-border p-4">
        <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/15 text-primary">
          <GoalIcon icon={data.icon} className="size-6" />
        </div>
        <div>
          <p className="font-medium">{data.name}</p>
          <p className="text-sm text-muted-foreground">Target {formatMoney(data.targetAmount)}</p>
        </div>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-4 text-sm">
        <div>
          <dt className="text-muted-foreground">Deadline</dt>
          <dd className="font-medium">{format(data.unlockDate, "MMMM d, yyyy")}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Frequency</dt>
          <dd className="font-medium capitalize">{data.savingsFrequency.replace("_", " ").toLowerCase()}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Simulated APY</dt>
          <dd className="font-medium text-success">5.00%</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Network</dt>
          <dd className="font-medium">Stellar Testnet</dd>
        </div>
      </dl>
    </div>
  );
}

function StepDeploy({ isPending, onDeploy }: { isPending: boolean; onDeploy: () => void }) {
  return (
    <div className="flex flex-col items-center py-6 text-center">
      <div className="flex size-16 items-center justify-center rounded-3xl bg-primary/15 text-primary">
        {isPending ? <Loader2 className="size-7 animate-spin" /> : <Check className="size-7" />}
      </div>
      <h2 className="mt-4 text-xl font-semibold">
        {isPending ? "Deploying your vault…" : "Ready to deploy"}
      </h2>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">
        {isPending
          ? "Confirm the transaction in your wallet. This deploys a dedicated Soroban contract for this goal."
          : "Deploying creates an isolated on-chain vault for this goal. You'll be asked to sign a transaction with your wallet."}
      </p>
      <Button size="lg" className="mt-6" onClick={onDeploy} disabled={isPending}>
        {isPending ? <Loader2 className="animate-spin" /> : <Check />}
        {isPending ? "Waiting for confirmation" : "Confirm & deploy"}
      </Button>
    </div>
  );
}
