"""Add pgvector support for Azure PostgreSQL

Revision ID: 001_pgvector
Revises: 812172e64032
Create Date: 2024-12-08

This migration adds pgvector support for semantic search in PostgreSQL.
It only runs on PostgreSQL databases (skipped for SQLite).

Changes:
- Enable pgvector extension
- Add embedding_vector column to document_chunks table
- Add Azure Blob Storage columns to documents and document_chunks
- Create HNSW index for fast vector search
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '001_pgvector'
down_revision: Union[str, None] = '812172e64032'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def is_postgresql():
    """Check if we're running against PostgreSQL"""
    bind = op.get_bind()
    return bind.dialect.name == 'postgresql'


def upgrade() -> None:
    """Add pgvector support and Azure Blob Storage columns"""

    # Add Azure Blob Storage columns to documents table (works for both SQLite and PostgreSQL)
    try:
        op.add_column('documents', sa.Column('filename', sa.String(255), nullable=True))
    except Exception:
        pass  # Column may already exist

    try:
        op.add_column('documents', sa.Column('title', sa.String(500), nullable=True))
    except Exception:
        pass

    try:
        op.add_column('documents', sa.Column('storage_type', sa.String(20), server_default='local', nullable=True))
    except Exception:
        pass

    try:
        op.add_column('documents', sa.Column('blob_name', sa.String(500), nullable=True))
    except Exception:
        pass

    try:
        op.add_column('documents', sa.Column('blob_url', sa.String(1000), nullable=True))
    except Exception:
        pass

    try:
        op.add_column('documents', sa.Column('blob_container', sa.String(100), nullable=True))
    except Exception:
        pass

    # Add columns to document_chunks table
    try:
        op.add_column('document_chunks', sa.Column('blob_name', sa.String(500), nullable=True))
    except Exception:
        pass

    try:
        op.add_column('document_chunks', sa.Column('filename', sa.String(255), nullable=True))
    except Exception:
        pass

    # PostgreSQL-specific: pgvector support
    if is_postgresql():
        # Enable pgvector extension
        op.execute('CREATE EXTENSION IF NOT EXISTS vector')

        # Add vector column for embeddings (384 dimensions for all-MiniLM-L6-v2)
        op.execute('''
            ALTER TABLE document_chunks
            ADD COLUMN IF NOT EXISTS embedding_vector vector(384)
        ''')

        # Create HNSW index for fast approximate nearest neighbor search
        # HNSW is faster than IVFFlat for most use cases
        op.execute('''
            CREATE INDEX IF NOT EXISTS idx_document_chunks_embedding_hnsw
            ON document_chunks
            USING hnsw (embedding_vector vector_cosine_ops)
            WITH (m = 16, ef_construction = 64)
        ''')

        # Create index on document_id for faster joins
        op.execute('''
            CREATE INDEX IF NOT EXISTS idx_document_chunks_document_id
            ON document_chunks (document_id)
        ''')

        print("pgvector extension and indexes created successfully")
    else:
        print("Skipping pgvector setup (not PostgreSQL)")


def downgrade() -> None:
    """Remove pgvector support and Azure Blob Storage columns"""

    # PostgreSQL-specific: remove pgvector
    if is_postgresql():
        # Drop HNSW index
        op.execute('DROP INDEX IF EXISTS idx_document_chunks_embedding_hnsw')
        op.execute('DROP INDEX IF EXISTS idx_document_chunks_document_id')

        # Drop vector column
        op.execute('ALTER TABLE document_chunks DROP COLUMN IF EXISTS embedding_vector')

    # Remove Azure Blob Storage columns from document_chunks
    try:
        op.drop_column('document_chunks', 'filename')
    except Exception:
        pass

    try:
        op.drop_column('document_chunks', 'blob_name')
    except Exception:
        pass

    # Remove Azure Blob Storage columns from documents
    try:
        op.drop_column('documents', 'blob_container')
    except Exception:
        pass

    try:
        op.drop_column('documents', 'blob_url')
    except Exception:
        pass

    try:
        op.drop_column('documents', 'blob_name')
    except Exception:
        pass

    try:
        op.drop_column('documents', 'storage_type')
    except Exception:
        pass

    try:
        op.drop_column('documents', 'title')
    except Exception:
        pass

    try:
        op.drop_column('documents', 'filename')
    except Exception:
        pass
