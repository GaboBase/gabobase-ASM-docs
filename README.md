# 🤖 Agent Swarm Matrix (ASM) - Complete Ecosystem

[![CI/CD](https://github.com/GaboBase/gabobase-ASM-docs/actions/workflows/deploy-agents.yml/badge.svg)](https://github.com/GaboBase/gabobase-ASM-docs/actions/workflows/deploy-agents.yml)
[![Contract Validation](https://github.com/GaboBase/gabobase-ASM-docs/actions/workflows/validate-contracts.yml/badge.svg)](https://github.com/GaboBase/gabobase-ASM-docs/actions/workflows/validate-contracts.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Notion Sync](https://img.shields.io/badge/Notion-Synced-blue)](https://notion.so)

Complete documentation and infrastructure for the Agent Swarm Matrix ecosystem - an intelligent multi-agent orchestration system with 60+ specialized agents and 8 architecture frameworks.

## 🎯 Overview

**ASM** is a production-ready agent orchestration platform that intelligently routes tasks across specialized agents using advanced pattern matching, multi-site execution, and quality-driven learning.

### Key Features

✅ **60+ Specialized Agents** with contract-driven execution  
✅ **8 Architecture Frameworks** (EC-RAG, MCP-Swarm, RCOP, FLSIN, HMMAF, MetaReasoner, GenOps, DCE)  
✅ **Notion↔GitHub Bidirectional Sync** with webhooks  
✅ **CI/CD Pipelines** with automated validation and deployment  
✅ **Real-time Monitoring** with Grafana dashboards  
✅ **Quality Badge System** (Ottimo/Buena/Deficiente)  
✅ **Multi-Step & Conditional Triggers** for complex workflows  
✅ **Self-Improving** with FLSIN federated learning  

## 📚 Documentation

### Quick Start

- [Getting Started](docs/setup/GETTING-STARTED.md)
- [Deployment Guide](docs/setup/DEPLOYMENT.md)
- [Architecture Overview](docs/architecture/SYSTEM-DIAGRAM.md)

### Architecture Frameworks

| Framework | Purpose | Status | Path |
|-----------|---------|--------|------|
| [EC-RAG](docs/ai-ml/EC-RAG.md) | Embeddings + Context Retrieval | 🟢 Active | `docs/ai-ml/` |
| [MCP-Swarm](docs/orchestration/MCP-SWARM.md) | Multi-agent coordination | 🟢 Active | `docs/orchestration/` |
| [RCOP](docs/ai-ml/RCOP.md) | Recursive reasoning | 🟢 Active | `docs/ai-ml/` |
| [FLSIN](docs/learning/FLSIN.md) | Federated learning | 🟡 Alpha | `docs/learning/` |
| [HMMAF](docs/content/HMMAF.md) | Multi-modal content | 🟡 Beta | `docs/content/` |
| [MetaReasoner](docs/cognitive/META-REASONER.md) | Strategic optimization | 🟢 Active | `docs/cognitive/` |
| [GenOps](docs/operational/GEN-OPS.md) | Deployment automation | 🟢 Active | `docs/operational/` |
| [DCE](docs/execution/DCE.md) | Dynamic context | 🟡 Beta | `docs/execution/` |

### Core Agents

- **[Intent Detector](https://notion.so/2f475015623781a389a5f6a9269bbb83)** - NLP-based intent analysis
- **[Site Selector](https://notion.so/2f475015623781ce89b3e50d9c69c232)** - Optimal site selection
- **[Swarm Executor](https://notion.so/2f475015623781eaa749d20975e12d6e)** - Parallel task execution
- **[Quality Scorer](https://notion.so/2f475015623781e98f14c70b07170d2a)** - Quality badge calculation
- **[Retry Handler](https://notion.so/2f475015623781978b94fd3c35cd34c7)** - Exponential backoff retry
- **[Cache Manager](https://notion.so/2f47501562378148b982f25b6d028cb5)** - Distributed caching
- **[Learning Engine](https://notion.so/2f475015623781a1bc1bd570cc9ab728)** - Pattern-based learning
- **[Context Enricher](https://notion.so/2f4750156237819b832add7f362df8a5)** - Multi-source context
- **[Security Scanner](https://notion.so/2f4750156237810198e8da59166d849c)** - Vulnerability detection

[View All 60+ Agents →](https://notion.so/4f83c29038c74710a9e2b56bd1c35c3c)

## 🚀 Quick Start

### 1. Clone Repository

```bash
git clone https://github.com/GaboBase/gabobase-ASM-docs.git
cd gabobase-ASM-docs
```

### 2. Install Dependencies

```bash
npm install
# or
yarn install
```

### 3. Configure Secrets

```bash
cp .env.example .env
# Edit .env with your API keys
```

### 4. Deploy

```bash
# Deploy to staging
npm run deploy:staging

# Deploy to production
npm run deploy:production
```

See [Deployment Guide](docs/setup/DEPLOYMENT.md) for detailed instructions.

## 📊 Monitoring

Access real-time dashboards:

- **Production**: https://asm.gabobase.dev
- **Grafana**: https://grafana.asm.gabobase.dev
- **Prometheus**: https://prometheus.asm.gabobase.dev

### Key Metrics

- **Agent Health**: 98% uptime
- **Success Rate**: 94% average
- **P95 Latency**: 1.2s
- **Quality Badges**: 85% Ottimo
- **Cache Hit Rate**: 68%

## 🔄 Sync Architecture

### Notion → GitHub

- **Webhook**: Real-time sync on changes
- **Scheduled**: Every 15 minutes
- **Manual**: `gh workflow run sync-notion.yml`

### GitHub → Notion

- **On PR Merge**: Automatic status update
- **On Deploy**: Update deployment status

## 🧑‍💻 Development

### Project Structure

```
asm-docs/
├── .github/
│   └── workflows/          # CI/CD pipelines
├── agents/                 # Agent definitions
├── config/                 # Configuration files
├── docs/                   # Documentation
│   ├── ai-ml/
│   ├── architecture/
│   ├── cognitive/
│   ├── content/
│   ├── execution/          # DCE
│   ├── learning/           # FLSIN
│   ├── operational/
│   ├── orchestration/
│   └── setup/
├── k8s/                    # Kubernetes manifests
├── schemas/                # JSON schemas
├── scripts/                # Automation scripts
└── tests/                  # Test suites
```

### Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

### Running Tests

```bash
# Validate contracts
npm run validate:contracts

# Run unit tests
npm test

# Run integration tests
npm run test:integration
```

## 🔒 Security

- **RBAC**: Role-based access control
- **Network Policies**: Pod-to-pod isolation
- **Secrets Management**: Sealed secrets
- **Security Scanner**: Automated vulnerability detection
- **Audit Logs**: Full activity tracking

See [Security Policy](SECURITY.md) for details.

## 📈 Roadmap

### Q1 2026

- [ ] Expand to 100+ agents
- [ ] Multi-cloud support (AWS, Azure)
- [ ] GraphQL API
- [ ] Mobile dashboard

### Q2 2026

- [ ] Agent marketplace
- [ ] Custom architecture builder
- [ ] Advanced analytics
- [ ] SLA guarantees

## 📝 License

MIT License - see [LICENSE](LICENSE) for details.

## 👥 Team

**Maintainer**: Gabriel ([GaboBase](https://github.com/GaboBase))  
**Location**: Coquimbo, Chile  
**Project**: PrompTitecture v2.0  

## 💬 Support

- **Issues**: [GitHub Issues](https://github.com/GaboBase/gabobase-ASM-docs/issues)
- **Discussions**: [GitHub Discussions](https://github.com/GaboBase/gabobase-ASM-docs/discussions)
- **Email**: support@gabobase.dev

---

**Built with ❤️ using PrompTitecture v2.0**