const express = require('express');
const cors = require('cors');
const axios = require('axios');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const pdf = require('pdf-parse');
const mammoth = require('mammoth'); // For DOCX files
const xlsx = require('xlsx'); // For XLSX files
const csv = require('csv-parser'); // For CSV files
const htmlToText = require('html-to-text'); // For HTML files
const epub = require('epub-parser'); // For EPUB files
const docx = require('docx-parser'); // For DOC files
const { extract } = require('extract-zip'); // For ZIP files
const textract = require('textract'); // For text extraction from various file types
require('dotenv').config();

const app = express();
const port = process.env.PORT || 8080;

// Set up CORS
app.use(cors({
    origin: process.env.ORIGIN,
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type'],
    credentials: true,
}));

// Set up multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/'); // Destination folder for file uploads
    },
    filename: (req, file, cb) => {
        cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage });

// Middleware to parse JSON bodies
app.use(express.json());

// Function to process PDF and extract text
async function processPdf(filePath) {
    try {
        const data = fs.readFileSync(filePath);
        const pdfData = await pdf(data);
        return pdfData.text;
    } catch (error) {
        console.error('Error processing PDF:', error.message);
        return null;
    }
}

// Function to process DOCX and extract text
async function processDocx(filePath) {
    try {
        const data = fs.readFileSync(filePath);
        const docxData = await mammoth.extractRawText({ buffer: data });
        return docxData.value;
    } catch (error) {
        console.error('Error processing DOCX:', error.message);
        return null;
    }
}

// Function to process DOC files (older Microsoft Word format)
async function processDoc(filePath) {
    try {
        const data = fs.readFileSync(filePath);
        const docData = await docx.extract(data);
        return docData.text;
    } catch (error) {
        console.error('Error processing DOC:', error.message);
        return null;
    }
}

// Function to process plain text files
async function processText(filePath) {
    try {
        const data = fs.readFileSync(filePath, 'utf8');
        return data;
    } catch (error) {
        console.error('Error processing text file:', error.message);
        return null;
    }
}

// Function to process XLSX files (Excel)
async function processXlsx(filePath) {
    try {
        const workbook = xlsx.readFile(filePath);
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const data = xlsx.utils.sheet_to_text(sheet);
        return data;
    } catch (error) {
        console.error('Error processing XLSX:', error.message);
        return null;
    }
}

// Function to process CSV files
async function processCsv(filePath) {
    return new Promise((resolve, reject) => {
        let text = '';
        fs.createReadStream(filePath)
            .pipe(csv())
            .on('data', (row) => {
                text += Object.values(row).join(' ') + '\n';
            })
            .on('end', () => {
                resolve(text);
            })
            .on('error', (error) => {
                console.error('Error processing CSV:', error.message);
                reject(null);
            });
    });
}

// Function to process HTML files
async function processHtml(filePath) {
    try {
        const data = fs.readFileSync(filePath, 'utf8');
        const text = htmlToText.fromString(data, { wordwrap: 130 });
        return text;
    } catch (error) {
        console.error('Error processing HTML:', error.message);
        return null;
    }
}

// Function to process EPUB files
async function processEpub(filePath) {
    try {
        const data = fs.readFileSync(filePath);
        const epubData = await epub.parse(data);
        return epubData.text; // Adjust based on the actual EPUB library API
    } catch (error) {
        console.error('Error processing EPUB:', error.message);
        return null;
    }
}

// Function to process JSON files
async function processJson(filePath) {
    try {
        const data = fs.readFileSync(filePath, 'utf8');
        const jsonData = JSON.parse(data);
        return JSON.stringify(jsonData, null, 2); // Pretty print JSON
    } catch (error) {
        console.error('Error processing JSON:', error.message);
        return null;
    }
}

// Function to process ZIP files (extract and process contained files)
async function processZip(filePath) {
    try {
        const tempDir = path.join('uploads', 'temp');
        await extract(filePath, { dir: tempDir });

        const files = fs.readdirSync(tempDir);
        let content = '';
        
        for (const file of files) {
            const filePath = path.join(tempDir, file);
            const fileType = mime.lookup(file);
            const fileContent = await processFile(filePath, fileType);
            content += fileContent + '\n';
        }

        fs.rmdirSync(tempDir, { recursive: true }); // Clean up temp directory
        return content;
    } catch (error) {
        console.error('Error processing ZIP:', error.message);
        return null;
    }
}

// Function to handle various file types
async function processFile(filePath, fileType) {
    switch (fileType) {
        case 'application/pdf':
            return await processPdf(filePath);
        case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document': // MIME type for DOCX
            return await processDocx(filePath);
        case 'application/msword': // MIME type for DOC
            return await processDoc(filePath);
        case 'text/plain': // MIME type for plain text
            return await processText(filePath);
        case 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': // MIME type for XLSX
            return await processXlsx(filePath);
        case 'text/csv': // MIME type for CSV
            return await processCsv(filePath);
        case 'text/html': // MIME type for HTML
            return await processHtml(filePath);
        case 'application/epub+zip': // MIME type for EPUB
            return await processEpub(filePath);
        case 'application/json': // MIME type for JSON
            return await processJson(filePath);
        case 'application/zip': // MIME type for ZIP
            return await processZip(filePath);
        default:
            console.error('Unsupported file type:', fileType);
            return null;
    }
}

// Function to stream completion from OpenAI API
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
                        console.error('Error parsing JSON:', JSON.stringify(err.message));
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

// Endpoint to handle file upload and additional data with streaming
app.post('/upload1', upload.single('document'), async (req, res) => {
    const file = req.file;
    const question = req.body.question;

    if (!question) {
        return res.status(400).send('Question is required.');
    }

    try {
        let prompt;

        if (file) {
            // Determine file type and process accordingly
            const fileType = file.mimetype;
            const filePath = file.path;

            // Process the file and get its text content
            const fileContent = await processFile(filePath, fileType);
            if (!fileContent) {
                return res.status(500).send('Error processing file.');
            }

            // Form the prompt with the extracted text
            prompt = `The document content is:\n${fileContent}\n\nThe question is: ${question}`;

            // Clean up the temporary file
            fs.unlinkSync(filePath);
        } else {
            // Form the prompt without file content
            prompt = `The question is: ${question}`;
        }

        console.log('Prompt for OpenAI:', prompt);

        // Stream the completion from OpenAI
        streamCompletion('gpt-3.5-turbo', prompt, 1550, 0.7, res);
    } catch (error) {
        console.error('Error processing request:', error.message);
        res.status(500).send('Error processing request.');
    }
});

// Test endpoint
app.use('/pankaj', (req, res) => res.json({ Test: "app running" }));

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
