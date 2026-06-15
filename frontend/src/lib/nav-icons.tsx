import { ArrowLeftRight, LayoutDashboard, LineChart, Settings, Target, Trophy, type LucideIcon } from "lucide-react";

export const navIconMap: Record<string, LucideIcon> = {
  LayoutDashboard,
  Target,
  ArrowLeftRight,
  LineChart,
  Trophy,
  Settings,
};

export function NavIcon({ icon, className }: { icon: string; className?: string }) {
  const Icon = navIconMap[icon] ?? LayoutDashboard;
  return <Icon className={className} />;
}
