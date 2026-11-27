import { useState } from "react";
import { SAMPLES } from "../../lib/learning";
import Icon from "../../components/ui/Icon";

export default function PhraseForm({ addPhrases }) {
  const [text, setText] = useState('');
  const [note, setNote] = useState('');
  const [msg, setMsg] = useState('');

  function add() {
    if (!text.trim()) return;
    if (addPhrases([{ text, note: note.trim() }])) { setText(''); setNote(''); setMsg(''); }
    else setMsg('Cụm này đã có trong kho.');
  }
  function addSamples() {
    const n = addPhrases(SAMPLES.slice(1).flatMap((s) => s.text.split('\n').map((t) => ({ text: t }))));
    setMsg(n ? `Đã thêm ${n} mẫu câu.` : 'Các mẫu câu IT đã có trong kho.');
  }

  return (
    <div className="card">
      <div className="phrase-form">
        <input className="field" value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') add(); }}
          placeholder="Cụm tiếng Anh, ví dụ: Let me make sure I understand correctly." aria-label="Cụm tiếng Anh" />
        <input className="field" value={note} onChange={(e) => setNote(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') add(); }}
          placeholder="Nghĩa tiếng Việt (tuỳ chọn — có thì ôn theo kiểu nhìn nghĩa nói ra cụm)" aria-label="Nghĩa tiếng Việt" />
      </div>
      <div className="row mt">
        <button className="btn btn-primary" disabled={!text.trim()} onClick={add}><Icon name="plus" size={16} /> Thêm</button>
        <button className="btn btn-ghost" onClick={addSamples}>Thêm 12 mẫu câu tình huống IT</button>
        {msg && <span className="small muted">{msg}</span>}
      </div>
    </div>
  );
}
