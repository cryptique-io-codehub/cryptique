from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from datetime import datetime

from transformers import DataTransformer
from chunker import ChunkProcessor
from vector_store import VectorStore
from response_generator import ResponseGenerator

app = FastAPI(title="CQ Intelligence RAG Service")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Update this in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize components
data_transformer = DataTransformer()
chunk_processor = ChunkProcessor()
vector_store = VectorStore()
response_generator = ResponseGenerator()

# Pydantic models for request/response
class ProcessAnalyticsRequest(BaseModel):
    analytics_data: Dict[str, Any]

class ProcessContractRequest(BaseModel):
    contract_data: Dict[str, Any]
    transactions: List[Dict[str, Any]]

class ProcessCampaignRequest(BaseModel):
    campaign_data: Dict[str, Any]

class QueryRequest(BaseModel):
    query: str
    selected_sites: Optional[List[str]] = None
    selected_contracts: Optional[List[str]] = None
    time_period: Optional[str] = "all"

class InsightRequest(BaseModel):
    selected_sites: Optional[List[str]] = None
    selected_contracts: Optional[List[str]] = None
    time_period: Optional[str] = "all"

@app.on_event("startup")
async def startup_event():
    """Initialize vector store indexes on startup."""
    try:
        await vector_store.setup_indexes()
    except Exception as e:
        print(f"Error setting up indexes: {e}")

@app.post("/process/analytics")
async def process_analytics(request: ProcessAnalyticsRequest):
    """Process and store analytics data."""
    try:
        # Transform data to text
        text = data_transformer.transform_analytics_data(request.analytics_data)
        
        # Create chunks
        chunks = chunk_processor.process_analytics_chunk(text, request.analytics_data)
        
        # Store vectors
        chunk_ids = await vector_store.store_vectors(chunks)
        
        return {"status": "success", "processed_chunks": len(chunk_ids)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/process/contract")
async def process_contract(request: ProcessContractRequest):
    """Process and store smart contract data."""
    try:
        # Transform data to text
        text = data_transformer.transform_contract_data(
            request.contract_data,
            request.transactions
        )
        
        # Create chunks
        chunks = chunk_processor.process_contract_chunk(text, request.contract_data)
        
        # Store vectors
        chunk_ids = await vector_store.store_vectors(chunks)
        
        return {"status": "success", "processed_chunks": len(chunk_ids)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/process/campaign")
async def process_campaign(request: ProcessCampaignRequest):
    """Process and store campaign data."""
    try:
        # Transform data to text
        text = data_transformer.transform_campaign_data(request.campaign_data)
        
        # Create chunks
        chunks = chunk_processor.process_campaign_chunk(text, request.campaign_data)
        
        # Store vectors
        chunk_ids = await vector_store.store_vectors(chunks)
        
        return {"status": "success", "processed_chunks": len(chunk_ids)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/query")
async def query_data(request: QueryRequest):
    """Query the vector store and generate a response."""
    try:
        # Search for relevant chunks
        chunks = await vector_store.search_vectors(
            request.query,
            request.selected_sites,
            request.selected_contracts
        )
        
        if not chunks:
            return {
                "status": "no_data",
                "message": "No relevant data found for your query."
            }
        
        # Generate response
        response = await response_generator.generate_response(
            request.query,
            chunks,
            {
                "selected_sites": request.selected_sites or [],
                "selected_contracts": request.selected_contracts or [],
                "time_period": request.time_period
            }
        )
        
        # Generate follow-up questions
        follow_up = await response_generator.generate_follow_up_questions(
            request.query,
            response,
            chunks
        )
        
        return {
            "status": "success",
            "response": response,
            "follow_up_questions": follow_up,
            "chunks_used": len(chunks)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/insights")
async def generate_insights(request: InsightRequest):
    """Generate insights summary from available data."""
    try:
        # Search for all relevant chunks
        chunks = await vector_store.search_vectors(
            "Generate comprehensive analytics insights",
            request.selected_sites,
            request.selected_contracts,
            limit=50  # Get more chunks for comprehensive analysis
        )
        
        if not chunks:
            return {
                "status": "no_data",
                "message": "No data available for insights generation."
            }
        
        # Generate insights
        insights = await response_generator.generate_insights_summary(
            chunks,
            request.time_period
        )
        
        return {
            "status": "success",
            "insights": insights,
            "chunks_used": len(chunks)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/stats")
async def get_stats():
    """Get statistics about stored vectors."""
    try:
        stats = await vector_store.get_vector_stats()
        return {
            "status": "success",
            "stats": stats
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/vectors")
async def delete_vectors(
    website_id: Optional[str] = None,
    contract_id: Optional[str] = None,
    older_than: Optional[str] = None
):
    """Delete vectors based on criteria."""
    try:
        deleted_count = await vector_store.delete_vectors(
            website_id=website_id,
            contract_id=contract_id,
            older_than=older_than
        )
        return {
            "status": "success",
            "deleted_count": deleted_count
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    from config import API_HOST, API_PORT
    
    uvicorn.run(
        "main:app",
        host=API_HOST,
        port=API_PORT,
        reload=True  # Enable auto-reload during development
    ) 