"""
WSGI Entry Point for Cleo AI Agent Workspace
Used by Gunicorn in production (Azure App Service)
"""

from app import app

# Gunicorn expects the application object to be named 'app' or 'application'
application = app

if __name__ == "__main__":
    # Development server - only for local testing
    app.run(host="0.0.0.0", port=8080, debug=False)
