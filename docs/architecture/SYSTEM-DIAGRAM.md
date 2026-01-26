# ASM System Architecture Diagrams

## 🏛️ High-Level Architecture

```mermaid
graph TB
    User[User Query] --> Shortcut[Smart Shortcut]
    Shortcut --> Orchestrator[Orchestrator Layer]
    
    subgraph "Core Orchestration"
        Orchestrator --> IntentDetector[Intent Detector]
        IntentDetector --> SiteSelector[Site Selector]
        SiteSelector --> SwarmExecutor[Swarm Executor]
        SwarmExecutor --> QualityScorer[Quality Scorer]
    end
    
    subgraph "Supporting Agents"
        RetryHandler[Retry Handler]
        CacheManager[Cache Manager]
        ContextEnricher[Context Enricher]
        SecurityScanner[Security Scanner]
    end
    
    subgraph "Architectures"
        ECRAG[EC-RAG]
        MCPSwarm[MCP-Swarm]
        RCOP[RCOP]
        MetaReasoner[MetaReasoner]
        FLSIN[FLSIN]
        HMMAF[HMMAF]
        DCE[DCE]
        GenOps[GenOps]
    end
    
    subgraph "Data Layer"
        Notion[(Notion)]
        GitHub[(GitHub)]
        Supabase[(Supabase)]
        VectorDB[(Vector DB)]
    end
    
    SwarmExecutor --> RetryHandler
    IntentDetector --> CacheManager
    IntentDetector --> ContextEnricher
    QualityScorer --> FLSIN
    
    Orchestrator -.-> ECRAG
    Orchestrator -.-> MCPSwarm
    Orchestrator -.-> RCOP
    Orchestrator -.-> MetaReasoner
    
    QualityScorer --> Result[Final Result]
    
    Result --> Notion
    Result --> GitHub
    
    style Orchestrator fill:#f9f,stroke:#333,stroke-width:4px
    style Result fill:#9f9,stroke:#333,stroke-width:2px
```

## 🔄 Execution Flow

```mermaid
sequenceDiagram
    participant U as User
    participant SC as Smart Shortcut
    participant ID as Intent Detector
    participant SS as Site Selector
    participant SE as Swarm Executor
    participant QS as Quality Scorer
    participant LE as Learning Engine
    
    U->>SC: Natural Language Query
    SC->>ID: Analyze Intent
    
    activate ID
    ID->>ID: NLP Processing
    ID->>ID: Entity Extraction
    ID-->>SC: Intent + Confidence
    deactivate ID
    
    SC->>SS: Select Sites
    
    activate SS
    SS->>SS: Score Sites
    SS->>SS: Apply Diversity
    SS-->>SC: Top 3 Sites
    deactivate SS
    
    SC->>SE: Execute Parallel
    
    activate SE
    par Site A
        SE->>SE: Execute on A
    and Site B
        SE->>SE: Execute on B
    and Site C
        SE->>SE: Execute on C
    end
    SE-->>SC: Aggregated Results
    deactivate SE
    
    SC->>QS: Calculate Quality
    
    activate QS
    QS->>QS: Multi-dimensional Score
    QS->>QS: Assign Badge
    QS-->>SC: Badge + Metrics
    deactivate QS
    
    alt Badge != Ottimo
        SC->>LE: Trigger Learning
        LE->>LE: Pattern Analysis
        LE-->>SC: Improvement Suggestions
    end
    
    SC-->>U: Final Result + Badge
```

## 🏛️ Infrastructure Architecture

```mermaid
graph TB
    subgraph "External Services"
        User[User Browser]
        Notion[Notion API]
        GitHub[GitHub API]
    end
    
    subgraph "Kubernetes Cluster"
        subgraph "Ingress Layer"
            Ingress[NGINX Ingress]
            CertManager[Cert Manager]
        end
        
        subgraph "Application Layer"
            Agents[Agent Pods]
            Webhook[Webhook Server]
            SyncService[Sync Service]
        end
        
        subgraph "Data Layer"
            Redis[Redis Cache]
            Postgres[PostgreSQL]
        end
        
        subgraph "Monitoring Layer"
            Prometheus[Prometheus]
            Grafana[Grafana]
            AlertManager[Alert Manager]
        end
    end
    
    subgraph "CI/CD"
        GitHubActions[GitHub Actions]
        ContainerRegistry[GitHub Container Registry]
    end
    
    User --> Ingress
    Ingress --> Agents
    Ingress --> Webhook
    
    Notion --> Webhook
    Webhook --> SyncService
    SyncService --> GitHub
    
    Agents --> Redis
    Agents --> Postgres
    
    Agents -.-> Prometheus
    Prometheus --> Grafana
    Prometheus --> AlertManager
    
    GitHubActions --> ContainerRegistry
    ContainerRegistry --> Agents
    
    style Ingress fill:#4a9eff,stroke:#333
    style Agents fill:#ff9f43,stroke:#333
    style Prometheus fill:#e74c3c,stroke:#333
```

## 🔗 Data Flow Architecture

```mermaid
graph LR
    subgraph "Sources"
        N[Notion Workspace]
        GH[GitHub Repo]
        SB[Supabase]
    end
    
    subgraph "Sync Layer"
        Webhook[Webhook Handler]
        Scheduler[Cron Scheduler]
    end
    
    subgraph "Processing"
        Validator[Contract Validator]
        Transformer[Data Transformer]
    end
    
    subgraph "Destinations"
        AgentRegistry[Agent Registry]
        ArchCatalog[Architecture Catalog]
        MetricsDB[Metrics Database]
    end
    
    N -->|Webhook| Webhook
    N -->|Poll| Scheduler
    
    Webhook --> Validator
    Scheduler --> Validator
    
    Validator --> Transformer
    Transformer --> GH
    Transformer --> AgentRegistry
    Transformer --> ArchCatalog
    
    GH -->|Actions| Validator
    
    AgentRegistry --> MetricsDB
    ArchCatalog --> MetricsDB
    
    MetricsDB --> SB
```

## 🔒 Security Architecture

```mermaid
graph TB
    subgraph "Perimeter Security"
        WAF[Web Application Firewall]
        DDoS[DDoS Protection]
    end
    
    subgraph "Network Security"
        NetworkPolicy[Network Policies]
        mTLS[mTLS]
    end
    
    subgraph "Application Security"
        AuthZ[Authorization RBAC]
        Secrets[Secrets Management]
        Scanner[Security Scanner Agent]
    end
    
    subgraph "Data Security"
        Encryption[Encryption at Rest]
        TLS[TLS in Transit]
        Backup[Encrypted Backups]
    end
    
    subgraph "Monitoring"
        AuditLogs[Audit Logs]
        SIEM[SIEM Integration]
        Alerts[Security Alerts]
    end
    
    Internet[Internet] --> WAF
    WAF --> DDoS
    DDoS --> NetworkPolicy
    NetworkPolicy --> AuthZ
    AuthZ --> Secrets
    
    Scanner --> AuditLogs
    AuditLogs --> SIEM
    SIEM --> Alerts
    
    style WAF fill:#e74c3c
    style Scanner fill:#e67e22
    style Encryption fill:#27ae60
```

## 📊 Monitoring Architecture

```mermaid
graph TB
    subgraph "Metrics Collection"
        Agents[Agent Pods] -->|/metrics| Prometheus
        Webhook[Webhook Server] -->|/metrics| Prometheus
        K8s[Kubernetes] -->|kube-state-metrics| Prometheus
    end
    
    subgraph "Processing"
        Prometheus[Prometheus]
        Rules[Recording Rules]
        Alerts[Alert Rules]
    end
    
    subgraph "Visualization"
        Grafana[Grafana Dashboards]
        API[Metrics API]
    end
    
    subgraph "Alerting"
        AlertManager[Alert Manager]
        Slack[Slack]
        PagerDuty[PagerDuty]
        Email[Email]
    end
    
    Prometheus --> Rules
    Rules --> Prometheus
    Prometheus --> Alerts
    Alerts --> AlertManager
    
    Prometheus --> Grafana
    Prometheus --> API
    
    AlertManager --> Slack
    AlertManager --> PagerDuty
    AlertManager --> Email
    
    style Prometheus fill:#e74c3c
    style Grafana fill:#f39c12
    style AlertManager fill:#9b59b6
```