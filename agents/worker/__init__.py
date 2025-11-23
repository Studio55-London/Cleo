"""
Worker Agents
Tactical execution specialists who work for all Team MDs
"""
from .agent_ea import ea
from .agent_legal import legal
from .agent_cmo import cmo
from .agent_cc import cc
from .agent_cco import cco
from .agent_cpo import cpo
from .agent_fd import fd
from .agent_cso import cso
from .agent_sysadmin import sysadmin

__all__ = ['ea', 'legal', 'cmo', 'cc', 'cco', 'cpo', 'fd', 'cso', 'sysadmin']
