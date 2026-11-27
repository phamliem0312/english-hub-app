// Kiểm tra cuối ngày và bài đánh giá cuối giai đoạn.
import { useState, useRef, useEffect } from "react";
import { scoreReading, quizFor, mcqScore, totalScore, weakParts, validListening, PASS, PART_NAMES } from "./learning";
import { speak, speakLines, askAI, useStt } from "./browser";

const ADVICE = {
  dict: 'Nghe lại từng câu ở tốc độ chậm, chép ra giấy rồi so với phụ đề.',
  reflex: 'Luyện trả lời to các câu hỏi của tuần, mỗi câu 2–3 câu trả lời ngắn, không dịch từng từ.',
  listening: 'Nghe các bài British Council/BBC cùng cấp độ theo đủ 4 bước, nhất là bước 4: tự kể lại.',
  shadowing: 'Tăng thời gian shadowing: giảm tốc độ còn 0.7×, nhại theo từng câu rồi mới đọc cả đoạn.',
  speaking: 'Ghi âm đề nói mỗi ngày 2–3 phút, dùng phiên bản AI sửa để shadowing lại.',
  recall: 'Ôn kho cụm từ hằng ngày: nhìn nghĩa, nói to cụm tiếng Anh và tự đặt câu.',
};
const clamp = (x, max) => Math.max(0, Math.min(max, Number(x) || 0));
const color = (p) => p >= 80 ? 'var(--green)' : p >= 50 ? 'var(--gold)' : 'var(--red)';

const Score = ({ label, pct }) => (
  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'9px 0',borderTop:'1px solid var(--line-soft)'}}>
    <span style={{fontSize:14}}>{label}</span>
    <span style={{fontFamily:'var(--mono)',fontWeight:700,color:pct==null?'var(--dim)':color(pct)}}>{pct==null?'bỏ qua':`${pct}%`}</span>
  </div>
);

function MicBox({ stt, onDone, label = '🎙 Trả lời bằng giọng nói' }) {
  return (<>
    <div style={{background:'var(--surface2)',border:'1px solid var(--line)',borderRadius:11,padding:12,minHeight:48,fontSize:14.5,lineHeight:1.7,margin:'10px 0'}}>
      {stt.text || <span style={{color:'var(--dim)'}}>{stt.listening ? 'Đang nghe…' : 'Lời bạn nói hiện ở đây…'}</span>}
    </div>
    <button className={`eh-btn full ${stt.listening?'red':'violet'}`} onClick={()=>stt.listening ? stt.stop() : stt.start(onDone)}>
      {stt.listening ? <><span className="pulse">●</span> Dừng</> : label}
    </button>
  </>);
}

function Result({ parts, onClose, extra }) {
  const total = totalScore(parts);
  const weak = weakParts(parts);
  return (<>
    <div className="eh-card" style={{textAlign:'center'}}>
      <div style={{fontSize:40,marginBottom:6}}>{total==null ? '—' : total>=PASS ? '🎉' : '💪'}</div>
      <div style={{fontFamily:'var(--mono)',fontSize:34,fontWeight:700,color:total==null?'var(--dim)':color(total)}}>{total==null?'—':`${total}%`}</div>
      <p className="eh-p" style={{marginTop:6}}>{total==null ? 'Chưa có phần nào được chấm.' : total>=PASS ? `Đạt (từ ${PASS}%).` : `Chưa đạt ${PASS}%. Ôn thêm các phần dưới đây rồi làm lại.`}</p>
    </div>
    <div className="eh-card">
      <span className="eh-clabel">Chi tiết</span>
      {Object.entries(parts).map(([k,v])=><Score key={k} label={PART_NAMES[k]} pct={v} />)}
    </div>
    {weak.length>0 && (
      <div className="eh-card accent">
        <span className="eh-clabel" style={{color:'var(--gold)'}}>Nên ôn lại</span>
        <ul className="eh-list">{weak.map(k=><li key={k}><b style={{color:'var(--text)'}}>{PART_NAMES[k]}:</b> {ADVICE[k]}</li>)}</ul>
      </div>
    )}
    {extra}
    <button className="eh-btn gold full" onClick={onClose}>Xong</button>
  </>);
}

// ═══ Kiểm tra cuối ngày ═══════════════════════════════════════════════════════
export function DailyQuiz({ day, level, onSave, onClose }) {
  const { lines, qs } = quizFor(day);
  const stt = useStt();
  const [step, setStep] = useState(0);          // 0 nghe – chép · 1 phản xạ · 2 kết quả
  const [typed, setTyped] = useState(['','','']);
  const [dict, setDict] = useState(null);       // kết quả chấm từng câu
  const [qi, setQi] = useState(0);
  const [answers, setAnswers] = useState(['','']);
  const [shown, setShown] = useState([false,false]);
  const [busy, setBusy] = useState(false);
  const [reflexFb, setReflexFb] = useState(null);
  const [parts, setParts] = useState(null);

  const dictPct = dict ? Math.round(dict.reduce((s,r)=>s+r.pct,0)/dict.length) : null;

  function finish(reflex) {
    const p = { dict: dictPct, reflex };
    setParts(p); setStep(2); onSave({ ...p, total: totalScore(p) });
  }
  async function gradeReflex() {
    setBusy(true);
    try {
      const r = await askAI(`A Vietnamese IT learner (target level ${level}) answered spoken questions. Answers come from speech recognition (no punctuation; ignore recognition errors).
${qs.map((q,i)=>`Q${i+1}: ${q}\nA${i+1}: ${answers[i]||'(no answer)'}`).join('\n')}

For each answer give a score 0-10 for answering the question relevantly in understandable English at that level (0 if no answer). Return ONLY valid JSON:
{"items":[{"score":0,"better":"a natural short model answer","note":"short feedback in Vietnamese"}]}`);
      const items = qs.map((_,i)=>({ score: clamp(r.items?.[i]?.score, 10), better: r.items?.[i]?.better || '', note: r.items?.[i]?.note || '' }));
      setReflexFb(items);
      finish(Math.round(items.reduce((s,x)=>s+x.score,0)/items.length*10));
    } catch { alert('AI không chấm được lúc này (kiểm tra API key/kết nối). Phần phản xạ sẽ được bỏ qua.'); finish(null); }
    setBusy(false);
  }

  return (<>
    <div className="eh-pagehead">
      <div className="eh-eyebrow">Kiểm tra cuối ngày · Ngày {day}</div>
      <h1 className="eh-title">{['1/2 · Nghe – chép','2/2 · Phản xạ','Kết quả'][step]}</h1>
      <p className="eh-sub">{step===0 ? 'Nghe từng câu và gõ lại đúng những gì nghe được. Có thể nghe chậm.' : step===1 ? 'Nghe câu hỏi (cố gắng không nhìn chữ) rồi trả lời to bằng tiếng Anh, 1–3 câu.' : ''}</p>
    </div>

    {step===0 && (<>
      {lines.map((l,i)=>(
        <div key={i} className="eh-card">
          <div style={{display:'flex',gap:8,marginBottom:10}}>
            <span className="eh-clabel" style={{margin:'0 auto 0 0',alignSelf:'center'}}>Câu {i+1}</span>
            <button className="eh-btn sm cyan" onClick={()=>speak(l,0.85)}>🔊 Nghe</button>
            <button className="eh-btn sm" onClick={()=>speak(l,0.6)}>🐢 Chậm</button>
          </div>
          <input className="eh-sel" value={typed[i]} disabled={!!dict} onChange={e=>setTyped(typed.map((t,k)=>k===i?e.target.value:t))} placeholder="Gõ câu bạn nghe được…" aria-label={`Câu ${i+1}`} />
          {dict && (
            <div style={{marginTop:10,fontSize:14,lineHeight:1.8}}>
              <div>{dict[i].spoken.length ? dict[i].spoken.map((x,k)=><span key={k} className={x.ok?'eh-w-ok':'eh-w-err'}>{x.w}</span>) : <span style={{color:'var(--dim)'}}>(bỏ trống)</span>}</div>
              <div style={{color:'var(--green)'}}>✓ {l} <b style={{fontFamily:'var(--mono)',color:color(dict[i].pct)}}>· {dict[i].pct}%</b></div>
            </div>
          )}
        </div>
      ))}
      {!dict ? <button className="eh-btn gold full" onClick={()=>setDict(lines.map((l,i)=>scoreReading(l, typed[i])))}>Chấm phần nghe – chép</button>
             : <button className="eh-btn gold full" onClick={()=>setStep(1)}>Nghe – chép: {dictPct}% · Tiếp →</button>}
    </>)}

    {step===1 && (<>
      <div className="eh-card violet">
        <div style={{display:'flex',gap:8,marginBottom:6,alignItems:'center'}}>
          <span className="eh-clabel" style={{margin:'0 auto 0 0'}}>Câu hỏi {qi+1}/{qs.length}</span>
          <button className="eh-btn sm cyan" onClick={()=>speak(qs[qi],0.85)}>🔊 Nghe câu hỏi</button>
          <button className="eh-btn sm" onClick={()=>setShown(shown.map((v,k)=>k===qi||v))}>Hiện chữ</button>
        </div>
        {shown[qi] && <p style={{fontSize:16,margin:'6px 0'}}>{qs[qi]}</p>}
        <MicBox stt={stt} onDone={(t)=>{ const i=qi; setAnswers(a=>a.map((x,k)=>k===i?t:x)); }} />
        {answers[qi] && !stt.listening && <p className="eh-p" style={{marginTop:8}}>Đã ghi câu trả lời. Có thể trả lời lại nếu muốn.</p>}
      </div>
      <div style={{display:'flex',gap:8}}>
        <button className="eh-btn" style={{flex:1}} disabled={busy} onClick={()=>{ stt.reset(); finish(null); }}>Bỏ qua phần này</button>
        {qi<qs.length-1
          ? <button className="eh-btn gold" style={{flex:2}} disabled={stt.listening} onClick={()=>{ stt.reset(); setQi(qi+1); }}>Câu tiếp →</button>
          : <button className="eh-btn gold" style={{flex:2}} disabled={stt.listening||busy||!answers.some(Boolean)} onClick={gradeReflex}>{busy?'AI đang chấm…':'🤖 AI chấm & xem kết quả'}</button>}
      </div>
    </>)}

    {step===2 && parts && <Result parts={parts} onClose={onClose} extra={reflexFb && (
      <div className="eh-card">
        <span className="eh-clabel">Nhận xét phần phản xạ</span>
        {qs.map((q,i)=>(
          <div key={i} style={{padding:'8px 0',borderTop:i?'1px solid var(--line-soft)':'none',fontSize:13.5,lineHeight:1.6}}>
            <div style={{fontWeight:600}}>{q} <span style={{fontFamily:'var(--mono)',color:color(reflexFb[i].score*10)}}>{reflexFb[i].score}/10</span></div>
            <div style={{color:'var(--dim)'}}>Bạn: {answers[i] || '(không trả lời)'}</div>
            {reflexFb[i].note && <div>{reflexFb[i].note}</div>}
            {reflexFb[i].better && <div style={{color:'var(--green)'}}>→ {reflexFb[i].better} <button className="eh-btn sm" style={{padding:'2px 8px'}} onClick={()=>speak(reflexFb[i].better)}>🔊</button></div>}
          </div>
        ))}
      </div>
    )} />}

    {step<2 && <button className="eh-btn full sm" style={{marginTop:12,color:'var(--dim)'}} onClick={()=>{ stt.reset(); window.speechSynthesis?.cancel(); onClose(); }}>Thoát (không lưu)</button>}
  </>);
}

// ═══ Đánh giá cuối giai đoạn ═════════════════════════════════════════════════
const MAX_PLAYS = 2;
const SPEAK_SECS = 120;

export function PhaseTest({ test, onSave, onClose }) {
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
  const [recall, setRecall] = useState(test.recall.map(()=>null)); // % từng cụm
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
      if (validListening(r)) data = { lines: r.lines, questions: r.questions.slice(0,5), ai: true };
    } catch { /* không có AI: dùng bài dự phòng */ }
    setListen(data || { ...test.fallback, ai: false });
    setPicks([]); setPlays(0); setLoading(false); setStep(1);
  }
  function play() {
    setPlays(p=>p+1); setPlaying(true);
    speakLines(listen.lines, 0.85, ()=>setPlaying(false));
  }
  function startSpeaking() {
    setSpeech(''); setSecs(0); secsRef.current = 0;
    stt.start((t)=>{ clearInterval(timer.current); setSpeech(t); });
    timer.current = setInterval(()=>{ secsRef.current += 1; setSecs(secsRef.current); if (secsRef.current >= SPEAK_SECS) stt.stop(); }, 1000);
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
      const fb = { fluency: clamp(r.fluency,5), vocabulary: clamp(r.vocabulary,5), grammar: clamp(r.grammar,5), task: clamp(r.task,5), level: String(r.level||''), feedback: String(r.feedback||'') };
      setSpeakFb(fb);
      pct = Math.round((fb.fluency+fb.vocabulary+fb.grammar+fb.task)/20*100);
    } catch { alert('AI không chấm được phần nói lúc này. Phần này sẽ được bỏ qua.'); }
    setBusy(false);
    return pct;
  }
  function finish() {
    const p = { listening: listenPct, shadowing: shadow?.pct ?? null, speaking: speakPct, recall: Math.round(recall.reduce((s,x)=>s+(x||0),0)/recall.length) };
    setParts(p); setStep(5); onSave({ parts: p, total: totalScore(p), level: speakFb?.level || '' });
  }
  const quit = () => { stt.reset(); clearInterval(timer.current); window.speechSynthesis?.cancel(); onClose(); };
  const STEP_TITLES = ['Bài đánh giá giai đoạn', '1/4 · Nghe hiểu', '2/4 · Shadowing', '3/4 · Nói 2 phút', '4/4 · Nhớ cụm từ', 'Kết quả'];

  return (<>
    <div className="eh-pagehead">
      <div className="eh-eyebrow">Đánh giá giai đoạn {test.n} · mục tiêu {test.level}</div>
      <h1 className="eh-title">{STEP_TITLES[step]}</h1>
    </div>

    {step===0 && (
      <div className="eh-card accent">
        <p style={{fontSize:14.5,lineHeight:1.6,marginBottom:10}}>Khoảng 15 phút, gồm 4 phần:</p>
        <ol className="eh-list" style={{marginBottom:12}}>
          <li><b style={{color:'var(--text)'}}>Nghe hiểu:</b> nghe một đoạn hội thoại (tối đa {MAX_PLAYS} lần), trả lời 5 câu trắc nghiệm.</li>
          <li><b style={{color:'var(--text)'}}>Shadowing:</b> nghe mẫu rồi đọc to một đoạn, máy chấm % từ đọc đúng.</li>
          <li><b style={{color:'var(--text)'}}>Nói 2 phút:</b> trả lời một đề nói, AI chấm trôi chảy / từ vựng / ngữ pháp / truyền đạt.</li>
          <li><b style={{color:'var(--text)'}}>Nhớ cụm từ:</b> nhìn câu tiếng Việt, nói ra câu tiếng Anh.</li>
        </ol>
        <p className="eh-p" style={{marginBottom:14}}>Cần Google Chrome và micro. Đạt khi điểm tổng từ {PASS}%. Bài nghe và phần chấm nói dùng AI; nếu không có AI, app dùng bài nghe soạn sẵn và bỏ qua phần chấm nói.</p>
        <button className="eh-btn gold full" disabled={loading} onClick={begin}>{loading?'Đang tạo bài nghe…':'Bắt đầu →'}</button>
      </div>
    )}

    {step===1 && listen && (<>
      <div className="eh-card cyan">
        <p className="eh-p" style={{marginBottom:10}}>Nghe hội thoại (không có chữ), rồi trả lời câu hỏi. {listen.ai ? 'Bài do AI tạo.' : 'Bài soạn sẵn.'}</p>
        <button className="eh-btn cyan full" disabled={playing || plays>=MAX_PLAYS || listenPct!=null} onClick={play}>
          {playing ? '🔊 Đang phát…' : `▶ Nghe (còn ${MAX_PLAYS-plays} lần)`}
        </button>
      </div>
      {listen.questions.map((q,i)=>(
        <div key={i} className="eh-card">
          <div style={{fontWeight:600,marginBottom:10}}>{i+1}. {q.q}</div>
          {q.options.map((o,k)=>{
            const done = listenPct!=null; const right = k===q.answer; const mine = picks[i]===k;
            return (
              <label key={k} style={{display:'flex',gap:10,alignItems:'center',padding:'6px 0',fontSize:14,cursor:done?'default':'pointer',color:done&&right?'var(--green)':done&&mine?'var(--red)':'var(--text)'}}>
                <input type="radio" name={`q${i}`} checked={mine} disabled={done} onChange={()=>setPicks(p=>{ const n=[...p]; n[i]=k; return n; })} style={{accentColor:'var(--gold)'}} />
                {o}{done&&right?' ✓':''}
              </label>
            );
          })}
        </div>
      ))}
      {listenPct==null
        ? <button className="eh-btn gold full" disabled={plays===0 || playing} onClick={()=>{ window.speechSynthesis?.cancel(); setListenPct(mcqScore(listen.questions, picks)); }}>{plays===0?'Hãy nghe ít nhất 1 lần':'Nộp bài nghe'}</button>
        : (<>
          <div className="eh-card">
            <span className="eh-clabel">Lời thoại · Nghe hiểu: {listenPct}%</span>
            {listen.lines.map((l,i)=><p key={i} style={{fontSize:14,lineHeight:1.7}}><b style={{color:'var(--dim)'}}>{l.speaker}:</b> {l.text}</p>)}
          </div>
          <button className="eh-btn gold full" onClick={()=>setStep(2)}>Tiếp →</button>
        </>)}
    </>)}

    {step===2 && (<>
      <div className="eh-card">
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
          <span className="eh-clabel" style={{margin:0}}>Đọc to đoạn này</span>
          <button className="eh-btn sm cyan" onClick={()=>speak(test.shadow,0.85)}>🔊 Nghe mẫu</button>
        </div>
        <div style={{fontSize:15.5,lineHeight:1.9}}>{test.shadow.split('\n').map((l,i)=><p key={i}>{l}</p>)}</div>
        {shadow
          ? <div style={{marginTop:12,lineHeight:1.9}}>{shadow.spoken.map((x,i)=><span key={i} className={x.ok?'eh-w-ok':'eh-w-err'}>{x.w}</span>)}
              <p style={{fontFamily:'var(--mono)',fontWeight:700,color:color(shadow.pct),marginTop:6}}>Đọc đúng {shadow.correct}/{shadow.total} từ · {shadow.pct}%</p></div>
          : <MicBox stt={stt} label="🎙 Bắt đầu đọc" onDone={(t)=>{ if (t) setShadow(scoreReading(test.shadow, t)); }} />}
      </div>
      <button className="eh-btn gold full" disabled={stt.listening} onClick={()=>{ stt.reset(); setStep(3); }}>{shadow ? 'Tiếp →' : 'Bỏ qua phần này →'}</button>
    </>)}

    {step===3 && (<>
      <div className="eh-card accent">
        <span className="eh-clabel" style={{color:'var(--gold)'}}>Đề nói · khoảng 2 phút</span>
        <p style={{fontSize:16,lineHeight:1.6}}>{test.prompt}</p>
      </div>
      <div className="eh-card violet">
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <span className="eh-clabel" style={{margin:0,color:'var(--violet)'}}>Bài nói của bạn</span>
          <span style={{fontFamily:'var(--mono)',fontWeight:700,color:secs>=90?'var(--green)':'var(--dim)'}}>{String(Math.floor(secs/60)).padStart(2,'0')}:{String(secs%60).padStart(2,'0')} / 02:00</span>
        </div>
        <div style={{background:'var(--surface2)',border:'1px solid var(--line)',borderRadius:11,padding:12,minHeight:70,fontSize:14.5,lineHeight:1.7,margin:'10px 0'}}>
          {(stt.listening ? stt.text : speech) || <span style={{color:'var(--dim)'}}>Lời bạn nói hiện ở đây…</span>}
        </div>
        <button className={`eh-btn full ${stt.listening?'red':'violet'}`} disabled={busy} onClick={()=>stt.listening ? stt.stop() : startSpeaking()}>
          {stt.listening ? <><span className="pulse">●</span> Dừng</> : speech ? '🎙 Nói lại' : '🎙 Bắt đầu nói'}
        </button>
      </div>
      <div style={{display:'flex',gap:8}}>
        <button className="eh-btn" style={{flex:1}} disabled={stt.listening||busy} onClick={()=>{ setSpeakFb(null); setSpeakPct(null); setStep(4); }}>Bỏ qua</button>
        <button className="eh-btn gold" style={{flex:2}} disabled={stt.listening||busy||!speech} onClick={async()=>{ setSpeakPct(await gradeSpeaking()); setStep(4); }}>{busy?'AI đang chấm…':'🤖 Chấm & tiếp →'}</button>
      </div>
    </>)}

    {step===4 && (<>
      <div className="eh-card violet">
        <span className="eh-clabel" style={{color:'var(--violet)'}}>Câu {ri+1}/{test.recall.length} · nói câu này bằng tiếng Anh</span>
        <p style={{fontSize:18,color:'var(--gold)',fontWeight:600,marginBottom:4}}>{test.recall[ri].vi}</p>
        {recall[ri]==null
          ? <MicBox stt={stt} label="🎙 Nói" onDone={(t)=>{ const i=ri; setRecall(r=>r.map((x,k)=>k===i?scoreReading(test.recall[i].en, t).pct:x)); }} />
          : <div style={{marginTop:10,fontSize:14,lineHeight:1.7}}>
              <div style={{color:'var(--dim)'}}>Bạn: {stt.final || '(không nhận được)'}</div>
              <div style={{color:'var(--green)'}}>✓ {test.recall[ri].en} <b style={{fontFamily:'var(--mono)',color:color(recall[ri])}}>· {recall[ri]}%</b></div>
            </div>}
      </div>
      <button className="eh-btn gold full" disabled={stt.listening} onClick={()=>{
        stt.reset();
        if (ri < test.recall.length-1) setRi(ri+1); else finish();
      }}>{recall[ri]==null ? 'Bỏ qua câu này →' : ri < test.recall.length-1 ? 'Câu tiếp →' : 'Xem kết quả →'}</button>
    </>)}

    {step===5 && parts && <Result parts={parts} onClose={onClose} extra={speakFb && (
      <div className="eh-card">
        <span className="eh-clabel">Nhận xét bài nói {speakFb.level && `· ước lượng ${speakFb.level}`}</span>
        {[['Trôi chảy','fluency'],['Từ vựng','vocabulary'],['Ngữ pháp','grammar'],['Truyền đạt ý','task']].map(([l,k])=>(
          <div key={k} style={{display:'flex',justifyContent:'space-between',fontSize:13.5,padding:'4px 0'}}><span>{l}</span><span style={{fontFamily:'var(--mono)'}}>{speakFb[k]}/5</span></div>
        ))}
        <p className="eh-p" style={{marginTop:8}}>{speakFb.feedback}</p>
      </div>
    )} />}

    {step<5 && <button className="eh-btn full sm" style={{marginTop:12,color:'var(--dim)'}} onClick={quit}>Thoát (không lưu)</button>}
  </>);
}
