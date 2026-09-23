# YORSA Runbook: Local Development Setup

## 1. Prerequisites
- **Node.js**: v18.0.0 or higher (v20+ LTS recommended, tested up to v24).
- **npm**: v9.0.0 or higher.
- **MongoDB**: MongoDB Atlas connection string (or local MongoDB running on `mongodb://localhost:27017/yorsa`).
- **Hugging Face Account**: Free user account at [huggingface.co](https://huggingface.co).

---

## 2. Environment Variables Configuration

Create a `.env` file inside the `/backend` directory:

```env
# Backend Server Port
PORT=8000

# MongoDB Connection String (Atlas or Local)
MONGO_URI=mongodb://localhost:27017/yorsa

# Hugging Face Inference API Token (Read Scope)
HF_API_TOKEN=hf_your_token_here

# Optional Model Overrides
HF_LLM_MODEL=Qwen/Qwen2.5-7B-Instruct
HF_STT_MODEL=openai/whisper-small
```

### How to Obtain your Hugging Face Token:
1. Log into your account at [huggingface.co](https://huggingface.co).
2. Click your avatar (top-right) -> **Settings** -> **Access Tokens**.
3. Click **New token**, select **Read** scope, and give it a name (e.g. `yorsa-backend`).
4. Copy the `hf_...` token and paste it into `backend/.env`.
*(Note: If the token is omitted during local development, YORSA automatically uses its built-in heuristic synthesis engine so that meetings and mind maps continue to function seamlessly).*

---

## 3. Installation & Local Execution

### 3.1 Backend Installation & Startup
```bash
# Navigate to backend directory
cd backend

# Install dependencies
npm install

# Start in development mode with nodemon auto-reload
npm run dev

# Or start directly
npm start
```
*The backend server will launch and listen on `http://localhost:8000`.*

### 3.2 Frontend Installation & Startup
```bash
# Open a new terminal and navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Start React dev server
npm start
```
*The React client will launch at `http://localhost:3000`.*

---

## 4. Running the Automated Test Suite

```bash
cd backend
npm test
```
*Executes the complete integration suite verifying room auto-approval, waiting queue gatekeeping, chat broadcasting, Host Mute-All and Mic Lockdown, WebRTC SDP signal relays, REST link validation, and AI summarization / mind map generation.*
