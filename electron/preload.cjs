const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('zoro', {
  getPlan: () => ipcRenderer.invoke('plan:get'),
  savePlan: (plan) => ipcRenderer.invoke('plan:save', plan),
  checkOllama: () => ipcRenderer.invoke('ollama:status'),
  reviewPlan: (plan) => ipcRenderer.invoke('ollama:review-plan', plan)
})
