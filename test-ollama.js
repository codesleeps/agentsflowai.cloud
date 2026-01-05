// Test script to verify Ollama connection
const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || "http://localhost:11434";

async function testOllamaConnection() {
  try {
    console.log("Testing Ollama connection...");
    
    // Test if Ollama is reachable
    const response = await fetch(`${OLLAMA_BASE_URL}/api/tags`);
    
    if (!response.ok) {
      throw new Error(`Ollama API returned ${response.status}`);
    }
    
    const data = await response.json();
    console.log("✅ Ollama is reachable!");
    console.log("Available models:", data.models.slice(0, 5).map(m => m.name)); // Show first 5 models
    
    // Test a simple chat request
    console.log("\nTesting chat completion with mistral:7b...");
    const chatResponse = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "mistral:7b",
        messages: [{ role: "user", content: "Hello, how are you? Keep your response short." }],
        stream: false,
        options: { temperature: 0.7, top_p: 0.9, num_predict: 100 },
      }),
      signal: AbortSignal.timeout(10000), // 10 second timeout
    });

    if (!chatResponse.ok) {
      throw new Error(`Ollama chat API returned ${chatResponse.status}`);
    }
    
    const chatData = await chatResponse.json();
    console.log("✅ Chat test successful!");
    console.log("Response:", chatData.message?.content || chatData.response);
    
  } catch (error) {
    console.error("❌ Ollama test failed:", error.message);
  }
}

// Run the test
testOllamaConnection();