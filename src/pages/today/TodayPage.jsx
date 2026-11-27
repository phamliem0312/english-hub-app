import { dayNumber, weekOf, phaseOf, WEEKS, tasksFor, isSunday, PHASES, PASS, LISTEN_STEPS, PART_NAMES, SAMPLES, TOTAL_DAYS } from "../../lib/learning";
import { longDate, dmy, phaseTone } from "../../lib/format";
import Section from "../../components/ui/Section";
import Ring from "../../components/ui/Ring";
import Icon from "../../components/ui/Icon";
import TaskList from "./TaskList";
import "./today.css";

function Tile({ icon, tone, value, label, onClick }) {
  return (
    <button className={`tile tone-${tone}`} onClick={onClick}>
      <span className="icon-badge lg"><Icon name={icon} size={19} /></span>
      <span><b className="num">{value}</b><span>{label}</span></span>
    </button>
  );
}

export default function TodayPage({ data, today, day, week, due, go, openDay, startPhase, date }) {
  const viewing = date !== today;
  const isFuture = date > today;
  const vDay = dayNumber(data.start, date);
  const vWeek = weekOf(vDay);
  const vPhase = phaseOf(vWeek);
  const vW = WEEKS[vWeek - 1];
  const tasks = tasksFor(vDay);
  const checks = data.checks[date] || [];
  const doneCount = checks.filter(Boolean).length;
  const minutesDone = tasks.reduce((s, t, i) => s + (checks[i] ? t.min : 0), 0);
  const q = data.quiz[date];
  // Giai đoạn đã tới tuần cuối (hoặc đã qua) mà chưa có lần đánh giá nào đạt.
  const duePhase = PHASES.find((p) => week >= p.weeks[1] && !(data.phaseRes[p.n] || []).some((r) => r.total >= PASS));
  const best = duePhase && data.bestPhase(duePhase.n);
  const startQuiz = () => go('test', { test: { type: 'day', date, day: vDay } });

  return (<>
    <div className="kicker">{longDate(date)}{viewing && (isFuture ? ' · đang xem trước, chưa đánh dấu được' : ` · đang xem ngày ${dmy(date)}`)}</div>

    <section className={`hero tone-${phaseTone(vPhase.n)}`}>
      <div className="hero-main">
        <div className="hero-eyebrow">Giai đoạn {vPhase.n} · {vPhase.name} · {vPhase.level}</div>
        <h1 className="hero-title">Ngày {vDay}<span>/{TOTAL_DAYS}</span></h1>
        <div className="hero-topic">{vDay === 1 ? 'Getting Started — ' : ''}Tuần {vWeek}: {vW.topic}</div>
        <p className="hero-sub">Đầu ra của tuần: {vW.output.toLowerCase()}.</p>
        <div className="row hero-nav">
          <button className="btn btn-sm btn-icon" disabled={vDay <= 1} onClick={() => openDay(vDay - 1)} aria-label="Ngày trước"><Icon name="left" /></button>
          <button className="btn btn-sm btn-icon" disabled={vDay >= TOTAL_DAYS} onClick={() => openDay(vDay + 1)} aria-label="Ngày sau"><Icon name="right" /></button>
          <button className="btn btn-sm" onClick={() => go('toc')}><Icon name="contents" size={16} /> Mục lục</button>
          {viewing && <button className="btn btn-sm" onClick={() => go('home')}>Về hôm nay (ngày {day})</button>}
        </div>
      </div>
      <Ring value={doneCount * 20} size={136} stroke={9} label={`${doneCount}/5 khối học`}>
        <b className="num">{doneCount}<small>/5</small></b>
        <span>{minutesDone}/60 phút</span>
      </Ring>
    </section>

    <div className="tiles">
      <Tile icon="check" tone="ok" value={data.daysDone} label="ngày hoàn thành" onClick={() => go('toc')} />
      <Tile icon="phrases" tone="plum" value={data.phrases.length} label="cụm từ đã lưu" onClick={() => go('phrases')} />
      <Tile icon="repeat" tone="blue" value={due.length} label="cụm cần ôn" onClick={() => go('phrases', { review: true })} />
    </div>

    {!viewing && (duePhase || isSunday(today) || due.length > 0) && (
      <div className="section">
        {duePhase && (
          <div className="callout tone-accent">
            <span className="icon-badge lg"><Icon name="flag" size={19} /></span>
            <div className="grow">
              <div className="h3">Đánh giá giai đoạn {duePhase.n}: {duePhase.name}</div>
              <p className="dim">{best == null
                ? `Đã tới tuần ${duePhase.weeks[1]}. Làm bài đánh giá (mục tiêu ${duePhase.level}, khoảng 15 phút) trước khi sang giai đoạn tiếp theo.`
                : `Lần cao nhất ${best}%, chưa đạt ${PASS}%. Ôn lại các phần yếu rồi làm lại.`}</p>
              <div className="row"><button className="btn btn-primary" onClick={() => startPhase(duePhase.n)}>Làm bài đánh giá <Icon name="arrow" size={16} /></button></div>
            </div>
          </div>
        )}
        {isSunday(today) && (
          <div className="callout tone-ochre">
            <span className="icon-badge lg"><Icon name="mic" size={19} /></span>
            <div className="grow">
              <div className="h3">Chủ nhật: ghi âm so sánh</div>
              <p className="dim">Ghi âm lại cùng một chủ đề (ví dụ <i>Introduce yourself</i>) rồi lưu làm bản ghi tuần {week} để so với tuần trước. Sau đó tự chấm 5 tiêu chí.</p>
              <div className="row">
                <button className="btn btn-primary" onClick={() => go('speak', { sample: SAMPLES[0].id })}>Ghi âm ngay</button>
                <button className="btn" onClick={() => go('track', { week })}>Chấm tuần {week}</button>
              </div>
            </div>
          </div>
        )}
        {due.length > 0 && (
          <div className="callout tone-ok">
            <span className="icon-badge lg"><Icon name="repeat" size={19} /></span>
            <div className="grow">
              <div className="h3">{due.length} cụm từ đến hạn ôn</div>
              <p className="dim">Nhìn nghĩa, nói to cụm tiếng Anh, rồi tự đặt một câu.</p>
              <div className="row"><button className="btn btn-primary" onClick={() => go('phrases', { review: true })}>Ôn ngay</button></div>
            </div>
          </div>
        )}
      </div>
    )}

    <Section icon="today" title={viewing ? `Lịch học ngày ${vDay}` : 'Lịch học hôm nay'} meta="5 khối · 60 phút">
      <TaskList tasks={tasks} checks={checks} disabled={isFuture} onToggle={(i) => data.toggleTask(date, i)} go={go} />
      {doneCount > 0 && (
        <button className="btn btn-sm btn-ghost" onClick={() => { if (window.confirm(`Bỏ đánh dấu toàn bộ việc của ngày ${vDay}?`)) data.resetDay(date); }}>
          Đặt lại ngày này
        </button>
      )}
    </Section>

    <Section icon="target" tone="teal" title="Kiểm tra cuối ngày" meta="khoảng 5 phút">
      {q ? (
        <div className="card row between">
          <div>
            <div className={`score-big num ${q.total >= PASS ? 'ok' : 'warn'}`}>{q.total ?? '—'}%</div>
            <p className="small muted" style={{ marginTop: 6 }}>
              {q.total >= PASS ? 'Đạt · ' : ''}{PART_NAMES.dict} {q.dict ?? '—'}% · {PART_NAMES.reflex} {q.reflex == null ? 'bỏ qua' : `${q.reflex}%`}
            </p>
          </div>
          <button className="btn" onClick={startQuiz}>Làm lại</button>
        </div>
      ) : (
        <div className="card quiz-card tone-teal">
          <p className="dim">3 câu nghe – chép và 2 câu hỏi phản xạ theo chủ đề tuần {vWeek}. Làm sau khi xong 5 khối học.</p>
          <div className="row mt"><button className="btn btn-primary" disabled={isFuture} onClick={startQuiz}>Bắt đầu kiểm tra <Icon name="arrow" size={16} /></button></div>
        </div>
      )}
    </Section>

    <Section icon="volume" tone="blue" title="Nghe một đoạn 2–3 phút" meta="theo 4 bước">
      <ol className="steps tone-blue">{LISTEN_STEPS.map((s) => <li key={s}>{s}</li>)}</ol>
      <p className="footnote">Không nghe thụ động hàng giờ. Điều quan trọng là chuyển những gì nghe được thành khả năng nói.</p>
    </Section>
  </>);
}
