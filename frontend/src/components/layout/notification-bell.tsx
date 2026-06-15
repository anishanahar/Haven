"use client";

import { Bell, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useMarkAllNotificationsRead, useMarkNotificationRead, useNotifications } from "@/hooks/use-notifications";
import { formatRelative } from "@/lib/format";
import { cn } from "@/lib/utils";

export function NotificationBell() {
  const { data } = useNotifications();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();
  const unreadCount = data?.unreadCount ?? 0;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="relative flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
      >
        <Bell className="size-4.5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex size-2 rounded-full bg-destructive" />
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <div className="flex items-center justify-between px-1.5 py-1">
          <span className="text-sm font-medium">Notifications</span>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" onClick={() => markAllRead.mutate()}>
              <CheckCheck className="size-3.5" /> Mark all read
            </Button>
          )}
        </div>
        <DropdownMenuSeparator />
        {!data || data.notifications.length === 0 ? (
          <p className="px-1.5 py-4 text-center text-sm text-muted-foreground">You&apos;re all caught up.</p>
        ) : (
          <div className="max-h-80 overflow-y-auto">
            {data.notifications.map((n) => (
              <DropdownMenuItem
                key={n.id}
                className={cn("flex-col items-start gap-0.5 whitespace-normal", !n.read && "bg-primary/5")}
                onClick={() => !n.read && markRead.mutate(n.id)}
              >
                <span className="text-sm font-medium">{n.title}</span>
                <span className="text-xs text-muted-foreground">{n.body}</span>
                <span className="text-[11px] text-muted-foreground/70">{formatRelative(n.createdAt)}</span>
              </DropdownMenuItem>
            ))}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
