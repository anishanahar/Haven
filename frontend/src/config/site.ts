export const siteConfig = {
  name: "Nest",
  tagline: "Save for your dreams, not just your balance.",
  description:
    "Nest is a goal-based decentralized savings platform built on Stellar Soroban. Create a savings goal, deposit USDC, and watch it grow with transparent, on-chain interest.",
  url: "https://nest.app",
};

export const apiConfig = {
  baseUrl: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000",
  wsUrl: process.env.NEXT_PUBLIC_WS_URL ?? "ws://localhost:4000/ws",
};

export const stellarConfig = {
  network: (process.env.NEXT_PUBLIC_STELLAR_NETWORK ?? "TESTNET") as "TESTNET" | "PUBLIC",
  networkPassphrase: process.env.NEXT_PUBLIC_STELLAR_NETWORK_PASSPHRASE ?? "Test SDF Network ; September 2015",
  horizonUrl: process.env.NEXT_PUBLIC_HORIZON_URL ?? "https://horizon-testnet.stellar.org",
};

export const dashboardNav = [
  { label: "Overview", href: "/dashboard", icon: "LayoutDashboard" },
  { label: "Goals", href: "/dashboard/goals", icon: "Target" },
  { label: "Transactions", href: "/dashboard/transactions", icon: "ArrowLeftRight" },
  { label: "Analytics", href: "/dashboard/analytics", icon: "LineChart" },
  { label: "Achievements", href: "/dashboard/achievements", icon: "Trophy" },
  { label: "Settings", href: "/dashboard/settings", icon: "Settings" },
] as const;

export const goalTemplates = [
  { id: "LAPTOP", label: "Buy a Laptop", icon: "Laptop", defaultTarget: 2500 },
  { id: "COLLEGE_FEES", label: "College Fees", icon: "GraduationCap", defaultTarget: 15000 },
  { id: "VACATION", label: "Vacation", icon: "Plane", defaultTarget: 3000 },
  { id: "EMERGENCY_FUND", label: "Emergency Fund", icon: "ShieldCheck", defaultTarget: 5000 },
  { id: "HOUSE_DOWN_PAYMENT", label: "House Down Payment", icon: "Home", defaultTarget: 40000 },
  { id: "WEDDING", label: "Wedding", icon: "Heart", defaultTarget: 20000 },
  { id: "CUSTOM", label: "Custom Goal", icon: "Sparkles", defaultTarget: 1000 },
] as const;

export type GoalTemplateId = (typeof goalTemplates)[number]["id"];
