// Simple test to verify Ollama is configured properly
require('dotenv').config();

async function testOllamaDirectly() {
  console.log("Testing Ollama configuration...");
  console.log("OLLAMA_BASE_URL:", process.env.OLLAMA_BASE_URL || "Not set");
  
  const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || "http://localhost:11434";
  
  try {
    console.log("Testing Ollama availability...");
    const response = await fetch(`${OLLAMA_BASE_URL}/api/tags`);
    
    if (!response.ok) {
      throw new Error(`Ollama API returned ${response.status}`);
    }
    
    const data = await response.json();
    console.log("✅ Ollama is reachable!");
    console.log("Available models:", data.models.length);
    
    // Show a few available models
    const sampleModels = data.models.slice(0, 5).map(m => m.name);
    console.log("Sample models:", sampleModels);
    
    // Test with a simple model that should be fast
    console.log("\nTesting with gemma2:9b model...");
    const chatResponse = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gemma2:9b",
        messages: [{ role: "user", content: "Hello, how are you? Keep your response short." }],
        stream: false,
        options: { 
          temperature: 0.7, 
          top_p: 0.9, 
          num_predict: 50,
          num_gpu: 0  // Use CPU only to make it faster
        },
      }),
      signal: AbortSignal.timeout(30000), // 30 second timeout
    });

    if (!chatResponse.ok) {
      throw new Error(`Ollama chat API returned ${chatResponse.status}`);
    }
    
    const chatData = await chatResponse.json();
    console.log("✅ Chat test successful!");
    console.log("Response:", chatData.message?.content || chatData.response);
    
  } catch (error) {
    console.error("❌ Ollama test failed:", error.message);
    console.log("This could be due to:");
    console.log("1. Ollama not running - make sure to start it with 'ollama serve'");
    console.log("2. Model not loaded yet - first request to a model can take time");
    console.log("3. Network timeout - try again after Ollama has loaded the model");
  }
}

// Run the test
testOllamaDirectly().catch(console.error);