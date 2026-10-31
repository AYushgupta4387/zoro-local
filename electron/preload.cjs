const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("zoro", {
  askPlanner: (payload) => ipcRenderer.invoke("planner:ask", payload),
  getPlan: (date) => ipcRenderer.invoke("planner:get", date),
  listPlans: () => ipcRenderer.invoke("planner:list"),
  getModelLogs: () => ipcRenderer.invoke("planner:model-logs"),
  savePlan: (plan) => ipcRenderer.invoke("planner:save-plan", plan),
  addUpdate: (payload) => ipcRenderer.invoke("planner:add-update", payload),
  saveJournal: (payload) => ipcRenderer.invoke("planner:save-journal", payload),
  checkOllama: () => ipcRenderer.invoke("ollama:status"),
  reviewPlan: (plan) => ipcRenderer.invoke("ollama:review-plan", plan),
  generatePlan: (payload) =>
    ipcRenderer.invoke("ollama:generate-plan", payload),
  parseUpdate: (payload) => ipcRenderer.invoke("ollama:parse-update", payload),
  makeJournal: (payload) => ipcRenderer.invoke("ollama:journal", payload),
  saveVoice: (payload) => ipcRenderer.invoke("voice:save", payload),
});
