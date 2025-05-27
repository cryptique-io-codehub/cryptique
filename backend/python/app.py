from flask import Flask, request, jsonify
from flask_cors import CORS
import os
from dotenv import load_dotenv
from services.embedding_service import generate_embedding
from services.vector_store_service import store_embedding, search_embeddings

# Load environment variables
load_dotenv()

app = Flask(__name__)
CORS(app)

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({"status": "healthy", "service": "embedding-api"})

@app.route('/embed', methods=['POST'])
def embed_text():
    data = request.json
    if not data or 'text' not in data:
        return jsonify({"error": "Missing text parameter"}), 400
    
    try:
        embedding = generate_embedding(data['text'])
        return jsonify({"embedding": embedding.tolist()})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/store', methods=['POST'])
def store_vector():
    data = request.json
    if not data or 'text' not in data or 'embedding' not in data or 'metadata' not in data:
        return jsonify({"error": "Missing required parameters"}), 400
    
    try:
        result = store_embedding(data['text'], data['embedding'], data['metadata'])
        return jsonify({"success": True, "id": str(result.inserted_id)})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/search', methods=['POST'])
def search_vectors():
    data = request.json
    if not data or 'queryEmbedding' not in data:
        return jsonify({"error": "Missing queryEmbedding parameter"}), 400
    
    limit = data.get('limit', 10)
    filter_query = data.get('filter', {})
    
    try:
        results = search_embeddings(data['queryEmbedding'], limit, filter_query)
        return jsonify({"results": results})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=True) 