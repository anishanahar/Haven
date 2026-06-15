import { cn } from "@/lib/utils";

export function Logo({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-2 font-semibold tracking-tight", className)}>
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <rect width="28" height="28" rx="8" fill="url(#nest-logo-gradient)" />
        <path
          d="M8.5 18.5V9.5C8.5 9.22386 8.72386 9 9 9H9.87C10.06 9 10.24 9.1 10.33 9.26L16.6 18.5V9.5"
          stroke="white"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path d="M19.5 18.5V9.5" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
        <defs>
          <linearGradient id="nest-logo-gradient" x1="0" y1="0" x2="28" y2="28" gradientUnits="userSpaceOnUse">
            <stop stopColor="#4F8CFF" />
            <stop offset="1" stopColor="#7CFFB2" />
          </linearGradient>
        </defs>
      </svg>
      <span className="text-lg">Nest</span>
    </div>
  );
}
