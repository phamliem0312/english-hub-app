import { totalScore, weakParts, PASS, PART_NAMES } from "../../lib/learning";
import { tone } from "../../lib/format";
import Section from "../../components/ui/Section";

const ADVICE = {
  dict: 'Nghe lại từng câu ở tốc độ chậm, chép ra giấy rồi so với phụ đề.',
  reflex: 'Luyện trả lời to các câu hỏi của tuần, mỗi câu 2–3 câu trả lời ngắn, không dịch từng từ.',
  listening: 'Nghe các bài British Council/BBC cùng cấp độ theo đủ 4 bước, nhất là bước 4: tự kể lại.',
  shadowing: 'Tăng thời gian shadowing: giảm tốc độ còn 0.7×, nhại theo từng câu rồi mới đọc cả đoạn.',
  speaking: 'Ghi âm đề nói mỗi ngày 2–3 phút, dùng phiên bản AI sửa để shadowing lại.',
  recall: 'Ôn kho cụm từ hằng ngày: nhìn nghĩa, nói to cụm tiếng Anh và tự đặt câu.',
};

// Màn kết quả chung cho kiểm tra ngày và đánh giá giai đoạn.
export default function TestResult({ parts, onClose, extra }) {
  const total = totalScore(parts);
  const weak = weakParts(parts);
  return (<>
    <div className="result">
      <div className={`result-score num ${total == null ? 'muted' : total >= PASS ? 'ok' : 'warn'}`}>{total == null ? '—' : `${total}%`}</div>
      <p className="dim">{total == null ? 'Chưa có phần nào được chấm.' : total >= PASS ? `Đạt (từ ${PASS}%). Làm tốt lắm.` : `Chưa đạt ${PASS}%. Ôn thêm các phần dưới đây rồi làm lại.`}</p>
    </div>

    <Section title="Chi tiết">
      <div className="divided">
        {Object.entries(parts).map(([k, v]) => (
          <div key={k} className="row between" style={{ padding: '10px 0' }}>
            <span>{PART_NAMES[k]}</span>
            <span className={`num ${v == null ? 'muted' : tone(v)}`} style={{ fontWeight: 600 }}>{v == null ? 'bỏ qua' : `${v}%`}</span>
          </div>
        ))}
      </div>
    </Section>

    {weak.length > 0 && (
      <div className="note warn section">
        <div className="h3" style={{ marginBottom: 8 }}>Nên ôn lại</div>
        <ul className="list">{weak.map((k) => <li key={k}><b>{PART_NAMES[k]}:</b> {ADVICE[k]}</li>)}</ul>
      </div>
    )}
    {extra}
    <button className="btn btn-primary btn-lg btn-block section" onClick={onClose}>Xong</button>
  </>);
}
