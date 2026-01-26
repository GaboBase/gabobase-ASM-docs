import { VertexAI, GenerativeModel } from "@google-cloud/vertexai";
import { AgentContract } from "../types/contract";

export class SwarmExecutor {
  private vertex: VertexAI;
  private models: Map<string, GenerativeModel>;

  constructor() {
    this.vertex = new VertexAI({
      project: process.env.GOOGLE_PROJECT_ID,
      location: process.env.GOOGLE_LOCATION || "us-central1",
    });
    this.models = new Map();
  }

  private getModel(modelName: string): GenerativeModel {
    // Default to gemini-pro if model not specified or N/A
    const safeModelName = (modelName === "N/A" || !modelName) 
      ? "gemini-1.5-pro-preview-0409" 
      : modelName;

    if (!this.models.has(safeModelName)) {
      this.models.set(safeModelName, this.vertex.getGenerativeModel({ 
        model: safeModelName,
        generationConfig: {
            temperature: 0.2, // Low temp for agentic reliability
            maxOutputTokens: 2048,
        }
      }));
    }
    return this.models.get(safeModelName)!;
  }

  /**
   * Constructs the system prompt based on the Agent Contract
   */
  private buildSystemPrompt(agent: AgentContract): string {
    return `
      YOU ARE AGENT: ${agent.Name} (ID: ${agent.AgentID})
      ROLE: ${agent.Role}
      CATEGORY: ${agent.Category}
      AUTONOMY: ${agent.AutonomyLevel}
      
      YOUR CORE SKILLS: ${JSON.stringify(agent.ToolSchema)}
      
      MISSION:
      Execute tasks strictly according to your defined schema. 
      If you are a 'Monitor', analyze and report. 
      If you are a 'Specialist', provide deep domain expertise.
      
      OUTPUT FORMAT:
      Return clear, structured JSON data whenever possible.
    `;
  }

  async executeTask(agent: AgentContract, input: any): Promise<string> {
    console.log(`⚡ Executing [${agent.AgentID}] via Vertex AI (${agent.VertexAIModel || 'default'})...`);
    
    try {
      const model = this.getModel(agent.VertexAIModel as string);
      const systemPrompt = this.buildSystemPrompt(agent);
      
      // Create a chat session to maintain context if needed, 
      // or just generate content for single-shot tasks.
      const result = await model.generateContent({
        contents: [
            { role: 'user', parts: [{ text: `SYSTEM_INSTRUCTIONS: ${systemPrompt}` }] },
            { role: 'user', parts: [{ text: `TASK_INPUT: ${JSON.stringify(input)}` }] }
        ]
      });

      const response = result.response.candidates[0].content.parts[0].text;
      return response || "No response generated.";

    } catch (error) {
      console.error(`🔥 Execution failed for ${agent.AgentID}:`, error);
      return `Error: Execution failed - ${(error as Error).message}`;
    }
  }
}