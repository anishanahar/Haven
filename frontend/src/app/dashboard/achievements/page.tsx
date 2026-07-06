"use client";

import { useAchievements } from "@/hooks/use-achievements";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy, Coins, Wallet, Flame, Star, Crown } from "lucide-react";
import { format } from "date-fns";
import type { Achievement } from "@/types/api";

const ICONS: Record<string, React.ElementType> = {
  Wallet,
  Coins,
  Trophy,
  Flame,
};

export default function AchievementsPage() {
  const { data, isLoading } = useAchievements();

  if (isLoading) {
    return <div className="p-8 text-center text-muted-foreground">Loading achievements...</div>;
  }

  const achievements = data?.achievements || [];
  const points = data?.points || 0;
  const level = data?.level || 1;

  const progress = (points % 100) / 100 * 100;

  return (
    <div className="flex-1 space-y-8 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Achievements & Level</h2>
          <p className="text-muted-foreground">
            Track your progress and unlocked milestones.
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex flex-col items-end">
            <span className="text-2xl font-bold text-primary flex items-center gap-2">
              <Crown className="h-6 w-6 text-yellow-500" />
              Level {level}
            </span>
            <span className="text-sm text-muted-foreground">{points} total points</span>
          </div>
        </div>
      </div>

      <Card className="border border-border/50 bg-background/50 backdrop-blur">
        <CardHeader>
          <CardTitle className="text-lg">Level Progress</CardTitle>
          <CardDescription>{100 - (points % 100)} points to Level {level + 1}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-4 w-full rounded-full bg-secondary overflow-hidden">
            <div 
              className="h-full bg-primary transition-all duration-1000 ease-in-out" 
              style={{ width: `${progress}%` }} 
            />
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {achievements.length === 0 && (
          <div className="col-span-full py-12 text-center text-muted-foreground border rounded-lg bg-card/50">
            <Star className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>You haven&apos;t unlocked any achievements yet. Keep saving!</p>
          </div>
        )}
        
        {achievements.map((item: Achievement) => {
          const Icon = ICONS[item.details.icon] || Trophy;
          return (
            <Card key={item.id} className="border border-primary/20 bg-card hover:border-primary/50 transition-colors">
              <CardHeader className="flex flex-row items-center gap-4 pb-2">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                  <Icon className="h-6 w-6" />
                </div>
                <div className="flex-1">
                  <CardTitle className="text-lg">{item.details.title}</CardTitle>
                  <CardDescription className="text-xs text-primary font-medium mt-1">
                    +{item.details.points} pts
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  {item.details.description}
                </p>
                <p className="text-xs text-muted-foreground/60 text-right">
                  Unlocked on {format(new Date(item.unlockedAt), "MMM d, yyyy")}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
