import type { FastifyReply, FastifyRequest } from "fastify";
import { AuthService } from "@/services/auth.service.js";
import { UserRepository } from "@/repositories/user.repository.js";
import { authChallengeRequestSchema, authVerifyRequestSchema } from "@/types/schemas.js";
import { NotFound } from "@/utils/errors.js";

export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly users: UserRepository,
  ) {}

  challenge = async (request: FastifyRequest, reply: FastifyReply) => {
    const { publicKey } = authChallengeRequestSchema.parse(request.body);
    const result = await this.authService.issueChallenge(publicKey);
    reply.send(result);
  };

  verify = async (request: FastifyRequest, reply: FastifyReply) => {
    const { publicKey, nonce, signedChallengeXdr } = authVerifyRequestSchema.parse(request.body);
    const { token, user, expiresAt } = await this.authService.verifyAndCreateSession(publicKey, nonce, signedChallengeXdr, {
      userAgent: request.headers["user-agent"],
      ipAddress: request.ip,
    });
    reply.send({
      token,
      expiresAt,
      user: { id: user.id, publicKey: user.publicKey, displayName: user.displayName, currency: user.currency, theme: user.theme },
    });
  };

  logout = async (request: FastifyRequest, reply: FastifyReply) => {
    const header = request.headers.authorization;
    if (header?.startsWith("Bearer ")) {
      await this.authService.logout(header.slice("Bearer ".length));
    }
    reply.status(204).send();
  };

  me = async (request: FastifyRequest, reply: FastifyReply) => {
    const user = await this.users.findById(request.currentUser!.id);
    if (!user) throw NotFound("User");
    reply.send({
      id: user.id,
      publicKey: user.publicKey,
      displayName: user.displayName,
      email: user.email,
      currency: user.currency,
      theme: user.theme,
      createdAt: user.createdAt,
    });
  };
}
