import sys
import json
import asyncio
from cq_intelligence import CQIntelligence

async def main():
    # Get parameters from command line arguments
    query = sys.argv[1]
    team_id = sys.argv[2]
    expect_graph = sys.argv[3].lower() == 'true'
    top_k = int(sys.argv[4])
    min_score = float(sys.argv[5])
    
    # Initialize CQ Intelligence
    cq = CQIntelligence()
    
    # Process the query
    result = await cq.ask_question(
        user_query=query,
        team_id=team_id,
        expect_graph=expect_graph,
        top_k=top_k,
        min_score=min_score
    )
    
    # Print result as JSON (will be captured by Node.js)
    print(json.dumps(result, default=str))

if __name__ == "__main__":
    asyncio.run(main()) 