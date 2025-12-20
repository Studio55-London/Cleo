"""
Setup Global Space and Default Knowledge Bases
Run this script after the migration to create the Global space and default KBs.

Usage:
    python scripts/setup_global_space.py
"""
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import app, db
from models import Space, KnowledgeBase, Document

def setup_global_space():
    """Create Global space and default knowledge base if they don't exist."""
    with app.app_context():
        # Check if Global space already exists
        global_space = Space.query.filter_by(is_global=True).first()

        if global_space:
            print(f"Global space already exists: {global_space.name} (ID: {global_space.id})")
        else:
            # Create Global space
            global_space = Space(
                name="Global",
                description="Access all knowledge across all spaces",
                is_global=True,
                user_id=None  # Global space is accessible to all users
            )
            db.session.add(global_space)
            db.session.commit()
            print(f"Created Global space with ID: {global_space.id}")

        # Check if default KB exists in Global space
        default_kb = KnowledgeBase.query.filter_by(
            space_id=global_space.id,
            is_default=True
        ).first()

        if default_kb:
            print(f"Default KB already exists: {default_kb.name} (ID: {default_kb.id})")
        else:
            # Create default Knowledge Base in Global space
            default_kb = KnowledgeBase(
                name="General Knowledge",
                description="Default knowledge base for all documents",
                space_id=global_space.id,
                is_default=True
            )
            db.session.add(default_kb)
            db.session.commit()
            print(f"Created default KB: {default_kb.name} (ID: {default_kb.id})")

        # Migrate existing documents without KB associations to the default KB
        orphan_docs = Document.query.filter(
            ~Document.knowledge_bases.any()
        ).all()

        if orphan_docs:
            print(f"\nFound {len(orphan_docs)} documents without KB associations")
            for doc in orphan_docs:
                default_kb.documents.append(doc)
                print(f"  - Added '{doc.name}' to {default_kb.name}")
            db.session.commit()
            print(f"Migrated {len(orphan_docs)} documents to {default_kb.name}")
        else:
            print("\nNo orphan documents to migrate")

        # Create default KBs for existing non-global spaces
        non_global_spaces = Space.query.filter_by(is_global=False).all()
        for space in non_global_spaces:
            existing_kb = KnowledgeBase.query.filter_by(
                space_id=space.id,
                is_default=True
            ).first()

            if not existing_kb:
                space_kb = KnowledgeBase(
                    name=f"{space.name} Knowledge",
                    description=f"Default knowledge base for {space.name}",
                    space_id=space.id,
                    is_default=True
                )
                db.session.add(space_kb)
                print(f"Created default KB for space: {space.name}")

        db.session.commit()

        # Summary
        print("\n=== Summary ===")
        print(f"Global Space ID: {global_space.id}")
        print(f"Total Knowledge Bases: {KnowledgeBase.query.count()}")
        print(f"Total Documents: {Document.query.count()}")

        # List all KBs
        print("\nKnowledge Bases:")
        for kb in KnowledgeBase.query.all():
            space_name = kb.space.name if kb.space else "No Space"
            doc_count = len(kb.documents)
            print(f"  - {kb.name} (Space: {space_name}, Docs: {doc_count})")

if __name__ == "__main__":
    setup_global_space()
