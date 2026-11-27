import Icon from "../ui/Icon";
import PhaseBar from "../ui/PhaseBar";
import { NAV } from "./nav";

export default function Sidebar({ page, go, badges, week, data }) {
  return (
    <aside className="side">
      <div className="brand">
        <span className="brand-mark" aria-hidden="true">E</span>
        <div><div className="brand-name">English <em>Hub</em></div><small>Nghe – nói cho dân IT</small></div>
      </div>
      <nav className="nav" aria-label="Điều hướng chính">
        {NAV.map((it) => (
          <button key={it.id} className={`nav-item tone-${it.tone}`} aria-current={page === it.id ? 'page' : undefined} onClick={() => go(it.id)}>
            <Icon name={it.icon} />{it.long || it.label}
            {badges[it.id] > 0 && <span className="count" aria-label={`${badges[it.id]} cần ôn`}>{badges[it.id]}</span>}
          </button>
        ))}
      </nav>
      <div className="side-foot">
        <div className="row between">
          <span>Tuần <b>{week}</b>/12</span>
          <span className="num">{data.daysDone}/84 ngày</span>
        </div>
        <PhaseBar data={data} />
      </div>
    </aside>
  );
}
