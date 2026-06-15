import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  // Produces a minimal standalone server bundle (see frontend/Dockerfile) —
  // only the traced dependencies, not the full node_modules tree.
  output: "standalone",
  turbopack: {
    // An unrelated pnpm-lock.yaml in the user's home directory otherwise
    // confuses Turbopack's workspace-root inference.
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
