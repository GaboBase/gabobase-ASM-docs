import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { AgentContract } from "../types/contract";
import { NotionRegistry } from "./registry";
import { SwarmExecutor } from "./executor";

export class MCPSwarmHost {
  private server: McpServer;
  private registry: NotionRegistry;
  private executor: SwarmExecutor;
  private activeAgents: Map<string, AgentContract> = new Map();

  constructor() {
    this.server = new McpServer({
      name: "ASM-Swarm-Host",
      version: "1.0.0"
    });
    this.registry = new NotionRegistry();
    this.executor = new SwarmExecutor();
  }

  async initialize() {
    console.log("🚀 Initializing ASM Swarm Host...");
    
    // Fetch Agents from Registry
    const agents = await this.registry.fetchActiveAgents();
    
    for (const agent of agents) {
      this.registerAgentTool(agent);
      this.activeAgents.set(agent.AgentID, agent);
    }

    console.log(`✅ Registered ${this.activeAgents.size} agents in the Swarm.`);
  }

  private registerAgentTool(agent: AgentContract) {
    if (!agent.MCPEnabled) return;

    // Register the agent as an executable tool
    this.server.tool(
      `execute_${agent.Name.toLowerCase().replace(/\s+/g, "_")}`,
      agent.ToolSchema, 
      async (args) => {
        // Execute via Vertex AI
        const result = await this.executor.executeTask(agent, args);
        
        return {
          content: [{ type: "text", text: result }]
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

if (require.main === module) {
  const host = new MCPSwarmHost();
  host.initialize().then(() => host.start());
}