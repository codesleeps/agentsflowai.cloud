const { GoogleGenerativeAI } = require("@google/generative-ai");
const apiKey = process.env.GOOGLE_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;

async function run() {
    if (!apiKey) {
        console.error("No API key");
        return;
    }
    const genAI = new GoogleGenerativeAI(apiKey);
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-image" });
        console.log("Model instance created");
        // We won't call generateContent here as it might cost money/fail without prompt
    } catch (e) {
        console.error("Error creating model:", e.message);
    }
}
run();
