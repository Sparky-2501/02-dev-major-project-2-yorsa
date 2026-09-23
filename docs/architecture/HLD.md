# YORSA — High-Level Design (HLD)

## 1. Executive Summary
**YORSA** is an executive-grade, real-time video conferencing platform built on the MERN stack (MongoDB, Express, React, Node.js) and powered by WebRTC peer-to-peer media streams, Socket.IO real-time signaling, and Hugging Face AI Serverless Inference endpoints for real-time speech-to-text, executive summarization, and hierarchical mind map generation.

The platform is designed to decouple real-time media streaming from central server bottlenecks by utilizing direct peer-to-peer WebRTC mesh routing for audio/video, while leveraging a Node.js signaling hub for room governance, waiting-room admission, chat relay, and asynchronous AI intelligence processing.

---

## 2. Overall System Architecture

```mermaid
graph TD
    subgraph Client Layer [Frontend Client (React 18)]
        UI[Luxury/Editorial Outer UI & High-Speed In-Call Utility]
        WebRTC[WebRTC RTCPeerConnection Mesh]
        STT[Web Speech / MediaRecorder STT Feeder]
        SockClient[Socket.IO Client]
        NetMonitor[Network Quality getStats Monitor]
    end

    subgraph Gateway & Application Server [Backend (Node.js & Express 5)]
        HTTP[REST Endpoints /api/meetings & /api/v1/users]
        Signaling[Socket.IO Hub & Host Authorization Gateway]
        AsyncQueue[In-Process Async AI Job Orchestrator]
        AIService[Hugging Face AI Client (aiService.js)]
    end

    subgraph Data Layer [MongoDB Atlas & In-Memory Fallback]
        DB[(MongoDB: Users, Meetings, Transcripts, Summaries, Logs)]
        MemCache[(In-Memory Resilient Cache)]
    end

    subgraph External AI Services [Hugging Face Serverless Inference API]
        Whisper[openai/whisper-small (Speech-To-Text)]
        LLM[Qwen2.5-7B-Instruct / Llama-3.1-8B-Instruct (Summaries & Mind Maps)]
    end

    UI --> SockClient
    UI --> NetMonitor
    UI --> STT
    WebRTC <-->|P2P Audio/Video/Screen Streams| WebRTC

    SockClient <-->|Signaling Offers/Answers, Host Locks, Chat| Signaling
    STT -->|POST /transcript chunks| HTTP
    UI -->|POST /summarize, GET /summary, PUT /notes| HTTP

    HTTP --> DB
    HTTP --> MemCache
    Signaling --> DB
    Signaling --> MemCache

    HTTP --> AsyncQueue
    AsyncQueue --> AIService
    AIService -->|HTTPS Inference Calls| Whisper
    AIService -->|HTTPS Inference Calls| LLM
```

---

## 3. Major Components & Responsibilities

### 3.1 Client Layer (React Single Page Application)
- **Executive Video Workspace**: Google Meet-style layout featuring a reflowing dynamic CSS Grid (`repeat(auto-fit, minmax(280px, 1fr))`), spotlight mode for pinned users or active screen sharing, and fixed 44px+ touch-target controls.
- **Side-Panel Drawer Architecture**: Unified single-source-of-truth drawer (`activePanel`: `chat` | `participants` | `ai` | `null`) that resizes the video grid on desktop and slides over smoothly on mobile.
- **Network Quality Heuristics Engine**: Autonomous `RTCPeerConnection.getStats()` poller calculating inbound packet loss, jitter, and Round-Trip Time (RTT). Automatically pauses outgoing video during threshold breaches (RTT > 300ms, loss > 5%) and restores it via hysteresis.
- **Host Governance UI**: Real-time waiting room approval, selective participant mic locking, and global Mute-All with confirmation safety.

### 3.2 Backend Gateway & Signaling Hub (Node.js / Express)
- **Signaling Server**: Orchestrates WebRTC session descriptions (SDP offers/answers) and ICE candidate exchanges between browser peers without inspecting or proxying video payload.
- **Host Verification Authority**: Enforces server-side authorization checks on all administrative events (`host:muteAll`, `host:lockMic`, `host:unlockMic`, `kick-user`), guaranteeing that malicious client scripts cannot forge host actions.
- **Meeting Lifecycle Manager**: Generates cryptographically unique meeting slugs (`/meeting/yorsa-xxxx-xxxx`), validates session validity, and verifies expiration windows.

### 3.3 Artificial Intelligence Layer (`aiService.js`)
- **Speech-To-Text Ingestion**: Receives live transcript chunks from client media streams, buffering them into MongoDB `Transcript` records.
- **LLM Synthesis**: Invokes Hugging Face Serverless Inference API with strict JSON schema instructions to produce executive briefs, prioritized action deliverables, and thematic mind map trees.
- **Fault-Tolerant Resilience**: Features automatic 503 "model loading" backoff using HF `estimated_time`, rate-limit handling (429), and a smart heuristic fallback engine ensuring 100% demo availability.

### 3.4 Data & State Persistence Layer
- **MongoDB Atlas**: High-availability storage for user credentials, authenticated session tokens, meeting records, attendee logs, transcripts, and AI-generated artifacts.
- **Resilient Memory Cache**: In-memory mirroring for meeting rooms, transcripts, and summaries to ensure uninterrupted zero-downtime execution in offline or non-whitelisted development environments.

---

## 4. Deployment Topology

| Component | Target Runtime | Environment | Scaling Mechanism |
| :--- | :--- | :--- | :--- |
| **Frontend** | Static Bundle (HTML5/CSS3/ES6) | Vercel / Netlify / Render Static | Global Edge CDN distribution |
| **Backend API & Sockets** | Node.js v20+ Long-Term Support | Render / AWS EC2 / Container | Horizontal Pod Autoscaling with Redis Adapter |
| **Database** | MongoDB Atlas Cluster | Managed Cloud (AWS us-east-1) | Replica Set with primary failover |
| **AI Inference** | Hugging Face Inference API | Serverless Cloud Infrastructure | On-demand auto-scaled inference endpoints |
