import type { FastifyInstance } from "fastify";

export default async function plannerRoutes(app: FastifyInstance) {
  const { planner } = app.container.controllers;
  // Deterministic and stateless — useful pre-signup on the landing page too, so it's unauthenticated.
  app.post("/planner", planner.plan);
}
