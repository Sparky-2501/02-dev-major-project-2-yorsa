# ADR-001: Selection of Hugging Face Inference API for AI Synthesis

## Status
**Accepted**

## Context
YORSA requires an artificial intelligence layer to process live meeting transcripts, extract executive action items, generate high-level meeting summaries, and produce visual mind map trees. Key constraints:
1. **Language Continuity**: The team requested keeping the codebase in JavaScript/Node.js without introducing a Python microservice (FastAPI/Celery) or additional deployment overhead.
2. **Cost & Accessibility**: The platform must support free development and testing for academic and initial release demonstration without requiring commercial API credit card subscriptions.
3. **Structured Output**: Models must follow strict JSON schemas for nested mind map nodes and edges.

## Decision
We selected **Hugging Face's Serverless Inference API** using:
- `openai/whisper-small` for speech-to-text.
- `Qwen/Qwen2.5-7B-Instruct` (or `Meta-Llama-3.1-8B-Instruct`) for structured JSON summarization and mind map graph generation.
- All AI calls are encapsulated within a single service layer (`backend/src/services/aiService.js`).

## Consequences & Trade-offs
### Positive
- **No Python Infrastructure**: Can run entirely within Node.js using native `fetch`.
- **Zero Cost Tier**: Hugging Face provides serverless endpoints on free accounts without requiring GPU cloud provisioning.
- **Provider Agnostic Abstraction**: Because all logic is consolidated behind `aiService.js`, the backend can be repointed to Groq, Together AI, or local Ollama endpoints in the future by updating one base URL without altering routes or controllers.

### Negative / Mitigations
- **Cold Starts (503 Model Loading)**: Mitigated by parsing `estimated_time` and implementing automated exponential retry delays.
- **Rate Limits (429)**: Mitigated by an intelligent local heuristic synthesis engine that guarantees 100% demo availability.

## Revisit Triggers
- When simultaneous active meeting concurrency exceeds ~1,000 requests/day, requiring Hugging Face PRO or dedicated inference endpoints.
- If transcripts consistently exceed 128k context tokens, requiring map-reduce vector chunking.
