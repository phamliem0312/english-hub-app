import { useState } from "react";
import { scoreReading } from "../../lib/learning";
import { askAI, speak, useStt } from "../../lib/browser";
import { tone } from "../../lib/format";
import Progress from "../../components/ui/Progress";
import WordDiff from "../../components/ui/WordDiff";
import MicButton from "../../components/ui/MicButton";
import Icon from "../../components/ui/Icon";

const askFeedback = (topic, transcript) => askAI(`A Vietnamese IT professional (around CEFR A2) is practising speaking English. Topic: ${topic}
Speech-to-text transcript of what they said (no punctuation, may contain recognition errors — ignore those):
${transcript}

Act as a friendly speaking coach. Return ONLY valid JSON:
{"summary":"1-2 sentences in Vietnamese: overall feedback and one thing to focus on","fixes":[{"said":"a phrase they said","better":"a more correct/natural phrase","note":"short reason in Vietnamese"}],"better":"an improved version of the whole answer at A2–B1 level, keeping their ideas, 4-8 short sentences"}
Give at most 5 fixes, most important first.`);

// Có đoạn mẫu: chấm % từ đọc đúng. Nói tự do: AI nhận xét và sửa lỗi.
export default function SpeechCheck({ text, topic, lang, setLang, onShadow }) {
  const stt = useStt(lang);
  const [fb, setFb] = useState(null);
  const [busy, setBusy] = useState(false);
  const score = text && stt.final ? scoreReading(text, stt.final) : null;

  async function getFeedback() {
    setBusy(true); setFb(null);
    try { setFb(await askFeedback(topic, stt.final)); } catch { setFb({ error: true }); }
    setBusy(false);
  }

  return (
    <div className="card">
      <div className="row between" style={{ marginBottom: 12 }}>
        <p className="small dim grow">{text ? 'Đọc to đoạn mẫu — máy so khớp với bài gốc và chấm điểm.' : 'Nói về chủ đề — máy chép lại lời bạn, rồi AI nhận xét và sửa lỗi.'}</p>
        <select className="field" style={{ fontSize: 13, padding: '6px 30px 6px 10px' }} value={lang} onChange={(e) => setLang(e.target.value)} aria-label="Giọng nhận dạng">
          <option value="en-US">Anh – Mỹ</option><option value="en-GB">Anh – Anh</option><option value="en-AU">Anh – Úc</option>
        </select>
      </div>

      <div className="transcript">
        {score ? <WordDiff words={score.spoken} /> : stt.text || <span className="placeholder">{stt.listening ? 'Đang nghe…' : 'Kết quả hiện ở đây…'}</span>}
      </div>

      {score && (
        <div style={{ margin: '16px 0' }}>
          <div className="row between" style={{ marginBottom: 8 }}>
            <span className="small dim">Đọc đúng {score.correct}/{score.total} từ của bài gốc</span>
            <span className={`serif num ${tone(score.pct)}`} style={{ fontSize: 26, lineHeight: 1 }}>{score.pct}%</span>
          </div>
          <Progress value={score.pct} tone={tone(score.pct)} label="Điểm đọc" />
          {score.missed.length > 0 && <p className="small dim" style={{ marginTop: 10 }}>Bị thiếu hoặc đọc chưa rõ: <span className="bad">{score.missed.join(', ')}</span></p>}
        </div>
      )}

      {!text && stt.final && !stt.listening && (
        <button className="btn btn-block" style={{ marginTop: 12 }} disabled={busy} onClick={getFeedback}>{busy ? 'AI đang nghe lại…' : 'AI nhận xét & sửa lỗi'}</button>
      )}
      {fb && (fb.error ? <p className="small bad" style={{ marginTop: 12 }}>Không lấy được nhận xét lúc này. Thử lại sau.</p> : (
        <div className="feedback">
          <p>{fb.summary}</p>
          {Array.isArray(fb.fixes) && fb.fixes.length > 0 && (
            <div className="divided">
              {fb.fixes.map((f, i) => (
                <div key={i} className="fix">
                  <s className="bad">{f.said}</s> <Icon name="arrow" size={13} /> <span className="ok">{f.better}</span>
                  {f.note && <div className="small muted">{f.note}</div>}
                </div>
              ))}
            </div>
          )}
          {fb.better && (
            <div className="well">
              <div className="row between"><span className="label">Phiên bản tốt hơn</span><button className="btn btn-sm btn-icon btn-ghost" onClick={() => speak(fb.better)} aria-label="Nghe"><Icon name="volume" size={16} /></button></div>
              <p className="serif" style={{ fontSize: 17, marginTop: 4 }}>{fb.better}</p>
              <button className="link" style={{ marginTop: 10 }} onClick={() => onShadow(fb.better)}>Shadowing theo bản này <Icon name="arrow" size={14} /></button>
            </div>
          )}
        </div>
      ))}

      <p className="footnote">Điểm chỉ cho biết máy nghe ra bao nhiêu từ, đúng thứ tự — chưa chấm ngữ điệu và trọng âm. Hãy nghe lại ghi âm của mình.</p>
      <MicButton listening={stt.listening} className="mt" onClick={() => { if (stt.listening) stt.stop(); else { setFb(null); stt.start(); } }}>Bắt đầu nhận dạng</MicButton>
    </div>
  );
}
