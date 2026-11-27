import { useState, useRef, useEffect } from "react";
import { scoreReading, mcqScore, totalScore, validListening, PASS } from "../../lib/learning";
import { speak, speakLines, askAI, useStt } from "../../lib/browser";
import { tone, mmss } from "../../lib/format";
import PageHeader from "../../components/ui/PageHeader";
import WordDiff from "../../components/ui/WordDiff";
import Icon from "../../components/ui/Icon";
import MicButton, { MicBox } from "../../components/ui/MicButton";
import TestResult from "./TestResult";
import "./tests.css";

const MAX_PLAYS = 2;
const SPEAK_SECS = 120;
const clamp = (x, max) => Math.max(0, Math.min(max, Number(x) || 0));
const STEP_TITLES = ['Bài đánh giá giai đoạn', 'Nghe hiểu', 'Shadowing', 'Nói 2 phút', 'Nhớ cụm từ', 'Kết quả'];

export default function PhaseTest({ test, onSave, onClose }) {
  const stt = useStt();
  const [step, setStep] = useState(0);          // 0 giới thiệu · 1 nghe hiểu · 2 shadowing · 3 nói · 4 nhớ cụm từ · 5 kết quả
  const [loading, setLoading] = useState(false);
  const [listen, setListen] = useState(null);   // { lines, questions, ai }
  const [plays, setPlays] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [picks, setPicks] = useState([]);
  const [listenPct, setListenPct] = useState(null);
  const [shadow, setShadow] = useState(null);
  const [secs, setSecs] = useState(0);
  const [speech, setSpeech] = useState('');
  const [speakFb, setSpeakFb] = useState(null);
  const [speakPct, setSpeakPct] = useState(null);
  const [busy, setBusy] = useState(false);
  const [ri, setRi] = useState(0);
  const [recall, setRecall] = useState(test.recall.map(() => null)); // % từng cụm
  const [parts, setParts] = useState(null);
  const timer = useRef(null);
  const secsRef = useRef(0);

  useEffect(() => () => clearInterval(timer.current), []);

  async function begin() {
    setLoading(true);
    let data = null;
    try {
      const r = await askAI(`Create a short English listening test for a Vietnamese IT professional. Level: CEFR ${test.level}. Topics: ${test.topics}.
Return ONLY valid JSON:
{"lines":[{"speaker":"A","text":"..."}],"questions":[{"q":"...","options":["...","...","...","..."],"answer":0}]}
The dialogue has 10-14 lines between 2 colleagues or a developer and a client, natural spoken English at ${test.level} level. Write exactly 5 multiple-choice questions about the main ideas and key details, 4 options each; "answer" is the 0-based index of the correct option. Vary the position of the correct answer.`);
      if (validListening(r)) data = { lines: r.lines, questions: r.questions.slice(0, 5), ai: true };
    } catch { /* không có AI: dùng bài dự phòng */ }
    setListen(data || { ...test.fallback, ai: false });
    setPicks([]); setPlays(0); setLoading(false); setStep(1);
  }
  function play() {
    setPlays((p) => p + 1); setPlaying(true);
    speakLines(listen.lines, 0.85, () => setPlaying(false));
  }
  function startSpeaking() {
    setSpeech(''); setSecs(0); secsRef.current = 0;
    stt.start((t) => { clearInterval(timer.current); setSpeech(t); });
    timer.current = setInterval(() => { secsRef.current += 1; setSecs(secsRef.current); if (secsRef.current >= SPEAK_SECS) stt.stop(); }, 1000);
  }
  async function gradeSpeaking() {
    setBusy(true);
    let pct = null;
    try {
      const r = await askAI(`Assess a Vietnamese IT professional's spoken answer. Target level for this phase: CEFR ${test.level}.
Task: ${test.prompt}
Speech-to-text transcript (no punctuation; do not penalise obvious recognition errors; pronunciation cannot be judged):
${speech}
Speaking time: ${secsRef.current} seconds, words recognised: ${speech.split(/\s+/).filter(Boolean).length}.

Score each criterion 1-5 against the target level (3 = meets the target). Return ONLY valid JSON:
{"fluency":3,"vocabulary":3,"grammar":3,"task":3,"level":"estimated CEFR level, e.g. A2","feedback":"2-3 sentences in Vietnamese: strengths and the most important thing to improve"}`);
      const fb = { fluency: clamp(r.fluency, 5), vocabulary: clamp(r.vocabulary, 5), grammar: clamp(r.grammar, 5), task: clamp(r.task, 5), level: String(r.level || ''), feedback: String(r.feedback || '') };
      setSpeakFb(fb);
      pct = Math.round((fb.fluency + fb.vocabulary + fb.grammar + fb.task) / 20 * 100);
    } catch { alert('AI không chấm được phần nói lúc này. Phần này sẽ được bỏ qua.'); }
    setBusy(false);
    return pct;
  }
  function finish() {
    const p = { listening: listenPct, shadowing: shadow?.pct ?? null, speaking: speakPct, recall: Math.round(recall.reduce((s, x) => s + (x || 0), 0) / recall.length) };
    setParts(p); setStep(5); onSave({ parts: p, total: totalScore(p), level: speakFb?.level || '' });
  }
  const quit = () => { stt.reset(); clearInterval(timer.current); window.speechSynthesis?.cancel(); onClose(); };

  return (<>
    <PageHeader kicker={`Đánh giá giai đoạn ${test.n} · mục tiêu ${test.level}`}
      title={step >= 1 && step <= 4 ? <>{step}/4 <em>· {STEP_TITLES[step]}</em></> : STEP_TITLES[step]} />
    {step >= 1 && step <= 4 && <div className="steps-bar" style={{ marginTop: -24, marginBottom: 32 }}>{[1, 2, 3, 4].map((i) => <span key={i} className={i <= step ? 'on' : ''} />)}</div>}

    {step === 0 && (
      <div className="card">
        <p className="dim">Khoảng 15 phút, gồm 4 phần:</p>
        <ol className="steps" style={{ margin: '8px 0 12px' }}>
          <li><span><b>Nghe hiểu</b> — nghe một đoạn hội thoại (tối đa {MAX_PLAYS} lần), trả lời 5 câu trắc nghiệm.</span></li>
          <li><span><b>Shadowing</b> — nghe mẫu rồi đọc to một đoạn, máy chấm % từ đọc đúng.</span></li>
          <li><span><b>Nói 2 phút</b> — trả lời một đề nói, AI chấm trôi chảy / từ vựng / ngữ pháp / truyền đạt.</span></li>
          <li><span><b>Nhớ cụm từ</b> — nhìn câu tiếng Việt, nói ra câu tiếng Anh.</span></li>
        </ol>
        <p className="small muted">Cần Google Chrome và micro. Đạt khi điểm tổng từ {PASS}%. Bài nghe và phần chấm nói dùng AI; nếu không có AI, app dùng bài nghe soạn sẵn và bỏ qua phần chấm nói.</p>
        <button className="btn btn-primary btn-lg btn-block mt" disabled={loading} onClick={begin}>{loading ? 'Đang tạo bài nghe…' : <>Bắt đầu <Icon name="arrow" size={16} /></>}</button>
      </div>
    )}

    {step === 1 && listen && (<>
      <div className="card">
        <p className="small muted" style={{ marginBottom: 12 }}>Nghe hội thoại (không có chữ), rồi trả lời câu hỏi. {listen.ai ? 'Bài do AI tạo.' : 'Bài soạn sẵn.'}</p>
        <button className="btn btn-primary btn-block" disabled={playing || plays >= MAX_PLAYS || listenPct != null} onClick={play}>
          {playing ? <><span className="live-dot pulse" /> Đang phát…</> : <><Icon name="play" size={14} /> Nghe (còn {MAX_PLAYS - plays} lần)</>}
        </button>
      </div>
      {listen.questions.map((q, i) => (
        <div key={i} className="card">
          <div className="h3" style={{ marginBottom: 8 }}>{i + 1}. {q.q}</div>
          {q.options.map((o, k) => {
            const done = listenPct != null; const right = k === q.answer; const mine = picks[i] === k;
            return (
              <label key={k} className={`option ${done ? 'disabled' : ''} ${done && right ? 'right' : done && mine ? 'wrong' : ''}`}>
                <input type="radio" name={`q${i}`} checked={mine} disabled={done} onChange={() => setPicks((p) => { const n = [...p]; n[i] = k; return n; })} />
                <span className="grow">{o}</span>{done && right && <Icon name="check" size={16} />}
              </label>
            );
          })}
        </div>
      ))}
      {listenPct == null
        ? <button className="btn btn-primary btn-lg btn-block mt" disabled={plays === 0 || playing} onClick={() => { window.speechSynthesis?.cancel(); setListenPct(mcqScore(listen.questions, picks)); }}>{plays === 0 ? 'Hãy nghe ít nhất 1 lần' : 'Nộp bài nghe'}</button>
        : (<>
          <div className="card">
            <div className="row between" style={{ marginBottom: 10 }}><span className="label">Lời thoại</span><span className={`num ${tone(listenPct)}`} style={{ fontWeight: 600 }}>Nghe hiểu: {listenPct}%</span></div>
            {listen.lines.map((l, i) => <p key={i} style={{ marginTop: 4 }}><b className="muted">{l.speaker}:</b> {l.text}</p>)}
          </div>
          <button className="btn btn-primary btn-lg btn-block mt" onClick={() => setStep(2)}>Tiếp <Icon name="arrow" size={16} /></button>
        </>)}
    </>)}

    {step === 2 && (<>
      <div className="card">
        <div className="q-head">
          <span className="q-num">Đọc to đoạn này</span>
          <button className="btn btn-sm" onClick={() => speak(test.shadow, 0.85)}><Icon name="volume" size={16} /> Nghe mẫu</button>
        </div>
        <div className="serif" style={{ fontSize: 19, lineHeight: 1.75 }}>{test.shadow.split('\n').map((l, i) => <p key={i}>{l}</p>)}</div>
        {shadow
          ? <div className="answer-key"><WordDiff words={shadow.spoken} /><p className={`num ${tone(shadow.pct)}`} style={{ fontWeight: 600 }}>Đọc đúng {shadow.correct}/{shadow.total} từ · {shadow.pct}%</p></div>
          : <MicBox stt={stt} label="Bắt đầu đọc" onDone={(t) => { if (t) setShadow(scoreReading(test.shadow, t)); }} />}
      </div>
      <button className="btn btn-primary btn-lg btn-block mt" disabled={stt.listening} onClick={() => { stt.reset(); setStep(3); }}>{shadow ? 'Tiếp' : 'Bỏ qua phần này'} <Icon name="arrow" size={16} /></button>
    </>)}

    {step === 3 && (<>
      <div className="note">
        <div className="label" style={{ marginBottom: 6 }}>Đề nói · khoảng 2 phút</div>
        <p className="q-text">{test.prompt}</p>
      </div>
      <div className="card">
        <div className="row between">
          <span className="label">Bài nói của bạn</span>
          <span className={`timer ${secs >= 90 ? 'ok' : 'muted'}`}>{mmss(secs)} / 02:00</span>
        </div>
        <div className="transcript" style={{ margin: '12px 0', minHeight: 80 }}>
          {(stt.listening ? stt.text : speech) || <span className="placeholder">Lời bạn nói hiện ở đây…</span>}
        </div>
        <MicButton listening={stt.listening} disabled={busy} onClick={() => (stt.listening ? stt.stop() : startSpeaking())}>{speech ? 'Nói lại' : 'Bắt đầu nói'}</MicButton>
      </div>
      <div className="actions">
        <button className="btn btn-lg" disabled={stt.listening || busy} onClick={() => { setSpeakFb(null); setSpeakPct(null); setStep(4); }}>Bỏ qua</button>
        <button className="btn btn-primary btn-lg" disabled={stt.listening || busy || !speech} onClick={async () => { setSpeakPct(await gradeSpeaking()); setStep(4); }}>{busy ? 'AI đang chấm…' : 'Chấm & tiếp'}</button>
      </div>
    </>)}

    {step === 4 && (<>
      <div className="card">
        <div className="small muted">Câu {ri + 1}/{test.recall.length} · nói câu này bằng tiếng Anh</div>
        <p className="q-text" style={{ color: 'var(--accent)' }}>{test.recall[ri].vi}</p>
        {recall[ri] == null
          ? <MicBox stt={stt} label="Nói" onDone={(t) => { const i = ri; setRecall((r) => r.map((x, k) => (k === i ? scoreReading(test.recall[i].en, t).pct : x))); }} />
          : <div className="answer-key">
              <div className="muted">Bạn: {stt.final || '(không nhận được)'}</div>
              <div><span className="ok">{test.recall[ri].en}</span> <b className={`num ${tone(recall[ri])}`}>· {recall[ri]}%</b></div>
            </div>}
      </div>
      <button className="btn btn-primary btn-lg btn-block mt" disabled={stt.listening} onClick={() => {
        stt.reset();
        if (ri < test.recall.length - 1) setRi(ri + 1); else finish();
      }}>{recall[ri] == null ? 'Bỏ qua câu này' : ri < test.recall.length - 1 ? 'Câu tiếp' : 'Xem kết quả'} <Icon name="arrow" size={16} /></button>
    </>)}

    {step === 5 && parts && <TestResult parts={parts} onClose={onClose} extra={speakFb && (
      <div className="section">
        <div className="section-head"><h2 className="section-title">Nhận xét bài nói</h2>{speakFb.level && <span className="section-meta">ước lượng {speakFb.level}</span>}</div>
        <div className="divided">
          {[['Trôi chảy', 'fluency'], ['Từ vựng', 'vocabulary'], ['Ngữ pháp', 'grammar'], ['Truyền đạt ý', 'task']].map(([l, k]) => (
            <div key={k} className="row between" style={{ padding: '8px 0' }}><span>{l}</span><span className="num" style={{ fontWeight: 600 }}>{speakFb[k]}/5</span></div>
          ))}
        </div>
        <p className="dim mt">{speakFb.feedback}</p>
      </div>
    )} />}

    {step < 5 && <button className="btn btn-sm btn-ghost quit" onClick={quit}>Thoát (không lưu)</button>}
  </>);
}
