# Zoro Local

An offline-first desktop planner. You create tomorrow's plan; Zoro reviews it locally with Qwen3 8B and helps keep the original plan as a clear baseline.

## What works now

- Night Planning: add, edit, and remove your own time blocks.
- Local baseline storage: the saved plan stays on this computer.
- Local AI review: Qwen3 8B checks for scheduling conflicts, missing transitions, breaks, and buffers without changing your plan.
- Today view: record natural-language updates; Qwen extracts a task, outcome, duration, and blocker locally.
- Day review: compare the unchanged baseline with what was recorded and create an editable local journal draft.
- Insights: see saved days, recorded updates, completed updates, recorded minutes, and journal-entry totals.
- Voice capture: record audio directly in the app and save it locally for later transcription.
- Offline-first UI: no account, API key, or cloud database.

## Run locally

1. Install [Ollama](https://ollama.com) and download the model:

   ```powershell
   ollama pull qwen3:8b
   ```

2. Install app dependencies and start it:

   ```powershell
   npm install
   npm run dev
   ```

The app expects Ollama at `http://127.0.0.1:11434`.

**Journal & day review** uses Qwen for reflective conversations and `all-minilm` for local semantic search.
On a new laptop, run `ollama pull all-minilm` once alongside the Qwen download.
Write a thought or ask about previous records in the same conversation. Successful exchanges are saved by journal date, even on days without a plan. Qwen receives the last three exchanges for that date and can look up saved schedules, activity, totals, or related journal excerpts. Expand **Records used** when a reply relied on a lookup.

## Quick test path

1. In **Plan tomorrow**, make a few time blocks and select **Save tomorrow's baseline**.
2. In **Today**, add a short typed update such as `I completed React study for 45 minutes.`
3. In **Day review**, generate and save the editable journal draft.
4. In **Insights**, confirm the local metrics reflect the saved update.

## Current voice boundary

The MVP records and saves voice audio locally. Offline speech-to-text still needs a local Whisper runtime/model, so add a typed transcript before saving it as an update. This avoids implying that an audio recording was transcribed when it was not.

## Privacy

Plans are saved in Electron's local application-data folder in `zoro-data.json`. The same local file stores each baseline plan, recorded update, journal entry, and the last 100 local-model requests/responses shown under **AI activity**. The application does not send plan data to a remote service. The downloaded Ollama model is used through its local API.

## Next improvement

- Add local Whisper-based speech-to-text to turn saved recordings into updates automatically.
