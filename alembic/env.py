"""
Alembic environment configuration for Cleo
Supports both SQLite (local development) and PostgreSQL (Azure production)
"""
from logging.config import fileConfig
import os
import sys
from pathlib import Path

from sqlalchemy import engine_from_config, create_engine, text
from sqlalchemy import pool

from alembic import context

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

# Load environment variables
from dotenv import load_dotenv
load_dotenv()

# Import our models
from models import db

# this is the Alembic Config object, which provides
# access to the values within the .ini file in use.
config = context.config

# Interpret the config file for Python logging.
# This line sets up loggers basically.
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# add your model's MetaData object here
# for 'autogenerate' support
# Import our Flask-SQLAlchemy metadata
target_metadata = db.Model.metadata


def get_database_url():
    """
    Get database URL from environment or config.

    Priority:
    1. DATABASE_URL environment variable (PostgreSQL for Azure)
    2. alembic.ini sqlalchemy.url setting (SQLite for local dev)
    """
    # Check for PostgreSQL connection string from environment
    database_url = os.getenv('DATABASE_URL')

    if database_url:
        # Handle Azure PostgreSQL connection strings
        # Azure sometimes uses 'postgres://' instead of 'postgresql://'
        if database_url.startswith('postgres://'):
            database_url = database_url.replace('postgres://', 'postgresql://', 1)
        return database_url

    # Fall back to alembic.ini configuration (SQLite)
    return config.get_main_option("sqlalchemy.url")


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode.

    This configures the context with just a URL
    and not an Engine, though an Engine is acceptable
    here as well.  By skipping the Engine creation
    we don't even need a DBAPI to be available.

    Calls to context.execute() here emit the given string to the
    script output.

    """
    url = get_database_url()

    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,  # Detect column type changes
        compare_server_default=True,  # Detect default value changes
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode.

    In this scenario we need to create an Engine
    and associate a connection with the context.

    """
    # Get database URL from environment or config
    url = get_database_url()

    # Create engine configuration
    configuration = config.get_section(config.config_ini_section, {})
    configuration['sqlalchemy.url'] = url

    # Additional settings for PostgreSQL
    if url and 'postgresql' in url:
        # Connection pool settings for production
        connectable = create_engine(
            url,
            poolclass=pool.NullPool,
            connect_args={
                'connect_timeout': 30,
                'options': '-c lock_timeout=10000'  # 10 second lock timeout
            } if 'postgresql' in url else {}
        )
    else:
        connectable = engine_from_config(
            configuration,
            prefix="sqlalchemy.",
            poolclass=pool.NullPool,
        )

    with connectable.connect() as connection:
        # Check if using PostgreSQL for pgvector support
        is_postgresql = 'postgresql' in str(connection.engine.url)

        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            compare_type=True,
            compare_server_default=True,
            # Include custom types for pgvector
            include_object=lambda obj, name, type_, reflected, compare_to: True,
        )

        with context.begin_transaction():
            # For PostgreSQL, ensure pgvector extension is available
            if is_postgresql:
                connection.execute(text('CREATE EXTENSION IF NOT EXISTS vector'))
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
