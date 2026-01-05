// Test script to verify Ollama connection and AI agent functionality
require('dotenv').config();

async function testAIAgentFallback() {
  console.log("Testing AI Agent fallback mechanism...");
  
  // Import required functions
  const { handleOllamaProvider } = await import('./src/app/api/ai/agents/route.js');
  const { AI_AGENTS } = await import('./src/shared/models/ai-agents.js');
  
  // Find the web development agent
  const webAgent = AI_AGENTS.find(agent => agent.id === 'web-dev-agent');
  console.log("Using agent:", webAgent.name);
  
  // Test with a simple message
  const messages = [
    { role: 'user', content: 'Hello, how are you?', id: 'test-1', agentId: webAgent.id, timestamp: new Date() }
  ];
  
  try {
    console.log("Testing Ollama provider with codellama:7b...");
    const result = await handleOllamaProvider({ ...webAgent, model: 'codellama:7b' }, messages);
    console.log("✅ Ollama test successful!");
    console.log("Response:", result.response);
  } catch (error) {
    console.log("Ollama test failed (this is expected on first run):", error.message);
    console.log("This is normal if the model hasn't been loaded yet.");
  }
  
  console.log("\nTesting Ollama with a simpler model (gemma2:9b)...");
  try {
    const result = await handleOllamaProvider({ ...webAgent, model: 'gemma2:9b' }, messages);
    console.log("✅ Ollama test with gemma2:9b successful!");
    console.log("Response:", result.response);
  } catch (error) {
    console.log("Ollama test with gemma2:9b failed:", error.message);
    console.log("Note: This might be due to timeout on first load of the model.");
  }
}

// Run the test
testAIAgentFallback().catch(console.error);