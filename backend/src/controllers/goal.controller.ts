import type { FastifyReply, FastifyRequest } from "fastify";
import { GoalService } from "@/services/goal.service.js";
import { createGoalRequestSchema, deleteGoalRequestSchema, patchGoalRequestSchema } from "@/types/schemas.js";
import { BadRequest } from "@/utils/errors.js";

export class GoalController {
  constructor(private readonly goalService: GoalService) {}

  list = async (request: FastifyRequest, reply: FastifyReply) => {
    const includeClosed = (request.query as { includeClosed?: string }).includeClosed === "true";
    const goals = await this.goalService.listGoals(request.currentUser!.id, includeClosed);
    reply.send({ goals });
  };

  get = async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const goal = await this.goalService.getGoal(request.currentUser!.id, id);
    reply.send({ goal });
  };

  history = async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const history = await this.goalService.getHistory(request.currentUser!.id, id);
    reply.send({ history });
  };

  /**
   * Dual-mode: with no `signedXdr` in the body, returns an unsigned
   * `create_goal` invocation for the wallet to sign (the "prepare" step).
   * With `signedXdr`, submits it and materializes the Goal row from the
   * confirmed on-chain result (the "submit" step).
   */
  create = async (request: FastifyRequest, reply: FastifyReply) => {
    const input = createGoalRequestSchema.parse(request.body);
    const user = request.currentUser!;

    if (!input.signedXdr) {
      const prepared = await this.goalService.prepareCreateGoal(user.publicKey, input);
      reply.send({ status: "PREPARED", ...prepared });
      return;
    }

    const goal = await this.goalService.submitCreateGoal(user.id, input.signedXdr, input);
    reply.status(201).send({ status: "CONFIRMED", goal });
  };

  patch = async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const input = patchGoalRequestSchema.parse(request.body);
    const user = request.currentUser!;

    const fieldsSet = [input.paused, input.targetAmount, input.unlockDate, input.name ?? input.icon].filter(
      (v) => v !== undefined,
    ).length;
    if (fieldsSet === 0) throw BadRequest("No updatable fields provided");

    if (!input.signedXdr) {
      const prepared = await this.goalService.preparePatch(user.id, id, user.publicKey, input);
      reply.send({ status: "PREPARED", ...prepared });
      return;
    }

    const goal = await this.goalService.submitPatch(user.id, id, input.signedXdr, input);
    reply.send({ status: "CONFIRMED", goal });
  };

  remove = async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const input = deleteGoalRequestSchema.parse(request.body ?? {});
    const user = request.currentUser!;

    if (!input.signedXdr) {
      const prepared = await this.goalService.prepareDelete(user.id, id, user.publicKey);
      reply.send({ status: "PREPARED", ...prepared });
      return;
    }

    const goal = await this.goalService.submitDelete(user.id, id, input.signedXdr);
    reply.send({ status: "CONFIRMED", goal });
  };
}
