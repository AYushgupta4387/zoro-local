const { app, BrowserWindow, ipcMain } = require('electron')
const fs = require('fs/promises')
const path = require('path')

const model = 'qwen3:8b'
const ollamaUrl = 'http://127.0.0.1:11434'

function dataFile() {
  return path.join(app.getPath('userData'), 'zoro-plan.json')
}

async function readPlan() {
  try {
    return JSON.parse(await fs.readFile(dataFile(), 'utf8'))
  } catch (error) {
    if (error.code === 'ENOENT') return null
    throw error
  }
}

async function writePlan(plan) {
  const record = { ...plan, savedAt: new Date().toISOString() }
  await fs.writeFile(dataFile(), JSON.stringify(record, null, 2), 'utf8')
  return record
}

async function ollamaRequest(route, body) {
  const response = await fetch(`${ollamaUrl}${route}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })
  if (!response.ok) throw new Error(`Ollama returned ${response.status}`)
  return response.json()
}

function createWindow() {
  const window = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 1120,
    minHeight: 720,
    backgroundColor: '#111318',
    titleBarStyle: 'hidden',
    webPreferences: { preload: path.join(__dirname, 'preload.cjs'), contextIsolation: true, nodeIntegration: false }
  })
  window.loadURL('http://127.0.0.1:5173')
}

app.whenReady().then(() => {
  ipcMain.handle('plan:get', readPlan)
  ipcMain.handle('plan:save', (_, plan) => writePlan(plan))
  ipcMain.handle('ollama:status', async () => {
    try {
      const response = await fetch(`${ollamaUrl}/api/tags`)
      const data = await response.json()
      return { online: response.ok, modelReady: data.models?.some((item) => item.name.startsWith(model)) ?? false }
    } catch { return { online: false, modelReady: false } }
  })
  ipcMain.handle('ollama:review-plan', async (_, plan) => {
    const prompt = `You are Zoro Local, a calm offline personal planning assistant. The user owns their plan. Review it without changing it. Identify only concrete schedule conflicts, missing transitions, missing meals/rest, overload, and lack of buffer. A block whose start and end time are equal is a point-in-time marker, such as waking up; never call it an overlap. Offer at most three optional suggestions. Do not use guilt, diagnosis, productivity scores, Markdown, or headings. Return one plain-text summary sentence followed by at most four observation bullets and at most three suggestion bullets.\n\nDate: ${plan.date}\nSchedule:\n${plan.blocks.map((block) => `${block.start}-${block.end}: ${block.title} (${block.category})`).join('\n')}`
    const data = await ollamaRequest('/api/chat', { model, stream: false, messages: [{ role: 'user', content: prompt }] })
    return data.message.content
  })
  createWindow()
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow() })
})

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit() })
