#!/usr/bin/env node
/**
 * Simple AI Provider Test
 * Quick test to see which providers are working
 */

// Load environment
require('dotenv').config();

async function testProvider(name, url, headers, body) {
  console.log(`\n🔍 Testing ${name}...`);
  const start = Date.now();
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body)
    });
    
    const time = Date.now() - start;
    
    if (response.ok) {
      const data = await response.json();
      console.log(`✅ ${name}: SUCCESS (${time}ms)`);
      return { success: true, time, data };
    } else {
      const errorText = await response.text();
      console.log(`❌ ${name}: FAILED (${time}ms) - ${response.status}`);
      console.log(`   ${errorText.substring(0, 100)}...`);
      return { success: false, time, error: errorText };
    }
  } catch (error) {
    const time = Date.now() - start;
    console.log(`💥 ${name}: ERROR (${time}ms) - ${error.message}`);
    return { success: false, time, error: error.message };
  }
}

async function runTests() {
  console.log('⚡ Quick AI Provider Test\n');
  
  const tests = [];
  
  // Test Ollama
  if (process.env.OLLAMA_BASE_URL) {
    tests.push(testProvider(
      'Ollama',
      `${process.env.OLLAMA_BASE_URL}/api/generate`,
      { 'Content-Type': 'application/json' },
      {
        model: 'mistral:7b',
        prompt: 'OK',
        stream: false,
        options: { num_predict: 5 }
      }
    ));
  }
  
  // Test OpenRouter
  if (process.env.OPENROUTER_API_KEY) {
    tests.push(testProvider(
      'OpenRouter',
      'https://openrouter.ai/api/v1/chat/completions',
      { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`
      },
      {
        model: 'z-ai/glm-4.5-air',
        messages: [{ role: 'user', content: 'OK' }],
        max_tokens: 5
      }
    ));
  }
  
  // Wait for all tests
  const results = await Promise.all(tests);
  
  console.log('\n📈 Results:');
  results.forEach((result, index) => {
    const testName = ['Ollama', 'OpenRouter'][index];
    console.log(`${testName}: ${result.success ? '✅' : '❌'} (${result.time}ms)`);
  });
}

runTests().catch(console.error);