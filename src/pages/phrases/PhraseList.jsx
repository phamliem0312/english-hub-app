import { isDue } from "../../lib/learning";
import { speak } from "../../lib/browser";
import { dmy } from "../../lib/format";
import Tag from "../../components/ui/Tag";
import Icon from "../../components/ui/Icon";

export default function PhraseList({ phrases, onDelete }) {
  return (
    <ul className="phrase-list">
      {phrases.slice().reverse().map((p) => (
        <li key={p.id} className={p.mastered ? 'tone-ok' : isDue(p) ? 'tone-accent' : 'tone-blue'}>
          <span className="phrase-mark" aria-hidden="true" /><div className="grow">
            <div className="phrase-text">{p.text}</div>
            {p.note && <div className="small dim">{p.note}</div>}
            <div className="row small muted" style={{ marginTop: 4 }}>
              {p.mastered && <Tag tone="ok">thành thạo</Tag>}
              {isDue(p) && <Tag tone="accent">cần ôn</Tag>}
              <span className="num">ôn {p.reviewCount}× · lần tới {dmy(p.nextReview)}</span>
            </div>
          </div>
          <div className="row nowrap">
            <button className="btn btn-sm btn-icon btn-ghost" onClick={() => speak(p.text)} aria-label={`Nghe: ${p.text}`}><Icon name="volume" size={16} /></button>
            <button className="btn btn-sm btn-icon btn-ghost" onClick={() => onDelete(p.id)} aria-label={`Xoá: ${p.text}`}><Icon name="x" size={16} /></button>
          </div>
        </li>
      ))}
    </ul>
  );
}
