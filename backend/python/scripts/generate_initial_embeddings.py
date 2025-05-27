import os
import sys
import json
import requests
from dotenv import load_dotenv
from pymongo import MongoClient

# Add parent directory to path to import services
parent_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(parent_dir)

from utils.text_processing import transform_analytics_to_text, transform_contract_to_text
from services.embedding_service import generate_embedding
from services.vector_store_service import store_embedding

# Load environment variables
load_dotenv()

# MongoDB Atlas connection
MONGODB_URI = os.getenv('MONGODB_URI')
DB_NAME = os.getenv('MONGODB_DB_NAME', 'cryptique')

# Initialize MongoDB client
client = MongoClient(MONGODB_URI)
db = client[DB_NAME]

def get_all_websites():
    """Get all websites from the database."""
    try:
        websites = list(db.websites.find())
        print(f"Retrieved {len(websites)} websites from database")
        return websites
    except Exception as e:
        print(f"Error retrieving websites: {e}")
        return []

def get_website_analytics(site_id):
    """Get analytics data for a specific website."""
    try:
        analytics = db.analytics.find_one({"siteId": site_id})
        if analytics:
            print(f"Retrieved analytics for site {site_id}")
            return analytics
        else:
            print(f"No analytics found for site {site_id}")
            return None
    except Exception as e:
        print(f"Error retrieving analytics for site {site_id}: {e}")
        return None

def get_all_contracts():
    """Get all smart contracts from the database."""
    try:
        contracts = list(db.smartcontracts.find())
        print(f"Retrieved {len(contracts)} smart contracts from database")
        return contracts
    except Exception as e:
        print(f"Error retrieving smart contracts: {e}")
        return []

def get_contract_transactions(contract_id):
    """Get transactions for a specific contract."""
    try:
        transactions = list(db.transactions.find({"contractId": contract_id}))
        if transactions:
            print(f"Retrieved {len(transactions)} transactions for contract {contract_id}")
            return transactions
        else:
            print(f"No transactions found for contract {contract_id}")
            return []
    except Exception as e:
        print(f"Error retrieving transactions for contract {contract_id}: {e}")
        return []

def create_website_chunks(website, analytics):
    """Create text chunks from website analytics data."""
    if not analytics:
        return []
    
    site_info = {
        "Domain": website.get("Domain", "Unknown domain"),
        "siteId": website.get("siteId", "Unknown ID")
    }
    
    # Transform analytics data to text
    descriptions = transform_analytics_to_text(analytics, site_info)
    
    # Create chunks with metadata
    chunks = []
    for i, description in enumerate(descriptions):
        chunk = {
            "text": description.strip(),
            "metadata": {
                "source": "website_analytics",
                "siteId": site_info["siteId"],
                "domain": site_info["Domain"],
                "dataType": ["overview", "web3_metrics", "page_metrics"][min(i, 2)],
                "timeRange": "30d"
            }
        }
        chunks.append(chunk)
    
    return chunks

def create_contract_chunks(contract, transactions):
    """Create text chunks from smart contract data."""
    if not transactions:
        return []
    
    # Transform contract data to text
    descriptions = transform_contract_to_text(contract, transactions)
    
    # Create chunks with metadata
    chunks = []
    for description in descriptions:
        chunk = {
            "text": description.strip(),
            "metadata": {
                "source": "smart_contract",
                "contractId": contract.get("_id", "Unknown ID"),
                "address": contract.get("address", "Unknown address"),
                "blockchain": contract.get("blockchain", "Unknown blockchain"),
                "dataType": "overview",
                "timeRange": "all_time"
            }
        }
        chunks.append(chunk)
    
    return chunks

def generate_and_store_embeddings(chunks):
    """Generate embeddings for chunks and store them in the database."""
    success_count = 0
    error_count = 0
    
    for chunk in chunks:
        try:
            # Generate embedding for chunk text
            embedding = generate_embedding(chunk["text"])
            
            # Store chunk with embedding
            store_embedding(chunk["text"], embedding.tolist(), chunk["metadata"])
            
            success_count += 1
        except Exception as e:
            print(f"Error processing chunk: {e}")
            error_count += 1
    
    return success_count, error_count

def main():
    print("Starting initial embedding generation...")
    
    # Process websites
    all_chunks = []
    websites = get_all_websites()
    
    for website in websites:
        site_id = website.get("siteId")
        if not site_id:
            continue
            
        analytics = get_website_analytics(site_id)
        if analytics:
            chunks = create_website_chunks(website, analytics)
            all_chunks.extend(chunks)
            print(f"Created {len(chunks)} chunks for website {site_id}")
    
    # Process contracts
    contracts = get_all_contracts()
    
    for contract in contracts:
        contract_id = contract.get("_id")
        if not contract_id:
            continue
            
        transactions = get_contract_transactions(contract_id)
        if transactions:
            chunks = create_contract_chunks(contract, transactions)
            all_chunks.extend(chunks)
            print(f"Created {len(chunks)} chunks for contract {contract_id}")
    
    # Generate and store embeddings
    print(f"Total chunks to process: {len(all_chunks)}")
    success_count, error_count = generate_and_store_embeddings(all_chunks)
    
    print(f"Embedding generation complete.")
    print(f"Successfully processed: {success_count} chunks")
    print(f"Failed: {error_count} chunks")

if __name__ == "__main__":
    main() 