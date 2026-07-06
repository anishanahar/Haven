"use client";

import { useQueryClient } from "@tanstack/react-query";
import { createContext, useContext, useEffect, useState } from "react";
import { apiConfig } from "@/config/site";
import { useAuthStore } from "@/store/auth-store";

const WebSocketContext = createContext<{ connected: boolean }>({ connected: false });

export function useHavenWebSocket() {
  return useContext(WebSocketContext);
}

/**
 * Opens one WebSocket connection for the whole app once authenticated.
 * Incoming events are treated purely as cache-invalidation signals (see
 * docs/api.md's WebSocket section) — we refetch via TanStack Query rather
 * than trusting the push payload as the source of truth.
 */
export function WebSocketProvider({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((s) => s.token);
  const queryClient = useQueryClient();
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!token) return;

    const socket = new WebSocket(`${apiConfig.wsUrl}?token=${encodeURIComponent(token)}`);

    socket.onopen = () => setConnected(true);
    socket.onclose = () => setConnected(false);

    socket.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data) as { type: string; goalId?: string };
        if (payload.type === "connected") return;

        queryClient.invalidateQueries({ queryKey: ["goals"] });
        queryClient.invalidateQueries({ queryKey: ["transactions"] });
        queryClient.invalidateQueries({ queryKey: ["analytics"] });
        queryClient.invalidateQueries({ queryKey: ["notifications"] });
        if (payload.goalId) {
          queryClient.invalidateQueries({ queryKey: ["goal", payload.goalId] });
        }
      } catch {
        // Ignore malformed frames rather than crashing the socket handler.
      }
    };

    return () => socket.close();
  }, [token, queryClient]);

  return <WebSocketContext.Provider value={{ connected }}>{children}</WebSocketContext.Provider>;
}
