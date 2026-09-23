# Feature Specification: AI Meeting Synthesis & Mind Map Pipeline

## 1. Overview
The YORSA AI layer converts spoken discussions into structured, high-value executive intelligence without requiring external Python microservices or multi-cloud overhead. The pipeline handles:
1. **Live Speech Ingestion**: Capturing real-time speech chunks via browser Web Speech API / MediaRecorder and buffering them into MongoDB.
2. **Executive Synthesis**: Leveraging Hugging Face Serverless Inference (`Qwen2.5-7B-Instruct` or `Meta-Llama-3.1-8B-Instruct`) to generate executive briefs and action items.
3. **Hierarchical Mind Mapping**: Producing a node-and-edge graph rendered in interactive SVG with zoom and pan.
4. **Independent Notes Workspace**: Maintaining an editable Markdown/rich notes area that is preserved independently from regenerated summaries.

---

## 2. End-to-End Processing Architecture

```
[Live Meeting Audio]
       │
       ▼
[Speech-To-Text Feeder] (Web Speech API / Whisper)
       │
       ▼
[POST /api/meetings/:id/transcript]
       │
       ▼
[MongoDB: Transcript.chunks & rawText]
       │
       ▼ (User clicks "Generate Summary" or meeting ends)
[POST /api/meetings/:id/summarize] (Returns 202 Accepted Immediately)
       │
       ▼
[Asynchronous Worker: aiService.js]
  ├── Calls Hugging Face Serverless Inference API
  ├── Retries with exponential backoff on 503 "model loading"
  └── Enforces strict JSON schema:
        - summary: String
        - keyTopics: Array<String>
        - actionItems: Array<{ task, owner, dueHint }>
        - mindMap: { nodes: Array, edges: Array }
       │
       ▼
[MongoDB: MeetingSummary Document]
       │
       ▼
[Frontend: SideDrawer / History Modal]
  ├── Tab 1: Executive Summary & Action Checklist
  ├── Tab 2: Interactive SVG Mind Map Tree (Pan/Zoom)
  └── Tab 3: Collaborative Editable Notes
```

---

## 3. Strict Schema Contract

The LLM is prompted to return strictly valid JSON matching this schema:
```json
{
  "summary": "Concise executive overview of the session (2-4 paragraphs).",
  "keyTopics": ["Topic 1", "Topic 2", "Topic 3"],
  "actionItems": [
    {
      "task": "Specific description of deliverable",
      "owner": "Person name or Unassigned",
      "dueHint": "Timeline e.g. EOD / Next sprint"
    }
  ],
  "mindMap": {
    "nodes": [
      { "id": "root", "label": "Meeting Theme", "level": 0 },
      { "id": "topic-1", "label": "Architecture", "level": 1 },
      { "id": "detail-1", "label": "Action: Optimize Mesh", "level": 2 }
    ],
    "edges": [
      { "from": "root", "to": "topic-1" },
      { "from": "topic-1", "to": "detail-1" }
    ]
  }
}
```

---

## 4. Fault-Tolerant Heuristic Engine
Hugging Face's free tier can encounter rate limits (429) or cold-start loading delays (503). To ensure uninterrupted student and executive demonstrations, `aiService.js` includes an intelligent heuristic parser that extracts topics, generates a structured summary, constructs action items, and generates an SVG mind map graph locally if the external API token is absent or unavailable.
