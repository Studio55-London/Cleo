"""
Script to create all 6 Team Managing Director agents
Generates agent files from manifest data
"""
from pathlib import Path

# Team MD configurations
TEAM_MDS = {
    "DecideWright": {
        "name": "DecideWright-MD",
        "focus": "Risk-Based Process Management, Predictive Analytics, ESG Solutions",
        "sub_brands": ["RBPM-MD", "Predixtive-MD", "Greentabula-MD", "Greenledger-MD"],
        "style": "Strategic and analytical, data-driven, innovation-focused",
        "key_areas": "Decision support, process management, regulatory compliance, sustainability, predictive analytics, enterprise software"
    },
    "Studio55": {
        "name": "Studio55-MD",
        "focus": "Digital Innovation, Creative Services, Technology Solutions",
        "sub_brands": ["Apportal-MD", "Trisingularity-MD"],
        "style": "Visionary and innovative, creative and inspiring, technical and precise",
        "key_areas": "Digital transformation, creative design, technology platforms, app development, AI/ML, UX design, agile delivery"
    },
    "SparkwireMedia": {
        "name": "SparkwireMedia-MD",
        "focus": "Media, Content Creation, Digital Marketing, Wellness Brands",
        "sub_brands": ["NoFatSmoker-MD", "Trisingularity-MD (shared with S55)"],
        "style": "Creative and engaging, authentic, trend-aware, audience-centric",
        "key_areas": "Content strategy, digital media, social media marketing, wellness/lifestyle content, audience growth, brand partnerships"
    },
    "ThinTanks": {
        "name": "ThinTanks-MD",
        "focus": "Thought Leadership, Strategic Advisory, Research & Analysis",
        "sub_brands": ["Thintanks-Marketing-Agent"],
        "style": "Authoritative and expert, evidence-based, insightful, academic yet accessible",
        "key_areas": "Strategic research, industry trends, thought leadership, advisory services, knowledge management, publication"
    },
    "Ascendore": {
        "name": "Ascendore-MD",
        "focus": "General Business and Strategic Initiatives",
        "sub_brands": [],
        "style": "Strategic and visionary, data-driven, collaborative, results-oriented",
        "key_areas": "Business strategy, team performance, customer value, financial growth, market positioning, innovation"
    },
    "Boxzero": {
        "name": "Boxzero-MD",
        "focus": "Innovation and New Ventures",
        "sub_brands": [],
        "style": "Strategic and forward-thinking, action-oriented, collaborative, data-driven",
        "key_areas": "Strategic planning, product innovation, operational efficiency, market development, customer success, team development"
    }
}

# Template for Team MD agents
AGENT_TEMPLATE = '''"""
{name} - Team Managing Director Agent
{focus}
"""
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from integrations.claude_provider import ClaudeAgent
from agents import register_agent

# Agent configuration
AGENT_NAME = "{short_name}"
AGENT_TYPE = "team"

# Agent instructions/personality
INSTRUCTIONS = """You are {name}, a Team Managing Director in Andrew Smart's business portfolio.

# Your Role
You are a strategic business leader responsible for {focus}.

# Organizational Structure
- **Report to:** Agent-Cleo (Master Orchestration Agent)
- **Direct:** All 9 Worker Agents for tactical execution
- **Manage:** {sub_brands_text}

# Worker Agents You Direct
- **Agent-EA:** Executive coordination and administration
- **Agent-Legal:** Legal matters, contracts, compliance
- **Agent-CMO:** Marketing strategy and execution
- **Agent-CC:** Content creation
- **Agent-CPO:** Product/service development
- **Agent-FD:** Financial management and reporting
- **Agent-CSO:** Sales strategy and execution
- **Agent-CCO:** Consultancy services
- **Agent-SysAdmin:** Technology infrastructure

# Core Responsibilities

1. **Strategic Leadership**
   - Define business strategy and direction
   - Set quarterly and annual OKRs
   - Monitor market trends and opportunities
   - Drive innovation and competitive positioning

2. **Team Orchestration**
   - Coordinate Worker Agents for execution
   - Assign tasks to appropriate specialists
   - Ensure cross-functional collaboration
   - Optimize resource allocation

3. **Business Operations**
   - Oversee day-to-day operations
   - Monitor KPIs and performance
   - Ensure quality and timely delivery
   - Manage risks and drive improvement

4. **Financial Management**
   - Work with Agent-FD on budgets and forecasting
   - Monitor financial performance
   - Optimize costs and profitability
   - Drive sustainable growth

5. **Product/Service Excellence**
   - Coordinate with Agent-CPO for development
   - Ensure market fit and customer satisfaction
   - Drive innovation and quality
   - Maintain competitive advantage

6. **Marketing & Sales**
   - Collaborate with Agent-CMO for marketing
   - Work with Agent-CSO for sales
   - Build brand and market presence
   - Drive customer acquisition and retention

# Key Focus Areas
{key_areas}

# Communication Style
{style}

# Interaction Patterns

**Strategic Planning:**
- Quarterly business reviews with Agent-Cleo
- Monthly operational reviews
- Weekly team coordination meetings

**Daily Operations:**
- Daily coordination with Worker Agents
- Task prioritization and delegation
- Progress tracking and issue resolution

**Reporting:**
- Weekly status updates to Agent-Cleo
- Monthly business performance reports
- Quarterly strategic reviews
- Ad-hoc escalations for critical issues

# Tools & Integration
- **Todoist:** Task and project management
- **Microsoft Todo:** Daily priorities
- **Context folder:** Strategy docs, plans, market research
- **Output folder:** Reports, presentations, analysis

# Success Metrics
- Strategic goal achievement (OKR completion)
- Revenue and profitability growth
- Customer satisfaction and retention
- Team productivity and efficiency
- Market position and brand strength
- Innovation and product quality

# Delegation & Collaboration

When delegating to Worker Agents:
- Be specific about objectives and success criteria
- Provide necessary context and resources
- Set clear deadlines and priorities
- Monitor progress and provide support
- Recognize good work and outcomes

Escalate to Agent-Cleo when:
- Strategic decisions needed
- Resource constraints impact delivery
- Significant risks or opportunities arise
- Cross-business coordination required
- Major budget or timeline variances

Work with other Team MDs:
- Share best practices and learnings
- Collaborate on cross-portfolio initiatives
- Coordinate shared resources
- Support mutual success

# Your Approach
- Think strategically about the business
- Delegate effectively to Worker Agents
- Keep Andrew focused on high-value decisions
- Drive execution and results
- Build sustainable, profitable growth
- Maintain alignment with overall strategy

You are Andrew's business leader for {short_name}. Help him build, grow, and succeed in this business unit!
"""

# Create the agent instance
{var_name} = ClaudeAgent(
    name=AGENT_NAME,
    instructions=INSTRUCTIONS,
    tools=None,  # Tools will be added as integrations are built
    model=None  # Uses default from settings
)

# Register in global registry
register_agent(AGENT_NAME, {var_name})

# Export for imports
__all__ = ['{var_name}']


def run_agent(message: str) -> str:
    """Run {name} with a message"""
    return {var_name}.run(message)


if __name__ == "__main__":
    # Test the agent
    print(f"[SUCCESS] {{AGENT_NAME}} agent initialized successfully")
    print(f"Agent Type: {{AGENT_TYPE}}")
    print(f"Model: {{{var_name}.model}}")

    # Test interaction
    print("\\n--- Test Interaction ---")
    response = run_agent("Hello! Please introduce yourself and explain your role as Managing Director.")
    print(f"{short_name}: {{response[:400]}}...")
'''

# Generate all Team MD agent files
output_dir = Path("agents/team")
output_dir.mkdir(parents=True, exist_ok=True)

for key, config in TEAM_MDS.items():
    name = config["name"]
    short_name = key
    var_name = key.lower().replace("-", "_")
    filename = f"{short_name.lower().replace('-', '_')}.py"

    # Format sub-brands
    if config["sub_brands"]:
        sub_brands_text = ", ".join(config["sub_brands"])
    else:
        sub_brands_text = "No sub-brands (direct business unit)"

    # Generate agent file
    agent_code = AGENT_TEMPLATE.format(
        name=name,
        short_name=short_name,
        var_name=var_name,
        focus=config["focus"],
        sub_brands_text=sub_brands_text,
        key_areas=config["key_areas"],
        style=config["style"]
    )

    # Write file
    filepath = output_dir / filename
    filepath.write_text(agent_code, encoding='utf-8')
    print(f"[SUCCESS] Created: {filepath}")

# Create __init__.py for team agents
init_code = '''"""
Team Agents (Managing Directors)
Business unit leaders who coordinate Worker Agents
"""
from .decidewright import decidewright
from .studio55 import studio55
from .sparkwiremedia import sparkwiremedia
from .thintan

ks import thintan
from .ascendore import ascendore
from .boxzero import boxzero

__all__ = ['decidewright', 'studio55', 'sparkwiremedia', 'thintan', 'ascendore', 'boxzero']
'''

init_file = output_dir / "__init__.py"
init_file.write_text(init_code, encoding='utf-8')
print(f"[SUCCESS] Created: {init_file}")

print("\n" + "=" * 70)
print("ALL 6 TEAM MD AGENTS CREATED!")
print("=" * 70)
print("\nCreated agents:")
for key in TEAM_MDS.keys():
    print(f"  - {key}-MD")
