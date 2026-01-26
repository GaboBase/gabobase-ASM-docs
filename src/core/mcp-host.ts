import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { AgentContract } from "../types/contract";
import { NotionRegistry } from "./registry";

export class MCPSwarmHost {
  private server: McpServer;
  private registry: NotionRegistry;
  private activeAgents: Map<string, AgentContract> = new Map();

  constructor() {
    this.server = new McpServer({
      name: "ASM-Swarm-Host",
      version: "1.0.0"
    });
    this.registry = new NotionRegistry();
  }

  /**
   * Initializes the swarm by fetching active agents from Notion
   * and registering their tools via MCP.
   */
  async initialize() {
    console.log("🚀 Initializing ASM Swarm Host...");
    
    // 1. Fetch Agents from Registry
    const agents = await this.registry.fetchActiveAgents();
    
    // 2. Register Agents as MCP Tools
    for (const agent of agents) {
      this.registerAgentTool(agent);
      this.activeAgents.set(agent.AgentID, agent);
    }

    console.log(`✅ Registered ${this.activeAgents.size} agents in the Swarm.`);
  }

  private registerAgentTool(agent: AgentContract) {
    if (!agent.MCPEnabled) return;

    // Dynamic tool registration based on agent contract
    this.server.tool(
      `execute_${agent.Name.toLowerCase().replace(/\s+/g, "_")}`,
      agent.ToolSchema, // Zod schema from contract
      async (args) => {
        console.log(`🤖 Delegating task to ${agent.Name} (${agent.AgentID})`);
        // In a real impl, this would route to the specific container/service
        return {
          content: [{ type: "text", text: `Task executed by ${agent.Name}` }]
        };
      }
    );
  }

  async start() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.log("🔌 MCP Swarm Transport Connected via Stdio");
  }
}

// Entry point
if (require.main === module) {
  const host = new MCPSwarmHost();
  host.initialize().then(() => host.start());
}
