# ASM Deployment Guide

## 🎯 Overview

Complete guide for deploying the Agent Swarm Matrix ecosystem to production.

## 📦 Prerequisites

- Kubernetes cluster (GKE, EKS, or AKS)
- GitHub account with Actions enabled
- Notion workspace with API access
- Grafana Cloud or self-hosted instance
- Domain with DNS access

## 🛠️ Infrastructure Setup

### 1. Kubernetes Cluster

```bash
# Create GKE cluster (example)
gcloud container clusters create asm-cluster \
  --zone us-central1-a \
  --num-nodes 3 \
  --machine-type n1-standard-2 \
  --enable-autoscaling \
  --min-nodes 3 \
  --max-nodes 10

# Get credentials
gcloud container clusters get-credentials asm-cluster --zone us-central1-a
```

### 2. Install Required Components

```bash
# Install NGINX Ingress Controller
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/main/deploy/static/provider/cloud/deploy.yaml

# Install cert-manager (for TLS)
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.0/cert-manager.yaml

# Install Prometheus & Grafana
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm install prometheus prometheus-community/kube-prometheus-stack \
  --namespace monitoring \
  --create-namespace
```

## 🚀 Deploy Agents

### 1. Build Docker Images

```bash
# Build all agents
for agent in intent-detector site-selector swarm-executor quality-scorer; do
  docker build -t ghcr.io/gabobase/asm-agent-$agent:latest ./agents/$agent
  docker push ghcr.io/gabobase/asm-agent-$agent:latest
done
```

### 2. Deploy to Kubernetes

```bash
# Apply Kubernetes manifests
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/secrets.yaml
kubectl apply -f k8s/deployments/
kubectl apply -f k8s/services/
kubectl apply -f k8s/ingress.yaml
```

### 3. Verify Deployment

```bash
# Check pods
kubectl get pods -n asm

# Check services
kubectl get svc -n asm

# Check ingress
kubectl get ingress -n asm
```

## 🔗 Configure Integrations

### 1. Notion Webhook

```bash
# Deploy webhook server
kubectl apply -f k8s/notion-webhook.yaml

# Get webhook URL
kubectl get ingress -n asm notion-webhook -o jsonpath='{.status.loadBalancer.ingress[0].hostname}'
```

Configure in Notion:
1. Go to [Notion Integrations](https://www.notion.so/my-integrations)
2. Create new integration
3. Add webhook URL: `https://webhook.asm.gabobase.dev/webhook/notion`
4. Select databases to monitor
5. Save webhook secret to Kubernetes secret

### 2. GitHub Actions

Add secrets to GitHub repository:
- `NOTION_API_KEY`
- `AGENT_REGISTRY_DB_ID`
- `ARCHITECTURE_CATALOG_DB_ID`
- `GH_PAT` (Personal Access Token)

### 3. Grafana Dashboards

```bash
# Import dashboard
curl -X POST http://grafana.asm.gabobase.dev/api/dashboards/db \
  -H "Authorization: Bearer $GRAFANA_API_KEY" \
  -H "Content-Type: application/json" \
  -d @config/grafana-dashboard.json
```

## 📊 Monitoring Setup

### 1. Prometheus Configuration

```yaml
# config/prometheus-scrape-configs.yaml
scrape_configs:
  - job_name: 'asm-agents'
    kubernetes_sd_configs:
      - role: pod
        namespaces:
          names:
            - asm
    relabel_configs:
      - source_labels: [__meta_kubernetes_pod_label_app]
        action: keep
        regex: asm-agent
      - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_scrape]
        action: keep
        regex: true
      - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_path]
        action: replace
        target_label: __metrics_path__
        regex: (.+)
```

### 2. Alert Manager

```yaml
# config/alertmanager.yaml
route:
  receiver: 'slack'
  group_by: ['alertname', 'cluster', 'service']
  group_wait: 30s
  group_interval: 5m
  repeat_interval: 4h

receivers:
  - name: 'slack'
    slack_configs:
      - api_url: '${SLACK_WEBHOOK_URL}'
        channel: '#asm-alerts'
        title: 'ASM Alert: {{ .GroupLabels.alertname }}'
        text: '{{ range .Alerts }}{{ .Annotations.description }}{{ end }}'
```

## 🔒 Security

### 1. Network Policies

```bash
kubectl apply -f k8s/network-policies/
```

### 2. RBAC

```bash
kubectl apply -f k8s/rbac/
```

### 3. Secrets Management

```bash
# Using sealed-secrets
kubeseal --format=yaml < secrets.yaml > sealed-secrets.yaml
kubectl apply -f sealed-secrets.yaml
```

## ⚙️ Configuration

### Environment Variables

```bash
# Create ConfigMap
kubectl create configmap asm-config \
  --from-literal=NOTION_API_VERSION=2022-06-28 \
  --from-literal=LOG_LEVEL=info \
  --from-literal=METRICS_PORT=9090 \
  --namespace=asm
```

### Agent Configuration

```yaml
# config/agents.yaml
agents:
  intent-detector:
    replicas: 3
    resources:
      requests:
        cpu: 100m
        memory: 256Mi
      limits:
        cpu: 500m
        memory: 512Mi
    autoscaling:
      enabled: true
      minReplicas: 2
      maxReplicas: 10
      targetCPU: 70
```

## 📋 Maintenance

### Rolling Updates

```bash
# Update agent image
kubectl set image deployment/intent-detector \
  intent-detector=ghcr.io/gabobase/asm-agent-intent-detector:v1.2.0 \
  -n asm

# Monitor rollout
kubectl rollout status deployment/intent-detector -n asm
```

### Scaling

```bash
# Manual scaling
kubectl scale deployment/swarm-executor --replicas=5 -n asm

# Autoscaling
kubectl autoscale deployment/swarm-executor \
  --cpu-percent=70 \
  --min=3 \
  --max=10 \
  -n asm
```

### Backup

```bash
# Backup configurations
kubectl get all -n asm -o yaml > backup/asm-$(date +%Y%m%d).yaml

# Backup Prometheus data
kubectl exec -n monitoring prometheus-0 -- tar czf /prometheus-backup.tar.gz /prometheus/data
```

## 🐛 Troubleshooting

### Check Logs

```bash
# Agent logs
kubectl logs -f deployment/intent-detector -n asm

# All agents
kubectl logs -l app=asm-agent -n asm --tail=100
```

### Debug Pod

```bash
# Run debug pod
kubectl run debug --image=alpine -it --rm -n asm -- sh

# Test connectivity
apk add curl
curl http://intent-detector:8080/health
```

### Common Issues

| Issue | Solution |
|-------|----------|
| Pods not starting | Check resource limits, pull policy |
| High latency | Scale up replicas, check network |
| Sync failures | Verify Notion API key, check logs |
| Alert spam | Adjust Prometheus rules thresholds |

---

**Deployed Environment URLs:**
- Production: https://asm.gabobase.dev
- Staging: https://staging.asm.gabobase.dev
- Grafana: https://grafana.asm.gabobase.dev
- Prometheus: https://prometheus.asm.gabobase.dev