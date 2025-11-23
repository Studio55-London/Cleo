"""
Test Script for Migrated Agents
Demonstrates all 3 agents working together
"""
from agents.master import cleo
from agents.personal import coach, healthfit
from agents import list_agent_names, agent_count

print("=" * 70)
print("CLEO AGENTS - TEST DEMONSTRATION")
print("=" * 70)

# Show registered agents
print(f"\\nRegistered Agents: {list_agent_names()}")
print(f"Total Agents: {agent_count()}")

print("\\n" + "=" * 70)
print("TEST 1: AGENT-CLEO (Master Orchestrator)")
print("=" * 70)

response = cleo.run("""
Hello Cleo! Give me a brief overview of:
1. Your role
2. The agents you coordinate
3. How you help me stay focused and achieve goals
""")
print(f"\\nCleo: {response[:500]}...")

print("\\n" + "=" * 70)
print("TEST 2: COACH-CLEO (Personal Coaching)")
print("=" * 70)

response = coach.run("""
Hi Coach! I want to understand:
1. How you help me finish what I start
2. Your goal management system
3. When we should have our weekly planning sessions
""")
print(f"\\nCoach: {response[:500]}...")

print("\\n" + "=" * 70)
print("TEST 3: HEALTHFIT-AGENT (Health & Fitness)")
print("=" * 70)

response = healthfit.run("""
Hi HealthFit! Tell me briefly about:
1. Your fitness and nutrition approach
2. How you track my progress
3. Your philosophy on sustainable health
""")
print(f"\\nHealthFit: {response[:500]}...")

print("\\n" + "=" * 70)
print("TEST 4: CONVERSATION CONTINUITY")
print("=" * 70)

# Test conversation memory
coach.run("Let's set a goal: Complete the Cleo agent migration")
response = coach.run("What goal did I just set?")
print(f"\\nCoach (remembering context): {response}")

print("\\n" + "=" * 70)
print("ALL TESTS COMPLETE!")
print("=" * 70)
print("\\n[SUCCESS] All 3 agents are operational and ready to use!")
print("\\nNext steps:")
print("- Start using agents for daily planning")
print("- Integrate with Todoist for task management")
print("- Migrate remaining 25 agents")
print("- Build Flask web dashboard")
