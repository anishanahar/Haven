import closeWithGrace from "close-with-grace";
import { buildApp } from "@/app.js";
import { env } from "@/config/env.js";

async function main() {
  const app = await buildApp();

  closeWithGrace({ delay: 5000 }, async ({ err }) => {
    if (err) app.log.error({ err }, "closing app due to error");
    await app.close();
  });

  try {
    await app.listen({ port: env.PORT, host: env.HOST });
  } catch (err) {
    app.log.error({ err }, "failed to start server");
    process.exit(1);
  }
}

main();
