import { SAMPLES } from "../../lib/learning";

function Option({ on, title, sub, onClick }) {
  return (
    <button className="pick" role="radio" aria-checked={on} onClick={onClick}>
      <span className="pick-dot" />
      <span className="grow"><span className="pick-title">{title}</span>{sub && <span className="pick-sub">{sub}</span>}</span>
    </button>
  );
}

// Chọn đề tuần / bài mẫu / đoạn tự dán.
export default function ContentPicker({ sel, week, W, custom, setCustom, choose }) {
  return (<>
    <div className="picker" role="radiogroup" aria-label="Nội dung luyện nói">
      <Option on={sel === 'week'} title={`Đề tuần ${week}: ${W.topic}`} sub={`Nói tự do · ${W.output}`} onClick={() => choose('week')} />
      {SAMPLES.map((s) => <Option key={s.id} on={sel === s.id} title={s.title} onClick={() => choose(s.id, s.text)} />)}
      <Option on={sel === 'custom'} title="Dán đoạn của bạn" sub="Transcript VOA, BBC… để shadowing" onClick={() => choose('custom', custom)} />
    </div>
    {sel === 'custom' && (
      <div className="mt">
        <textarea className="field" value={custom} onChange={(e) => setCustom(e.target.value)} placeholder="Dán 5–10 câu bạn muốn shadowing…" aria-label="Đoạn để shadowing" />
        <button className="btn btn-primary" style={{ marginTop: 10 }} disabled={!custom.trim()} onClick={() => choose('custom', custom.trim())}>Dùng đoạn này</button>
      </div>
    )}
  </>);
}
