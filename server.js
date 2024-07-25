const { OpenAI } = require('openai');
const readline = require('readline');
const axios = require('axios');
require('dotenv').config();

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});


async function streamCompletion(model, prompt, max_tokens, temperature) {
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
                                    process.stdout.write(message.choices[0].delta.content || '');
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
            console.log('\nStream completed.');
        });

    } catch (error) {
        console.error('Error during streaming:', error.message);
    }
}



async function askQuestion() {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    rl.question('Ask a question: ', async (question) => {
        console.log('Response:');
        await streamCompletion('gpt-3.5-turbo', question, 1550, 0.7);
        rl.close();
    });
}

// Run the function
askQuestion();
