import Icon from "../../components/ui/Icon";
import { SKILL_TONE } from "../../lib/format";

const PAGE_NAME = { speak: 'Luyện nói', phrases: 'Cụm từ' };

// 5 khối học của một ngày, mỗi khối một màu theo kỹ năng.
export default function TaskList({ tasks, checks, disabled, onToggle, go }) {
  return (
    <div className="tasks">
      {tasks.map((t, i) => (
        <div key={t.id} className={`task tone-${SKILL_TONE[t.id]} ${checks[i] ? 'done' : ''}`}>
          <input type="checkbox" className="check" checked={!!checks[i]} disabled={disabled} onChange={() => onToggle(i)} aria-label={t.title} />
          <div>
            <div className="row" style={{ marginBottom: 6 }}>
              <span className="task-kind">{t.kind}</span>
              <span className="task-time"><Icon name="clock" size={13} /> {t.min} phút</span>
            </div>
            <div className="h3">{t.title}</div>
            <p className="task-desc">{t.desc}</p>
            {t.url && <a className="link" href={t.url} target="_blank" rel="noopener noreferrer">Mở tài liệu <Icon name="external" size={14} /></a>}
            {t.page && <button className="link" onClick={() => go(t.page)}>Mở {PAGE_NAME[t.page]} <Icon name="arrow" size={14} /></button>}
          </div>
        </div>
      ))}
    </div>
  );
}
