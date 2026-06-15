import type { FastifyReply, FastifyRequest } from "fastify";
import { planGoal } from "@/services/planner.service.js";
import { plannerRequestSchema } from "@/types/schemas.js";

export class PlannerController {
  plan = async (request: FastifyRequest, reply: FastifyReply) => {
    const input = plannerRequestSchema.parse(request.body);
    const result = planGoal(input);
    reply.send(result);
  };
}
