"""Add Knowledge Bases and Space enhancements

Revision ID: 003_knowledge_bases
Revises: 002_auth_fields
Create Date: 2024-12-18

This migration adds:
- is_global and user_id columns to spaces table
- knowledge_bases table for organizing documents within spaces
- knowledge_base_documents association table for many-to-many relationship
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '003_knowledge_bases'
down_revision: Union[str, None] = '002_auth_fields'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add knowledge base tables and space enhancements"""

    # 1. Add is_global column to spaces table
    try:
        op.add_column('spaces', sa.Column('is_global', sa.Boolean(), server_default='false', nullable=True))
    except Exception as e:
        print(f"Note: is_global column may already exist: {e}")

    # 2. Add user_id column to spaces table (for multi-tenancy)
    try:
        op.add_column('spaces', sa.Column('user_id', sa.Integer(), nullable=True))
        op.create_foreign_key(
            'fk_spaces_user_id',
            'spaces', 'users',
            ['user_id'], ['id'],
            ondelete='SET NULL'
        )
    except Exception as e:
        print(f"Note: user_id column may already exist: {e}")

    # 3. Create knowledge_bases table
    try:
        op.create_table('knowledge_bases',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('name', sa.String(length=200), nullable=False),
            sa.Column('description', sa.Text(), nullable=True),
            sa.Column('space_id', sa.Integer(), nullable=False),
            sa.Column('is_default', sa.Boolean(), server_default='false', nullable=True),
            sa.Column('created_at', sa.DateTime(), nullable=True),
            sa.Column('updated_at', sa.DateTime(), nullable=True),
            sa.ForeignKeyConstraint(['space_id'], ['spaces.id'], ondelete='CASCADE'),
            sa.PrimaryKeyConstraint('id')
        )
        print("Created knowledge_bases table")
    except Exception as e:
        print(f"Note: knowledge_bases table may already exist: {e}")

    # 4. Create index for faster space lookups
    try:
        op.create_index('idx_knowledge_bases_space_id', 'knowledge_bases', ['space_id'])
    except Exception as e:
        print(f"Note: index may already exist: {e}")

    # 5. Create association table for Document <-> KnowledgeBase many-to-many
    try:
        op.create_table('knowledge_base_documents',
            sa.Column('knowledge_base_id', sa.Integer(), nullable=False),
            sa.Column('document_id', sa.Integer(), nullable=False),
            sa.Column('added_at', sa.DateTime(), nullable=True),
            sa.ForeignKeyConstraint(['knowledge_base_id'], ['knowledge_bases.id'], ondelete='CASCADE'),
            sa.ForeignKeyConstraint(['document_id'], ['documents.id'], ondelete='CASCADE'),
            sa.PrimaryKeyConstraint('knowledge_base_id', 'document_id')
        )
        print("Created knowledge_base_documents association table")
    except Exception as e:
        print(f"Note: knowledge_base_documents table may already exist: {e}")

    # 6. Create indexes for the association table
    try:
        op.create_index('idx_kb_documents_kb_id', 'knowledge_base_documents', ['knowledge_base_id'])
    except Exception as e:
        print(f"Note: kb_id index may already exist: {e}")

    try:
        op.create_index('idx_kb_documents_doc_id', 'knowledge_base_documents', ['document_id'])
    except Exception as e:
        print(f"Note: doc_id index may already exist: {e}")

    print("Knowledge bases migration completed successfully")


def downgrade() -> None:
    """Remove knowledge base tables and space enhancements"""

    # Drop association table indexes
    try:
        op.drop_index('idx_kb_documents_doc_id', table_name='knowledge_base_documents')
    except Exception:
        pass

    try:
        op.drop_index('idx_kb_documents_kb_id', table_name='knowledge_base_documents')
    except Exception:
        pass

    # Drop association table
    try:
        op.drop_table('knowledge_base_documents')
    except Exception:
        pass

    # Drop knowledge_bases index
    try:
        op.drop_index('idx_knowledge_bases_space_id', table_name='knowledge_bases')
    except Exception:
        pass

    # Drop knowledge_bases table
    try:
        op.drop_table('knowledge_bases')
    except Exception:
        pass

    # Remove user_id foreign key and column from spaces
    try:
        op.drop_constraint('fk_spaces_user_id', 'spaces', type_='foreignkey')
    except Exception:
        pass

    try:
        op.drop_column('spaces', 'user_id')
    except Exception:
        pass

    # Remove is_global column from spaces
    try:
        op.drop_column('spaces', 'is_global')
    except Exception:
        pass
