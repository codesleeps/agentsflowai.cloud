import dotenv from 'dotenv';
import fetch from 'node-fetch';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '.env') });

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
const MODEL = process.env.OLLAMA_MODEL || 'mistral:7b';

async function testOllama() {
    console.log(`--- Testing Ollama ---`);
    console.log(`URL: ${OLLAMA_BASE_URL}`);
    console.log(`Model: ${MODEL}`);

    try {
        const response = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
            method: 'POST',
            body: JSON.stringify({
                model: MODEL,
                prompt: 'Say "Ollama is working!"',
                stream: false,
            }),
        });

        /** @type {any} */
        const data = await response.json();
        console.log('\n--- Raw Response ---');
        console.log(JSON.stringify(data, null, 2));

        if (data && data.response) {
            console.log('\n✅ Success! Answer:', data.response);
        } else {
            console.log('\n❌ Failed: No response field found.');
        }
    } catch (error) {
        console.error('\n❌ Error connecting to Ollama:', error.message);
        if (error.code === 'ECONNREFUSED') {
            console.log('Hint: Is Ollama running? Check with `ollama serve`.');
        }
    }
}

testOllama();
