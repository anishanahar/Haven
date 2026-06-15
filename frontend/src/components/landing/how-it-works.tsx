"use client";

import { motion } from "framer-motion";

const steps = [
  {
    step: "01",
    title: "Choose a goal",
    description: "Pick a template — laptop, vacation, education, emergency fund, house, wedding — or start a custom goal.",
  },
  {
    step: "02",
    title: "Set your target",
    description: "Name it, set a target amount and deadline, and choose how often you'll contribute.",
  },
  {
    step: "03",
    title: "Deploy your vault",
    description: "Confirm in your wallet — Nest deploys an isolated Soroban contract that holds only this goal's funds.",
  },
  {
    step: "04",
    title: "Deposit & grow",
    description: "Add funds whenever you like. Interest accrues linearly and transparently until you claim it.",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="border-y border-border bg-card/40 px-6 py-24">
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">How Nest works</h2>
          <p className="mt-4 text-muted-foreground">From idea to on-chain vault in under a minute.</p>
        </div>

        <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((item, i) => (
            <motion.div
              key={item.step}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.4, delay: i * 0.08 }}
              className="relative"
            >
              <span className="text-4xl font-semibold text-primary/25">{item.step}</span>
              <h3 className="mt-3 font-medium">{item.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{item.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
