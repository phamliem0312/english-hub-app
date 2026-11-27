import { dateOfDay, dayDone, CRITERIA } from "../../lib/learning";
import Tag from "../../components/ui/Tag";

// Một tuần trong mục lục: chủ đề + 7 ô ngày.
export default function WeekRow({ w, data, today, current, openDay, onRate }) {
  const days = Array.from({ length: 7 }, (_, i) => (w.week - 1) * 7 + i + 1);
  const nDone = days.filter((n) => dayDone(data.checks, dateOfDay(data.start, n))).length;
  const rated = CRITERIA.every((c) => data.log[w.week]?.r?.[c.id]);

  return (
    <div className={`week ${current ? 'current' : ''}`}>
      <div>
        <div className="week-num">Tuần {w.week}{current && ' · tuần này'}</div>
        <div className="week-topic">{w.topic}</div>
        <div className="week-meta">{w.output}</div>
      </div>
      <div className="days">
        {days.map((n) => {
          const d = dateOfDay(data.start, n);
          const c = (data.checks[d] || []).filter(Boolean).length;
          const score = data.quiz[d]?.total;
          return (
            <button key={n} className={`day ${c >= 5 ? 'done' : c ? 'part' : ''} ${d === today ? 'today' : ''} ${d > today ? 'future' : ''}`}
              onClick={() => openDay(n)} title={score != null ? `Kiểm tra cuối ngày: ${score}%` : undefined}
              aria-label={`Ngày ${n}${c >= 5 ? ', đã xong' : c ? `, ${c}/5 khối` : ''}${d === today ? ', hôm nay' : ''}${score != null ? `, kiểm tra ${score}%` : ''}`}>
              {n}<small>{score != null ? `${score}%` : c && c < 5 ? `${c}/5` : ''}</small>
            </button>
          );
        })}
      </div>
      <div className="week-foot">
        <Tag tone={nDone === 7 ? 'ok' : nDone ? 'warn' : ''}>{nDone}/7 ngày</Tag>
        {rated && <Tag tone="ok">đã tự chấm</Tag>}
        {onRate && <button className="link" onClick={onRate}>Chấm tuần {w.week}</button>}
      </div>
    </div>
  );
}
