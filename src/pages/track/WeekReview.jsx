import { CRITERIA, WEEKS } from "../../lib/learning";
import Icon from "../../components/ui/Icon";
import Tag from "../../components/ui/Tag";
import { SKILL_TONE } from "../../lib/format";

// Một tuần: tự chấm 5 tiêu chí, ghi chú, nghe bản ghi Chủ nhật cạnh tuần trước.
export default function WeekReview({ w, current, open, onToggle, data, recs }) {
  const entry = data.log[w] || { r: {}, note: '' };
  return (
    <div className={`review ${open ? 'open' : ''}`}>
      <button className="review-head" onClick={onToggle} aria-expanded={open}>
        <span className="grow"><span className="week-num">Tuần {w}{current && ' · tuần này'}</span><span className="h3">{WEEKS[w - 1].topic}</span></span>
        {recs[w] && <Tag><Icon name="mic" size={12} /> có bản ghi</Tag>}
        <Icon name="down" />
      </button>
      {open && (
        <div className="review-body">
          {CRITERIA.map((c) => (
            <div key={c.id} className={`criterion tone-${SKILL_TONE[c.id]}`}>
              <div className="grow"><div className="row nowrap" style={{ fontWeight: 600 }}><span className="dot" />{c.name}</div><div className="small muted">{c.goal}</div></div>
              <div className="rate" role="group" aria-label={c.name}>
                {[1, 2, 3, 4, 5].map((v) => <button key={v} className={entry.r[c.id] === v ? 'on' : ''} onClick={() => data.setRating(w, c.id, v)} aria-pressed={entry.r[c.id] === v}>{v}</button>)}
              </div>
            </div>
          ))}
          <textarea className="field" style={{ marginTop: 14, minHeight: 72 }} defaultValue={entry.note}
            onBlur={(e) => { if (e.target.value !== entry.note) data.setNote(w, e.target.value); }}
            placeholder="Ghi chú: điều làm tốt, điều cần cải thiện tuần sau…" aria-label={`Ghi chú tuần ${w}`} />
          <div className="label" style={{ margin: '16px 0 6px' }}>Bản ghi Chủ nhật</div>
          {recs[w] ? <audio src={recs[w]} controls />
            : <p className="small muted">Chưa có. Ghi âm ở trang Luyện nói rồi bấm “Lưu làm bản ghi tuần”.</p>}
          {w > 1 && recs[w - 1] && recs[w] && <><div className="label" style={{ margin: '12px 0 6px' }}>So với tuần {w - 1}</div><audio src={recs[w - 1]} controls /></>}
        </div>
      )}
    </div>
  );
}
