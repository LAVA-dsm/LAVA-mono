import type { NextConfig } from "next";
import { fileURLToPath } from "node:url";

const sharedSourcePath = fileURLToPath(new URL("../../packages/shared/src/index.ts", import.meta.url));

const nextConfig: NextConfig = {
  webpack(config) {
    config.resolve.alias["@lava/shared"] = sharedSourcePath;
    return config;
  }
};

export default nextConfig;
