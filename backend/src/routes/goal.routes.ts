import type { FastifyInstance } from "fastify";

export default async function goalRoutes(app: FastifyInstance) {
  const { goal } = app.container.controllers;
  const auth = { preHandler: [app.authenticate] };

  app.get("/goals", auth, goal.list);
  app.post("/goal", auth, goal.create);
  app.get("/goal/:id", auth, goal.get);
  app.get("/goal/:id/history", auth, goal.history);
  app.patch("/goal/:id", auth, goal.patch);
  app.delete("/goal/:id", auth, goal.remove);
}
