import "server-only";

import type { AgentRuntime } from "orchajs";

import { orcha } from "@/orcha";

export class ConfigurationError extends Error {}

export function getAssistant(): AgentRuntime {
  if (!process.env.OPENAI_API_KEY) {
    throw new ConfigurationError("The support assistant is not configured.");
  }
  const assistant = orcha.assistant as AgentRuntime | undefined;
  if (!assistant) throw new ConfigurationError("The assistant agent is not registered.");
  return assistant;
}
