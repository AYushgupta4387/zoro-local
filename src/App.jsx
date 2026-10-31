import { useEffect, useMemo, useState } from 'react'
import { CalendarDays, Check, ChevronDown, CircleHelp, Clock3, GripVertical, LayoutDashboard, LoaderCircle, Plus, Sparkles, X } from 'lucide-react'

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

function App() {
  const [date, setDate] = useState(dateForInput())
  const [blocks, setBlocks] = useState(defaultBlocks)
  const [status, setStatus] = useState({ loading: true, online: false, modelReady: false })
  const [review, setReview] = useState('')
  const [reviewing, setReviewing] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    async function initialise() {
      const [plan, modelStatus] = await Promise.all([window.zoro.getPlan(), window.zoro.checkOllama()])
      if (plan) { setDate(plan.date); setBlocks(plan.blocks) }
      setStatus({ loading: false, ...modelStatus })
    }
    initialise()
  }, [])

  const sortedBlocks = useMemo(() => [...blocks].sort((a, b) => a.start.localeCompare(b.start)), [blocks])

  function updateBlock(id, field, value) { setBlocks((current) => current.map((block) => block.id === id ? { ...block, [field]: value } : block)) }
  function addBlock() { setBlocks((current) => [...current, { id: crypto.randomUUID(), start: '18:30', end: '19:00', title: 'New activity', category: 'Personal' }]) }
  function removeBlock(id) { setBlocks((current) => current.filter((block) => block.id !== id)) }
  async function savePlan() { await window.zoro.savePlan({ date, blocks: sortedBlocks }); setSaved(true); setTimeout(() => setSaved(false), 2500) }
  async function getReview() {
    setReviewing(true); setReview('')
    try { setReview(await window.zoro.reviewPlan({ date, blocks: sortedBlocks })) }
    catch (error) { setReview(`I could not reach your local model. Check that Ollama is running and Qwen3 8B is installed. (${error.message})`) }
    finally { setReviewing(false) }
  }

  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><span className="brand-mark">Z</span><span>Zoro <em>Local</em></span></div>
      <div className="workspace-label">WORKSPACE</div>
      <nav>
        <button className="nav-item active"><CalendarDays size={18} /> Plan tomorrow</button>
        <button className="nav-item"><Clock3 size={18} /> Today</button>
        <button className="nav-item"><Check size={18} /> Day review</button>
        <button className="nav-item"><LayoutDashboard size={18} /> Insights</button>
      </nav>
      <div className="sidebar-bottom"><div className="privacy-note"><span className="status-dot" /> Your records stay on this laptop</div><button className="help"><CircleHelp size={16} /> How Zoro works</button></div>
    </aside>
    <main className="main">
      <header className="topbar"><div><span className="eyebrow">NIGHT PLANNING</span><h1>Plan for tomorrow</h1></div><div className={`local-status ${status.online && status.modelReady ? 'ready' : ''}`}><span className="status-dot" />{status.loading ? 'Checking local AI…' : status.online && status.modelReady ? 'LOCAL // QWEN3 8B READY' : 'LOCAL AI NOT READY'}</div></header>
      <section className="planning-layout">
        <div className="plan-canvas">
          <div className="date-row"><div><label htmlFor="plan-date">DATE</label><input id="plan-date" type="date" value={date} onChange={(event) => setDate(event.target.value)} /></div><div className="baseline-note"><Clock3 size={16} /> This becomes tomorrow’s baseline after you save it.</div></div>
          <div className="section-head"><div><h2>Your time blocks</h2><p>Create the day in your own words. Zoro reviews; you decide.</p></div><button className="ghost-button" onClick={addBlock}><Plus size={16} /> Add block</button></div>
          <div className="timeline-card">
            <div className="timeline-header"><span>TIME</span><span>ACTIVITY</span><span>CATEGORY</span><span /></div>
            {sortedBlocks.map((block) => <div className="block-row" key={block.id}>
              <GripVertical className="drag" size={16} /><div className="time-inputs"><input aria-label="Start time" type="time" value={block.start} onChange={(event) => updateBlock(block.id, 'start', event.target.value)} /><span>—</span><input aria-label="End time" type="time" value={block.end} onChange={(event) => updateBlock(block.id, 'end', event.target.value)} /></div>
              <input className="activity-input" aria-label="Activity" value={block.title} onChange={(event) => updateBlock(block.id, 'title', event.target.value)} />
              <label className="select-wrap"><select aria-label="Category" value={block.category} onChange={(event) => updateBlock(block.id, 'category', event.target.value)}>{categories.map((category) => <option key={category}>{category}</option>)}</select><ChevronDown size={14} /></label>
              <button className="remove-button" aria-label={`Remove ${block.title}`} onClick={() => removeBlock(block.id)}><X size={16} /></button>
            </div>)}
          </div>
          <div className="actions"><button className="secondary-button" onClick={getReview} disabled={reviewing || !status.online || !status.modelReady}>{reviewing ? <LoaderCircle className="spin" size={17} /> : <Sparkles size={17} />} {reviewing ? 'Reviewing locally…' : 'Review my plan'}</button><button className="primary-button" onClick={savePlan}><Check size={17} /> {saved ? 'Baseline saved' : 'Save tomorrow’s baseline'}</button></div>
        </div>
        <aside className="review-panel"><div className="review-title"><span className="ai-icon"><Sparkles size={16} /></span><div><span className="eyebrow">LOCAL AI REVIEW</span><h2>Observations, not orders</h2></div></div>
          {reviewing && <div className="review-empty"><LoaderCircle className="spin" size={22} /><p>Qwen is checking your plan locally.</p></div>}
          {!reviewing && !review && <div className="review-empty"><Sparkles size={22} /><p>When you are ready, Zoro can check for overlaps, missing transitions, breaks, and realistic buffers.</p><span>It will not change your plan.</span></div>}
          {!reviewing && review && <div className="review-result">{review.split('\n').filter(Boolean).map((line, index) => <p key={index}>{line.replace(/\*\*/g, '')}</p>)}</div>}
          <div className="review-footer"><span className="status-dot" /> Runs on your laptop with Qwen3 8B</div>
        </aside>
      </section>
    </main>
  </div>
}

export default App
