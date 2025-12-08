#!/usr/bin/env python3
"""
Regenerate vector embeddings for all document chunks

This script regenerates embeddings using the configured vector store.
Use after migrating to PostgreSQL with pgvector.

Usage:
    DATABASE_URL=<postgres-url> USE_PGVECTOR=true python scripts/regenerate_embeddings.py
"""

import os
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from dotenv import load_dotenv
load_dotenv()

from flask import Flask
from models import db, DocumentChunk, Document


def create_app():
    """Create Flask app for database access"""
    database_url = os.getenv('DATABASE_URL', 'sqlite:///agents.db')

    # Handle postgres:// vs postgresql://
    if database_url.startswith('postgres://'):
        database_url = database_url.replace('postgres://', 'postgresql://', 1)

    app = Flask(__name__)
    app.config['SQLALCHEMY_DATABASE_URI'] = database_url
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    db.init_app(app)
    return app


def get_vector_store():
    """Get the appropriate vector store based on configuration"""
    use_pgvector = os.getenv('USE_PGVECTOR', 'false').lower() == 'true'

    if use_pgvector:
        from vector_store_pgvector import PgVectorStore
        return PgVectorStore(db.session)
    else:
        from vector_store import VectorStore
        return VectorStore()


def main():
    app = create_app()

    with app.app_context():
        print("Regenerating vector embeddings...")
        print(f"Using pgvector: {os.getenv('USE_PGVECTOR', 'false')}")
        print()

        # Get vector store
        vector_store = get_vector_store()

        # Get all document chunks
        total_chunks = DocumentChunk.query.count()
        print(f"Total chunks to process: {total_chunks}")

        if total_chunks == 0:
            print("No chunks found. Nothing to do.")
            return

        # Process by document for better organization
        documents = Document.query.filter_by(status='ready').all()
        print(f"Documents to process: {len(documents)}")
        print()

        processed = 0
        errors = 0

        for doc in documents:
            chunks = DocumentChunk.query.filter_by(document_id=doc.id).all()
            if not chunks:
                continue

            print(f"Processing document: {doc.name} ({len(chunks)} chunks)")

            # Prepare chunks for batch processing
            chunk_data = []
            for chunk in chunks:
                chunk_data.append({
                    'content': chunk.content,
                    'chunk_index': chunk.chunk_index
                })

            try:
                # Use the vector store's add_document_chunks method
                if hasattr(vector_store, 'add_document_chunks'):
                    # pgvector store
                    success = vector_store.add_document_chunks(doc.id, chunk_data)
                    if success:
                        processed += len(chunks)
                    else:
                        errors += len(chunks)
                else:
                    # ChromaDB store - process individually
                    for chunk in chunks:
                        try:
                            embedding = vector_store.model.encode(chunk.content, convert_to_numpy=True)
                            chunk.set_embedding(embedding.tolist())
                            processed += 1
                        except Exception as e:
                            print(f"  Error processing chunk {chunk.id}: {e}")
                            errors += 1

                    db.session.commit()

            except Exception as e:
                print(f"  Error processing document {doc.id}: {e}")
                errors += len(chunks)

        print()
        print(f"Processed: {processed} chunks")
        print(f"Errors: {errors} chunks")

        # Print stats
        if hasattr(vector_store, 'get_stats'):
            stats = vector_store.get_stats()
            print()
            print("Vector store stats:")
            for key, value in stats.items():
                print(f"  {key}: {value}")


if __name__ == '__main__':
    main()
