const express = require('express');
const router = express.Router();
const { spawn } = require('child_process');
const path = require('path');

// Helper function to run Python script
const runPythonScript = (scriptPath, args) => {
    return new Promise((resolve, reject) => {
        const pythonProcess = spawn('python', [scriptPath, ...args]);
        let result = '';
        let error = '';

        pythonProcess.stdout.on('data', (data) => {
            result += data.toString();
        });

        pythonProcess.stderr.on('data', (data) => {
            error += data.toString();
        });

        pythonProcess.on('close', (code) => {
            if (code !== 0) {
                reject(new Error(`Python process exited with code ${code}: ${error}`));
            } else {
                try {
                    resolve(JSON.parse(result));
                } catch (e) {
                    resolve(result);
                }
            }
        });
    });
};

// Store a chunk with its embedding
router.post('/store', async (req, res) => {
    try {
        const { chunk } = req.body;
        if (!chunk) {
            return res.status(400).json({ error: 'Chunk data is required' });
        }

        const scriptPath = path.join(__dirname, '..', 'python', 'store_chunk.py');
        const result = await runPythonScript(scriptPath, [JSON.stringify(chunk)]);
        
        res.json({ success: true, documentId: result });
    } catch (error) {
        console.error('Error storing chunk:', error);
        res.status(500).json({ error: error.message });
    }
});

// Search for similar chunks
router.post('/search', async (req, res) => {
    try {
        const { queryText, teamId, dataSourceType, limit } = req.body;
        if (!queryText) {
            return res.status(400).json({ error: 'Query text is required' });
        }

        const scriptPath = path.join(__dirname, '..', 'python', 'search_similar.py');
        const args = [
            queryText,
            teamId || '',
            dataSourceType || '',
            limit?.toString() || '5'
        ];

        const results = await runPythonScript(scriptPath, args);
        res.json(results);
    } catch (error) {
        console.error('Error searching chunks:', error);
        res.status(500).json({ error: error.message });
    }
});

// Retrieve relevant chunks
router.post('/retrieve', async (req, res) => {
    try {
        const { queryText, teamId, topK, minScore } = req.body;
        
        // Validate required parameters
        if (!queryText) {
            return res.status(400).json({ error: 'Query text is required' });
        }

        const scriptPath = path.join(__dirname, '..', 'python', 'retrieve_chunks.py');
        const args = [
            queryText,
            teamId || 'null',  // Pass 'null' if teamId is not provided
            topK?.toString() || '5',
            minScore?.toString() || '0.7'
        ];

        const results = await runPythonScript(scriptPath, args);
        res.json(results);
    } catch (error) {
        console.error('Error retrieving chunks:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router; 