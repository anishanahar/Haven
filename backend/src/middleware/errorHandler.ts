import type { FastifyError, FastifyReply, FastifyRequest } from "fastify";
import { ZodError } from "zod";
import { ApiError } from "@/utils/errors.js";

export function errorHandler(error: FastifyError | Error, request: FastifyRequest, reply: FastifyReply): void {
  if (error instanceof ApiError) {
    reply.status(error.statusCode).send({
      error: { code: error.code, message: error.message, details: error.details ?? null },
    });
    return;
  }

  if (error instanceof ZodError) {
    reply.status(400).send({
      error: { code: "VALIDATION_ERROR", message: "Request validation failed", details: error.flatten() },
    });
    return;
  }

  const fastifyError = error as FastifyError;
  if (fastifyError.statusCode && fastifyError.statusCode < 500) {
    reply.status(fastifyError.statusCode).send({
      error: { code: fastifyError.code ?? "BAD_REQUEST", message: error.message, details: null },
    });
    return;
  }

  request.log.error({ err: error }, "unhandled error");
  reply.status(500).send({
    error: { code: "INTERNAL_SERVER_ERROR", message: "Something went wrong. Please try again.", details: null },
  });
}
