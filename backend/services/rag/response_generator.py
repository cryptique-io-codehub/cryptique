import google.generativeai as genai
from typing import Dict, List, Any
from config import GEMINI_API_KEY, GENERATION_MODEL

class ResponseGenerator:
    def __init__(self):
        genai.configure(api_key=GEMINI_API_KEY)
        self.model = genai.GenerativeModel(GENERATION_MODEL)

    def _format_context(self, chunks: List[Dict[str, Any]]) -> str:
        """Format chunks into a context string."""
        context_parts = []
        
        # Group chunks by data type
        grouped_chunks = {}
        for chunk in chunks:
            data_type = chunk['metadata']['data_type']
            if data_type not in grouped_chunks:
                grouped_chunks[data_type] = []
            grouped_chunks[data_type].append(chunk)

        # Format each group
        for data_type, type_chunks in grouped_chunks.items():
            context_parts.append(f"\n=== {data_type.upper()} DATA ===\n")
            for chunk in type_chunks:
                # Add metadata context
                if data_type == 'analytics':
                    context_parts.append(f"Website: {chunk['metadata'].get('website_url', 'Unknown')}")
                elif data_type == 'smart_contract':
                    context_parts.append(
                        f"Contract: {chunk['metadata'].get('contract_address', 'Unknown')} "
                        f"on {chunk['metadata'].get('blockchain', 'Unknown')}"
                    )
                elif data_type == 'campaign':
                    context_parts.append(f"Campaign: {chunk['metadata'].get('campaign_name', 'Unknown')}")
                
                # Add the chunk text
                context_parts.append(chunk['text'])
                context_parts.append("---")

        return "\n".join(context_parts)

    async def generate_response(
        self,
        query: str,
        chunks: List[Dict[str, Any]],
        user_context: Dict[str, Any] = None
    ) -> str:
        """Generate a response using Gemini."""
        try:
            # Format the context from chunks
            context = self._format_context(chunks)
            
            # Build the prompt
            prompt = f"""You are CQ Intelligence, an expert Web3 analytics and marketing intelligence platform.
Your task is to analyze the provided data and answer the user's question with detailed insights.

Context:
{context}

User Context:
- Selected Websites: {len(user_context.get('selected_sites', []))} websites
- Selected Contracts: {len(user_context.get('selected_contracts', []))} contracts
- Time Period: {user_context.get('time_period', 'All time')}

User Question: {query}

Please provide a comprehensive analysis that:
1. Directly answers the user's question
2. Provides specific metrics and data points from the context
3. Offers actionable insights based on the data
4. Highlights any relevant trends or patterns
5. Suggests potential opportunities or areas for improvement

Format your response in a clear, professional manner using markdown formatting.
Use bullet points and sections where appropriate to improve readability.
Include specific numbers and percentages when available.
"""

            # Generate the response
            response = await self.model.generate_content(prompt)
            return response.text

        except Exception as e:
            print(f"Error generating response: {e}")
            error_message = f"""I apologize, but I encountered an error while processing your request.
Please try rephrasing your question or selecting different data sources.

Error details: {str(e)}"""
            return error_message

    async def generate_follow_up_questions(
        self,
        query: str,
        response: str,
        chunks: List[Dict[str, Any]]
    ) -> List[str]:
        """Generate relevant follow-up questions based on the context and response."""
        try:
            prompt = f"""Based on the following interaction, suggest 3 relevant follow-up questions that would help
the user gain deeper insights into their Web3 analytics data.

Original Question: {query}

Response Summary: {response[:500]}...

Available Data Types:
{', '.join(set(chunk['metadata']['data_type'] for chunk in chunks))}

Generate 3 specific, analytics-focused questions that:
1. Dig deeper into interesting patterns
2. Explore correlations between different metrics
3. Investigate potential optimization opportunities

Format each question on a new line, starting with a bullet point (*)."""

            response = await self.model.generate_content(prompt)
            questions = [
                q.strip('* ') for q in response.text.split('\n')
                if q.strip().startswith('*')
            ]
            return questions[:3]  # Ensure we return at most 3 questions

        except Exception as e:
            print(f"Error generating follow-up questions: {e}")
            return []

    async def generate_insights_summary(
        self,
        chunks: List[Dict[str, Any]],
        time_period: str = "all"
    ) -> Dict[str, Any]:
        """Generate a summary of key insights from the available data."""
        try:
            context = self._format_context(chunks)
            
            prompt = f"""Analyze the following analytics data and provide a summary of key insights.
Focus on the most important trends, patterns, and opportunities.

Context:
{context}

Time Period: {time_period}

Please provide:
1. Key metrics overview
2. Notable trends
3. User behavior insights
4. Web3-specific patterns
5. Potential optimization opportunities

Format the response as a structured JSON object with the following keys:
- key_metrics: List of most important metrics
- trends: List of identified trends
- user_insights: List of user behavior insights
- web3_patterns: List of Web3-specific patterns
- opportunities: List of potential optimization opportunities"""

            response = await self.model.generate_content(prompt)
            
            # Parse the response as JSON
            import json
            insights = json.loads(response.text)
            return insights

        except Exception as e:
            print(f"Error generating insights summary: {e}")
            return {
                "key_metrics": [],
                "trends": [],
                "user_insights": [],
                "web3_patterns": [],
                "opportunities": []
            } 