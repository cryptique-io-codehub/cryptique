import json
import os
from typing import Dict, Any, List, Optional, Union
from datetime import datetime
import google.generativeai as genai
from vector_store import VectorStore

class CQIntelligence:
    def __init__(
        self,
        gemini_api_key: str = os.getenv("GEMINI_API"),
        model_name: str = "gemini-pro"
    ):
        """
        Initialize CQ Intelligence with Gemini API and vector store.
        
        Args:
            gemini_api_key: Gemini API key (defaults to GEMINI_API env var)
            model_name: Gemini model to use
        """
        if not gemini_api_key:
            raise ValueError("GEMINI_API environment variable is required")
        
        # Initialize Gemini
        genai.configure(api_key=gemini_api_key)
        self.model = genai.GenerativeModel(model_name)
        
        # Initialize vector store
        self.vector_store = VectorStore()
    
    def _construct_prompt(
        self,
        user_query: str,
        context_chunks: List[Dict[str, Any]],
        expect_graph: bool = False
    ) -> str:
        """
        Construct a detailed prompt for Gemini including context and instructions.
        
        Args:
            user_query: The user's question
            context_chunks: Retrieved context chunks
            expect_graph: Whether to expect graph data in response
            
        Returns:
            Formatted prompt string
        """
        # Format context chunks into a readable format
        formatted_contexts = []
        for chunk in context_chunks:
            timestamp = chunk.get('timestamp_utc', '')
            source_type = chunk.get('data_source_type', 'unknown')
            text = chunk.get('text', '')
            
            formatted_context = f"[{source_type} - {timestamp}]\n{text}"
            formatted_contexts.append(formatted_context)
        
        context_text = "\n\n".join(formatted_contexts)
        
        # Construct the base prompt
        prompt = f"""You are CQ Intelligence, an AI assistant specialized in analyzing web3 and blockchain data.
Your task is to provide accurate, insightful answers based on the provided context.

CONTEXT:
{context_text}

USER QUERY:
{user_query}

INSTRUCTIONS:
1. Base your answer ONLY on the provided context.
2. If the context doesn't contain enough information to answer fully, acknowledge this limitation.
3. Use specific data points and timestamps from the context when relevant.
4. Maintain a professional but conversational tone.
"""

        # Add graph instructions if needed
        if expect_graph:
            prompt += """
5. If the query implies the need for a graph or visualization, include a GRAPH_DATA section in your response using this format:
GRAPH_DATA: {
    "type": "line|bar|pie",
    "data": {
        "labels": [...],
        "datasets": [{
            "label": "...",
            "data": [...]
        }]
    },
    "options": {
        "title": "..."
    }
}

Example graph types:
- Time series: Use "line" for temporal data
- Comparisons: Use "bar" for comparing values
- Distribution: Use "pie" for showing proportions
"""

        prompt += "\nPlease provide your response:"
        
        return prompt
    
    def _parse_gemini_response(self, response: str) -> Dict[str, Any]:
        """
        Parse Gemini's response to extract text answer and potential graph data.
        
        Args:
            response: Raw response from Gemini
            
        Returns:
            Dictionary containing text answer and optional graph data
        """
        result = {
            'text_answer': '',
            'graph_data_json': None
        }
        
        # Split response into text and potential graph data
        parts = response.split('GRAPH_DATA:', 1)
        
        # Extract main text answer
        result['text_answer'] = parts[0].strip()
        
        # Try to extract graph data if present
        if len(parts) > 1:
            try:
                # Find the JSON part
                graph_text = parts[1].strip()
                # Parse JSON, handling both direct JSON and code block format
                if graph_text.startswith('```'):
                    graph_text = graph_text.split('```')[1]
                graph_data = json.loads(graph_text)
                result['graph_data_json'] = graph_data
            except json.JSONDecodeError as e:
                print(f"Warning: Could not parse graph data: {e}")
        
        return result
    
    async def ask_question(
        self,
        user_query: str,
        team_id: str,
        expect_graph: bool = False,
        top_k: int = 5,
        min_score: float = 0.7
    ) -> Dict[str, Any]:
        """
        Process a user query using context from the vector store and Gemini.
        
        Args:
            user_query: The user's question
            team_id: Team ID for context retrieval
            expect_graph: Whether to expect graph data in response
            top_k: Number of context chunks to retrieve
            min_score: Minimum similarity score for chunks
            
        Returns:
            Dictionary containing the answer, optional graph data, and retrieved context
        """
        try:
            # Retrieve relevant context chunks
            context_chunks = self.vector_store.retrieve_relevant_chunks(
                query_text=user_query,
                team_id=team_id,
                top_k=top_k,
                min_score=min_score
            )
            
            if not context_chunks:
                return {
                    'text_answer': "I couldn't find relevant information to answer your question. Please try rephrasing or asking about a different topic.",
                    'graph_data_json': None,
                    'retrieved_context': []
                }
            
            # Construct prompt with context
            prompt = self._construct_prompt(
                user_query=user_query,
                context_chunks=context_chunks,
                expect_graph=expect_graph
            )
            
            # Get response from Gemini
            response = await self.model.generate_content(prompt)
            
            # Parse the response
            result = self._parse_gemini_response(response.text)
            
            # Add retrieved context to result
            result['retrieved_context'] = [chunk['text'] for chunk in context_chunks]
            
            return result
            
        except Exception as e:
            print(f"Error in ask_question: {str(e)}")
            return {
                'text_answer': "I encountered an error while processing your question. Please try again later.",
                'graph_data_json': None,
                'retrieved_context': []
            } 