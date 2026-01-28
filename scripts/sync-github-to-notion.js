#!/usr/bin/env node

/**
 * GitHub to Notion Sync Script
 * Syncs repository changes to Notion databases
 */

const { Client } = require('@notionhq/client');
const { Octokit } = require('@octokit/rest');
const yaml = require('js-yaml');
const fs = require('fs');
const path = require('path');

// Configuration
const config = {
  notionApiKey: process.env.NOTION_API_KEY,
  githubToken: process.env.GITHUB_TOKEN,
  agentRegistryId: process.env.AGENT_REGISTRY_ID,
  architectureCatalogId: process.env.ARCHITECTURE_CATALOG_ID,
  githubRepo: process.env.GITHUB_REPO,
  commitSha: process.env.COMMIT_SHA,
  commitMessage: process.env.COMMIT_MESSAGE
};

// Validate required environment variables
function validateConfig() {
  const required = ['notionApiKey', 'githubToken', 'agentRegistryId', 'githubRepo'];
  const missing = required.filter(key => !config[key]);
  
  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:', missing.join(', '));
    process.exit(1);
  }
  
  console.log('✅ Configuration validated');
}

// Initialize clients
const notion = new Client({ auth: config.notionApiKey });
const octokit = new Octokit({ auth: config.githubToken });

const [owner, repo] = config.githubRepo.split('/');

// Rate limiting helper
class RateLimiter {
  constructor(maxRequests, timeWindow) {
    this.maxRequests = maxRequests;
    this.timeWindow = timeWindow;
    this.requests = [];
  }
  
  async waitIfNeeded() {
    const now = Date.now();
    this.requests = this.requests.filter(time => now - time < this.timeWindow);
    
    if (this.requests.length >= this.maxRequests) {
      const oldestRequest = this.requests[0];
      const waitTime = this.timeWindow - (now - oldestRequest);
      console.log(`⏳ Rate limit reached, waiting ${waitTime}ms`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
      this.requests.shift();
    }
    
    this.requests.push(now);
  }
}

const notionRateLimiter = new RateLimiter(3, 1000); // 3 requests per second

// Retry logic for API calls
async function retryWithBackoff(fn, maxRetries = 3, baseDelay = 1000) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      
      const delay = baseDelay * Math.pow(2, i);
      console.log(`⚠️  Retry ${i + 1}/${maxRetries} after ${delay}ms: ${error.message}`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

// Check if files changed are relevant
async function getChangedFiles() {
  try {
    const { data: commit } = await octokit.repos.getCommit({
      owner,
      repo,
      ref: config.commitSha
    });
    
    const relevantPaths = ['docs/', 'agents/', 'architectures/', 'contracts/'];
    const changedFiles = commit.files.filter(file => 
      relevantPaths.some(path => file.filename.startsWith(path)) ||
      file.filename.endsWith('.md')
    );
    
    console.log(`📄 Found ${changedFiles.length} relevant changed files`);
    return changedFiles;
  } catch (error) {
    console.error('❌ Error fetching changed files:', error.message);
    return [];
  }
}

// Early exit if no relevant changes
async function shouldSync() {
  const changedFiles = await getChangedFiles();
  
  if (changedFiles.length === 0) {
    console.log('ℹ️  No relevant files changed, skipping sync');
    return false;
  }
  
  // Skip if commit message contains [skip-notion]
  if (config.commitMessage && config.commitMessage.includes('[skip-notion]')) {
    console.log('ℹ️  Commit contains [skip-notion], skipping sync');
    return false;
  }
  
  return true;
}

// Sync agents to Notion
async function syncAgents(changedFiles) {
  const agentFiles = changedFiles.filter(f => f.filename.startsWith('agents/'));
  if (agentFiles.length === 0) return;
  
  console.log(`🤖 Syncing ${agentFiles.length} agent files...`);
  
  for (const file of agentFiles) {
    try {
      await notionRateLimiter.waitIfNeeded();
      
      // Parse agent file
      const { data: fileContent } = await octokit.repos.getContent({
        owner,
        repo,
        path: file.filename,
        ref: config.commitSha
      });
      
      const content = Buffer.from(fileContent.content, 'base64').toString('utf-8');
      const agent = yaml.load(content);
      
      // Search for existing page
      const searchResult = await retryWithBackoff(() => 
        notion.databases.query({
          database_id: config.agentRegistryId,
          filter: {
            property: 'Name',
            title: { equals: agent.name || path.basename(file.filename, '.yml') }
          }
        })
      );
      
      const pageData = {
        properties: {
          Name: { title: [{ text: { content: agent.name || path.basename(file.filename, '.yml') } }] },
          Type: { select: { name: agent.type || 'Unknown' } },
          Status: { select: { name: 'Active' } },
          'GitHub Path': { url: `https://github.com/${config.githubRepo}/blob/main/${file.filename}` }
        }
      };
      
      if (searchResult.results.length > 0) {
        // Update existing
        await retryWithBackoff(() => 
          notion.pages.update({
            page_id: searchResult.results[0].id,
            ...pageData
          })
        );
        console.log(`  ✅ Updated: ${agent.name}`);
      } else {
        // Create new
        await retryWithBackoff(() => 
          notion.pages.create({
            parent: { database_id: config.agentRegistryId },
            ...pageData
          })
        );
        console.log(`  ✅ Created: ${agent.name}`);
      }
    } catch (error) {
      console.error(`  ❌ Error syncing ${file.filename}:`, error.message);
      // Continue with other files instead of failing completely
    }
  }
}

// Main sync function
async function main() {
  console.log('🚀 Starting GitHub to Notion sync...');
  console.log(`📦 Repository: ${config.githubRepo}`);
  console.log(`📝 Commit: ${config.commitSha}`);
  
  validateConfig();
  
  const shouldProceed = await shouldSync();
  if (!shouldProceed) {
    console.log('✅ Sync completed (no changes needed)');
    process.exit(0);
  }
  
  const changedFiles = await getChangedFiles();
  
  try {
    await syncAgents(changedFiles);
    // Add more sync functions here (syncArchitectures, syncDocs, etc.)
    
    console.log('\n✅ Sync completed successfully');
  } catch (error) {
    console.error('\n❌ Sync failed:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = { main };
