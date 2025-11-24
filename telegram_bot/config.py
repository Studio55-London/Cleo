"""
Configuration for Cleo Telegram Bot
Integrates with Flask backend on port 8080
"""
import os
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Bot Configuration
TELEGRAM_BOT_TOKEN = os.getenv('TELEGRAM_BOT_TOKEN')
TODOIST_API_TOKEN = os.getenv('TODOIST_API_TOKEN')

# Cleo Flask Backend Configuration
API_BASE_URL = os.getenv('CLEO_API_URL', 'http://localhost:8080/api')

# Cleo Paths
PROJECT_ROOT = Path(__file__).parent.parent
AGENTS_DIR = PROJECT_ROOT

# Default Settings
DEFAULT_AGENT = os.getenv('DEFAULT_AGENT', 'Coach')
DEBUG_MODE = os.getenv('DEBUG_MODE', 'False').lower() == 'true'

# Agent Routing Keywords (for intelligent routing)
# Maps keywords to agent names from Cleo database
AGENT_KEYWORDS = {
    # Master
    'cleo': 'Cleo',

    # Personal Agents
    'coach': 'Coach',
    'coaching': 'Coach',
    'goal': 'Coach',
    'goals': 'Coach',
    'health': 'HealthFit',
    'fitness': 'HealthFit',
    'workout': 'HealthFit',
    'exercise': 'HealthFit',

    # Team Agents (Managing Directors)
    'decidewright': 'DecideWrightMD',
    'qra': 'DecideWrightMD',
    'decision': 'DecideWrightMD',
    'studio55': 'S55MD',
    'studio': 'S55MD',
    's55': 'S55MD',
    'sparkwire': 'SparkwireMediaMD',
    'media': 'SparkwireMediaMD',
    'thintanks': 'ThinTanksMD',
    'think': 'ThinTanksMD',
    'research': 'ThinTanksMD',
    'ascendore': 'AscendoreMD',
    'business': 'AscendoreMD',
    'boxzero': 'BoxzeroMD',
    'strategy': 'BoxzeroMD',

    # Worker Agents
    'ea': 'EA',
    'assistant': 'EA',
    'schedule': 'EA',
    'legal': 'Legal',
    'compliance': 'Legal',
    'marketing': 'CMO',
    'content': 'CC',
    'creator': 'CC',
    'consult': 'CCO',
    'consulting': 'CCO',
    'product': 'CPO',
    'finance': 'FD',
    'financial': 'FD',
    'sales': 'CSO',
    'sysadmin': 'SysAdmin',
    'technical': 'SysAdmin',
    'system': 'SysAdmin',

    # Expert Agents
    'regtech': 'RegTech',
    'regulatory': 'RegTech',
    'data': 'DataScience',
    'analytics': 'DataScience',
    'security': 'CyberSecurity',
    'cyber': 'CyberSecurity',
    'esg': 'ESG',
    'sustainability': 'ESG',
    'ethics': 'AIEthics',
    'ai': 'AIEthics',
    'modeling': 'FinancialModeling',
    'model': 'FinancialModeling',
    'marketingstrategy': 'MarketingStrategist',
    'copywriter': 'Copywriter',
    'copy': 'Copywriter',
    'design': 'Designer',
    'designer': 'Designer',
    'technical writer': 'TechnicalWriter',
    'documentation': 'TechnicalWriter',
    'risk': 'StrategyRisk',
}

def validate_config():
    """Validate that all required configuration is present"""
    errors = []

    if not TELEGRAM_BOT_TOKEN:
        errors.append("TELEGRAM_BOT_TOKEN is not set in .env file")

    # Note: Todoist is optional
    # Note: ANTHROPIC_API_KEY should be in parent .env for Cleo backend

    if errors:
        raise ValueError(f"Configuration errors: {', '.join(errors)}")

    return True
