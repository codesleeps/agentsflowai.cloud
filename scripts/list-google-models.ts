import { config } from "dotenv";
import { GoogleGenerativeAI } from "@google/generative-ai";

config();

async function listModels() {
    const apiKey = process.env.GOOGLE_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!apiKey) {
        console.error("No API key found");
        return;
    }

    // Try v1 first
    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1/models?key=${apiKey}`);
        if (response.ok) {
            const data = await response.json();
            console.log("Available Models (v1):");
            data.models?.forEach((m: any) => console.log(`- ${m.name}`));
        } else {
            console.error(`v1 failed: ${response.status} ${response.statusText}`);
        }
    } catch (e) {
        console.error("v1 error:", e);
    }

    // Try v1beta
    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
        if (response.ok) {
            const data = await response.json();
            console.log("Available Models (v1beta):");
            data.models?.forEach((m: any) => console.log(`- ${m.name}`));
        } else {
            console.error(`v1beta failed: ${response.status} ${response.statusText}`);
        }
    } catch (e) {
        console.error("v1beta error:", e);
    }
}

listModels();
