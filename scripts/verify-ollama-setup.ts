#!/usr/bin/env tsx

/**
 * Ollama Setup Verification Script
 *
 * This script verifies Ollama configuration and checks if required models are available.
 * Run with: npm run verify-ollama or npx tsx scripts/verify-ollama-setup.ts
 */

import { checkOllamaHealth, getAvailableOllamaModels, isModelAvailable } from '../src/server-lib/ollama-utils';

const REQUIRED_MODELS = [
  { name: 'mistral:7b', description: 'Fast Chat Agent, Marketing Agent, SEO Agent', size: '3.8GB' },
  { name: 'llama3.1:8b', description: 'Web Dev Agent, Social Media Agent', size: '4.7GB' },
  { name: 'gemma2:9b', description: 'Content Agent, Gemini Agent', size: '5.4GB' },
];

async function main() {
  console.log('🔍 Verifying Ollama setup...\n');

  // Check environment variables
  const ollamaUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
  console.log(`📍 Ollama URL: ${ollamaUrl}`);

  // Test Ollama connectivity
  console.log('\n🔌 Testing Ollama connectivity...');
  const healthCheck = await checkOllamaHealth();

  if (!healthCheck.available) {
    console.log('❌ Ollama service not reachable');
    console.log(`   Error: ${healthCheck.error}`);
    console.log('\n💡 Quick fix:');
    console.log('   1. Install Ollama: https://ollama.com');
    console.log('   2. Start Ollama: ollama serve');
    console.log('   3. Or set OLLAMA_BASE_URL if running on different port/host');
    process.exit(1);
  }

  console.log('✅ Ollama service is running');

  // List available models
  console.log('\n📦 Checking available models...');
  const availableModels = await getAvailableOllamaModels();

  if (!availableModels.available) {
    console.log('❌ Could not fetch model list');
    console.log(`   Error: ${availableModels.error}`);
    process.exit(1);
  }

  console.log(`✅ Found ${availableModels.models.length} installed model(s):`);
  availableModels.models.forEach(model => {
    console.log(`   • ${model}`);
  });

  // Check required models
  console.log('\n🔍 Checking required models for AgentsFlowAI...');
  const missingModels: typeof REQUIRED_MODELS = [];
  const availableRequiredModels: typeof REQUIRED_MODELS = [];

  for (const model of REQUIRED_MODELS) {
    const isAvailable = await isModelAvailable(model.name);
    if (isAvailable) {
      availableRequiredModels.push(model);
      console.log(`✅ ${model.name} (${model.size}) - ${model.description}`);
    } else {
      missingModels.push(model);
      console.log(`❌ ${model.name} (${model.size}) - ${model.description}`);
    }
  }

  // Report results
  console.log('\n📊 Summary:');

  if (missingModels.length === 0) {
    console.log('🎉 All required models are available!');
    console.log('\n🚀 Ready to use AgentsFlowAI with Ollama!');
  } else {
    console.log(`⚠️  ${missingModels.length} model(s) need to be pulled:`);
    missingModels.forEach(model => {
      console.log(`   ollama pull ${model.name}`);
    });

    console.log('\n💡 To pull all missing models:');
    missingModels.forEach(model => {
      console.log(`   ollama pull ${model.name}  # ${model.description}`);
    });

    const totalSize = missingModels.reduce((sum, model) => {
      const sizeGB = parseFloat(model.size.replace('GB', ''));
      return sum + sizeGB;
    }, 0);

    console.log(`\n💾 Estimated download size: ${totalSize.toFixed(1)}GB`);
  }

  // Test generation if at least one model is available
  if (availableRequiredModels.length > 0) {
    console.log('\n🧪 Testing generation with first available model...');
    const testModel = availableRequiredModels[0].name;

    try {
      const startTime = Date.now();
      const response = await fetch(`${ollamaUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: testModel,
          prompt: 'Hello! Please respond with just "Ollama is working!"',
          stream: false,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const result = await response.json();
      const duration = Date.now() - startTime;

      console.log(`✅ Test generation successful (${duration}ms)`);
      console.log(`   Response: ${result.response?.trim()}`);
    } catch (error) {
      console.log(`❌ Test generation failed: ${error}`);
    }
  }

  console.log('\n📚 For more information, see: docs/OLLAMA_SETUP.md');
}

// Handle script execution
if (require.main === module) {
  main().catch(error => {
    console.error('Script failed:', error);
    process.exit(1);
  });
}
