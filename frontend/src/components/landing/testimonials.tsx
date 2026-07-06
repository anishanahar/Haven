"use client";

import { motion } from "framer-motion";
import { Star } from "lucide-react";

const testimonials = [
  {
    quote:
      "I've tried a dozen budgeting apps. Haven is the first one where I can actually see my money working — the interest math is right there on-chain.",
    name: "Priya R.",
    role: "Saving for a house down payment",
  },
  {
    quote:
      "Splitting savings into named goals instead of one big number completely changed how I think about spending.",
    name: "Marcus T.",
    role: "Saving for a wedding",
  },
  {
    quote: "The goal planner told me exactly how much to save per week. I hit my laptop goal two weeks early.",
    name: "Ade O.",
    role: "Saving for a MacBook Pro",
  },
];

export function Testimonials() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-24">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">Loved by early savers</h2>
      </div>

      <div className="mt-16 grid gap-6 lg:grid-cols-3">
        {testimonials.map((t, i) => (
          <motion.figure
            key={t.name}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.4, delay: i * 0.08 }}
            className="rounded-2xl border border-border bg-card p-6"
          >
            <div className="flex gap-0.5 text-warning">
              {Array.from({ length: 5 }).map((_, idx) => (
                <Star key={idx} className="size-4 fill-current" />
              ))}
            </div>
            <blockquote className="mt-4 text-sm text-foreground/90">&ldquo;{t.quote}&rdquo;</blockquote>
            <figcaption className="mt-4 text-sm">
              <span className="font-medium">{t.name}</span>
              <span className="text-muted-foreground"> · {t.role}</span>
            </figcaption>
          </motion.figure>
        ))}
      </div>
    </section>
  );
}
