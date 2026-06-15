"use client";

import { useState } from "react";
import { Loader2, LogOut, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/hooks/use-auth";
import { formatAddress } from "@/lib/format";

export default function SettingsPage() {
  const { user, logout, isLoggingOut, walletId } = useAuth();
  const { theme, setTheme } = useTheme();
  const [displayName, setDisplayName] = useState(user?.displayName ?? "");
  const [currency, setCurrency] = useState(user?.currency ?? "USD");

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>Your Nest identity is your connected Stellar wallet.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div>
            <Label htmlFor="display-name">Display name</Label>
            <Input
              id="display-name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Add a name"
              className="mt-1.5"
            />
          </div>
          <div>
            <Label>Connected wallet</Label>
            <div className="mt-1.5 flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm">
              <span className="font-mono">{formatAddress(user?.publicKey ?? "", 8)}</span>
              <span className="text-xs text-muted-foreground capitalize">{walletId}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Preferences</CardTitle>
          <CardDescription>Display and currency preferences for your dashboard.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Theme</Label>
              <p className="text-xs text-muted-foreground">Nest is designed dark-mode first.</p>
            </div>
            <div className="flex gap-1 rounded-lg border border-border p-1">
              <Button
                size="sm"
                variant={theme === "dark" ? "secondary" : "ghost"}
                onClick={() => setTheme("dark")}
                aria-pressed={theme === "dark"}
              >
                <Moon /> Dark
              </Button>
              <Button
                size="sm"
                variant={theme === "light" ? "secondary" : "ghost"}
                onClick={() => setTheme("light")}
                aria-pressed={theme === "light"}
              >
                <Sun /> Light
              </Button>
            </div>
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <Label htmlFor="currency">Display currency</Label>
            <Select value={currency} onValueChange={(value) => value && setCurrency(value)}>
              <SelectTrigger id="currency" className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="USD">USD</SelectItem>
                <SelectItem value="EUR">EUR</SelectItem>
                <SelectItem value="GBP">GBP</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card className="border-destructive/30">
        <CardHeader>
          <CardTitle>Session</CardTitle>
          <CardDescription>Disconnect your wallet and end this session on this device.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="destructive" onClick={() => logout()} disabled={isLoggingOut}>
            {isLoggingOut ? <Loader2 className="animate-spin" /> : <LogOut />}
            Disconnect wallet
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
