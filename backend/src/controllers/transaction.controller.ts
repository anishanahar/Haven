import type { FastifyReply, FastifyRequest } from "fastify";
import { TransactionService } from "@/services/transaction.service.js";
import { TransactionRepository } from "@/repositories/transaction.repository.js";
import { claimRequestSchema, depositRequestSchema, transactionsQuerySchema, withdrawRequestSchema } from "@/types/schemas.js";

export class TransactionController {
  constructor(
    private readonly transactionService: TransactionService,
    private readonly transactionRepo: TransactionRepository,
  ) {}

  deposit = async (request: FastifyRequest, reply: FastifyReply) => {
    const input = depositRequestSchema.parse(request.body);
    const user = request.currentUser!;

    if (!input.signedXdr) {
      const prepared = await this.transactionService.prepareDeposit(user.id, user.publicKey, input.goalId, input.amount);
      reply.send({ status: "PREPARED", ...prepared });
      return;
    }

    const goal = await this.transactionService.submitDeposit(user.id, input.goalId, input.amount, input.signedXdr);
    reply.status(201).send({ status: "CONFIRMED", goal });
  };

  withdraw = async (request: FastifyRequest, reply: FastifyReply) => {
    const input = withdrawRequestSchema.parse(request.body);
    const user = request.currentUser!;

    if (!input.signedXdr) {
      const prepared = await this.transactionService.prepareWithdraw(user.id, user.publicKey, input.goalId, input.amount);
      reply.send({ status: "PREPARED", ...prepared });
      return;
    }

    const goal = await this.transactionService.submitWithdraw(user.id, input.goalId, input.amount, input.signedXdr);
    reply.status(201).send({ status: "CONFIRMED", goal });
  };

  claim = async (request: FastifyRequest, reply: FastifyReply) => {
    const input = claimRequestSchema.parse(request.body);
    const user = request.currentUser!;

    if (!input.signedXdr) {
      const prepared = await this.transactionService.prepareClaim(user.id, user.publicKey, input.goalId);
      reply.send({ status: "PREPARED", ...prepared });
      return;
    }

    const goal = await this.transactionService.submitClaim(user.id, input.goalId, input.signedXdr);
    reply.status(201).send({ status: "CONFIRMED", goal });
  };

  list = async (request: FastifyRequest, reply: FastifyReply) => {
    const query = transactionsQuerySchema.parse(request.query);
    const transactions = await this.transactionRepo.findManyForUser(request.currentUser!.id, query);
    reply.send({ transactions });
  };
}
