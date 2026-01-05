import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

async function testGoogleAPI() {
    console.log('🔍 Testing Google API key directly...\n');
    
    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    
    if (!apiKey) {
        console.log('❌ Google API key not found in environment');
        return;
    }
    
    console.log('Testing Google Gemini API key...');
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    
    try {
        const response = await axios.post(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
            {
                contents: [{
                    parts: [{
                        text: "Say hello"
                    }]
                }]
            },
            {
                headers: { 'Content-Type': 'application/json' },
                signal: controller.signal,
                timeout: 10000
            }
        );
        
        clearTimeout(timeoutId);
        
        console.log('✅ Google API key is working!');
        console.log('Response:', response.data.candidates?.[0]?.content?.parts?.[0]?.text?.substring(0, 100) + '...');
        
    } catch (error) {
        clearTimeout(timeoutId);
        console.log('❌ Google API test failed:');
        if (error.response) {
            console.log('Status:', error.response.status);
            console.log('Error:', error.response.data?.error?.message || 'Unknown error');
        } else {
            console.log('Error:', error.message);
        }
    }
}

async function testOpenRouterAPI() {
    console.log('\n🔍 Testing OpenRouter API key directly...\n');
    
    const apiKey = process.env.OPENROUTER_API_KEY;
    
    if (!apiKey) {
        console.log('❌ OpenRouter API key not found in environment');
        return;
    }
    
    console.log('Testing OpenRouter API key...');
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    
    try {
        const response = await axios.post(
            'https://openrouter.ai/api/v1/chat/completions',
            {
                model: "meta-llama/llama-3.1-8b-instruct:free",
                messages: [{ role: "user", content: "Say hello" }]
            },
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`,
                    'HTTP-Referer': 'http://localhost:3000',
                    'X-Title': 'AgentsFlowAI'
                },
                signal: controller.signal,
                timeout: 10000
            }
        );
        
        clearTimeout(timeoutId);
        
        console.log('✅ OpenRouter API key is working!');
        console.log('Response:', response.data.choices?.[0]?.message?.content?.substring(0, 100) + '...');
        
    } catch (error) {
        clearTimeout(timeoutId);
        console.log('❌ OpenRouter API test failed:');
        if (error.response) {
            console.log('Status:', error.response.status);
            console.log('Error:', error.response.data?.error?.message || 'Unknown error');
        } else {
            console.log('Error:', error.message);
        }
    }
}

// Run both tests
testGoogleAPI();
testOpenRouterAPI();