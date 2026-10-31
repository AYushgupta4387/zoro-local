import { useEffect, useMemo, useRef, useState } from 'react'
import { BarChart3, CalendarDays, Check, ChevronDown, CircleHelp, Clock3, FileText, GripVertical, LayoutDashboard, LoaderCircle, Mic, Plus, Send, Sparkles, Square, TerminalSquare, X } from 'lucide-react'

const defaultBlocks = [
  { id: 'wake', start: '07:00', end: '07:00', title: 'Wake up', category: 'Routine' },
  { id: 'freshen', start: '07:00', end: '07:30', title: 'Freshen up', category: 'Routine' },
  { id: 'exercise', start: '07:30', end: '08:30', title: 'Exercise', category: 'Health' },
  { id: 'breakfast', start: '08:30', end: '09:30', title: 'Breakfast and rest', category: 'Rest' },
  { id: 'travel-office', start: '09:30', end: '10:00', title: 'Travel to office', category: 'Travel' },
  { id: 'office', start: '10:00', end: '18:00', title: 'Office', category: 'Work' }
]
const categories = ['Routine', 'Work', 'Study', 'Health', 'Personal', 'Travel', 'Rest']
const dateForInput = (days = 1) => { const date = new Date(); date.setDate(date.getDate() + days); return date.toISOString().slice(0, 10) }
const minutesLabel = (value) => value == null ? 'Time not recorded' : `${value} min recorded`
const cleanText = (text) => text.replace(/\*\*/g, '').replace(/^[-•]\s*/, '')

function App() {
  const [view, setView] = useState('plan')
  const [date, setDate] = useState(dateForInput())
  const [blocks, setBlocks] = useState(defaultBlocks)
  const [plan, setPlan] = useState(null)
  const [plans, setPlans] = useState([])
  const [status, setStatus] = useState({ loading: true, online: false, modelReady: false })
  const [review, setReview] = useState('')
  const [reviewing, setReviewing] = useState(false)
  const [saved, setSaved] = useState(false)
  const [notice, setNotice] = useState('')

  async function refresh(selectedDate = date) {
    const [savedPlan, allPlans, modelStatus] = await Promise.all([window.zoro.getPlan(selectedDate), window.zoro.listPlans(), window.zoro.checkOllama()])
    setPlan(savedPlan); setPlans(allPlans); setStatus({ loading: false, ...modelStatus })
    if (savedPlan?.baselineBlocks) setBlocks(savedPlan.baselineBlocks)
  }
  useEffect(() => { refresh() }, [])
  useEffect(() => { refresh(date) }, [date])

  const sortedBlocks = useMemo(() => [...blocks].sort((a, b) => a.start.localeCompare(b.start)), [blocks])
  const updates = plan?.updates ?? []
  function updateBlock(id, field, value) { setBlocks((current) => current.map((block) => block.id === id ? { ...block, [field]: value } : block)) }
  function addBlock() { setBlocks((current) => [...current, { id: crypto.randomUUID(), start: '18:30', end: '19:00', title: 'New activity', category: 'Personal' }]) }
  function removeBlock(id) { setBlocks((current) => current.filter((block) => block.id !== id)) }
  async function savePlan() { await window.zoro.savePlan({ date, blocks: sortedBlocks }); setSaved(true); setNotice('Baseline saved locally.'); await refresh(); setTimeout(() => setSaved(false), 2500) }
  async function getReview() { setReviewing(true); setReview(''); try { setReview(await window.zoro.reviewPlan({ date, blocks: sortedBlocks })) } catch (error) { setReview(`I could not reach your local model. (${error.message})`) } finally { setReviewing(false) } }

  const nav = [ ['plan', CalendarDays, 'Plan tomorrow'], ['today', Clock3, 'Today'], ['review', FileText, 'Day review'], ['insights', LayoutDashboard, 'Insights'], ['ai-log', TerminalSquare, 'AI activity'] ]
  return <div className="app-shell">
    <aside className="sidebar"><div className="brand"><span className="brand-mark">Z</span><span>Zoro <em>Local</em></span></div><div className="workspace-label">WORKSPACE</div><nav>{nav.map(([id, Icon, label]) => <button key={id} className={`nav-item ${view === id ? 'active' : ''}`} onClick={() => setView(id)}><Icon size={19} /> {label}</button>)}</nav><div className="sidebar-bottom"><div className="privacy-note"><span className="status-dot" /> Your records stay on this laptop</div><button className="help"><CircleHelp size={16} /> How Zoro works</button></div></aside>
    <main className="main"><div className="window-bar"><span>ZORO LOCAL / OFFLINE PLANNER</span><div className={`local-status ${status.online && status.modelReady ? 'ready' : ''}`}><span className="status-dot" />{status.loading ? 'CHECKING LOCAL AI' : status.online && status.modelReady ? 'LOCAL // QWEN3 8B READY' : 'LOCAL AI NOT READY'}</div></div>
      {view === 'plan' && <PlanningView {...{ date, setDate, blocks: sortedBlocks, updateBlock, addBlock, removeBlock, review, reviewing, getReview, savePlan, saved, notice }} />}
      {view === 'today' && <TodayView {...{ date, setDate, plan, status, refresh, setView, setNotice }} />}
      {view === 'review' && <ReviewView {...{ date, setDate, plan, status, refresh, setNotice, setView }} />}
      {view === 'insights' && <InsightsView plans={plans} />}
      {view === 'ai-log' && <ModelLogView />}
    </main>
  </div>
}

function DateControl({ date, setDate }) { return <div className="date-row"><div><label htmlFor="active-date">DATE</label><input id="active-date" type="date" value={date} onChange={(event) => setDate(event.target.value)} /></div></div> }

function PlanningView({ date, setDate, blocks, updateBlock, addBlock, removeBlock, review, reviewing, getReview, savePlan, saved, notice }) {
  return <><header className="topbar"><div><span className="eyebrow">NIGHT PLANNING / BASELINE MODE</span><h1>Plan for tomorrow</h1><p>Build tomorrow in your own words. Zoro will only offer a quiet second look.</p></div></header><section className="planning-layout"><div className="plan-canvas"><div className="plan-date-line"><DateControl date={date} setDate={setDate} /><div className="baseline-note"><Clock3 size={16} /> This becomes tomorrow’s baseline after you save it.</div></div><BalanceCard /><div className="section-head"><div><h2>Your time blocks</h2><p>Create the day in your own words. Zoro reviews; you decide.</p></div><button className="ghost-button" onClick={addBlock}><Plus size={16} /> Add block</button></div><BlockTable {...{ blocks, updateBlock, removeBlock }} /><div className="actions"><button className="secondary-button" onClick={getReview} disabled={reviewing}>{reviewing ? <LoaderCircle className="spin" size={17} /> : <Sparkles size={17} />}{reviewing ? 'Reviewing locally…' : 'Review my plan'}</button><button className="primary-button" onClick={savePlan}><Check size={17} />{saved ? 'Baseline saved' : 'Save tomorrow’s baseline'}</button></div>{notice && <p className="inline-notice">{notice}</p>}</div><ReviewPanel review={review} reviewing={reviewing} /></section></>
}

function BalanceCard() { return <div className="balance-card"><div><span className="eyebrow">DAY BALANCE</span><strong>Your plan is yours. Keep space for transitions, meals, and recovery.</strong></div><div className="balance-track"><span className="balance-work" /><span className="balance-rest" /><span className="balance-open" /></div><div className="balance-legend"><span><i className="work" /> Planned focus</span><span><i className="rest" /> Rest & routines</span><span><i className="open" /> Open time</span></div></div> }

function BlockTable({ blocks, updateBlock, removeBlock }) { return <div className="timeline-card"><div className="timeline-header"><span>TIME</span><span>ACTIVITY</span><span>CATEGORY</span><span /></div>{blocks.map((block) => <div className="block-row" key={block.id}><GripVertical className="drag" size={16} /><div className="time-inputs"><TimePicker label="Start time" value={block.start} onChange={(value) => updateBlock(block.id, 'start', value)} /><span>—</span><TimePicker label="End time" value={block.end} onChange={(value) => updateBlock(block.id, 'end', value)} /></div><input className="activity-input" aria-label="Activity" value={block.title} onChange={(event) => updateBlock(block.id, 'title', event.target.value)} /><CategoryPicker value={block.category} onChange={(value) => updateBlock(block.id, 'category', value)} /><button className="remove-button" aria-label={`Remove ${block.title}`} onClick={() => removeBlock(block.id)}><X size={16} /></button></div>)}</div> }

function TimePicker({ label, value, onChange }) {
  const [open, setOpen] = useState(false); const [hour, minute] = value.split(':'); const hours = Array.from({ length: 24 }, (_, index) => String(index).padStart(2, '0')); const minutes = Array.from({ length: 60 }, (_, index) => String(index).padStart(2, '0'))
  return <div className="time-picker"><button type="button" className="time-trigger" aria-label={label} aria-expanded={open} onClick={() => setOpen((current) => !current)}><span>{value}</span><Clock3 size={14} /></button>{open && <div className="time-menu" role="dialog" aria-label={`${label} picker`}><div className="time-column">{hours.map((item) => <button type="button" className={item === hour ? 'selected' : ''} key={item} onClick={() => onChange(`${item}:${minute}`)}>{item}</button>)}</div><div className="time-column">{minutes.map((item) => <button type="button" className={item === minute ? 'selected' : ''} key={item} onClick={() => { onChange(`${hour}:${item}`); setOpen(false) }}>{item}</button>)}</div></div>}</div>
}

function CategoryPicker({ value, onChange }) {
  const [open, setOpen] = useState(false)
  return <div className={`select-wrap category-${value.toLowerCase()}`}><button type="button" className="category-trigger" aria-label="Category" aria-expanded={open} onClick={() => setOpen((current) => !current)}>{value}<ChevronDown size={14} /></button>{open && <div className="category-menu" role="listbox">{categories.map((category) => <button type="button" role="option" aria-selected={category === value} className={category === value ? 'selected' : ''} key={category} onClick={() => { onChange(category); setOpen(false) }}>{category}</button>)}</div>}</div>
}

function ReviewPanel({ review, reviewing }) { return <aside className="review-panel"><div className="review-title"><span className="ai-icon"><Sparkles size={16} /></span><div><span className="eyebrow">LOCAL AI REVIEW</span><h2>Observations, not orders</h2></div></div>{reviewing && <div className="review-empty"><LoaderCircle className="spin" size={22} /><p>Qwen is checking your plan locally.</p></div>}{!reviewing && !review && <div className="review-empty"><Sparkles size={22} /><p>When you are ready, Zoro can check for overlaps, missing transitions, breaks, and realistic buffers.</p><span>It will not change your plan.</span></div>}{!reviewing && review && <div className="review-result">{review.split('\n').filter(Boolean).map((line, index) => <p key={index}>{cleanText(line)}</p>)}</div>}<div className="review-footer"><span className="status-dot" /> Runs on your laptop with Qwen3 8B</div></aside> }

function TodayView({ date, setDate, plan, status, refresh, setView, setNotice }) {
  const [text, setText] = useState(''); const [saving, setSaving] = useState(false); const [recording, setRecording] = useState(false); const [voiceStatus, setVoiceStatus] = useState(''); const recorder = useRef(null); const chunks = useRef([])
  const updates = plan?.updates ?? []
  async function submit() { if (!text.trim() || !plan) return; setSaving(true); try { const parsed = status.online && status.modelReady ? await window.zoro.parseUpdate({ text, blocks: plan.baselineBlocks }) : { taskTitle: 'Unclassified update', outcome: 'Unknown', minutes: null, blocker: null, summary: text }; await window.zoro.addUpdate({ date, update: { rawText: text, ...parsed } }); setText(''); setNotice('Update saved locally.'); await refresh(date) } catch (error) { setNotice(error.message) } finally { setSaving(false) } }
  async function startVoice() { try { const stream = await navigator.mediaDevices.getUserMedia({ audio: true }); chunks.current = []; const media = new MediaRecorder(stream); recorder.current = media; media.ondataavailable = (event) => chunks.current.push(event.data); media.onstop = async () => { stream.getTracks().forEach((track) => track.stop()); const blob = new Blob(chunks.current, { type: media.mimeType }); const bytes = new Uint8Array(await blob.arrayBuffer()); let binary = ''; bytes.forEach((byte) => { binary += String.fromCharCode(byte) }); const result = await window.zoro.saveVoice({ date, mimeType: media.mimeType, base64: btoa(binary) }); setVoiceStatus(result.transcription); setRecording(false) }; media.start(); setRecording(true) } catch { setVoiceStatus('Microphone access was not granted. You can still type an update.') } }
  function stopVoice() { recorder.current?.stop() }
  return <><header className="topbar"><div><span className="eyebrow">TODAY / ACTUAL ACTIVITY</span><h1>Follow the day as it happens</h1><p>Record what happened. Zoro keeps your original plan visible.</p></div></header><section className="single-layout"><DateControl date={date} setDate={setDate} />{!plan ? <EmptyPlan setView={setView} /> : <><div className="today-grid"><div><h2 className="view-title">Planned timeline</h2><div className="actual-timeline">{plan.baselineBlocks.map((block) => <div className="actual-block" key={block.id}><span className="timeline-time">{block.start}–{block.end}</span><div><strong>{block.title}</strong><small>{block.category}</small></div></div>)}</div></div><div className="update-composer"><div><span className="eyebrow">REAL-TIME UPDATE</span><h2>What happened?</h2><p>Type naturally. The local model extracts only what you said.</p></div><textarea value={text} onChange={(event) => setText(event.target.value)} placeholder="I completed React study for 75 minutes, but got distracted twice." /><div className="composer-actions"><button className={`voice-button ${recording ? 'recording' : ''}`} onClick={recording ? stopVoice : startVoice}>{recording ? <Square size={16} /> : <Mic size={17} />}{recording ? 'Stop recording' : 'Record voice'}</button><button className="primary-button" disabled={saving || !text.trim()} onClick={submit}>{saving ? <LoaderCircle className="spin" size={17} /> : <Send size={17} />}Save update</button></div>{voiceStatus && <p className="voice-note">{voiceStatus}</p>}</div></div><section className="updates-section"><h2 className="view-title">Recorded updates</h2>{updates.length === 0 ? <p className="empty-copy">No activity has been recorded for this date yet.</p> : updates.slice().reverse().map((item) => <article className="update-card" key={item.id}><div className="update-card-head"><strong>{item.taskTitle}</strong><span className={`outcome ${item.outcome.toLowerCase().replaceAll(' ', '-')}`}>{item.outcome}</span></div><p>{item.summary}</p><small>{minutesLabel(item.minutes)}{item.blocker ? ` · Blocker: ${item.blocker}` : ''}</small></article>)}</section></>}</section></>
}

function EmptyPlan({ setView }) { return <div className="empty-state"><CalendarDays size={28} /><h2>No plan for this date</h2><p>Create and save a baseline before recording updates.</p><button className="primary-button" onClick={() => setView('plan')}>Plan tomorrow</button></div> }

function ReviewView({ date, setDate, plan, status, refresh, setNotice, setView }) {
  const [journal, setJournal] = useState(''); const [writing, setWriting] = useState(false)
  useEffect(() => setJournal(plan?.journal ?? ''), [plan?.journal, date])
  async function draftJournal() { if (!plan) return; setWriting(true); try { const text = await window.zoro.makeJournal({ date, updates: plan.updates ?? [] }); setJournal(text) } catch (error) { setNotice(error.message) } finally { setWriting(false) } }
  async function saveJournal() { await window.zoro.saveJournal({ date, journal }); setNotice('Journal saved locally.'); await refresh(date) }
  const updates = plan?.updates ?? []
  return <><header className="topbar"><div><span className="eyebrow">DAY REVIEW / EVIDENCE</span><h1>Review the day honestly</h1><p>Compare the baseline with only what you recorded.</p></div></header><section className="single-layout"><DateControl date={date} setDate={setDate} />{!plan ? <EmptyPlan setView={setView} /> : <><div className="review-grid"><section className="comparison-card"><h2>Planned vs recorded</h2>{plan.baselineBlocks.map((block) => { const matches = updates.filter((item) => item.taskTitle?.toLowerCase() === block.title.toLowerCase()); return <div className="comparison-row" key={block.id}><span>{block.start}–{block.end}</span><strong>{block.title}</strong><em>{matches.length ? matches.map((item) => item.outcome).join(', ') : 'Not recorded'}</em></div> })}</section><section className="journal-card"><span className="eyebrow">YOUR DAY, IN YOUR WORDS</span><h2>Journal draft</h2><textarea value={journal} onChange={(event) => setJournal(event.target.value)} placeholder="Generate a draft from your confirmed updates, then edit it in your own words." /><div className="actions"><button className="secondary-button" disabled={writing || updates.length === 0 || !status.online} onClick={draftJournal}>{writing ? <LoaderCircle className="spin" size={17} /> : <Sparkles size={17} />}{writing ? 'Writing locally…' : 'Generate draft'}</button><button className="primary-button" onClick={saveJournal}><Check size={17} />Save journal</button></div></section></div></>}</section></>
}

function InsightsView({ plans }) {
  const days = plans.slice(-30); const totalUpdates = days.reduce((sum, plan) => sum + (plan.updates?.length ?? 0), 0); const journalDays = days.filter((plan) => plan.journal?.trim()).length; const actualMinutes = days.reduce((sum, plan) => sum + (plan.updates ?? []).reduce((inner, update) => inner + (Number(update.minutes) || 0), 0), 0); const completed = days.reduce((sum, plan) => sum + (plan.updates ?? []).filter((update) => update.outcome === 'Completed').length, 0)
  return <><header className="topbar"><div><span className="eyebrow">INSIGHTS / LOCAL RECORDS</span><h1>Patterns from your records</h1><p>Missing records stay unavailable; they are never treated as failure.</p></div></header><section className="single-layout"><div className="metrics-grid"><Metric label="Days planned" value={days.length} /><Metric label="Recorded updates" value={totalUpdates} /><Metric label="Recorded minutes" value={actualMinutes} /><Metric label="Completed updates" value={completed} /><Metric label="Journal entries" value={journalDays} /></div><section className="chart-card"><div><span className="eyebrow">LAST 30 SAVED DAYS</span><h2>Planned activity and recorded updates</h2></div>{days.length === 0 ? <p className="empty-copy">Save a plan to begin building a local history.</p> : <div className="bar-list">{days.map((plan) => <div className="bar-row" key={plan.date}><span>{plan.date}</span><div className="bar-track"><i style={{ width: `${Math.min(100, (plan.baselineBlocks?.length ?? 0) * 12)}%` }} /><b style={{ width: `${Math.min(100, (plan.updates?.length ?? 0) * 20)}%` }} /></div><small>{plan.updates?.length ?? 0} updates</small></div>)}</div>}</section><section className="insight-card"><BarChart3 size={18} /><p>{days.length < 3 ? 'Keep recording a few days before drawing conclusions. Your records are still useful day by day.' : `You have ${days.length} saved days. Use the plan-versus-recorded view to find patterns, not a productivity score.`}</p></section></section></>
}

function ModelLogView() {
  const [logs, setLogs] = useState([]); const [loading, setLoading] = useState(true); const [expanded, setExpanded] = useState(null)
  useEffect(() => { window.zoro.getModelLogs().then(setLogs).finally(() => setLoading(false)) }, [])
  return <><header className="topbar"><div><span className="eyebrow">LOCAL AI / TRANSPARENCY LOG</span><h1>What Zoro sent to Qwen</h1><p>Every model request and response is kept locally on this laptop. Nothing is sent to the cloud.</p></div></header><section className="single-layout"><section className="model-log-card"><div className="log-intro"><TerminalSquare size={20} /><div><h2>Local model activity</h2><p>Newest first · up to 100 entries retained locally</p></div></div>{loading ? <div className="log-empty"><LoaderCircle className="spin" size={20} /> Loading local records…</div> : logs.length === 0 ? <div className="log-empty">No model calls have been recorded yet. Run a plan review, save an update, or generate a journal draft.</div> : <div className="log-list">{logs.map((entry) => { const open = expanded === entry.id; const input = entry.input?.messages?.map((message) => `${message.role}: ${message.content}`).join('\n\n') ?? JSON.stringify(entry.input, null, 2); const output = entry.error ? `Error: ${entry.error}` : JSON.stringify(entry.response, null, 2); return <article className="log-entry" key={entry.id}><button className="log-summary" onClick={() => setExpanded(open ? null : entry.id)}><span className={entry.error ? 'log-error-dot' : 'status-dot'} /><strong>{entry.route}</strong><time>{new Date(entry.completedAt).toLocaleString()}</time><ChevronDown className={open ? 'rotate' : ''} size={17} /></button>{open && <div className="log-detail"><div><span>INPUT SENT TO OLLAMA</span><pre>{input}</pre></div><div><span>{entry.error ? 'LOCAL ERROR' : 'RESPONSE FROM OLLAMA'}</span><pre>{output}</pre></div></div>}</article> })}</div>}</section></section></>
}
function Metric({ label, value }) { return <article className="metric-card"><span>{label}</span><strong>{value}</strong></article> }

export default App
