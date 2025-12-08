"""
PostgreSQL Vector Store Module for Cleo
Uses pgvector extension for semantic search in Azure PostgreSQL

This module replaces ChromaDB for production deployments,
providing a unified database for both relational and vector data.
"""

import os
import logging
from typing import List, Dict, Optional, Any, Tuple
from functools import lru_cache
import numpy as np

logger = logging.getLogger(__name__)


class PgVectorStore:
    """
    Vector store implementation using PostgreSQL with pgvector extension.

    Features:
    - Native PostgreSQL vector similarity search
    - HNSW indexing for fast approximate nearest neighbor
    - Integrated with SQLAlchemy ORM
    - Caching for query embeddings
    """

    def __init__(self, db_session, embedding_model: str = "all-MiniLM-L6-v2"):
        """
        Initialize PgVectorStore.

        Args:
            db_session: SQLAlchemy database session
            embedding_model: Sentence transformer model name
        """
        self.db = db_session
        self.embedding_model_name = embedding_model
        self._model = None
        self.embedding_dimension = 384  # all-MiniLM-L6-v2 dimension

        # Query cache for performance
        self._embedding_cache: Dict[str, List[float]] = {}
        self._cache_max_size = 100

    @property
    def model(self):
        """Lazy load the embedding model."""
        if self._model is None:
            try:
                from sentence_transformers import SentenceTransformer
                self._model = SentenceTransformer(self.embedding_model_name)
                logger.info(f"Loaded embedding model: {self.embedding_model_name}")
            except Exception as e:
                logger.error(f"Failed to load embedding model: {e}")
                raise
        return self._model

    def generate_embedding(self, text: str) -> List[float]:
        """
        Generate embedding vector for text.

        Args:
            text: Text to embed

        Returns:
            List of floats representing the embedding
        """
        # Check cache first
        cache_key = text[:200]  # Truncate for cache key
        if cache_key in self._embedding_cache:
            return self._embedding_cache[cache_key]

        try:
            embedding = self.model.encode(text, convert_to_numpy=True)
            embedding_list = embedding.tolist()

            # Cache the result
            if len(self._embedding_cache) >= self._cache_max_size:
                # Remove oldest entries (simple FIFO)
                keys_to_remove = list(self._embedding_cache.keys())[:10]
                for key in keys_to_remove:
                    del self._embedding_cache[key]

            self._embedding_cache[cache_key] = embedding_list
            return embedding_list

        except Exception as e:
            logger.error(f"Error generating embedding: {e}")
            return []

    def generate_embeddings_batch(self, texts: List[str]) -> List[List[float]]:
        """
        Generate embeddings for multiple texts efficiently.

        Args:
            texts: List of texts to embed

        Returns:
            List of embedding vectors
        """
        try:
            embeddings = self.model.encode(texts, convert_to_numpy=True, show_progress_bar=False)
            return [emb.tolist() for emb in embeddings]
        except Exception as e:
            logger.error(f"Error generating batch embeddings: {e}")
            return [[] for _ in texts]

    def add_document_chunks(
        self,
        document_id: int,
        chunks: List[Dict[str, Any]]
    ) -> bool:
        """
        Add document chunks with embeddings to the database.

        Args:
            document_id: ID of the parent document
            chunks: List of chunk dictionaries with 'content' and 'chunk_index'

        Returns:
            True if successful
        """
        from sqlalchemy import text

        try:
            # Generate embeddings for all chunks
            texts = [chunk['content'] for chunk in chunks]
            embeddings = self.generate_embeddings_batch(texts)

            for chunk, embedding in zip(chunks, embeddings):
                if not embedding:
                    continue

                # Convert embedding list to PostgreSQL vector format
                embedding_str = f"[{','.join(map(str, embedding))}]"

                # Update chunk with embedding
                self.db.execute(text("""
                    UPDATE document_chunks
                    SET embedding_vector = :embedding::vector
                    WHERE document_id = :doc_id AND chunk_index = :idx
                """), {
                    'embedding': embedding_str,
                    'doc_id': document_id,
                    'idx': chunk['chunk_index']
                })

            self.db.commit()
            logger.info(f"Added {len(chunks)} chunks for document {document_id}")
            return True

        except Exception as e:
            logger.error(f"Error adding document chunks: {e}")
            self.db.rollback()
            return False

    def search(
        self,
        query: str,
        n_results: int = 5,
        document_ids: Optional[List[int]] = None,
        min_similarity: float = 0.3
    ) -> List[Dict[str, Any]]:
        """
        Semantic search using pgvector cosine similarity.

        Args:
            query: Search query text
            n_results: Maximum number of results
            document_ids: Optional filter by document IDs
            min_similarity: Minimum similarity threshold (0-1)

        Returns:
            List of result dictionaries with content, metadata, and similarity
        """
        from sqlalchemy import text

        query_embedding = self.generate_embedding(query)
        if not query_embedding:
            logger.warning("Failed to generate query embedding")
            return []

        # Convert to PostgreSQL vector format
        embedding_str = f"[{','.join(map(str, query_embedding))}]"

        try:
            # Build query with optional document filter
            if document_ids:
                doc_filter = "AND dc.document_id = ANY(:doc_ids)"
                params = {
                    'query_vec': embedding_str,
                    'limit': n_results,
                    'min_sim': min_similarity,
                    'doc_ids': document_ids
                }
            else:
                doc_filter = ""
                params = {
                    'query_vec': embedding_str,
                    'limit': n_results,
                    'min_sim': min_similarity
                }

            # Query with cosine similarity
            # Note: pgvector uses <=> for cosine distance, so similarity = 1 - distance
            results = self.db.execute(text(f"""
                SELECT
                    dc.id,
                    dc.content,
                    dc.document_id,
                    dc.chunk_index,
                    dc.token_count,
                    d.filename,
                    d.title,
                    1 - (dc.embedding_vector <=> :query_vec::vector) as similarity
                FROM document_chunks dc
                JOIN documents d ON d.id = dc.document_id
                WHERE dc.embedding_vector IS NOT NULL
                {doc_filter}
                AND 1 - (dc.embedding_vector <=> :query_vec::vector) >= :min_sim
                ORDER BY dc.embedding_vector <=> :query_vec::vector
                LIMIT :limit
            """), params)

            return [{
                'id': row.id,
                'content': row.content,
                'document_id': row.document_id,
                'chunk_index': row.chunk_index,
                'token_count': row.token_count,
                'filename': row.filename,
                'document_title': row.title,
                'similarity': float(row.similarity)
            } for row in results]

        except Exception as e:
            logger.error(f"Error in vector search: {e}")
            return []

    def search_with_metadata(
        self,
        query: str,
        n_results: int = 5,
        metadata_filter: Optional[Dict[str, Any]] = None
    ) -> List[Dict[str, Any]]:
        """
        Search with optional metadata filtering.

        Args:
            query: Search query text
            n_results: Maximum number of results
            metadata_filter: Optional filter conditions

        Returns:
            List of result dictionaries
        """
        # For now, delegate to basic search
        # Metadata filtering can be added based on document properties
        return self.search(query, n_results)

    def delete_document_embeddings(self, document_id: int) -> bool:
        """
        Delete all embeddings for a document.

        Args:
            document_id: ID of the document

        Returns:
            True if successful
        """
        from sqlalchemy import text

        try:
            self.db.execute(text("""
                UPDATE document_chunks
                SET embedding_vector = NULL
                WHERE document_id = :doc_id
            """), {'doc_id': document_id})
            self.db.commit()
            logger.info(f"Deleted embeddings for document {document_id}")
            return True

        except Exception as e:
            logger.error(f"Error deleting embeddings: {e}")
            self.db.rollback()
            return False

    def rebuild_embeddings(self, document_id: Optional[int] = None) -> int:
        """
        Rebuild embeddings for all or specific documents.

        Args:
            document_id: Optional specific document ID

        Returns:
            Number of chunks processed
        """
        from sqlalchemy import text

        try:
            # Get chunks that need embeddings
            if document_id:
                chunks = self.db.execute(text("""
                    SELECT id, document_id, content, chunk_index
                    FROM document_chunks
                    WHERE document_id = :doc_id
                """), {'doc_id': document_id}).fetchall()
            else:
                chunks = self.db.execute(text("""
                    SELECT id, document_id, content, chunk_index
                    FROM document_chunks
                    WHERE embedding_vector IS NULL
                    LIMIT 1000
                """)).fetchall()

            if not chunks:
                logger.info("No chunks to process")
                return 0

            # Process in batches
            batch_size = 32
            processed = 0

            for i in range(0, len(chunks), batch_size):
                batch = chunks[i:i + batch_size]
                texts = [chunk.content for chunk in batch]
                embeddings = self.generate_embeddings_batch(texts)

                for chunk, embedding in zip(batch, embeddings):
                    if embedding:
                        embedding_str = f"[{','.join(map(str, embedding))}]"
                        self.db.execute(text("""
                            UPDATE document_chunks
                            SET embedding_vector = :embedding::vector
                            WHERE id = :chunk_id
                        """), {
                            'embedding': embedding_str,
                            'chunk_id': chunk.id
                        })
                        processed += 1

                self.db.commit()
                logger.info(f"Processed {processed} chunks...")

            logger.info(f"Rebuilt embeddings for {processed} chunks")
            return processed

        except Exception as e:
            logger.error(f"Error rebuilding embeddings: {e}")
            self.db.rollback()
            return 0

    def get_similar_chunks(
        self,
        chunk_id: int,
        n_results: int = 5
    ) -> List[Dict[str, Any]]:
        """
        Find chunks similar to a given chunk.

        Args:
            chunk_id: ID of the reference chunk
            n_results: Maximum number of similar chunks

        Returns:
            List of similar chunks
        """
        from sqlalchemy import text

        try:
            # Get the embedding of the reference chunk
            ref_chunk = self.db.execute(text("""
                SELECT embedding_vector
                FROM document_chunks
                WHERE id = :chunk_id AND embedding_vector IS NOT NULL
            """), {'chunk_id': chunk_id}).fetchone()

            if not ref_chunk:
                return []

            # Find similar chunks (excluding the reference)
            results = self.db.execute(text("""
                SELECT
                    dc.id,
                    dc.content,
                    dc.document_id,
                    1 - (dc.embedding_vector <=> :ref_embedding) as similarity
                FROM document_chunks dc
                WHERE dc.id != :chunk_id
                AND dc.embedding_vector IS NOT NULL
                ORDER BY dc.embedding_vector <=> :ref_embedding
                LIMIT :limit
            """), {
                'chunk_id': chunk_id,
                'ref_embedding': str(ref_chunk.embedding_vector),
                'limit': n_results
            })

            return [{
                'id': row.id,
                'content': row.content,
                'document_id': row.document_id,
                'similarity': float(row.similarity)
            } for row in results]

        except Exception as e:
            logger.error(f"Error finding similar chunks: {e}")
            return []

    def clear_cache(self):
        """Clear the embedding cache."""
        self._embedding_cache.clear()

    def get_stats(self) -> Dict[str, Any]:
        """Get vector store statistics."""
        from sqlalchemy import text

        try:
            stats = self.db.execute(text("""
                SELECT
                    COUNT(*) as total_chunks,
                    COUNT(embedding_vector) as chunks_with_embeddings,
                    COUNT(DISTINCT document_id) as document_count
                FROM document_chunks
            """)).fetchone()

            return {
                'total_chunks': stats.total_chunks,
                'chunks_with_embeddings': stats.chunks_with_embeddings,
                'document_count': stats.document_count,
                'embedding_model': self.embedding_model_name,
                'embedding_dimension': self.embedding_dimension,
                'cache_size': len(self._embedding_cache)
            }

        except Exception as e:
            logger.error(f"Error getting stats: {e}")
            return {}


# Factory function for getting the appropriate vector store
def get_vector_store(db_session):
    """
    Get the appropriate vector store based on configuration.

    Args:
        db_session: SQLAlchemy database session

    Returns:
        VectorStore instance (PgVectorStore or ChromaDB-based)
    """
    from config.settings import USE_PGVECTOR

    if USE_PGVECTOR:
        return PgVectorStore(db_session)
    else:
        # Fall back to ChromaDB for local development
        from vector_store import VectorStore
        return VectorStore()
