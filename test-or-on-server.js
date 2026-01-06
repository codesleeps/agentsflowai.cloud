const OR_KEY = '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';

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
  await testOR('meta-llama/llama-3.1-8b-instruct:free');
  await testOR('mistralai/mistral-7b-instruct:free');
}
run();
