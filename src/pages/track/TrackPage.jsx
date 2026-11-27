import { useState, useEffect } from "react";
import { PHASES, WEEKS, PASS } from "../../lib/learning";
import { getRec } from "../../lib/storage";
import { dmy } from "../../lib/format";
import PageHeader from "../../components/ui/PageHeader";
import Section from "../../components/ui/Section";
import Tag from "../../components/ui/Tag";
import CriteriaTable from "./CriteriaTable";
import WeekReview from "./WeekReview";
import "./track.css";

export default function TrackPage({ data, week, go, startPhase, openWeek: initialWeek }) {
  const [openWeek, setOpenWeek] = useState(initialWeek ?? week);
  const [recs, setRecs] = useState({});    // { [week]: objectURL }

  useEffect(() => {
    const urls = {}; let alive = true;
    Promise.all(WEEKS.map((w) => getRec('w' + w.week).then((b) => { if (b) urls[w.week] = URL.createObjectURL(b); }).catch(() => {})))
      .then(() => { if (alive) setRecs(urls); });
    return () => { alive = false; Object.values(urls).forEach((u) => URL.revokeObjectURL(u)); };
  }, []);

  async function clearAll() {
    if (!window.confirm('Xoá toàn bộ tiến độ, cụm từ, đánh giá và bản ghi âm? Không thể hoàn tác.')) return;
    await data.clearAll();
    go('home');
  }

  return (<>
    <PageHeader kicker="Theo dõi kết quả mỗi tuần" title={<>Bạn có thực sự <em>tiến bộ?</em></>}>
      Cuối mỗi tuần tự chấm 5 tiêu chí (1 = chưa đạt, 5 = đạt mục tiêu). Mỗi Chủ nhật ghi âm lại cùng một chủ đề và nghe so sánh với tuần trước.
    </PageHeader>

    <Section title="Đánh giá cuối giai đoạn" meta={`đạt từ ${PASS}%`}>
      <div className="divided">
        {PHASES.map((p) => {
          const tries = data.phaseRes[p.n] || []; const best = data.bestPhase(p.n);
          return (
            <div key={p.n} className="row between phase-row">
              <div className="grow">
                <div className="row"><span className="h3">Giai đoạn {p.n} · {p.name}</span><Tag>{p.level}</Tag>
                  {best != null && <Tag tone={best >= PASS ? 'ok' : 'warn'}>{best >= PASS ? 'đạt' : 'chưa đạt'} · {best}%</Tag>}</div>
                <div className="small muted" style={{ marginTop: 2 }}>
                  {tries.length ? tries.slice(-4).map((t) => `${dmy(t.date).slice(0, 5)}: ${t.total ?? '—'}%${t.level ? ` (${t.level})` : ''}`).join(' · ') : `Nên làm vào cuối tuần ${p.weeks[1]}.`}
                </div>
              </div>
              <button className="btn btn-sm" onClick={() => startPhase(p.n)}>{tries.length ? 'Làm lại' : 'Làm bài'}</button>
            </div>
          );
        })}
      </div>
    </Section>

    <Section title="Điểm tự chấm theo tuần">
      <CriteriaTable data={data} week={week} />
    </Section>

    <Section title="Chấm từng tuần">
      {Array.from({ length: week }, (_, i) => week - i).map((w) => (
        <WeekReview key={w} w={w} current={w === week} open={openWeek === w} onToggle={() => setOpenWeek(openWeek === w ? 0 : w)} data={data} recs={recs} />
      ))}
    </Section>

    <div className="danger-zone">
      <button className="btn btn-sm btn-ghost btn-bad" onClick={clearAll}>Xoá toàn bộ dữ liệu và bắt đầu lại</button>
    </div>
  </>);
}
