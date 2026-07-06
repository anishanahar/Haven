"use client";

import { motion } from "framer-motion";
import { Bell, LineChart, Lock, Sparkles, Target, Wallet } from "lucide-react";

const features = [
  {
    icon: Target,
    title: "Goal-based vaults",
    description: "Every goal — a laptop, a wedding, an emergency fund — gets its own on-chain savings vault, isolated from every other goal.",
  },
  {
    icon: LineChart,
    title: "Transparent interest",
    description: "Interest accrues linearly and on-chain, computed live from your principal, APY, and time — never a hidden ledger entry.",
  },
  {
    icon: Wallet,
    title: "You hold the keys",
    description: "Haven never custodies your funds or your keys. Every deposit, withdrawal, and claim is signed by your own wallet.",
  },
  {
    icon: Sparkles,
    title: "AI-style goal planner",
    description: "Tell us your target and deadline — we deterministically calculate the weekly deposit that gets you there.",
  },
  {
    icon: Lock,
    title: "Pause anytime",
    description: "Life happens. Pause a goal to freeze interest accrual without ever losing access to your principal.",
  },
  {
    icon: Bell,
    title: "Real-time updates",
    description: "Deposits, milestones, and interest are pushed to your dashboard the moment they confirm on-chain.",
  },
];

export function Features() {
  return (
    <section id="features" className="mx-auto max-w-6xl px-6 py-24">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
          Everything you need to save with intention
        </h2>
        <p className="mt-4 text-muted-foreground">
          Haven turns &ldquo;I should really start saving&rdquo; into a concrete, trackable, on-chain plan.
        </p>
      </div>

      <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {features.map((feature, i) => (
          <motion.div
            key={feature.title}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.4, delay: i * 0.05 }}
            className="rounded-2xl border border-border bg-card p-6 transition-colors hover:border-primary/40"
          >
            <div className="mb-4 flex size-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
              <feature.icon className="size-5" />
            </div>
            <h3 className="font-medium">{feature.title}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{feature.description}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
