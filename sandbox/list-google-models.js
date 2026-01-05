import dotenv from 'dotenv';
import fetch from 'node-fetch';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '.env') });

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;

async function listModels() {
    console.log(`--- Listing Google Models ---`);
    if (!GOOGLE_API_KEY) {
        console.error('❌ Error: GOOGLE_API_KEY is not set');
        return;
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${GOOGLE_API_KEY}`;

    try {
        const response = await fetch(url);
        const data = await response.json();

        if (data && typeof data === 'object' && 'models' in data) {
            console.log('Available Models:');
            (data.models).forEach(m => console.log(` - ${m.name} (${m.displayName})`));
        } else {
            console.log('Error or No Models:', JSON.stringify(data, null, 2));
        }
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

listModels();
