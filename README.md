# Zoro Local

An offline-first desktop planner. You create tomorrow's plan; Zoro reviews it locally with Qwen3 8B and helps keep the original plan as a clear baseline.

## What works now

- Night Planning: add, edit, and remove your own time blocks.
- Local baseline storage: the saved plan stays on this computer.
- Local AI review: Qwen3 8B checks for scheduling conflicts, missing transitions, breaks, and buffers without changing your plan.
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

## Privacy

Plans are saved in Electron's local application-data folder. The application does not send plan data to a remote service. The downloaded Ollama model is used through its local API.

## Roadmap

- Today timeline and real-time typed updates
- Local speech-to-text
- Day review and editable journal summary
- Weekly/monthly insights dashboard
