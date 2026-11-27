export default function Section({ title, meta, children, className = '' }) {
  return (
    <section className={`section ${className}`}>
      <div className="section-head">
        <h2 className="section-title">{title}</h2>
        {meta != null && <div className="section-meta">{meta}</div>}
      </div>
      {children}
    </section>
  );
}
