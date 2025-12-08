"""
WSGI Entry Point for Cleo AI Agent Workspace
Used by Gunicorn in production (Azure App Service)
"""

from app import app, db, logger
from models import seed_agents, seed_integrations

# Initialize database and seed data on startup
def initialize_database():
    """Initialize database tables and seed initial data"""
    with app.app_context():
        # Create database tables if they don't exist
        db.create_all()
        logger.info("Database tables created/verified")

        # Seed agents if database is empty
        from models import Agent
        if Agent.query.count() == 0:
            logger.info("Database is empty, seeding agents...")
            seed_agents()

        # Seed default integrations
        seed_integrations()

        # Create default Personal space and sync Personal agents
        from app import create_default_personal_space, sync_personal_agents_to_spaces
        create_default_personal_space()
        sync_personal_agents_to_spaces()

        logger.info(f"Database initialized. Agent count: {Agent.query.count()}")

# Run initialization
initialize_database()

# Gunicorn expects the application object to be named 'app' or 'application'
application = app

if __name__ == "__main__":
    # Development server - only for local testing
    app.run(host="0.0.0.0", port=8080, debug=False)
