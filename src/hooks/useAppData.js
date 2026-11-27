// Toàn bộ dữ liệu học được lưu lại (tiến độ, cụm từ, đánh giá, điểm kiểm tra) và các thao tác trên nó.
import { useState, useEffect } from "react";
import { todayStr, nextRev, grade, dateOfDay, dayDone } from "../lib/learning";
import { load, save, clearRecs } from "../lib/storage";

export function useAppData() {
  const [ready, setReady] = useState(false);
  const [start, setStart] = useState(todayStr());
  const [checks, setChecks] = useState({});       // { 'YYYY-MM-DD': [bool×5] }
  const [phrases, setPhrases] = useState([]);
  const [log, setLog] = useState({});             // { [week]: { r: {criterionId: 1..5}, note } }
  const [quiz, setQuiz] = useState({});           // { date: { dict, reflex, total } }
  const [phaseRes, setPhaseRes] = useState({});   // { n: [{ date, parts, total, level }] }

  useEffect(() => {
    (async () => {
      let s = await load('eh2_start');
      if (!s) { s = todayStr(); await save('eh2_start', s); }
      setStart(s);
      setChecks(await load('eh2_checks', {}));
      setPhrases(await load('eh2_phrases', []));
      setLog(await load('eh2_log', {}));
      setQuiz(await load('eh2_quiz', {}));
      setPhaseRes(await load('eh2_phase', {}));
      setReady(true);
    })();
  }, []);

  const put = (key, set) => (v) => { set(v); return save(key, v); };
  const putChecks = put('eh2_checks', setChecks);
  const putPhrases = put('eh2_phrases', setPhrases);
  const putLog = put('eh2_log', setLog);

  return {
    ready, start, checks, phrases, log, quiz, phaseRes,
    daysDone: Object.keys(checks).filter((d) => dayDone(checks, d)).length,

    changeStart(v) { if (v && v <= todayStr()) put('eh2_start', setStart)(v); },
    toggleTask(date, i) {
      const arr = [0, 1, 2, 3, 4].map((k) => !!checks[date]?.[k]);
      arr[i] = !arr[i];
      putChecks({ ...checks, [date]: arr });
    },
    resetDay(date) { const nc = { ...checks }; delete nc[date]; putChecks(nc); },

    // Thêm cụm mới (bỏ qua cụm trùng), trả về số cụm đã thêm.
    addPhrases(list) {
      const have = new Set(phrases.map((p) => p.text.toLowerCase()));
      const fresh = [];
      for (const x of list) {
        const text = x.text.trim(), k = text.toLowerCase();
        if (text && !have.has(k)) { have.add(k); fresh.push({ ...x, text }); }
      }
      if (!fresh.length) return 0;
      const today = todayStr();
      putPhrases([...phrases, ...fresh.map((x) => ({
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        text: x.text, note: x.note || '', added: today, reviewCount: 0, nextReview: nextRev(0), mastered: false,
      }))]);
      return fresh.length;
    },
    deletePhrase(id) { putPhrases(phrases.filter((p) => p.id !== id)); },
    gradePhrase(id, ok) { putPhrases(phrases.map((x) => (x.id === id ? grade(x, ok) : x))); },

    setRating(w, cid, v) {
      const cur = log[w] || { r: {}, note: '' };
      putLog({ ...log, [w]: { ...cur, r: { ...cur.r, [cid]: v } } });
    },
    setNote(w, note) { putLog({ ...log, [w]: { r: {}, ...log[w], note } }); },

    saveQuiz(date, r) { put('eh2_quiz', setQuiz)({ ...quiz, [date]: r }); },
    savePhase(n, r) { put('eh2_phase', setPhaseRes)({ ...phaseRes, [n]: [...(phaseRes[n] || []), { date: todayStr(), ...r }] }); },
    bestPhase(n) {
      const t = (phaseRes[n] || []).map((r) => r.total).filter((x) => typeof x === 'number');
      return t.length ? Math.max(...t) : null;
    },
    weekQuizAvg(w) {
      const t = Array.from({ length: 7 }, (_, i) => quiz[dateOfDay(start, (w - 1) * 7 + i + 1)]?.total).filter((x) => typeof x === 'number');
      return t.length ? Math.round(t.reduce((s, x) => s + x, 0) / t.length) : null;
    },

    async clearAll() {
      const s = todayStr();
      await Promise.all([save('eh2_start', s), save('eh2_checks', {}), save('eh2_phrases', []), save('eh2_log', {}), save('eh2_quiz', {}), save('eh2_phase', {})]);
      try { await clearRecs(); } catch { /* không có IndexedDB */ }
      setStart(s); setChecks({}); setPhrases([]); setLog({}); setQuiz({}); setPhaseRes({});
    },
  };
}
