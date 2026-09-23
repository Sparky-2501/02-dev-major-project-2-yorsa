# YORSA — Socket.IO Real-Time Protocol Specification

This document details all real-time events exchanged over the Socket.IO signaling layer between the client and server.

---

## 1. Connection & Room Lifecycle

### 1.1 `request-join`
Emitted by client to request access to a room before establishing peer connections.
- **Direction**: Client -> Server
- **Payload**: `(path: String, username: String, token: String, isCreatorLocal: Boolean)`
- **Behavior**: If the caller is the meeting creator or the first participant in an empty room, access is immediately approved with `isHost: true`. Otherwise, a waiting prompt is dispatched to the room's host.

### 1.2 `join-approved`
Emitted by server to grant room entry to a connecting client.
- **Direction**: Server -> Client
- **Payload**: `{ isHost: Boolean }`

### 1.3 `join-rejected`
Emitted by server when the host declines the client's admission request.
- **Direction**: Server -> Client
- **Payload**: none

### 1.4 `join-call`
Emitted by approved client to enter the WebRTC signaling mesh.
- **Direction**: Client -> Server
- **Payload**: `(path: String, token: String)`
- **Server Action**: Inserts socket into `connections[path]`, records `AttendeeLog` timestamp, emits initial `room-lock-status` and `participant:lockState`, and broadcasts `user-joined` with the complete participant list.

### 1.5 `user-joined`
Broadcasted to all peers in the room when a new participant enters.
- **Direction**: Server -> All Room Clients
- **Payload**: `(newSocketId: String, allSockets: Array<String>, participantData: Array<ParticipantObject>)`

### 1.6 `user-left`
Broadcasted when a client closes their tab or disconnects.
- **Direction**: Server -> Remaining Room Clients
- **Payload**: `(disconnectedSocketId: String)`

---

## 2. WebRTC P2P Signaling

### 2.1 `signal`
Direct point-to-point signaling relay for SDP offers, answers, and ICE routing packets.
- **Direction**: Client -> Server -> Target Client
- **Client Emission**: `socket.emit("signal", toId, JSON.stringify({ sdp | ice }))`
- **Server Relay**: `io.to(toId).emit("signal", fromId, message)`

### 2.2 `screen-share-status`
Broadcasts when a participant begins or ends screen presentation.
- **Direction**: Client -> Server -> Other Room Clients
- **Client Emission**: `socket.emit("screen-share-status", isSharing: Boolean)`
- **Server Relay**: `io.to(otherId).emit("screen-share-status-changed", socket.id, isSharing)`

---

## 3. Host Governance & Mic Control Events (Part 1.6)

### 3.1 `host:muteAll`
Enforces global microphone mute and locks client unmute capabilities.
- **Direction**: Host Client -> Server
- **Payload**: `(path: String)`
- **Authorization**: Verified server-side against authoritative `roomHosts[path]`. Rejects unauthorized senders with `host:error`.
- **Server Action**: Marks `micLocked: true` in server memory and DB, then emits `participant:forceMute` to all non-host participants.

### 3.2 `host:muteParticipant`
Force-mutes a specific attendee.
- **Direction**: Host Client -> Server
- **Payload**: `{ path: String, targetSocketId: String }`

### 3.3 `host:lockMic`
Locks microphone permission for a target attendee.
- **Direction**: Host Client -> Server
- **Payload**: `{ path: String, targetSocketId: String }`
- **Client Action**: Target client disables audio track (`audioTrack.enabled = false`) and disables local unmute toggle.

### 3.4 `host:unlockMic`
Unlocks microphone access for a previously locked participant.
- **Direction**: Host Client -> Server
- **Payload**: `{ path: String, targetSocketId: String }`
- **Client Action**: Target client re-enables normal microphone toggle.

### 3.5 `kick-user`
Removes a participant from the meeting and disconnects their socket.
- **Direction**: Host Client -> Server
- **Payload**: `(guestSocketId: String)`

---

## 4. Chat Messaging

### 4.1 `chat-message`
Broadcasts room text messages.
- **Direction**: Client -> Server -> All Room Clients
- **Payload**: `(messageText: String, senderName: String, socketIdSender: String)`
