# 🎥 YORSA — Executive Video Conferencing & AI Intelligence

> **A modern full-stack video meeting platform built with React, Node.js, Express, MongoDB, WebRTC, Socket.IO, and Hugging Face Serverless Inference.**

---

## 📖 Overview

**YORSA** is an executive-grade, real-time video conferencing application designed for high-clarity collaboration. It combines direct peer-to-peer **WebRTC** media streaming with real-time **Socket.IO** signaling and a serverless **Hugging Face AI** layer for speech transcription, executive summaries, interactive mind maps, and collaborative notes.

### Core Architecture Highlights
- **Direct WebRTC Mesh**: Zero-latency peer-to-peer media paths eliminating central media server bottlenecks.
- **AI Meeting Synthesis**: Hugging Face LLM pipeline (`Qwen2.5-7B-Instruct` / `Meta-Llama-3.1-8B-Instruct`) and Whisper STT generating executive briefs, action items, and mind maps.
- **Enterprise Host Governance**: Server-authoritative Mute-All and selective Mic Locking with reconnect state synchronization.
- **Autonomous Network Adaptation**: Autonomous `getStats()` latency and packet-loss monitoring with video auto-pause and hysteresis recovery.
- **Luxury/Editorial Visual System**: Warm alabaster/charcoal/gold styling with Playfair Display and Inter typography.

---

## 📚 Complete Company-Grade Documentation (`/docs`)

Explore our comprehensive engineering documentation structured for production scale:

```
/docs
  ├── architecture/
  │    ├── HLD.md                   # High-Level Design & System Topology
  │    ├── LLD.md                   # Low-Level Design, Schemas & Sequence Diagrams
  │    └── tech-stack.md            # In-Depth Stack Rationale
  ├── api/
  │    ├── api-reference.md         # Complete REST API Specifications
  │    └── socket-events.md         # Socket.IO Real-Time Protocol Contracts
  ├── features/
  │    ├── host-controls.md         # Host Mute-All & Mic Governance Spec
  │    ├── ai-summary-pipeline.md   # Speech-to-Text & AI Synthesis Spec
  │    └── network-adaptation.md    # WebRTC Latency Detection & Auto-Pause Spec
  ├── decisions/
  │    ├── ADR-001-ai-provider.md   # Architecture Decision: Hugging Face API Choice
  │    ├── ADR-002-realtime-signaling.md # Architecture Decision: WebRTC Mesh vs SFU
  │    └── ADR-003-editorial-design-system.md # Architecture Decision: Editorial vs Utility
  └── runbook/
       ├── setup.md                 # Local Dev Setup & Env Configuration
       └── deployment.md            # Production Deployment Checklist
```

---

## ✨ Features Breakdown

| Feature Domain | Capabilities |
| :--- | :--- |
| 📹 **Video Conferencing** | Multi-peer WebRTC mesh, dynamic reflowing grid, spotlight pinning, screen presentation |
| 🛡️ **Host Governance** | Server-verified Mute All, participant mic locking, waiting room gatekeeping, remove attendee |
| 🤖 **AI Synthesis** | Speech-to-text chunk buffering, executive meeting summary, prioritized action items |
| 🗺️ **Visual Mind Maps** | Hierarchical SVG graph tree with pan/zoom, bezier curves, and thematic color coding |
| 📶 **Network Self-Healing** | `getStats()` polling, packet-loss thresholds, auto video pause, 3-point hysteresis recovery |
| 🔗 **Frictionless Invites** | Cryptographic slugs (`/meeting/yorsa-xxxx-xxxx`), Clipboard API toast, WhatsApp & Email share |
| 🎨 **Editorial Design** | Dual-mode aesthetics: Luxury Editorial for workspaces + Google Meet utility for calls |

---

## ⚡ Quick Start

### 1. Configure Backend Environment
Create `backend/.env`:
```env
PORT=8000
MONGO_URI=mongodb://localhost:27017/yorsa
HF_API_TOKEN=hf_your_token_here
```

### 2. Run Locally
```bash
# Terminal 1: Launch Backend API & Signaling Hub
cd backend
npm install
npm run dev

# Terminal 2: Launch React Frontend Application
cd frontend
npm install
npm start
```
*Access the platform at `http://localhost:3000`.*

### 3. Run Integration Test Suite
```bash
cd backend
npm test
```
*Verifies all functional flows: room auto-approval, waiting queue gatekeeper, chat broadcasting, Host Mute-All and Mic Lockdown, WebRTC SDP signal relays, REST link validation, and AI summarization / mind map generation.*

---

## 🛡️ License
Distributed under the ISC License. Built with ❤️ for executive dialogue.
