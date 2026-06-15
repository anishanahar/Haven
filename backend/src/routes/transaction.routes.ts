import type { FastifyInstance } from "fastify";

export default async function transactionRoutes(app: FastifyInstance) {
  const { transaction } = app.container.controllers;
  const auth = { preHandler: [app.authenticate] };

  app.post("/deposit", auth, transaction.deposit);
  app.post("/withdraw", auth, transaction.withdraw);
  app.post("/claim", auth, transaction.claim);
  app.get("/transactions", auth, transaction.list);
}
