import dotenv from 'dotenv';
import fetch from 'node-fetch';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '.env') });

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
const MODEL = 'gemini-2.5-flash';

async function testGoogle() {
    console.log(`--- Testing Google Gemini ---`);
    if (!GOOGLE_API_KEY) {
        console.error('❌ Error: GOOGLE_API_KEY is not set in .env');
        return;
    }
    console.log(`Model: ${MODEL}`);

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${GOOGLE_API_KEY}`;

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{ text: 'Say "Google Gemini is working!"' }]
                }]
            }),
        });

        const data = await response.json();
        console.log('\n--- Raw Response ---');
        console.log(JSON.stringify(data, null, 2));

        // Safely access properties using type guards
        const responseData = data;
        if (responseData && typeof responseData === 'object') {
            const candidates = responseData['candidates'];
            const error = responseData['error'];
            
            if (candidates && Array.isArray(candidates) && candidates.length > 0) {
                const firstCandidate = candidates[0];
                if (firstCandidate && typeof firstCandidate === 'object') {
                    const content = firstCandidate['content'];
                    if (content && typeof content === 'object') {
                        const parts = content['parts'];
                        if (parts && Array.isArray(parts) && parts.length > 0) {
                            const text = parts[0]?.['text'];
                            if (text) {
                                console.log('\n✅ Success! Answer:', text);
                                return;
                            }
                        }
                    }
                }
            }
            
            if (error) {
                console.log('\n❌ API Error:', typeof error === 'object' && error['message'] ? error['message'] : error);
            } else {
                console.log('\n❌ Failed: Unexpected response structure.');
            }
        } else {
            console.log('\n❌ Failed: Invalid response structure.');
        }
    } catch (error) {
        console.error('\n❌ Error connecting to Google Gemini:', error.message);
    }
}

testGoogle();