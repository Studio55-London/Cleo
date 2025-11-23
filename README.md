# Agent-Cleo v2.0 - AI Agent Orchestration System

**Standalone Multi-Agent System | Claude AI | Privacy-Focused**

A sophisticated multi-agent AI orchestration system featuring 28 specialized agents organized in 4 tiers. Fully migrated from cloud-dependent platform to standalone, privacy-focused system with local data storage.

**Migration Status:** COMPLETE - All 28 agents operational (November 22, 2025)

---

## Features

### Core Capabilities
- **28 Specialized Agents** - Master, Personal, Team, Worker, and Expert agents
- **Claude AI Integration** - Claude 3 Opus for intelligent, context-aware responses
- **Conversation History** - Full context continuity across all interactions
- **Local Data Storage** - SQLite database, no cloud dependencies
- **Global Agent Registry** - Dynamic agent discovery and management
- **Todoist Integration** - Task management (optional)
- **Telegram Bot** - Mobile conversational interface (optional)
- **Microsoft Graph Integration** - O365 calendar/email (optional)
- **Web Dashboard** - Flask-based management console (foundation)
- **Job Scheduling** - APScheduler for automated execution

### Agent Tiers (4-Tier Architecture)
1. **Master (1)**: Cleo - Strategic orchestrator coordinating all agents
2. **Personal (2)**: Coach, HealthFit - Personal productivity and wellness
3. **Team (6)**: DecideWright-MD, Studio55-MD, SparkwireMedia-MD, ThinTanks-MD, Ascendore-MD, Boxzero-MD
4. **Worker (9)**: EA, Legal, CMO, CC, CCO, CPO, FD, CSO, SysAdmin - Tactical execution
5. **Expert (11)**: RegTech, DataScience, CyberSecurity, ESG, AI-Ethics, FinancialModeling, MarketingStrategist, Copywriter, Designer, TechnicalWriter, StrategyRisk

---

## Quick Start

### Prerequisites
- Python 3.11+
- Claude API key (required) - Get from https://console.anthropic.com/
- Todoist account (optional)
- Telegram account (optional)
- Azure account (optional, for Microsoft Graph O365 integration)

### Installation

1. **Navigate to project**
   ```bash
   cd C:\Users\AndrewSmart\Claude_Projects\Cleo
   ```

2. **Activate virtual environment**
   ```bash
   .\venv\Scripts\activate  # Windows (already created)
   ```

3. **Verify installation** (dependencies already installed)
   ```bash
   pip list | findstr anthropic
   ```

4. **Configure environment**
   - Edit `.env` file with your Claude API key
   - API key is already configured from migration

5. **Test all agents**
   ```bash
   python test_all_agents.py
   ```

6. **Run web application** (when ready)
   ```bash
   python app.py
   ```

---

## Configuration

### Required: Claude API
```bash
# In .env file
ANTHROPIC_API_KEY=sk-ant-api03-[your-key-here]
CLAUDE_MODEL=claude-3-opus-20240229
```

Get API key from: https://console.anthropic.com/

### Optional: Todoist Integration
```bash
# In .env file
TODOIST_API_TOKEN=[your-token]
```

Get token from: https://todoist.com/app/settings/integrations/developer

### Optional: Telegram Bot
```bash
# In .env file
TELEGRAM_BOT_TOKEN=[your-token]
TELEGRAM_CHAT_ID=[your-chat-id]
```

Setup: Message @BotFather on Telegram, use `/newbot` command

### Optional: Microsoft Graph (O365)
```bash
# In .env file
GRAPH_CLIENT_ID=[your-client-id]
GRAPH_CLIENT_SECRET=[your-secret]
GRAPH_TENANT_ID=[your-tenant-id]
GRAPH_USER_EMAIL=[your-email]
```

Setup: Azure Portal → App registrations → New registration
Permissions needed: Mail.Read, Mail.Send, Calendars.ReadWrite

---

## Project Structure

```
Cleo/
├── agents/                     # 28 agent implementations
│   ├── __init__.py            # Global agent registry
│   ├── master/                # Master tier (1 agent)
│   │   └── cleo.py           # Strategic orchestrator
│   ├── personal/              # Personal tier (2 agents)
│   │   ├── coach.py          # Personal development coach
│   │   └── healthfit.py      # Health & fitness coach
│   ├── team/                  # Team tier (6 Managing Directors)
│   │   ├── decidewright.py   # Risk/Analytics/ESG business
│   │   ├── studio55.py       # Digital/Tech/Creative business
│   │   ├── sparkwiremedia.py # Media/Content/Wellness business
│   │   ├── thintanks.py      # Research/Advisory business
│   │   ├── ascendore.py      # Strategic initiatives
│   │   └── boxzero.py        # Innovation & ventures
│   ├── worker/                # Worker tier (9 specialists)
│   │   ├── agent_ea.py       # Executive Assistant
│   │   ├── agent_legal.py    # Legal Advisor
│   │   ├── agent_cmo.py      # Marketing Officer
│   │   ├── agent_cc.py       # Content Creator
│   │   ├── agent_cco.py      # Consultancy Officer
│   │   ├── agent_cpo.py      # Product Officer
│   │   ├── agent_fd.py       # Finance Director
│   │   ├── agent_cso.py      # Sales Officer
│   │   └── agent_sysadmin.py # Systems Administrator
│   └── expert/                # Expert tier (11 specialists)
│       ├── expert_regtech.py
│       ├── expert_datascience.py
│       ├── expert_cybersecurity.py
│       ├── expert_esg.py
│       ├── expert_ai_ethics.py
│       ├── expert_financialmodeling.py
│       ├── expert_marketingstrategist.py
│       ├── expert_copywriter.py
│       ├── expert_designer.py
│       ├── expert_technicalwriter.py
│       └── expert_strategyrisk.py
├── integrations/              # External API integrations
│   ├── claude_provider.py    # Claude API wrapper
│   ├── todoist_integration.py
│   └── telegram_integration.py
├── config/                    # Configuration
│   └── settings.py           # Environment configuration
├── static/                    # Web dashboard assets
│   ├── css/
│   ├── js/
│   └── images/
├── templates/                 # Flask HTML templates
│   ├── dashboard.html
│   ├── agents.html
│   └── jobs.html
├── models.py                  # SQLite database models
├── app.py                     # Flask web application
├── requirements.txt           # Python dependencies
├── .env                       # Environment variables (API keys)
├── agents.db                  # SQLite database
├── test_all_agents.py        # Comprehensive test suite
├── create_team_mds.py        # Team MD generator script
├── create_all_remaining_agents.py  # Worker+Expert generator
├── MIGRATION_COMPLETE.md     # Complete migration report
├── AGENTS_GUIDE.md           # Agent usage guide
└── README.md                 # This file
```

---

## Usage

### Testing All Agents
```bash
# Run comprehensive test suite
python test_all_agents.py

# Output shows:
# - All 28 agent imports
# - Registry status (29 agents)
# - Live Claude API test responses
```

### Working with Individual Agents
```python
# Example 1: Talk to Cleo (Master Orchestrator)
from agents.master import cleo

response = cleo.run("What should be our Q1 priorities?")
print(response)

# Example 2: Personal coaching with Coach
from agents.personal import coach

response = coach.run("""
Let's set my weekly goals. I want to focus on:
1. Complete product roadmap
2. Record 3 podcast episodes
3. Client meetings for 2 prospects
""")
print(response)

# Example 3: Team MD delegation
from agents.team import decidewright

response = decidewright.run("""
Agent-CMO, create a go-to-market strategy for our
new risk analytics product.
""")
print(response)

# Example 4: Expert consultation
from agents.expert import datascience

response = datascience.run("""
Analyze customer churn patterns in our dataset.
Recommend predictive models we should implement.
""")
print(response)
```

### Multi-Agent Coordination
```python
from agents.master import cleo
from agents.team import decidewright, studio55, sparkwiremedia

# Strategic alignment through Cleo
strategy = cleo.run("""
We're launching a new AI-powered ESG analytics product.
Coordinate DecideWright, Studio55, and SparkwireMedia.
""")

# Each MD executes their part
analytics = decidewright.run("Build the analytics engine")
platform = studio55.run("Build the technology platform")
marketing = sparkwiremedia.run("Create marketing strategy")
```

### Web Dashboard (Foundation)
```bash
# Start Flask server
python app.py

# Access at http://localhost:5000
# Note: Dashboard frontend is in foundation stage
```

---

## Architecture

### 4-Tier Agent Hierarchy
```
┌─────────────────────────────────────────────────────────┐
│                  MASTER TIER (1)                        │
│                    Agent-Cleo                           │
│            Strategic Orchestration                      │
└───────────────────┬─────────────────────────────────────┘
                    │
        ┌───────────┴───────────┐
        │                       │
┌───────▼──────────┐    ┌──────▼───────────────────────┐
│  PERSONAL (2)    │    │      TEAM TIER (6)           │
│  - Coach         │    │  Team Managing Directors     │
│  - HealthFit     │    │  - DecideWright-MD           │
└──────────────────┘    │  - Studio55-MD               │
                        │  - SparkwireMedia-MD         │
                        │  - ThinTanks-MD              │
                        │  - Ascendore-MD              │
                        │  - Boxzero-MD                │
                        └──────┬───────────────────────┘
                               │
                ┌──────────────┴───────────────┐
                │                              │
        ┌───────▼─────────┐          ┌────────▼──────────┐
        │  WORKER (9)     │          │   EXPERT (11)     │
        │  Execution      │◄────────►│   Consultation    │
        │  Specialists    │          │   Specialists     │
        └─────────────────┘          └───────────────────┘
```

### System Integration
```
┌─────────────────────────────────────────────────────────┐
│                Agent-Cleo v2.0 System                   │
│  ┌────────────────────────────────────────────────┐    │
│  │  Agent Layer (28 Agents)                       │    │
│  │  - ClaudeAgent base class                      │    │
│  │  - Conversation history tracking               │    │
│  │  - Global agent registry                       │    │
│  └──────────┬──────────────────────────────────────┘    │
│             │                                             │
│             ├─→ Claude API (Anthropic)                   │
│             ├─→ SQLite Database (local)                  │
│             ├─→ Todoist API (optional)                   │
│             ├─→ Telegram Bot API (optional)              │
│             └─→ Microsoft Graph/O365 (optional)          │
└─────────────────────────────────────────────────────────┘
```

---

## Development

### Running Tests
```bash
# Comprehensive test suite
python test_all_agents.py

# Individual agent tests
python agents/master/cleo.py
python agents/team/decidewright.py
```

### Adding a New Agent
1. Create file in appropriate `agents/` tier directory
2. Use existing agent as template
3. Define agent with ClaudeAgent class
4. Register in tier's `__init__.py`
5. Test with direct execution

Example:
```python
from integrations.claude_provider import ClaudeAgent
from agents import register_agent

INSTRUCTIONS = """You are Agent-NewAgent..."""

newagent = ClaudeAgent(
    name="NewAgent",
    instructions=INSTRUCTIONS,
    tools=None,
    model=None
)

register_agent("NewAgent", newagent)
```

---

## Migration from Agent-Cleo v1

This is a complete rebuild of the original Agent-Cleo system:

**What Changed:**
- Platform: Overlord cloud → Standalone local system
- Database: PostgreSQL/Supabase → SQLite
- LLM: Custom orchestration → Direct Claude API integration
- Privacy: Cloud-dependent → Local data storage
- Architecture: Cloud platform → Microsoft Agent Framework patterns

**What Stayed:**
- All 28 agents and their personalities
- 4-tier organizational hierarchy
- Business unit coverage
- Integration capabilities (Todoist, Telegram, O365)

**Migration Status:** COMPLETE (November 22, 2025)
**Success Rate:** 100% (28/28 agents operational)

See `MIGRATION_COMPLETE.md` for full migration report.

---

## Documentation

- **README.md** (this file) - Quick start and overview
- **MIGRATION_COMPLETE.md** - Complete migration report
- **AGENTS_GUIDE.md** - Comprehensive agent usage guide
- **AGENT_MIGRATION_PHASE1.md** - Phase 1 migration details
- **AGENT_MIGRATION_PHASE2.md** - Phase 2 migration details
- **test_all_agents.py** - Test suite with examples

---

## License & Credits

**Version:** 2.0
**Status:** Production Ready (Migration Complete)
**Built by:** DecideWright Ltd.
**Owner:** Andrew Smart
**Technology:** Claude AI, Python, Flask, SQLite
