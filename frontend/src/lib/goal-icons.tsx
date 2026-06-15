import {
  GraduationCap,
  Heart,
  Home,
  Laptop,
  Plane,
  ShieldCheck,
  Sparkles,
  type LucideIcon,
} from "lucide-react";

export const goalIconMap: Record<string, LucideIcon> = {
  laptop: Laptop,
  graduationcap: GraduationCap,
  plane: Plane,
  shieldcheck: ShieldCheck,
  home: Home,
  heart: Heart,
  sparkles: Sparkles,
};

export function GoalIcon({ icon, className }: { icon: string; className?: string }) {
  const Icon = goalIconMap[icon.toLowerCase()] ?? Sparkles;
  return <Icon className={className} />;
}
