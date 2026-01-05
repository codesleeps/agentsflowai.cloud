// Simple test to verify Ollama is configured properly
require('dotenv').config();
const axios = require('axios');

async function testOllamaDirectly() {
  console.log("Testing Ollama configuration...");
  console.log("OLLAMA_BASE_URL:", process.env.OLLAMA_BASE_URL || "Not set");
  
  const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || "http://localhost:11434";
  
  try {
    console.log("Testing Ollama availability...");
    const response = await axios.get(`${OLLAMA_BASE_URL}/api/tags`, {
      timeout: 10000
    });
    
    console.log("✅ Ollama is reachable!");
    console.log("Available models:", response.data.models.length);
    
    // Show a few available models
    const sampleModels = response.data.models.slice(0, 5).map(m => m.name);
    console.log("Sample models:", sampleModels);
    
    // Test with a simple model that should be fast
    console.log("\nTesting with gemma2:9b model...");
    const chatResponse = await axios.post(`${OLLAMA_BASE_URL}/api/chat`, {
      model: "gemma2:9b",
      messages: [{ role: "user", content: "Hello, how are you? Keep your response short." }],
      stream: false,
      options: { 
        temperature: 0.7, 
        top_p: 0.9, 
        num_predict: 50
      },
    }, {
      timeout: 30000 // 30 second timeout
    });

    console.log("✅ Chat test successful!");
    console.log("Response:", chatResponse.data.message?.content || chatResponse.data.response);
    
  } catch (error) {
    console.error("❌ Ollama test failed:", error.message);
    if (error.code === 'ECONNABORTED') {
      console.log("Request timed out - this is normal for first-time model loading");
    } else {
      console.log("Error details:", error.response?.data || error.message);
    }
  }
}

// Run the test
testOllamaDirectly().catch(console.error);