# ADR-002: WebRTC P2P Mesh with Socket.IO Signaling Architecture

## Status
**Accepted**

## Context
Video conferencing platforms can be architected either as:
1. **Direct Peer-to-Peer Mesh**: Each client establishes an encrypted `RTCPeerConnection` with every other client in the room.
2. **Selective Forwarding Unit (SFU)**: Clients send one upstream to a centralized media server (e.g., mediasoup, Janus, LiveKit), which forwards packets downstream.

The project context specifically requires maintaining the existing MERN + Socket.IO + WebRTC stack without introducing a new frontend framework or database, while supporting executive meeting sessions.

## Decision
We chose to maintain and harden the **WebRTC P2P Mesh with Socket.IO Signaling**:
1. Socket.IO acts exclusively as an SDP/ICE signal broker and real-time room governor.
2. Direct browser-to-browser media paths eliminate server media bandwidth costs.
3. Network quality adaptation (`RTCPeerConnection.getStats()`) mitigates mesh bandwidth demands on low-end connections by auto-pausing video.

## Consequences & Trade-offs
### Positive
- **Zero Media Server Cost**: Backend servers only handle lightweight JSON signaling packets.
- **End-to-End Encryption**: Audio and video media packets are directly encrypted peer-to-peer between client browsers.
- **Low Latency**: Direct peer connections achieve the lowest possible round-trip latency without middlebox packet processing delays.

### Negative / Mitigations
- **Mesh Scalability**: Mesh topology incurs $N \times (N - 1)$ connections, which is optimal for small executive meetings (2-6 peers). For larger webinars (>10 peers), the system would eventually require an SFU layer.
