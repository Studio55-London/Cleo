"""
Cleo Agents Registry
Central registry for all 28 specialized agents
"""
from typing import Dict, List, Optional
import sys
from pathlib import Path

# Add parent to path
sys.path.insert(0, str(Path(__file__).parent.parent))

# Agent registry - will be populated as agents are created
_AGENT_REGISTRY: Dict[str, any] = {}


def register_agent(name: str, agent):
    """Register an agent in the global registry"""
    _AGENT_REGISTRY[name.lower()] = agent
    print(f"[SUCCESS] Registered agent: {name}")


def get_agent(name: str):
    """Get an agent by name"""
    return _AGENT_REGISTRY.get(name.lower())


def get_all_agents() -> List:
    """Get all registered agents"""
    return list(_AGENT_REGISTRY.values())


def get_agents_by_type(agent_type: str) -> List:
    """Get all agents of a specific type"""
    return [
        agent for agent in _AGENT_REGISTRY.values()
        if hasattr(agent, 'agent_type') and agent.agent_type == agent_type
    ]


def list_agent_names() -> List[str]:
    """List all registered agent names"""
    return list(_AGENT_REGISTRY.keys())


def agent_count() -> int:
    """Get total number of registered agents"""
    return len(_AGENT_REGISTRY)


# Agent type constants
AGENT_TYPES = {
    'MASTER': 'master',
    'PERSONAL': 'personal',
    'TEAM': 'team',
    'WORKER': 'worker',
    'EXPERT': 'expert'
}


# Import all agents - they will auto-register on import
try:
    # Master
    from .master.cleo import cleo

    # Personal
    from .personal.coach import coach
    from .personal.healthfit import healthfit

    # Team
    from .team.ascendore import ascendore
    from .team.boxzero import boxzero
    from .team.decidewright import decidewright
    from .team.studio55 import studio55
    from .team.sparkwiremedia import sparkwiremedia
    from .team.thintanks import thintanks

    # Worker
    from .worker.agent_cc import cc
    from .worker.agent_cco import cco
    from .worker.agent_cmo import cmo
    from .worker.agent_cpo import cpo
    from .worker.agent_cso import cso
    from .worker.agent_ea import ea
    from .worker.agent_fd import fd
    from .worker.agent_legal import legal
    from .worker.agent_sysadmin import sysadmin

    # Expert
    from .expert.expert_ai_ethics import ai_ethics
    from .expert.expert_copywriter import copywriter
    from .expert.expert_cybersecurity import cybersecurity
    from .expert.expert_datascience import datascience
    from .expert.expert_designer import designer
    from .expert.expert_esg import esg
    from .expert.expert_financialmodeling import financialmodeling
    from .expert.expert_marketingstrategist import marketingstrategist
    from .expert.expert_regtech import regtech
    from .expert.expert_strategyrisk import strategyrisk
    from .expert.expert_technicalwriter import technicalwriter

except Exception as e:
    print(f"[WARNING] Error loading agents: {e}")

print(f"[INFO]  Agent registry initialized ({agent_count()} agents loaded)")
