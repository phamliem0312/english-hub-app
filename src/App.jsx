import { useState, useEffect } from "react";
import { todayStr, dayNumber, weekOf, dateOfDay, isDue, phaseOf, PHASE_TESTS } from "./lib/learning";
import { useAppData } from "./hooks/useAppData";
import Sidebar from "./components/layout/Sidebar";
import TabBar from "./components/layout/TabBar";
import TodayPage from "./pages/today/TodayPage";
import ContentsPage from "./pages/contents/ContentsPage";
import PlanPage from "./pages/plan/PlanPage";
import SpeakPage from "./pages/speak/SpeakPage";
import PhrasesPage from "./pages/phrases/PhrasesPage";
import TrackPage from "./pages/track/TrackPage";
import DailyQuiz from "./pages/tests/DailyQuiz";
import PhaseTest from "./pages/tests/PhaseTest";

const PAGES = ['home', 'toc', 'plan', 'speak', 'phrases', 'track'];
const initialRoute = () => { const p = location.hash.slice(1); return { page: PAGES.includes(p) ? p : 'home' }; };

export default function App() {
  const data = useAppData();
  // route = { page, ...tham số của trang }
  const [route, setRoute] = useState(initialRoute);
  useEffect(() => {
    const onPop = () => setRoute(initialRoute());
    window.addEventListener('hashchange', onPop);
    return () => window.removeEventListener('hashchange', onPop);
  }, []);
  if (!data.ready) return <div className="loading">Đang tải…</div>;

  const today = todayStr();
  const day = dayNumber(data.start, today);
  const week = weekOf(day);
  const due = data.phrases.filter(isDue);

  const go = (page, params = {}) => {
    setRoute({ page, ...params });
    // Chỉ trang (không tham số) lên URL: F5 / nút Back giữ đúng trang.
    if (page !== 'test' && location.hash !== '#' + page) history.pushState(null, '', '#' + page);
    window.scrollTo?.(0, 0);
  };
  const openDay = (n) => { const d = dateOfDay(data.start, Math.max(1, n)); go('home', { date: d === today ? null : d }); };
  const startPhase = (n) => go('test', { test: { type: 'phase', n } });
  const ctx = { data, today, day, week, due, go, openDay, startPhase };
  const t = route.test;

  return (
    <div className="shell">
      <Sidebar page={route.page} go={go} badges={{ phrases: due.length }} week={week} daysDone={data.daysDone} />
      <main className="main" key={route.page + (route.date || '')}>
        {route.page === 'home' && <TodayPage {...ctx} date={route.date || today} />}
        {route.page === 'toc' && <ContentsPage {...ctx} />}
        {route.page === 'plan' && <PlanPage {...ctx} />}
        {route.page === 'speak' && <SpeakPage {...ctx} sample={route.sample} />}
        {route.page === 'phrases' && <PhrasesPage {...ctx} autoReview={route.review} />}
        {route.page === 'track' && <TrackPage {...ctx} openWeek={route.week} />}
        {route.page === 'test' && t.type === 'day' && (
          <DailyQuiz day={t.day} level={phaseOf(weekOf(t.day)).level}
            onSave={(r) => data.saveQuiz(t.date, r)}
            onClose={() => go('home', { date: t.date === today ? null : t.date })} />
        )}
        {route.page === 'test' && t.type === 'phase' && (
          <PhaseTest test={PHASE_TESTS[t.n - 1]} onSave={(r) => data.savePhase(t.n, r)} onClose={() => go('track')} />
        )}
      </main>
      <TabBar page={route.page} go={go} badges={{ phrases: due.length }} />
    </div>
  );
}
