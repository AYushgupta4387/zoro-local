import { useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import {
  BarChart3,
  CalendarDays,
  Check,
  ChevronDown,
  CircleHelp,
  Clock3,
  FileText,
  GripVertical,
  LayoutDashboard,
  LoaderCircle,
  Mic,
  Plus,
  Send,
  Sparkles,
  Square,
  TerminalSquare,
  X,
} from "lucide-react";

const categories = [
  "Routine",
  "Work",
  "Study",
  "Health",
  "Personal",
  "Travel",
  "Rest",
];

const dateForInput = (days = 1) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return localDate(date);
};

const localDate = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

const minutesLabel = (value) =>
  value == null ? "Time not recorded" : `${value} min recorded`;

function MarkdownText({ children }) {
  return <div className="markdown-text"><ReactMarkdown>{String(children ?? "")}</ReactMarkdown></div>;
}

function modelOutputMarkdown(entry) {
  const content = entry.response?.message?.content;
  if (typeof content !== "string") return "";
  try {
    const parsed = JSON.parse(content);
    if (typeof parsed !== "object" || parsed === null) return String(parsed);
    return Object.entries(parsed).filter(([key]) => key !== "title").map(([key, value]) => `### ${key.replace(/([A-Z])/g, " $1").replace(/^./, (letter) => letter.toUpperCase())}\n\n${typeof value === "string" ? value : `\`\`\`json\n${JSON.stringify(value, null, 2)}\n\`\`\``}`).join("\n\n");
  } catch { return content; }
}

function App() {
  const [view, setView] = useState("plan");
  const [date, setDate] = useState(dateForInput());
  const [blocks, setBlocks] = useState([]);
  const [plan, setPlan] = useState(null);
  const [plans, setPlans] = useState([]);
  const [status, setStatus] = useState({
    loading: true,
    online: false,
    modelReady: false,
  });
  const [review, setReview] = useState("");
  const [reviewing, setReviewing] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [saved, setSaved] = useState(false);
  const [notice, setNotice] = useState("");
  const refreshId = useRef(0);
  const selectedDateRef = useRef(date);

  function selectDate(nextDate) {
    if (nextDate === date) return;
    selectedDateRef.current = nextDate;
    refreshId.current += 1;
    setPlan(null);
    setBlocks([]);
    setReview("");
    setNotice("");
    setDate(nextDate);
  }

  async function refresh(selectedDate = date) {
    const request = ++refreshId.current;
    const [savedPlan, allPlans, modelStatus] = await Promise.all([
      window.zoro.getPlan(selectedDate),
      window.zoro.listPlans(),
      window.zoro.checkOllama(),
    ]);

    if (request !== refreshId.current) return;
    setPlan(savedPlan);
    setPlans(allPlans);
    setStatus({ loading: false, ...modelStatus });
    setBlocks(savedPlan?.baselineBlocks ?? []);
    setReview("");
    setSaved(false);
  }

  useEffect(() => {
    refresh();
  }, []);

  useEffect(() => {
    refresh(date);
  }, [date]);

  const sortedBlocks = useMemo(
    () => [...blocks].sort((a, b) => a.start.localeCompare(b.start)),
    [blocks],
  );
  const updates = plan?.updates ?? [];
  function updateBlock(id, field, value) {
    setBlocks((current) =>
      current.map((block) =>
        block.id === id ? { ...block, [field]: value } : block,
      ),
    );
  }
  function addBlock() {
    setBlocks((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        start: "18:30",
        end: "19:00",
        title: "New activity",
        category: "Personal",
      },
    ]);
  }

  function removeBlock(id) {
    setBlocks((current) => current.filter((block) => block.id !== id));
  }

  async function savePlan() {
    await window.zoro.savePlan({ date, blocks: sortedBlocks });
    setSaved(true);
    setNotice("Baseline saved locally.");
    await refresh();
    setTimeout(() => setSaved(false), 2500);
  }

  async function getReview() {
    setReviewing(true);
    setReview("");
    try {
      setReview(await window.zoro.reviewPlan({ date, blocks: sortedBlocks }));
    } catch (error) {
      setReview(`Could not complete the review: ${error.message}`);
    } finally {
      setReviewing(false);
    }
  }

  async function generateSamplePlan() {
    const requestedDate = date;
    setGenerating(true);
    setNotice("");
    setReview("");
    try {
      const generated = await window.zoro.generatePlan({ date: requestedDate });
      if (selectedDateRef.current !== requestedDate) return;
      refreshId.current += 1;
      setBlocks(generated);
      setNotice(
        `Sample plan for ${requestedDate} generated locally. Edit it, then save the baseline when it is ready.`,
      );
    } catch (error) {
      if (selectedDateRef.current === requestedDate) setNotice(`I could not generate a local sample plan. (${error.message})`);
    } finally {
      setGenerating(false);
    }
  }

  const nav = [
    ["plan", CalendarDays, "Plan tomorrow"],
    ["today", Clock3, "Today"],
    ["review", FileText, "Journal & day review"],
    ["insights", LayoutDashboard, "Insights"],
    ["ai-log", TerminalSquare, "AI activity"],
  ];

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">Z</span>
          <span>
            Zoro <em>Local</em>
          </span>
        </div>
        <div className="workspace-label">WORKSPACE</div>
        <nav>
          {nav.map(([id, Icon, label]) => (
            <button
              key={id}
              className={`nav-item ${view === id ? "active" : ""}`}
              onClick={() => setView(id)}
            >
              <Icon size={19} /> {label}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="privacy-note">
            <span className="status-dot" /> Your records stay on this laptop
          </div>
          <button className="help">
            <CircleHelp size={16} /> How Zoro works
          </button>
        </div>
      </aside>
      <main className="main">
        <div className="window-bar">
          <span>ZORO LOCAL / OFFLINE PLANNER</span>
          <div
            className={`local-status ${status.online && status.modelReady ? "ready" : ""}`}
          >
            <span className="status-dot" />
            {status.loading
              ? "CHECKING LOCAL AI"
              : status.online && status.modelReady
                ? "LOCAL // QWEN3 8B READY"
                : "LOCAL AI NOT READY"}
          </div>
        </div>
        {view === "plan" && (
          <PlanningView
            {...{
              date,
              setDate: selectDate,
              blocks: sortedBlocks,
              updateBlock,
              addBlock,
              removeBlock,
              review,
              reviewing,
              generating,
              getReview,
              generateSamplePlan,
              savePlan,
              saved,
              notice,
              plans,
            }}
          />
        )}
        {view === "today" && (
          <TodayView
            {...{ date, setDate: selectDate, plan: plan?.date === date ? plan : null, plans, status, refresh, setView, setNotice }}
          />
        )}
        {view === "review" && (
          <ReviewView key={date}
            {...{ date, setDate: selectDate, plan: plan?.date === date ? plan : null, plans, status, refresh, setNotice, setView }}
          />
        )}
        {view === "insights" && <InsightsView plans={plans} />}
        {view === "ai-log" && <ModelLogView />}
      </main>
    </div>
  );
}

function JournalConversation({ date, onKeep }) {
  const [question, setQuestion] = useState("");
  const [turns, setTurns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const thread = useRef(null);
  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => window.zoro.getConversation(date))
      .then(items => { if (active) setTurns(items); })
      .catch(err => { if (active) setError(err.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [date]);
  useEffect(() => {
    if (thread.current) thread.current.scrollTop = thread.current.scrollHeight;
  }, [turns, pending]);
  async function submit(event) {
    event.preventDefault();
    const thought = question.trim();
    if (!thought || loading || pending) return;
    setPending(true);
    setError("");
    try {
      const reply = await window.zoro.askPlanner({question: thought, today: dateForInput(0), journalDate: date});
      setTurns(current => [...current, reply]);
      setQuestion("");
    } catch (failure) {
      setError(failure.message);
    } finally { setPending(false); }
  }
  return <section className="journal-conversation update-composer">
    <span className="eyebrow">PRIVATE JOURNAL · {date}</span>
    <h2>What’s on your mind?</h2>
    <p>Talk it through with Zoro, your AI journaling companion. Your conversation is saved on this laptop for this date.</p>
    <div className="journal-thread" ref={thread} role="log" aria-label="Journal conversation">
      {turns.map(turn => <article key={turn.id}>
        <div className="journal-message my-thought"><strong>You</strong><p>{turn.question}</p>
          {onKeep && <button type="button" className="ghost-button" onClick={() => onKeep(turn.question)}>Add my words to draft</button>}
        </div>
        <div className="journal-message"><strong>Zoro</strong><MarkdownText>{turn.answer}</MarkdownText>
          {!!turn.sources?.length && <details><summary>Records used</summary>
            {turn.sources.map((source,i) => <pre key={i} className="lookup-data">{JSON.stringify(source.data,null,2)}</pre>)}
          </details>}
        </div>
      </article>)}
      {pending && <p role="status">Zoro is reading your message…</p>}
    </div>
    <form onSubmit={submit}>
      <textarea aria-label="Journal message" maxLength={2000} disabled={loading || pending}
        value={question} onChange={event => setQuestion(event.target.value)}
        placeholder="Something that stayed with me today was…" />
      <div className="actions"><button className="primary-button" disabled={loading || pending || !question.trim()}>Send message</button></div>
      {error && <p role="alert">{error}</p>}
    </form>
  </section>;
}

function DateControl({ date, setDate, plans = [] }) {
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(() => new Date(`${date}T12:00:00`));
  useEffect(() => setMonth(new Date(`${date}T12:00:00`)), [date]);
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const offset = (first.getDay() + 6) % 7;
  const count = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const planned = new Set(plans.map((item) => item.date));
  return (
    <div className="date-row">
      <div className="date-picker">
        <label>SELECT DATE</label>
        <div className="date-controls">
          <button type="button" className="date-trigger" aria-expanded={open} onClick={() => setOpen(!open)}><CalendarDays size={18} /> {new Date(`${date}T12:00:00`).toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "long", year: "numeric" })} <ChevronDown size={16} /></button>
          <button type="button" className="secondary-button" onClick={() => { setDate(dateForInput(0)); setOpen(false); }}>Today</button>
        </div>
        {open && <div className="calendar-popover" role="dialog" aria-label="Choose a date">
          <div className="calendar-heading"><button type="button" aria-label="Previous month" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}>‹</button><strong>{month.toLocaleDateString(undefined, { month: "long", year: "numeric" })}</strong><button type="button" aria-label="Next month" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}>›</button></div>
          <div className="calendar-grid">{["M", "T", "W", "T", "F", "S", "S"].map((day, i) => <span className="calendar-weekday" key={i}>{day}</span>)}{Array.from({ length: offset }, (_, i) => <span key={`blank-${i}`} />)}{Array.from({ length: count }, (_, i) => { const value = localDate(new Date(month.getFullYear(), month.getMonth(), i + 1)); return <button type="button" key={value} aria-label={`${value}${planned.has(value) ? ", plan saved" : ""}`} aria-pressed={value === date} className={`calendar-day ${value === date ? "selected" : ""} ${planned.has(value) ? "has-plan" : ""}`} onClick={() => { setDate(value); setOpen(false); }}>{i + 1}</button>; })}</div>
          <div className="calendar-legend"><i /> Plan saved</div>
        </div>}
      </div>
    </div>
  );
}

function PlanningView({
  date,
  setDate,
  blocks,
  updateBlock,
  addBlock,
  removeBlock,
  review,
  reviewing,
  generating,
  getReview,
  generateSamplePlan,
  savePlan,
  saved,
  notice,
  plans,
}) {
  return (
    <>
      <header className="topbar">
        <div>
          <span className="eyebrow">NIGHT PLANNING / BASELINE MODE</span>
          <h1>Plan for tomorrow</h1>
          <p>
            Build tomorrow in your own words. Zoro will only offer a quiet
            second look.
          </p>
        </div>
      </header>
      <section className="planning-layout">
        <div className="plan-canvas">
          <div className="plan-date-line">
            <DateControl date={date} setDate={setDate} plans={plans} />
            <div className="baseline-note">
              <Clock3 size={16} /> This becomes this date’s baseline after you
              save it.
            </div>
          </div>
          <div className="section-head">
            <div>
              <h2>Your time blocks</h2>
              <p>
                {blocks.length
                  ? "Create the day in your own words. Zoro reviews; you decide."
                  : "This date is fresh. Add your first block or generate an editable sample."}
              </p>
            </div>
            <div className="plan-actions">
              <button
                className="secondary-button"
                onClick={generateSamplePlan}
                disabled={generating}
              >
                {generating ? (
                  <LoaderCircle className="spin" size={17} />
                ) : (
                  <Sparkles size={17} />
                )}
                {generating
                  ? "Generating locally…"
                  : "Generate a sample plan for this date"}
              </button>
              <button className="ghost-button" onClick={addBlock}>
                <Plus size={16} /> Add block
              </button>
            </div>
          </div>
          <BlockTable {...{ blocks, updateBlock, removeBlock }} />
          <div className="actions">
            <button
              className="secondary-button"
              onClick={getReview}
              disabled={reviewing || blocks.length === 0}
            >
              {reviewing ? (
                <LoaderCircle className="spin" size={17} />
              ) : (
                <Sparkles size={17} />
              )}
              {reviewing ? "Reviewing locally…" : "Review my plan"}
            </button>
            <button
              className="primary-button"
              onClick={savePlan}
              disabled={blocks.length === 0}
            >
              <Check size={17} />
              {saved ? "Baseline saved" : "Save this date’s baseline"}
            </button>
          </div>
          {notice && <p className="inline-notice">{notice}</p>}
        </div>
        <ReviewPanel review={review} reviewing={reviewing} />
      </section>
    </>
  );
}

function BlockTable({ blocks, updateBlock, removeBlock }) {
  return (
    <div className="timeline-card">
      <div className="timeline-header">
        <span>TIME</span>
        <span>ACTIVITY</span>
        <span>CATEGORY</span>
        <span />
      </div>
      {blocks.map((block) => (
        <div className="block-row" key={block.id}>
          <GripVertical className="drag" size={16} />
          <div className="time-inputs">
            <TimePicker
              label="Start time"
              value={block.start}
              onChange={(value) => updateBlock(block.id, "start", value)}
            />
            <span>—</span>
            <TimePicker
              label="End time"
              value={block.end}
              onChange={(value) => updateBlock(block.id, "end", value)}
            />
          </div>
          <input
            className="activity-input"
            aria-label="Activity"
            value={block.title}
            onChange={(event) =>
              updateBlock(block.id, "title", event.target.value)
            }
          />
          <CategoryPicker
            value={block.category}
            onChange={(value) => updateBlock(block.id, "category", value)}
          />
          <button
            className="remove-button"
            aria-label={`Remove ${block.title}`}
            onClick={() => removeBlock(block.id)}
          >
            <X size={16} />
          </button>
        </div>
      ))}
    </div>
  );
}

function TimePicker({ label, value, onChange }) {
  const [open, setOpen] = useState(false);
  const [hour, minute] = value.split(":");
  const hours = Array.from({ length: 24 }, (_, index) =>
    String(index).padStart(2, "0"),
  );
  const minutes = Array.from({ length: 60 }, (_, index) =>
    String(index).padStart(2, "0"),
  );
  return (
    <div className="time-picker">
      <button
        type="button"
        className="time-trigger"
        aria-label={label}
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <span>{value}</span>
        <Clock3 size={14} />
      </button>
      {open && (
        <div className="time-menu" role="dialog" aria-label={`${label} picker`}>
          <div className="time-column">
            {hours.map((item) => (
              <button
                type="button"
                className={item === hour ? "selected" : ""}
                key={item}
                onClick={() => onChange(`${item}:${minute}`)}
              >
                {item}
              </button>
            ))}
          </div>
          <div className="time-column">
            {minutes.map((item) => (
              <button
                type="button"
                className={item === minute ? "selected" : ""}
                key={item}
                onClick={() => {
                  onChange(`${hour}:${item}`);
                  setOpen(false);
                }}
              >
                {item}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function CategoryPicker({ value, onChange }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`select-wrap category-${value.toLowerCase()}`}>
      <button
        type="button"
        className="category-trigger"
        aria-label="Category"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        {value}
        <ChevronDown size={14} />
      </button>
      {open && (
        <div className="category-menu" role="listbox">
          {categories.map((category) => (
            <button
              type="button"
              role="option"
              aria-selected={category === value}
              className={`category-${category.toLowerCase()} ${category === value ? "selected" : ""}`}
              key={category}
              onClick={() => {
                onChange(category);
                setOpen(false);
              }}
            >
              {category}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ReviewPanel({ review, reviewing }) {
  return (
    <aside className="review-panel">
      <div className="review-title">
        <span className="ai-icon">
          <Sparkles size={16} />
        </span>
        <div>
          <span className="eyebrow">LOCAL AI REVIEW</span>
          <h2>Observations, not orders</h2>
        </div>
      </div>
      {reviewing && (
        <div className="review-empty">
          <LoaderCircle className="spin" size={22} />
          <p>Qwen is checking your plan locally.</p>
        </div>
      )}
      {!reviewing && !review && (
        <div className="review-empty">
          <Sparkles size={22} />
          <p>
            When you are ready, Zoro can check for overlaps, missing
            transitions, breaks, and realistic buffers.
          </p>
          <span>It will not change your plan.</span>
        </div>
      )}
      {!reviewing && review && (
        <div className="review-result">
          <MarkdownText>{review}</MarkdownText>
        </div>
      )}
      <div className="review-footer">
        <span className="status-dot" /> Runs on your laptop with Qwen3 8B
      </div>
    </aside>
  );
}

function TodayView({
  date,
  setDate,
  plan,
  plans,
  status,
  refresh,
  setView,
  setNotice,
}) {
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);
  const [recording, setRecording] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState("");
  const [feedback, setFeedback] = useState("");

  const recorder = useRef(null);
  const chunks = useRef([]);

  const updates = plan?.updates ?? [];

  async function submit() {
    if (!text.trim() || !plan) return;

    setSaving(true);

    try {
      const parsed =
        status.online && status.modelReady
          ? await window.zoro.parseUpdate({ text, blocks: plan.baselineBlocks })
          : {
              taskTitle: "Unclassified update",
              outcome: "Unknown",
              minutes: null,
              blocker: null,
              summary: text,
            };

      await window.zoro.addUpdate({
        date,
        update: { rawText: text, ...parsed },
      });

      setText("");
      setFeedback("Update saved locally.");
      
      await refresh(date);
    } catch (error) {
      setFeedback(`Could not save update: ${error.message}`);
    } finally {
      setSaving(false);
    }
  }

  async function startVoice() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      chunks.current = [];

      const media = new MediaRecorder(stream);
      recorder.current = media;

      media.ondataavailable = (event) => chunks.current.push(event.data);

      media.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        const blob = new Blob(chunks.current, { type: media.mimeType });
        const bytes = new Uint8Array(await blob.arrayBuffer());
        let binary = "";
        bytes.forEach((byte) => {
          binary += String.fromCharCode(byte);
        });
        const result = await window.zoro.saveVoice({
          date,
          mimeType: media.mimeType,
          base64: btoa(binary),
        });
        setVoiceStatus(result.transcription);
        setRecording(false);
      };

      media.start();

      setRecording(true);
    } catch {
      setVoiceStatus(
        "Microphone access was not granted. You can still type an update.",
      );
    }
  }

  function stopVoice() {
    recorder.current?.stop();
  }

  return (
    <>
      <header className="topbar">
        <div>
          <span className="eyebrow">TODAY / ACTUAL ACTIVITY</span>
          <h1>Follow the day as it happens</h1>
          <p>Record what happened. Zoro keeps your original plan visible.</p>
        </div>
      </header>
      <section className="single-layout">
        <DateControl date={date} setDate={setDate} plans={plans} />
        {!plan ? (
          <EmptyPlan setView={setView} />
        ) : (
          <>
            <div className="today-grid">
              <div>
                <h2 className="view-title">Planned timeline</h2>
                <div className="actual-timeline">
                  {plan.baselineBlocks.map((block) => (
                    <div className="actual-block" key={block.id}>
                      <span className="timeline-time">
                        {block.start}–{block.end}
                      </span>
                      <div>
                        <strong>{block.title}</strong>
                        <small><span className={`category-label category-${block.category.toLowerCase()}`}>{block.category}</span></small>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="update-composer">
                <div>
                  <span className="eyebrow">REAL-TIME UPDATE</span>
                  <h2>What happened?</h2>
                  <p>
                    Type naturally. The local model extracts only what you said.
                  </p>
                </div>

                <textarea
                  value={text}
                  onChange={(event) => setText(event.target.value)}
                  placeholder="I completed React study for 75 minutes, but got distracted twice."
                />

                <div className="composer-actions">
                  <button
                    className={`voice-button ${recording ? "recording" : ""}`}
                    onClick={recording ? stopVoice : startVoice}
                  >
                    {recording ? <Square size={16} /> : <Mic size={17} />}
                    {recording ? "Stop recording" : "Record voice"}
                  </button>

                  <button
                    className="primary-button"
                    disabled={saving || !text.trim()}
                    onClick={submit}
                  >
                    {saving ? (
                      <LoaderCircle className="spin" size={17} />
                    ) : (
                      <Send size={17} />
                    )}
                    Save update
                  </button>
                </div>
                {voiceStatus && <p className="voice-note">{voiceStatus}</p>}
                {feedback && <p className="inline-notice" role="status">{feedback}</p>}
              </div>
            </div>
            <ActivityLog updates={updates} date={date} />
          </>
        )}
      </section>
    </>
  );
}

function ActivityLog({ updates, date }) {
  return (
    <section className="activity-log" aria-label="Your activity log">
      <header className="activity-log-heading">
        <div className="activity-log-title"><Clock3 size={23} /><h2>Your activity log</h2></div>
        <span>{updates.length} {updates.length === 1 ? "check-in" : "check-ins"}{updates.length > 1 && " · Newest first"}</span>
      </header>
      {updates.length === 0 ? (
        <p className="activity-log-empty">Save your first update above to start this day’s log.</p>
      ) : (
        <ol className="activity-log-list">
          {updates.slice().reverse().map(item => {
            const stamp = new Date(item.timestamp ?? "");
            const hasTime = Number.isFinite(stamp.getTime());
            const outcome = item.outcome || "Unknown";
            const note = item.rawText?.trim();
            const summary = item.summary?.trim();
            return (
              <li className="activity-log-entry" key={item.id}>
                <div className="checkin-time">
                  {hasTime ? <time dateTime={stamp.toISOString()} title={stamp.toLocaleString()}>
                    {stamp.toLocaleTimeString("en-GB", {hour: "2-digit", minute: "2-digit"})}
                    {localDate(stamp) !== date && <small>{localDate(stamp)}</small>}
                  </time> : <span>Time unknown</span>}
                </div>
                <article className="checkin-body">
                  <header className="checkin-heading">
                    <h3>{item.taskTitle || "Activity update"}</h3>
                    <span className={`outcome ${outcome.toLowerCase().replaceAll(" ", "-")}`}>{outcome}</span>
                  </header>
                  {note && <blockquote className="checkin-note">{note}</blockquote>}
                  {item.minutes != null && <p className="checkin-meta"><Clock3 size={15} /> {minutesLabel(item.minutes)}</p>}
                  {item.blocker && <p className="checkin-meta"><strong>Blocker</strong> {item.blocker}</p>}
                  {summary && summary !== note && <details className="checkin-summary">
                    <summary><Sparkles size={15} /> AI summary <ChevronDown size={15} /></summary>
                    <MarkdownText>{summary}</MarkdownText>
                  </details>}
                </article>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}

function EmptyPlan({ setView }) {
  return (
    <div className="empty-state">
      <CalendarDays size={28} />
      <h2>No plan for this date</h2>
      <p>Create and save a baseline before recording updates.</p>
      <button className="primary-button" onClick={() => setView("plan")}>
        Plan tomorrow
      </button>
    </div>
  );
}

function ReviewView({
  date,
  setDate,
  plan,
  plans,
  status,
  refresh,
  setNotice,
  setView,
}) {
  const [journal, setJournal] = useState("");
  const [writing, setWriting] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [saving, setSaving] = useState(false);
  useEffect(() => setJournal(plan?.journal ?? ""), [plan?.journal, date]);
  useEffect(() => setFeedback(""), [date]);
  async function draftJournal() {
    if (!plan) return;
    setWriting(true);
    try {
      const text = await window.zoro.makeJournal({
        date,
        updates: plan.updates ?? [],
      });
      setJournal(text);
    } catch (error) {
      setFeedback(`Could not generate draft: ${error.message}`);
    } finally {
      setWriting(false);
    }
  }
  async function saveJournal() {
    setSaving(true);
    try {
      await window.zoro.saveJournal({ date, journal });
      await refresh(date);
      setFeedback("Journal saved locally.");
    } catch (error) {
      setFeedback(`Could not save journal: ${error.message}`);
    } finally { setSaving(false); }
  }
  const updates = plan?.updates ?? [];
  return (
    <>
      <header className="topbar">
        <div>
          <span className="eyebrow">DAY REVIEW / EVIDENCE</span>
          <h1>Journal &amp; day review</h1>
          <p>Compare the baseline with only what you recorded.</p>
        </div>
      </header>
      <section className="single-layout">
        <DateControl date={date} setDate={setDate} plans={plans} />
        <JournalConversation date={date} onKeep={plan ? thought => setJournal(current => [current, thought].filter(Boolean).join("\n\n")) : null} />
        {!plan ? (
          <EmptyPlan setView={setView} />
        ) : (
          <>
            <div className="review-grid">
              <section className="comparison-card">
                <h2>Planned vs recorded</h2>
                <p className="empty-copy">Each row compares a planned activity with the updates matched to it.</p>
                <div className="comparison-head"><span>PLANNED</span><span>RECORDED</span></div>
                {plan.baselineBlocks.map((block) => {
                  const matches = updates.filter(
                    (item) =>
                      item.taskTitle?.toLowerCase() ===
                      block.title.toLowerCase(),
                  );
                  return (
                    <div className="comparison-row" key={block.id}>
                      <div><strong>{block.title}</strong><small>{block.start}–{block.end} · <span className={`category-label category-${block.category.toLowerCase()}`}>{block.category}</span></small></div>
                      <div>{matches.length ? matches.map((item) => <div className="comparison-update" key={item.id}><strong>{item.outcome || "Unknown"}</strong><MarkdownText>{item.summary || item.rawText}</MarkdownText><small>{minutesLabel(item.minutes)}{item.blocker ? ` · Blocker: ${item.blocker}` : ""}</small></div>) : <small>Not recorded</small>}</div>
                    </div>
                  );
                })}
                {updates.filter((item) => !plan.baselineBlocks.some((block) => block.title.toLowerCase() === item.taskTitle?.toLowerCase())).length > 0 && <div className="unmatched-updates"><strong>Other recorded updates</strong>{updates.filter((item) => !plan.baselineBlocks.some((block) => block.title.toLowerCase() === item.taskTitle?.toLowerCase())).map((item) => <div key={item.id}><strong>{item.taskTitle || "Unclassified"}</strong><MarkdownText>{item.summary || item.rawText}</MarkdownText></div>)}</div>}
              </section>
              <section className="journal-card">
                <span className="eyebrow">YOUR DAY, IN YOUR WORDS</span>
                <h2>Journal draft</h2>
                <textarea
                  value={journal}
                  onChange={(event) => setJournal(event.target.value)}
                  placeholder="Generate a draft from your confirmed updates, then edit it in your own words."
                />
                {journal.trim() && <div className="journal-preview"><strong>Formatted preview</strong><MarkdownText>{journal}</MarkdownText></div>}
                <div className="actions">
                  <button
                    className="secondary-button"
                    disabled={writing || updates.length === 0 || !status.online}
                    onClick={draftJournal}
                  >
                    {writing ? (
                      <LoaderCircle className="spin" size={17} />
                    ) : (
                      <Sparkles size={17} />
                    )}
                    {writing ? "Writing locally…" : "Generate draft"}
                  </button>
                  <button className="primary-button" onClick={saveJournal} disabled={saving}>
                    <Check size={17} />
                    {saving ? "Saving…" : "Save journal"}
                  </button>
                </div>
                {feedback && <p className="inline-notice" role="status">{feedback}</p>}
              </section>
            </div>
          </>
        )}
      </section>
    </>
  );
}

function InsightsView({ plans }) {
  const [demo, setDemo] = useState(false);
  const demoPlans = useMemo(() => Array.from({ length: 84 }, (_, index) => {
    const date = dateForInput(index - 83);
    const count = [0, 1, 2, 3, 2, 1, 0][index % 7];
    return { date, baselineBlocks: Array.from({ length: 3 + index % 3 }, () => ({})), updates: Array.from({ length: count }, (_, i) => ({ outcome: i === 0 ? "Completed" : "In Progress", minutes: 30 + 15 * i })), journal: index % 3 === 0 ? "Example journal entry" : "" };
  }), []);
  const sourcePlans = demo ? demoPlans : plans;
  const days = sourcePlans.slice(-30);
  const maxCount = Math.max(1, ...days.flatMap((item) => [item.baselineBlocks?.length ?? 0, item.updates?.length ?? 0]));
  const recentDates = Array.from({ length: 84 }, (_, index) => dateForInput(index - 83));
  const byDate = new Map(sourcePlans.map((item) => [item.date, item]));
  const totalUpdates = days.reduce(
    (sum, plan) => sum + (plan.updates?.length ?? 0),
    0,
  );
  const journalDays = days.filter((plan) => plan.journal?.trim()).length;
  const actualMinutes = days.reduce(
    (sum, plan) =>
      sum +
      (plan.updates ?? []).reduce(
        (inner, update) => inner + (Number(update.minutes) || 0),
        0,
      ),
    0,
  );
  const completed = days.reduce(
    (sum, plan) =>
      sum +
      (plan.updates ?? []).filter((update) => update.outcome === "Completed")
        .length,
    0,
  );
  return (
    <>
      <header className="topbar">
        <div>
          <span className="eyebrow">INSIGHTS / LOCAL RECORDS</span>
          <h1>Patterns from your records</h1>
          <p>
            Missing records stay unavailable; they are never treated as failure.
          </p>
        </div>
      </header>
      <section className="single-layout">
        <div className="demo-toolbar"><div><strong>{demo ? "Sample data preview" : "Your local records"}</strong><p>{demo ? "Illustrative data only. It is not saved or mixed with your own plans." : "Try sample data to explore the dashboard without changing your records."}</p></div><button className="secondary-button" onClick={() => setDemo(!demo)}>{demo ? "Show my records" : "View sample data"}</button></div>
        <div className="metrics-grid">
          <Metric label="Days planned" value={days.length} />
          <Metric label="Recorded updates" value={totalUpdates} />
          <Metric label="Recorded minutes" value={actualMinutes} />
          <Metric label="Completed updates" value={completed} />
          <Metric label="Journal entries" value={journalDays} />
        </div>
        <section className="chart-card activity-tracker">
          <span className="eyebrow">LAST 12 WEEKS / ACTIVITY</span>
          <h2>Daily check-in tracker</h2>
          <p className="empty-copy">Each square represents a day; darker green means more recorded updates. An empty square means no update recorded.</p>
          <div className="tracker-grid">{recentDates.map((day) => { const count = byDate.get(day)?.updates?.length ?? 0; return <div key={day} className={`tracker-cell level-${Math.min(count, 3)}`} title={`${day}: ${count} recorded update${count === 1 ? "" : "s"}`} aria-label={`${day}: ${count} recorded updates`} />; })}</div>
          <div className="tracker-legend">Fewer <i className="level-0" /><i className="level-1" /><i className="level-2" /><i className="level-3" /> More updates</div>
        </section>
        <section className="chart-card">
          <div>
            <span className="eyebrow">LAST 30 SAVED DAYS</span>
            <h2>Plans and updates by date</h2>
            <p className="empty-copy">Counts show planned blocks and recorded updates; they are not a completion rate.</p>
            <div className="chart-legend"><span><i className="planned-key" /> Planned blocks</span><span><i className="updates-key" /> Recorded updates</span></div>
          </div>
          {days.length === 0 ? (
            <p className="empty-copy">
              Save a plan to begin building a local history.
            </p>
          ) : (
            <div className="bar-list">
              {days.map((plan) => (
                <div className="bar-row" key={plan.date}>
                  <span>{plan.date}</span>
                  <div className="bar-track">
                    <i
                      style={{
                        width: `${(plan.baselineBlocks?.length ?? 0) / maxCount * 100}%`,
                      }}
                    />
                    <b
                      style={{
                        width: `${(plan.updates?.length ?? 0) / maxCount * 100}%`,
                      }}
                    />
                  </div>
                  <small>{plan.baselineBlocks?.length ?? 0} blocks · {plan.updates?.length ?? 0} updates</small>
                </div>
              ))}
            </div>
          )}
        </section>
        <section className="insight-card">
          <BarChart3 size={18} />
          <p>
            {days.length < 3
              ? "Keep recording a few days before drawing conclusions. Your records are still useful day by day."
              : `You have ${days.length} saved days. Use the plan-versus-recorded view to find patterns, not a productivity score.`}
          </p>
        </section>
      </section>
    </>
  );
}

function ModelLogView() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    window.zoro
      .getModelLogs()
      .then(setLogs)
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <header className="topbar">
        <div>
          <span className="eyebrow">LOCAL AI / TRANSPARENCY LOG</span>
          <h1>What Zoro sent to Qwen</h1>
          <p>
            Every model request and response is kept locally on this laptop.
            Nothing is sent to the cloud.
          </p>
        </div>
      </header>
      <section className="single-layout">
        <section className="model-log-card">
          <div className="log-intro">
            <TerminalSquare size={20} />
            <div>
              <h2>Local model activity</h2>
              <p>Newest first · up to 100 entries retained locally</p>
            </div>
          </div>

          {loading ? (
            <div className="log-empty">
              <LoaderCircle className="spin" size={20} /> Loading local records…
            </div>
          ) : logs.length === 0 ? (
            <div className="log-empty">
              No model calls have been recorded yet. Run a plan review, save an
              update, or generate a journal draft.
            </div>
          ) : (
            <div className="log-list">
              {logs.map((entry) => {
                const open = expanded === entry.id;
                const input = open && JSON.stringify(entry.input, null, 2);
                const output = !open ? "" : entry.error
                  ? `Error: ${entry.error}`
                  : JSON.stringify(entry.response, null, 2);
                return (
                  <article className="log-entry" key={entry.id}>
                    <button
                      className="log-summary"
                      onClick={() => setExpanded(open ? null : entry.id)}
                    >
                      <span
                        className={entry.error ? "log-error-dot" : "status-dot"}
                      />
                      <strong>{entry.title || (entry.input?.messages?.[0]?.content?.startsWith("Extract a factual") ? "Activity update analysis" : entry.input?.messages?.[0]?.content?.startsWith("Create one illustrative") ? "Sample day plan" : entry.input?.messages?.[0]?.content?.startsWith("Write a concise") ? "Journal draft" : entry.input?.messages?.[0]?.content?.startsWith("You are Zoro") ? "Plan review" : "Local model request")}</strong>
                      <time>
                        {new Date(entry.completedAt).toLocaleString()}
                      </time>
                      <ChevronDown className={open ? "rotate" : ""} size={17} />
                    </button>
                    {open && (
                      <div className="log-detail">
                        <div>
                          <span>INPUT SENT TO OLLAMA</span>
                          <pre>{input}</pre>
                        </div>
                        <div>
                          <span>
                            {entry.error
                              ? "LOCAL ERROR"
                              : "RESPONSE FROM OLLAMA"}
                          </span>
                          {modelOutputMarkdown(entry) && <><span>FORMATTED MODEL RESPONSE</span><MarkdownText>{modelOutputMarkdown(entry)}</MarkdownText></>}
                          <span>RAW RESPONSE</span><pre>{output}</pre>
                        </div>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </section>
    </>
  );
}

function Metric({ label, value }) {
  return (
    <article className="metric-card">
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

export default App;
