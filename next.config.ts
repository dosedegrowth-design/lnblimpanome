import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // pdfkit precisa rodar fora do bundle Turbopack
  // (carrega fontes binárias .afm/.ttf internamente)
  serverExternalPackages: ["pdfkit"],
};

export default nextConfig;
