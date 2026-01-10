from typing import List, Dict, Optional
from dataclasses import dataclass
from pinecone import Pinecone
from app.utils.config import Config
from app.services.embedding_service import embedding_service


@dataclass
class ChunkData:
    """Data structure for a document chunk"""
    id: str
    text: str
    metadata: Dict


@dataclass
class QueryResult:
    """Data structure for a query result"""
    id: str
    score: float
    text: str
    metadata: Dict


class VectorService:
    """Handles Pinecone vector database operations"""

    def __init__(self):
        self.client = None
        self.index = None
        self.index_name = Config.PINECONE_INDEX_NAME

        if Config.PINECONE_API_KEY:
            try:
                self.client = Pinecone(api_key=Config.PINECONE_API_KEY)
                self.index = self.client.Index(self.index_name)
                print(f"Connected to Pinecone index: {self.index_name}")
            except Exception as e:
                print(f"Error connecting to Pinecone: {e}")

    def is_available(self) -> bool:
        return self.index is not None and embedding_service.is_available()

    def upsert_chunks(self, chunks: List[ChunkData], namespace: str) -> bool:
        """
        Store document chunks with embeddings in Pinecone.
        """
        if not self.is_available():
            print("Vector service not available")
            return False

        if not chunks:
            print("No chunks to upsert")
            return False

        try:
            texts = [chunk.text for chunk in chunks]
            embeddings = embedding_service.embed_documents(texts)

            if not embeddings:
                print("Failed to generate embeddings")
                return False

            vectors = []
            for chunk, embedding in zip(chunks, embeddings):
                metadata = chunk.metadata.copy()
                metadata['text'] = chunk.text[:1000]

                vectors.append({
                    'id': chunk.id,
                    'values': embedding,
                    'metadata': metadata
                })

            batch_size = 100
            for i in range(0, len(vectors), batch_size):
                batch = vectors[i:i + batch_size]
                self.index.upsert(vectors=batch, namespace=namespace)
                print(f"Upserted batch {i // batch_size + 1}/{(len(vectors) - 1) // batch_size + 1}")

            print(f"Successfully upserted {len(vectors)} vectors to namespace: {namespace}")
            return True

        except Exception as e:
            print(f"Error upserting chunks: {e}")
            import traceback
            traceback.print_exc()
            return False

    def query(
        self,
        query_text: str,
        namespace: str,
        top_k: int = None,
        filter_dict: Optional[Dict] = None
    ) -> List[QueryResult]:
        """
        Query Pinecone for relevant chunks.
        """
        if not self.is_available():
            print("Vector service not available")
            return []

        if top_k is None:
            top_k = Config.RETRIEVAL_TOP_K

        try:
            query_embedding = embedding_service.embed_query(query_text)

            if not query_embedding:
                print("Failed to generate query embedding")
                return []

            query_params = {
                'vector': query_embedding,
                'top_k': top_k,
                'include_metadata': True,
                'namespace': namespace
            }

            if filter_dict:
                query_params['filter'] = filter_dict

            results = self.index.query(**query_params)

            query_results = []
            for match in results.matches:
                text = match.metadata.get('text', '') if match.metadata else ''
                query_results.append(QueryResult(
                    id=match.id,
                    score=match.score,
                    text=text,
                    metadata=match.metadata or {}
                ))

            print(f"Query returned {len(query_results)} results from namespace: {namespace}")
            return query_results

        except Exception as e:
            print(f"Error querying vectors: {e}")
            import traceback
            traceback.print_exc()
            return []

    def delete_namespace(self, namespace: str) -> bool:
        """
        Delete all vectors in a namespace.
        """
        if not self.index:
            print("Pinecone index not available")
            return False

        try:
            self.index.delete(delete_all=True, namespace=namespace)
            print(f"Deleted all vectors in namespace: {namespace}")
            return True

        except Exception as e:
            print(f"Error deleting namespace: {e}")
            import traceback
            traceback.print_exc()
            return False

    def get_namespace_stats(self, namespace: str) -> Optional[Dict]:
        """
        Get statistics about a namespace.
        """
        if not self.index:
            return None

        try:
            stats = self.index.describe_index_stats()
            ns_stats = stats.namespaces.get(namespace, {})

            return {
                'vector_count': ns_stats.vector_count if hasattr(ns_stats, 'vector_count') else 0,
                'namespace': namespace
            }

        except Exception as e:
            print(f"Error getting namespace stats: {e}")
            return None

    def namespace_exists(self, namespace: str) -> bool:
        """
        Check if a namespace has any vectors.
        """
        stats = self.get_namespace_stats(namespace)
        return stats is not None and stats.get('vector_count', 0) > 0


vector_service = VectorService()
