/**
 * Notion Webhook Bridge Service
 * 
 * Este servicio actúa como puente entre Notion y GitHub Actions.
 * Monitorea cambios en Notion mediante polling y dispara workflows de GitHub.
 * 
 * Deploy en: Vercel, Cloudflare Workers, AWS Lambda, o cualquier Node.js runtime
 */

const { Client } = require('@notionhq/client');
const fetch = require('node-fetch');

// Configuración
const config = {
  notionApiKey: process.env.NOTION_API_KEY,
  githubToken: process.env.GITHUB_TOKEN,
  githubRepo: 'GaboBase/gabobase-ASM-docs',
  pollInterval: 60000, // 1 minuto
  databases: {
    agents: process.env.AGENT_REGISTRY_DB_ID,
    architectures: process.env.ARCHITECTURE_CATALOG_DB_ID
  }
};

const notion = new Client({ auth: config.notionApiKey });

// Estado para tracking de cambios
let lastChecked = {};

/**
 * Verifica cambios en una database de Notion
 */
async function checkDatabaseChanges(databaseId, databaseName) {
  try {
    const response = await notion.databases.query({
      database_id: databaseId,
      filter: {
        timestamp: 'last_edited_time',
        last_edited_time: {
          after: lastChecked[databaseId] || new Date(Date.now() - 3600000).toISOString()
        }
      },
      sorts: [
        {
          timestamp: 'last_edited_time',
          direction: 'descending'
        }
      ]
    });

    if (response.results.length > 0) {
      console.log(`✨ ${response.results.length} cambios detectados en ${databaseName}`);
      
      for (const page of response.results) {
        await triggerGitHubWorkflow({
          database_id: databaseId,
          database_name: databaseName,
          page_id: page.id,
          page_url: page.url,
          last_edited_time: page.last_edited_time,
          last_edited_by: page.last_edited_by.id,
          action: 'updated'
        });
      }
      
      lastChecked[databaseId] = new Date().toISOString();
    }
  } catch (error) {
    console.error(`❌ Error checking ${databaseName}:`, error.message);
  }
}

/**
 * Dispara workflow de GitHub vía repository_dispatch
 */
async function triggerGitHubWorkflow(payload) {
  try {
    const response = await fetch(
      `https://api.github.com/repos/${config.githubRepo}/dispatches`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${config.githubToken}`,
          'Accept': 'application/vnd.github+json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          event_type: 'notion-webhook',
          client_payload: payload
        })
      }
    );

    if (response.ok) {
      console.log(`✅ Workflow disparado para página: ${payload.page_id}`);
    } else {
      const error = await response.text();
      console.error(`❌ Error al disparar workflow: ${error}`);
    }
  } catch (error) {
    console.error(`❌ Error en triggerGitHubWorkflow:`, error.message);
  }
}

/**
 * Loop principal de polling
 */
async function startPolling() {
  console.log('🚀 Notion Webhook Bridge iniciado');
  console.log(`📊 Monitoreando ${Object.keys(config.databases).length} databases`);
  console.log(`⏱️  Intervalo de polling: ${config.pollInterval / 1000}s\n`);

  // Inicializar timestamps
  for (const dbId of Object.values(config.databases)) {
    lastChecked[dbId] = new Date(Date.now() - config.pollInterval).toISOString();
  }

  setInterval(async () => {
    const timestamp = new Date().toISOString();
    console.log(`\n🔍 Polling iniciado: ${timestamp}`);

    for (const [name, dbId] of Object.entries(config.databases)) {
      await checkDatabaseChanges(dbId, name);
    }
  }, config.pollInterval);
}

/**
 * Endpoint HTTP para webhook manual (opcional)
 */
function createWebhookEndpoint() {
  const express = require('express');
  const app = express();
  
  app.use(express.json());

  app.post('/webhook/notion', async (req, res) => {
    const { page_id, database_id, action = 'manual' } = req.body;

    if (!page_id) {
      return res.status(400).json({ error: 'page_id requerido' });
    }

    try {
      // Obtener metadata de la página
      const page = await notion.pages.retrieve({ page_id });
      
      await triggerGitHubWorkflow({
        database_id: database_id || page.parent.database_id,
        page_id: page_id,
        page_url: page.url,
        last_edited_time: page.last_edited_time,
        action: action
      });

      res.json({ 
        success: true, 
        message: 'Workflow disparado exitosamente',
        page_id 
      });
    } catch (error) {
      console.error('Error en webhook endpoint:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/health', (req, res) => {
    res.json({ 
      status: 'healthy',
      databases: Object.keys(config.databases).length,
      lastChecked: lastChecked
    });
  });

  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`🌐 Webhook endpoint listening on port ${PORT}`);
  });
}

// Iniciar servicio
if (require.main === module) {
  // Validar configuración
  if (!config.notionApiKey || !config.githubToken) {
    console.error('❌ Variables de entorno faltantes');
    console.error('Requeridas: NOTION_API_KEY, GITHUB_TOKEN');
    process.exit(1);
  }

  startPolling();
  
  // Opcionalmente, iniciar endpoint HTTP
  if (process.env.ENABLE_HTTP_ENDPOINT === 'true') {
    createWebhookEndpoint();
  }
}

module.exports = { 
  checkDatabaseChanges, 
  triggerGitHubWorkflow,
  startPolling
};
