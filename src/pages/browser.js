// Dùng chung cho các trang: đọc (TTS), gọi AI, nhận dạng giọng nói (STT).
import { useState, useRef } from "react";

// ─── TTS ───────────────────────────────────────────────────────────────────────
const enVoices = () => ('speechSynthesis' in window ? speechSynthesis.getVoices().filter(v => v.lang.startsWith('en')) : []);
const bestVoice = (vs) => vs.find(v => v.name.includes('Google')) || vs[0];

export function speak(text, rate = 0.82) {
  if (!('speechSynthesis' in window)) return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'en-US'; u.rate = rate;
  const vs = enVoices();
  if (vs.length) u.voice = bestVoice(vs);
  speechSynthesis.speak(u);
}

// Đọc hội thoại: mỗi người nói một giọng (nếu máy có từ 2 giọng tiếng Anh). onEnd gọi khi đọc xong câu cuối.
export function speakLines(lines, rate = 0.85, onEnd) {
  if (!('speechSynthesis' in window)) return;
  speechSynthesis.cancel();
  const vs = enVoices(); const a = bestVoice(vs); const b = vs.find(v => v !== a) || a;
  const speakers = [...new Set(lines.map(l => l.speaker))];
  lines.forEach((l, i) => {
    const u = new SpeechSynthesisUtterance(l.text);
    u.lang = 'en-US'; u.rate = rate;
    if (a) u.voice = speakers.indexOf(l.speaker) % 2 ? b : a;
    if (i === lines.length - 1 && onEnd) { u.onend = onEnd; u.onerror = onEnd; }
    speechSynthesis.speak(u);
  });
}

// ─── AI ────────────────────────────────────────────────────────────────────────
// Trong Claude Artifact gọi thẳng API; ở ngoài đi qua proxy giữ API key (server/ai-proxy.js).
const AI_URL = window.storage ? "https://api.anthropic.com/v1/messages" : "/api/messages";
export async function askAI(prompt) {
  const res = await fetch(AI_URL, {
    method:"POST", headers:{"Content-Type":"application/json"},
    body:JSON.stringify({ model:"claude-sonnet-4-6", max_tokens:4000, messages:[{role:"user",content:prompt}] })
  });
  const data = await res.json();
  const text = data.content?.find(b => b.type === 'text')?.text || '';
  return JSON.parse(text.replace(/```json|```/g, '').trim());
}

// ─── STT ───────────────────────────────────────────────────────────────────────
// text: kết quả đang nhận (phần chưa chốt nằm trong ⟨⟩); final: kết quả chốt sau khi dừng; onDone(final) gọi lúc dừng.
export function useStt(lang = 'en-US') {
  const [listening, setListening] = useState(false);
  const [text, setText] = useState('');
  const [final, setFinal] = useState('');
  const ref = useRef(null);
  const detach = () => { if (ref.current) { ref.current.onend = ref.current.onresult = ref.current.onerror = null; ref.current.abort(); ref.current = null; } };
  function start(onDone) {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { alert('Nhận dạng giọng nói chỉ chạy trên Google Chrome.'); return; }
    if ('speechSynthesis' in window) speechSynthesis.cancel();
    detach();
    const r = new SR(); ref.current = r; r.lang = lang; r.continuous = true; r.interimResults = true;
    let fin = '';
    r.onresult = (ev) => {
      let interim = ''; fin = '';
      for (let i = 0; i < ev.results.length; i++) {
        if (ev.results[i].isFinal) fin += ev.results[i][0].transcript + ' '; else interim += ev.results[i][0].transcript;
      }
      setText(fin + (interim ? '⟨' + interim + '⟩' : ''));
    };
    r.onend = () => { ref.current = null; setListening(false); setFinal(fin.trim()); onDone?.(fin.trim()); };
    r.onerror = (e) => { if (e.error === 'not-allowed') alert('Không có quyền micro.'); };
    setText(''); setFinal('');
    r.start(); setListening(true);
  }
  const stop = () => ref.current?.stop();
  const reset = () => { detach(); setText(''); setFinal(''); setListening(false); };
  return { listening, text, final, start, stop, reset };
}
