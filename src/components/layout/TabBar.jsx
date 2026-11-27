import Icon from "../ui/Icon";
import { NAV } from "./nav";

// Thanh điều hướng dưới cùng trên điện thoại.
export default function TabBar({ page, go, badges }) {
  return (
    <nav className="tabbar" aria-label="Điều hướng chính">
      {NAV.map((it) => (
        <button key={it.id} className="tab" aria-current={page === it.id ? 'page' : undefined} onClick={() => go(it.id)}>
          {badges[it.id] > 0 && <span className="count">{badges[it.id]}</span>}
          <Icon name={it.icon} size={20} />{it.label}
        </button>
      ))}
    </nav>
  );
}
