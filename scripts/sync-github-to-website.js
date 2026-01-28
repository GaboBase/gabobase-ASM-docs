/**
 * GitHub to Website Sync Script
 * 
 * Sincroniza contenido de GitHub hacia el sitio web vía API
 */

const { Octokit } = require('@octokit/rest');
const fetch = require('node-fetch');
const yaml = require('js-yaml');
const path = require('path');

// Configuración
const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

const config = {
  githubRepo: process.env.GITHUB_REPO,
  commitSha: process.env.COMMIT_SHA,
  eventType: process.env.EVENT_TYPE,
  websiteApiUrl: process.env.WEBSITE_API_URL,
  websiteApiKey: process.env.WEBSITE_API_KEY
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
      raw_url: file.raw_url
    }));
  } catch (error) {
    console.error('❌ Error obteniendo archivos modificados:', error.message);
    return [];
  }
}

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
        'X-Source': 'github-sync',
        'X-Commit-SHA': config.commitSha
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
 * Sincroniza agentes al website
 */
async function syncAgentsToWebsite(files) {
  const agentFiles = files.filter(f => 
    f.filename.startsWith('agents/') && f.filename.endsWith('.yaml')
  );

  console.log(`🤖 Sincronizando ${agentFiles.length} agentes al website...`);

  for (const file of agentFiles) {
    try {
      const agentId = path.basename(file.filename, '.yaml');

      if (file.status === 'removed') {
        console.log(`🗑️  Eliminando agente: ${agentId}`);
        await sendToWebsiteAPI(`/api/agents/${agentId}`, 'DELETE', {});
      } else {
        const content = await getFileContent(file.filename);
        const agentData = yaml.load(content);
        
        console.log(`✨ Actualizando agente: ${agentId}`);
        await sendToWebsiteAPI('/api/agents', 'POST', {
          id: agentId,
          ...agentData,
          github_path: file.filename,
          last_sync: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error(`❌ Error sincronizando ${file.filename}:`, error.message);
    }
  }
}

/**
 * Sincroniza arquitecturas al website
 */
async function syncArchitecturesToWebsite(files) {
  const archFiles = files.filter(f => 
    f.filename.startsWith('architectures/') && f.filename.endsWith('.md')
  );

  console.log(`🏛️ Sincronizando ${archFiles.length} arquitecturas al website...`);

  for (const file of archFiles) {
    try {
      const archId = path.basename(file.filename, '.md');

      if (file.status === 'removed') {
        console.log(`🗑️  Eliminando arquitectura: ${archId}`);
        await sendToWebsiteAPI(`/api/architectures/${archId}`, 'DELETE', {});
      } else {
        const content = await getFileContent(file.filename);
        
        console.log(`✨ Actualizando arquitectura: ${archId}`);
        await sendToWebsiteAPI('/api/architectures', 'POST', {
          id: archId,
          title: extractTitle(content),
          content: content,
          github_path: file.filename,
          last_sync: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error(`❌ Error sincronizando ${file.filename}:`, error.message);
    }
  }
}

/**
 * Sincroniza documentación al website
 */
async function syncDocsToWebsite(files) {
  const docFiles = files.filter(f => 
    f.filename.startsWith('docs/') && f.filename.endsWith('.md')
  );

  console.log(`📚 Sincronizando ${docFiles.length} documentos al website...`);

  for (const file of docFiles) {
    try {
      const docPath = file.filename;

      if (file.status === 'removed') {
        console.log(`🗑️  Eliminando documento: ${docPath}`);
        await sendToWebsiteAPI(`/api/docs`, 'DELETE', { path: docPath });
      } else {
        const content = await getFileContent(file.filename);
        
        console.log(`✨ Actualizando documento: ${docPath}`);
        await sendToWebsiteAPI('/api/docs', 'POST', {
          path: docPath,
          title: extractTitle(content),
          content: content,
          last_sync: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error(`❌ Error sincronizando ${file.filename}:`, error.message);
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
 * Extrae el título de un documento markdown
 */
function extractTitle(markdown) {
  const match = markdown.match(/^#\s+(.+)$/m);
  return match ? match[1] : 'Untitled';
}

/**
 * Sincroniza metadata del repositorio
 */
async function syncRepoMetadata() {
  const [owner, repo] = config.githubRepo.split('/');
  
  try {
    const { data: repository } = await octokit.repos.get({ owner, repo });
    const { data: commit } = await octokit.repos.getCommit({
      owner,
      repo,
      ref: config.commitSha
    });

    console.log('📋 Sincronizando metadata del repositorio...');
    await sendToWebsiteAPI('/api/metadata', 'POST', {
      repository: {
        name: repository.name,
        description: repository.description,
        url: repository.html_url,
        stars: repository.stargazers_count,
        forks: repository.forks_count,
        updated_at: repository.updated_at
      },
      last_commit: {
        sha: commit.sha,
        message: commit.commit.message,
        author: commit.commit.author.name,
        date: commit.commit.author.date,
        url: commit.html_url
      },
      sync_timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Error sincronizando metadata:', error.message);
  }
}

/**
 * Main
 */
async function main() {
  console.log('🚀 Iniciando sincronización GitHub → Website');
  console.log(`📋 Commit: ${config.commitSha}`);
  console.log(`🌐 Website API: ${config.websiteApiUrl}`);
  console.log(`📡 Event Type: ${config.eventType}\n`);

  // Sincronizar metadata del repo
  await syncRepoMetadata();

  // Obtener y sincronizar archivos modificados
  const modifiedFiles = await getModifiedFiles();
  console.log(`\n📄 ${modifiedFiles.length} archivos modificados detectados\n`);

  await syncAgentsToWebsite(modifiedFiles);
  await syncArchitecturesToWebsite(modifiedFiles);
  await syncDocsToWebsite(modifiedFiles);

  console.log('\n✅ Sincronización completada exitosamente');
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
  syncDocsToWebsite,
  syncRepoMetadata
};
