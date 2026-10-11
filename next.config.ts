import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // `next dev` otherwise scaffolds AGENTS.md and CLAUDE.md at the project root
  // whenever it detects an AI coding agent. Those files are editor tooling, not
  // part of the application, so keep them out of the repository.
  agentRules: false,
};

export default nextConfig;
