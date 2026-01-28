# Deployment Guide - Notion Webhook Bridge

## Descripción

Esta guía explica cómo deployar el servicio `notion-webhook-bridge.js` que actúa como puente entre Notion y GitHub Actions, permitiendo sincronización event-driven.

## Opciones de Deployment

### Opción 1: Vercel (Recomendado)

**Ventajas:**
- Deploy gratuito
- Serverless functions
- Auto-scaling
- Fácil configuración

**Pasos:**

1. **Crear archivo `vercel.json`:**

```json
{
  "version": 2,
  "builds": [
    {
      "src": "scripts/notion-webhook-bridge.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/webhook/notion",
      "dest": "scripts/notion-webhook-bridge.js"
    },
    {
      "src": "/health",
      "dest": "scripts/notion-webhook-bridge.js"
    }
  ],
  "env": {
    "NOTION_API_KEY": "@notion-api-key",
    "GITHUB_TOKEN": "@github-token",
    "AGENT_REGISTRY_DB_ID": "@agent-registry-db-id",
    "ARCHITECTURE_CATALOG_DB_ID": "@architecture-catalog-db-id",
    "ENABLE_HTTP_ENDPOINT": "true"
  }
}
```

2. **Instalar Vercel CLI:**

```bash
npm install -g vercel
```

3. **Deploy:**

```bash
vercel --prod
```

4. **Configurar secrets:**

```bash
vercel secrets add notion-api-key "tu-notion-api-key"
vercel secrets add github-token "tu-github-token"
vercel secrets add agent-registry-db-id "tu-database-id"
vercel secrets add architecture-catalog-db-id "tu-database-id"
```

### Opción 2: Cloudflare Workers

**Ventajas:**
- 100,000 requests/día gratis
- Latencia ultrabaja
- Edge computing

**Pasos:**

1. **Instalar Wrangler:**

```bash
npm install -g wrangler
```

2. **Crear `wrangler.toml`:**

```toml
name = "notion-webhook-bridge"
main = "scripts/notion-webhook-bridge.js"
compatibility_date = "2024-01-01"

[vars]
ENABLE_HTTP_ENDPOINT = "true"
```

3. **Deploy:**

```bash
wrangler publish
```

4. **Configurar secrets:**

```bash
wrangler secret put NOTION_API_KEY
wrangler secret put GITHUB_TOKEN
wrangler secret put AGENT_REGISTRY_DB_ID
wrangler secret put ARCHITECTURE_CATALOG_DB_ID
```

### Opción 3: Railway.app

**Ventajas:**
- $5/mes crédito gratis
- Soporta procesos long-running
- Base de datos incluida

**Pasos:**

1. **Crear `Procfile`:**

```
web: cd scripts && npm start
```

2. **Deploy desde GitHub:**
   - Conecta tu repositorio en Railway.app
   - Configura variables de entorno en el dashboard
   - Railway auto-deploya en cada push

### Opción 4: AWS Lambda + EventBridge

**Ventajas:**
- Altamente escalable
- Integración nativa con AWS
- 1M invocaciones/mes gratis

**Pasos:**

1. **Crear `serverless.yml`:**

```yaml
service: notion-webhook-bridge

provider:
  name: aws
  runtime: nodejs18.x
  region: us-east-1
  environment:
    NOTION_API_KEY: ${env:NOTION_API_KEY}
    GITHUB_TOKEN: ${env:GITHUB_TOKEN}
    AGENT_REGISTRY_DB_ID: ${env:AGENT_REGISTRY_DB_ID}
    ARCHITECTURE_CATALOG_DB_ID: ${env:ARCHITECTURE_CATALOG_DB_ID}

functions:
  webhook:
    handler: scripts/notion-webhook-bridge.handler
    events:
      - http:
          path: webhook/notion
          method: post
      - schedule: rate(1 minute) # Polling
```

2. **Deploy con Serverless Framework:**

```bash
npm install -g serverless
serverless deploy
```

## Configuración de Variables de Entorno

Todas las plataformas requieren estas variables:

```bash
# Notion
NOTION_API_KEY=secret_xxx           # Integration token de Notion
AGENT_REGISTRY_DB_ID=xxx            # ID de database de agentes
ARCHITECTURE_CATALOG_DB_ID=xxx     # ID de database de arquitecturas

# GitHub
GITHUB_TOKEN=ghp_xxx                # Personal Access Token con permisos repo

# Configuración
ENABLE_HTTP_ENDPOINT=true           # Activar endpoint HTTP
PORT=3000                           # Puerto (solo para servers tradicionales)
```

## Testing del Servicio

### Health Check

```bash
curl https://tu-servicio.vercel.app/health
```

**Respuesta esperada:**

```json
{
  "status": "healthy",
  "databases": 2,
  "lastChecked": {
    "agent-db-id": "2026-01-28T16:00:00.000Z",
    "arch-db-id": "2026-01-28T16:00:00.000Z"
  }
}
```

### Trigger Manual

```bash
curl -X POST https://tu-servicio.vercel.app/webhook/notion \
  -H "Content-Type: application/json" \
  -d '{
    "page_id": "notion-page-id",
    "database_id": "database-id",
    "action": "manual"
  }'
```

**Respuesta esperada:**

```json
{
  "success": true,
  "message": "Workflow disparado exitosamente",
  "page_id": "notion-page-id"
}
```

## Monitoreo y Logs

### Vercel

```bash
vercel logs
```

O desde el dashboard: https://vercel.com/dashboard/logs

### Railway

Logs en tiempo real desde el dashboard o:

```bash
railway logs
```

### AWS CloudWatch

```bash
aws logs tail /aws/lambda/notion-webhook-bridge --follow
```

## Troubleshooting

### Problema: "Workflow no se dispara"

**Solución:**

1. Verificar que el token de GitHub tiene permisos `repo` y `workflow`
2. Confirmar que el repositorio es correcto en la configuración
3. Revisar logs del servicio para errores de API

```bash
# Test manual del trigger
curl -X POST https://api.github.com/repos/GaboBase/gabobase-ASM-docs/dispatches \
  -H "Authorization: Bearer $GITHUB_TOKEN" \
  -H "Accept: application/vnd.github+json" \
  -d '{
    "event_type": "notion-webhook",
    "client_payload": {
      "page_id": "test",
      "action": "test"
    }
  }'
```

### Problema: "Error de autenticación con Notion"

**Solución:**

1. Verificar que el Integration Token es válido
2. Confirmar que la integración tiene acceso a las databases
3. Revisar que los IDs de database son correctos

### Problema: "Rate limiting"

**Solución:**

Aumentar el intervalo de polling:

```javascript
// En notion-webhook-bridge.js
pollInterval: 120000, // 2 minutos en lugar de 1
```

## Alternativas Sin Servidor

### Make.com (Integromat)

1. Crear escenario con:
   - Trigger: Watch Notion Database
   - Action: HTTP Request a GitHub API
2. Configurar payload según formato esperado

### Zapier

1. Crear Zap con:
   - Trigger: New/Updated Database Item in Notion
   - Action: Webhooks by Zapier - POST request
2. URL: `https://api.github.com/repos/GaboBase/gabobase-ASM-docs/dispatches`

### n8n (Self-hosted)

1. Deploy n8n en Railway/Render
2. Crear workflow:
   - Cron Trigger (cada minuto)
   - Notion Node: Query Database
   - HTTP Request Node: POST a GitHub

## Costos Estimados

| Plataforma | Costo Mensual | Requests Incluidos |
|------------|---------------|--------------------|
| Vercel     | $0 - $20      | 100GB bandwidth    |
| Cloudflare | $0 - $5       | 100k req/día      |
| Railway    | $5            | Ilimitado          |
| AWS Lambda | $0 - $5       | 1M invocaciones    |
| Make.com   | $0 - $9       | 1,000 ops/mes      |
| Zapier     | $0 - $20      | 100 tasks/mes      |

## Recomendación Final

Para este proyecto, **Vercel** o **Railway** son las mejores opciones:

- **Vercel**: Si prefieres serverless y no necesitas estado persistente
- **Railway**: Si necesitas un proceso long-running con polling continuo

Ambas opciones tienen tier gratuito suficiente para uso normal del proyecto.
