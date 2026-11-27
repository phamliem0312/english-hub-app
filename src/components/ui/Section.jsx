import Icon from "./Icon";

// Tiêu đề section có đường kẻ mực; icon (tuỳ chọn) nằm trong ô màu theo tone.
export default function Section({ title, meta, icon, mark, tone = 'accent', children, className = '' }) {
  return (
    <section className={`section ${className}`}>
      <div className="section-head">
        <h2 className="section-title">
          {(icon || mark != null) && <span className={`icon-badge tone-${tone}`}>{icon ? <Icon name={icon} size={17} /> : mark}</span>}
          {title}
        </h2>
        {meta != null && meta !== false && <div className="section-meta">{meta}</div>}
      </div>
      {children}
    </section>
  );
}
