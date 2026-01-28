# Event-Driven Synchronization Architecture

## Descripción General

Este sistema implementa sincronización automática basada en eventos entre GitHub, Notion y el sitio web. En lugar de ejecutarse en intervalos de tiempo fijos, las sincronizaciones se disparan cuando ocurren cambios reales en cualquiera de las plataformas.

## Flujos de Sincronización

### 1. GitHub → Notion
**Trigger:** Push events a la rama `main`
**Archivos monitoreados:**
- `docs/**`
- `agents/**`
- `architectures/**`
- `contracts/**`
- `*.md`

**Proceso:**
1. Se detecta un push en GitHub
2. Workflow `sync-github-to-notion.yml` se activa automáticamente
3. Script `sync-github-to-notion.js` extrae cambios del commit
4. Actualiza las bases de datos de Notion correspondientes

### 2. GitHub → Website
**Triggers:**
- Push events a la rama `main`
- Publicación de releases

**Archivos monitoreados:**
- `docs/**`
- `agents/**`
- `architectures/**`
- `public/**`
- `*.md`

**Proceso:**
1. Se detecta cambio en GitHub (push o release)
2. Workflow `sync-github-to-website.yml` se ejecuta
3. Script `sync-github-to-website.js` procesa los cambios
4. Envía actualizaciones vía API al sitio web

### 3. Notion → Website
**Trigger:** Webhooks de Notion

**Proceso:**
1. Usuario edita contenido en Notion
2. Webhook de Notion envía notificación a endpoint intermedio
3. Endpoint dispara `repository_dispatch` event en GitHub
4. Workflow `sync-notion-to-website.yml` se activa
5. Script `sync-notion-to-website.js` obtiene cambios de Notion
6. Actualiza sitio web vía API

### 4. Notion → GitHub
**Trigger:** Webhooks de Notion + `repository_dispatch`

**Proceso:**
1. Webhook de Notion detecta cambios en bases de datos monitoreadas
2. Endpoint intermedio valida y transforma el payload
3. Dispara evento `repository_dispatch` tipo `notion-webhook`
4. Workflow existente `sync-notion.yml` se ejecuta
5. Commits automáticos actualizan el repositorio

## Configuración de Webhooks

### Webhook de Notion
Como Notion no soporta webhooks nativos, necesitas un servicio intermedio:

**Opciones:**
1. **Zapier/Make.com:** Monitorea cambios en Notion y dispara GitHub Actions
2. **Servicio custom:** Deploy un endpoint que:
   - Polea Notion API cada minuto
   - Detecta cambios desde última verificación
   - Envía `repository_dispatch` a GitHub

**Endpoint GitHub para disparar workflows:**
```bash
curl -X POST \
  https://api.github.com/repos/GaboBase/gabobase-ASM-docs/dispatches \
  -H "Accept: application/vnd.github+json" \
  -H "Authorization: Bearer $GH_PAT" \
  -d '{
    "event_type": "notion-webhook",
    "client_payload": {
      "page_id": "notion-page-id",
      "database_id": "database-id",
      "action": "updated"
    }
  }'
```

### Website → GitHub
Configura webhooks en tu sitio web para notificar cambios:

```javascript
// En tu website backend
fetch('https://api.github.com/repos/GaboBase/gabobase-ASM-docs/dispatches', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${GITHUB_TOKEN}`,
    'Accept': 'application/vnd.github+json'
  },
  body: JSON.stringify({
    event_type: 'website-update',
    client_payload: {
      resource: 'agent',
      id: 'agent-123',
      action: 'created'
    }
  })
});
```

## Variables de Entorno Requeridas

```bash
# GitHub Secrets necesarios
GH_PAT                    # GitHub Personal Access Token
NOTION_API_KEY           # Notion Integration Token
WEBSITE_API_KEY          # API key de tu website
WEBSITE_API_URL          # URL base de la API del website
AGENT_REGISTRY_DB_ID     # ID de database de Notion para agentes
ARCHITECTURE_CATALOG_DB_ID # ID de database de Notion para arquitecturas
```

## Ventajas del Sistema Event-Driven

1. **Sincronización instantánea:** Cambios se propagan inmediatamente
2. **Eficiencia de recursos:** No hay ejecuciones innecesarias en intervalos fijos
3. **Trazabilidad:** Cada sincronización está vinculada a un evento específico
4. **Escalabilidad:** Se adapta automáticamente al volumen de cambios
5. **Contexto enriquecido:** Metadatos del evento (commit SHA, autor, archivos modificados) están disponibles

## Monitoreo y Debugging

### Ver ejecuciones de workflows
```bash
gh run list --repo GaboBase/gabobase-ASM-docs
```

### Disparar manualmente un sync
```bash
gh workflow run sync-github-to-notion.yml --repo GaboBase/gabobase-ASM-docs
```

### Logs de sincronización
Cada workflow genera un summary en GitHub Actions con:
- Tipo de trigger
- Metadata del evento
- Archivos/recursos sincronizados
- Timestamp de ejecución

## Próximos Pasos

1. Implementar scripts de sincronización en `scripts/`
2. Configurar servicio intermedio para webhooks de Notion
3. Implementar endpoints de webhook en el website
4. Añadir manejo de conflictos para actualizaciones simultáneas
5. Implementar sistema de retry para fallos de sincronización
