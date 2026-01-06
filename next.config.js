/** @type {import("next").NextConfig} */
const config = {
  // Enable standalone output for Docker deployment
  // This creates a minimal production bundle in .next/standalone with only necessary dependencies
  output: "standalone",
  images: {
    domains: ["vybe.build", "i.ibb.co", "cdn.brandfetch.io"],
  },
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
  devIndicators: false,
  outputFileTracingRoot: process.cwd(),
  webpack: (webpackConfig, { dev }) => {
    if (!dev) {
      webpackConfig.cache = Object.freeze({
        type: "filesystem",
        maxMemoryGenerations: 1,
        maxAge: 1000 * 60 * 60 * 24, // one day
      });
    }
    return webpackConfig;
  },
};

export default config;
