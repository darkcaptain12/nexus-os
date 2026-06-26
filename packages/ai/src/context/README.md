# Context Engine

Builds, optimizes, and manages context windows for AI interactions. Controls what information reaches the model within token limits.

## Responsibilities

- Build context frames from messages, memories, and tools
- Allocate token budget across sections
- Compress and summarize content to fit budget
- Score and prioritize content by relevance
- Detect and remove duplicates
- Count tokens accurately per model
