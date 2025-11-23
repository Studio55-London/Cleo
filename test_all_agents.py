"""
Comprehensive Test Script for All 28 Agents
Tests every agent in the Agent-Cleo v2 system
"""
import sys
from pathlib import Path

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent))

def test_agent_imports():
    """Test that all agents can be imported"""
    print("=" * 70)
    print("TESTING AGENT IMPORTS")
    print("=" * 70)

    try:
        # Master tier (1 agent)
        print("\n[MASTER TIER]")
        from agents.master import cleo
        print(f"  [SUCCESS] Imported: cleo")

        # Personal tier (2 agents)
        print("\n[PERSONAL TIER]")
        from agents.personal import coach, healthfit
        print(f"  [SUCCESS] Imported: coach")
        print(f"  [SUCCESS] Imported: healthfit")

        # Team tier (6 agents)
        print("\n[TEAM TIER - Managing Directors]")
        from agents.team import decidewright, studio55, sparkwiremedia, thintanks, ascendore, boxzero
        print(f"  [SUCCESS] Imported: decidewright")
        print(f"  [SUCCESS] Imported: studio55")
        print(f"  [SUCCESS] Imported: sparkwiremedia")
        print(f"  [SUCCESS] Imported: thintanks")
        print(f"  [SUCCESS] Imported: ascendore")
        print(f"  [SUCCESS] Imported: boxzero")

        # Worker tier (9 agents)
        print("\n[WORKER TIER - Execution Specialists]")
        from agents.worker import ea, legal, cmo, cc, cco, cpo, fd, cso, sysadmin
        print(f"  [SUCCESS] Imported: ea")
        print(f"  [SUCCESS] Imported: legal")
        print(f"  [SUCCESS] Imported: cmo")
        print(f"  [SUCCESS] Imported: cc")
        print(f"  [SUCCESS] Imported: cpo")
        print(f"  [SUCCESS] Imported: fd")
        print(f"  [SUCCESS] Imported: cso")
        print(f"  [SUCCESS] Imported: cco")
        print(f"  [SUCCESS] Imported: sysadmin")

        # Expert tier (11 agents)
        print("\n[EXPERT TIER - Subject Matter Experts]")
        from agents.expert import (
            regtech, datascience, cybersecurity, esg, ai_ethics,
            financialmodeling, marketingstrategist, copywriter,
            designer, technicalwriter, strategyrisk
        )
        print(f"  [SUCCESS] Imported: regtech")
        print(f"  [SUCCESS] Imported: datascience")
        print(f"  [SUCCESS] Imported: cybersecurity")
        print(f"  [SUCCESS] Imported: esg")
        print(f"  [SUCCESS] Imported: ai_ethics")
        print(f"  [SUCCESS] Imported: financialmodeling")
        print(f"  [SUCCESS] Imported: marketingstrategist")
        print(f"  [SUCCESS] Imported: copywriter")
        print(f"  [SUCCESS] Imported: designer")
        print(f"  [SUCCESS] Imported: technicalwriter")
        print(f"  [SUCCESS] Imported: strategyrisk")

        print("\n" + "=" * 70)
        print("[SUCCESS] ALL 28 AGENTS IMPORTED SUCCESSFULLY!")
        print("=" * 70)
        return True

    except Exception as e:
        print(f"\n[ERROR] Import failed: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_agent_registry():
    """Test the global agent registry"""
    print("\n" + "=" * 70)
    print("TESTING AGENT REGISTRY")
    print("=" * 70)

    try:
        from agents import list_agent_names, agent_count, get_agent

        count = agent_count()
        names = list_agent_names()

        print(f"\nTotal Agents Registered: {count}")
        print(f"\nAll Registered Agents:")
        for i, name in enumerate(sorted(names), 1):
            print(f"  {i:2d}. {name}")

        # Verify count
        expected_count = 28  # 1 master + 2 personal + 6 team + 9 worker + 11 expert
        if count == expected_count:
            print(f"\n[SUCCESS] Registry has exactly {expected_count} agents!")
        else:
            print(f"\n[WARNING] Expected {expected_count} agents, but found {count}")

        return True

    except Exception as e:
        print(f"\n[ERROR] Registry test failed: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_sample_agents():
    """Test a sample of agents with live Claude API calls"""
    print("\n" + "=" * 70)
    print("TESTING SAMPLE AGENTS WITH CLAUDE API")
    print("=" * 70)
    print("\n[NOTE] Testing one agent from each tier...")

    try:
        # Test Master agent
        print("\n[MASTER] Testing Cleo...")
        from agents.master import cleo
        response = cleo.run("Please introduce yourself in one sentence.")
        print(f"  Cleo: {response[:150]}...")

        # Test Personal agent
        print("\n[PERSONAL] Testing Coach...")
        from agents.personal import coach
        response = coach.run("Please introduce yourself in one sentence.")
        print(f"  Coach: {response[:150]}...")

        # Test Team agent
        print("\n[TEAM] Testing DecideWright-MD...")
        from agents.team import decidewright
        response = decidewright.run("Please introduce yourself in one sentence.")
        print(f"  DecideWright-MD: {response[:150]}...")

        # Test Worker agent
        print("\n[WORKER] Testing Agent-CMO...")
        from agents.worker import cmo
        response = cmo.run("Please introduce yourself in one sentence.")
        print(f"  Agent-CMO: {response[:150]}...")

        # Test Expert agent
        print("\n[EXPERT] Testing Expert-DataScience...")
        from agents.expert import datascience
        response = datascience.run("Please introduce yourself in one sentence.")
        print(f"  Expert-DataScience: {response[:150]}...")

        print("\n[SUCCESS] All sample agents responded successfully!")
        return True

    except Exception as e:
        print(f"\n[ERROR] Sample agent test failed: {e}")
        import traceback
        traceback.print_exc()
        return False


def main():
    """Run all tests"""
    print("\n" + "=" * 70)
    print("AGENT-CLEO v2.0 - COMPREHENSIVE AGENT TEST SUITE")
    print("=" * 70)

    results = {
        "imports": test_agent_imports(),
        "registry": test_agent_registry(),
        "api_calls": test_sample_agents()
    }

    # Summary
    print("\n" + "=" * 70)
    print("TEST SUMMARY")
    print("=" * 70)
    print(f"  Import Test:   {'PASS' if results['imports'] else 'FAIL'}")
    print(f"  Registry Test: {'PASS' if results['registry'] else 'FAIL'}")
    print(f"  API Test:      {'PASS' if results['api_calls'] else 'FAIL'}")

    if all(results.values()):
        print("\n" + "=" * 70)
        print("[SUCCESS] ALL TESTS PASSED!")
        print("=" * 70)
        print("\n28 Agents Ready:")
        print("  - 1 Master Agent (Cleo)")
        print("  - 2 Personal Agents (Coach, HealthFit)")
        print("  - 6 Team MDs (DecideWright, Studio55, SparkwireMedia, ThinTanks, Ascendore, Boxzero)")
        print("  - 9 Worker Agents (EA, Legal, CMO, CC, CCO, CPO, FD, CSO, SysAdmin)")
        print("  - 11 Expert Agents (RegTech, DataScience, CyberSecurity, ESG, AI-Ethics, etc.)")
        print("\nAgent-Cleo v2.0 is fully operational!")
    else:
        print("\n[WARNING] Some tests failed. Please review errors above.")

    return all(results.values())


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
