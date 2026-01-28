/**
 * Notion to Website Sync Script
 * 
 * Sincroniza contenido de Notion hacia el sitio web vía API
 */

const { Client } = require('@notionhq/client');
const fetch = require('node-fetch');

// Configuración
const notion = new Client({ auth: process.env.NOTION_API_KEY });

const config = {
  notionPageId: process.env.NOTION_PAGE_ID,
  notionDatabaseId: process.env.NOTION_DATABASE_ID,
  webhookAction: process.env.WEBHOOK_ACTION,
  websiteApiUrl: process.env.WEBSITE_API_URL,
  websiteApiKey: process.env.WEBSITE_API_KEY,
  databases: {
    agents: process.env.AGENT_REGISTRY_ID,
    architectures: process.env.ARCHITECTURE_CATALOG_ID
  }
};

/**
 * Envía request a la API del website
 */
async function sendToWebsiteAPI(endpoint, method, data) {
  const url = `${config.websiteApiUrl}${endpoint}`;
  
  try {
    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.websiteApiKey}`,
        'X-Source': 'notion-sync'
      },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`API error: ${response.status} - ${error}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`❌ Error en ${endpoint}:`, error.message);
    throw error;
  }
}

/**
 * Obtiene todas las páginas de una database de Notion
 */
async function getAllDatabasePages(databaseId) {
  let results = [];
  let hasMore = true;
  let startCursor = undefined;

  while (hasMore) {
    const response = await notion.databases.query({
      database_id: databaseId,
      start_cursor: startCursor
    });

    results = results.concat(response.results);
    hasMore = response.has_more;
    startCursor = response.next_cursor;
  }

  return results;
}

/**
 * Extrae propiedades de una página de Notion
 */
function extractPageProperties(page) {
  const properties = {};

  for (const [key, value] of Object.entries(page.properties)) {
    switch (value.type) {
      case 'title':
        properties[key] = value.title[0]?.plain_text || '';
        break;
      case 'rich_text':
        properties[key] = value.rich_text[0]?.plain_text || '';
        break;
      case 'select':
        properties[key] = value.select?.name || null;
        break;
      case 'multi_select':
        properties[key] = value.multi_select.map(s => s.name);
        break;
      case 'date':
        properties[key] = value.date?.start || null;
        break;
      case 'checkbox':
        properties[key] = value.checkbox;
        break;
      case 'url':
        properties[key] = value.url;
        break;
      case 'email':
        properties[key] = value.email;
        break;
      case 'phone_number':
        properties[key] = value.phone_number;
        break;
      case 'number':
        properties[key] = value.number;
        break;
      default:
        properties[key] = null;
    }
  }

  return properties;
}

/**
 * Obtiene contenido de una página (bloques)
 */
async function getPageContent(pageId) {
  const blocks = [];
  let hasMore = true;
  let startCursor = undefined;

  while (hasMore) {
    const response = await notion.blocks.children.list({
      block_id: pageId,
      start_cursor: startCursor
    });

    blocks.push(...response.results);
    hasMore = response.has_more;
    startCursor = response.next_cursor;
  }

  return convertBlocksToMarkdown(blocks);
}

/**
 * Convierte bloques de Notion a Markdown
 */
function convertBlocksToMarkdown(blocks) {
  let markdown = '';

  for (const block of blocks) {
    switch (block.type) {
      case 'heading_1':
        markdown += `# ${block.heading_1.rich_text[0]?.plain_text || ''}\n\n`;
        break;
      case 'heading_2':
        markdown += `## ${block.heading_2.rich_text[0]?.plain_text || ''}\n\n`;
        break;
      case 'heading_3':
        markdown += `### ${block.heading_3.rich_text[0]?.plain_text || ''}\n\n`;
        break;
      case 'paragraph':
        markdown += `${block.paragraph.rich_text[0]?.plain_text || ''}\n\n`;
        break;
      case 'bulleted_list_item':
        markdown += `- ${block.bulleted_list_item.rich_text[0]?.plain_text || ''}\n`;
        break;
      case 'numbered_list_item':
        markdown += `1. ${block.numbered_list_item.rich_text[0]?.plain_text || ''}\n`;
        break;
      case 'code':
        const language = block.code.language || '';
        const code = block.code.rich_text[0]?.plain_text || '';
        markdown += `\`\`\`${language}\n${code}\n\`\`\`\n\n`;
        break;
      case 'quote':
        markdown += `> ${block.quote.rich_text[0]?.plain_text || ''}\n\n`;
        break;
    }
  }

  return markdown;
}

/**
 * Sincroniza agentes de Notion al website
 */
async function syncAgentsToWebsite() {
  console.log('🤖 Sincronizando agentes de Notion al website...');

  const pages = await getAllDatabasePages(config.databases.agents);
  console.log(`📊 Encontradas ${pages.length} páginas de agentes`);

  let synced = 0;
  let errors = 0;

  for (const page of pages) {
    try {
      if (page.archived) {
        console.log(`⏭️  Saltando agente archivado: ${page.id}`);
        continue;
      }

      const properties = extractPageProperties(page);
      const content = await getPageContent(page.id);

      await sendToWebsiteAPI('/api/agents', 'POST', {
        id: page.id,
        notion_url: page.url,
        ...properties,
        content: content,
        last_sync: new Date().toISOString()
      });

      console.log(`✅ Sincronizado: ${properties.Name || page.id}`);
      synced++;
    } catch (error) {
      console.error(`❌ Error en página ${page.id}:`, error.message);
      errors++;
    }
  }

  console.log(`\n📊 Resumen: ${synced} sincronizados, ${errors} errores\n`);
}

/**
 * Sincroniza arquitecturas de Notion al website
 */
async function syncArchitecturesToWebsite() {
  console.log('🏛️ Sincronizando arquitecturas de Notion al website...');

  const pages = await getAllDatabasePages(config.databases.architectures);
  console.log(`📊 Encontradas ${pages.length} páginas de arquitecturas`);

  let synced = 0;
  let errors = 0;

  for (const page of pages) {
    try {
      if (page.archived) {
        console.log(`⏭️  Saltando arquitectura archivada: ${page.id}`);
        continue;
      }

      const properties = extractPageProperties(page);
      const content = await getPageContent(page.id);

      await sendToWebsiteAPI('/api/architectures', 'POST', {
        id: page.id,
        notion_url: page.url,
        ...properties,
        content: content,
        last_sync: new Date().toISOString()
      });

      console.log(`✅ Sincronizado: ${properties.Name || page.id}`);
      synced++;
    } catch (error) {
      console.error(`❌ Error en página ${page.id}:`, error.message);
      errors++;
    }
  }

  console.log(`\n📊 Resumen: ${synced} sincronizados, ${errors} errores\n`);
}

/**
 * Sincroniza una página específica (cuando viene de webhook)
 */
async function syncSpecificPage() {
  if (!config.notionPageId) {
    console.log('⚠️  No se especificó page_id, sincronizando todas las databases...');
    return false;
  }

  console.log(`📄 Sincronizando página específica: ${config.notionPageId}`);

  try {
    const page = await notion.pages.retrieve({ page_id: config.notionPageId });
    const properties = extractPageProperties(page);
    const content = await getPageContent(page.id);

    // Determinar el tipo basado en la database padre
    const parentDbId = page.parent.database_id;
    let endpoint = '/api/pages';

    if (parentDbId === config.databases.agents) {
      endpoint = '/api/agents';
      console.log('🤖 Tipo detectado: Agente');
    } else if (parentDbId === config.databases.architectures) {
      endpoint = '/api/architectures';
      console.log('🏛️ Tipo detectado: Arquitectura');
    }

    if (page.archived) {
      console.log(`🗑️  Página archivada, eliminando del website...`);
      await sendToWebsiteAPI(`${endpoint}/${page.id}`, 'DELETE', {});
    } else {
      await sendToWebsiteAPI(endpoint, 'POST', {
        id: page.id,
        notion_url: page.url,
        ...properties,
        content: content,
        last_sync: new Date().toISOString()
      });
    }

    console.log(`✅ Página sincronizada exitosamente`);
    return true;
  } catch (error) {
    console.error(`❌ Error sincronizando página:`, error.message);
    return false;
  }
}

/**
 * Main
 */
async function main() {
  console.log('🚀 Iniciando sincronización Notion → Website');
  console.log(`🌐 Website API: ${config.websiteApiUrl}`);
  console.log(`🔔 Webhook Action: ${config.webhookAction || 'N/A'}\n`);

  // Si viene de webhook con page_id específico, sincronizar solo esa página
  const syncedSpecific = await syncSpecificPage();

  // Si no se sincronizó página específica, sincronizar todas las databases
  if (!syncedSpecific) {
    await syncAgentsToWebsite();
    await syncArchitecturesToWebsite();
  }

  console.log('✅ Sincronización completada exitosamente');
  console.log(`🔗 Verifica cambios en: ${config.websiteApiUrl}`);
}

// Ejecutar
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Error fatal:', error);
    process.exit(1);
  });
}

module.exports = { 
  syncAgentsToWebsite,
  syncArchitecturesToWebsite,
  syncSpecificPage,
  getPageContent,
  extractPageProperties
};
