"""
Cleo Configuration Settings
Loads environment variables and provides application configuration
"""
import os
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Base paths
BASE_DIR = Path(__file__).parent.parent
DATA_DIR = BASE_DIR / "data"
CONTEXT_DIR = DATA_DIR / "context"

# Ensure directories exist
DATA_DIR.mkdir(exist_ok=True)
CONTEXT_DIR.mkdir(exist_ok=True)

# ============================================================================
# CLAUDE API CONFIGURATION
# ============================================================================
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")
CLAUDE_MODEL = os.getenv("CLAUDE_MODEL", "claude-sonnet-4")

if not ANTHROPIC_API_KEY:
    raise ValueError("ANTHROPIC_API_KEY is required in .env file")

# ============================================================================
# MICROSOFT GRAPH CONFIGURATION
# ============================================================================
AZURE_TENANT_ID = os.getenv("AZURE_TENANT_ID")
AZURE_CLIENT_ID = os.getenv("AZURE_CLIENT_ID")
AZURE_CLIENT_SECRET = os.getenv("AZURE_CLIENT_SECRET")

# Graph API is optional - warn if not configured
GRAPH_ENABLED = all([AZURE_TENANT_ID, AZURE_CLIENT_ID, AZURE_CLIENT_SECRET])
if not GRAPH_ENABLED:
    print("WARNING:  Microsoft Graph API not configured (optional)")

# ============================================================================
# TODOIST CONFIGURATION
# ============================================================================
TODOIST_API_TOKEN = os.getenv("TODOIST_API_TOKEN")
TODOIST_ENABLED = bool(TODOIST_API_TOKEN)

if not TODOIST_ENABLED:
    print("WARNING:  Todoist integration not configured (optional)")

# ============================================================================
# TELEGRAM BOT CONFIGURATION
# ============================================================================
TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
TELEGRAM_ENABLED = bool(TELEGRAM_BOT_TOKEN)

if not TELEGRAM_ENABLED:
    print("WARNING:  Telegram bot not configured (optional)")

# ============================================================================
# DATABASE CONFIGURATION
# ============================================================================
DATABASE_PATH = os.getenv("DATABASE_PATH", "data/cleo.db")
DATABASE_URI = f"sqlite:///{BASE_DIR / DATABASE_PATH}"

# ============================================================================
# FLASK CONFIGURATION
# ============================================================================
SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-key-change-in-production")
ENVIRONMENT = os.getenv("ENVIRONMENT", "development")
DEBUG = os.getenv("DEBUG", "True").lower() == "true"
FLASK_HOST = os.getenv("FLASK_HOST", "0.0.0.0")
FLASK_PORT = int(os.getenv("FLASK_PORT", 5000))

# ============================================================================
# LOGGING CONFIGURATION
# ============================================================================
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")
LOG_FILE = os.getenv("LOG_FILE", "data/cleo.log")

# ============================================================================
# AGENT CONFIGURATION
# ============================================================================
AGENT_CONFIG = {
    "default_model": CLAUDE_MODEL,
    "max_tokens": 4096,
    "temperature": 0.7,
    "timeout": 60,  # seconds
}

# Agent context paths
AGENT_CONTEXT_PATHS = {
    "master": CONTEXT_DIR / "master",
    "personal": CONTEXT_DIR / "personal",
    "team": CONTEXT_DIR / "team",
    "worker": CONTEXT_DIR / "worker",
    "expert": CONTEXT_DIR / "expert",
}

# Create context directories
for path in AGENT_CONTEXT_PATHS.values():
    path.mkdir(parents=True, exist_ok=True)

# ============================================================================
# FEATURE FLAGS
# ============================================================================
FEATURES = {
    "microsoft_graph": GRAPH_ENABLED,
    "todoist": TODOIST_ENABLED,
    "telegram": TELEGRAM_ENABLED,
    "job_scheduling": True,
    "web_dashboard": True,
    "mcp_servers": True,
    "workflows": True,
}

# ============================================================================
# DISPLAY CONFIGURATION
# ============================================================================
def print_config():
    """Print configuration summary"""
    print("=" * 70)
    print("Cleo - AI Agent Orchestration System")
    print("=" * 70)
    print(f"Environment: {ENVIRONMENT}")
    print(f"Claude Model: {CLAUDE_MODEL}")
    print(f"Database: {DATABASE_PATH}")
    print(f"\nFeatures:")
    for feature, enabled in FEATURES.items():
        status = "[YES]" if enabled else "[NO]"
        print(f"  {status} {feature.replace('_', ' ').title()}")
    print("=" * 70)

if __name__ == "__main__":
    print_config()
