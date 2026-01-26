#!/usr/bin/env node

/**
 * Notion Webhook Server
 * Receives webhooks from Notion and triggers GitHub Actions
 */

const express = require('express');
const crypto = require('crypto');
const { Octokit } = require('@octokit/rest');

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const NOTION_WEBHOOK_SECRET = process.env.NOTION_WEBHOOK_SECRET;
const GITHUB_OWNER = 'GaboBase';
const GITHUB_REPO = 'gabobase-ASM-docs';

const octokit = new Octokit({ auth: GITHUB_TOKEN });

// Verify Notion webhook signature
function verifySignature(req) {
  const signature = req.headers['notion-webhook-signature'];
  const timestamp = req.headers['notion-webhook-timestamp'];
  const body = JSON.stringify(req.body);
  
  const hmac = crypto.createHmac('sha256', NOTION_WEBHOOK_SECRET);
  hmac.update(`${timestamp}.${body}`);
  const expectedSignature = hmac.digest('hex');
  
  return signature === expectedSignature;
}

// Webhook endpoint
app.post('/webhook/notion', async (req, res) => {
  console.log('📨 Received webhook from Notion');
  
  // Verify signature
  if (!verifySignature(req)) {
    console.error('❌ Invalid signature');
    return res.status(401).json({ error: 'Invalid signature' });
  }
  
  const { event_type, page_id, database_id, changes } = req.body;
  
  console.log(`Event: ${event_type}`);
  console.log(`Page ID: ${page_id}`);
  console.log(`Database ID: ${database_id}`);
  
  try {
    // Trigger GitHub Action for sync
    await octokit.rest.repos.createDispatchEvent({
      owner: GITHUB_OWNER,
      repo: GITHUB_REPO,
      event_type: 'notion-webhook',
      client_payload: {
        event_type,
        page_id,
        database_id,
        changes,
        timestamp: new Date().toISOString()
      }
    });
    
    console.log('✅ GitHub Action triggered');
    
    res.json({ 
      success: true, 
      message: 'Sync triggered',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Error triggering sync:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    service: 'notion-webhook-server'
  });
});

// Metrics endpoint
app.get('/metrics', (req, res) => {
  res.json({
    webhooks_received: global.webhookCount || 0,
    last_webhook: global.lastWebhook || null,
    uptime: process.uptime()
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Notion Webhook Server running on port ${PORT}`);
  console.log(`📍 Webhook endpoint: http://localhost:${PORT}/webhook/notion`);
});