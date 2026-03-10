require('dotenv').config();
const express = require('express');

const app = express();
app.use(express.json());

// In-memory storage (replace with database in production)
let detectedContainers = [];

// ---------------- POST ROUTE ----------------
app.post('/extract-code', async (req, res) => {
    const { container_code, iso_size_type, confidence, source_file } = req.body;

    if (!container_code) {
        return res.status(400).json({ error: 'Missing container_code' });
    }

    const detection = {
        id: container_code,
        iso_size_type: iso_size_type || null,
        confidence: confidence || 0,
        source_file,
        timestamp: new Date().toISOString()
    };

    detectedContainers.push(detection);

    res.status(200).json({ 
        message: 'Container code received successfully',
        detection 
    });
});

app.get('/view-data', async (req, res) => {
    res.status(200).json({
        count: detectedContainers.length,
        containers: detectedContainers
    });
});

app.get('/view-data/:id', async (req, res) => {
    const id = parseInt(req.params.id);
    const detection = detectedContainers.find(d => d.id === id);
    
    if (!detection) {
        return res.status(404).json({ error: 'Detection not found' });
    }
    
    res.status(200).json(detection);
});

// ---------------- START SERVER ----------------
app.listen(82, () => console.log(`Server running on port 82`));