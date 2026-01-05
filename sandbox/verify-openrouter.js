import fs from 'fs';
import dotenv from 'dotenv';
import fetch from 'node-fetch';

const envFile = fs.readFileSync('.env', 'utf8');
const env = dotenv.parse(envFile);
const apiKey = env.OPENROUTER_API_KEY;

async function testOpenRouter() {
    console.log('Testing OpenRouter Handler Logic...');
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
            model: "meta-llama/llama-3.1-405b-instruct:free",
            messages: [
                { role: "system", content: "You are a helpful assistant." },
                { role: "user", content: "Say HELLO WORLD" },
            ],
        }),
    });

    if (!response.ok) {
        const errorData = await response.json();
        console.error('Error:', errorData);
        return;
    }

    /** @type {any} */
    const data = await response.json();
    if (data && data.choices && data.choices[0]) {
        console.log('Response:', data.choices[0].message?.content);
    } else {
        console.log('Error or Unexpected Response:', JSON.stringify(data, null, 2));
    }
}

testOpenRouter();
