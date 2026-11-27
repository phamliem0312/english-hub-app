import { useState, useEffect, useRef, Fragment } from "react";
import {
  GAPS, RECHECK_DAYS, todayStr, nextRev, isDue, grade, scoreReading,
  dayNumber, dateOfDay, weekOf, isSunday, PHASES, phaseOf, WEEKS, tasksFor, LISTEN_STEPS, dayDone,
  RESOURCES, SAMPLES, CRITERIA, SELF_CHECK, ROLEPLAY_PROMPT, PHASE_TESTS, PASS, PART_NAMES,
} from "./learning";
import { speak, askAI, useStt } from "./browser";
import { DailyQuiz, PhaseTest } from "./Tests";

/* ════════════════════════════════════════════════════════════════════════════
   ENGLISH HUB — lộ trình 12 tuần luyện nghe–nói cho dân IT, 1 giờ mỗi ngày
════════════════════════════════════════════════════════════════════════════ */

// ─── Storage ──────────────────────────────────────────────────────────────────
// window.storage chỉ có trong Claude Artifact; ở trình duyệt thường thì dùng localStorage.
const localStore = {
  get: async (k) => { const v = localStorage.getItem(k); return v === null ? null : { value: v }; },
  set: async (k, v) => localStorage.setItem(k, v),
};
const store = () => window.storage || localStore;
const save = async (k, v) => { try { await store().set(k, JSON.stringify(v)); } catch { /* bộ nhớ đầy/bị chặn: bỏ qua */ } };
const load = async (k, d = null) => {
  try { const r = await store().get(k); if (r) return JSON.parse(r.value); } catch { /* dữ liệu hỏng: dùng mặc định */ }
  return d;
};

// Bản ghi âm theo tuần (blob quá lớn cho localStorage) → IndexedDB.
function idb(mode, fn) {
  return new Promise((ok, fail) => {
    const r = indexedDB.open('eh2', 1);
    r.onupgradeneeded = () => r.result.createObjectStore('rec');
    r.onerror = () => fail(r.error);
    r.onsuccess = () => {
      const tx = r.result.transaction('rec', mode); const q = fn(tx.objectStore('rec'));
      tx.oncomplete = () => ok(q.result); tx.onerror = () => fail(tx.error);
    };
  });
}
const putRec = (k, blob) => idb('readwrite', (s) => s.put(blob, k));
const getRec = (k) => idb('readonly', (s) => s.get(k));
const clearRecs = () => idb('readwrite', (s) => s.clear());

// ─── AI ────────────────────────────────────────────────────────────────────────
const callAIFeedback = (topic, transcript) => askAI(`A Vietnamese IT professional (around CEFR A2) is practising speaking English. Topic: ${topic}
Speech-to-text transcript of what they said (no punctuation, may contain recognition errors — ignore those):
${transcript}

Act as a friendly speaking coach. Return ONLY valid JSON:
{"summary":"1-2 sentences in Vietnamese: overall feedback and one thing to focus on","fixes":[{"said":"a phrase they said","better":"a more correct/natural phrase","note":"short reason in Vietnamese"}],"better":"an improved version of the whole answer at A2–B1 level, keeping their ideas, 4-8 short sentences"}
Give at most 5 fixes, most important first.`);

// ═══════════════════════════════════════════════════════════════════════════════
const STYLES = `
:root{
  --ink:#0b0e14; --surface:#111722; --surface2:#19202e; --raise:#1f2838;
  --line:#28303f; --line-soft:#1e2531;
  --text:#e6ebf5; --dim:#8a97b4; --faint:#5a6478;
  --gold:#f5b945; --gold-soft:rgba(245,185,69,.12);
  --green:#5fd49a; --green-soft:rgba(95,212,154,.12);
  --red:#f2766b; --red-soft:rgba(242,118,107,.1);
  --cyan:#4cc9e0; --cyan-soft:rgba(76,201,224,.1);
  --violet:#a78bfa; --violet-soft:rgba(167,139,250,.1);
  --mono:'SF Mono','JetBrains Mono','Fira Code',ui-monospace,Menlo,monospace;
  --sans:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
}
*{box-sizing:border-box;margin:0;padding:0;}
.eh-root{background:var(--ink);min-height:100vh;color:var(--text);font-family:var(--sans);-webkit-font-smoothing:antialiased;}
.eh-shell{display:flex;min-height:100vh;}
a{color:var(--cyan);}

/* Sidebar */
.eh-side{width:236px;flex-shrink:0;background:var(--surface);border-right:1px solid var(--line);padding:22px 14px;display:flex;flex-direction:column;position:sticky;top:0;height:100vh;}
.eh-brand{display:flex;align-items:center;gap:10px;padding:0 8px 22px;}
.eh-logo{width:34px;height:34px;border-radius:9px;background:linear-gradient(135deg,var(--gold),#e0992b);display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0;}
.eh-brand-name{font-size:15px;font-weight:700;letter-spacing:-.2px;line-height:1.1;}
.eh-brand-sub{font-family:var(--mono);font-size:9.5px;color:var(--dim);letter-spacing:.08em;text-transform:uppercase;margin-top:2px;}
.eh-nav{display:flex;align-items:center;gap:11px;width:100%;padding:10px 11px;border:none;background:transparent;color:var(--dim);border-radius:9px;cursor:pointer;font-family:inherit;font-size:13.5px;font-weight:500;transition:all .15s;text-align:left;position:relative;margin-bottom:2px;}
.eh-nav:hover{background:var(--surface2);color:var(--text);}
.eh-nav.on{background:var(--raise);color:var(--text);}
.eh-nav.on::before{content:'';position:absolute;left:0;top:8px;bottom:8px;width:3px;border-radius:3px;background:var(--gold);}
.eh-nav .ic{font-size:16px;width:18px;text-align:center;}
.eh-nav .dot{margin-left:auto;background:var(--red);color:#fff;font-family:var(--mono);font-size:10px;font-weight:700;border-radius:9px;padding:1px 6px;min-width:18px;text-align:center;}
.eh-side-foot{margin-top:auto;padding:12px 10px 0;border-top:1px solid var(--line-soft);}
.eh-progress-mini{font-family:var(--mono);font-size:10px;color:var(--dim);display:flex;justify-content:space-between;margin-bottom:6px;}
.eh-bar{height:5px;background:var(--line);border-radius:3px;overflow:hidden;}
.eh-bar > i{display:block;height:100%;background:linear-gradient(90deg,var(--gold),var(--green));border-radius:3px;transition:width .6s;}

/* Main */
.eh-main{flex:1;min-width:0;padding:30px 36px 60px;max-width:920px;}
.eh-pagehead{margin-bottom:24px;}
.eh-eyebrow{font-family:var(--mono);font-size:11px;color:var(--gold);letter-spacing:.14em;text-transform:uppercase;margin-bottom:7px;}
.eh-title{font-size:27px;font-weight:700;letter-spacing:-.5px;line-height:1.1;}
.eh-sub{color:var(--dim);font-size:14px;margin-top:7px;max-width:600px;line-height:1.5;}

/* Cards */
.eh-card{background:var(--surface);border:1px solid var(--line);border-radius:14px;padding:18px 20px;margin-bottom:16px;}
.eh-card.accent{border-color:rgba(245,185,69,.3);background:linear-gradient(180deg,var(--gold-soft),transparent);}
.eh-card.cyan{border-color:rgba(76,201,224,.25);}
.eh-card.violet{border-color:rgba(167,139,250,.25);}
.eh-card.green{border-color:rgba(95,212,154,.3);}
.eh-clabel{font-family:var(--mono);font-size:10px;color:var(--dim);letter-spacing:.1em;text-transform:uppercase;display:block;margin-bottom:12px;}
.eh-ctitle{font-size:15px;font-weight:650;}
.eh-p{color:var(--dim);font-size:13px;line-height:1.6;}
.eh-list{padding-left:18px;color:var(--dim);font-size:13px;line-height:1.75;}
.eh-list li::marker{color:var(--faint);}

/* Stat grid */
.eh-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:18px;}
.eh-stat{background:var(--surface);border:1px solid var(--line);border-radius:13px;padding:16px;}
.eh-stat .n{font-family:var(--mono);font-size:26px;font-weight:700;letter-spacing:-1px;line-height:1;}
.eh-stat .l{font-size:11.5px;color:var(--dim);margin-top:6px;}
.eh-stat .ic{font-size:15px;float:right;opacity:.7;}
.eh-grid3{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:16px;}
.eh-grid2{display:grid;grid-template-columns:repeat(2,1fr);gap:12px;margin-bottom:16px;}
.eh-grid3 .eh-card,.eh-grid2 .eh-card{margin:0;}

/* Tasks */
.eh-task{display:flex;gap:14px;align-items:flex-start;padding:14px 0;border-bottom:1px solid var(--line-soft);}
.eh-task:last-child{border-bottom:none;padding-bottom:0;}
.eh-task:first-child{padding-top:0;}
.eh-cb{width:22px;height:22px;flex-shrink:0;margin-top:2px;accent-color:var(--green);cursor:pointer;}
.eh-task.done .eh-task-title{color:var(--dim);text-decoration:line-through;}
.eh-task-title{font-size:14.5px;font-weight:600;}

/* Mục lục */
.eh-days{display:grid;grid-template-columns:repeat(7,1fr);gap:6px;margin-top:12px;}
.eh-day{display:flex;flex-direction:column;align-items:center;gap:2px;padding:8px 0;border-radius:9px;border:1px solid var(--line);background:var(--surface2);color:var(--dim);font-family:var(--mono);font-size:10.5px;cursor:pointer;}
.eh-day b{font-size:13px;min-height:16px;color:var(--text);}
.eh-day:hover{border-color:var(--dim);}
.eh-day:focus-visible{outline:2px solid var(--gold);outline-offset:2px;}
.eh-day.done{background:var(--green-soft);border-color:rgba(95,212,154,.35);color:var(--green);}
.eh-day.done b{color:var(--green);}
.eh-day.part{border-color:rgba(245,185,69,.4);}
.eh-day.part b{color:var(--gold);}
.eh-day.today{outline:2px solid var(--gold);outline-offset:1px;}
.eh-day.future{opacity:.5;}
.eh-day i{font-style:normal;font-size:9.5px;color:var(--violet);min-height:12px;}

/* Table */
.eh-table{width:100%;border-collapse:collapse;font-size:13.5px;}
.eh-table th{text-align:left;font-family:var(--mono);font-size:10px;color:var(--dim);letter-spacing:.08em;text-transform:uppercase;font-weight:500;padding:0 8px 10px 0;}
.eh-table td{padding:10px 8px 10px 0;border-top:1px solid var(--line-soft);vertical-align:top;line-height:1.5;}
.eh-table tr.cur td{color:var(--gold);}

/* Buttons */
.eh-btn{font-family:inherit;font-size:13.5px;font-weight:600;border-radius:10px;cursor:pointer;padding:11px 16px;transition:all .16s;display:inline-flex;align-items:center;justify-content:center;gap:8px;border:1px solid var(--line);background:transparent;color:var(--text);text-decoration:none;}
.eh-btn:hover{border-color:var(--dim);background:var(--surface2);}
.eh-btn:focus-visible,.eh-cb:focus-visible{outline:2px solid var(--gold);outline-offset:2px;}
.eh-btn:disabled{opacity:.45;cursor:not-allowed;}
.eh-btn.sm{padding:7px 12px;font-size:12px;}
.eh-btn.gold{background:var(--gold);color:#2a1d00;border-color:transparent;}
.eh-btn.gold:hover{filter:brightness(1.07);background:var(--gold);}
.eh-btn.green{background:var(--green);color:#04210f;border-color:transparent;}
.eh-btn.green:hover{filter:brightness(1.07);background:var(--green);}
.eh-btn.cyan{background:var(--cyan-soft);color:var(--cyan);border-color:rgba(76,201,224,.3);}
.eh-btn.cyan:hover{background:rgba(76,201,224,.2);}
.eh-btn.violet{background:var(--violet-soft);color:var(--violet);border-color:rgba(167,139,250,.3);}
.eh-btn.violet:hover{background:rgba(167,139,250,.2);}
.eh-btn.red{background:var(--red-soft);color:var(--red);border-color:rgba(242,118,107,.3);}
.eh-btn.red:hover{background:rgba(242,118,107,.2);}
.eh-btn.amber{background:var(--gold-soft);color:var(--gold);border-color:rgba(245,185,69,.3);}
.eh-btn.full{width:100%;}
.eh-rate{display:flex;gap:4px;}
.eh-rate button{width:30px;height:30px;border-radius:8px;border:1px solid var(--line);background:transparent;color:var(--dim);font-family:var(--mono);font-size:12px;cursor:pointer;}
.eh-rate button.on{background:var(--gold);color:#2a1d00;border-color:transparent;font-weight:700;}

/* Pills */
.eh-pill{font-family:var(--mono);font-size:10px;font-weight:600;padding:3px 8px;border-radius:20px;letter-spacing:.02em;display:inline-flex;align-items:center;gap:4px;white-space:nowrap;}

/* Inputs */
.eh-ta,.eh-sel{width:100%;background:var(--surface2);border:1px solid var(--line);border-radius:11px;padding:12px 14px;color:var(--text);font-size:14.5px;font-family:inherit;outline:none;}
.eh-ta{min-height:96px;resize:vertical;line-height:1.7;}
.eh-ta:focus,.eh-sel:focus{border-color:var(--gold);}
.eh-sel{color-scheme:dark;}
.eh-range{-webkit-appearance:none;appearance:none;flex:1;height:4px;background:var(--line);border-radius:2px;outline:none;cursor:pointer;}
.eh-range::-webkit-slider-thumb{-webkit-appearance:none;width:16px;height:16px;background:var(--gold);border-radius:50%;cursor:pointer;}

/* Word reader */
.eh-word{display:inline;cursor:pointer;padding:2px 3px;margin:0 1px;border-radius:4px;transition:background .1s;}
.eh-word:hover{background:rgba(255,255,255,.06);}
.eh-word.cur{background:var(--gold-soft);color:var(--gold);font-weight:700;}
.eh-word.done{color:#4a5468;}
.eh-w-ok{display:inline-block;padding:2px 7px;margin:2px;border-radius:5px;background:var(--green-soft);color:var(--green);font-size:14px;}
.eh-w-err{display:inline-block;padding:2px 7px;margin:2px;border-radius:5px;background:var(--red-soft);color:var(--red);font-size:14px;}

.eh-flash{min-height:190px;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;}
.eh-canvas{width:100%;display:block;border-radius:10px;background:var(--ink);margin-bottom:14px;}

@keyframes pulse{0%,100%{opacity:1}50%{opacity:.3}}
.pulse{animation:pulse 1s ease-in-out infinite;}
@keyframes fadein{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
.eh-main > *{animation:fadein .25s ease;}
@media (prefers-reduced-motion: reduce){ .eh-main > *,.pulse{animation:none;} }

/* Mobile bottom nav */
.eh-bottomnav{display:none;}
@media(max-width:760px){
  .eh-side{display:none;}
  .eh-main{padding:22px 16px 92px;max-width:none;}
  .eh-title{font-size:23px;}
  .eh-stats,.eh-grid2{grid-template-columns:1fr 1fr;}
  .eh-grid3{grid-template-columns:1fr;}
  .eh-bottomnav{display:flex;position:fixed;bottom:0;left:0;right:0;background:var(--surface);border-top:1px solid var(--line);padding:6px 4px calc(6px + env(safe-area-inset-bottom));z-index:50;}
  .eh-bn{flex:1;display:flex;flex-direction:column;align-items:center;gap:3px;background:none;border:none;color:var(--dim);cursor:pointer;font-family:inherit;font-size:9.5px;font-weight:500;padding:6px 2px;border-radius:8px;position:relative;}
  .eh-bn.on{color:var(--gold);}
  .eh-bn .ic{font-size:18px;}
  .eh-bn .dot{position:absolute;top:2px;right:50%;margin-right:-16px;background:var(--red);color:#fff;font-family:var(--mono);font-size:8px;font-weight:700;border-radius:8px;padding:0 4px;}
}
@media(max-width:480px){ .eh-grid2{grid-template-columns:1fr;} }
`;

const Pill = ({ children, c }) => (
  <span className="eh-pill" style={{ background:`${c}1f`, color:c, border:`1px solid ${c}3a` }}>{children}</span>
);
const mmss = (s) => `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;
const TOTAL_DAYS = 84;

// ═══════════════════════════════════════════════════════════════════════════════
export default function App() {
  const [page, setPage]     = useState('home');
  const [init, setInit]     = useState(false);
  const [start, setStart]   = useState(todayStr());
  const [checks, setChecks] = useState({});        // { 'YYYY-MM-DD': [bool×5] }
  const [phrases, setPhrases] = useState([]);
  const [log, setLog]       = useState({});        // { [week]: { r: {criterionId: 1..5}, note } }
  const [openWeek, setOpenWeek] = useState(null);
  const [viewDate, setViewDate] = useState(null);  // ngày đang xem ở trang Hôm nay (null = hôm nay)
  const [quiz, setQuiz]     = useState({});        // kiểm tra cuối ngày: { date: { dict, reflex, total } }
  const [phaseRes, setPhaseRes] = useState({});    // đánh giá giai đoạn: { n: [{ date, parts, total, level }] }
  const [testMode, setTestMode] = useState(null);  // { type:'day', date, day } | { type:'phase', n }

  // cụm từ
  const [pIn, setPIn]       = useState('');
  const [pNote, setPNote]   = useState('');
  const [dueList, setDue]   = useState([]);
  const [qi, setQi]         = useState(0);
  const [flipped, setFlip]  = useState(false);
  const [reviewing, setReviewing] = useState(false);

  // luyện nói
  const [sel, setSel]       = useState('week');    // 'week' | sample id | 'custom'
  const [custom, setCustom] = useState('');
  const [pText, setPText]   = useState('');
  const [pWords, setPWords] = useState([]);
  const [pVoices, setPVoices] = useState([]);
  const [pVoice, setPVoice] = useState(0);
  const [pRate, setPRate]   = useState(0.8);
  const [pPlaying, setPPlay] = useState(false);
  const [recState, setRecState] = useState('idle'); // idle|recording|done
  const [recURL, setRecURL] = useState(null);
  const [recSecs, setRecSecs] = useState(0);
  const [recSaved, setRecSaved] = useState('');
  const [selfCheck, setSelfCheck] = useState([false,false,false]);
  const [sttLang, setSttLang] = useState('en-US');
  const stt = useStt(sttLang);
  const [aiFb, setAiFb]     = useState(null);
  const [aiBusy, setAiBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [weekRecs, setWeekRecs] = useState({});    // { [week]: objectURL }

  const lastIdx = useRef(-1);
  const mrRef = useRef(null); const streamRef = useRef(null); const blobRef = useRef(null);
  const actxRef = useRef(null); const anRef = useRef(null); const afrRef = useRef(null);
  const canvasRef = useRef(null); const timerRef = useRef(null);
  const audioRef = useRef(null);

  // ── Load ──
  useEffect(() => {
    (async () => {
      let s = await load('eh2_start');
      if (!s) { s = todayStr(); await save('eh2_start', s); }
      setStart(s);
      setChecks(await load('eh2_checks', {}));
      setPhrases(await load('eh2_phrases', []));
      setLog(await load('eh2_log', {}));
      setQuiz(await load('eh2_quiz', {}));
      setPhaseRes(await load('eh2_phase', {}));
      setInit(true);
    })();
  }, []);

  useEffect(() => {
    if (!('speechSynthesis' in window)) return;
    const lv = () => {
      const v = speechSynthesis.getVoices().filter(x => x.lang.startsWith('en'));
      v.sort((a,b)=> b.name.includes('Google') - a.name.includes('Google'));
      setPVoices(v);
    };
    speechSynthesis.onvoiceschanged = lv; lv();
  }, []);

  const today = todayStr();
  const day = dayNumber(start, today);
  const week = weekOf(day);
  const phase = phaseOf(week);
  const W = WEEKS[week - 1];
  const vDate = viewDate || today;
  const vDay = dayNumber(start, vDate);
  const vWeek = weekOf(vDay);
  const vPhase = phaseOf(vWeek);
  const vW = WEEKS[vWeek - 1];
  const isFuture = vDate > today;
  const tasks = tasksFor(vDay);
  const dayChecks = checks[vDate] || [];
  const doneCount = dayChecks.filter(Boolean).length;
  const daysDone = Object.keys(checks).filter(d => dayDone(checks, d)).length;
  const due = phrases.filter(isDue);
  const card = dueList[qi];
  const topic = sel === 'week' ? W.prompt : sel === 'custom' ? 'Free practice' : SAMPLES.find(s => s.id === sel)?.title;

  // Tải bản ghi các tuần khi mở trang Theo dõi.
  useEffect(() => {
    if (page !== 'track') return;
    const urls = {};
    let alive = true;
    Promise.all(WEEKS.map(w => getRec('w' + w.week).then(b => { if (b) urls[w.week] = URL.createObjectURL(b); }).catch(() => {})))
      .then(() => { if (alive) setWeekRecs(urls); });
    return () => { alive = false; Object.values(urls).forEach(u => URL.revokeObjectURL(u)); };
  }, [page, recSaved]);

  // ── Lịch ngày ──
  async function toggleTask(i) {
    const arr = [0,1,2,3,4].map(k => !!dayChecks[k]);
    arr[i] = !arr[i];
    const nc = { ...checks, [vDate]: arr };
    setChecks(nc); await save('eh2_checks', nc);
  }
  async function resetDay() {
    if (!window.confirm(`Bỏ đánh dấu toàn bộ việc của ngày ${vDay}?`)) return;
    const nc = { ...checks }; delete nc[vDate];
    setChecks(nc); await save('eh2_checks', nc);
  }
  async function changeStart(v) {
    if (!v || v > today) return;
    setStart(v); await save('eh2_start', v);
  }

  // ── Cụm từ ──
  async function addPhrases(list) {
    const have = new Set(phrases.map(p => p.text.toLowerCase()));
    const fresh = [];
    for (const x of list) {
      const text = x.text.trim(), k = text.toLowerCase();
      if (text && !have.has(k)) { have.add(k); fresh.push({ ...x, text }); }
    }
    if (!fresh.length) return 0;
    const np = [...phrases, ...fresh.map(x => ({ id: Date.now().toString(36) + Math.random().toString(36).slice(2,6), text: x.text, note: x.note || '', added: today, reviewCount: 0, nextReview: nextRev(0), mastered: false }))];
    setPhrases(np); await save('eh2_phrases', np);
    return fresh.length;
  }
  async function addTyped() {
    if (await addPhrases([{ text: pIn, note: pNote.trim() }])) { setPIn(''); setPNote(''); }
    else if (pIn.trim()) alert('Cụm này đã có trong kho.');
  }
  async function delPhrase(id) {
    const np = phrases.filter(p => p.id !== id);
    setPhrases(np); await save('eh2_phrases', np);
  }
  function startReview() { setDue(due); setQi(0); setFlip(false); setReviewing(true); }
  async function answer(ok) {
    const np = phrases.map(x => x.id === card.id ? grade(x, ok) : x);
    setPhrases(np); await save('eh2_phrases', np); setFlip(false);
    if (qi + 1 >= dueList.length) setReviewing(false); else setQi(qi + 1);
  }

  // ── Theo dõi tuần ──
  async function setRating(w, cid, v) {
    const cur = log[w] || { r: {}, note: '' };
    const nl = { ...log, [w]: { ...cur, r: { ...cur.r, [cid]: v } } };
    setLog(nl); await save('eh2_log', nl);
  }
  async function setNote(w, note) {
    const nl = { ...log, [w]: { r: {}, ...log[w], note } };
    setLog(nl); await save('eh2_log', nl);
  }
  async function clearAll() {
    if (!window.confirm('Xoá toàn bộ tiến độ, cụm từ, đánh giá và bản ghi âm? Không thể hoàn tác.')) return;
    const s = todayStr();
    await save('eh2_start', s); await save('eh2_checks', {}); await save('eh2_phrases', []); await save('eh2_log', {});
    await save('eh2_quiz', {}); await save('eh2_phase', {});
    try { await clearRecs(); } catch { /* không có IndexedDB */ }
    setStart(s); setChecks({}); setPhrases([]); setLog({}); setQuiz({}); setPhaseRes({}); setWeekRecs({}); setPage('home');
  }

  // ── Kiểm tra ──
  async function saveQuiz(date, r) {
    const nq = { ...quiz, [date]: r };
    setQuiz(nq); await save('eh2_quiz', nq);
  }
  async function savePhase(n, r) {
    const np = { ...phaseRes, [n]: [...(phaseRes[n] || []), { date: today, ...r }] };
    setPhaseRes(np); await save('eh2_phase', np);
  }
  const bestPhase = (n) => { const t = (phaseRes[n] || []).map(r => r.total).filter(x => typeof x === 'number'); return t.length ? Math.max(...t) : null; };
  const weekQuizAvg = (w) => {
    const t = Array.from({ length: 7 }, (_, i) => quiz[dateOfDay(start, (w - 1) * 7 + i + 1)]?.total).filter(x => typeof x === 'number');
    return t.length ? Math.round(t.reduce((s, x) => s + x, 0) / t.length) : null;
  };

  // ── Luyện nói: chọn nội dung ──
  function choose(id, text = '') {
    stopTTS(); setSel(id); setAiFb(null); stt.reset();
    setPText(text);
    const re=/\S+/g; let m,i=0; const arr=[];
    while((m=re.exec(text))!==null) arr.push({i:i++,w:m[0],s:m.index,e:m.index+m[0].length});
    setPWords(arr);
  }
  function ttsHighlight(idx){
    if(lastIdx.current>=0){ const p=document.getElementById('ehw'+lastIdx.current); if(p){p.classList.remove('cur');p.classList.add('done');} }
    if(idx>=0){ const c=document.getElementById('ehw'+idx); if(c){c.classList.add('cur');c.classList.remove('done');} }
    lastIdx.current=idx;
  }
  function clearHi(){ pWords.forEach(w=>{const e=document.getElementById('ehw'+w.i); if(e)e.className='eh-word';}); lastIdx.current=-1; }
  function playTTS(){
    if(!pText || !('speechSynthesis' in window)) return; clearHi();
    speechSynthesis.cancel();
    const u=new SpeechSynthesisUtterance(pText);
    u.lang='en-US'; u.rate=pRate; if(pVoices[pVoice]) u.voice=pVoices[pVoice];
    u.onboundary=(e)=>{ if(e.name!=='word')return; const ci=e.charIndex; let f=-1; for(let i=0;i<pWords.length;i++){if(ci>=pWords[i].s&&ci<pWords[i].e+2){f=i;break;}} if(f!==-1)ttsHighlight(f); };
    u.onstart=()=>setPPlay(true);
    u.onend=()=>{ setPPlay(false); pWords.forEach(w=>{const e=document.getElementById('ehw'+w.i);if(e){e.classList.remove('cur');e.classList.add('done');}}); };
    u.onerror=()=>setPPlay(false);
    speechSynthesis.speak(u);
  }
  function stopTTS(){ if('speechSynthesis' in window) speechSynthesis.cancel(); setPPlay(false); clearHi(); }
  function speakWord(word){ const c=word.replace(/[.,!?;:"']/g,''); if(c) speak(c, pRate); }

  // ── Ghi âm ──
  async function toggleRec(){ if(recState==='recording') stopRec(); else await startRec(); }
  async function startRec(){
    let stream;
    try { stream = await navigator.mediaDevices.getUserMedia({audio:true}); }
    catch { alert('Không truy cập được microphone. Hãy cho phép quyền micro trong trình duyệt (nên dùng Google Chrome).'); return; }
    streamRef.current=stream; stopTTS(); setRecSaved(''); setSelfCheck([false,false,false]);
    try{ const ac=new (window.AudioContext||window.webkitAudioContext)(); const an=ac.createAnalyser(); an.fftSize=512; ac.createMediaStreamSource(stream).connect(an); actxRef.current=ac; anRef.current=an; }catch{ /* không có sóng âm vẫn ghi được */ }
    const mime=['audio/webm;codecs=opus','audio/webm','audio/mp4'].find(t=>{try{return MediaRecorder.isTypeSupported(t);}catch{return false;}})||'';
    let mr; try{ mr=mime?new MediaRecorder(stream,{mimeType:mime}):new MediaRecorder(stream); }catch{ mr=new MediaRecorder(stream); }
    mrRef.current=mr; const chunks=[];
    mr.ondataavailable=e=>{ if(e.data&&e.data.size>0)chunks.push(e.data); };
    mr.onstop=()=>{
      const blob=new Blob(chunks,{type:mr.mimeType||'audio/webm'}); blobRef.current=blob;
      const url=URL.createObjectURL(blob);
      setRecURL(prev=>{ if(prev) URL.revokeObjectURL(prev); return url; }); setRecState('done');
    };
    mr.start(100); setRecState('recording'); setRecSecs(0);
    timerRef.current=setInterval(()=>setRecSecs(s=>{ if(s>=300){stopRec();return s;} return s+1; }),1000);
    drawWave();
  }
  function stopRec(){
    if(mrRef.current&&mrRef.current.state!=='inactive')mrRef.current.stop();
    if(streamRef.current){streamRef.current.getTracks().forEach(t=>t.stop());streamRef.current=null;}
    try{if(actxRef.current)actxRef.current.close();}catch{ /* đã đóng */ } actxRef.current=null; anRef.current=null;
    clearInterval(timerRef.current); cancelAnimationFrame(afrRef.current);
    setTimeout(()=>drawIdle(),60);
  }
  async function saveWeekRec(){
    if(!blobRef.current) return;
    try { await putRec('w'+week, blobRef.current); setRecSaved(`Đã lưu làm bản ghi tuần ${week}.`); }
    catch { setRecSaved('Không lưu được (trình duyệt chặn IndexedDB). Hãy dùng nút Tải về.'); }
  }
  function drawWave(){
    const cv=canvasRef.current; if(!cv||!anRef.current)return;
    const ctx=cv.getContext('2d'); cv.width=cv.offsetWidth||600; const Wd=cv.width,H=cv.height; const an=anRef.current; const buf=an.frequencyBinCount; const data=new Uint8Array(buf);
    const draw=()=>{ afrRef.current=requestAnimationFrame(draw); an.getByteTimeDomainData(data); ctx.clearRect(0,0,Wd,H); ctx.lineWidth=2.4; ctx.strokeStyle='#4cc9e0'; ctx.beginPath(); const sl=Wd/buf; let x=0; for(let i=0;i<buf;i++){const v=data[i]/128,y=v*H/2; if(i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y); x+=sl;} ctx.lineTo(Wd,H/2); ctx.stroke(); };
    draw();
  }
  function drawIdle(){
    const cv=canvasRef.current; if(!cv)return; const ctx=cv.getContext('2d'); cv.width=cv.offsetWidth||600; const Wd=cv.width,H=cv.height;
    ctx.clearRect(0,0,Wd,H); ctx.lineWidth=1.4; ctx.strokeStyle='#28303f'; ctx.beginPath();
    for(let x=0;x<=Wd;x++){const y=H/2+Math.sin(x*.045)*2.5; if(x===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);} ctx.stroke();
  }
  useEffect(()=>{ if(page==='speak') setTimeout(drawIdle,80); }, [page]);

  // ── Nhận dạng giọng nói ──
  const sttScore = pText && stt.final ? scoreReading(pText, stt.final) : null;
  function toggleStt(){ if(stt.listening) stt.stop(); else { setAiFb(null); stt.start(); } }
  async function getFeedback(){
    setAiBusy(true); setAiFb(null);
    try { setAiFb(await callAIFeedback(topic, stt.final)); }
    catch { setAiFb({ error: true }); }
    setAiBusy(false);
  }
  function copyPrompt(){
    navigator.clipboard?.writeText(ROLEPLAY_PROMPT(topic)).then(()=>{ setCopied(true); setTimeout(()=>setCopied(false),1800); }, ()=>{});
  }

  if (!init) return <div className="eh-root"><div style={{display:'flex',minHeight:'100vh',alignItems:'center',justifyContent:'center',color:'var(--dim)'}}>Đang tải…</div><style>{STYLES}</style></div>;

  const NAV = [
    { id:'home', ic:'◆', label:'Hôm nay', short:'Hôm nay' },
    { id:'toc', ic:'☰', label:'Mục lục', short:'Mục lục' },
    { id:'plan', ic:'❏', label:'Lộ trình 12 tuần', short:'Lộ trình' },
    { id:'speak', ic:'🎙', label:'Luyện nói', short:'Luyện nói' },
    { id:'phrases', ic:'↻', label:'Cụm từ', short:'Cụm từ', badge: due.length },
    { id:'track', ic:'▦', label:'Theo dõi tuần', short:'Theo dõi' },
  ];
  const go = (id) => { setPage(id); setReviewing(false); if (id==='home') setViewDate(null); window.scrollTo?.(0,0); };
  const startQuiz = () => { setTestMode({ type:'day', date:vDate, day:vDay }); go('test'); };
  const startPhase = (n) => { setTestMode({ type:'phase', n }); go('test'); };
  // Giai đoạn đã tới tuần cuối (hoặc đã qua) mà chưa có lần đánh giá nào đạt.
  const duePhase = PHASES.find(p => week >= p.weeks[1] && !((phaseRes[p.n] || []).some(r => r.total >= PASS)));
  const openDay = (n) => { const d = dateOfDay(start, Math.max(1, n)); go('home'); setViewDate(d === today ? null : d); };

  return (
    <div className="eh-root">
      <style>{STYLES}</style>
      <div className="eh-shell">

        {/* ─── SIDEBAR ─── */}
        <aside className="eh-side">
          <div className="eh-brand">
            <div className="eh-logo">🎧</div>
            <div>
              <div className="eh-brand-name">English Hub</div>
              <div className="eh-brand-sub">Nghe · Nói · IT</div>
            </div>
          </div>
          {NAV.map(it => (
            <button key={it.id} className={`eh-nav ${page===it.id?'on':''}`} onClick={()=>go(it.id)}>
              <span className="ic">{it.ic}</span>{it.label}
              {it.badge>0 && <span className="dot">{it.badge}</span>}
            </button>
          ))}
          <div className="eh-side-foot">
            <div className="eh-progress-mini"><span>TUẦN {week}/12</span><span>{daysDone}/{TOTAL_DAYS} ngày</span></div>
            <div className="eh-bar"><i style={{width:`${Math.min(100, daysDone/TOTAL_DAYS*100)}%`}}/></div>
          </div>
        </aside>

        <main className="eh-main">

          {/* ═══ HÔM NAY ═══ */}
          {page==='home' && (<>
            <div className="eh-pagehead">
              <div className="eh-eyebrow">Giai đoạn {vPhase.n} · {vPhase.name} · {vPhase.level}</div>
              <h1 className="eh-title">{vDay===1 ? 'Day 1 – Getting Started' : `Tuần ${vWeek} · Ngày ${vDay}`}</h1>
              <p className="eh-sub">Chủ đề tuần: <b style={{color:'var(--text)'}}>{vW.topic}</b> — đầu ra: {vW.output.toLowerCase()}. Giữ một lịch cố định 1 giờ mỗi ngày.</p>
            </div>

            <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap',marginBottom:16}}>
              <button className="eh-btn sm" disabled={vDay<=1} onClick={()=>openDay(vDay-1)}>‹ Ngày {Math.max(1,vDay-1)}</button>
              <button className="eh-btn sm" onClick={()=>go('toc')}>☰ Mục lục</button>
              <button className="eh-btn sm" disabled={vDay>=TOTAL_DAYS} onClick={()=>openDay(vDay+1)}>Ngày {vDay+1} ›</button>
              {viewDate && <button className="eh-btn sm amber" onClick={()=>setViewDate(null)}>Về hôm nay (ngày {day})</button>}
              {viewDate && <span className="eh-p">{isFuture ? 'Xem trước — chưa đánh dấu được.' : `Ngày ${vDate.split('-').reverse().join('/')}`}</span>}
            </div>

            <div className="eh-stats">
              {[[`${doneCount}/5`,'⏱',viewDate?`Việc ngày ${vDay}`:'Việc hôm nay'],[daysDone,'🔥','Ngày hoàn thành'],[phrases.length,'💬','Cụm từ đã lưu'],[due.length,'↻','Cụm cần ôn']].map(([n,e,l])=>(
                <div className="eh-stat" key={l}><span className="ic">{e}</span><div className="n">{n}</div><div className="l">{l}</div></div>
              ))}
            </div>

            {!viewDate && duePhase && (
              <div className="eh-card accent">
                <span className="eh-clabel" style={{color:'var(--gold)'}}>📋 Đánh giá giai đoạn {duePhase.n} · {duePhase.name}</span>
                <p className="eh-p" style={{marginBottom:12}}>
                  {bestPhase(duePhase.n)==null
                    ? `Đã tới tuần ${duePhase.weeks[1]} — làm bài đánh giá (mục tiêu ${duePhase.level}, khoảng 15 phút) trước khi sang giai đoạn tiếp theo.`
                    : `Lần cao nhất ${bestPhase(duePhase.n)}%, chưa đạt ${PASS}%. Ôn lại các phần yếu rồi làm lại.`}
                </p>
                <button className="eh-btn gold" onClick={()=>startPhase(duePhase.n)}>Làm bài đánh giá →</button>
              </div>
            )}

            {!viewDate && isSunday(today) && (
              <div className="eh-card accent">
                <span className="eh-clabel" style={{color:'var(--gold)'}}>Chủ nhật · ghi âm so sánh</span>
                <p className="eh-p" style={{marginBottom:12}}>Ghi âm lại cùng một chủ đề (ví dụ <i>Introduce yourself</i>) rồi lưu làm bản ghi tuần {week} để so với tuần trước. Sau đó tự chấm 5 tiêu chí.</p>
                <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
                  <button className="eh-btn gold" onClick={()=>{choose('intro', SAMPLES[0].text); go('speak');}}>Ghi âm ngay →</button>
                  <button className="eh-btn" onClick={()=>{setOpenWeek(week); go('track');}}>Chấm tuần {week}</button>
                </div>
              </div>
            )}

            <div className="eh-card">
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
                <span className="eh-clabel" style={{margin:0}}>Tiến độ học tập</span>
                <span style={{fontFamily:'var(--mono)',fontSize:13,fontWeight:700,color:doneCount===5?'var(--green)':'var(--gold)'}}>{doneCount*20}%</span>
              </div>
              <div className="eh-bar" style={{marginBottom:18}}><i style={{width:`${doneCount*20}%`}}/></div>
              {tasks.map((t,i)=>(
                <div key={t.id} className={`eh-task ${dayChecks[i]?'done':''}`}>
                  <input type="checkbox" className="eh-cb" checked={!!dayChecks[i]} disabled={isFuture} onChange={()=>toggleTask(i)} aria-label={t.title} />
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap',marginBottom:3}}>
                      <Pill c="var(--cyan)">{t.min} phút</Pill><Pill c="var(--dim)">{t.kind}</Pill>
                    </div>
                    <div className="eh-task-title">{t.title}</div>
                    <p className="eh-p" style={{margin:'3px 0 8px'}}>{t.desc}</p>
                    {t.url && <a className="eh-btn sm" href={t.url} target="_blank" rel="noopener noreferrer">Mở tài liệu học ↗</a>}
                    {t.page && <button className="eh-btn sm" onClick={()=>go(t.page)}>Mở {t.page==='speak'?'Luyện nói':'Cụm từ'} →</button>}
                  </div>
                </div>
              ))}
              <button className="eh-btn full sm" style={{marginTop:16,color:'var(--dim)'}} onClick={resetDay} disabled={!doneCount}>Đặt lại tiến độ ngày học</button>
            </div>

            <div className="eh-card green">
              <span className="eh-clabel" style={{color:'var(--green)'}}>📝 Kiểm tra cuối ngày · khoảng 5 phút</span>
              {quiz[vDate] ? (<>
                <div className="eh-ctitle" style={{marginBottom:4}}>Điểm: <span style={{fontFamily:'var(--mono)',color:quiz[vDate].total>=PASS?'var(--green)':'var(--gold)'}}>{quiz[vDate].total ?? '—'}%</span> {quiz[vDate].total>=PASS ? '· đạt' : ''}</div>
                <p className="eh-p" style={{marginBottom:12}}>{PART_NAMES.dict} {quiz[vDate].dict ?? '—'}% · {PART_NAMES.reflex} {quiz[vDate].reflex==null ? 'bỏ qua' : `${quiz[vDate].reflex}%`}</p>
                <button className="eh-btn sm" onClick={startQuiz}>Làm lại</button>
              </>) : (<>
                <p className="eh-p" style={{marginBottom:12}}>3 câu nghe – chép và 2 câu hỏi phản xạ theo chủ đề tuần {vWeek}. Làm sau khi xong 5 khối học.</p>
                <button className="eh-btn green" disabled={isFuture} onClick={startQuiz}>Làm bài kiểm tra →</button>
              </>)}
            </div>

            <div className="eh-card cyan">
              <span className="eh-clabel" style={{color:'var(--cyan)'}}>🎧 Nghe một đoạn 2–3 phút theo 4 bước</span>
              <ol className="eh-list">{LISTEN_STEPS.map(s=><li key={s}>{s}</li>)}</ol>
              <p className="eh-p" style={{marginTop:10,color:'var(--faint)'}}>Không nghe thụ động hàng giờ. Điều quan trọng là chuyển những gì nghe được thành khả năng nói.</p>
            </div>

            {due.length>0 && (
              <div className="eh-card violet">
                <span className="eh-clabel" style={{color:'var(--violet)'}}>Ôn cụm từ</span>
                <div className="eh-ctitle" style={{marginBottom:12}}>{due.length} cụm từ đến hạn ôn</div>
                <button className="eh-btn violet" onClick={()=>{go('phrases'); startReview();}}>Ôn ngay →</button>
              </div>
            )}
          </>)}

          {/* ═══ LÀM BÀI KIỂM TRA ═══ */}
          {page==='test' && testMode?.type==='day' && (
            <DailyQuiz key={testMode.date} day={testMode.day} level={phaseOf(weekOf(testMode.day)).level}
              onSave={r=>saveQuiz(testMode.date, r)}
              onClose={()=>{ go('home'); if (testMode.date !== today) setViewDate(testMode.date); }} />
          )}
          {page==='test' && testMode?.type==='phase' && (
            <PhaseTest key={testMode.n} test={PHASE_TESTS[testMode.n-1]} onSave={r=>savePhase(testMode.n, r)} onClose={()=>go('track')} />
          )}

          {/* ═══ MỤC LỤC ═══ */}
          {page==='toc' && (<>
            <div className="eh-pagehead">
              <div className="eh-eyebrow">Mục lục</div>
              <h1 className="eh-title">12 tuần · {TOTAL_DAYS} ngày</h1>
              <p className="eh-sub">Nhấn vào một ngày để mở lịch học của ngày đó và đánh dấu. <b style={{color:'var(--green)'}}>✓</b> = xong đủ 5 khối, <b style={{color:'var(--gold)'}}>số</b> = số khối đã làm, <b style={{color:'var(--violet)'}}>%</b> = điểm kiểm tra cuối ngày, viền vàng = hôm nay.</p>
            </div>

            <div className="eh-card">
              <div className="eh-progress-mini" style={{fontSize:11}}><span>ĐANG Ở NGÀY {day} · TUẦN {week}</span><span>{daysDone}/{TOTAL_DAYS} NGÀY XONG</span></div>
              <div className="eh-bar"><i style={{width:`${Math.min(100, daysDone/TOTAL_DAYS*100)}%`}}/></div>
            </div>

            {PHASES.map(p=>(
              <div key={p.n} style={{marginTop:22}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:8,marginBottom:12}}>
                  <span className="eh-clabel" style={{margin:0}}>Giai đoạn {p.n} · {p.name} · {p.level}</span>
                  <button className={`eh-btn sm ${bestPhase(p.n)>=PASS?'green':''}`} onClick={()=>startPhase(p.n)}>📋 Đánh giá{bestPhase(p.n)!=null ? ` · ${bestPhase(p.n)}%` : ''}</button>
                </div>
                {WEEKS.slice(p.weeks[0]-1, p.weeks[1]).map(w=>{
                  const days = Array.from({length:7},(_,i)=>(w.week-1)*7+i+1);
                  const nDone = days.filter(n=>dayDone(checks, dateOfDay(start,n))).length;
                  const rated = CRITERIA.every(c=>log[w.week]?.r?.[c.id]);
                  return (
                    <div key={w.week} className={`eh-card ${w.week===week?'accent':''}`}>
                      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:10}}>
                        <div>
                          <div className="eh-ctitle">Tuần {w.week} · {w.topic}</div>
                          <div className="eh-p" style={{marginTop:2}}>Đầu ra: {w.output}</div>
                        </div>
                        <div style={{display:'flex',gap:6,flexWrap:'wrap',justifyContent:'flex-end'}}>
                          {rated && <Pill c="var(--violet)">đã chấm</Pill>}
                          <Pill c={nDone===7?'var(--green)':nDone?'var(--gold)':'var(--dim)'}>{nDone}/7</Pill>
                        </div>
                      </div>
                      <div className="eh-days">
                        {days.map(n=>{
                          const d = dateOfDay(start,n);
                          const c = (checks[d]||[]).filter(Boolean).length;
                          return (
                            <button key={n} className={`eh-day ${c>=5?'done':c?'part':''} ${d===today?'today':''} ${d>today?'future':''}`} onClick={()=>openDay(n)}
                              aria-label={`Ngày ${n}${c>=5?', đã xong':c?`, ${c}/5 khối`:''}${d===today?', hôm nay':''}`}>
                              <span>D{n}</span><b>{c>=5?'✓':c||''}</b><i title="Điểm kiểm tra cuối ngày">{quiz[d]?.total != null ? `${quiz[d].total}%` : ''}</i>
                            </button>
                          );
                        })}
                      </div>
                      {w.week<=week && <button className="eh-btn sm" style={{marginTop:12}} onClick={()=>{setOpenWeek(w.week); go('track');}}>Chấm tuần {w.week} →</button>}
                    </div>
                  );
                })}
              </div>
            ))}
          </>)}

          {/* ═══ LỘ TRÌNH ═══ */}
          {page==='plan' && (<>
            <div className="eh-pagehead">
              <div className="eh-eyebrow">Kế hoạch</div>
              <h1 className="eh-title">Lộ trình 12 tuần luyện nghe–nói</h1>
              <p className="eh-sub">Mục tiêu không phải học thật nhiều ngữ pháp hay từ vựng, mà là nghe hiểu người khác nói, phản xạ trả lời và tự tin giao tiếp trong công việc IT.</p>
            </div>

            <div className="eh-card" style={{display:'flex',alignItems:'center',gap:12,flexWrap:'wrap'}}>
              <span className="eh-clabel" style={{margin:0}}>Ngày bắt đầu</span>
              <input type="date" className="eh-sel" style={{width:'auto'}} value={start} max={today} onChange={e=>changeStart(e.target.value)} aria-label="Ngày bắt đầu" />
              <span className="eh-p">Hôm nay là ngày {day}, tuần {week}.</span>
            </div>

            <span className="eh-clabel">1 · Mục tiêu sau 12 tuần</span>
            <div className="eh-grid3">
              {PHASES.map(p=>(
                <div key={p.n} className={`eh-card ${p.n===phase.n?'accent':''}`}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:6}}>
                    <span style={{fontFamily:'var(--mono)',fontSize:11,color:'var(--dim)'}}>TUẦN {p.weeks[0]}–{p.weeks[1]}</span>
                    <Pill c={p.n===phase.n?'var(--gold)':'var(--dim)'}>{p.level}</Pill>
                  </div>
                  <div className="eh-ctitle" style={{marginBottom:8}}>Giai đoạn {p.n}: {p.name}</div>
                  <ul className="eh-list">{p.goals.map(g=><li key={g}>{g}</li>)}</ul>
                </div>
              ))}
            </div>
            <p className="eh-p" style={{margin:'-4px 0 22px',color:'var(--faint)'}}>Đây là các mốc mục tiêu luyện tập, không phải cam kết đạt chứng chỉ CEFR sau đúng 12 tuần.</p>

            <span className="eh-clabel">2 · Lịch học cố định 1 giờ mỗi ngày</span>
            <div className="eh-card">
              <table className="eh-table">
                <thead><tr><th>Thời lượng</th><th>Nội dung</th><th>Cách học</th></tr></thead>
                <tbody>
                  {[['10 phút','Phát âm','Nghe và luyện phát âm theo audio'],['20 phút','Listening','Nghe đoạn hội thoại hoặc video'],['15 phút','Shadowing','Nghe và nói nhại theo nhân vật'],['10 phút','Speaking','Tự nói về một chủ đề'],['5 phút','Vocabulary','Ôn lại 5–10 cụm từ']].map(r=>(
                    <tr key={r[1]}><td style={{fontFamily:'var(--mono)',whiteSpace:'nowrap'}}>{r[0]}</td><td style={{fontWeight:600}}>{r[1]}</td><td style={{color:'var(--dim)'}}>{r[2]}</td></tr>
                  ))}
                </tbody>
              </table>
              <p className="eh-p" style={{marginTop:12}}>Duy trì một lịch cố định thay vì mỗi ngày học một tài liệu khác nhau.</p>
            </div>

            <span className="eh-clabel">Tỷ lệ thời gian nên chia</span>
            <div className="eh-card">
              {[[60,'Nghe và luyện nói giao tiếp thông thường','var(--gold)'],[25,'Phát âm, ngữ điệu và phản xạ','var(--cyan)'],[15,'Tiếng Anh chuyên ngành IT','var(--violet)']].map(([n,l,c])=>(
                <div key={l} style={{marginBottom:12}}>
                  <div style={{display:'flex',justifyContent:'space-between',fontSize:13,marginBottom:5}}><span>{l}</span><span style={{fontFamily:'var(--mono)',color:c,fontWeight:700}}>{n}%</span></div>
                  <div className="eh-bar"><i style={{width:`${n}%`,background:c}}/></div>
                </div>
              ))}
            </div>

            <span className="eh-clabel">3 · Tài liệu nên dùng (miễn phí)</span>
            <div className="eh-grid2">
              {RESOURCES.map(r=>(
                <div key={r.name} className="eh-card">
                  <div style={{display:'flex',justifyContent:'space-between',gap:8,marginBottom:6}}>
                    <span style={{fontFamily:'var(--mono)',fontSize:10,color:'var(--dim)',textTransform:'uppercase'}}>{r.group}</span>
                    <Pill c="var(--green)">{r.when}</Pill>
                  </div>
                  <div className="eh-ctitle" style={{marginBottom:8}}>{r.name}</div>
                  <ul className="eh-list" style={{marginBottom:12}}>{r.points.map(p=><li key={p}>{p}</li>)}</ul>
                  <a className="eh-btn sm" href={r.url} target="_blank" rel="noopener noreferrer">Mở {r.name} ↗</a>
                </div>
              ))}
            </div>
            <p className="eh-p" style={{margin:'-4px 0 22px',color:'var(--faint)'}}>Không cần học cả 4 nguồn cùng lúc. Bắt đầu với VOA và British Council, thêm BBC khi nghe đã tốt hơn.</p>

            <span className="eh-clabel">4 · Nội dung 12 tuần · nhấn để xem đề luyện nói</span>
            <div className="eh-card">
              <table className="eh-table">
                <thead><tr><th>Tuần</th><th>Chủ đề</th><th>Bài tập đầu ra</th></tr></thead>
                <tbody>
                  {WEEKS.map(w=>(<Fragment key={w.week}>
                    <tr className={w.week===week?'cur':''} style={{cursor:'pointer'}} onClick={()=>setOpenWeek(openWeek===w.week?null:w.week)}>
                      <td style={{fontFamily:'var(--mono)'}}>{w.week===week?'▶ ':''}{w.week}</td><td style={{fontWeight:600}}>{w.topic}</td><td>{w.output}</td>
                    </tr>
                    {openWeek===w.week && <tr><td/><td colSpan={2} style={{color:'var(--dim)',fontStyle:'italic',borderTop:'none',paddingTop:0}}>🎙 {w.prompt}</td></tr>}
                  </Fragment>))}
                </tbody>
              </table>
              <p className="eh-p" style={{marginTop:12}}>Ở giai đoạn cuối, ưu tiên các tình huống sát với công việc hiện tại (xem mẫu câu ở trang Luyện nói) thay vì chỉ học giao tiếp đời sống.</p>
            </div>
          </>)}

          {/* ═══ LUYỆN NÓI ═══ */}
          {page==='speak' && (<>
            <div className="eh-pagehead">
              <div className="eh-eyebrow">Luyện nói mỗi ngày</div>
              <h1 className="eh-title">Nghe · Nhại · Ghi âm</h1>
              <p className="eh-sub">Đừng đợi giỏi mới bắt đầu nói. Mỗi ngày chọn một chủ đề và ghi âm 1–3 phút, hoặc shadowing theo một đoạn mẫu.</p>
            </div>

            <div className="eh-card">
              <span className="eh-clabel">Chọn nội dung</span>
              <div style={{display:'flex',flexDirection:'column',gap:8}}>
                <button className="eh-btn" style={{justifyContent:'space-between',textAlign:'left',borderColor:sel==='week'?'var(--gold)':'var(--line)'}} onClick={()=>choose('week')}>
                  <span><b>Đề tuần {week}: {W.topic}</b><span style={{display:'block',fontWeight:400,color:'var(--dim)',fontSize:12.5,marginTop:3}}>Nói tự do · {W.output}</span></span><span style={{color:'var(--dim)'}}>›</span>
                </button>
                {SAMPLES.map(s=>(
                  <button key={s.id} className="eh-btn" style={{justifyContent:'space-between',textAlign:'left',borderColor:sel===s.id?'var(--gold)':'var(--line)'}} onClick={()=>choose(s.id, s.text)}>
                    <span style={{fontWeight:600}}>{s.title}</span><span style={{color:'var(--dim)'}}>›</span>
                  </button>
                ))}
                <button className="eh-btn" style={{justifyContent:'space-between',textAlign:'left',borderColor:sel==='custom'?'var(--gold)':'var(--line)'}} onClick={()=>choose('custom', custom)}>
                  <span style={{fontWeight:600}}>Dán đoạn của bạn (transcript VOA/BBC…)</span><span style={{color:'var(--dim)'}}>›</span>
                </button>
              </div>
              {sel==='custom' && (<>
                <textarea className="eh-ta" style={{marginTop:12}} value={custom} onChange={e=>setCustom(e.target.value)} placeholder="Dán 5–10 câu bạn muốn shadowing…" />
                <button className="eh-btn amber full" style={{marginTop:10}} disabled={!custom.trim()} onClick={()=>choose('custom', custom.trim())}>Dùng đoạn này</button>
              </>)}
            </div>

            {sel==='week' && (
              <div className="eh-card accent">
                <span className="eh-clabel" style={{color:'var(--gold)'}}>Đề nói · 1–3 phút</span>
                <p style={{fontSize:16,lineHeight:1.6}}>{W.prompt}</p>
                <p className="eh-p" style={{marginTop:8}}>Cần bài mẫu? Chọn <i>Bài mẫu: Introduce yourself</i> ở trên, nghe vài lần rồi nói phiên bản của bạn.</p>
              </div>
            )}

            {pWords.length>0 && (<>
              <div className="eh-card">
                <span className="eh-clabel">Nội dung · nhấn từ để nghe riêng</span>
                <div style={{fontSize:16,lineHeight:2.1}}>
                  {(() => { let last=0; const out=[]; pWords.forEach(w=>{ if(pText.slice(last,w.s).includes('\n'))out.push(<br key={'b'+w.i}/>); out.push(<span key={w.i} id={'ehw'+w.i} className="eh-word" onClick={()=>speakWord(w.w)}>{w.w}</span>); out.push(' '); last=w.e; }); return out; })()}
                </div>
                {sel!=='custom' && sel!=='intro' && <button className="eh-btn sm violet" style={{marginTop:12}} onClick={async()=>{ const n=await addPhrases(pText.split('\n').map(text=>({text}))); alert(n?`Đã thêm ${n} cụm vào kho.`:'Các câu này đã có trong kho.'); }}>+ Lưu các câu này vào kho cụm từ</button>}
              </div>

              <div className="eh-card">
                <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:12}}>
                  <span style={{fontFamily:'var(--mono)',fontSize:11,color:'var(--dim)',minWidth:54}}>GIỌNG</span>
                  <select className="eh-sel" value={pVoice} onChange={e=>setPVoice(+e.target.value)} aria-label="Giọng đọc">
                    {pVoices.length?pVoices.map((v,i)=><option key={i} value={i}>{v.name}{v.lang==='en-US'?' 🇺🇸':v.lang==='en-GB'?' 🇬🇧':''}</option>):<option>Đang tải…</option>}
                  </select>
                </div>
                <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:14}}>
                  <span style={{fontFamily:'var(--mono)',fontSize:11,color:'var(--dim)',minWidth:54}}>TỐC ĐỘ</span>
                  <input className="eh-range" type="range" min="0.5" max="1.5" step="0.05" value={pRate} onChange={e=>setPRate(+e.target.value)} aria-label="Tốc độ đọc" />
                  <span style={{fontFamily:'var(--mono)',fontSize:13,color:'var(--gold)',fontWeight:700,minWidth:46,textAlign:'right'}}>{pRate.toFixed(2)}×</span>
                </div>
                <div style={{display:'flex',gap:8}}>
                  {!pPlaying ? <button className="eh-btn gold" style={{flex:1}} onClick={playTTS}>▶ Nghe mẫu</button>
                            : <button className="eh-btn amber" style={{flex:1}} onClick={stopTTS}>⏹ Dừng</button>}
                </div>
              </div>
            </>)}

            <div className="eh-card cyan">
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
                <span className="eh-clabel" style={{margin:0,color:'var(--cyan)'}}>🎙 Ghi âm · mục tiêu 1–3 phút</span>
                {recState==='recording' && <span className="eh-pill pulse" style={{background:'var(--red-soft)',color:recSecs>=60?'var(--green)':'var(--red)'}}>● {mmss(recSecs)}</span>}
                {recState==='done' && <Pill c="var(--green)">✓ {mmss(recSecs)}</Pill>}
              </div>
              <canvas ref={canvasRef} height="56" className="eh-canvas" />
              <button className={`eh-btn full ${recState==='recording'?'red':'cyan'}`} onClick={toggleRec}>{recState==='recording'?'⏹ Dừng ghi âm':'🎙 Bắt đầu ghi âm'}</button>
              {recState==='done' && recURL && (
                <div style={{marginTop:14,paddingTop:14,borderTop:'1px solid var(--line-soft)'}}>
                  <audio ref={audioRef} src={recURL} controls style={{width:'100%',marginBottom:10}} />
                  <div style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:14}}>
                    {pText && <button className="eh-btn sm" style={{flex:1}} onClick={()=>{audioRef.current?.pause();playTTS();}}>▶ Giọng mẫu</button>}
                    {pText && <button className="eh-btn sm" style={{flex:1}} onClick={()=>{stopTTS();if(audioRef.current){audioRef.current.currentTime=0;audioRef.current.play();}}}>▶ Của tôi</button>}
                    <button className="eh-btn sm amber" style={{flex:1}} onClick={saveWeekRec}>💾 Lưu làm bản ghi tuần {week}</button>
                    <a className="eh-btn sm" style={{flex:1}} href={recURL} download={`english-${today}.${(blobRef.current?.type||'').includes('mp4')?'m4a':'webm'}`}>⬇ Tải về</a>
                  </div>
                  {recSaved && <p style={{fontSize:12.5,color:'var(--green)',marginBottom:12}}>{recSaved}</p>}
                  <span className="eh-clabel">Nghe lại và tự kiểm tra</span>
                  {SELF_CHECK.map((q,i)=>(
                    <label key={q} style={{display:'flex',gap:10,alignItems:'center',fontSize:13.5,padding:'5px 0',cursor:'pointer'}}>
                      <input type="checkbox" className="eh-cb" style={{width:18,height:18,margin:0}} checked={selfCheck[i]} onChange={()=>setSelfCheck(selfCheck.map((v,k)=>k===i?!v:v))} />{q}
                    </label>
                  ))}
                </div>
              )}
            </div>

            <div className="eh-card violet">
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:6}}>
                <span className="eh-clabel" style={{margin:0,color:'var(--violet)'}}>👂 Nhận dạng giọng nói</span>
                {stt.listening && <span className="eh-pill pulse" style={{background:'var(--violet-soft)',color:'var(--violet)'}}>● đang nghe</span>}
              </div>
              <p style={{fontSize:12,color:'var(--dim)',marginBottom:12}}>{pText ? 'Đọc to đoạn trên — máy so khớp với bài gốc và chấm điểm.' : 'Nói về chủ đề — máy chép lại lời bạn, rồi AI nhận xét và sửa lỗi.'}</p>
              <div style={{background:'var(--surface2)',border:'1px solid var(--line)',borderRadius:11,padding:14,minHeight:54,fontSize:15,lineHeight:1.9,marginBottom:12}}>
                {sttScore ? sttScore.spoken.map((x,i)=><span key={i} className={x.ok?'eh-w-ok':'eh-w-err'}>{x.w}</span>)
                  : stt.text || <span style={{color:'var(--dim)',fontSize:14}}>Kết quả hiện ở đây…</span>}
              </div>
              {sttScore && (
                <div style={{background:'var(--surface2)',borderRadius:11,padding:'12px 14px',marginBottom:12}}>
                  <div className="eh-bar" style={{marginBottom:8}}><i style={{width:`${sttScore.pct}%`,background:sttScore.pct>=80?'var(--green)':sttScore.pct>=50?'var(--gold)':'var(--red)'}}/></div>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',fontSize:13}}>
                    <span style={{color:'var(--dim)'}}>Đọc đúng {sttScore.correct}/{sttScore.total} từ của bài gốc</span>
                    <span style={{fontFamily:'var(--mono)',fontSize:18,fontWeight:700,color:sttScore.pct>=80?'var(--green)':sttScore.pct>=50?'var(--gold)':'var(--red)'}}>{sttScore.pct}%</span>
                  </div>
                  {sttScore.missed.length>0 && <p style={{fontSize:12.5,color:'var(--dim)',marginTop:8,lineHeight:1.6}}>Bị thiếu hoặc đọc chưa rõ: <span style={{color:'var(--red)'}}>{sttScore.missed.join(', ')}</span></p>}
                </div>
              )}
              {!pText && stt.final && !stt.listening && (
                <button className="eh-btn violet full" style={{marginBottom:12}} disabled={aiBusy} onClick={getFeedback}>{aiBusy?'AI đang nghe lại…':'🤖 AI nhận xét & sửa lỗi'}</button>
              )}
              {aiFb && (aiFb.error ? <p style={{color:'var(--red)',fontSize:13,marginBottom:12}}>Không lấy được nhận xét lúc này. Thử lại sau.</p> : (
                <div style={{background:'var(--surface2)',borderRadius:11,padding:'12px 14px',marginBottom:12,fontSize:13.5,lineHeight:1.6}}>
                  <p style={{marginBottom:8}}>{aiFb.summary}</p>
                  {Array.isArray(aiFb.fixes) && aiFb.fixes.map((f,i)=>(
                    <div key={i} style={{padding:'6px 0',borderTop:'1px solid var(--line-soft)'}}>
                      <span style={{color:'var(--red)'}}>{f.said}</span> → <span style={{color:'var(--green)'}}>{f.better}</span>
                      {f.note && <div style={{color:'var(--dim)',fontSize:12.5}}>{f.note}</div>}
                    </div>
                  ))}
                  {aiFb.better && (<>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginTop:10}}><span className="eh-clabel" style={{margin:0}}>Phiên bản tốt hơn</span><button className="eh-btn sm" onClick={()=>speak(aiFb.better)}>🔊</button></div>
                    <p style={{marginTop:6,fontStyle:'italic'}}>{aiFb.better}</p>
                    <button className="eh-btn sm amber" style={{marginTop:10}} onClick={()=>{ setCustom(aiFb.better); choose('custom', aiFb.better); }}>Shadowing theo bản này →</button>
                  </>)}
                </div>
              ))}
              <p style={{fontSize:11,color:'var(--faint)',marginBottom:12,lineHeight:1.5}}>Điểm chỉ cho biết máy nghe ra bao nhiêu từ, đúng thứ tự — chưa chấm ngữ điệu và trọng âm. Hãy nghe lại ghi âm của mình.</p>
              <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:12}}>
                <span style={{fontFamily:'var(--mono)',fontSize:11,color:'var(--dim)'}}>GIỌNG</span>
                <select className="eh-sel" value={sttLang} onChange={e=>setSttLang(e.target.value)} style={{fontSize:13}} aria-label="Giọng nhận dạng">
                  <option value="en-US">🇺🇸 Anh-Mỹ</option><option value="en-GB">🇬🇧 Anh-Anh</option><option value="en-AU">🇦🇺 Anh-Úc</option>
                </select>
              </div>
              <button className={`eh-btn full ${stt.listening?'red':'violet'}`} onClick={toggleStt}>{stt.listening?'⏹ Dừng nhận dạng':'👂 Bắt đầu nhận dạng'}</button>
            </div>

            <div className="eh-card">
              <span className="eh-clabel">Luyện hội thoại với ChatGPT Voice</span>
              <p className="eh-p" style={{marginBottom:10}}>Yêu cầu AI đóng vai đồng nghiệp hoặc đối tác nước ngoài, nói ở trình độ A2 và sửa lỗi sau mỗi lượt trả lời. Sao chép lời nhắn dưới đây rồi dán vào ChatGPT:</p>
              <p style={{background:'var(--surface2)',borderRadius:11,padding:'12px 14px',fontSize:13,lineHeight:1.6,fontFamily:'var(--mono)',color:'var(--dim)',marginBottom:10}}>{ROLEPLAY_PROMPT(topic)}</p>
              <button className="eh-btn sm" onClick={copyPrompt}>{copied?'✓ Đã sao chép':'📋 Sao chép'}</button>
            </div>
            <p style={{fontFamily:'var(--mono)',fontSize:10.5,color:'var(--dim)',textAlign:'center',lineHeight:1.7}}>Ghi âm &amp; nhận dạng cần Google Chrome và quyền micro.</p>
          </>)}

          {/* ═══ CỤM TỪ ═══ */}
          {page==='phrases' && (<>
            <div className="eh-pagehead">
              <div className="eh-eyebrow">Vocabulary · 5 phút</div>
              <h1 className="eh-title">{phrases.length} cụm từ đã lưu</h1>
              <p className="eh-sub">Mục tiêu: dùng được 30–50 cụm từ. Lưu cụm hay gặp khi nghe, ôn ngắt quãng 1 → 3 → 7 → 14 → 30 ngày; mỗi lần ôn hãy đọc to và tự đặt một câu của bạn.</p>
            </div>

            {reviewing && card ? (<>
              <div style={{display:'flex',justifyContent:'space-between',fontFamily:'var(--mono)',fontSize:11,color:'var(--dim)',marginBottom:8}}>
                <span>CỤM {qi+1} / {dueList.length}</span><button className="eh-btn sm" onClick={()=>setReviewing(false)}>Dừng</button>
              </div>
              <div className="eh-bar" style={{marginBottom:16}}><i style={{width:`${(qi/dueList.length)*100}%`,background:'var(--gold)'}}/></div>
              <div className="eh-card eh-flash">
                {card.note && !flipped ? (<>
                  <Pill c="var(--violet)">NÓI BẰNG TIẾNG ANH</Pill>
                  <div style={{fontSize:21,color:'var(--gold)',fontWeight:600,margin:'14px 0'}}>{card.note}</div>
                </>) : (<>
                  <div style={{fontSize:21,fontWeight:700,margin:'6px 0 10px',lineHeight:1.4}}>{card.text}</div>
                  {card.note && <div style={{color:'var(--gold)',fontSize:14}}>{card.note}</div>}
                  <button className="eh-btn sm" style={{marginTop:12}} onClick={()=>speak(card.text)}>🔊 Nghe</button>
                </>)}
                <p className="eh-p" style={{marginTop:12}}>{card.note && !flipped ? 'Nói to cụm tiếng Anh, rồi xem đáp án.' : 'Đọc to theo, rồi nói một câu của bạn có dùng cụm này.'}</p>
              </div>
              {card.note && !flipped ? <button className="eh-btn full" onClick={()=>{setFlip(true); speak(card.text);}}>Xem đáp án</button> : (
                <div style={{display:'flex',gap:10}}>
                  <button className="eh-btn red" style={{flex:1,padding:14}} onClick={()=>answer(false)}>Chưa dùng được</button>
                  <button className="eh-btn green" style={{flex:1,padding:14}} onClick={()=>answer(true)}>Dùng được!</button>
                </div>
              )}
              <p style={{fontFamily:'var(--mono)',fontSize:10.5,color:'var(--dim)',textAlign:'center',marginTop:14}}>
                Dùng được → {card.reviewCount+1>=GAPS.length ? `thành thạo, kiểm tra lại sau ${RECHECK_DAYS} ngày` : `ôn lại sau ${GAPS[card.reviewCount+1]} ngày`} · Chưa → ôn lại ngày mai
              </p>
            </>) : (<>
              {due.length>0 && (
                <div className="eh-card accent">
                  <div className="eh-ctitle" style={{marginBottom:10}}>{due.length} cụm đến hạn ôn</div>
                  <button className="eh-btn gold" onClick={startReview}>Ôn ngay →</button>
                </div>
              )}
              <div className="eh-card">
                <span className="eh-clabel">Thêm cụm từ</span>
                <input className="eh-sel" value={pIn} onChange={e=>setPIn(e.target.value)} placeholder="Cụm tiếng Anh, ví dụ: Let me make sure I understand correctly." aria-label="Cụm tiếng Anh" style={{marginBottom:8}} />
                <input className="eh-sel" value={pNote} onChange={e=>setPNote(e.target.value)} onKeyDown={e=>{ if(e.key==='Enter') addTyped(); }} placeholder="Nghĩa / ghi chú tiếng Việt (tuỳ chọn — có thì sẽ ôn theo kiểu nhìn nghĩa nói ra cụm)" aria-label="Nghĩa tiếng Việt" />
                <div style={{display:'flex',gap:8,marginTop:10,flexWrap:'wrap'}}>
                  <button className="eh-btn green" disabled={!pIn.trim()} onClick={addTyped}>+ Thêm</button>
                  <button className="eh-btn violet" onClick={async()=>{ const n=await addPhrases(SAMPLES.slice(1).flatMap(s=>s.text.split('\n').map(text=>({text})))); if(!n) alert('Các mẫu câu IT đã có trong kho.'); }}>+ Thêm 12 mẫu câu tình huống IT</button>
                </div>
              </div>
              {phrases.length>0 && (
                <div className="eh-card">
                  {phrases.slice().reverse().map((p,i)=>(
                    <div key={p.id} style={{display:'flex',alignItems:'center',gap:10,justifyContent:'space-between',padding:'10px 0',borderTop:i?'1px solid var(--line-soft)':'none'}}>
                      <div style={{minWidth:0}}>
                        <div style={{fontSize:14.5,fontWeight:600}}>{p.text} {p.mastered && <Pill c="var(--green)">✓</Pill>} {isDue(p) && <Pill c="var(--gold)">cần ôn</Pill>}</div>
                        {p.note && <div style={{fontSize:13,color:'var(--gold)',marginTop:2}}>{p.note}</div>}
                        <div style={{fontFamily:'var(--mono)',fontSize:10.5,color:'var(--dim)',marginTop:2}}>ôn {p.reviewCount}× · tiếp {p.nextReview}</div>
                      </div>
                      <div style={{display:'flex',gap:6,flexShrink:0}}>
                        <button className="eh-btn sm" onClick={()=>speak(p.text)} aria-label="Nghe">🔊</button>
                        <button className="eh-btn sm" onClick={()=>delPhrase(p.id)} aria-label="Xoá">✕</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>)}
          </>)}

          {/* ═══ THEO DÕI ═══ */}
          {page==='track' && (<>
            <div className="eh-pagehead">
              <div className="eh-eyebrow">Theo dõi kết quả mỗi tuần</div>
              <h1 className="eh-title">Bạn có thực sự tiến bộ?</h1>
              <p className="eh-sub">Cuối mỗi tuần tự chấm 5 tiêu chí (1 = chưa đạt, 5 = đạt mục tiêu). Mỗi Chủ nhật ghi âm lại cùng một chủ đề và nghe so sánh với tuần trước.</p>
            </div>

            <span className="eh-clabel">Đánh giá cuối giai đoạn · đạt từ {PASS}%</span>
            <div className="eh-card">
              {PHASES.map((p,i)=>{
                const tries = phaseRes[p.n] || []; const best = bestPhase(p.n);
                return (
                  <div key={p.n} style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:10,flexWrap:'wrap',padding:'10px 0',borderTop:i?'1px solid var(--line-soft)':'none'}}>
                    <div style={{minWidth:0}}>
                      <div style={{fontSize:14.5,fontWeight:600}}>Giai đoạn {p.n} · {p.name} <Pill c="var(--dim)">{p.level}</Pill> {best!=null && <Pill c={best>=PASS?'var(--green)':'var(--gold)'}>{best>=PASS?'đạt':'chưa đạt'} · {best}%</Pill>}</div>
                      <div className="eh-p" style={{fontSize:12}}>
                        {tries.length ? tries.slice(-4).map(t=>`${t.date.split('-').reverse().slice(0,2).join('/')}: ${t.total ?? '—'}%${t.level?` (${t.level})`:''}`).join(' · ') : `Nên làm vào cuối tuần ${p.weeks[1]}.`}
                      </div>
                    </div>
                    <button className="eh-btn sm" onClick={()=>startPhase(p.n)}>{tries.length ? 'Làm lại' : 'Làm bài'}</button>
                  </div>
                );
              })}
            </div>

            <div className="eh-card">
              <table className="eh-table">
                <thead><tr><th>Tiêu chí</th><th>Mục tiêu</th>{Array.from({length:week},(_,i)=><th key={i} style={{textAlign:'center'}}>T{i+1}</th>)}</tr></thead>
                <tbody>
                  {CRITERIA.map(c=>(
                    <tr key={c.id}><td style={{fontWeight:600}}>{c.name}</td><td style={{color:'var(--dim)'}}>{c.goal}</td>
                      {Array.from({length:week},(_,i)=><td key={i} style={{textAlign:'center',fontFamily:'var(--mono)',color:log[i+1]?.r?.[c.id]>=4?'var(--green)':'var(--text)'}}>{log[i+1]?.r?.[c.id]||'·'}</td>)}
                    </tr>
                  ))}
                  <tr><td style={{fontWeight:600}}>Kiểm tra ngày</td><td style={{color:'var(--dim)'}}>Điểm trung bình kiểm tra cuối ngày (%)</td>
                    {Array.from({length:week},(_,i)=>{ const a=weekQuizAvg(i+1); return <td key={i} style={{textAlign:'center',fontFamily:'var(--mono)',color:a==null?'var(--text)':a>=PASS?'var(--green)':'var(--gold)'}}>{a ?? '·'}</td>; })}
                  </tr>
                </tbody>
              </table>
            </div>

            {Array.from({length:week},(_,i)=>week-i).map(w=>{
              const open = (openWeek ?? week) === w;
              const entry = log[w] || { r:{}, note:'' };
              return (
                <div key={w} className={`eh-card ${w===week?'accent':''}`}>
                  <button onClick={()=>setOpenWeek(open?0:w)} style={{all:'unset',cursor:'pointer',display:'flex',justifyContent:'space-between',width:'100%',alignItems:'center'}}>
                    <span className="eh-ctitle">Tuần {w} · {WEEKS[w-1].topic}</span>
                    <span style={{display:'flex',gap:6,alignItems:'center'}}>{weekRecs[w] && <Pill c="var(--cyan)">🎙</Pill>}<span style={{color:'var(--dim)'}}>{open?'▾':'▸'}</span></span>
                  </button>
                  {open && (<div style={{marginTop:14}}>
                    {CRITERIA.map(c=>(
                      <div key={c.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:10,padding:'8px 0',borderTop:'1px solid var(--line-soft)',flexWrap:'wrap'}}>
                        <div><div style={{fontSize:14,fontWeight:600}}>{c.name}</div><div className="eh-p" style={{fontSize:12}}>{c.goal}</div></div>
                        <div className="eh-rate" role="group" aria-label={c.name}>
                          {[1,2,3,4,5].map(v=><button key={v} className={entry.r[c.id]===v?'on':''} onClick={()=>setRating(w,c.id,v)} aria-pressed={entry.r[c.id]===v}>{v}</button>)}
                        </div>
                      </div>
                    ))}
                    <textarea className="eh-ta" style={{marginTop:10,minHeight:70}} defaultValue={entry.note} onBlur={e=>{ if(e.target.value!==entry.note) setNote(w,e.target.value); }} placeholder="Ghi chú: điều làm tốt, điều cần cải thiện tuần sau…" aria-label={`Ghi chú tuần ${w}`} />
                    <div style={{marginTop:12}}>
                      <span className="eh-clabel">Bản ghi Chủ nhật</span>
                      {weekRecs[w] ? <audio src={weekRecs[w]} controls style={{width:'100%'}} />
                        : <p className="eh-p">Chưa có. Ghi âm ở trang Luyện nói rồi bấm “Lưu làm bản ghi tuần”.</p>}
                      {w>1 && weekRecs[w-1] && weekRecs[w] && <><span className="eh-clabel" style={{marginTop:10}}>So với tuần {w-1}</span><audio src={weekRecs[w-1]} controls style={{width:'100%'}} /></>}
                    </div>
                  </div>)}
                </div>
              );
            })}

            <button className="eh-btn full sm" style={{color:'var(--dim)'}} onClick={clearAll}>Xoá toàn bộ dữ liệu và bắt đầu lại</button>
          </>)}

        </main>
      </div>

      {/* ─── BOTTOM NAV (mobile) ─── */}
      <nav className="eh-bottomnav">
        {NAV.map(it=>(
          <button key={it.id} className={`eh-bn ${page===it.id?'on':''}`} onClick={()=>go(it.id)}>
            {it.badge>0 && <span className="dot">{it.badge}</span>}
            <span className="ic">{it.ic}</span>{it.short}
          </button>
        ))}
      </nav>
    </div>
  );
}
