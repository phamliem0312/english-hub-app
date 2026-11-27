import { useState } from "react";
import PageHeader from "../../components/ui/PageHeader";
import Section from "../../components/ui/Section";
import Icon from "../../components/ui/Icon";
import ReviewSession from "./ReviewSession";
import PhraseForm from "./PhraseForm";
import PhraseList from "./PhraseList";
import "./phrases.css";

export default function PhrasesPage({ data, due, autoReview }) {
  // Chốt danh sách lúc bắt đầu ôn, để cụm vừa chấm không biến mất giữa chừng.
  const [session, setSession] = useState(() => (autoReview && due.length ? due : null));

  return (<>
    <PageHeader kicker="Vocabulary · 5 phút mỗi ngày" title={<>{data.phrases.length} <em>cụm từ đã lưu</em></>}>
      Mục tiêu: dùng được 30–50 cụm từ. Lưu cụm hay gặp khi nghe, ôn ngắt quãng 1 → 3 → 7 → 14 → 30 ngày; mỗi lần ôn hãy đọc to và tự đặt một câu của bạn.
    </PageHeader>

    {session ? (
      <ReviewSession cards={session} onGrade={data.gradePhrase} onExit={() => setSession(null)} />
    ) : (<>
      {due.length > 0 && (
        <div className="callout tone-ok" style={{ alignItems: 'center' }}>
          <span className="icon-badge lg"><Icon name="repeat" size={19} /></span><div className="grow"><div className="h3">{due.length} cụm đến hạn ôn</div><p className="small dim">Mất khoảng {Math.max(1, Math.round(due.length / 3))} phút.</p></div>
          <button className="btn btn-primary" onClick={() => setSession(due)}>Ôn ngay</button>
        </div>
      )}
      <Section icon="plus" tone="ok" title="Thêm cụm từ">
        <PhraseForm addPhrases={data.addPhrases} />
      </Section>
      <Section icon="phrases" tone="plum" title="Kho cụm từ" meta={data.phrases.length > 0 && `${data.phrases.filter((p) => p.mastered).length} thành thạo`}>
        {data.phrases.length > 0
          ? <PhraseList phrases={data.phrases} onDelete={data.deletePhrase} />
          : <p className="dim">Kho đang trống. Mỗi khi nghe thấy một cụm hay (ví dụ <i className="serif">“Could you say that again?”</i>), lưu lại ở trên — hoặc bắt đầu nhanh với 12 mẫu câu tình huống IT.</p>}
      </Section>
    </>)}
  </>);
}
