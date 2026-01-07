#!/usr/bin/env tsx
/**
 * Ollama Model Warmup Script
 * Proactively loads frequently used models to eliminate first-request latency
 * 
 * Usage:
 *   npm run warmup:ollama
 *   npx tsx scripts/warmup-ollama.ts
 * 
 * Exit codes:
 *   0 - At least one model warmed successfully
 *   1 - All models failed to warm
 */

import { warmupOllamaModels } from '../src/server-lib/ollama-utils';

async function main() {
  console.log('='.repeat(60));
  console.log('Ollama Model Warmup');
  console.log('='.repeat(60));
  
  const models = ['mistral:7b', 'gemma2:9b', 'codellama:7b'];
  
  try {
    const result = await warmupOllamaModels(models);
    
    console.log('\n' + '='.repeat(60));
    console.log('Warmup Results');
    console.log('='.repeat(60));
    
    if (result.warmedModels.length > 0) {
      console.log('\n✅ Successfully warmed models:');
      result.warmedModels.forEach(model => {
        console.log(`   - ${model}`);
      });
    }
    
    if (result.failedModels.length > 0) {
      console.log('\n❌ Failed to warm models:');
      result.failedModels.forEach(model => {
        console.log(`   - ${model}`);
      });
    }
    
    console.log(`\nTotal time: ${(result.totalTime / 1000).toFixed(1)}s`);
    console.log(`Status: ${result.warmedModels.length} warmed, ${result.failedModels.length} failed`);
    
    // Exit with appropriate code
    if (result.warmedModels.length > 0) {
      console.log('\n✅ Warmup completed successfully');
      process.exit(0);
    } else {
      console.log('\n❌ All models failed to warm');
      process.exit(1);
    }
  } catch (error) {
    console.error('\n❌ Warmup script error:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

main();
