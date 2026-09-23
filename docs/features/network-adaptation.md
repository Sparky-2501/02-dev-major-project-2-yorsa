# Feature Specification: WebRTC Network Quality Adaptation

## 1. Overview
In fluctuating mobile and Wi-Fi networks, audio continuity must be preserved at all costs. Video consumes over 85% of total call bandwidth; when latency rises or packets drop, continuing to transmit full HD video causes catastrophic audio stutter, robotic distortion, and dropped connections.

YORSA implements an **autonomous network quality adaptation loop** using the standard W3C `RTCPeerConnection.getStats()` API to prioritize voice intelligibility during congestion.

---

## 2. Adaptation Heuristics & Thresholds

Every 4 seconds, the client polls all active peer connections:

```javascript
// Excerpt from components/NetworkQualityBanner.jsx
const isPoor = currentRtt > 300 || packetLossRate > 5.0;
```

| Metric | Source Stat | Warning Threshold | Action Triggered |
| :--- | :--- | :--- | :--- |
| **Inbound Packet Loss** | `inbound-rtp.packetsLost / totalPackets` | `> 5.0%` | Auto-pause video, reduce audio bitrate |
| **Round-Trip Time (RTT)** | `candidate-pair.currentRoundTripTime` | `> 300ms` | Auto-pause video, display warning banner |
| **Jitter** | `inbound-rtp.jitter` | `> 50ms` | Tracked for telemetry diagnostics |

---

## 3. Bandwidth Conservation Actions
When a threshold breach occurs:
1. **Toast Notification**: A non-blocking amber banner appears: *"Weak network detected. Video temporarily paused for call stability."*
2. **Video Track Disablement**: The local video track is disabled (`localStream.getVideoTracks()[0].enabled = false`). Because WebRTC stops packetizing disabled video tracks, bandwidth consumption immediately drops by 80-90%.
3. **Audio Encoding Optimization**: Audio sender parameters are renegotiated via `RTCRtpSender.setParameters()` to cap bitrate at 24 kbps (optimized speech profile), freeing remaining bandwidth for reliable packet delivery.

---

## 4. Hysteresis Recovery Mechanism
To prevent jarring "flapping" (rapidly turning video on and off when network latency fluctuates near the threshold boundary), YORSA uses **hysteresis windowing**:
- Video is **never** restored immediately after a single good reading.
- The engine requires **3 consecutive good readings** (12 seconds of sustained network stability).
- Once 3 consecutive good readings occur, outgoing video track is re-enabled, audio bitrate returns to 64 kbps, and the status banner confirms: *"Network stabilizing... restoring video stream."*
