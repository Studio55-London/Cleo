# Cleo - AI Agent Workspace

**Modern AI Agent Collaboration Platform | Claude-Powered | 29 Specialized Agents**

Cleo is a sophisticated AI agent workspace featuring a modern, card-based interface where you can collaborate with 29 specialized AI agents across 5 tiers. Create unlimited Spaces for different projects, @mention agents for targeted expertise, and manage everything through an intuitive web interface.

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Python](https://img.shields.io/badge/python-3.11+-blue.svg)](https://www.python.org/downloads/)
[![Flask](https://img.shields.io/badge/flask-3.0+-green.svg)](https://flask.palletsprojects.com/)
[![Claude](https://img.shields.io/badge/Claude-API-purple.svg)](https://www.anthropic.com/)

![Cleo Dashboard](https://via.placeholder.com/800x400?text=Cleo+AI+Agent+Workspace)

---

## Features

### Spaces - Collaborative Workspaces
- **Create unlimited Spaces** for different projects, teams, or contexts
- **Add multiple agents** to each Space for multi-agent collaboration
- **@mention agents** to direct questions to specific expertise
- **Full conversation history** with automatic context management
- **Real-time messaging** with agent responses

### Agent Library
- **29 Specialized Agents** organized across 5 tiers
- **Card-based interface** for easy agent discovery
- **Filterable by tier**: Master, Personal, Team, Worker, Expert
- **One-click agent selection** for adding to Spaces
- **Agent profiles** showing specializations and capabilities

### Integrations
- **Todoist Integration** - Sync tasks and projects
- **Telegram Bot** - Mobile conversational interface
- **Extensible architecture** for custom integrations

### Modern UI/UX
- **Card-based design** with smooth animations
- **Responsive layout** for desktop and mobile
- **Intuitive navigation** with sidebar and breadcrumbs
- **Clean, professional aesthetic** built with vanilla JavaScript
- **No framework dependencies** - lightweight and fast

---

## Quick Start

### Prerequisites
- Python 3.11 or higher
- Claude API key from [Anthropic Console](https://console.anthropic.com/)
- Git (for cloning the repository)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/Studio55-London/Cleo.git
   cd Cleo
   ```

2. **Create virtual environment**
   ```bash
   # Windows
   python -m venv venv
   .\venv\Scripts\activate

   # macOS/Linux
   python3 -m venv venv
   source venv/bin/activate
   ```

3. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Configure environment**
   ```bash
   # Copy the example environment file
   cp .env.example .env

   # Edit .env and add your Claude API key
   # ANTHROPIC_API_KEY=sk-ant-api03-your-key-here
   ```

5. **Run the application**
   ```bash
   python app.py
   ```

6. **Open your browser**
   ```
   Navigate to http://localhost:8080
   ```

---

## Configuration

### Required Environment Variables

Create a `.env` file in the project root:

```bash
# Required: Claude API Configuration
ANTHROPIC_API_KEY=sk-ant-api03-your-key-here
CLAUDE_MODEL=claude-3-5-sonnet-20241022

# Optional: Flask Configuration
SECRET_KEY=your-secret-key-change-in-production
FLASK_ENV=development
FLASK_DEBUG=True

# Optional: Todoist Integration
TODOIST_API_TOKEN=your-todoist-token

# Optional: Telegram Integration
TELEGRAM_BOT_TOKEN=your-bot-token
TELEGRAM_CHAT_ID=your-chat-id
```

### Getting Your Claude API Key
1. Visit [Anthropic Console](https://console.anthropic.com/)
2. Sign up or log in
3. Navigate to API Keys section
4. Create a new API key
5. Copy the key and add to your `.env` file

### Optional Integrations

**Todoist Setup:**
1. Visit [Todoist Integrations](https://todoist.com/app/settings/integrations/developer)
2. Generate an API token
3. Add to `.env` file

**Telegram Bot Setup:**
1. Message [@BotFather](https://t.me/botfather) on Telegram
2. Use `/newbot` command and follow instructions
3. Save your bot token to `.env` file

---

## Architecture

### 5-Tier Agent System

```
┌─────────────────────────────────────────────────────────┐
│                   MASTER TIER (1)                       │
│                     Agent-Cleo                          │
│              Strategic Orchestration                    │
└────────────────────────┬────────────────────────────────┘
                         │
          ┌──────────────┴───────────────┐
          │                              │
┌─────────▼─────────┐          ┌────────▼────────────────┐
│  PERSONAL (2)     │          │     TEAM TIER (6)       │
│  - Coach          │          │  Managing Directors     │
│  - HealthFit      │          │  - DecideWright-MD      │
│                   │          │  - Studio55-MD          │
└───────────────────┘          │  - SparkwireMedia-MD    │
                               │  - ThinTanks-MD         │
                               │  - Ascendore-MD         │
                               │  - BoxZero-MD           │
                               └─────────┬───────────────┘
                                         │
                          ┌──────────────┴──────────────┐
                          │                             │
                  ┌───────▼────────┐          ┌────────▼──────────┐
                  │  WORKER (9)    │          │   EXPERT (10)     │
                  │  Execution     │◄────────►│   Consultation    │
                  │  Specialists   │          │   Specialists     │
                  └────────────────┘          └───────────────────┘
```

### Technology Stack

**Backend:**
- **Flask 3.0+** - Web framework
- **SQLAlchemy** - ORM for database management
- **SQLite** - Local database storage
- **Anthropic Claude API** - AI agent intelligence

**Frontend:**
- **Vanilla JavaScript** - No framework dependencies
- **Modern CSS** - Custom design system with CSS variables
- **HTML5** - Semantic markup

**Architecture Patterns:**
- **Agent Registry Pattern** - Dynamic agent discovery
- **Repository Pattern** - Database abstraction
- **MVC Pattern** - Clean separation of concerns

---

## Project Structure

```
Cleo/
├── agents/                         # Agent implementations
│   ├── __init__.py                # Global agent registry
│   ├── master/                    # Master orchestrator (1)
│   │   ├── __init__.py
│   │   └── cleo.py
│   ├── personal/                  # Personal agents (2)
│   │   ├── __init__.py
│   │   ├── coach.py
│   │   └── healthfit.py
│   ├── team/                      # Team managing directors (6)
│   │   ├── __init__.py
│   │   ├── ascendore.py
│   │   ├── boxzero.py
│   │   ├── decidewright.py
│   │   ├── sparkwiremedia.py
│   │   ├── studio55.py
│   │   └── thintanks.py
│   ├── worker/                    # Worker specialists (9)
│   │   ├── __init__.py
│   │   ├── agent_cc.py           # Content Creator
│   │   ├── agent_cco.py          # Consultancy Officer
│   │   ├── agent_cmo.py          # Marketing Officer
│   │   ├── agent_cpo.py          # Product Officer
│   │   ├── agent_cso.py          # Sales Officer
│   │   ├── agent_ea.py           # Executive Assistant
│   │   ├── agent_fd.py           # Finance Director
│   │   ├── agent_legal.py        # Legal Advisor
│   │   └── agent_sysadmin.py     # Systems Admin
│   └── expert/                    # Expert consultants (10)
│       ├── __init__.py
│       ├── expert_ai_ethics.py
│       ├── expert_copywriter.py
│       ├── expert_cybersecurity.py
│       ├── expert_datascience.py
│       ├── expert_designer.py
│       ├── expert_esg.py
│       ├── expert_financialmodeling.py
│       ├── expert_marketingstrategist.py
│       ├── expert_regtech.py
│       ├── expert_strategyrisk.py
│       └── expert_technicalwriter.py
├── integrations/                   # External API integrations
│   ├── __init__.py
│   └── claude_provider.py         # Claude API client
├── static/                         # Frontend assets
│   ├── css/
│   │   └── spaces.css             # Main stylesheet
│   └── js/
│       └── spaces.js              # Application logic
├── templates/                      # HTML templates
│   └── spaces.html                # Main Spaces interface
├── app.py                         # Flask application
├── models.py                      # Database models
├── requirements.txt               # Python dependencies
├── .env.example                   # Environment template
├── .gitignore                     # Git ignore rules
└── README.md                      # This file
```

---

## Usage

### Creating a Space

1. Click the **"+ New Space"** button in the sidebar
2. Enter a name and description for your Space
3. Select agents to add to the Space
4. Click **"Create Space"** to confirm

### Working with Agents

**Direct Messaging:**
```
Type your message in the input field and press Enter
The first agent in the Space will respond
```

**@Mentioning Specific Agents:**
```
@Coach help me set my weekly goals
@Studio55 what's the status of our web project?
@DataScience analyze this dataset...
```

**Multi-Agent Collaboration:**
```
@Cleo coordinate with @Studio55 and @CMO to launch our new product
```

### Managing Spaces

- **Switch Spaces**: Click on any Space in the sidebar
- **Edit Space**: Click the edit icon next to the Space name
- **Delete Space**: Click the delete icon (with confirmation)
- **Add/Remove Agents**: Edit the Space and modify agent list

### Using the Agent Library

1. Click **"Agents"** in the left sidebar
2. Browse agents by tier (Master, Personal, Team, Worker, Expert)
3. Click on any agent card to view details
4. Add agents to Spaces from their profile

### Using Integrations

1. Click **"Integrations"** in the left sidebar
2. View available integrations (Todoist, Telegram)
3. Click **"Configure"** to set up an integration
4. Follow the on-screen instructions

---

## API Documentation

### REST API Endpoints

**Agents:**
- `GET /api/agents` - List all agents
- `GET /api/agents/<name>` - Get agent details

**Spaces:**
- `GET /api/spaces` - List all spaces
- `POST /api/spaces` - Create new space
- `GET /api/spaces/<id>` - Get space details
- `PUT /api/spaces/<id>` - Update space
- `DELETE /api/spaces/<id>` - Delete space

**Space Agents:**
- `POST /api/spaces/<id>/agents` - Add agents to space
- `DELETE /api/spaces/<id>/agents/<agent_id>` - Remove agent from space

**Messages:**
- `GET /api/spaces/<id>/messages` - Get messages
- `POST /api/spaces/<id>/messages` - Send message

**System:**
- `GET /api/status` - System health check

---

## Development

### Running in Development Mode

```bash
# Activate virtual environment
source venv/bin/activate  # or .\venv\Scripts\activate on Windows

# Set Flask environment
export FLASK_ENV=development
export FLASK_DEBUG=True

# Run the application
python app.py
```

### Database Management

```python
# Initialize database
from app import app, db
with app.app_context():
    db.create_all()

# Reset database
with app.app_context():
    db.drop_all()
    db.create_all()
```

### Adding a New Agent

1. Create agent file in appropriate tier directory:
```python
# agents/expert/expert_newagent.py
from integrations.claude_provider import ClaudeAgent
from agents import register_agent

INSTRUCTIONS = """
You are Agent-NewAgent, a specialized expert in...
"""

newagent = ClaudeAgent(
    name="NewAgent",
    instructions=INSTRUCTIONS,
    agent_type="expert"
)

register_agent("newagent", newagent)
```

2. Import in tier's `__init__.py`:
```python
from .expert_newagent import newagent
```

3. Add to database seed in `models.py`

### Running Tests

```bash
# Run all tests
python -m pytest

# Run specific test file
python test_agents.py
```

---

## Deployment

### Production Checklist

- [ ] Set `FLASK_ENV=production` in `.env`
- [ ] Generate secure `SECRET_KEY`
- [ ] Use production-grade WSGI server (Gunicorn)
- [ ] Set up HTTPS/SSL certificates
- [ ] Configure database backups
- [ ] Set up monitoring and logging
- [ ] Review and harden security settings

### Docker Deployment

```dockerfile
# Dockerfile example
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
EXPOSE 8080
CMD ["gunicorn", "-b", "0.0.0.0:8080", "app:app"]
```

```bash
# Build and run
docker build -t cleo .
docker run -p 8080:8080 --env-file .env cleo
```

### Heroku Deployment

```bash
# Create Procfile
echo "web: gunicorn app:app" > Procfile

# Deploy
heroku create your-cleo-app
heroku config:set ANTHROPIC_API_KEY=your-key
git push heroku master
```

---

## Troubleshooting

### Common Issues

**Issue: "Module not found" error**
```bash
# Solution: Ensure virtual environment is activated
source venv/bin/activate  # or .\venv\Scripts\activate
pip install -r requirements.txt
```

**Issue: "Database locked" error**
```bash
# Solution: Close all connections and restart
rm agents.db
python app.py
```

**Issue: "Claude API error"**
```bash
# Solution: Check your API key and quota
# Verify in .env file
# Check https://console.anthropic.com/
```

**Issue: Agents not loading**
```bash
# Solution: Check agent imports
python -c "from agents import agent_count; print(f'{agent_count()} agents loaded')"
```

---

## Contributing

We welcome contributions! Please follow these guidelines:

1. **Fork the repository**
2. **Create a feature branch** (`git checkout -b feature/amazing-feature`)
3. **Commit your changes** (`git commit -m 'Add amazing feature'`)
4. **Push to the branch** (`git push origin feature/amazing-feature`)
5. **Open a Pull Request**

### Code Style
- Follow PEP 8 for Python code
- Use meaningful variable names
- Add docstrings to functions
- Keep functions focused and small

### Commit Messages
- Use present tense ("Add feature" not "Added feature")
- Use imperative mood ("Move cursor to..." not "Moves cursor to...")
- Reference issues and pull requests

---

## Roadmap

### v2.1 - Enhanced Agent Capabilities
- [ ] Advanced prompt engineering for each agent
- [ ] Context-aware agent responses
- [ ] Agent personality refinement
- [ ] File upload support

### v2.2 - Advanced Integrations
- [ ] Microsoft Graph/O365 integration
- [ ] Slack integration
- [ ] Google Calendar integration
- [ ] Custom webhook support

### v2.3 - Collaboration Features
- [ ] Multi-user support
- [ ] Shared Spaces
- [ ] User permissions
- [ ] Activity feed

### v3.0 - Enterprise Features
- [ ] Team workspaces
- [ ] Admin dashboard
- [ ] Usage analytics
- [ ] API rate limiting
- [ ] SSO authentication

---

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## Credits

**Version:** 2.0
**Built by:** [Studio55 London](https://studio55.london)
**Owner:** Andrew Smart
**Technology:** Claude AI, Python, Flask, SQLite

### Powered By
- [Anthropic Claude](https://www.anthropic.com/) - AI Agent Intelligence
- [Flask](https://flask.palletsprojects.com/) - Web Framework
- [SQLAlchemy](https://www.sqlalchemy.org/) - Database ORM

---

## Support

For support, please:
- Open an [issue on GitHub](https://github.com/Studio55-London/Cleo/issues)
- Check the [documentation](https://github.com/Studio55-London/Cleo/wiki)
- Contact: [andrew@studio55.london](mailto:andrew@studio55.london)

---

## Acknowledgments

Special thanks to:
- Anthropic for the Claude AI platform
- The Flask community for excellent documentation
- All contributors to this project

---

**Ready to get started?** Follow the [Quick Start](#quick-start) guide above!
