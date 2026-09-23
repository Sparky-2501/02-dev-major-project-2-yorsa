# Feature Specification: Host Governance & Mic Lockdown

## 1. Overview
In executive video conferencing, unexpected background noise or unauthorized speaking can disrupt proceedings. YORSA provides enterprise-grade **Host Controls** modeled after Google Meet and Zoom, enabling authorized meeting hosts to unilaterally mute everyone, selectively lock and unlock individual microphones, and admit/kick participants.

---

## 2. Server-Side Security Model
Client-side role checks are strictly non-authoritative. The backend validates every governance request:
1. **Host Verification**: The server inspects `roomHosts[roomId]` and verifies that `socket.id === hostSocketId` or confirms the authenticated user token matches the meeting creator record in MongoDB.
2. **Rejection of Impersonation**: If an attendee script attempts to emit `host:muteAll` or `host:lockMic`, the server rejects the request and returns `{ message: "Unauthorized: only the host can execute this control." }`.
3. **Lock Persistence across Reconnections**: The server maintains `participantLocks[roomId][socketId]` in memory and MongoDB. When a locked participant reloads their browser, `join-call` immediately sends `participant:lockState` with `{ micLocked: true }`, preventing participants from circumventing host locks via page refresh.
4. **Host Departure Handling**: If the meeting host leaves, the server automatically promotes the next senior attendee (`connections[roomId][0]`) to host (`promoted-to-host`), ensuring the room is never left in an unmanageable state.

---

## 3. Frontend Enforcement & User Experience

```
[Host Clicks "Mute All"]
        │
        ▼
[Confirmation Modal]
        │
        ▼
[Socket: host:muteAll]
        │
        ▼
[Backend Validates Host & Broadcasts participant:forceMute]
        │
        ├─────────────────────────────────────────────────┐
        ▼                                                 ▼
[Host Client: Indicator]                     [Participant Client]
Shows lock icon in participant list          1. audioTrack.enabled = false
                                             2. Unmute button disabled
                                             3. Lock icon displayed
                                             4. Non-blocking Toast notification
```

### 3.1 Lock State UI Matrix

| Participant State | Mic Button Icon | Click Behavior | Tooltip Text |
| :--- | :--- | :--- | :--- |
| **Normal Unmuted** | Mic Active (Grey/White) | Mutes local microphone | "Turn off microphone" |
| **Normal Muted** | Mic Off (Red) | Unmutes local microphone | "Turn on microphone" |
| **Locked by Host** | Lock Icon (Red) | **Disabled** (no-op) | "Microphone locked by host" |
