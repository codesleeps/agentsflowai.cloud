import { GoogleGenerativeAI } from '@google/generative-ai';
const GOOGLE_KEY = 'AIzaSyCE1NjVylmvBxxERZ7Wfuzp3J7uZTfkPP0';

async function testGoogle() {
  console.log('Testing Google Gemini with new key...');
  try {
    const genAI = new GoogleGenerativeAI(GOOGLE_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const result = await model.generateContent('Say hello');
    console.log('✅ Google Success:', result.response.text());
  } catch (e) {
    console.log('❌ Google Failed:', e.message);
  }
}

testGoogle();
