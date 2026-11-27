import Icon from "../../components/ui/Icon";

const PAGE_NAME = { speak: 'Luyện nói', phrases: 'Cụm từ' };

// 5 khối học của một ngày, mỗi khối có ô tick và link tài liệu.
export default function TaskList({ tasks, checks, disabled, onToggle, go }) {
  return (
    <div className="tasks">
      {tasks.map((t, i) => (
        <div key={t.id} className={`task ${checks[i] ? 'done' : ''}`}>
          <input type="checkbox" className="check" checked={!!checks[i]} disabled={disabled} onChange={() => onToggle(i)} aria-label={t.title} />
          <div>
            <div className="task-kind">{t.kind}</div>
            <div className="h3">{t.title}</div>
            <p className="task-desc">{t.desc}</p>
            {t.url && <a className="link" href={t.url} target="_blank" rel="noopener noreferrer">Mở tài liệu <Icon name="external" size={14} /></a>}
            {t.page && <button className="link" onClick={() => go(t.page)}>Mở {PAGE_NAME[t.page]} <Icon name="arrow" size={14} /></button>}
          </div>
          <div className="task-time">{t.min} phút</div>
        </div>
      ))}
    </div>
  );
}
