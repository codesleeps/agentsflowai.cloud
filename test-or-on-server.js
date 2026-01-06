import 'dotenv/config';

const OR_KEY = process.env.OPENROUTER_API_KEY;

if (!OR_KEY) {
  console.error('❌ OPENROUTER_API_KEY environment variable is required but not set.');
  process.exit(1);
}

async function testOR(model) {
  console.log(`Testing OpenRouter with ${model}...`);
  try {
    const resp = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OR_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://agentsflowai.cloud',
        'X-Title': 'AgentsFlowAI'
      },
      body: JSON.stringify({
        model: model,
        messages: [{role: 'user', content: 'Say hello'}]
      })
    });
    const data = await resp.json();
    if (resp.ok) {
      console.log(`✅ ${model} Success:`, data.choices[0].message.content);
    } else {
      console.log(`❌ ${model} Failed:`, data.error?.message || JSON.stringify(data));
    }
  } catch (e) {
    console.log(`❌ ${model} Error:`, e.message);
  }
}

async function run() {
  await testOR('meta-llama/llama-3.3-70b-instruct:free');
  await testOR('mistralai/mistral-7b-instruct:free');
}
run();
