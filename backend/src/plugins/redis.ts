import { Redis } from "ioredis";
import fp from "fastify-plugin";
import type { FastifyInstance } from "fastify";
import { env } from "@/config/env.js";

declare module "fastify" {
  interface FastifyInstance {
    redis: Redis;
    redisSub: Redis;
  }
}

export default fp(async function redisPlugin(app: FastifyInstance) {
  const redis = new Redis(env.REDIS_URL, { lazyConnect: true });
  const redisSub = new Redis(env.REDIS_URL, { lazyConnect: true });

  await redis.connect();
  await redisSub.connect();

  redis.on("error", (err: Error) => app.log.error({ err }, "redis connection error"));
  redisSub.on("error", (err: Error) => app.log.error({ err }, "redis subscriber connection error"));

  app.decorate("redis", redis);
  app.decorate("redisSub", redisSub);

  app.addHook("onClose", async (instance) => {
    instance.redis.disconnect();
    instance.redisSub.disconnect();
  });
});
