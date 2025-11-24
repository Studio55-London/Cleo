"""
Test Agent Intelligence
Verifies that agents respond intelligently using Claude API
"""
import os
import sys
from pathlib import Path

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent))

from agents import get_agent
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def test_agent(agent_name, test_message):
    """Test an agent with a message"""
    print(f"\n{'='*70}")
    print(f"Testing: {agent_name}")
    print(f"{'='*70}")
    print(f"Message: {test_message}")
    print(f"{'-'*70}")

    try:
        agent = get_agent(agent_name.lower())
        if not agent:
            print(f"[ERROR] Agent '{agent_name}' not found")
            return False

        response = agent.run(test_message)
        print(f"Response ({len(response)} chars):")
        print(response)
        print(f"{'='*70}\n")
        return True

    except Exception as e:
        print(f"[ERROR] {str(e)}")
        print(f"{'='*70}\n")
        return False

def main():
    """Test multiple agents"""
    print("\n" + "="*70)
    print("AGENT INTELLIGENCE TEST")
    print("Testing agents with Claude API")
    print("="*70)

    # Check API key is set
    if not os.getenv('ANTHROPIC_API_KEY'):
        print("[ERROR] ANTHROPIC_API_KEY not set in .env file")
        return

    print("[OK] Claude API key found")

    # Test cases
    tests = [
        {
            'agent': 'Cleo',
            'message': 'Hello Cleo! Please introduce yourself in 2-3 sentences and explain your primary role.'
        },
        {
            'agent': 'Coach',
            'message': 'Hi Coach! I need help with goal setting. Can you briefly explain your coaching approach in 2 sentences?'
        },
        {
            'agent': 'Studio55',
            'message': 'Hi Studio55! What services does your business unit provide? Please be brief (2-3 sentences).'
        }
    ]

    results = []
    for test in tests:
        success = test_agent(test['agent'], test['message'])
        results.append({
            'agent': test['agent'],
            'success': success
        })

    # Summary
    print("\n" + "="*70)
    print("TEST SUMMARY")
    print("="*70)
    for result in results:
        status = "[PASS]" if result['success'] else "[FAIL]"
        print(f"{status}: {result['agent']}")

    successful = sum(1 for r in results if r['success'])
    total = len(results)
    print(f"\nTotal: {successful}/{total} agents passed")
    print("="*70 + "\n")

if __name__ == "__main__":
    main()
