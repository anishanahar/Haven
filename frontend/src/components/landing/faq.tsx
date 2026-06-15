"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    question: "Is my money actually on-chain?",
    answer:
      "Yes. Every goal deploys its own Soroban smart contract vault on Stellar. Deposits, withdrawals, and interest are all real contract calls you sign with your own wallet — Nest never takes custody.",
  },
  {
    question: "How is interest calculated?",
    answer:
      "Interest accrues linearly from your principal, the current APY, and elapsed time — the same formula a savings account uses, just computed transparently on-chain instead of hidden in a bank ledger.",
  },
  {
    question: "Can I withdraw before my deadline?",
    answer:
      "Always. Nest doesn't lock your principal — the deadline is a planning tool, not a restriction. You can withdraw part or all of your principal at any time.",
  },
  {
    question: "What happens if I pause a goal?",
    answer:
      "Pausing freezes interest accrual (and blocks new deposits) without touching your existing balance. Resume whenever you're ready and accrual picks back up.",
  },
  {
    question: "What network does Nest run on?",
    answer:
      "Nest currently runs on Stellar's Soroban Testnet. The architecture is designed to move to Mainnet with no contract changes — only a new deployment and funded treasury.",
  },
  {
    question: "Is the 'AI Goal Planner' really AI?",
    answer:
      "No — and we think that's a feature. It's a deterministic calculator: give it a target, a deadline, and an APY, and it solves the required contribution with transparent, auditable math. No black box.",
  },
];

export function FAQ() {
  return (
    <section id="faq" className="border-t border-border px-6 py-24">
      <div className="mx-auto max-w-3xl">
        <div className="text-center">
          <h2 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">Frequently asked questions</h2>
        </div>

        <Accordion className="mt-12 w-full">
          {faqs.map((faq, i) => (
            <AccordionItem key={faq.question} value={`item-${i}`}>
              <AccordionTrigger className="text-left">{faq.question}</AccordionTrigger>
              <AccordionContent className="text-muted-foreground">{faq.answer}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}
