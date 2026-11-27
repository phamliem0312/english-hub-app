import { PHASES, dateOfDay, dayDone } from "../../lib/learning";
import { phaseTone } from "../../lib/format";

// Tiến độ 84 ngày chia theo 3 giai đoạn, mỗi đoạn một màu.
export default function PhaseBar({ data, height = 6, labels = true }) {
  return (<>
    <div className="phase-bar" style={{ '--h': `${height}px` }} role="img" aria-label={`Đã xong ${data.daysDone}/84 ngày`}>
      {PHASES.map((p) => {
        const days = (p.weeks[1] - p.weeks[0] + 1) * 7;
        let done = 0;
        for (let n = (p.weeks[0] - 1) * 7 + 1; n <= p.weeks[1] * 7; n++) if (dayDone(data.checks, dateOfDay(data.start, n))) done++;
        return <div key={p.n} className={`tone-${phaseTone(p.n)}`} style={{ '--w': days }}><span style={{ width: `${done / days * 100}%` }} /></div>;
      })}
    </div>
    {labels && (
      <div className="phase-names">
        {PHASES.map((p) => <span key={p.n} className={`tone-${phaseTone(p.n)}`} style={{ '--w': p.weeks[1] - p.weeks[0] + 1 }}>{p.name}</span>)}
      </div>
    )}
  </>);
}
