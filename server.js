const express = require('express');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 8080;

app.use(cors({
    origin: process.env.ORIGIN,
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type'],
    credentials: true,
}));

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
                stream: true,
            },
            {
                headers: {
                    'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
                    'Content-Type': 'application/json',
                },
                responseType: 'stream',
            }
        );

        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        let buffer = '';

        response.data.on('data', chunk => {
            buffer += chunk.toString();
            let lines = buffer.split('\n');
            buffer = lines.pop();

            for (const line of lines) {
                if (line.startsWith('data:')) {
                    const jsonStr = line.slice(5).trim();

                    if (jsonStr === '[DONE]') {
                        res.write('data: [DONE]\n\n');
                        res.end();
                        return;
                    }

                    try {
                        const message = JSON.parse(jsonStr);
                        if (message.choices && message.choices[0] && message.choices[0].delta) {
                            res.write(`data: ${JSON.stringify(message.choices[0].delta)}\n\n`);
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


app.get('/ask', (req, res) => {
    console.log('GET /ask called');
    const question = req.query.question;
    if (!question) {
        return res.status(400).send('Question is required');
    }
    streamCompletion('gpt-3.5-turbo', question, 1550, 0.7, res);
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
