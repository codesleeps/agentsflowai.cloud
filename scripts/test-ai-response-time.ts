#!/usr/bin/env node
/**
 * AI Response Time Diagnostic Script
 * Tests each AI provider's response time and availability
 */

import OpenAI from 'openai';
import { promises as fs } from 'fs';

interface ProviderTest {
  name: string;
  testFn: () => Promise<{ success: boolean; timeMs: number; error?: string }>;
}

async function testOpenRouter() {
  if (!process.env.OPENROUTER_API_KEY) {
    return { success: false, timeMs: 0, error: 'API key not configured' };
  }

  const startTime = Date.now();
  try {
    const openrouter = new OpenAI({
      baseURL: "https://openrouter.ai/api/v1",
      apiKey: process.env.OPENROUTER_API_KEY,
    });

    const completion = await openrouter.chat.completions.create({
      model: "z-ai/glm-4.5-air",
      messages: [
        { role: "user", content: "Respond with 'OK' only" },
      ],
      max_tokens: 10,
      temperature: 0.1,
    });

    const timeMs = Date.now() - startTime;
    return { 
      success: true, 
      timeMs,
      response: completion.choices[0]?.message?.content?.trim() || 'No response'
    };
  } catch (error: any) {
    const timeMs = Date.now() - startTime;
    return { success: false, timeMs, error: error.message };
  }
}

async function testAnthropic() {
  if (!process.env.ANTHROPIC_API_KEY) {
    return { success: false, timeMs: 0, error: 'API key not configured' };
  }

  const startTime = Date.now();
  try {
    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    const message = await anthropic.messages.create({
      model: "claude-3-haiku-20240307",
      max_tokens: 10,
      messages: [{ role: "user", content: "Respond with 'OK' only" }],
    });

    const timeMs = Date.now() - startTime;
    return { 
      success: true, 
      timeMs,
      response: message.content[0].type === "text" ? message.content[0].text.trim() : 'No response'
    };
  } catch (error: any) {
    const timeMs = Date.now() - startTime;
    return { success: false, timeMs, error: error.message };
  }
}

async function testOllama() {
  if (!process.env.OLLAMA_BASE_URL) {
    return { success: false, timeMs: 0, error: 'Base URL not configured' };
  }

  const startTime = Date.now();
  try {
    const response = await fetch(`${process.env.OLLAMA_BASE_URL}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "mistral:7b",
        prompt: "OK",
        stream: false,
        options: {
          num_predict: 10,
          temperature: 0.1
        }
      }),
    });

    const data = await response.json();
    const timeMs = Date.now() - startTime;
    
    return { 
      success: response.ok, 
      timeMs,
      response: data.response?.trim() || 'No response'
    };
  } catch (error: any) {
    const timeMs = Date.now() - startTime;
    return { success: false, timeMs, error: error.message };
  }
}

async function runDiagnostics() {
  console.log('🚀 AI Provider Diagnostics\n');
  console.log('='.repeat(50));

  const tests: ProviderTest[] = [
    {
      name: 'OpenRouter (GLM-4.5-Air)',
      testFn: testOpenRouter
    },
    {
      name: 'Anthropic (Claude Haiku)',
      testFn: testAnthropic
    },
    {
      name: 'Ollama (Mistral)',
      testFn: testOllama
    }
  ];

  const results = [];

  for (const test of tests) {
    console.log(`\n🧪 Testing ${test.name}...`);
    try {
      const result = await test.testFn();
      results.push({ ...result, provider: test.name });
      
      if (result.success) {
        console.log(`✅ SUCCESS (${result.timeMs}ms)`);
        console.log(`   Response: ${result.response}`);
      } else {
        console.log(`❌ FAILED (${result.timeMs}ms)`);
        console.log(`   Error: ${result.error}`);
      }
    } catch (error: any) {
      console.log(`💥 CRASHED: ${error.message}`);
      results.push({ 
        provider: test.name, 
        success: false, 
        timeMs: 0, 
        error: error.message 
      });
    }
  }

  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('📊 SUMMARY');
  console.log('='.repeat(50));
  
  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  
  console.log(`✅ Working: ${successful}/${results.length}`);
  console.log(`❌ Failed: ${failed}/${results.length}`);
  
  if (successful > 0) {
    const avgTime = results
      .filter(r => r.success)
      .reduce((sum, r) => sum + r.timeMs, 0) / successful;
    console.log(`⏱️  Avg Response Time: ${Math.round(avgTime)}ms`);
  }

  // Recommendations
  console.log('\n💡 RECOMMENDATIONS:');
  if (failed === results.length) {
    console.log('• All providers failed - check API keys and network connectivity');
    console.log('• Verify environment variables are set correctly');
  } else if (successful > 0) {
    const slowProviders = results
      .filter(r => r.success && r.timeMs > 5000)
      .map(r => `${r.provider} (${r.timeMs}ms)`);
    
    if (slowProviders.length > 0) {
      console.log('• Slow providers detected:');
      slowProviders.forEach(p => console.log(`  - ${p}`));
      console.log('• Consider adjusting timeout settings or using faster models');
    }
    
    console.log('• Application should work with working providers');
  }

  // Save results
  try {
    await fs.writeFile(
      'ai-diagnostics-results.json', 
      JSON.stringify(results, null, 2)
    );
    console.log('\n💾 Results saved to ai-diagnostics-results.json');
  } catch (error) {
    console.log('\n⚠️  Could not save results file');
  }
}

// Import Anthropic if available
let Anthropic: any;
try {
  Anthropic = require('@anthropic-ai/sdk').default;
} catch (error) {
  console.log('⚠️  Anthropic SDK not available');
}

// Load environment variables
require('dotenv').config();

runDiagnostics().catch(console.error);