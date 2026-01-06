import { GoogleGenerativeAI } from '@google/generative-ai';

const GOOGLE_KEY = 'AIzaSyBBtknH5sBalQiVucs8R6rfoW8eJP1El_0';

async function testGoogle(modelName) {
  console.log(`Testing Google with ${modelName}...`);
  try {
    const genAI = new GoogleGenerativeAI(GOOGLE_KEY);
    const model = genAI.getGenerativeModel({ model: modelName });
    const result = await model.generateContent('Say hello');
    console.log(`✅ Google ${modelName} Success!`);
  } catch (e) {
    console.log(`❌ Google ${modelName} Failed:`, e.message);
  }
}

await testGoogle('gemini-2.5-flash');
await testGoogle('gemini-2.5-flash');
await testGoogle('gemini-2.5-pro');
