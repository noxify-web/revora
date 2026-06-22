/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@revora/shared"],
  allowedDevOrigins: [
    "*.trycloudflare.com",
    "*.ngrok-free.app",
    "*.ngrok-free.dev",
    "*.ngrok.io",
    "*.ngrok.app",
  ],
};

export default nextConfig;
