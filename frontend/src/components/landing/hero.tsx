"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GoalIcon } from "@/lib/goal-icons";
import { formatMoney } from "@/lib/format";

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-grid px-6 pt-20 pb-24 sm:pt-28">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 flex justify-center">
        <div className="h-[420px] w-[720px] rounded-full bg-primary/20 blur-[120px]" />
      </div>

      <div className="mx-auto grid max-w-6xl items-center gap-16 lg:grid-cols-2">
        <div>
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-4 py-1.5 text-xs text-muted-foreground"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-nest-accent" />
            Built on Stellar Soroban · Testnet live
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.05 }}
            className="text-balance text-4xl font-semibold tracking-tight sm:text-6xl"
          >
            Save for your dreams,
            <br />
            <span className="bg-gradient-to-r from-primary to-nest-accent bg-clip-text text-transparent">
              not just your balance.
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="mt-6 max-w-lg text-lg text-muted-foreground"
          >
            Create a goal, deposit USDC, and watch it grow — every goal is its own transparent, on-chain
            savings vault with real, verifiable interest. No spreadsheets. No guessing.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="mt-10 flex flex-col gap-3 sm:flex-row"
          >
            <Button size="lg" className="glow-primary" nativeButton={false} render={<Link href="/dashboard/goals/new" />}>
              Start a goal <ArrowRight />
            </Button>
            <Button size="lg" variant="outline" nativeButton={false} render={<a href="#how-it-works" />}>
              See how it works
            </Button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mt-10 flex items-center gap-6 text-sm text-muted-foreground"
          >
            <div>
              <p className="text-2xl font-semibold text-foreground">5%</p>
              <p>Simulated APY</p>
            </div>
            <div className="h-8 w-px bg-border" />
            <div>
              <p className="text-2xl font-semibold text-foreground">7</p>
              <p>Goal templates</p>
            </div>
            <div className="h-8 w-px bg-border" />
            <div>
              <p className="text-2xl font-semibold text-foreground">100%</p>
              <p>On-chain &amp; auditable</p>
            </div>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="relative mx-auto w-full max-w-sm"
        >
          <GoalPreviewCard />
        </motion.div>
      </div>
    </section>
  );
}

function GoalPreviewCard() {
  const target = 2500;
  const deposited = 1260;
  const percent = Math.round((deposited / target) * 100);

  return (
    <div className="glass glow-primary relative rounded-3xl p-6 shadow-2xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-2xl bg-primary/15 text-primary">
            <GoalIcon icon="laptop" className="size-5" />
          </div>
          <div>
            <p className="font-medium">MacBook Pro</p>
            <p className="text-xs text-muted-foreground">Target Dec 2027</p>
          </div>
        </div>
        <span className="rounded-full bg-nest-accent/15 px-2.5 py-1 text-xs font-medium text-nest-accent">
          On track
        </span>
      </div>

      <div className="mt-6 flex items-end justify-between">
        <div>
          <p className="text-3xl font-semibold tracking-tight">{formatMoney(deposited)}</p>
          <p className="text-sm text-muted-foreground">of {formatMoney(target)}</p>
        </div>
        <div className="flex items-center gap-1 text-sm font-medium text-nest-accent">
          <TrendingUp className="size-4" />
          +72 USDC
        </div>
      </div>

      <div className="mt-4 h-2.5 w-full overflow-hidden rounded-full bg-muted">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-primary to-nest-accent"
          initial={{ width: 0 }}
          animate={{ width: `${percent}%` }}
          transition={{ duration: 1.2, delay: 0.5, ease: "easeOut" }}
        />
      </div>
      <p className="mt-2 text-right text-xs text-muted-foreground">{percent}% complete</p>

      <div className="mt-6 grid grid-cols-2 gap-3 border-t border-border pt-4 text-sm">
        <div>
          <p className="text-muted-foreground">Est. completion</p>
          <p className="font-medium">Dec 2027</p>
        </div>
        <div className="text-right">
          <p className="text-muted-foreground">APY</p>
          <p className="font-medium text-nest-accent">5.00%</p>
        </div>
      </div>
    </div>
  );
}
