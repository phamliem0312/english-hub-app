export default function Progress({ value, tone = '', label }) {
  const v = Math.max(0, Math.min(100, value));
  return (
    <div className={`progress ${tone}`} role="progressbar" aria-valuenow={Math.round(v)} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
      <span style={{ width: `${v}%` }} />
    </div>
  );
}
