/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: { root: new URL(".", import.meta.url).pathname },
  reactStrictMode: false,
  // Next 16.3+ otherwise writes AGENTS.md / CLAUDE.md into every scaffolded
  // project on first `dev`, leaving a dirty tree before anything is edited.
  agentRules: false,
};

export default nextConfig;
