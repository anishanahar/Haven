import "fastify";
import type { Container } from "@/container.js";

declare module "fastify" {
  interface FastifyRequest {
    currentUser?: {
      id: string;
      publicKey: string;
    };
  }

  interface FastifyInstance {
    authenticate: (request: import("fastify").FastifyRequest, reply: import("fastify").FastifyReply) => Promise<void>;
    container: Container;
  }
}
