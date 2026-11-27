import { useState } from "react";
import { scoreReading, quizFor, totalScore } from "../../lib/learning";
import { speak, askAI, useStt } from "../../lib/browser";
import { tone } from "../../lib/format";
import PageHeader from "../../components/ui/PageHeader";
import WordDiff from "../../components/ui/WordDiff";
import Icon from "../../components/ui/Icon";
import { MicBox } from "../../components/ui/MicButton";
import TestResult from "./TestResult";
import "./tests.css";

const clamp = (x, max) => Math.max(0, Math.min(max, Number(x) || 0));
const TITLES = ['Nghe – chép', 'Phản xạ', 'Kết quả'];

export default function DailyQuiz({ day, level, onSave, onClose }) {
  const { lines, qs } = quizFor(day);
  const stt = useStt();
  const [step, setStep] = useState(0);          // 0 nghe – chép · 1 phản xạ · 2 kết quả
  const [typed, setTyped] = useState(['', '', '']);
  const [dict, setDict] = useState(null);       // kết quả chấm từng câu
  const [qi, setQi] = useState(0);
  const [answers, setAnswers] = useState(['', '']);
  const [shown, setShown] = useState([false, false]);
  const [busy, setBusy] = useState(false);
  const [reflexFb, setReflexFb] = useState(null);
  const [parts, setParts] = useState(null);

  const dictPct = dict ? Math.round(dict.reduce((s, r) => s + r.pct, 0) / dict.length) : null;

  function finish(reflex) {
    const p = { dict: dictPct, reflex };
    setParts(p); setStep(2); onSave({ ...p, total: totalScore(p) });
  }
  async function gradeReflex() {
    setBusy(true);
    try {
      const r = await askAI(`A Vietnamese IT learner (target level ${level}) answered spoken questions. Answers come from speech recognition (no punctuation; ignore recognition errors).
${qs.map((q, i) => `Q${i + 1}: ${q}\nA${i + 1}: ${answers[i] || '(no answer)'}`).join('\n')}

For each answer give a score 0-10 for answering the question relevantly in understandable English at that level (0 if no answer). Return ONLY valid JSON:
{"items":[{"score":0,"better":"a natural short model answer","note":"short feedback in Vietnamese"}]}`);
      const items = qs.map((_, i) => ({ score: clamp(r.items?.[i]?.score, 10), better: r.items?.[i]?.better || '', note: r.items?.[i]?.note || '' }));
      setReflexFb(items);
      finish(Math.round(items.reduce((s, x) => s + x.score, 0) / items.length * 10));
    } catch { alert('AI không chấm được lúc này (kiểm tra API key/kết nối). Phần phản xạ sẽ được bỏ qua.'); finish(null); }
    setBusy(false);
  }

  return (<>
    <PageHeader kicker={`Kiểm tra cuối ngày · ngày ${day}`} title={step < 2 ? <>{step + 1}/2 <em>· {TITLES[step]}</em></> : TITLES[2]}>
      {step === 0 ? 'Nghe từng câu và gõ lại đúng những gì nghe được. Có thể nghe chậm.' : step === 1 ? 'Nghe câu hỏi (cố gắng không nhìn chữ) rồi trả lời to bằng tiếng Anh, 1–3 câu.' : null}
    </PageHeader>
    <div className="steps-bar" style={{ marginTop: -20, marginBottom: 32 }}>{TITLES.map((t, i) => <span key={t} className={i <= step ? 'on' : ''} />)}</div>

    {step === 0 && (<>
      {lines.map((l, i) => (
        <div key={i} className="card">
          <div className="q-head">
            <span className="q-num">Câu {i + 1}</span>
            <button className="btn btn-sm" onClick={() => speak(l, 0.85)}><Icon name="volume" size={16} /> Nghe</button>
            <button className="btn btn-sm btn-ghost" onClick={() => speak(l, 0.6)}>Chậm</button>
          </div>
          <input className="field" value={typed[i]} disabled={!!dict} onChange={(e) => setTyped(typed.map((t, k) => (k === i ? e.target.value : t)))} placeholder="Gõ câu bạn nghe được…" aria-label={`Câu ${i + 1}`} />
          {dict && (
            <div className="answer-key">
              <WordDiff words={dict[i].spoken} />
              <div><span className="ok">{l}</span> <b className={`num ${tone(dict[i].pct)}`}>· {dict[i].pct}%</b></div>
            </div>
          )}
        </div>
      ))}
      {!dict
        ? <button className="btn btn-primary btn-lg btn-block mt" onClick={() => setDict(lines.map((l, i) => scoreReading(l, typed[i])))}>Chấm phần nghe – chép</button>
        : <button className="btn btn-primary btn-lg btn-block mt" onClick={() => setStep(1)}>Nghe – chép: {dictPct}% · Tiếp <Icon name="arrow" size={16} /></button>}
    </>)}

    {step === 1 && (<>
      <div className="card">
        <div className="q-head">
          <span className="q-num">Câu hỏi {qi + 1}/{qs.length}</span>
          <button className="btn btn-sm" onClick={() => speak(qs[qi], 0.85)}><Icon name="volume" size={16} /> Nghe câu hỏi</button>
          <button className="btn btn-sm btn-ghost" onClick={() => setShown(shown.map((v, k) => k === qi || v))}>Hiện chữ</button>
        </div>
        {shown[qi] && <p className="q-text">{qs[qi]}</p>}
        <MicBox stt={stt} onDone={(t) => { const i = qi; setAnswers((a) => a.map((x, k) => (k === i ? t : x))); }} />
        {answers[qi] && !stt.listening && <p className="small muted" style={{ marginTop: 8 }}>Đã ghi câu trả lời. Có thể trả lời lại nếu muốn.</p>}
      </div>
      <div className="actions">
        <button className="btn btn-lg" disabled={busy} onClick={() => { stt.reset(); finish(null); }}>Bỏ qua phần này</button>
        {qi < qs.length - 1
          ? <button className="btn btn-primary btn-lg" disabled={stt.listening} onClick={() => { stt.reset(); setQi(qi + 1); }}>Câu tiếp <Icon name="arrow" size={16} /></button>
          : <button className="btn btn-primary btn-lg" disabled={stt.listening || busy || !answers.some(Boolean)} onClick={gradeReflex}>{busy ? 'AI đang chấm…' : 'AI chấm & xem kết quả'}</button>}
      </div>
    </>)}

    {step === 2 && parts && <TestResult parts={parts} onClose={onClose} extra={reflexFb && (
      <div className="section">
        <div className="section-head"><h2 className="section-title">Nhận xét phần phản xạ</h2></div>
        <div className="divided">
          {qs.map((q, i) => (
            <div key={i} style={{ padding: '12px 0', display: 'grid', gap: 4 }}>
              <div className="row between nowrap"><b>{q}</b><span className={`num ${tone(reflexFb[i].score * 10)}`} style={{ fontWeight: 600 }}>{reflexFb[i].score}/10</span></div>
              <div className="small muted">Bạn: {answers[i] || '(không trả lời)'}</div>
              {reflexFb[i].note && <div className="small">{reflexFb[i].note}</div>}
              {reflexFb[i].better && <div className="row nowrap"><span className="ok grow">→ {reflexFb[i].better}</span><button className="btn btn-sm btn-icon btn-ghost" onClick={() => speak(reflexFb[i].better)} aria-label="Nghe"><Icon name="volume" size={16} /></button></div>}
            </div>
          ))}
        </div>
      </div>
    )} />}

    {step < 2 && <button className="btn btn-sm btn-ghost quit" onClick={() => { stt.reset(); window.speechSynthesis?.cancel(); onClose(); }}>Thoát (không lưu)</button>}
  </>);
}
