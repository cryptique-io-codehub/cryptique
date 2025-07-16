"""
Test package for Cryptique Python Data Processing Services
"""

import sys
import os
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

# Test configuration
TEST_CONFIG = {
    'mongodb_uri': 'mongodb://localhost:27017/cryptique_test',
    'gemini_api_key': 'test_key',
    'openai_api_key': 'test_key',
    'test_data_dir': Path(__file__).parent / 'data',
    'batch_size': 10,
    'timeout': 30
}

# Test data samples
SAMPLE_ANALYTICS_DATA = {
    'siteId': 'test_site_123',
    'totalVisitors': 1000,
    'uniqueVisitors': 800,
    'web3Visitors': 200,
    'walletsConnected': 150,
    'totalPageViews': 5000,
    'pageViews': {
        '/': 2000,
        '/dashboard': 1500,
        '/analytics': 1000,
        '/settings': 500
    },
    'sessions': [],
    'userJourneys': [],
    'createdAt': '2024-01-15T10:00:00Z'
}

SAMPLE_SESSION_DATA = {
    'sessionId': 'session_123',
    'userId': 'user_456',
    'siteId': 'test_site_123',
    'duration': 300,
    'pagesViewed': 5,
    'isBounce': False,
    'isWeb3User': True,
    'startTime': '2024-01-15T10:00:00Z',
    'endTime': '2024-01-15T10:05:00Z',
    'browser': {'name': 'Chrome', 'version': '120.0'},
    'device': {'type': 'desktop'},
    'wallet': {
        'walletAddress': '0x1234567890123456789012345678901234567890',
        'walletType': 'MetaMask',
        'chainName': 'Ethereum'
    },
    'utmData': {
        'source': 'google',
        'medium': 'organic',
        'campaign': 'brand'
    }
}

SAMPLE_TRANSACTION_DATA = {
    'tx_hash': '0x1234567890123456789012345678901234567890123456789012345678901234',
    'contractId': 'contract_789',
    'from_address': '0x1234567890123456789012345678901234567890',
    'to_address': '0x0987654321098765432109876543210987654321',
    'value_eth': '1.5',
    'gas_used': 21000,
    'block_number': 18500000,
    'block_time': '2024-01-15T10:00:00Z',
    'status': 'success',
    'token_name': 'USDC',
    'token_symbol': 'USDC',
    'chain': 'ethereum'
}

SAMPLE_EMBEDDING_TEXT = "This is a test document for embedding generation in the Cryptique analytics system."

SAMPLE_EMBEDDING_VECTOR = [0.1] * 1536  # Sample 1536-dimensional vector 