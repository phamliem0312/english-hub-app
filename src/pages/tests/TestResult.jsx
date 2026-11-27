import { totalScore, weakParts, PASS, PART_NAMES } from "../../lib/learning";
import { tone } from "../../lib/format";
import Section from "../../components/ui/Section";
import Ring from "../../components/ui/Ring";
import Icon from "../../components/ui/Icon";

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
    <div className={`result tone-${total == null ? 'blue' : total >= PASS ? 'ok' : 'ochre'}`}>
      <Ring value={total ?? 0} size={190} stroke={12} label={`Tổng điểm ${total ?? '—'}%`}>
        <div className="result-score num">{total == null ? '—' : <>{total}<small>%</small></>}</div>
      </Ring>
      <p className="dim" style={{ marginTop: 16 }}>{total == null ? 'Chưa có phần nào được chấm.' : total >= PASS ? `Đạt (từ ${PASS}%). Làm tốt lắm.` : `Chưa đạt ${PASS}%. Ôn thêm các phần dưới đây rồi làm lại.`}</p>
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
      <div className="callout tone-ochre section">
        <span className="icon-badge lg"><Icon name="target" size={19} /></span>
        <div className="grow">
          <div className="h3" style={{ marginBottom: 8 }}>Nên ôn lại</div>
          <ul className="list">{weak.map((k) => <li key={k}><b>{PART_NAMES[k]}:</b> {ADVICE[k]}</li>)}</ul>
        </div>
      </div>
    )}
    {extra}
    <button className="btn btn-primary btn-lg btn-block section" onClick={onClose}>Xong</button>
  </>);
}
