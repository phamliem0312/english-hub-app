import { useState } from "react";
import { speak } from "../../lib/browser";
import Icon from "../../components/ui/Icon";

// Đoạn mẫu: nhấn từ để nghe riêng, chọn giọng/tốc độ, nghe cả đoạn.
export default function Reader({ text, words, reader, onSave }) {
  const [saved, setSaved] = useState('');
  const out = []; let last = 0;
  words.forEach((w, i) => {
    if (text.slice(last, w.s).includes('\n')) out.push(<br key={'b' + i} />);
    const cls = i === reader.hi ? 'cur' : i < reader.hi ? 'done' : '';
    out.push(<button key={i} className={`word ${cls}`} onClick={() => { const c = w.w.replace(/[.,!?;:"']/g, ''); if (c) speak(c, reader.rate); }}>{w.w}</button>, ' ');
    last = w.e;
  });

  return (
    <div className="card">
      <div className="reader-text">{out}</div>
      <p className="small muted" style={{ marginTop: 10 }}>Nhấn vào một từ để nghe riêng.</p>
      {onSave && (
        <div className="row" style={{ marginTop: 10 }}>
          <button className="link" onClick={() => { const n = onSave(); setSaved(n ? `Đã thêm ${n} câu vào kho cụm từ.` : 'Các câu này đã có trong kho.'); }}>
            <Icon name="plus" size={14} /> Lưu các câu này vào kho cụm từ
          </button>
          {saved && <span className="small ok">{saved}</span>}
        </div>
      )}

      <div className="controls">
        <label className="label" htmlFor="voice">Giọng</label>
        <select id="voice" className="field" value={reader.voice} onChange={(e) => reader.setVoice(+e.target.value)}>
          {reader.voices.length ? reader.voices.map((v, i) => <option key={i} value={i}>{v.name} ({v.lang})</option>) : <option>Đang tải…</option>}
        </select>
        <label className="label" htmlFor="rate">Tốc độ</label>
        <div className="row nowrap">
          <input id="rate" type="range" min="0.5" max="1.5" step="0.05" value={reader.rate} onChange={(e) => reader.setRate(+e.target.value)} />
          <span className="num" style={{ minWidth: 44, textAlign: 'right', fontWeight: 600 }}>{reader.rate.toFixed(2)}×</span>
        </div>
      </div>
      {reader.playing
        ? <button className="btn btn-block" style={{ marginTop: 16 }} onClick={reader.stop}><Icon name="stop" size={14} /> Dừng</button>
        : <button className="btn btn-primary btn-block" style={{ marginTop: 16 }} onClick={() => reader.play(text, words)}><Icon name="play" size={14} /> Nghe mẫu</button>}
    </div>
  );
}
