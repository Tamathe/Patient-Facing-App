import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: projectRoot,
  // Allow the Food Lens demo to be opened on a phone through an HTTPS dev tunnel
  // (e.g. cloudflared). getUserMedia requires a secure context, so the phone loads
  // the tunnel origin while dev assets are still served from localhost.
  allowedDevOrigins: ["*.trycloudflare.com", "*.ngrok-free.app", "*.ngrok.io"]
};

export default nextConfig;
