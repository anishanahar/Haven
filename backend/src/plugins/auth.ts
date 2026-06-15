import fp from "fastify-plugin";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { verifySessionToken, hashToken } from "@/utils/jwt.js";
import { ApiError } from "@/utils/errors.js";

export default fp(async function authPlugin(app: FastifyInstance) {
  app.decorate("authenticate", async (request: FastifyRequest, reply: FastifyReply) => {
    const header = request.headers.authorization;
    if (!header?.startsWith("Bearer ")) {
      throw new ApiError(401, "UNAUTHENTICATED", "Missing bearer token");
    }
    const token = header.slice("Bearer ".length);

    let payload;
    try {
      payload = verifySessionToken(token);
    } catch {
      throw new ApiError(401, "UNAUTHENTICATED", "Invalid or expired token");
    }

    const session = await app.prisma.session.findUnique({
      where: { tokenHash: hashToken(token) },
    });
    if (!session || session.revokedAt || session.expiresAt < new Date()) {
      throw new ApiError(401, "UNAUTHENTICATED", "Session has been revoked or expired");
    }

    request.currentUser = { id: payload.sub, publicKey: payload.publicKey };
    void reply;
  });
});
