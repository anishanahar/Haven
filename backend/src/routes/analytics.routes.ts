import type { FastifyInstance } from "fastify";

export default async function analyticsRoutes(app: FastifyInstance) {
  const { analytics } = app.container.controllers;
  app.get("/analytics", { preHandler: [app.authenticate] }, analytics.overview);
}
