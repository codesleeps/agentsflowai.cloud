import axios from 'axios';

async function run() {
    console.log('Testing Web Dev Agent API...');
    try {
        const response = await axios.post('http://localhost:3000/api/ai/agents', {
            agentId: 'web-dev-agent',
            message: 'Write a simple React button component',
            conversationHistory: []
        }, {
            headers: {
                'Content-Type': 'application/json'
            },
            timeout: 30000 // 30s timeout
        });
        console.log('Success! Response:', JSON.stringify(response.data, null, 2));
    } catch (error: any) {
        if (error.response) {
            console.error('API Error Status:', error.response.status);
            console.error('API Error Data:', JSON.stringify(error.response.data, null, 2));
        } else {
            console.error('Network/Client Error:', error.message);
        }
    }
}

run();
