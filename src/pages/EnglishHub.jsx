import { useState, useEffect, useRef } from "react";
import { GAPS, RECHECK_DAYS, todayStr, nextRev, isDue, grade, scoreReading, ROADMAP, roadmapProgress } from "./learning";

/* ════════════════════════════════════════════════════════════════════════════
   ENGLISH HUB — study OS cho dân IT luyện IELTS
   Gộp: Học từ vựng (AI + spaced repetition) + Luyện phát âm (TTS/ghi âm/STT)
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

// ─── Pronunciation samples ──────────────────────────────────────────────────
const SAMPLES = [
  { id:1, title:'Giới thiệu bản thân', text:"Hi, I'm Nam. Nice to meet you.\nNice to meet you too. I'm Linh.\nWhere are you from, Linh?\nI'm from Da Nang. How about you?\nI'm from Ho Chi Minh City. What do you do?\nI work as a nurse. And you?\nI'm an office worker. In my free time, I like cooking." },
  { id:2, title:'Phỏng vấn xin việc IT', text:"Tell me about your experience.\nI've worked as a backend developer for three years.\nWhat technologies do you use?\nMainly Python and PostgreSQL, and I deploy with Docker.\nHow do you handle tight deadlines?\nI prioritize tasks and communicate early with my team.\nGreat. We'll be in touch soon." },
  { id:3, title:'Thuyết trình dự án', text:"Today I'll walk you through our new feature.\nFirst, let me clarify the main goal.\nThis update will significantly improve performance.\nAs you can see, the results are quite compelling.\nDo you have any questions so far?\nThank you for your attention." },
  { id:4, title:'IELTS Speaking Part 2', text:"I'd like to talk about a skill I learned recently.\nLast year, I decided to learn public speaking.\nAt first, I was quite anxious and overwhelmed.\nHowever, with consistent practice, I became more confident.\nThis skill has had a significant impact on my career.\nI'm really glad I committed to it." },
  { id:5, title:'Câu cứu nguy khi bí từ', text:"Sorry, could you say that again?\nWhat do you mean exactly?\nHow do you say that in English?\nLet me think for a second.\nThat's a good question. I need a moment.\nCould you speak a little more slowly, please?" },
];

// ─── TTS ───────────────────────────────────────────────────────────────────────
function speak(text, rate = 0.82) {
  if (!('speechSynthesis' in window)) return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'en-US'; u.rate = rate;
  const vs = speechSynthesis.getVoices().filter(v => v.lang.startsWith('en'));
  if (vs.length) u.voice = vs.find(v => v.name.includes('Google')) || vs[0];
  speechSynthesis.speak(u);
}

// ─── AI ────────────────────────────────────────────────────────────────────────
// Trong Claude Artifact gọi thẳng API; ở ngoài đi qua proxy giữ API key (server/ai-proxy.js).
const AI_URL = window.storage ? "https://api.anthropic.com/v1/messages" : "/api/messages";
async function askAI(prompt) {
  const res = await fetch(AI_URL, {
    method:"POST", headers:{"Content-Type":"application/json"},
    body:JSON.stringify({ model:"claude-sonnet-4-6", max_tokens:4000, messages:[{role:"user",content:prompt}] })
  });
  const data = await res.json();
  const text = data.content?.find(b => b.type === 'text')?.text || '';
  return JSON.parse(text.replace(/```json|```/g, '').trim());
}
const callAI = (words) => askAI(`Vietnamese learner: IT professional studying for IELTS (target band 6.5–7). Words: ${words.join(', ')}

Return ONLY valid JSON, with the words in the same order and each "word" exactly as given:
{"words":[{"word":"...","vi":"Vietnamese meaning; if the word has 2 common meanings, give both separated by ' / '","type":"noun/verb/adj/adv","ipa":"phonetic","collocations":["2-3 common collocations useful for IELTS Speaking/Writing, e.g. 'address an issue'"],"example":"one natural IELTS-style example sentence using the word"}],"story":"Natural 7-9 sentence English dialogue/story using ALL words. Conversational, mix professional and casual.","storyVi":"Vietnamese translation"}`);
const callAISuggest = (learned) => askAI(`IT professional preparing for IELTS (target band 6.5–7). Interests: technology, movies, psychology. Already learned: ${learned.slice(-50).join(', ')||'none'}.

Suggest 5 NEW English words not in the list, useful for IELTS Writing Task 2 or Speaking topics, not basic IT jargon. Return ONLY JSON:
{"words":["w1","w2","w3","w4","w5"],"theme":"theme in Vietnamese","reason":"1 sentence in Vietnamese"}`);
const callAICheck = (words, sentences) => askAI(`A Vietnamese IT professional preparing for IELTS wrote these sentences to practise the words: ${words.join(', ')}.

Sentences (one per line):
${sentences}

For each sentence, check grammar, word choice, collocation and whether the target word is used correctly. Return ONLY JSON:
{"items":[{"sentence":"the learner's sentence","ok":true,"fixed":"corrected, natural version (same as the sentence if already good)","note":"short explanation in Vietnamese"}]}`);

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

/* Sidebar */
.eh-side{width:236px;flex-shrink:0;background:var(--surface);border-right:1px solid var(--line);padding:22px 14px;display:flex;flex-direction:column;position:sticky;top:0;height:100vh;}
.eh-brand{display:flex;align-items:center;gap:10px;padding:0 8px 22px;}
.eh-logo{width:34px;height:34px;border-radius:9px;background:linear-gradient(135deg,var(--gold),#e0992b);display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0;}
.eh-brand-name{font-size:15px;font-weight:700;letter-spacing:-.2px;line-height:1.1;}
.eh-brand-sub{font-family:var(--mono);font-size:9.5px;color:var(--dim);letter-spacing:.08em;text-transform:uppercase;margin-top:2px;}
.eh-navgroup-label{font-family:var(--mono);font-size:9.5px;color:var(--dim);letter-spacing:.12em;text-transform:uppercase;padding:0 10px;margin:14px 0 6px;}
.eh-nav{display:flex;align-items:center;gap:11px;width:100%;padding:10px 11px;border:none;background:transparent;color:var(--dim);border-radius:9px;cursor:pointer;font-family:inherit;font-size:13.5px;font-weight:500;transition:all .15s;text-align:left;position:relative;}
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
.eh-sub{color:var(--dim);font-size:14px;margin-top:7px;max-width:560px;line-height:1.5;}

/* Cards */
.eh-card{background:var(--surface);border:1px solid var(--line);border-radius:14px;padding:18px 20px;margin-bottom:16px;}
.eh-card.accent{border-color:rgba(245,185,69,.3);background:linear-gradient(180deg,var(--gold-soft),transparent);}
.eh-card.cyan{border-color:rgba(76,201,224,.25);}
.eh-card.violet{border-color:rgba(167,139,250,.25);}
.eh-clabel{font-family:var(--mono);font-size:10px;color:var(--dim);letter-spacing:.1em;text-transform:uppercase;display:block;margin-bottom:12px;}
.eh-ctitle{font-size:15px;font-weight:650;}

/* Stat grid */
.eh-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:18px;}
.eh-stat{background:var(--surface);border:1px solid var(--line);border-radius:13px;padding:16px;}
.eh-stat .n{font-family:var(--mono);font-size:26px;font-weight:700;letter-spacing:-1px;line-height:1;}
.eh-stat .l{font-size:11.5px;color:var(--dim);margin-top:6px;}
.eh-stat .ic{font-size:15px;float:right;opacity:.7;}

/* Buttons */
.eh-btn{font-family:inherit;font-size:13.5px;font-weight:600;border-radius:10px;cursor:pointer;padding:11px 16px;transition:all .16s;display:inline-flex;align-items:center;justify-content:center;gap:8px;border:1px solid var(--line);background:transparent;color:var(--text);}
.eh-btn:hover{border-color:var(--dim);background:var(--surface2);}
.eh-btn:focus-visible{outline:2px solid var(--gold);outline-offset:2px;}
.eh-btn:disabled{opacity:.45;cursor:not-allowed;}
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

/* Pills / badges */
.eh-pill{font-family:var(--mono);font-size:10px;font-weight:600;padding:3px 8px;border-radius:20px;letter-spacing:.02em;display:inline-flex;align-items:center;gap:4px;}
.eh-chip{font-size:13px;padding:5px 11px;background:var(--surface2);border:1px solid var(--line);border-radius:20px;}

/* Inputs */
.eh-ta,.eh-sel{width:100%;background:var(--surface2);border:1px solid var(--line);border-radius:11px;padding:12px 14px;color:var(--text);font-size:14.5px;font-family:inherit;outline:none;}
.eh-ta{min-height:120px;resize:vertical;line-height:1.9;}
.eh-ta:focus,.eh-sel:focus{border-color:var(--gold);}
.eh-range{-webkit-appearance:none;appearance:none;flex:1;height:4px;background:var(--line);border-radius:2px;outline:none;cursor:pointer;}
.eh-range::-webkit-slider-thumb{-webkit-appearance:none;width:16px;height:16px;background:var(--gold);border-radius:50%;cursor:pointer;}

/* Word reader */
.eh-word{display:inline;cursor:pointer;padding:2px 3px;margin:0 1px;border-radius:4px;transition:background .1s;}
.eh-word:hover{background:rgba(255,255,255,.06);}
.eh-word.cur{background:var(--gold-soft);color:var(--gold);font-weight:700;}
.eh-word.done{color:#4a5468;}
.eh-w-ok{display:inline-block;padding:2px 7px;margin:2px;border-radius:5px;background:var(--green-soft);color:var(--green);font-size:14px;}
.eh-w-err{display:inline-block;padding:2px 7px;margin:2px;border-radius:5px;background:var(--red-soft);color:var(--red);font-size:14px;}

/* Flashcard */
.eh-flash{min-height:210px;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;cursor:pointer;user-select:none;}

/* Canvas */
.eh-canvas{width:100%;display:block;border-radius:10px;background:var(--ink);margin-bottom:14px;}

/* Animations */
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.3}}
.pulse{animation:pulse 1s ease-in-out infinite;}
@keyframes fadein{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
.eh-main > *{animation:fadein .25s ease;}

/* Mobile bottom nav */
.eh-bottomnav{display:none;}
@media(max-width:760px){
  .eh-side{display:none;}
  .eh-main{padding:22px 16px 92px;max-width:none;}
  .eh-title{font-size:23px;}
  .eh-stats{grid-template-columns:1fr 1fr;}
  .eh-bottomnav{display:flex;position:fixed;bottom:0;left:0;right:0;background:var(--surface);border-top:1px solid var(--line);padding:6px 4px calc(6px + env(safe-area-inset-bottom));z-index:50;}
  .eh-bn{flex:1;display:flex;flex-direction:column;align-items:center;gap:3px;background:none;border:none;color:var(--dim);cursor:pointer;font-family:inherit;font-size:9.5px;font-weight:500;padding:6px 2px;border-radius:8px;position:relative;}
  .eh-bn.on{color:var(--gold);}
  .eh-bn .ic{font-size:18px;}
  .eh-bn .dot{position:absolute;top:2px;right:50%;margin-right:-16px;background:var(--red);color:#fff;font-family:var(--mono);font-size:8px;font-weight:700;border-radius:8px;padding:0 4px;}
}
`;

// Câu ví dụ đã che từ cần nhớ; null nếu không che được (để không lộ đáp án).
const cloze = (w) => {
  if (!w.example) return null;
  const c = w.example.replace(new RegExp(w.word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), '____');
  return c === w.example ? null : c;
};

// ─── Small components ────────────────────────────────────────────────────────
const Pill = ({ children, c }) => (
  <span className="eh-pill" style={{ background:`${c}1f`, color:c, border:`1px solid ${c}3a` }}>{children}</span>
);

// ═══════════════════════════════════════════════════════════════════════════════
export default function App() {
  const [page, setPage]       = useState('home');
  const [bank, setBank]       = useState([]);
  const [sessions, setSess]   = useState([]);
  const [input, setInput]     = useState('');
  const [loading, setLoading] = useState(false);
  const [suggesting, setSugg] = useState(false);
  const [lesson, setLesson]   = useState(null);
  const [err, setErr]         = useState('');
  const [init, setInit]       = useState(false);
  const [dueList, setDue]     = useState([]);
  const [qi, setQi]           = useState(0);
  const [flipped, setFlip]    = useState(false);
  const [done, setDone]       = useState(false);
  const [showVi, setShowVi]   = useState(false);
  const [aiSug, setAiSug]     = useState(null);
  const [viewDay, setViewDay] = useState(null);
  const [typed, setTyped]     = useState('');      // đáp án gõ ở thẻ đảo chiều
  const [practice, setPractice] = useState('');    // câu tự đặt
  const [feedback, setFeedback] = useState(null);
  const [checking, setChecking] = useState(false);

  // pronunciation state
  const [pText, setPText]     = useState('');
  const [pWords, setPWords]   = useState([]);
  const [pVoices, setPVoices] = useState([]);
  const [pVoice, setPVoice]   = useState(0);
  const [pRate, setPRate]     = useState(0.75);
  const [pPlaying, setPPlay]  = useState(false);
  const [recState, setRecState] = useState('idle'); // idle|recording|done
  const [recURL, setRecURL]   = useState(null);
  const [recSecs, setRecSecs] = useState(0);
  const [sttState, setStt]    = useState('idle');
  const [sttText, setSttText] = useState('');
  const [sttScore, setSttScore] = useState(null);
  const [sttLang, setSttLang] = useState('en-US');

  const lastIdx = useRef(-1);
  const mrRef = useRef(null); const streamRef = useRef(null);
  const actxRef = useRef(null); const anRef = useRef(null); const afrRef = useRef(null);
  const canvasRef = useRef(null); const timerRef = useRef(null);
  const audioRef = useRef(null); const recRef = useRef(null); const sttFinal = useRef('');

  // ── Load ──
  useEffect(() => {
    (async () => {
      const b = await load('eh_bank', []); const s = await load('eh_sess', []);
      setBank(b); setSess(s); setDue(b.filter(isDue));
      const tod = s.find(x => x.date === todayStr()); if (tod) setLesson(tod);
      setInit(true);
    })();
  }, []);

  useEffect(() => {
    if (!('speechSynthesis' in window)) return;
    const lv = () => {
      let v = speechSynthesis.getVoices().filter(x => x.lang.startsWith('en'));
      v.sort((a,b)=> b.name.includes('Google') - a.name.includes('Google'));
      setPVoices(v);
    };
    speechSynthesis.onvoiceschanged = lv; lv();
  }, []);

  const due = bank.filter(isDue);
  const learnedDays = sessions.length;
  const { done: roadmapDone, current: todayRoadmap } = roadmapProgress(bank);
  const todayDone = sessions.some(s => s.date === todayStr());
  const mastered = bank.filter(w => w.mastered).length;
  const card = dueList[qi];
  const reverse = card && card.reviewCount >= 1; // từ lần ôn thứ 2: nhìn nghĩa → tự nhớ ra từ

  // ── Vocab actions ──
  async function generate(override) {
    const raw = override || input;
    const words = raw.split(/[\n,]+/).map(w=>w.trim()).filter(Boolean).slice(0,5);
    if (!words.length) { setErr('Nhập ít nhất 1 từ tiếng Anh.'); return; }
    setLoading(true); setErr('');
    try {
      const parsed = await callAI(words);
      const t = todayStr();
      const wo = parsed.words.map(w=>({ id:w.word.toLowerCase()+'_'+Date.now()+Math.random().toString(36).slice(2,5), word:w.word, vi:w.vi, type:w.type, ipa:w.ipa||'', collocations:Array.isArray(w.collocations)?w.collocations.map(String):[], example:typeof w.example==='string'?w.example:'', learnedDate:t, reviewCount:0, nextReview:nextRev(0), mastered:false }));
      const ns = { date:t, wordList:wo, story:parsed.story, storyVi:parsed.storyVi };
      const nb = [...bank, ...wo]; const ns2 = [...sessions.filter(s=>s.date!==t), ns];
      await save('eh_bank', nb); await save('eh_sess', ns2);
      setBank(nb); setSess(ns2); setLesson(ns); setDue(nb.filter(isDue));
      setPage('lesson'); setShowVi(false); setInput(''); setPractice(''); setFeedback(null);
    } catch { setErr('Có lỗi xảy ra. Kiểm tra kết nối và thử lại.'); }
    setLoading(false);
  }
  async function getSuggest() {
    setSugg(true); setErr('');
    try { setAiSug(await callAISuggest(bank.map(w=>w.word))); }
    catch { setErr('Không lấy được đề xuất. Thử lại.'); }
    setSugg(false);
  }
  async function checkPractice() {
    if (!practice.trim()) return;
    setChecking(true); setFeedback(null);
    try { const r = await callAICheck(lesson.wordList.map(w=>w.word), practice.trim()); setFeedback(Array.isArray(r.items) ? r.items : []); }
    catch { setFeedback([]); }
    setChecking(false);
  }
  function pickLesson(s){ setLesson(s); setShowVi(false); setPractice(''); setFeedback(null); }
  function startReview(){ setDue(due); setQi(0); setFlip(false); setTyped(''); setDone(false); setPage('review'); }
  const go = (id) => id === 'review' ? startReview() : setPage(id); // vào tab Ôn tập luôn lấy danh sách đến hạn mới nhất
  function reveal(){ setFlip(true); speak(card.word); }
  async function answer(ok){
    const nb = bank.map(x => x.id === card.id ? grade(x, ok) : x);
    await save('eh_bank', nb); setBank(nb); setFlip(false); setTyped('');
    if (qi+1>=dueList.length){ setDone(true); setDue(nb.filter(isDue)); } else setQi(qi+1);
  }
  async function clearAll(){
    if(!window.confirm('Xoá toàn bộ dữ liệu học? Không thể hoàn tác.')) return;
    await save('eh_bank',[]); await save('eh_sess',[]);
    setBank([]); setSess([]); setLesson(null); setDue([]); setPage('home');
  }

  // ── Pronunciation: load text ──
  function loadPText(text){
    stopTTS();
    setPText(text);
    const re=/\S+/g; let m,i=0; const arr=[];
    while((m=re.exec(text))!==null) arr.push({i:i++,w:m[0],s:m.index,e:m.index+m[0].length});
    setPWords(arr); setSttScore(null); setSttText('');
  }
  function ttsHighlight(idx){
    if(lastIdx.current>=0){ const p=document.getElementById('ehw'+lastIdx.current); if(p){p.classList.remove('cur');p.classList.add('done');} }
    if(idx>=0){ const c=document.getElementById('ehw'+idx); if(c){c.classList.add('cur');c.classList.remove('done');} }
    lastIdx.current=idx;
  }
  function clearHi(){ pWords.forEach(w=>{const e=document.getElementById('ehw'+w.i); if(e)e.className='eh-word';}); lastIdx.current=-1; }
  function playTTS(){
    if(!pText) return; clearHi();
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
  function speakWord(word){ const c=word.replace(/[.,!?;:"']/g,''); if(!c)return; speechSynthesis.cancel(); const u=new SpeechSynthesisUtterance(c); u.lang='en-US'; u.rate=pRate; if(pVoices[pVoice])u.voice=pVoices[pVoice]; speechSynthesis.speak(u); }

  // ── Recording ──
  async function toggleRec(){ if(recState==='recording') stopRec(); else await startRec(); }
  async function startRec(){
    let stream;
    try { stream = await navigator.mediaDevices.getUserMedia({audio:true}); }
    catch { alert('Không truy cập được microphone. Hãy cho phép quyền micro trong trình duyệt.\n\n(Nếu đang xem trong khung chat, hãy tải bản .html về và mở bằng Chrome để ghi âm.)'); return; }
    streamRef.current=stream; stopTTS();
    try{ const ac=new (window.AudioContext||window.webkitAudioContext)(); const an=ac.createAnalyser(); an.fftSize=512; ac.createMediaStreamSource(stream).connect(an); actxRef.current=ac; anRef.current=an; }catch{ /* không có sóng âm vẫn ghi được */ }
    const mime=['audio/webm;codecs=opus','audio/webm','audio/mp4'].find(t=>{try{return MediaRecorder.isTypeSupported(t);}catch{return false;}})||'';
    let mr; try{ mr=mime?new MediaRecorder(stream,{mimeType:mime}):new MediaRecorder(stream); }catch{ mr=new MediaRecorder(stream); }
    mrRef.current=mr; const chunks=[];
    mr.ondataavailable=e=>{ if(e.data&&e.data.size>0)chunks.push(e.data); };
    mr.onstop=()=>{ const blob=new Blob(chunks,{type:mr.mimeType||'audio/webm'}); if(recURL)URL.revokeObjectURL(recURL); const url=URL.createObjectURL(blob); setRecURL(url); setRecState('done'); };
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
  function drawWave(){
    const cv=canvasRef.current; if(!cv||!anRef.current)return;
    const ctx=cv.getContext('2d'); cv.width=cv.offsetWidth||600; const W=cv.width,H=cv.height; const an=anRef.current; const buf=an.frequencyBinCount; const data=new Uint8Array(buf);
    const draw=()=>{ afrRef.current=requestAnimationFrame(draw); an.getByteTimeDomainData(data); ctx.clearRect(0,0,W,H); ctx.lineWidth=2.4; ctx.strokeStyle='#4cc9e0'; ctx.beginPath(); const sl=W/buf; let x=0; for(let i=0;i<buf;i++){const v=data[i]/128,y=v*H/2; i===0?ctx.moveTo(x,y):ctx.lineTo(x,y); x+=sl;} ctx.lineTo(W,H/2); ctx.stroke(); };
    draw();
  }
  function drawIdle(){
    const cv=canvasRef.current; if(!cv)return; const ctx=cv.getContext('2d'); cv.width=cv.offsetWidth||600; const W=cv.width,H=cv.height;
    ctx.clearRect(0,0,W,H); ctx.lineWidth=1.4; ctx.strokeStyle='#28303f'; ctx.beginPath();
    for(let x=0;x<=W;x++){const y=H/2+Math.sin(x*.045)*2.5; x===0?ctx.moveTo(x,y):ctx.lineTo(x,y);} ctx.stroke();
  }
  useEffect(()=>{ if(page==='speak') setTimeout(drawIdle,80); }, [page]);

  // ── STT ──
  function toggleStt(){ if(sttState==='listening') { if(recRef.current)recRef.current.stop(); } else startStt(); }
  function startStt(){
    const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
    if(!SR){ alert('Nhận dạng giọng nói chỉ chạy trên Google Chrome.'); return; }
    const r=new SR(); recRef.current=r; r.lang=sttLang; r.continuous=true; r.interimResults=true; sttFinal.current='';
    r.onresult=(ev)=>{ let interim=''; sttFinal.current=''; for(let i=0;i<ev.results.length;i++){ if(ev.results[i].isFinal)sttFinal.current+=ev.results[i][0].transcript+' '; else interim+=ev.results[i][0].transcript; } setSttText((sttFinal.current?sttFinal.current:'')+(interim?'⟨'+interim+'⟩':'')); };
    r.onend=()=>{ setStt('idle'); if(sttFinal.current.trim()) scoreStt(sttFinal.current.trim()); };
    r.onerror=(e)=>{ setStt('idle'); if(e.error==='not-allowed')alert('Không có quyền micro.'); };
    r.start(); setStt('listening'); setSttText(''); setSttScore(null);
  }
  function scoreStt(spoken){ setSttScore(scoreReading(pText, spoken)); }

  if (!init) return <div className="eh-root"><div style={{display:'flex',minHeight:'100vh',alignItems:'center',justifyContent:'center',color:'var(--dim)',fontFamily:'var(--sans)'}}>Đang tải…</div><style>{STYLES}</style></div>;

  // Nav definition
  const NAVS = [
    { grp:'Học tập', items:[
      { id:'home', ic:'◆', label:'Tổng quan' },
      { id:'learn', ic:'✎', label:'Học từ mới' },
      { id:'roadmap', ic:'❏', label:'Lộ trình 30 ngày' },
      { id:'review', ic:'↻', label:'Ôn tập', badge: due.length },
    ]},
    { grp:'Luyện nói', items:[
      { id:'speak', ic:'🎙', label:'Luyện phát âm' },
    ]},
    { grp:'Dữ liệu', items:[
      { id:'lesson', ic:'▤', label:'Bài học' },
      { id:'bank', ic:'▦', label:'Kho từ vựng' },
    ]},
  ];
  const BOTTOM = [
    { id:'home', ic:'◆', label:'Tổng quan' },
    { id:'learn', ic:'✎', label:'Học' },
    { id:'review', ic:'↻', label:'Ôn tập', badge: due.length },
    { id:'speak', ic:'🎙', label:'Phát âm' },
    { id:'bank', ic:'▦', label:'Kho từ' },
  ];

  return (
    <div className="eh-root">
      <style>{STYLES}</style>
      <div className="eh-shell">

        {/* ─── SIDEBAR ─── */}
        <aside className="eh-side">
          <div className="eh-brand">
            <div className="eh-logo">📖</div>
            <div>
              <div className="eh-brand-name">English Hub</div>
              <div className="eh-brand-sub">IT · IELTS track</div>
            </div>
          </div>
          {NAVS.map(g => (
            <div key={g.grp}>
              <div className="eh-navgroup-label">{g.grp}</div>
              {g.items.map(it => (
                <button key={it.id} className={`eh-nav ${page===it.id?'on':''}`} onClick={()=>go(it.id)}>
                  <span className="ic">{it.ic}</span>{it.label}
                  {it.badge>0 && <span className="dot">{it.badge}</span>}
                </button>
              ))}
            </div>
          ))}
          <div className="eh-side-foot">
            <div className="eh-progress-mini"><span>LỘ TRÌNH</span><span>{roadmapDone.size}/{ROADMAP.length} ngày</span></div>
            <div className="eh-bar"><i style={{width:`${roadmapDone.size/ROADMAP.length*100}%`}}/></div>
          </div>
        </aside>

        {/* ─── MAIN ─── */}
        <main className="eh-main">

          {/* HOME */}
          {page==='home' && (<>
            <div className="eh-pagehead">
              <div className="eh-eyebrow">Bảng điều khiển</div>
              <h1 className="eh-title">Chào mừng trở lại 👋</h1>
              <p className="eh-sub">Quy trình mỗi ngày: ôn từ đến hạn → học 5 từ mới → luyện phát âm. Đều đặn 20–30 phút là đủ.</p>
            </div>
            <div className="eh-stats">
              {[[bank.length,'📚','Tổng số từ'],[mastered,'✅','Đã thành thạo'],[due.length,'↻','Cần ôn'],[learnedDays,'🔥','Ngày đã học']].map(([n,e,l])=>(
                <div className="eh-stat" key={l}><span className="ic">{e}</span><div className="n">{n}</div><div className="l">{l}</div></div>
              ))}
            </div>

            {due.length>0 && (
              <div className="eh-card accent">
                <span className="eh-clabel" style={{color:'var(--gold)'}}>Ưu tiên hôm nay</span>
                <div className="eh-ctitle" style={{marginBottom:6}}>{due.length} từ đến hạn ôn tập</div>
                <p style={{color:'var(--dim)',fontSize:13,marginBottom:14,lineHeight:1.5}}>Ôn lại đúng lúc sắp quên là cách ghi nhớ sâu nhất. Bắt đầu bằng việc này trước khi học từ mới.</p>
                <button className="eh-btn gold" onClick={startReview}>Ôn tập ngay →</button>
              </div>
            )}

            {!todayDone && todayRoadmap ? (
              <div className="eh-card">
                <span className="eh-clabel">Bài học hôm nay · Ngày {todayRoadmap.day}</span>
                <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:12}}>
                  <span style={{fontSize:26}}>{todayRoadmap.icon}</span>
                  <div><div className="eh-ctitle">{todayRoadmap.theme}</div>
                  <div style={{fontFamily:'var(--mono)',fontSize:12,color:'var(--dim)',marginTop:3}}>{todayRoadmap.words.join(' · ')}</div></div>
                </div>
                <button className="eh-btn green" onClick={()=>{setInput(todayRoadmap.words.join('\n'));setPage('learn');}}>Bắt đầu học hôm nay →</button>
              </div>
            ) : todayDone && lesson ? (
              <div className="eh-card">
                <span className="eh-clabel" style={{color:'var(--green)'}}>✓ Hoàn thành hôm nay</span>
                <div className="eh-ctitle" style={{marginBottom:4}}>Đã học {lesson.wordList.length} từ</div>
                <div style={{fontFamily:'var(--mono)',fontSize:12,color:'var(--dim)',marginBottom:14}}>{lesson.wordList.map(w=>w.word).join(' · ')}</div>
                <button className="eh-btn" onClick={()=>setPage('lesson')}>Xem lại bài hôm nay →</button>
              </div>
            ) : null}

            <div className="eh-card">
              <span className="eh-clabel">Hồ sơ học cá nhân hoá</span>
              <div style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:10}}>
                <Pill c="var(--violet)">💻 IT / Lập trình</Pill>
                <Pill c="var(--gold)">🎯 Mục tiêu IELTS</Pill>
                <Pill c="var(--cyan)">🤖 Công nghệ</Pill>
                <Pill c="var(--green)">🧠 Tâm lý học</Pill>
              </div>
              <p style={{color:'var(--dim)',fontSize:12.5,lineHeight:1.6,margin:0}}>Lộ trình 30 ngày: ngày 1–7 công nghệ, công việc &amp; tâm lý · ngày 8–20 các chủ đề Writing Task 2 (giáo dục, môi trường, sức khoẻ, đô thị, tội phạm, chính phủ, văn hoá, truyền thông, gia đình, phim ảnh) · ngày 21–27 ngôn ngữ Task 1 &amp; Task 2 · ngày 28–30 từ vựng học thuật.</p>
            </div>
          </>)}

          {/* LEARN */}
          {page==='learn' && (<>
            <div className="eh-pagehead"><div className="eh-eyebrow">Học từ mới</div><h1 className="eh-title">5 từ hôm nay</h1>
            <p className="eh-sub">Chọn bộ từ gợi ý hoặc tự nhập. AI sẽ tạo nghĩa, phiên âm và một câu chuyện dùng cả 5 từ để bạn vừa học vừa luyện nghe.</p></div>

            {todayRoadmap && !todayDone && (
              <div className="eh-card accent">
                <span className="eh-clabel" style={{color:'var(--gold)'}}>{todayRoadmap.icon} Đề xuất hôm nay · Ngày {todayRoadmap.day} — {todayRoadmap.theme}</span>
                <div style={{display:'flex',flexWrap:'wrap',gap:7,marginBottom:14}}>
                  {todayRoadmap.words.map(w=><span key={w} className="eh-chip">{w}</span>)}
                </div>
                <button className="eh-btn gold full" disabled={loading} onClick={()=>generate(todayRoadmap.words.join('\n'))}>{loading?'Đang tạo bài học…':'Học bộ từ gợi ý →'}</button>
              </div>
            )}

            <div className="eh-card violet">
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
                <span className="eh-clabel" style={{margin:0,color:'var(--violet)'}}>🤖 AI gợi ý thêm</span>
                <button className="eh-btn violet" style={{padding:'7px 12px',fontSize:12}} disabled={suggesting} onClick={getSuggest}>{suggesting?'Đang nghĩ…':'Gợi ý mới'}</button>
              </div>
              {aiSug ? (<>
                <p style={{fontSize:12.5,color:'var(--dim)',marginBottom:10,lineHeight:1.5}}><b style={{color:'var(--violet)'}}>{aiSug.theme}</b> — {aiSug.reason}</p>
                <div style={{display:'flex',flexWrap:'wrap',gap:7,marginBottom:14}}>{aiSug.words.map(w=><span key={w} className="eh-chip">{w}</span>)}</div>
                <button className="eh-btn violet full" disabled={loading} onClick={()=>generate(aiSug.words.join('\n'))}>{loading?'Đang tạo…':'Học bộ từ này →'}</button>
              </>) : <p style={{color:'var(--dim)',fontSize:12.5,margin:0,lineHeight:1.6}}>Nhấn "Gợi ý mới" để AI đề xuất 5 từ phù hợp với profile của bạn, không trùng với những từ đã học.</p>}
            </div>

            <div className="eh-card">
              <span className="eh-clabel">Hoặc tự nhập từ (tối đa 5)</span>
              <textarea className="eh-ta" value={input} onChange={e=>setInput(e.target.value)} placeholder={"Mỗi từ một dòng, hoặc cách nhau bằng dấu phẩy"} />
              {err && <p style={{color:'var(--red)',fontSize:13,marginTop:8}}>{err}</p>}
              <button className="eh-btn green full" style={{marginTop:12}} disabled={loading} onClick={()=>generate()}>{loading?'AI đang tạo bài học…':'Tạo bài học với AI →'}</button>
            </div>
          </>)}

          {/* ROADMAP */}
          {page==='roadmap' && (<>
            <div className="eh-pagehead"><div className="eh-eyebrow">Kế hoạch học</div><h1 className="eh-title">Lộ trình 30 ngày</h1>
            <p className="eh-sub">Thiết kế theo profile IT + IELTS. Nhấn vào từng ngày để xem trước từ vựng và bắt đầu học.</p></div>
            <div className="eh-card">
              {ROADMAP.map(d=>{
                const isDone=roadmapDone.has(d.day);
                const isCur=todayRoadmap?.day===d.day;
                return (
                  <div key={d.day} onClick={()=>setViewDay(viewDay===d.day?null:d.day)} style={{padding:'12px 0',borderBottom:'1px solid var(--line-soft)',cursor:'pointer',borderLeft:isCur?'3px solid var(--gold)':'3px solid transparent',paddingLeft:isCur?10:0,background:isCur?'var(--gold-soft)':'transparent',transition:'all .15s'}}>
                    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                      <div style={{display:'flex',alignItems:'center',gap:11}}>
                        <span style={{fontSize:16,width:22,textAlign:'center'}}>{isDone?'✅':isCur?'▶':d.icon}</span>
                        <span style={{fontSize:13.5,fontWeight:isCur?700:500,color:isCur?'var(--gold)':isDone?'var(--dim)':'var(--text)'}}><span style={{fontFamily:'var(--mono)',fontSize:11,color:'var(--dim)',marginRight:8}}>D{String(d.day).padStart(2,'0')}</span>{d.theme}</span>
                      </div>
                      {isCur && <Pill c="var(--gold)">HÔM NAY</Pill>}
                      {isDone && <Pill c="var(--green)">XONG</Pill>}
                    </div>
                    {viewDay===d.day && (
                      <div style={{marginTop:11,paddingLeft:33}}>
                        <div style={{display:'flex',flexWrap:'wrap',gap:6,marginBottom:11}}>{d.words.map(w=><span key={w} className="eh-chip">{w}</span>)}</div>
                        {!isDone && <button className="eh-btn amber" style={{fontSize:12,padding:'8px 14px'}} onClick={(e)=>{e.stopPropagation();setInput(d.words.join('\n'));setPage('learn');}}>Học bộ từ này →</button>}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>)}

          {/* LESSON */}
          {page==='lesson' && (<>
            <div className="eh-pagehead"><div className="eh-eyebrow">Bài học</div><h1 className="eh-title">{lesson?`Bài ngày ${lesson.date}`:'Bài học'}</h1></div>
            {!lesson ? (
              <div className="eh-card" style={{textAlign:'center',padding:'40px 20px'}}>
                <div style={{fontSize:30,marginBottom:10}}>📖</div>
                <p style={{color:'var(--dim)',marginBottom:18}}>Chưa có bài học nào. Hãy học 5 từ đầu tiên.</p>
                <button className="eh-btn green" onClick={()=>setPage('learn')}>Bắt đầu học →</button>
              </div>
            ) : (<>
              {sessions.length>1 && (
                <div style={{marginBottom:16}}>
                  <span className="eh-clabel">Chọn bài</span>
                  <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
                    {sessions.slice(-8).reverse().map(s=>(
                      <button key={s.date} className={`eh-btn ${s.date===lesson.date?'amber':''}`} style={{fontSize:12,padding:'7px 12px'}} onClick={()=>pickLesson(s)}>{s.date}</button>
                    ))}
                  </div>
                </div>
              )}
              <span className="eh-clabel">Từ vựng</span>
              {lesson.wordList.map(w=>(
                <div className="eh-card" key={w.id} style={{padding:'14px 18px',marginBottom:10}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
                    <div>
                      <div style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap',marginBottom:4}}>
                        <span style={{fontSize:19,fontWeight:700}}>{w.word}</span>
                        <Pill c="var(--dim)">{w.type}</Pill>
                        {w.mastered && <Pill c="var(--green)">✓ thành thạo</Pill>}
                      </div>
                      {w.ipa && <div style={{fontFamily:'var(--mono)',fontSize:12,color:'var(--dim)',marginBottom:5}}>/{w.ipa}/</div>}
                      <div style={{fontSize:15.5,color:'var(--gold)',fontWeight:500}}>{w.vi}</div>
                      {w.collocations?.length>0 && <div style={{fontFamily:'var(--mono)',fontSize:12,color:'var(--cyan)',marginTop:6}}>{w.collocations.join(' · ')}</div>}
                      {w.example && <div style={{fontSize:13.5,color:'var(--dim)',fontStyle:'italic',marginTop:4,lineHeight:1.5}}>“{w.example}”</div>}
                    </div>
                    <button className="eh-btn" style={{padding:'8px 11px'}} onClick={()=>speak(w.word)}>🔊</button>
                  </div>
                </div>
              ))}
              <div className="eh-card">
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
                  <span className="eh-clabel" style={{margin:0}}>📖 Câu chuyện</span>
                  <div style={{display:'flex',gap:8}}>
                    <button className="eh-btn cyan" style={{padding:'8px 12px',fontSize:12.5}} onClick={()=>speak(lesson.story,0.8)}>🔊 Nghe</button>
                    <button className="eh-btn" style={{padding:'8px 12px',fontSize:12.5}} onClick={()=>{loadPText(lesson.story);setPage('speak');}}>🎙 Luyện đọc</button>
                  </div>
                </div>
                <div style={{fontSize:15,lineHeight:2}}>{lesson.story.split('\n').filter(Boolean).map((l,i)=><p key={i} style={{margin:'0 0 8px'}}>{l}</p>)}</div>
                <button className="eh-btn full" style={{marginTop:4,fontSize:12.5}} onClick={()=>setShowVi(!showVi)}>{showVi?'Ẩn bản dịch':'🇻🇳 Xem bản dịch'}</button>
                {showVi && <div style={{fontSize:14,color:'var(--dim)',lineHeight:1.9,marginTop:12,paddingTop:12,borderTop:'1px solid var(--line-soft)'}}>{lesson.storyVi.split('\n').filter(Boolean).map((l,i)=><p key={i} style={{margin:'0 0 8px'}}>{l}</p>)}</div>}
              </div>

              <div className="eh-card violet">
                <span className="eh-clabel" style={{color:'var(--violet)'}}>✍️ Tự đặt câu</span>
                <p style={{fontSize:12.5,color:'var(--dim)',marginBottom:10,lineHeight:1.5}}>Viết 1 câu cho mỗi từ (mỗi câu một dòng). Tự dùng được từ mới là bước biến từ "nhận ra" thành từ "nói/viết được".</p>
                <textarea className="eh-ta" value={practice} onChange={e=>setPractice(e.target.value)} placeholder={lesson.wordList.map(w=>w.word).join('\n')} />
                <button className="eh-btn violet full" style={{marginTop:12}} disabled={checking||!practice.trim()} onClick={checkPractice}>{checking?'AI đang chữa…':'AI chữa câu →'}</button>
                {feedback && (feedback.length===0
                  ? <p style={{color:'var(--red)',fontSize:13,marginTop:10}}>Không chữa được lúc này. Thử lại sau.</p>
                  : feedback.map((f,i)=>(
                    <div key={i} style={{marginTop:12,paddingTop:12,borderTop:'1px solid var(--line-soft)',fontSize:14,lineHeight:1.6}}>
                      <div style={{color:f.ok?'var(--green)':'var(--red)'}}>{f.ok?'✓':'✗'} {f.sentence}</div>
                      {!f.ok && f.fixed && <div style={{color:'var(--green)'}}>→ {f.fixed}</div>}
                      {f.note && <div style={{color:'var(--dim)',fontSize:12.5}}>{f.note}</div>}
                    </div>
                  )))}
              </div>
            </>)}
          </>)}

          {/* REVIEW */}
          {page==='review' && (<>
            <div className="eh-pagehead"><div className="eh-eyebrow">Ôn tập ngắt quãng</div><h1 className="eh-title">Lật thẻ ghi nhớ</h1></div>
            {done || dueList.length===0 ? (
              <div className="eh-card" style={{textAlign:'center',padding:'44px 20px'}}>
                <div style={{fontSize:40,marginBottom:12}}>🎉</div>
                <div className="eh-ctitle" style={{fontSize:18,marginBottom:8}}>{dueList.length===0 && !done ? 'Không có từ cần ôn':'Ôn tập xong!'}</div>
                <p style={{color:'var(--dim)',marginBottom:20}}>{dueList.length===0 && !done ? 'Tuyệt vời — bạn đã ôn hết. Quay lại học từ mới nhé.':'Hẹn gặp lại ngày mai để củng cố trí nhớ.'}</p>
                <button className="eh-btn green" onClick={()=>setPage('home')}>← Về tổng quan</button>
              </div>
            ) : card && (<>
              <div style={{display:'flex',justifyContent:'space-between',fontFamily:'var(--mono)',fontSize:11,color:'var(--dim)',marginBottom:8}}>
                <span>THẺ {qi+1} / {dueList.length}</span><span>{mastered} ĐÃ THÀNH THẠO</span>
              </div>
              <div className="eh-bar" style={{marginBottom:20}}><i style={{width:`${(qi/dueList.length)*100}%`,background:'var(--gold)'}}/></div>
              <div className="eh-card eh-flash" style={{borderColor:flipped?'rgba(245,185,69,.35)':'var(--line)'}} onClick={()=>{ if(reverse && !flipped) return; if(flipped) setFlip(false); else reveal(); }}>
                {!flipped ? (reverse ? (<>
                  <Pill c="var(--violet)">NHỚ LẠI TỪ TIẾNG ANH</Pill>
                  <div style={{fontSize:22,color:'var(--gold)',fontWeight:600,margin:'12px 0 6px'}}>{card.vi}</div>
                  <Pill c="var(--dim)">{card.type}</Pill>
                  {cloze(card) && <p style={{color:'var(--dim)',fontSize:13.5,fontStyle:'italic',marginTop:12,lineHeight:1.6,maxWidth:520}}>“{cloze(card)}”</p>}
                  <input className="eh-sel" style={{marginTop:14,maxWidth:320,textAlign:'center'}} value={typed} autoFocus onChange={e=>setTyped(e.target.value)} onKeyDown={e=>{ if(e.key==='Enter') reveal(); }} placeholder="Gõ từ tiếng Anh…" aria-label="Từ tiếng Anh" />
                </>) : (<>
                  <div style={{fontSize:30,fontWeight:700,marginBottom:12}}>{card.word}</div>
                  <p style={{color:'var(--dim)',fontSize:13}}>Bạn có nhớ nghĩa từ này không?</p>
                  <p style={{color:'var(--gold)',fontSize:12,marginTop:8}}>Nhấn để lật thẻ ↻</p>
                </>)) : (<>
                  <div style={{fontSize:27,fontWeight:700,marginBottom:6}}>{card.word}</div>
                  {card.ipa && <div style={{fontFamily:'var(--mono)',fontSize:13,color:'var(--dim)',marginBottom:8}}>/{card.ipa}/</div>}
                  <div style={{fontSize:21,color:'var(--gold)',fontWeight:600,marginBottom:6}}>{card.vi}</div>
                  <Pill c="var(--dim)">{card.type}</Pill>
                  {reverse && typed.trim() && (typed.trim().toLowerCase()===card.word.toLowerCase()
                    ? <p style={{color:'var(--green)',fontSize:13,marginTop:10}}>✓ Bạn gõ đúng</p>
                    : <p style={{color:'var(--red)',fontSize:13,marginTop:10}}>✗ Bạn gõ: {typed}</p>)}
                  {card.collocations?.length>0 && <div style={{fontFamily:'var(--mono)',fontSize:12,color:'var(--cyan)',marginTop:10}}>{card.collocations.join(' · ')}</div>}
                  {card.example && <p style={{color:'var(--dim)',fontSize:13.5,fontStyle:'italic',marginTop:6,lineHeight:1.6,maxWidth:520}}>“{card.example}”</p>}
                  <p style={{fontFamily:'var(--mono)',fontSize:10.5,color:'var(--dim)',marginTop:12}}>đã ôn {card.reviewCount} lần · học {card.learnedDate}</p>
                </>)}
              </div>
              {!flipped ? (
                <button className="eh-btn full" onClick={reveal}>{reverse ? 'Kiểm tra →' : '↻ Lật thẻ xem đáp án'}</button>
              ) : (
                <div style={{display:'flex',gap:10}}>
                  <button className="eh-btn red" style={{flex:1,padding:14}} onClick={()=>answer(false)}>Chưa nhớ</button>
                  <button className="eh-btn green" style={{flex:1,padding:14}} onClick={()=>answer(true)}>Đã nhớ!</button>
                </div>
              )}
              <p style={{fontFamily:'var(--mono)',fontSize:10.5,color:'var(--dim)',textAlign:'center',marginTop:14,lineHeight:1.6}}>
                Đã nhớ → {card.reviewCount+1>=GAPS.length ? `thành thạo, kiểm tra lại sau ${RECHECK_DAYS} ngày` : `ôn lại sau ${GAPS[card.reviewCount+1]} ngày`} · Chưa nhớ → ôn lại ngày mai
              </p>
            </>)}
          </>)}

          {/* SPEAK */}
          {page==='speak' && (<>
            <div className="eh-pagehead"><div className="eh-eyebrow">Luyện phát âm</div><h1 className="eh-title">Nghe · Ghi âm · Nhận dạng</h1>
            <p className="eh-sub">Chọn đoạn mẫu hoặc dùng câu chuyện từ bài học. Nghe giọng chuẩn, ghi âm chính mình, rồi để máy nhận dạng và chấm điểm.</p></div>

            <div className="eh-card">
              <span className="eh-clabel">Chọn đoạn luyện</span>
              <div style={{display:'flex',flexDirection:'column',gap:8}}>
                {SAMPLES.map(s=>(
                  <button key={s.id} className="eh-btn" style={{justifyContent:'space-between',textAlign:'left',padding:'11px 14px',borderColor:pText===s.text?'var(--gold)':'var(--line)'}} onClick={()=>loadPText(s.text)}>
                    <span style={{fontWeight:600}}>{s.title}</span><span style={{color:'var(--dim)'}}>›</span>
                  </button>
                ))}
              </div>
            </div>

            {pWords.length>0 && (<>
              <div className="eh-card">
                <span className="eh-clabel">Nội dung đang đọc · nhấn từ để nghe riêng</span>
                <div style={{fontSize:16,lineHeight:2.1}}>
                  {(() => { let last=0; const out=[]; pWords.forEach(w=>{ if(pText.slice(last,w.s).includes('\n'))out.push(<br key={'b'+w.i}/>); out.push(<span key={w.i} id={'ehw'+w.i} className="eh-word" onClick={()=>speakWord(w.w)}>{w.w}</span>); out.push(' '); last=w.e; }); return out; })()}
                </div>
              </div>

              <div className="eh-card">
                <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:12}}>
                  <span style={{fontFamily:'var(--mono)',fontSize:11,color:'var(--dim)',minWidth:54}}>GIỌNG</span>
                  <select className="eh-sel" value={pVoice} onChange={e=>setPVoice(+e.target.value)}>
                    {pVoices.length?pVoices.map((v,i)=><option key={i} value={i}>{v.name}{v.lang==='en-US'?' 🇺🇸':v.lang==='en-GB'?' 🇬🇧':''}</option>):<option>Đang tải…</option>}
                  </select>
                </div>
                <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:14}}>
                  <span style={{fontFamily:'var(--mono)',fontSize:11,color:'var(--dim)',minWidth:54}}>TỐC ĐỘ</span>
                  <input className="eh-range" type="range" min="0.5" max="1.5" step="0.05" value={pRate} onChange={e=>setPRate(+e.target.value)} />
                  <span style={{fontFamily:'var(--mono)',fontSize:13,color:'var(--gold)',fontWeight:700,minWidth:46,textAlign:'right'}}>{pRate.toFixed(2)}×</span>
                </div>
                <div style={{display:'flex',gap:8}}>
                  {!pPlaying ? <button className="eh-btn gold" style={{flex:1}} onClick={playTTS}>▶ Phát</button>
                            : <button className="eh-btn amber" style={{flex:1}} onClick={()=>{speechSynthesis.cancel();setPPlay(false);}}>⏸ Dừng phát</button>}
                  <button className="eh-btn" onClick={stopTTS}>⏹</button>
                </div>
              </div>

              <div className="eh-card cyan">
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
                  <span className="eh-clabel" style={{margin:0,color:'var(--cyan)'}}>🎙 Ghi âm của bạn</span>
                  {recState==='recording' && <span className="eh-pill pulse" style={{background:'var(--red-soft)',color:'var(--red)'}}>● {String(Math.floor(recSecs/60)).padStart(2,'0')}:{String(recSecs%60).padStart(2,'0')}</span>}
                  {recState==='done' && <Pill c="var(--green)">✓ xong</Pill>}
                </div>
                <canvas ref={canvasRef} height="56" className="eh-canvas" />
                <button className={`eh-btn full ${recState==='recording'?'red':'cyan'}`} onClick={toggleRec}>{recState==='recording'?'⏹ Dừng ghi âm':'🎙 Bắt đầu ghi âm'}</button>
                {recState==='done' && recURL && (
                  <div style={{marginTop:14,paddingTop:14,borderTop:'1px solid var(--line-soft)'}}>
                    <audio ref={audioRef} src={recURL} controls style={{width:'100%',marginBottom:10}} />
                    <div style={{display:'flex',gap:8}}>
                      <button className="eh-btn" style={{flex:1,fontSize:12.5}} onClick={()=>{if(audioRef.current)audioRef.current.pause();playTTS();}}>▶ Giọng mẫu</button>
                      <button className="eh-btn" style={{flex:1,fontSize:12.5}} onClick={()=>{stopTTS();if(audioRef.current){audioRef.current.currentTime=0;audioRef.current.play();}}}>▶ Của tôi</button>
                    </div>
                  </div>
                )}
              </div>

              <div className="eh-card violet">
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:6}}>
                  <span className="eh-clabel" style={{margin:0,color:'var(--violet)'}}>👂 Nhận dạng giọng nói → chấm điểm</span>
                  {sttState==='listening' && <span className="eh-pill pulse" style={{background:'var(--violet-soft)',color:'var(--violet)'}}>● đang nghe</span>}
                </div>
                <p style={{fontSize:12,color:'var(--dim)',marginBottom:12}}>Đọc đoạn trên thành tiếng — máy nhận dạng và so khớp với bài gốc.</p>
                <div style={{background:'var(--surface2)',border:'1px solid var(--line)',borderRadius:11,padding:14,minHeight:54,fontSize:15,lineHeight:1.9,marginBottom:12}}>
                  {sttScore ? sttScore.spoken.map((x,i)=><span key={i} className={x.ok?'eh-w-ok':'eh-w-err'}>{x.w}</span>)
                    : sttText || <span style={{color:'var(--dim)',fontSize:14}}>Kết quả hiện ở đây…</span>}
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
                <p style={{fontSize:11,color:'var(--faint)',marginBottom:12,lineHeight:1.5}}>Điểm cho biết máy nghe ra bao nhiêu từ, đúng thứ tự. Chưa chấm ngữ điệu và trọng âm. Hãy so ghi âm với giọng mẫu để tự kiểm tra.</p>
                <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:12}}>
                  <span style={{fontFamily:'var(--mono)',fontSize:11,color:'var(--dim)'}}>GIỌNG</span>
                  <select className="eh-sel" value={sttLang} onChange={e=>setSttLang(e.target.value)} style={{fontSize:13}}>
                    <option value="en-US">🇺🇸 Anh-Mỹ</option><option value="en-GB">🇬🇧 Anh-Anh</option><option value="en-AU">🇦🇺 Anh-Úc</option>
                  </select>
                </div>
                <button className={`eh-btn full ${sttState==='listening'?'red':'violet'}`} onClick={toggleStt}>{sttState==='listening'?'⏹ Dừng nhận dạng':'👂 Bắt đầu nhận dạng'}</button>
              </div>
            </>)}

            {pWords.length===0 && (
              <div className="eh-card" style={{textAlign:'center',padding:'30px 20px',color:'var(--dim)'}}>
                <div style={{fontSize:28,marginBottom:8}}>🎧</div>
                <p>Chọn một đoạn luyện ở trên để bắt đầu.</p>
              </div>
            )}
            <p style={{fontFamily:'var(--mono)',fontSize:10.5,color:'var(--dim)',textAlign:'center',marginTop:8,lineHeight:1.7}}>Ghi âm &amp; nhận dạng cần Google Chrome và quyền micro.</p>
          </>)}

          {/* BANK */}
          {page==='bank' && (<>
            <div className="eh-pagehead"><div className="eh-eyebrow">Kho từ vựng</div><h1 className="eh-title">{bank.length} từ đã học</h1>
            <p className="eh-sub" style={{fontFamily:'var(--mono)',fontSize:12}}>{mastered} thành thạo · {due.length} cần ôn · {bank.filter(w=>!w.mastered&&!isDue(w)).length} đang củng cố</p></div>
            {bank.length===0 ? (
              <div className="eh-card" style={{textAlign:'center',padding:'40px 20px'}}>
                <div style={{fontSize:30,marginBottom:10}}>▦</div>
                <p style={{color:'var(--dim)',marginBottom:18}}>Kho từ trống. Bắt đầu học để lưu từ vựng.</p>
                <button className="eh-btn green" onClick={()=>setPage('learn')}>Học ngay →</button>
              </div>
            ) : (<>
              <div className="eh-card">
                {bank.slice().reverse().map((w,i)=>(
                  <div key={w.id} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'11px 0',borderBottom:i<bank.length-1?'1px solid var(--line-soft)':'none'}}>
                    <div>
                      <div style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap'}}>
                        <span style={{fontSize:15,fontWeight:600}}>{w.word}</span>
                        {w.mastered && <Pill c="var(--green)">✓</Pill>}
                        {isDue(w) && <Pill c="var(--gold)">cần ôn</Pill>}
                      </div>
                      <div style={{fontSize:13,color:'var(--gold)',marginTop:2}}>{w.vi}</div>
                      <div style={{fontFamily:'var(--mono)',fontSize:10.5,color:'var(--dim)',marginTop:2}}>ôn {w.reviewCount}× · tiếp {w.nextReview}</div>
                    </div>
                    <button className="eh-btn" style={{padding:'8px 11px'}} onClick={()=>speak(w.word)}>🔊</button>
                  </div>
                ))}
              </div>
              <button className="eh-btn full" style={{fontSize:12,color:'var(--dim)'}} onClick={clearAll}>Xoá toàn bộ dữ liệu</button>
            </>)}
          </>)}

        </main>
      </div>

      {/* ─── BOTTOM NAV (mobile) ─── */}
      <nav className="eh-bottomnav">
        {BOTTOM.map(it=>(
          <button key={it.id} className={`eh-bn ${page===it.id?'on':''}`} onClick={()=>go(it.id)}>
            {it.badge>0 && <span className="dot">{it.badge}</span>}
            <span className="ic">{it.ic}</span>{it.label}
          </button>
        ))}
      </nav>
    </div>
  );
}
