const { app, BrowserWindow, ipcMain } = require('electron')
const fs = require('fs/promises')
const path = require('path')

const model = 'qwen3:8b'
const ollamaUrl = 'http://127.0.0.1:11434'
const categories = ['Routine', 'Work', 'Study', 'Health', 'Personal', 'Travel', 'Rest']

function storeFile() { return path.join(app.getPath('userData'), 'zoro-data.json') }
function voiceDir() { return path.join(app.getPath('userData'), 'voice') }
function blankStore() { return { version: 1, plans: {}, modelCalls: [] } }

async function readStore() {
  try { return { ...blankStore(), ...JSON.parse(await fs.readFile(storeFile(), 'utf8')) } }
  catch (error) { if (error.code === 'ENOENT') return blankStore(); throw error }
}

async function writeStore(store) { await fs.writeFile(storeFile(), JSON.stringify(store, null, 2), 'utf8'); return store }

async function ollamaRequest(route, body) {
  const startedAt = new Date().toISOString()
  try {
    const response = await fetch(`${ollamaUrl}${route}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    const payload = await response.json()
    if (!response.ok) throw new Error(`Ollama returned ${response.status}`)
    await appendModelLog({ route, startedAt, input: body, response: payload })
    return payload
  } catch (error) {
    await appendModelLog({ route, startedAt, input: body, error: error.message })
    throw error
  }
}

async function appendModelLog(entry) {
  const store = await readStore()
  const log = { id: crypto.randomUUID(), ...entry, completedAt: new Date().toISOString() }
  store.modelCalls = [log, ...(store.modelCalls ?? [])].slice(0, 100)
  await writeStore(store)
}

function cleanJson(value) {
  const fenced = value.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')
  return JSON.parse(fenced)
}

function createWindow() {
  const window = new BrowserWindow({
    width: 1440, height: 920, minWidth: 1120, minHeight: 720, fullscreen: true, autoHideMenuBar: true,
    backgroundColor: '#111318', titleBarStyle: 'hidden',
    webPreferences: { preload: path.join(__dirname, 'preload.cjs'), contextIsolation: true, nodeIntegration: false }
  })
  window.loadURL('http://127.0.0.1:5173')
}

app.whenReady().then(() => {
  ipcMain.handle('planner:get', async (_, date) => (await readStore()).plans[date] ?? null)
  ipcMain.handle('planner:list', async () => Object.values((await readStore()).plans).sort((a, b) => a.date.localeCompare(b.date)))
  ipcMain.handle('planner:model-logs', async () => (await readStore()).modelCalls ?? [])
  ipcMain.handle('planner:save-plan', async (_, { date, blocks }) => {
    const store = await readStore(); const existing = store.plans[date]
    store.plans[date] = {
      date, baselineBlocks: blocks, savedAt: existing?.savedAt ?? new Date().toISOString(),
      revisions: existing?.revisions ?? [], updates: existing?.updates ?? [], journal: existing?.journal ?? ''
    }
    await writeStore(store); return store.plans[date]
  })
  ipcMain.handle('planner:add-update', async (_, { date, update }) => {
    const store = await readStore(); const plan = store.plans[date]
    if (!plan) throw new Error('Save a plan for this date before adding an update.')
    const record = { id: crypto.randomUUID(), timestamp: new Date().toISOString(), ...update }
    plan.updates = [...(plan.updates ?? []), record]; await writeStore(store); return plan
  })
  ipcMain.handle('planner:save-journal', async (_, { date, journal }) => {
    const store = await readStore(); if (!store.plans[date]) throw new Error('No plan exists for this date.')
    store.plans[date].journal = journal; store.plans[date].journalSavedAt = new Date().toISOString(); await writeStore(store); return store.plans[date]
  })
  ipcMain.handle('ollama:status', async () => {
    try { const response = await fetch(`${ollamaUrl}/api/tags`); const data = await response.json(); return { online: response.ok, modelReady: data.models?.some((item) => item.name.startsWith(model)) ?? false } }
    catch { return { online: false, modelReady: false } }
  })
  ipcMain.handle('ollama:review-plan', async (_, plan) => {
    const prompt = `You are Zoro Local, a calm offline personal planning assistant. The user owns their plan. Review it without changing it. Identify only concrete schedule conflicts, missing transitions, missing meals/rest, overload, and lack of buffer. A block whose start and end time are equal is a point-in-time marker; never call it an overlap. Offer at most three optional suggestions. Do not use guilt, diagnosis, productivity scores, Markdown, or headings. Return one plain-text summary sentence followed by at most four observation bullets and at most three suggestion bullets.\n\nDate: ${plan.date}\nSchedule:\n${plan.blocks.map((block) => `${block.start}-${block.end}: ${block.title} (${block.category})`).join('\n')}`
    return (await ollamaRequest('/api/chat', { model, stream: false, think: false, messages: [{ role: 'user', content: prompt }] })).message.content
  })
  ipcMain.handle('ollama:generate-plan', async (_, { date }) => {
    const prompt = `Create one illustrative, realistic, and varied personal day plan for ${date}. This is a draft for the user to edit, not an instruction. Include 7 to 10 non-overlapping blocks, meal/rest time, and some open space. Use 24-hour HH:MM times. Allowed categories: Routine, Work, Study, Health, Personal, Travel, Rest. Return JSON only in this exact shape: {"blocks":[{"start":"07:00","end":"07:30","title":"Wake up and freshen up","category":"Routine"}]}. Do not include text outside the JSON.`
    const content = (await ollamaRequest('/api/chat', { model, stream: false, think: false, format: 'json', options: { temperature: 1.1 }, messages: [{ role: 'user', content: prompt }] })).message.content
    const parsed = cleanJson(content); const source = Array.isArray(parsed) ? parsed : parsed.blocks
    if (!Array.isArray(source) || source.length === 0) throw new Error('The local model did not return usable plan blocks.')
    const blocks = source.map((block) => ({ id: crypto.randomUUID(), start: String(block.start ?? ''), end: String(block.end ?? ''), title: String(block.title ?? '').trim(), category: categories.includes(block.category) ? block.category : 'Personal' }))
    if (blocks.some((block) => !/^\d{2}:\d{2}$/.test(block.start) || !/^\d{2}:\d{2}$/.test(block.end) || !block.title)) throw new Error('The local model returned an invalid time block.')
    return blocks.sort((a, b) => a.start.localeCompare(b.start))
  })
  ipcMain.handle('ollama:parse-update', async (_, { text, blocks }) => {
    const prompt = `Extract a factual activity update into JSON only. Never invent times or completion. Valid outcomes: Completed, Partially Completed, In Progress, Skipped, Unknown. Choose taskTitle from the schedule when a clear match exists, else use the user's phrase. Return {"taskTitle":"string","outcome":"string","minutes":number|null,"blocker":"string|null","summary":"string"}. If duration is not explicit use null.\n\nSchedule: ${blocks.map((b) => b.title).join(', ')}\nUser update: ${text}`
    const content = (await ollamaRequest('/api/chat', { model, stream: false, think: false, format: 'json', messages: [{ role: 'user', content: prompt }] })).message.content
    try { return cleanJson(content) } catch { return { taskTitle: 'Unclassified update', outcome: 'Unknown', minutes: null, blocker: null, summary: text } }
  })
  ipcMain.handle('ollama:journal', async (_, { date, updates }) => {
    const prompt = `Write a concise, calm first-person daily journal draft using only the confirmed updates below. Do not infer facts, times, feelings, diagnoses, or outcomes not recorded. Mention unknowns only if relevant. 90 words maximum.\n\nDate: ${date}\nUpdates:\n${JSON.stringify(updates)}`
    return (await ollamaRequest('/api/chat', { model, stream: false, think: false, messages: [{ role: 'user', content: prompt }] })).message.content.trim()
  })
  ipcMain.handle('voice:save', async (_, { date, mimeType, base64 }) => {
    await fs.mkdir(voiceDir(), { recursive: true }); const extension = mimeType.includes('ogg') ? 'ogg' : 'webm'
    const filename = `${date}-${Date.now()}.${extension}`; await fs.writeFile(path.join(voiceDir(), filename), Buffer.from(base64, 'base64'))
    return { filename, saved: true, transcription: 'Audio saved locally. Add a typed transcript to turn it into a plan update; local Whisper transcription is the remaining setup.' }
  })
  createWindow(); app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow() })
})
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit() })
