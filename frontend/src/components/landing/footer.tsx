import Link from "next/link";
import { Logo } from "@/components/shared/logo";

export function LandingFooter() {
  return (
    <footer className="border-t border-border px-6 py-12">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 sm:flex-row">
        <div>
          <Logo />
          <p className="mt-2 max-w-xs text-sm text-muted-foreground">
            Goal-based decentralized savings on Stellar Soroban.
          </p>
        </div>

        <nav className="flex flex-wrap justify-center gap-6 text-sm text-muted-foreground" aria-label="Footer">
          <a href="#features" className="hover:text-foreground">
            Features
          </a>
          <a href="#how-it-works" className="hover:text-foreground">
            How it works
          </a>
          <a href="#faq" className="hover:text-foreground">
            FAQ
          </a>
          <Link href="/dashboard" className="hover:text-foreground">
            Dashboard
          </Link>
        </nav>
      </div>
      <p className="mx-auto mt-8 max-w-6xl text-xs text-muted-foreground">
        © {new Date().getFullYear()} Haven. Running on Stellar Testnet — not financial advice, demo interest rates are simulated.
      </p>
    </footer>
  );
}
