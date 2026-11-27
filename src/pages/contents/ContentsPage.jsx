import { PHASES, WEEKS, PASS, TOTAL_DAYS } from "../../lib/learning";
import { phaseTone } from "../../lib/format";
import PageHeader from "../../components/ui/PageHeader";
import Section from "../../components/ui/Section";
import PhaseBar from "../../components/ui/PhaseBar";
import WeekRow from "./WeekRow";
import "./contents.css";

export default function ContentsPage({ data, today, day, week, go, openDay, startPhase }) {
  return (<>
    <PageHeader kicker={`Đang ở ngày ${day} · tuần ${week}`} title={<>12 tuần, <em>{TOTAL_DAYS} ngày</em></>}>
      Nhấn vào một ngày để mở lịch học của ngày đó và đánh dấu bù. Số nhỏ trong ô là điểm kiểm tra cuối ngày.
    </PageHeader>

    <div className="card">
      <div className="row between small dim" style={{ marginBottom: 4 }}>
        <span>Đã xong <b className="num" style={{ color: 'var(--ink)' }}>{data.daysDone}/{TOTAL_DAYS}</b> ngày</span>
        <span className="num">{Math.round(data.daysDone / TOTAL_DAYS * 100)}%</span>
      </div>
      <PhaseBar data={data} height={10} />
      <div className="legend">
        <span><i className="done" /> Xong đủ 5 khối</span>
        <span><i className="part" /> Làm dở</span>
        <span><i className="today" /> Hôm nay</span>
      </div>
    </div>

    {PHASES.map((p) => {
      const best = data.bestPhase(p.n);
      const t = phaseTone(p.n);
      return (
        <Section key={p.n} mark={p.n} tone={t} className={`tone-${t}`} title={p.name}
          meta={<button className={`btn btn-sm ${best >= PASS ? 'btn-ok' : ''}`} onClick={() => startPhase(p.n)}>
            Đánh giá · {p.level}{best != null && ` · ${best}%`}
          </button>}>
          {WEEKS.slice(p.weeks[0] - 1, p.weeks[1]).map((w) => (
            <WeekRow key={w.week} w={w} data={data} today={today} current={w.week === week} openDay={openDay}
              onRate={w.week <= week ? () => go('track', { week: w.week }) : null} />
          ))}
        </Section>
      );
    })}
  </>);
}
