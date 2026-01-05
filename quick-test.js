import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

async function quickTest() {
    console.log('🔍 Quick test of AI providers...\n');
    
    // Test environment variables
    console.log('Environment variables check:');
    console.log('- GOOGLE_GENERATIVE_AI_API_KEY:', process.env.GOOGLE_GENERATIVE_AI_API_KEY ? 'SET' : 'NOT SET');
    console.log('- OPENROUTER_API_KEY:', process.env.OPENROUTER_API_KEY ? 'SET' : 'NOT SET');
    console.log('- OLLAMA_BASE_URL:', process.env.OLLAMA_BASE_URL || 'NOT SET');
    console.log('');
    
    // Test the web agent with a short timeout
    try {
        console.log('Testing web agent with timeout...');
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
        
        const response = await axios.post('http://localhost:3002/api/ai/agents', {
            agentId: 'web-dev-agent',
            message: 'Say hello',
            conversationHistory: []
        }, {
            headers: { 'Content-Type': 'application/json' },
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        console.log('✅ SUCCESS! Response received:');
        console.log('- Model:', response.data.model);
        console.log('- Provider:', response.data.usedProvider);
        console.log('- Fallback used:', response.data.fallbackUsed);
        console.log('- Response preview:', response.data.response?.substring(0, 100) + '...');
        
    } catch (error) {
        clearTimeout(timeoutId);
        console.log('❌ Request failed or timed out after 10 seconds');
        if (error.code === 'ABORT_ERR') {
            console.log('   Reason: Request timed out - likely API key or network issue');
        } else if (error.response) {
            console.log('   Status:', error.response.status);
            console.log('   Data:', error.response.data);
        } else {
            console.log('   Error:', error.message);
        }
    }
}

quickTest();