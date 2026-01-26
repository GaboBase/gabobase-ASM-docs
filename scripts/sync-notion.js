#!/usr/bin/env node

/**
 * Notion ↔ GitHub Synchronization Script
 * 
 * Syncs Agent Registry and Architecture Catalog from Notion to GitHub
 * Updates GitHub README badges with live Notion data
 * 
 * Usage:
 *   node scripts/sync-notion.js [--dry-run] [--verbose]
 * 
 * Environment Variables:
 *   NOTION_API_KEY - Notion integration API key
 *   NOTION_AGENT_REGISTRY_ID - Database ID for Agent Registry
 *   NOTION_ARCHITECTURE_CATALOG_ID - Database ID for Architecture Catalog
 */

const { Client } = require('@notionhq/client');
const fs = require('fs').promises;
const path = require('path');

// Configuration
const CONFIG = {
  notionApiKey: process.env.NOTION_API_KEY,
  agentRegistryId: process.env.NOTION_AGENT_REGISTRY_ID || 'ce55a73f69e34d3a965f70014468af28',
  architectureCatalogId: process.env.NOTION_ARCHITECTURE_CATALOG_ID || 'ce55a73f69e34d3a965f70014468af28',
  outputDir: './data',
  readmePath: './README.md',
  dryRun: process.argv.includes('--dry-run'),
  verbose: process.argv.includes('--verbose')
};

// Initialize Notion client
const notion = new Client({ auth: CONFIG.notionApiKey });

// Logging utilities
const log = {
  info: (msg) => console.log(`ℹ️  ${msg}`),
  success: (msg) => console.log(`✅ ${msg}`),
  error: (msg) => console.error(`❌ ${msg}`),
  warn: (msg) => console.warn(`⚠️  ${msg}`),
  debug: (msg) => CONFIG.verbose && console.log(`🔍 ${msg}`)
};

/**
 * Fetch all agents from Notion Agent Registry
 */
async function fetchAgents() {
  log.info('Fetching agents from Notion Agent Registry...');
  
  const agents = [];
  let hasMore = true;
  let startCursor = undefined;
  
  while (hasMore) {
    const response = await notion.databases.query({
      database_id: CONFIG.agentRegistryId,
      start_cursor: startCursor,
      page_size: 100
    });
    
    for (const page of response.results) {
      const props = page.properties;
      
      agents.push({
        id: page.id,
        name: extractText(props['Agent Name']),
        category: extractSelect(props['Category']),
        status: extractSelect(props['Status']),
        architecture: extractMultiSelect(props['Architecture']),
        executionPattern: extractSelect(props['ExecutionPattern']),
        mcpEnabled: extractCheckbox(props['MCPEnabled']),
        costTier: extractSelect(props['CostTier']),
        priority: extractNumber(props['Priority']),
        description: extractText(props['Description']),
        triggerConditions: extractText(props['Trigger Conditions']),
        toolSchema: extractText(props['ToolSchema']),
        integrationPoints: extractMultiSelect(props['IntegrationPoints']),
        knowledgeSources: extractMultiSelect(props['KnowledgeSources']),
        notionUrl: page.url,
        lastUpdated: page.last_edited_time
      });
    }
    
    hasMore = response.has_more;
    startCursor = response.next_cursor;
    
    log.debug(`Fetched ${agents.length} agents so far...`);
  }
  
  log.success(`Fetched ${agents.length} agents from Notion`);
  return agents;
}

/**
 * Fetch all architectures from Notion Architecture Catalog
 */
async function fetchArchitectures() {
  log.info('Fetching architectures from Notion Architecture Catalog...');
  
  const architectures = [];
  let hasMore = true;
  let startCursor = undefined;
  
  while (hasMore) {
    const response = await notion.databases.query({
      database_id: CONFIG.architectureCatalogId,
      start_cursor: startCursor,
      page_size: 100
    });
    
    for (const page of response.results) {
      const props = page.properties;
      
      architectures.push({
        id: page.id,
        name: extractText(props['Name']),
        category: extractSelect(props['Category']),
        status: extractSelect(props['Status']),
        maturity: extractSelect(props['Maturity']),
        complexity: extractSelect(props['Complexity']),
        components: extractNumber(props['Components']),
        description: extractText(props['Description']),
        notionUrl: page.url,
        lastUpdated: page.last_edited_time
      });
    }
    
    hasMore = response.has_more;
    startCursor = response.next_cursor;
    
    log.debug(`Fetched ${architectures.length} architectures so far...`);
  }
  
  log.success(`Fetched ${architectures.length} architectures from Notion`);
  return architectures;
}

/**
 * Generate agent documentation in Markdown
 */
function generateAgentDocs(agents) {
  const categorized = {};
  
  agents.forEach(agent => {
    if (!categorized[agent.category]) {
      categorized[agent.category] = [];
    }
    categorized[agent.category].push(agent);
  });
  
  let markdown = '# Agent Registry\n\n';
  markdown += `> Last Updated: ${new Date().toISOString()}\n\n`;
  markdown += `Total Agents: **${agents.length}**\n\n`;
  
  for (const [category, categoryAgents] of Object.entries(categorized)) {
    markdown += `## ${category} (${categoryAgents.length})\n\n`;
    markdown += '| Agent | Status | Architecture | MCP | Cost | Priority |\n';
    markdown += '|-------|--------|--------------|-----|------|----------|\n';
    
    categoryAgents
      .sort((a, b) => (b.priority || 0) - (a.priority || 0))
      .forEach(agent => {
        const statusEmoji = getStatusEmoji(agent.status);
        const mcpBadge = agent.mcpEnabled ? '✅' : '❌';
        const archText = agent.architecture.join(', ');
        
        markdown += `| [${agent.name}](${agent.notionUrl}) | ${statusEmoji} ${agent.status} | ${archText} | ${mcpBadge} | ${agent.costTier} | ${agent.priority || 'N/A'} |\n`;
      });
    
    markdown += '\n';
  }
  
  return markdown;
}

/**
 * Generate architecture documentation in Markdown
 */
function generateArchitectureDocs(architectures) {
  let markdown = '# Architecture Catalog\n\n';
  markdown += `> Last Updated: ${new Date().toISOString()}\n\n`;
  markdown += `Total Architectures: **${architectures.length}**\n\n`;
  
  markdown += '| Name | Category | Status | Maturity | Complexity |\n';
  markdown += '|------|----------|--------|----------|------------|\n';
  
  architectures
    .sort((a, b) => a.name.localeCompare(b.name))
    .forEach(arch => {
      const statusEmoji = getStatusEmoji(arch.status);
      const maturityEmoji = getMaturityEmoji(arch.maturity);
      
      markdown += `| [${arch.name}](${arch.notionUrl}) | ${arch.category} | ${statusEmoji} ${arch.status} | ${maturityEmoji} ${arch.maturity} | ${arch.complexity} |\n`;
    });
  
  return markdown;
}

/**
 * Update README badges with live Notion data
 */
async function updateReadmeBadges(agents, architectures) {
  log.info('Updating README badges...');
  
  let readme = await fs.readFile(CONFIG.readmePath, 'utf-8');
  
  // Calculate metrics
  const activeAgents = agents.filter(a => a.status === 'Active').length;
  const productionArchs = architectures.filter(a => a.status === 'Production').length;
  const mcpEnabledCount = agents.filter(a => a.mcpEnabled).length;
  const avgPriority = (agents.reduce((sum, a) => sum + (a.priority || 0), 0) / agents.length).toFixed(1);
  
  // Update badge placeholders
  const badges = {
    '<!-- AGENTS_COUNT -->': `![Agents](https://img.shields.io/badge/Agents-${agents.length}-blue)`,
    '<!-- ACTIVE_AGENTS -->': `![Active](https://img.shields.io/badge/Active-${activeAgents}-green)`,
    '<!-- ARCHITECTURES_COUNT -->': `![Architectures](https://img.shields.io/badge/Architectures-${architectures.length}-purple)`,
    '<!-- PRODUCTION_ARCHS -->': `![Production](https://img.shields.io/badge/Production-${productionArchs}-success)`,
    '<!-- MCP_ENABLED -->': `![MCP](https://img.shields.io/badge/MCP_Enabled-${mcpEnabledCount}-orange)`,
    '<!-- AVG_PRIORITY -->': `![Priority](https://img.shields.io/badge/Avg_Priority-${avgPriority}-yellow)`
  };
  
  for (const [placeholder, badge] of Object.entries(badges)) {
    readme = readme.replace(new RegExp(placeholder, 'g'), badge);
  }
  
  if (!CONFIG.dryRun) {
    await fs.writeFile(CONFIG.readmePath, readme);
    log.success('README badges updated');
  } else {
    log.info('[DRY RUN] Would update README badges');
  }
}

/**
 * Save data to JSON files
 */
async function saveData(agents, architectures) {
  log.info('Saving data to JSON files...');
  
  await fs.mkdir(CONFIG.outputDir, { recursive: true });
  
  const agentsPath = path.join(CONFIG.outputDir, 'agents.json');
  const archsPath = path.join(CONFIG.outputDir, 'architectures.json');
  const statsPath = path.join(CONFIG.outputDir, 'stats.json');
  
  const stats = {
    totalAgents: agents.length,
    totalArchitectures: architectures.length,
    agentsByStatus: countBy(agents, 'status'),
    agentsByCategory: countBy(agents, 'category'),
    architecturesByStatus: countBy(architectures, 'status'),
    architecturesByMaturity: countBy(architectures, 'maturity'),
    mcpEnabledAgents: agents.filter(a => a.mcpEnabled).length,
    lastSync: new Date().toISOString()
  };
  
  if (!CONFIG.dryRun) {
    await fs.writeFile(agentsPath, JSON.stringify(agents, null, 2));
    await fs.writeFile(archsPath, JSON.stringify(architectures, null, 2));
    await fs.writeFile(statsPath, JSON.stringify(stats, null, 2));
    log.success('Data saved to JSON files');
  } else {
    log.info('[DRY RUN] Would save data to JSON files');
  }
  
  return stats;
}

/**
 * Save generated documentation
 */
async function saveDocs(agents, architectures) {
  log.info('Generating and saving documentation...');
  
  const docsDir = './docs/generated';
  await fs.mkdir(docsDir, { recursive: true });
  
  const agentDocs = generateAgentDocs(agents);
  const archDocs = generateArchitectureDocs(architectures);
  
  if (!CONFIG.dryRun) {
    await fs.writeFile(path.join(docsDir, 'agents.md'), agentDocs);
    await fs.writeFile(path.join(docsDir, 'architectures.md'), archDocs);
    log.success('Documentation generated');
  } else {
    log.info('[DRY RUN] Would generate documentation');
  }
}

// Utility functions
function extractText(prop) {
  if (!prop) return '';
  if (prop.type === 'title' && prop.title.length > 0) {
    return prop.title[0].plain_text;
  }
  if (prop.type === 'rich_text' && prop.rich_text.length > 0) {
    return prop.rich_text.map(t => t.plain_text).join('');
  }
  return '';
}

function extractSelect(prop) {
  if (!prop || prop.type !== 'select' || !prop.select) return '';
  return prop.select.name;
}

function extractMultiSelect(prop) {
  if (!prop || prop.type !== 'multi_select') return [];
  return prop.multi_select.map(s => s.name);
}

function extractCheckbox(prop) {
  if (!prop || prop.type !== 'checkbox') return false;
  return prop.checkbox;
}

function extractNumber(prop) {
  if (!prop || prop.type !== 'number') return null;
  return prop.number;
}

function getStatusEmoji(status) {
  const emojis = {
    'Active': '🟢',
    'Production': '🟢',
    'Beta': '🟡',
    'Alpha': '🟡',
    'Development': '🔵',
    'Planned': '⚪',
    'Deprecated': '🔴',
    'Archived': '⚫'
  };
  return emojis[status] || '⚪';
}

function getMaturityEmoji(maturity) {
  const emojis = {
    'High': '🌟',
    'Medium': '🌙',
    'Low': '⭐',
    'Experimental': '🔬'
  };
  return emojis[maturity] || '❓';
}

function countBy(array, key) {
  return array.reduce((acc, item) => {
    const value = item[key] || 'Unknown';
    acc[value] = (acc[value] || 0) + 1;
    return acc;
  }, {});
}

/**
 * Main synchronization function
 */
async function main() {
  try {
    log.info('Starting Notion → GitHub synchronization...');
    
    if (CONFIG.dryRun) {
      log.warn('Running in DRY RUN mode - no changes will be made');
    }
    
    // Validate environment
    if (!CONFIG.notionApiKey) {
      throw new Error('NOTION_API_KEY environment variable is required');
    }
    
    // Fetch data from Notion
    const agents = await fetchAgents();
    const architectures = await fetchArchitectures();
    
    // Save data
    const stats = await saveData(agents, architectures);
    
    // Generate documentation
    await saveDocs(agents, architectures);
    
    // Update README
    await updateReadmeBadges(agents, architectures);
    
    // Print summary
    log.success('\n=== Synchronization Complete ===');
    log.info(`Total Agents: ${stats.totalAgents}`);
    log.info(`Total Architectures: ${stats.totalArchitectures}`);
    log.info(`MCP-Enabled Agents: ${stats.mcpEnabledAgents}`);
    log.info(`Last Sync: ${stats.lastSync}`);
    
    if (CONFIG.dryRun) {
      log.warn('\nDRY RUN mode - no actual changes were made');
    }
    
  } catch (error) {
    log.error(`Synchronization failed: ${error.message}`);
    if (CONFIG.verbose) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { fetchAgents, fetchArchitectures, generateAgentDocs, generateArchitectureDocs };