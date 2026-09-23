# YORSA — Technology Stack & Architectural Rationale

## 1. Core Stack Overview

| Category | Technology | Version | Rationale & Responsibility |
| :--- | :--- | :--- | :--- |
| **Frontend Framework** | React | 18.2 | Component-driven UI runtime with Virtual DOM, keyed memoization, and hook lifecycles. |
| **Routing** | React Router DOM | 6.21 | Client-side routing for `/`, `/auth`, `/home`, `/history`, and `/meeting/:roomId`. |
| **Styling Architecture** | Vanilla CSS + CSS Modules | Standard | Luxury/Editorial design system with custom CSS variables, 0px radii, and GPU transforms. |
| **Motion & Transitions** | Framer Motion | 12.4 | Cinematic route page transitions and smooth panel entrances. |
| **Backend Runtime** | Node.js (ESM) | 20+ | Event-driven non-blocking I/O server supporting native `fetch` and ES Modules. |
| **Web Application Server** | Express | 5.2 | REST API layer for meeting lifecycle, transcripts, and AI summarization requests. |
| **Signaling & Chat** | Socket.IO | 4.8 | Bidirectional low-latency WebSocket signaling, chat broadcasting, and host governance. |
| **Media Layer** | WebRTC (Mesh) | Standard | Direct browser-to-browser P2P audio, video, and screen sharing streams without media relay overhead. |
| **Database** | MongoDB & Mongoose | 9.7 | NoSQL persistence for user profiles, session tokens, transcripts, attendee logs, and summaries. |
| **AI Inference** | Hugging Face Serverless | REST | Serverless machine learning inference for Whisper STT and Qwen2.5/Llama-3.1 text LLM. |

---

## 2. Real-Time Architecture: WebRTC Mesh vs. SFU

YORSA uses a direct **WebRTC P2P Mesh architecture**:
- **Why Mesh?**: In small-to-medium meeting contexts (2-6 participants), peer-to-peer mesh avoids the high recurring cloud server infrastructure cost of Selective Forwarding Units (SFUs) like Janus, mediasoup, or LiveKit. Browsers stream encrypted SRTP packets directly between each other.
- **Bandwidth Management**: Managed proactively using client-side `RTCPeerConnection.getStats()` monitoring. When a participant experiences packet loss (>5%) or high round-trip time (>300ms), outgoing video is automatically disabled while maintaining audio stream continuity.

---

## 3. Real-Time Signaling: Socket.IO

- **Handshake & Reconnection**: Socket.IO provides automatic heartbeat checks, fallback to long-polling if WebSockets are obstructed by enterprise firewalls, and built-in room clustering.
- **State Synchronization**: Upon reconnection or page refresh, Socket.IO re-syncs the participant's lock state from the server's authoritative memory, preventing muted participants from circumventing host locks by refreshing.

---

## 4. Artificial Intelligence Layer: Hugging Face Inference API

- **Node.js-Only Execution**: Eliminates the operational complexity of deploying a separate Python FastAPI/Flask microservice. All inference calls utilize standard HTTP `fetch` in Node.js.
- **Model Selection**:
  - `openai/whisper-small`: Fast, accurate speech-to-text with minimal latency.
  - `Qwen/Qwen2.5-7B-Instruct`: Superior instruction-following performance for strict JSON generation (executive summary, key topics, action deliverables, and mind map trees).
