import { NotionRegistry } from "../core/registry";
import { AgentContractSchema } from "../types/contract";

async function validate() {
  console.log("🔍 Starting GenOps Contract Validation...");
  
  const registry = new NotionRegistry();
  const agents = await registry.fetchActiveAgents();
  
  if (agents.length === 0) {
    console.warn("⚠️ No active agents found in registry.");
    process.exit(0);
  }

  let hasError = false;

  for (const agent of agents) {
    const result = AgentContractSchema.safeParse(agent);
    
    if (!result.success) {
      console.error(`❌ Contract Violation [${agent.AgentID}]:`);
      result.error.errors.forEach(err => {
        console.error(`   - ${err.path.join(".")}: ${err.message}`);
      });
      hasError = true;
    } else {
      console.log(`✅ Valid: ${agent.AgentID} (${agent.Name})`);
    }
  }

  if (hasError) {
    console.error("\n🚨 Validation Failed: One or more agents violated the ASM Contract.");
    process.exit(1);
  }

  console.log("\n✨ All Agent Contracts Verified Successfully.");
}

validate().catch(err => {
  console.error("Fatal Error:", err);
  process.exit(1);
});