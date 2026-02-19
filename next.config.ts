import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {},
  experimental: {
    serverExternalPackages: ["pdfjs-dist"],
  },
  webpack: (config) => {
    // config.resolve.alias = {
    //   ...config.resolve.alias,
    //   canvas: false,
    // };
    config.resolve.alias.canvas = false;

    return config;
  },
};

export default nextConfig;
