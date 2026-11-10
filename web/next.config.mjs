/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: { unoptimized: true },
  serverExternalPackages: ["near-api-js"],
};

export default nextConfig;
