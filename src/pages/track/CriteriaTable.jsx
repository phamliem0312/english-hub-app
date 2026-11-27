import { CRITERIA, PASS } from "../../lib/learning";
import { SKILL_TONE } from "../../lib/format";

// Bảng điểm tự chấm 5 tiêu chí qua các tuần + điểm kiểm tra ngày trung bình.
export default function CriteriaTable({ data, week }) {
  const weeks = Array.from({ length: week }, (_, i) => i + 1);
  return (
    <div className="table-wrap">
      <table className="table">
        <thead><tr><th>Tiêu chí</th>{weeks.map((w) => <th key={w} className="c">T{w}</th>)}</tr></thead>
        <tbody>
          {CRITERIA.map((c) => (
            <tr key={c.id}>
              <td><div className={`row nowrap tone-${SKILL_TONE[c.id]}`} style={{ fontWeight: 600 }}><span className="dot" />{c.name}</div><div className="small muted">{c.goal}</div></td>
              {weeks.map((w) => { const v = data.log[w]?.r?.[c.id]; return <td key={w} className={`c num ${v >= 4 ? 'ok' : v ? '' : 'muted'}`}>{v || '·'}</td>; })}
            </tr>
          ))}
          <tr>
            <td><div className="row nowrap tone-teal" style={{ fontWeight: 600 }}><span className="dot" />Kiểm tra ngày</div><div className="small muted">Điểm trung bình kiểm tra cuối ngày (%)</div></td>
            {weeks.map((w) => { const a = data.weekQuizAvg(w); return <td key={w} className={`c num ${a == null ? 'muted' : a >= PASS ? 'ok' : 'warn'}`}>{a ?? '·'}</td>; })}
          </tr>
        </tbody>
      </table>
    </div>
  );
}
