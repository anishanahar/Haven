"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export function CtaSection() {
  return (
    <section className="px-6 py-24">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-60px" }}
        transition={{ duration: 0.5 }}
        className="glow-primary relative mx-auto max-w-4xl overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-primary/15 via-card to-haven-accent/10 px-8 py-16 text-center"
      >
        <h2 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
          Your next goal is one deposit away
        </h2>
        <p className="mx-auto mt-4 max-w-md text-muted-foreground">
          Connect a Stellar wallet and create your first goal in under a minute — no credit card, no signup form.
        </p>
        <Button size="lg" className="mt-8" nativeButton={false} render={<Link href="/dashboard/goals/new" />}>
          Start saving <ArrowRight />
        </Button>
      </motion.div>
    </section>
  );
}
