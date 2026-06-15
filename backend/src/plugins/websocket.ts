import fastifyWebsocket from "@fastify/websocket";
import fp from "fastify-plugin";
import type { FastifyInstance } from "fastify";
import { Redis } from "ioredis";
import type { WebSocket } from "ws";
import { verifySessionToken } from "@/utils/jwt.js";
import { env } from "@/config/env.js";

/**
 * Bridges Redis pub/sub (channel `user:{userId}:events`, published by the
 * indexer whenever it processes an on-chain event affecting that user) to
 * WebSocket clients. One Redis subscriber connection per process, fanned
 * out in-memory to however many sockets are connected for a given user —
 * not one Redis connection per socket.
 */
export default fp(async function websocketPlugin(app: FastifyInstance) {
  await app.register(fastifyWebsocket);

  const socketsByUser = new Map<string, Set<WebSocket>>();
  const subscriber = new Redis(env.REDIS_URL, { lazyConnect: true });
  await subscriber.connect();

  subscriber.on("message", (channel: string, message: string) => {
    const userId = channel.replace(/^user:/, "").replace(/:events$/, "");
    const sockets = socketsByUser.get(userId);
    if (!sockets) return;
    for (const socket of sockets) {
      if (socket.readyState === socket.OPEN) socket.send(message);
    }
  });

  app.addHook("onClose", async () => {
    subscriber.disconnect();
  });

  app.get("/ws", { websocket: true }, (socket, request) => {
    const token = (request.query as { token?: string }).token;
    if (!token) {
      socket.close(4401, "Missing token");
      return;
    }

    let userId: string;
    try {
      userId = verifySessionToken(token).sub;
    } catch {
      socket.close(4401, "Invalid token");
      return;
    }

    if (!socketsByUser.has(userId)) {
      socketsByUser.set(userId, new Set());
      subscriber
        .subscribe(`user:${userId}:events`)
        .catch((err: Error) => app.log.error({ err }, "redis subscribe failed"));
    }
    socketsByUser.get(userId)!.add(socket);

    socket.send(JSON.stringify({ type: "connected", userId }));

    socket.on("close", () => {
      const sockets = socketsByUser.get(userId);
      sockets?.delete(socket);
      if (sockets && sockets.size === 0) {
        socketsByUser.delete(userId);
        subscriber.unsubscribe(`user:${userId}:events`).catch(() => undefined);
      }
    });
  });
});
