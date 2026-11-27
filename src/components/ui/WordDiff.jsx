// Lời nói đã chấm: xanh = khớp bài gốc, đỏ = thừa/sai.
export default function WordDiff({ words }) {
  if (!words.length) return <span className="muted">(không nhận được)</span>;
  return <div className="diff">{words.map((x, i) => <span key={i} className={x.ok ? '' : 'miss'}>{x.w}</span>)}</div>;
}
