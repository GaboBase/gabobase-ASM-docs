# Contributing to Agent Swarm Matrix

Thank you for your interest in contributing to ASM! This document provides guidelines for contributing agents, architectures, and documentation.

## 🤝 Code of Conduct

Be respectful, collaborative, and constructive. We're building a community of AI practitioners.

## 🐛 Reporting Issues

Use GitHub Issues with appropriate templates:
- **Bug Report:** For errors or unexpected behavior
- **Feature Request:** For new capabilities
- **Agent Request:** For proposing new agents
- **Architecture Proposal:** For new patterns/frameworks

## 🚀 Contributing Agents

### 1. Create Agent Specification

Use the [New Agent template](.github/ISSUE_TEMPLATE/new-agent.md) to define:
- Basic information (ID, name, category, role)
- Capabilities and skills
- Architecture dependencies
- Integration points
- Execution pattern
- Tool schema (JSON)
- Trigger conditions

### 2. Implement Agent

```python
from asm.core import Agent, AgentConfig

class MyAgent(Agent):
    def __init__(self, config: AgentConfig):
        super().__init__(config)
    
    async def execute(self, input_data):
        # Your agent logic here
        return result
    
    def get_schema(self):
        return {
            "name": "my_agent",
            "description": "Does something useful",
            "parameters": {...}
        }
```

### 3. Write Tests

```python
import pytest
from agents.my_agent import MyAgent

@pytest.mark.asyncio
async def test_my_agent():
    agent = MyAgent(config)
    result = await agent.execute({"input": "test"})
    assert result.success
    assert result.quality_score > 0.8
```

### 4. Register in Notion

Add agent to [Agent Registry](https://www.notion.so/4f83c29038c74710a9e2b56bd1c35c3c) with all properties filled.

### 5. Submit Pull Request

PR checklist:
- [ ] Agent code implemented
- [ ] Tests written (>80% coverage)
- [ ] Documentation added
- [ ] Notion contract created
- [ ] CI/CD pipeline passes

## 🏗️ Contributing Architectures

### 1. Propose Architecture

Use [Architecture Proposal template](.github/ISSUE_TEMPLATE/architecture-proposal.md).

### 2. Document Components

Create `/docs/{category}/{architecture-name}.md` with:
- Overview
- Architecture diagram (Mermaid)
- Key features
- Agent interactions
- Performance metrics
- Configuration
- Usage examples
- Integration points

### 3. Add to Catalog

Register in [Architecture Catalog](https://www.notion.so/ce55a73f69e34d3a965f70014468af28).

## 📝 Documentation Style

- Use clear, concise language
- Include code examples
- Add Mermaid diagrams for architecture
- Link to related components
- Keep metrics up-to-date

## ✅ Review Process

1. **Automated checks:** CI/CD validates code, tests, contracts
2. **Technical review:** Core team reviews implementation
3. **Security review:** For agents with sensitive operations
4. **Documentation review:** Ensures completeness
5. **Approval:** Requires 2 approvals from maintainers

## 💬 Getting Help

- GitHub Discussions for questions
- Slack channel: `#asm-dev`
- Email: gabriel@gabobase.dev

## 📜 License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

Thank you for helping build the future of multi-agent systems! 🚀