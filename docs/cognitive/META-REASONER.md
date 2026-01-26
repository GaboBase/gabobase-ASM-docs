# MetaReasoner: Strategic Reasoning Framework

## 🎯 Overview

**MetaReasoner** is the "pre-frontal cortex" of the ASM ecosystem. It doesn't execute tasks but plans *how* tasks should be executed, selecting the optimal agents, tools, and strategies.

## 🏗️ Architecture

```mermaid
graph TD
    Input[Complex Request] --> MR[MetaReasoner]
    
    MR --> |Decompose| Plan[Execution Plan]
    Plan --> |Step 1| A1[Agent A]
    Plan --> |Step 2| A2[Agent B]
    
    A1 --> |Result| MR
    MR --> |Eval| Check{Success?}
    
    Check --> |Yes| A2
    Check --> |No| Replan[Re-planning]
```

## 🔑 Key Features

### 1. Dynamic Planning
- Generates DAGs (Directed Acyclic Graphs) for execution
- Handles dependencies between agents
- Optimizes for cost vs. latency vs. quality

### 2. Conflict Resolution
- Mediates when agents produce conflicting outputs
- Uses "Judge" models to select the best result
- Enforces consistency constraints

### 3. Strategy Switching
- Switches architectures (e.g., BFS to DFS) based on problem type
- Escalates from cheap models to reasoning models if stuck

## 🤖 Agent Interactions

- **Analytics Engine:** Provides data for decisions
- **Intent Detector:** Feeds initial classification
- **Swarm Executor:** Executes the plan

## 📊 Performance Metrics

| Metric | Value |
|--------|-------|
| Plan Success | 96% |
| Overhead | 150ms |
| Cost Saving | 40% |
| Complexity | High |

## 🔧 Configuration

```yaml
meta_reasoner:
  planning:
    model: "o1-preview"
    max_steps: 10
  
  strategy:
    default: "fast"
    fallback: "deep_thought"
  
  constraints:
    max_cost: 0.05
    timeout: 30s
```

## 🚀 Usage

```python
from asm.frameworks import MetaReasoner

reasoner = MetaReasoner()

plan = reasoner.plan(
    goal="Research competitors and write a blog post"
)

# Generated Plan:
# 1. Search Agents -> Find competitors
# 2. Scraper Agents -> Get pricing
# 3. Writer Agents -> Draft content
# 4. Reviewer Agents -> Check tone
```

## 🔗 Integration Points

- **MCP-Swarm:** Orchestrates the plan
- **FLSIN:** Updates reasoning rules

---

**Status:** 🟢 Active  
**Maturity:** High  
**Maintained by:** Core AI Team