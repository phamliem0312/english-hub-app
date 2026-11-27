import { Fragment, useState } from "react";
import { PHASES, phaseOf, WEEKS, RESOURCES } from "../../lib/learning";
import PageHeader from "../../components/ui/PageHeader";
import Section from "../../components/ui/Section";
import Progress from "../../components/ui/Progress";
import Tag from "../../components/ui/Tag";
import Icon from "../../components/ui/Icon";
import "./plan.css";

const SCHEDULE = [
  ['10 phút', 'Phát âm', 'Nghe và luyện phát âm theo audio'],
  ['20 phút', 'Listening', 'Nghe đoạn hội thoại hoặc video'],
  ['15 phút', 'Shadowing', 'Nghe và nói nhại theo nhân vật'],
  ['10 phút', 'Speaking', 'Tự nói về một chủ đề'],
  ['5 phút', 'Vocabulary', 'Ôn lại 5–10 cụm từ'],
];
const SPLIT = [
  [60, 'Nghe và luyện nói giao tiếp thông thường', ''],
  [25, 'Phát âm, ngữ điệu và phản xạ', 'warn'],
  [15, 'Tiếng Anh chuyên ngành IT', 'ok'],
];

export default function PlanPage({ data, today, day, week }) {
  const [openWeek, setOpenWeek] = useState(null);
  const phase = phaseOf(week);

  return (<>
    <PageHeader kicker="Kế hoạch" title={<>Lộ trình 12 tuần <em>luyện nghe – nói</em></>}>
      Mục tiêu không phải học thật nhiều ngữ pháp hay từ vựng, mà là nghe hiểu người khác nói, phản xạ trả lời và tự tin giao tiếp trong công việc IT.
    </PageHeader>

    <div className="card row">
      <label className="label" htmlFor="start">Ngày bắt đầu</label>
      <input id="start" type="date" className="field" style={{ width: 'auto' }} value={data.start} max={today} onChange={(e) => data.changeStart(e.target.value)} />
      <span className="small muted">Hôm nay là ngày {day}, tuần {week}.</span>
    </div>

    <Section title="Mục tiêu sau 12 tuần" meta="3 giai đoạn">
      <div className="phases">
        {PHASES.map((p) => (
          <div key={p.n} className={`phase ${p.n === phase.n ? 'current' : ''}`}>
            <div className="row between"><span className="small muted">Tuần {p.weeks[0]}–{p.weeks[1]}</span><Tag tone={p.n === phase.n ? 'accent' : ''}>{p.level}</Tag></div>
            <h3 className="phase-name">{p.n}. {p.name}</h3>
            <ul className="list small">{p.goals.map((g) => <li key={g}>{g}</li>)}</ul>
          </div>
        ))}
      </div>
      <p className="footnote">Đây là các mốc mục tiêu luyện tập, không phải cam kết đạt chứng chỉ CEFR sau đúng 12 tuần.</p>
    </Section>

    <Section title="Lịch cố định 1 giờ mỗi ngày">
      <div className="table-wrap">
        <table className="table">
          <thead><tr><th>Thời lượng</th><th>Nội dung</th><th>Cách học</th></tr></thead>
          <tbody>{SCHEDULE.map((r) => <tr key={r[1]}><td className="num" style={{ whiteSpace: 'nowrap' }}>{r[0]}</td><td style={{ fontWeight: 600 }}>{r[1]}</td><td className="dim">{r[2]}</td></tr>)}</tbody>
        </table>
      </div>
      <p className="footnote">Duy trì một lịch cố định thay vì mỗi ngày học một tài liệu khác nhau.</p>

      <div className="split">
        {SPLIT.map(([n, l, t]) => (
          <div key={l}>
            <div className="row between small" style={{ marginBottom: 6 }}><span>{l}</span><span className="num" style={{ fontWeight: 600 }}>{n}%</span></div>
            <Progress value={n} tone={t} label={l} />
          </div>
        ))}
      </div>
    </Section>

    <Section title="Tài liệu miễn phí">
      <div className="grid2">
        {RESOURCES.map((r) => (
          <div key={r.name} className="card resource">
            <div className="row between"><span className="small muted">{r.group}</span><Tag tone="ok">{r.when}</Tag></div>
            <h3 className="h3" style={{ margin: '8px 0' }}>{r.name}</h3>
            <ul className="list small">{r.points.map((p) => <li key={p}>{p}</li>)}</ul>
            <a className="link" style={{ marginTop: 14 }} href={r.url} target="_blank" rel="noopener noreferrer">Mở {r.name} <Icon name="external" size={14} /></a>
          </div>
        ))}
      </div>
      <p className="footnote">Không cần học cả 4 nguồn cùng lúc. Bắt đầu với VOA và British Council, thêm BBC khi nghe đã tốt hơn.</p>
    </Section>

    <Section title="Nội dung 12 tuần" meta="nhấn để xem đề luyện nói">
      <div className="table-wrap">
        <table className="table">
          <thead><tr><th>Tuần</th><th>Chủ đề</th><th>Bài tập đầu ra</th></tr></thead>
          <tbody>
            {WEEKS.map((w) => (<Fragment key={w.week}>
              <tr className={`clickable ${w.week === week ? 'current' : ''}`} onClick={() => setOpenWeek(openWeek === w.week ? null : w.week)}>
                <td className="num">{w.week}</td>
                <td style={{ fontWeight: 600 }}>
                  <button className="row-toggle" aria-expanded={openWeek === w.week}>{w.topic}</button>
                </td>
                <td>{w.output}</td>
              </tr>
              {openWeek === w.week && <tr className="prompt-row"><td /><td colSpan={2}><span className="label">Đề nói:</span> <i>{w.prompt}</i></td></tr>}
            </Fragment>))}
          </tbody>
        </table>
      </div>
      <p className="footnote">Ở giai đoạn cuối, ưu tiên các tình huống sát với công việc hiện tại (xem mẫu câu ở trang Luyện nói) thay vì chỉ học giao tiếp đời sống.</p>
    </Section>
  </>);
}
