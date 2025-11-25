"""
Vector Store Module
Handles document embeddings and semantic search using ChromaDB
"""
import os
import chromadb
from chromadb.config import Settings
from sentence_transformers import SentenceTransformer
from typing import List, Dict, Tuple
import logging
from functools import lru_cache
import hashlib
import time

logger = logging.getLogger(__name__)


class VectorStore:
    """Manage document embeddings and semantic search"""

    def __init__(self, persist_directory="data/knowledge/chromadb", cache_size=100, cache_ttl=300):
        """Initialize vector store with ChromaDB"""
        self.persist_directory = persist_directory
        os.makedirs(persist_directory, exist_ok=True)

        # Initialize ChromaDB client
        self.client = chromadb.PersistentClient(
            path=persist_directory,
            settings=Settings(
                anonymized_telemetry=False,
                allow_reset=True
            )
        )

        # Get or create collection
        self.collection = self.client.get_or_create_collection(
            name="documents",
            metadata={"description": "Document chunks with embeddings"}
        )

        # Initialize embedding model
        logger.info("Loading sentence transformer model...")
        self.model = SentenceTransformer('all-MiniLM-L6-v2')  # Fast, lightweight model
        logger.info("Model loaded successfully")

        # Query result cache (query_hash -> (results, timestamp))
        self.query_cache = {}
        self.cache_ttl = cache_ttl  # Cache time-to-live in seconds
        self.max_cache_size = cache_size

    def generate_embedding(self, text: str) -> List[float]:
        """Generate embedding vector for text"""
        try:
            embedding = self.model.encode(text, convert_to_numpy=True)
            return embedding.tolist()
        except Exception as e:
            logger.error(f"Error generating embedding: {e}")
            return []

    def add_chunks(self, chunks: List[Dict], document_id: int):
        """Add document chunks to vector store"""
        try:
            ids = []
            embeddings = []
            documents = []
            metadatas = []

            for chunk in chunks:
                chunk_id = f"doc{document_id}_chunk{chunk['chunk_index']}"
                embedding = self.generate_embedding(chunk['content'])

                if embedding:
                    ids.append(chunk_id)
                    embeddings.append(embedding)
                    documents.append(chunk['content'])
                    metadatas.append({
                        'document_id': document_id,
                        'chunk_index': chunk['chunk_index'],
                        'token_count': chunk['token_count']
                    })

            if ids:
                self.collection.add(
                    ids=ids,
                    embeddings=embeddings,
                    documents=documents,
                    metadatas=metadatas
                )
                logger.info(f"Added {len(ids)} chunks to vector store")
                return True
            return False

        except Exception as e:
            logger.error(f"Error adding chunks to vector store: {e}")
            return False

    def _generate_cache_key(self, query: str, n_results: int) -> str:
        """Generate cache key for query"""
        key_str = f"{query}:{n_results}"
        return hashlib.md5(key_str.encode()).hexdigest()

    def _clean_cache(self):
        """Remove expired entries from cache"""
        current_time = time.time()
        expired_keys = [
            key for key, (_, timestamp) in self.query_cache.items()
            if current_time - timestamp > self.cache_ttl
        ]
        for key in expired_keys:
            del self.query_cache[key]

        # If cache is still too large, remove oldest entries
        if len(self.query_cache) > self.max_cache_size:
            sorted_cache = sorted(
                self.query_cache.items(),
                key=lambda x: x[1][1]  # Sort by timestamp
            )
            # Keep only the most recent entries
            self.query_cache = dict(sorted_cache[-self.max_cache_size:])

    def search(self, query: str, n_results: int = 5, use_cache: bool = True) -> List[Dict]:
        """
        Semantic search for relevant chunks with caching
        Returns list of results with content, metadata, and distance
        """
        try:
            # Check cache first
            if use_cache:
                cache_key = self._generate_cache_key(query, n_results)
                if cache_key in self.query_cache:
                    cached_results, timestamp = self.query_cache[cache_key]
                    # Check if cache is still valid
                    if time.time() - timestamp <= self.cache_ttl:
                        logger.debug(f"Cache hit for query: {query[:50]}...")
                        return cached_results
                    else:
                        # Remove expired entry
                        del self.query_cache[cache_key]

            # Generate query embedding
            query_embedding = self.generate_embedding(query)

            if not query_embedding:
                return []

            # Search in ChromaDB
            results = self.collection.query(
                query_embeddings=[query_embedding],
                n_results=n_results,
                include=['documents', 'metadatas', 'distances']
            )

            # Format results
            search_results = []
            if results and results['documents'] and len(results['documents']) > 0:
                for i in range(len(results['documents'][0])):
                    search_results.append({
                        'content': results['documents'][0][i],
                        'metadata': results['metadatas'][0][i],
                        'distance': results['distances'][0][i],
                        'relevance': 1 - results['distances'][0][i]  # Convert distance to relevance score
                    })

            # Cache the results
            if use_cache and search_results:
                cache_key = self._generate_cache_key(query, n_results)
                self.query_cache[cache_key] = (search_results, time.time())
                self._clean_cache()

            return search_results

        except Exception as e:
            logger.error(f"Error searching vector store: {e}")
            return []

    def delete_document(self, document_id: int):
        """Delete all chunks for a document from vector store"""
        try:
            # Get all chunk IDs for this document
            results = self.collection.get(
                where={"document_id": document_id}
            )

            if results and results['ids']:
                self.collection.delete(ids=results['ids'])
                logger.info(f"Deleted {len(results['ids'])} chunks for document {document_id}")
                return True
            return False

        except Exception as e:
            logger.error(f"Error deleting document from vector store: {e}")
            return False

    def get_collection_stats(self) -> Dict:
        """Get statistics about the vector store"""
        try:
            count = self.collection.count()
            return {
                'total_chunks': count,
                'model': 'all-MiniLM-L6-v2',
                'embedding_dimension': 384
            }
        except Exception as e:
            logger.error(f"Error getting collection stats: {e}")
            return {
                'total_chunks': 0,
                'model': 'all-MiniLM-L6-v2',
                'embedding_dimension': 384
            }


# Singleton instance
_vector_store = None

def get_vector_store():
    """Get or create vector store instance"""
    global _vector_store
    if _vector_store is None:
        _vector_store = VectorStore()
    return _vector_store
