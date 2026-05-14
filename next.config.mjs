/** @type {import("next").NextConfig} */
const nextConfig = {
  experimental: {
    missingSuspenseWithCSRBailout: false
  },
  output: "standalone",
  eslint: {
    ignoreDuringBuilds: true
  }
};

export default nextConfig;
