import Icon from "../ui/Icon";
import Progress from "../ui/Progress";
import { TOTAL_DAYS } from "../../lib/learning";
import { NAV } from "./nav";

export default function Sidebar({ page, go, badges, week, daysDone }) {
  return (
    <aside className="side">
      <div className="brand">English <em>Hub</em><small>Nghe – nói cho dân IT, 1 giờ mỗi ngày</small></div>
      <nav className="nav" aria-label="Điều hướng chính">
        {NAV.map((it) => (
          <button key={it.id} className="nav-item" aria-current={page === it.id ? 'page' : undefined} onClick={() => go(it.id)}>
            <Icon name={it.icon} />{it.long || it.label}
            {badges[it.id] > 0 && <span className="count" aria-label={`${badges[it.id]} cần ôn`}>{badges[it.id]}</span>}
          </button>
        ))}
      </nav>
      <div className="side-foot">
        <div className="row between" style={{ marginBottom: 8 }}>
          <span>Tuần <b>{week}</b>/12</span>
          <span className="num">{daysDone}/{TOTAL_DAYS} ngày</span>
        </div>
        <Progress value={daysDone / TOTAL_DAYS * 100} label="Tiến độ 84 ngày" />
      </div>
    </aside>
  );
}
