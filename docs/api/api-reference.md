# YORSA — REST API Reference Specification

Base URL: `http://localhost:8000` (Local) / `https://yorsa-a-meeting-platform.onrender.com` (Production)

---

## 1. Meeting & AI Intelligence Endpoints (`/api/meetings`)

### 1.1 Create Meeting Room
Creates a cryptographically unique, verified meeting slug with host metadata and expiry.

- **Method**: `POST`
- **Path**: `/api/meetings/create`
- **Request Headers**: `Content-Type: application/json`
- **Request Body**:
  ```json
  {
    "title": "Board of Directors Q3 Review",
    "hostId": "eleanor_vance",
    "expiryHours": 24
  }
  ```
- **Response**: `201 Created`
  ```json
  {
    "success": true,
    "meetingCode": "yorsa-8a4f-9e2c",
    "roomId": "yorsa-8a4f-9e2c",
    "hostId": "eleanor_vance",
    "title": "Board of Directors Q3 Review",
    "expiresAt": "2026-09-24T18:30:00.000Z",
    "inviteLink": "/meeting/yorsa-8a4f-9e2c"
  }
  ```

---

### 1.2 Validate Meeting Link
Checks if a meeting code exists, validates access status, and verifies that the room has not expired.

- **Method**: `GET`
- **Path**: `/api/meetings/:id/validate`
- **Response**: `200 OK`
  ```json
  {
    "valid": true,
    "roomId": "yorsa-8a4f-9e2c",
    "hostId": "eleanor_vance",
    "title": "Board of Directors Q3 Review",
    "micLocked": false,
    "videoLocked": false,
    "expiresAt": "2026-09-24T18:30:00.000Z"
  }
  ```
- **Error Response**: `410 Gone` (if expired)
  ```json
  {
    "valid": false,
    "reason": "Meeting has expired",
    "expiredAt": "2026-09-23T12:00:00.000Z"
  }
  ```

---

### 1.3 Ingest Speech Transcript Chunk
Buffers live speech-to-text chunks from meeting participants into the meeting's transcript record.

- **Method**: `POST`
- **Path**: `/api/meetings/:id/transcript`
- **Request Body**:
  ```json
  {
    "sender": "John Smith",
    "text": "We should finalize the deployment deadline for next Tuesday.",
    "duration": 4
  }
  ```
- **Response**: `200 OK`
  ```json
  {
    "success": true,
    "chunkCount": 14
  }
  ```

---

### 1.4 Trigger AI Summarization & Mind Map Pipeline
Dispatches an asynchronous worker job to synthesize the meeting transcript using Hugging Face Serverless Inference.

- **Method**: `POST`
- **Path**: `/api/meetings/:id/summarize`
- **Request Body** (optional override):
  ```json
  {
    "rawTextOverride": ""
  }
  ```
- **Response**: `202 Accepted`
  ```json
  {
    "success": true,
    "message": "Summarization job initiated",
    "meetingId": "yorsa-8a4f-9e2c",
    "status": "pending"
  }
  ```

---

### 1.5 Retrieve Meeting AI Summary & Mind Map
Retrieves the generated executive brief, key topics, action deliverables, mind map tree, and collaborative notes.

- **Method**: `GET`
- **Path**: `/api/meetings/:id/summary`
- **Response**: `200 OK`
  ```json
  {
    "success": true,
    "summary": {
      "meetingId": "yorsa-8a4f-9e2c",
      "summaryText": "The executive committee approved the migration to WebRTC Mesh...",
      "keyTopics": ["Architecture", "Deployment Timeline", "Security Governance"],
      "actionItems": [
        {
          "task": "Deploy Hugging Face integration",
          "owner": "Engineering Lead",
          "dueHint": "By Friday"
        }
      ],
      "mindMap": {
        "nodes": [
          { "id": "root", "label": "Board Review", "level": 0 },
          { "id": "topic-1", "label": "Architecture", "level": 1 }
        ],
        "edges": [
          { "from": "root", "to": "topic-1", "label": "relates to" }
        ]
      },
      "notes": "Collaborative notes...",
      "status": "completed"
    }
  }
  ```

---

### 1.6 Update Meeting Collaborative Notes
Saves participant edits back to the meeting record, preserved independently from regenerated summaries.

- **Method**: `PUT`
- **Path**: `/api/meetings/:id/notes`
- **Request Body**:
  ```json
  {
    "notes": "### Final Decision\nApproved Q3 budget and assigned deployment to John."
  }
  ```
- **Response**: `200 OK`
  ```json
  {
    "success": true,
    "notes": "### Final Decision\nApproved Q3 budget and assigned deployment to John."
  }
  ```

---

## 2. User Authentication Endpoints (`/api/v1/users`)

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/v1/users/register` | Create user profile with bcrypt password hashing |
| `POST` | `/api/v1/users/login` | Authenticate credentials and return secure crypto session token |
| `GET` | `/api/v1/users/get_all_activity` | Fetch authenticated user's past meeting participation history |
| `POST` | `/api/v1/users/add_to_activity` | Log meeting code to user's history |
| `GET` | `/api/v1/users/get_meeting_audit` | Retrieve attendee audit log (join time, leave time, IP address) |
