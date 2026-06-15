import type { FastifyInstance } from "fastify";

export default async function notificationRoutes(app: FastifyInstance) {
  const { notification } = app.container.controllers;
  const auth = { preHandler: [app.authenticate] };

  app.get("/notifications", auth, notification.list);
  app.patch("/notifications/:id/read", auth, notification.markRead);
  app.patch("/notifications/read-all", auth, notification.markAllRead);
}
