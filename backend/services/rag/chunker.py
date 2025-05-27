from typing import Dict, List, Any
from datetime import datetime
from config import MAX_CHUNK_SIZE, CHUNK_OVERLAP

class TextChunker:
    @staticmethod
    def create_chunks(text: str, metadata: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Split text into overlapping chunks while preserving semantic meaning."""
        if not text:
            return []

        # Split text into paragraphs
        paragraphs = [p.strip() for p in text.split('\n') if p.strip()]
        chunks = []
        current_chunk = []
        current_length = 0

        for paragraph in paragraphs:
            # If adding this paragraph would exceed max size, save current chunk
            if current_length + len(paragraph) > MAX_CHUNK_SIZE and current_chunk:
                chunk_text = '\n'.join(current_chunk)
                chunks.append({
                    'text': chunk_text,
                    'metadata': {
                        **metadata,
                        'chunk_id': len(chunks),
                        'timestamp': datetime.utcnow().isoformat(),
                        'length': len(chunk_text)
                    }
                })
                # Keep last paragraph for overlap if it's not too large
                if len(current_chunk) > 1 and len(current_chunk[-1]) <= CHUNK_OVERLAP:
                    current_chunk = [current_chunk[-1]]
                    current_length = len(current_chunk[-1])
                else:
                    current_chunk = []
                    current_length = 0

            current_chunk.append(paragraph)
            current_length += len(paragraph)

        # Don't forget the last chunk
        if current_chunk:
            chunk_text = '\n'.join(current_chunk)
            chunks.append({
                'text': chunk_text,
                'metadata': {
                    **metadata,
                    'chunk_id': len(chunks),
                    'timestamp': datetime.utcnow().isoformat(),
                    'length': len(chunk_text)
                }
            })

        return chunks

class ChunkProcessor:
    def __init__(self):
        self.chunker = TextChunker()

    def process_analytics_chunk(self, text: str, analytics_data: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Process analytics data into chunks with metadata."""
        metadata = {
            'data_type': 'analytics',
            'website_id': analytics_data.get('siteId'),
            'website_url': analytics_data.get('websiteUrl'),
            'source': 'website_analytics'
        }
        return self.chunker.create_chunks(text, metadata)

    def process_contract_chunk(self, text: str, contract_data: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Process contract data into chunks with metadata."""
        metadata = {
            'data_type': 'smart_contract',
            'contract_id': contract_data.get('id'),
            'contract_address': contract_data.get('address'),
            'blockchain': contract_data.get('blockchain'),
            'source': 'blockchain_data'
        }
        return self.chunker.create_chunks(text, metadata)

    def process_campaign_chunk(self, text: str, campaign_data: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Process campaign data into chunks with metadata."""
        metadata = {
            'data_type': 'campaign',
            'campaign_id': campaign_data.get('_id'),
            'campaign_name': campaign_data.get('name'),
            'source': 'marketing_campaign'
        }
        return self.chunker.create_chunks(text, metadata) 