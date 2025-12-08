"""
Cleo Configuration Settings
Loads environment variables and provides application configuration
Supports both local development (SQLite) and Azure production (PostgreSQL)
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
# ENVIRONMENT DETECTION
# ============================================================================
ENVIRONMENT = os.getenv("ENVIRONMENT", "development")
IS_PRODUCTION = ENVIRONMENT == "production"
IS_AZURE = bool(os.getenv("AZURE_KEY_VAULT_URL")) or bool(os.getenv("WEBSITE_SITE_NAME"))

# ============================================================================
# AZURE KEY VAULT CONFIGURATION
# ============================================================================
AZURE_KEY_VAULT_URL = os.getenv("AZURE_KEY_VAULT_URL")

# ============================================================================
# CLAUDE API CONFIGURATION
# ============================================================================
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")
CLAUDE_MODEL = os.getenv("CLAUDE_MODEL", "claude-sonnet-4")

# Only raise error if not in a container build context
if not ANTHROPIC_API_KEY and not os.getenv("DOCKER_BUILD"):
    print("WARNING: ANTHROPIC_API_KEY not set - API calls will fail")

# ============================================================================
# MICROSOFT GRAPH CONFIGURATION
# ============================================================================
AZURE_TENANT_ID = os.getenv("AZURE_TENANT_ID")
AZURE_CLIENT_ID = os.getenv("AZURE_CLIENT_ID")
AZURE_CLIENT_SECRET = os.getenv("AZURE_CLIENT_SECRET")

# Graph API is optional - warn if not configured
GRAPH_ENABLED = all([AZURE_TENANT_ID, AZURE_CLIENT_ID, AZURE_CLIENT_SECRET])
if not GRAPH_ENABLED and not IS_PRODUCTION:
    print("INFO: Microsoft Graph API not configured (optional)")

# ============================================================================
# TODOIST CONFIGURATION
# ============================================================================
TODOIST_API_TOKEN = os.getenv("TODOIST_API_TOKEN")
TODOIST_ENABLED = bool(TODOIST_API_TOKEN)

if not TODOIST_ENABLED and not IS_PRODUCTION:
    print("INFO: Todoist integration not configured (optional)")

# ============================================================================
# TELEGRAM BOT CONFIGURATION
# ============================================================================
TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
TELEGRAM_ENABLED = bool(TELEGRAM_BOT_TOKEN)

if not TELEGRAM_ENABLED and not IS_PRODUCTION:
    print("INFO: Telegram bot not configured (optional)")

# ============================================================================
# DATABASE CONFIGURATION
# ============================================================================
# Support both PostgreSQL (Azure) and SQLite (local development)
DATABASE_URL = os.getenv("DATABASE_URL")

if DATABASE_URL:
    # PostgreSQL connection string from environment (Azure production)
    DATABASE_URI = DATABASE_URL
    DATABASE_TYPE = "postgresql"
else:
    # SQLite for local development
    DATABASE_PATH = os.getenv("DATABASE_PATH", "data/cleo.db")
    DATABASE_URI = f"sqlite:///{BASE_DIR / DATABASE_PATH}"
    DATABASE_TYPE = "sqlite"

# ============================================================================
# VECTOR STORE CONFIGURATION
# ============================================================================
# Use pgvector in production, ChromaDB for local development
USE_PGVECTOR = os.getenv("USE_PGVECTOR", "false").lower() == "true"
CHROMADB_PATH = os.getenv("CHROMADB_PATH", str(DATA_DIR / "knowledge" / "chromadb"))

# Embedding model configuration
EMBEDDING_MODEL = os.getenv("EMBEDDING_MODEL", "all-MiniLM-L6-v2")
EMBEDDING_DIMENSION = 384  # Dimension for all-MiniLM-L6-v2

# ============================================================================
# AZURE BLOB STORAGE CONFIGURATION
# ============================================================================
AZURE_STORAGE_CONNECTION_STRING = os.getenv("AZURE_STORAGE_CONNECTION_STRING")
AZURE_STORAGE_CONTAINER = os.getenv("AZURE_STORAGE_CONTAINER", "documents")
BLOB_STORAGE_ENABLED = bool(AZURE_STORAGE_CONNECTION_STRING)

# Local document storage path (fallback when blob storage not configured)
LOCAL_DOCUMENT_PATH = DATA_DIR / "knowledge" / "documents"
LOCAL_DOCUMENT_PATH.mkdir(parents=True, exist_ok=True)

# ============================================================================
# FLASK CONFIGURATION
# ============================================================================
SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-key-change-in-production")
DEBUG = os.getenv("DEBUG", "false" if IS_PRODUCTION else "true").lower() == "true"
FLASK_HOST = os.getenv("FLASK_HOST", "0.0.0.0")
FLASK_PORT = int(os.getenv("FLASK_PORT", os.getenv("WEBSITES_PORT", 8080)))

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
    "pgvector": USE_PGVECTOR,
    "blob_storage": BLOB_STORAGE_ENABLED,
    "azure_deployment": IS_AZURE,
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
    print(f"Azure Deployment: {'Yes' if IS_AZURE else 'No'}")
    print(f"Claude Model: {CLAUDE_MODEL}")
    print(f"Database Type: {DATABASE_TYPE}")
    if DATABASE_TYPE == "postgresql":
        # Mask password in connection string
        db_display = DATABASE_URI.split("@")[-1] if "@" in DATABASE_URI else "PostgreSQL"
        print(f"Database: {db_display}")
    else:
        print(f"Database: {DATABASE_URI}")
    print(f"Vector Store: {'pgvector' if USE_PGVECTOR else 'ChromaDB'}")
    print(f"Blob Storage: {'Azure Blob' if BLOB_STORAGE_ENABLED else 'Local'}")
    print(f"\nFeatures:")
    for feature, enabled in FEATURES.items():
        status = "[YES]" if enabled else "[NO]"
        print(f"  {status} {feature.replace('_', ' ').title()}")
    print("=" * 70)

if __name__ == "__main__":
    print_config()
