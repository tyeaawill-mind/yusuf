# Phase 2 — File Library & Multimodal Summarization

Build the foundation for Yusuf's "knowledge" — let you upload files, store them privately, and have Yusuf read/summarize them (PDF, DOCX, TXT, images).

## What you'll get

1. **📁 Files tab** in the app — upload, list, preview, delete your files
2. **Yusuf reads your files** — attach a file (or reference it by name) in chat; Yusuf summarizes/answers questions using Gemini's multimodal vision
3. **Private storage** — every file is RLS-locked to you; nobody else can access

## Technical scope

### Database
- New `files` table: `id, user_id, name, mime_type, size_bytes, storage_path, summary (nullable), created_at`
- Storage bucket `user-files` (private), RLS keyed to `auth.uid()` folder path

### Backend (server functions)
- `uploadFile` — signed upload URL + insert row
- `listFiles` / `deleteFile` / `getFileSignedUrl`
- `summarizeFile` — fetch file bytes, send to `google/gemini-2.5-flash` via Lovable AI gateway as multimodal input, store summary

### Chat integration
- `/api/chat` extended: when the message references files (attached IDs), inline their content/images into the model request
- Attach button in chat input → picks from your file library

### Frontend
- New `<FilesView>` component (drag-drop upload, grid of files, summary preview)
- New "Files" tab alongside Chat/Todos/Goals/Vault
- Chat input gets a 📎 attach button

## Out of scope (later phases)
- Audio/video transcription (Phase 3 — needs ElevenLabs)
- PDF/DOCX report generation (Phase 3)
- Web search (Phase 4)
- Google Drive / Dropbox sync (Phase 5)

## File limits
- 20 MB per file, 100 files per user (soft limit), supported: PDF, DOCX, TXT, MD, PNG, JPG, WEBP

Approve to proceed.
