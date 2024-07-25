const express = require('express');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();

const app = express();
const port = 8080;

app.use(cors());
app.use(express.json());

async function streamCompletion(model, prompt, max_tokens, temperature, res) {
    try {
        const response = await axios.post(
            'https://api.openai.com/v1/chat/completions',
            {
                model: model,
                messages: [{ role: 'user', content: prompt }],
                max_tokens: max_tokens,
                temperature: temperature,
                stream: true
            },
            {
                headers: {
                    'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                responseType: 'stream'
            }
        );

        let buffer = '';
        let accumulatedData = '';

        response.data.on('data', chunk => {
            buffer += chunk.toString();
            let lines = buffer.split('\n');
            buffer = lines.pop();

            for (const line of lines) {
                if (line.startsWith('data:')) {
                    const jsonStr = line.slice(5).trim();
                    
                    try {
                        let message;
                        accumulatedData += jsonStr;
                        while (accumulatedData.length > 0) {
                            try {
                                message = JSON.parse(accumulatedData);
                                if (message.choices && message.choices[0] && message.choices[0].delta) {
                                    res.write(message.choices[0].delta.content || '');
                                }
                                accumulatedData = '';
                            } catch (e) {
                                break;
                            }
                        }
                    } catch (err) {
                        console.error('Error parsing JSON:', err.message);
                    }
                }
            }
        });

        response.data.on('end', () => {
            res.end();
        });

    } catch (error) {
        console.error('Error during streaming:', error.message);
        res.status(500).send('Error during streaming');
    }
}

app.post('/ask', (req, res) => {
    const { question } = req.body;
    if (!question) {
        return res.status(400).send('Question is required');
    }
    res.setHeader('Content-Type', 'text/plain');
    streamCompletion('gpt-3.5-turbo', question, 1550, 0.7, res);
});

app.listen(port, () => {
    console.log('API Key:', process.env.OPENAI_API_KEY);
    console.log(`Server running at http://localhost:${port}`);
});
