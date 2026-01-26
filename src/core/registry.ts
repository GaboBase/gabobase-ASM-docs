import { Client } from "@notionhq/client";
import { AgentContract, AgentContractSchema } from "../types/contract";

export class NotionRegistry {
  private notion: Client;
  private databaseId: string;

  constructor() {
    this.notion = new Client({ auth: process.env.NOTION_API_KEY });
    this.databaseId = process.env.NOTION_AGENT_DB_ID || "";
  }

  async fetchActiveAgents(): Promise<AgentContract[]> {
    try {
      const response = await this.notion.databases.query({
        database_id: this.databaseId,
        filter: {
          property: "Status",
          select: {
            equals: "Active"
          }
        }
      });

      // Map Notion properties to AgentContract
      // Note: Simplified mapping for POC
      return response.results.map((page: any) => {
        const props = page.properties;
        return {
          AgentID: props.AgentID.rich_text[0]?.plain_text,
          Name: props.Name.title[0]?.plain_text,
          Role: props.Role.select?.name,
          Category: props.Category.select?.name,
          AutonomyLevel: props.AutonomyLevel.select?.name,
          ExecutionPattern: props.ExecutionPattern.select?.name,
          MCPEnabled: props.MCPEnabled.select?.name === "__YES__",
          ToolSchema: props.ToolSchema.rich_text[0]?.plain_text || "{}",
          QualityScore: props.QualityScore.number,
          Status: props.Status.select?.name
        } as AgentContract;
      });
    } catch (error) {
      console.error("Failed to fetch agents from Notion:", error);
      return [];
    }
  }
}
