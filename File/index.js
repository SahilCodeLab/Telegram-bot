require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 3000;  // Default to 3000 if not provided by the environment
const apiKey = process.env.API_KEY;  // Use the API key from environment variables

app.use(cors());  // Enable CORS for frontend communication
app.use(bodyParser.json());
app.use(express.static('public'));  // Serve static files from 'public' folder

// Route to handle the message reply
app.post('/reply', async (req, res) => {
    try {
        const userMessage = req.body.message;

        if (!userMessage) {
            return res.status(400).json({ error: 'Message is required' });
        }

        // Use Hugging Face API for generating a response
        const response = await axios.post(
            'https://api-inference.huggingface.co/models/microsoft/DialoGPT-medium', 
            { inputs: userMessage },
            {
                headers: {
                    'Authorization': `Bearer ${apiKey}`,  // Use the Hugging Face token here
                    'Content-Type': 'application/json',
                }
            }
        );

        // Send back the reply from the Hugging Face API
        res.json({ reply: response.data.generated_text || "Sorry, no reply generated." });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Failed to get response from the API' });
    }
});

// Start the server
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
