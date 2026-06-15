import type { FastifyReply, FastifyRequest } from "fastify";
import { AnalyticsService } from "@/services/analytics.service.js";
import { analyticsQuerySchema } from "@/types/schemas.js";

export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  overview = async (request: FastifyRequest, reply: FastifyReply) => {
    const { days } = analyticsQuerySchema.parse(request.query);
    const overview = await this.analyticsService.getOverview(request.currentUser!.id, days);
    reply.send(overview);
  };
}
