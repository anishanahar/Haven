import type { FastifyInstance } from "fastify";

export default async function authRoutes(app: FastifyInstance) {
  const { auth } = app.container.controllers;

  app.post("/auth/challenge", auth.challenge);
  app.post("/auth/verify", auth.verify);
  app.post("/auth/logout", { preHandler: [app.authenticate] }, auth.logout);
  app.get("/auth/me", { preHandler: [app.authenticate] }, auth.me);
}
