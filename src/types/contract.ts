import { z } from "zod";

// Core Agent Contract Definition matching Notion Schema
export const AgentContractSchema = z.object({
  AgentID: z.string(),
  Name: z.string(),
  Role: z.enum(["Specialist", "Worker", "Monitor", "Manager"]),
  Category: z.string(),
  AutonomyLevel: z.enum([
    "Level 1 - Guided",
    "Level 2 - Semi-Autonomous",
    "Level 3 - Autonomous",
    "Level 4 - Self-Improving"
  ]),
  ExecutionPattern: z.enum(["Sequential", "Parallel", "Recursive", "BFS", "Hybrid"]),
  MCPEnabled: z.boolean(),
  ToolSchema: z.string().transform((str) => {
    try {
      return JSON.parse(str);
    } catch {
      return {};
    }
  }),
  QualityScore: z.number().min(0).max(1),
  Status: z.enum(["Active", "Inactive", "Maintenance"]),
});

export type AgentContract = z.infer<typeof AgentContractSchema>;

export interface ExecutionContext {
  traceId: string;
  priority: "low" | "medium" | "high";
  contextWindow: string[];
}
