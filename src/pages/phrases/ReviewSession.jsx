import { useState } from "react";
import { GAPS, RECHECK_DAYS } from "../../lib/learning";
import { speak } from "../../lib/browser";
import Progress from "../../components/ui/Progress";
import Icon from "../../components/ui/Icon";

// Ôn lần lượt các cụm đến hạn. Có nghĩa tiếng Việt: nhìn nghĩa → nói cụm → xem đáp án.
export default function ReviewSession({ cards, onGrade, onExit }) {
  const [qi, setQi] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const card = cards[qi];
  const front = card.note && !flipped;

  function answer(ok) {
    onGrade(card.id, ok); setFlipped(false);
    if (qi + 1 >= cards.length) onExit(); else setQi(qi + 1);
  }

  return (<>
    <div className="row between small muted" style={{ marginBottom: 8 }}>
      <span className="num">Cụm {qi + 1} / {cards.length}</span>
      <button className="btn btn-sm btn-ghost" onClick={onExit}>Dừng ôn</button>
    </div>
    <Progress value={qi / cards.length * 100} label="Tiến độ ôn" />

    <div className="flash">
      {front ? (<>
        <div className="flash-hint">Nói bằng tiếng Anh</div>
        <div className="flash-main accent">{card.note}</div>
      </>) : (<>
        <div className="flash-main">{card.text}</div>
        {card.note && <div className="dim">{card.note}</div>}
        <button className="btn btn-sm btn-ghost" style={{ marginTop: 14 }} onClick={() => speak(card.text)}><Icon name="volume" size={16} /> Nghe</button>
      </>)}
      <p className="small muted" style={{ marginTop: 18 }}>{front ? 'Nói to cụm tiếng Anh, rồi xem đáp án.' : 'Đọc to theo, rồi nói một câu của bạn có dùng cụm này.'}</p>
    </div>

    {front
      ? <button className="btn btn-primary btn-lg btn-block" onClick={() => { setFlipped(true); speak(card.text); }}>Xem đáp án</button>
      : (
        <div className="grid2">
          <button className="btn btn-lg btn-bad" onClick={() => answer(false)}>Chưa dùng được</button>
          <button className="btn btn-lg btn-primary" onClick={() => answer(true)}><Icon name="check" /> Dùng được</button>
        </div>
      )}
    <p className="footnote" style={{ textAlign: 'center' }}>
      Dùng được → {card.reviewCount + 1 >= GAPS.length ? `thành thạo, kiểm tra lại sau ${RECHECK_DAYS} ngày` : `ôn lại sau ${GAPS[card.reviewCount + 1]} ngày`} · Chưa → ôn lại ngày mai
    </p>
  </>);
}
