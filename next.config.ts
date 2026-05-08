import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // @react-pdf/renderer precisa rodar fora do bundle Turbopack
  // (carrega fontes binárias internamente que travam o webpack/turbopack)
  serverExternalPackages: ["@react-pdf/renderer"],
};

export default nextConfig;
