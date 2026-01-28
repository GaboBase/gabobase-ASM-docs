/**
 * GitHub to Notion Sync Script
 * 
 * Sincroniza cambios de GitHub (commits, archivos) hacia Notion
 */

const { Client } = require('@notionhq/client');
const { Octokit } = require('@octokit/rest');
const yaml = require('js-yaml');
const fs = require('fs').promises;
const path = require('path');

// Configuración
const notion = new Client({ auth: process.env.NOTION_API_KEY });
const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

const config = {
  githubRepo: process.env.GITHUB_REPO,
  commitSha: process.env.COMMIT_SHA,
  commitMessage: process.env.COMMIT_MESSAGE,
  databases: {
    agents: process.env.AGENT_REGISTRY_ID,
    architectures: process.env.ARCHITECTURE_CATALOG_ID
  }
};

/**
 * Obtiene archivos modificados en el commit
 */
async function getModifiedFiles() {
  const [owner, repo] = config.githubRepo.split('/');
  
  try {
    const { data: commit } = await octokit.repos.getCommit({
      owner,
      repo,
      ref: config.commitSha
    });

    return commit.files.map(file => ({
      filename: file.filename,
      status: file.status,
      additions: file.additions,
      deletions: file.deletions,
      patch: file.patch
    }));
  } catch (error) {
    console.error('❌ Error obteniendo archivos modificados:', error.message);
    return [];
  }
}

/**
 * Procesa archivos YAML de agentes
 */
async function syncAgentFiles(files) {
  const agentFiles = files.filter(f => 
    f.filename.startsWith('agents/') && f.filename.endsWith('.yaml')
  );

  console.log(`🤖 Sincronizando ${agentFiles.length} archivos de agentes...`);

  for (const file of agentFiles) {
    try {
      if (file.status === 'removed') {
        await deleteAgentFromNotion(file.filename);
      } else {
        const content = await getFileContent(file.filename);
        const agentData = yaml.load(content);
        await upsertAgentToNotion(agentData, file.filename);
      }
    } catch (error) {
      console.error(`❌ Error procesando ${file.filename}:`, error.message);
    }
  }
}

/**
 * Procesa archivos de arquitecturas
 */
async function syncArchitectureFiles(files) {
  const archFiles = files.filter(f => 
    f.filename.startsWith('architectures/') && f.filename.endsWith('.md')
  );

  console.log(`🏛️ Sincronizando ${archFiles.length} archivos de arquitecturas...`);

  for (const file of archFiles) {
    try {
      if (file.status === 'removed') {
        await deleteArchitectureFromNotion(file.filename);
      } else {
        const content = await getFileContent(file.filename);
        await upsertArchitectureToNotion(content, file.filename);
      }
    } catch (error) {
      console.error(`❌ Error procesando ${file.filename}:`, error.message);
    }
  }
}

/**
 * Obtiene contenido de archivo desde GitHub
 */
async function getFileContent(filepath) {
  const [owner, repo] = config.githubRepo.split('/');
  
  try {
    const { data } = await octokit.repos.getContent({
      owner,
      repo,
      path: filepath,
      ref: config.commitSha
    });

    return Buffer.from(data.content, 'base64').toString('utf-8');
  } catch (error) {
    console.error(`❌ Error obteniendo ${filepath}:`, error.message);
    throw error;
  }
}

/**
 * Crea o actualiza agente en Notion
 */
async function upsertAgentToNotion(agentData, filepath) {
  const agentName = agentData.metadata?.name || path.basename(filepath, '.yaml');
  
  // Buscar si ya existe
  const existing = await findNotionPageByTitle(config.databases.agents, agentName);

  const properties = {
    'Name': {
      title: [
        {
          text: {
            content: agentName
          }
        }
      ]
    },
    'Type': {
      select: {
        name: agentData.metadata?.type || 'generic'
      }
    },
    'Status': {
      select: {
        name: agentData.metadata?.status || 'active'
      }
    },
    'GitHub Path': {
      rich_text: [
        {
          text: {
            content: filepath
          }
        }
      ]
    },
    'Last Sync': {
      date: {
        start: new Date().toISOString()
      }
    }
  };

  if (existing) {
    console.log(`♻️  Actualizando agente: ${agentName}`);
    await notion.pages.update({
      page_id: existing.id,
      properties
    });
  } else {
    console.log(`✨ Creando agente: ${agentName}`);
    await notion.pages.create({
      parent: { database_id: config.databases.agents },
      properties
    });
  }
}

/**
 * Crea o actualiza arquitectura en Notion
 */
async function upsertArchitectureToNotion(content, filepath) {
  const archName = path.basename(filepath, '.md');
  
  const existing = await findNotionPageByTitle(config.databases.architectures, archName);

  const properties = {
    'Name': {
      title: [
        {
          text: {
            content: archName
          }
        }
      ]
    },
    'GitHub Path': {
      rich_text: [
        {
          text: {
            content: filepath
          }
        }
      ]
    },
    'Last Sync': {
      date: {
        start: new Date().toISOString()
      }
    }
  };

  // Convertir markdown a bloques de Notion
  const children = convertMarkdownToNotionBlocks(content);

  if (existing) {
    console.log(`♻️  Actualizando arquitectura: ${archName}`);
    await notion.pages.update({
      page_id: existing.id,
      properties
    });
    // Nota: Para actualizar contenido, necesitarías borrar y recrear bloques
  } else {
    console.log(`✨ Creando arquitectura: ${archName}`);
    await notion.pages.create({
      parent: { database_id: config.databases.architectures },
      properties,
      children: children.slice(0, 100) // Notion API limit
    });
  }
}

/**
 * Busca página en Notion por título
 */
async function findNotionPageByTitle(databaseId, title) {
  const response = await notion.databases.query({
    database_id: databaseId,
    filter: {
      property: 'Name',
      title: {
        equals: title
      }
    }
  });

  return response.results[0] || null;
}

/**
 * Convierte Markdown simple a bloques de Notion
 */
function convertMarkdownToNotionBlocks(markdown) {
  const lines = markdown.split('\n');
  const blocks = [];

  for (const line of lines) {
    if (line.startsWith('# ')) {
      blocks.push({
        object: 'block',
        type: 'heading_1',
        heading_1: {
          rich_text: [{ text: { content: line.substring(2) } }]
        }
      });
    } else if (line.startsWith('## ')) {
      blocks.push({
        object: 'block',
        type: 'heading_2',
        heading_2: {
          rich_text: [{ text: { content: line.substring(3) } }]
        }
      });
    } else if (line.trim()) {
      blocks.push({
        object: 'block',
        type: 'paragraph',
        paragraph: {
          rich_text: [{ text: { content: line } }]
        }
      });
    }
  }

  return blocks;
}

/**
 * Elimina agente de Notion
 */
async function deleteAgentFromNotion(filepath) {
  const agentName = path.basename(filepath, '.yaml');
  const existing = await findNotionPageByTitle(config.databases.agents, agentName);
  
  if (existing) {
    console.log(`🗑️  Archivando agente: ${agentName}`);
    await notion.pages.update({
      page_id: existing.id,
      archived: true
    });
  }
}

/**
 * Elimina arquitectura de Notion
 */
async function deleteArchitectureFromNotion(filepath) {
  const archName = path.basename(filepath, '.md');
  const existing = await findNotionPageByTitle(config.databases.architectures, archName);
  
  if (existing) {
    console.log(`🗑️  Archivando arquitectura: ${archName}`);
    await notion.pages.update({
      page_id: existing.id,
      archived: true
    });
  }
}

/**
 * Main
 */
async function main() {
  console.log('🚀 Iniciando sincronización GitHub → Notion');
  console.log(`📋 Commit: ${config.commitSha}`);
  console.log(`💬 Mensaje: ${config.commitMessage}\n`);

  const modifiedFiles = await getModifiedFiles();
  console.log(`📄 ${modifiedFiles.length} archivos modificados detectados\n`);

  await syncAgentFiles(modifiedFiles);
  await syncArchitectureFiles(modifiedFiles);

  console.log('\n✅ Sincronización completada exitosamente');
}

// Ejecutar
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Error fatal:', error);
    process.exit(1);
  });
}

module.exports = { 
  syncAgentFiles, 
  syncArchitectureFiles,
  upsertAgentToNotion,
  upsertArchitectureToNotion
};
