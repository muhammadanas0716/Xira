from typing import List, Optional
import voyageai
from app.utils.config import Config


class EmbeddingService:
    """Handles text embedding using Voyage AI voyage-finance-2 model"""

    def __init__(self):
        self.client = None
        self.model = "voyage-finance-2"
        self.dimension = 1024
        self.max_tokens = 4096
        self.batch_size = 128

        if Config.VOYAGE_API_KEY:
            self.client = voyageai.Client(api_key=Config.VOYAGE_API_KEY)

    def is_available(self) -> bool:
        return self.client is not None

    def embed_documents(self, texts: List[str]) -> Optional[List[List[float]]]:
        """
        Embed multiple documents in batches.
        Uses input_type='document' for document embeddings.
        """
        if not self.client:
            print("Voyage AI client not initialized")
            return None

        if not texts:
            return []

        try:
            all_embeddings = []

            for i in range(0, len(texts), self.batch_size):
                batch = texts[i:i + self.batch_size]
                print(f"Embedding batch {i // self.batch_size + 1}/{(len(texts) - 1) // self.batch_size + 1} ({len(batch)} texts)")

                result = self.client.embed(
                    texts=batch,
                    model=self.model,
                    input_type="document"
                )

                all_embeddings.extend(result.embeddings)

            print(f"Successfully embedded {len(all_embeddings)} documents")
            return all_embeddings

        except Exception as e:
            print(f"Error embedding documents: {e}")
            import traceback
            traceback.print_exc()
            return None

    def embed_query(self, query: str) -> Optional[List[float]]:
        """
        Embed a single query.
        Uses input_type='query' for query embeddings.
        """
        if not self.client:
            print("Voyage AI client not initialized")
            return None

        if not query or not query.strip():
            return None

        try:
            result = self.client.embed(
                texts=[query],
                model=self.model,
                input_type="query"
            )

            return result.embeddings[0]

        except Exception as e:
            print(f"Error embedding query: {e}")
            import traceback
            traceback.print_exc()
            return None

    def embed_texts(self, texts: List[str], input_type: str = "document") -> Optional[List[List[float]]]:
        """
        Generic embedding method with configurable input_type.
        """
        if input_type == "query" and len(texts) == 1:
            embedding = self.embed_query(texts[0])
            return [embedding] if embedding else None
        return self.embed_documents(texts)


embedding_service = EmbeddingService()
