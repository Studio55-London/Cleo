# Cleo Agents Usage Guide

**Date:** November 22, 2025
**Status:** 3 Agents Migrated and Operational

---

## 🎉 Migrated Agents (Ready to Use!)

### 1. Agent-Cleo (Master Orchestrator)
**Type:** Master Agent
**File:** `agents/master/cleo.py`
**Purpose:** Main orchestration agent that coordinates all other agents

**What Cleo Does:**
- Coordinates all Personal and Team Agents
- Ensures alignment between personal and professional goals
- Delegates tasks to appropriate agents
- Monitors progress across all initiatives
- Provides executive summaries and strategic recommendations
- Keeps you focused on high-value activities

**How to Use Cleo:**
```python
from agents.master import cleo

# Have a strategic conversation
response = cleo.run("What are the top priorities across all my businesses right now?")
print(response)

# Get orchestration help
response = cleo.run("I need to launch a new product for DecideWright. Which agents should be involved?")
print(response)

# Cross-business coordination
response = cleo.run("How can Studio55 and SparkwireMedia collaborate on marketing?")
print(response)
```

---

### 2. Coach-Cleo (Personal Coaching Agent)
**Type:** Personal Agent
**File:** `agents/personal/coach.py`
**Purpose:** Personal development, goal setting, and life coaching

**What Coach Does:**
- Manages 4-tier goal hierarchy (Weekly, Short-term, Long-term, Someday)
- Provides weekly planning sessions (every Sunday/Monday)
- Daily check-ins for accountability
- Helps you FINISH what you start (not just START)
- Integrates personal goals with professional objectives
- Uses Todoist for goal tracking (label: "Agent-Cleo-Goals")

**Goal Priority System:**
- **Priority 1:** Weekly Goals (due Friday)
- **Priority 2:** Short Term Goals (Quarterly/Annual)
- **Priority 3:** Long Term Goals (3-5 years)
- **Priority 4:** Someday Goals

**How to Use Coach:**
```python
from agents.personal import coach

# Weekly planning
response = coach.run("Let's do my weekly planning for this week. What did I accomplish last week and what should I focus on this week?")
print(response)

# Goal alignment check
response = coach.run("I'm thinking about starting a new project. How does this align with my current goals?")
print(response)

# Accountability check-in
response = coach.run("I'm struggling to finish my weekly goals. Can you help me identify what's blocking me?")
print(response)

# Long-term vision
response = coach.run("Let's review my 3-5 year goals and make sure they still align with where I want to go.")
print(response)
```

**Coach's Special Focus:**
- Helps you complete projects, not just start them
- Limits work-in-progress to 3-5 weekly goals
- Challenges non-aligned commitments
- Builds your "finisher" identity

---

### 3. HealthFit-Agent (Health & Fitness Agent)
**Type:** Personal Agent
**File:** `agents/personal/healthfit.py`
**Purpose:** Health, fitness, nutrition, and wellness coaching

**What HealthFit Does:**
- Creates personalized workout plans
- Provides nutrition guidance and meal planning
- Tracks health metrics (weight, sleep, energy)
- Supports injury prevention and recovery
- Integrates fitness with your overall life goals
- Evidence-based, sustainable approach (no fads!)

**How to Use HealthFit:**
```python
from agents.personal import healthfit

# Fitness planning
response = healthfit.run("I want to build strength and improve my cardiovascular fitness. Can you create a weekly workout plan for me?")
print(response)

# Nutrition guidance
response = healthfit.run("What should I focus on nutritionally to support my fitness goals?")
print(response)

# Progress tracking
response = healthfit.run("I've been working out for a month. Can you help me assess my progress and adjust my plan?")
print(response)

# Holistic health
response = healthfit.run("My energy levels have been low. What might be contributing to this and how can I improve?")
print(response)
```

**HealthFit's Philosophy:**
- Sustainability over quick fixes
- Long-term lifestyle changes
- Balance fitness with life demands
- Celebrate non-scale victories (energy, mood, performance)

---

## 💡 Usage Examples

### Example 1: Weekly Planning Routine
```python
from agents.personal import coach

# Sunday evening - weekly planning
planning_session = coach.run("""
Let's do my weekly planning session:
1. Review last week's goals
2. Celebrate what I completed
3. Analyze what didn't get done
4. Set 3-5 goals for this week aligned with my quarterly objectives
5. Create Todoist tasks for each goal
""")
print(planning_session)
```

### Example 2: Strategic Business Question
```python
from agents.master import cleo

# Get strategic guidance
strategy = cleo.run("""
I'm considering launching a new AI-powered product for DecideWright.
This would require development work from Studio55, marketing from SparkwireMedia,
and research from ThinTanks.

Can you:
1. Identify which agents should be involved
2. Suggest a coordination approach
3. Flag any potential conflicts with current priorities
4. Provide a high-level execution plan
""")
print(strategy)
```

### Example 3: Integrated Health & Goals
```python
from agents.personal import coach, healthfit

# Check fitness alignment with goals
coach_response = coach.run("One of my goals is to have more energy for work. How should fitness support this?")
print(f"Coach: {coach_response}")

# Get fitness plan
fitness_response = healthfit.run("Based on the goal of increasing energy for work, what workout and nutrition approach do you recommend?")
print(f"HealthFit: {fitness_response}")
```

### Example 4: Testing All Agents Together
```python
# Test all 3 agents in sequence
from agents.master import cleo
from agents.personal import coach, healthfit

# Strategic question to Cleo
cleo_response = cleo.run("What are my top 3 priorities this week across personal and business?")
print(f"\\nCleo: {cleo_response}")

# Personal development with Coach
coach_response = coach.run("Review my weekly goals and tell me if I'm on track.")
print(f"\\nCoach: {coach_response}")

# Health check with HealthFit
health_response = healthfit.run("Quick health check - how are my fitness metrics trending?")
print(f"\\nHealthFit: {health_response}")
```

---

## 🔧 Advanced Usage

### Conversation History
Each agent maintains conversation history:

```python
from agents.personal import coach

# First message
coach.run("Let's set my weekly goals")

# Follow-up (agent remembers context)
coach.run("Actually, let's add one more goal about finishing the Studio55 project")

# Check history
print(coach.get_history())

# Reset if needed
coach.reset()
```

### Custom Model/Temperature
```python
from integrations.claude_provider import ClaudeAgent

# Create custom agent instance
custom_agent = ClaudeAgent(
    name="CustomCoach",
    instructions="Your custom instructions here",
    model="claude-3-opus-20240229",
    temperature=0.8  # More creative
)

response = custom_agent.run("Your message")
```

---

## 📊 Agent Registry

All agents are automatically registered in the global registry:

```python
from agents import get_agent, list_agent_names, get_all_agents

# Get a specific agent
cleo = get_agent("Cleo")

# List all registered agents
print(list_agent_names())  # ['Cleo', 'Coach', 'HealthFit']

# Get all agents
all_agents = get_all_agents()
```

---

## 🎯 Quick Reference

**When to use each agent:**

**Cleo (Master):**
- Strategic business questions
- Cross-functional coordination
- Priority setting across businesses
- Delegation decisions
- Executive summaries

**Coach (Personal):**
- Goal setting and planning
- Weekly/quarterly reviews
- Personal development
- Accountability and motivation
- Task alignment decisions

**HealthFit (Personal):**
- Workout planning
- Nutrition guidance
- Health tracking
- Energy and wellness
- Recovery and prevention

---

## 🚀 Next Steps

With these 3 agents operational, you can:

1. **Start using them today** - All are tested and ready
2. **Establish routines** - Weekly planning with Coach, daily check-ins
3. **Integrate workflows** - Use Cleo for coordination, agents for execution
4. **Track progress** - Agents will document sessions in their Output folders
5. **Build on this foundation** - 25 more agents ready to migrate

---

## 📝 Testing Your Setup

Run this complete test:

```bash
cd "C:\Users\AndrewSmart\Claude_Projects\Cleo"
.\venv\Scripts\activate

# Test each agent
python agents/master/cleo.py
python agents/personal/coach.py
python agents/personal/healthfit.py
```

All agents should:
- ✅ Initialize successfully
- ✅ Register in the global registry
- ✅ Respond to test messages
- ✅ Maintain conversation context

---

**Your first 3 agents are live and ready to help you achieve your goals!** 🎉
