// Đọc mẫu bằng giọng máy, tô sáng từ đang đọc.
import { useState, useEffect, useRef } from "react";

export const splitWords = (text) => {
  const re = /\S+/g; const out = []; let m;
  while ((m = re.exec(text)) !== null) out.push({ w: m[0], s: m.index, e: m.index + m[0].length });
  return out;
};

export function useReader() {
  const [voices, setVoices] = useState([]);
  const [voice, setVoice] = useState(0);
  const [rate, setRate] = useState(0.8);
  const [playing, setPlaying] = useState(false);
  const [hi, setHi] = useState(-1);          // từ đang đọc; -1 = chưa đọc, Infinity = đọc xong
  const cur = useRef(null);                  // utterance đang chạy, để bỏ qua sự kiện của lượt đã huỷ

  useEffect(() => {
    if (!('speechSynthesis' in window)) return;
    const lv = () => {
      const v = speechSynthesis.getVoices().filter((x) => x.lang.startsWith('en'));
      v.sort((a, b) => b.name.includes('Google') - a.name.includes('Google'));
      setVoices(v);
    };
    speechSynthesis.onvoiceschanged = lv; lv();
    return () => { speechSynthesis.onvoiceschanged = null; speechSynthesis.cancel(); };
  }, []);

  function play(text, words) {
    if (!text || !('speechSynthesis' in window)) return;
    speechSynthesis.cancel(); setHi(-1);
    const u = new SpeechSynthesisUtterance(text);
    cur.current = u;
    u.lang = 'en-US'; u.rate = rate; if (voices[voice]) u.voice = voices[voice];
    u.onboundary = (e) => {
      if (e.name !== 'word' || cur.current !== u) return;
      const f = words.findIndex((w) => e.charIndex >= w.s && e.charIndex < w.e + 2);
      if (f !== -1) setHi(f);
    };
    u.onstart = () => { if (cur.current === u) setPlaying(true); };
    u.onend = () => { if (cur.current === u) { setPlaying(false); setHi(Infinity); } };
    u.onerror = () => { if (cur.current === u) setPlaying(false); };
    speechSynthesis.speak(u);
  }
  function stop() {
    cur.current = null;
    if ('speechSynthesis' in window) speechSynthesis.cancel();
    setPlaying(false); setHi(-1);
  }

  return { voices, voice, setVoice, rate, setRate, playing, hi, play, stop };
}
