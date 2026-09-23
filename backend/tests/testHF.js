/**
 * testHF.js
 * Quick diagnostic tool to test your Hugging Face API Token directly.
 * Usage: node tests/testHF.js
 */

import dotenv from "dotenv";
dotenv.config();

const token = process.env.HF_API_TOKEN;
const model = process.env.HF_LLM_MODEL || "Qwen/Qwen2.5-7B-Instruct";

console.log("\n=======================================================");
console.log("   HUGGING FACE INFERENCE API DIAGNOSTIC TEST");
console.log("=======================================================\n");

if (!token) {
    console.warn("⚠️  HF_API_TOKEN is not set in backend/.env.");
    console.warn("   Yorsa is currently using its built-in offline heuristic fallback.");
    console.log("\nTo connect to real Hugging Face models:");
    console.log("1. Visit: https://huggingface.co/settings/tokens");
    console.log("2. Create a free 'Read' token.");
    console.log("3. Add to backend/.env: HF_API_TOKEN=hf_your_token_here");
    console.log("=======================================================\n");
    process.exit(0);
}

console.log(`🔑 HF_API_TOKEN detected: ${token.substring(0, 6)}...${token.substring(token.length - 4)}`);
console.log(`🤖 Testing target model: ${model}`);
console.log("📡 Sending test inference prompt...\n");

async function runTest() {
    try {
        const response = await fetch(`https://api-inference.huggingface.co/models/${model}`, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                inputs: "Respond with the word SUCCESS if you can read this.",
                parameters: { max_new_tokens: 10 }
            })
        });

        if (response.status === 503) {
            const data = await response.json();
            console.log(`⏳ Model is currently loading (503). Estimated wait: ${data.estimated_time || 15}s.`);
            console.log("   Your token is valid! The model just needs a few seconds to warm up.");
            return;
        }

        if (response.status === 401 || response.status === 403) {
            console.error("❌ Authentication Failed: Invalid token or permissions.");
            console.error("   Ensure your token has 'Read' scope and access to the model.");
            return;
        }

        if (!response.ok) {
            const errText = await response.text();
            console.error(`❌ HTTP Error (${response.status}): ${errText}`);
            return;
        }

        const result = await response.json();
        console.log("✅ HUGGING FACE CONNECTION SUCCESSFUL!");
        console.log("   Model Response:", JSON.stringify(result));
        console.log("\n=======================================================\n");
    } catch (err) {
        console.error("❌ Network or request error:", err.message);
    }
}

runTest();
