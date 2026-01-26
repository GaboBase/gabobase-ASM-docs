#!/usr/bin/env node
/**
 * Sync Notion databases to local markdown files
 * Runs every 6 hours via GitHub Actions
 */

const { Client } = require('@notionhq/client');
const fs = require('fs').promises;
const path = require('path');

const notion = new Client({ auth: process.env.NOTION_API_KEY });

const DATABASES = {
  agents: process.env.AGENT_REGISTRY_ID || '4f83c29038c74710a9e2b56bd1c35c3c',
  architectures: process.env.ARCHITECTURE_CATALOG_ID || 'ce55a73f69e34d3a965f70014468af28',
};

async function syncAgentRegistry() {
  console.log('🔄 Syncing Agent Registry...');
  
  const response = await notion.databases.query({
    database_id: DATABASES.agents,
  });

  const agents = response.results.map(page => ({
    id: page.properties.AgentID?.title?.[0]?.plain_text || 'Unknown',
    name: page.properties.Name?.rich_text?.[0]?.plain_text || 'Unknown',
    category: page.properties.Category?.select?.name || 'Uncategorized',
    role: page.properties.Role?.select?.name || 'Unknown',
    status: page.properties.Status?.select?.name || 'Unknown',
    autonomyLevel: page.properties.AutonomyLevel?.select?.name || 'Unknown',
    architectures: page.properties.ArchitectureDependencies?.multi_select?.map(a => a.name) || [],
    skills: page.properties.Skills?.multi_select?.map(s => s.name) || [],
    mcpEnabled: page.properties.MCPEnabled?.checkbox || false,
    url: page.url,
  }));

  // Group by category
  const byCategory = agents.reduce((acc, agent) => {
    acc[agent.category] = acc[agent.category] || [];
    acc[agent.category].push(agent);
    return acc;
  }, {});

  // Generate markdown
  let markdown = '# Agent Registry\n\n';
  markdown += `> **Last Updated:** ${new Date().toISOString()}\n\n`;
  markdown += `**Total Agents:** ${agents.length}\n\n`;

  for (const [category, categoryAgents] of Object.entries(byCategory)) {
    markdown += `## ${category} (${categoryAgents.length})\n\n`;
    markdown += '| Agent ID | Name | Role | Autonomy | Status | Architectures |\n';
    markdown += '|----------|------|------|----------|--------|---------------|\n';
    
    for (const agent of categoryAgents) {
      markdown += `| ${agent.id} | [${agent.name}](${agent.url}) | ${agent.role} | ${agent.autonomyLevel} | ${agent.status} | ${agent.architectures.join(', ') || 'None'} |\n`;
    }
    markdown += '\n';
  }

  await fs.writeFile('docs/AGENT_REGISTRY.md', markdown);
  console.log('✅ Agent Registry synced!');
}

async function syncArchitectureCatalog() {
  console.log('🔄 Syncing Architecture Catalog...');
  
  const response = await notion.databases.query({
    database_id: DATABASES.architectures,
  });

  const architectures = response.results.map(page => ({
    name: page.properties.Name?.title?.[0]?.plain_text || 'Unknown',
    category: page.properties.Category?.select?.name || 'Uncategorized',
    status: page.properties.Status?.select?.name || 'Unknown',
    maturity: page.properties.Maturity?.select?.name || 'Unknown',
    complexity: page.properties.Complexity?.select?.name || 'Unknown',
    components: page.properties.Components?.multi_select?.map(c => c.name) || [],
    description: page.properties.Description?.rich_text?.[0]?.plain_text || '',
    url: page.url,
  }));

  let markdown = '# Architecture Catalog\n\n';
  markdown += `> **Last Updated:** ${new Date().toISOString()}\n\n`;
  markdown += `**Total Architectures:** ${architectures.length}\n\n`;
  markdown += '| Name | Category | Maturity | Complexity | Components | Status |\n';
  markdown += '|------|----------|----------|------------|------------|--------|\n';
  
  for (const arch of architectures) {
    markdown += `| [${arch.name}](${arch.url}) | ${arch.category} | ${arch.maturity} | ${arch.complexity} | ${arch.components.join(', ')} | ${arch.status} |\n`;
  }

  await fs.writeFile('docs/ARCHITECTURE_CATALOG.md', markdown);
  console.log('✅ Architecture Catalog synced!');
}

async function main() {
  try {
    await syncAgentRegistry();
    await syncArchitectureCatalog();
    console.log('🎉 All syncs completed successfully!');
  } catch (error) {
    console.error('❌ Sync failed:', error);
    process.exit(1);
  }
}

main();