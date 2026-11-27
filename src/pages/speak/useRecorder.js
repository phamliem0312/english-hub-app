// Ghi âm từ micro, vẽ sóng âm lên canvas.
import { useState, useEffect, useRef, useCallback } from "react";

const cssVar = (el, name) => getComputedStyle(el).getPropertyValue(name).trim();

export function useRecorder(maxSecs = 300) {
  const [state, setState] = useState('idle');   // idle | recording | done
  const [url, setUrl] = useState(null);
  const [blob, setBlob] = useState(null);
  const [secs, setSecs] = useState(0);
  const canvasRef = useRef(null);
  const r = useRef({});                         // mr, stream, actx, an, raf, timer, secs

  const drawIdle = useCallback(() => {
    const cv = canvasRef.current; if (!cv) return;
    const ctx = cv.getContext('2d'); cv.width = cv.offsetWidth || 600; const W = cv.width, H = cv.height;
    ctx.clearRect(0, 0, W, H); ctx.lineWidth = 1.5; ctx.strokeStyle = cssVar(cv, '--rule-2'); ctx.beginPath();
    for (let x = 0; x <= W; x++) { const y = H / 2 + Math.sin(x * .045) * 2.5; if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y); }
    ctx.stroke();
  }, []);

  function drawWave() {
    const cv = canvasRef.current, an = r.current.an; if (!cv || !an) return;
    const ctx = cv.getContext('2d'); cv.width = cv.offsetWidth || 600; const W = cv.width, H = cv.height;
    const color = cssVar(cv, '--accent'); const data = new Uint8Array(an.frequencyBinCount);
    const draw = () => {
      r.current.raf = requestAnimationFrame(draw);
      an.getByteTimeDomainData(data);
      ctx.clearRect(0, 0, W, H); ctx.lineWidth = 2; ctx.strokeStyle = color; ctx.beginPath();
      const sl = W / data.length;
      data.forEach((v, i) => { const y = v / 128 * H / 2; if (i === 0) ctx.moveTo(0, y); else ctx.lineTo(i * sl, y); });
      ctx.lineTo(W, H / 2); ctx.stroke();
    };
    draw();
  }

  // Tắt micro, đồng hồ, sóng âm. Không đụng state nên gọi được cả lúc unmount.
  const release = () => {
    const c = r.current;
    if (c.mr && c.mr.state !== 'inactive') c.mr.stop();
    c.stream?.getTracks().forEach((t) => t.stop()); c.stream = null;
    try { c.actx?.close(); } catch { /* đã đóng */ }
    c.actx = c.an = null;
    clearInterval(c.timer); cancelAnimationFrame(c.raf);
  };
  function stop() { release(); setTimeout(drawIdle, 60); }

  async function start() {
    let stream;
    try { stream = await navigator.mediaDevices.getUserMedia({ audio: true }); }
    catch { alert('Không truy cập được microphone. Hãy cho phép quyền micro trong trình duyệt (nên dùng Google Chrome).'); return false; }
    const c = r.current; c.stream = stream;
    try {
      const ac = new (window.AudioContext || window.webkitAudioContext)(); const an = ac.createAnalyser(); an.fftSize = 512;
      ac.createMediaStreamSource(stream).connect(an); c.actx = ac; c.an = an;
    } catch { /* không có sóng âm vẫn ghi được */ }
    const mime = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'].find((t) => { try { return MediaRecorder.isTypeSupported(t); } catch { return false; } }) || '';
    let mr; try { mr = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream); } catch { mr = new MediaRecorder(stream); }
    c.mr = mr; const chunks = [];
    mr.ondataavailable = (e) => { if (e.data && e.data.size > 0) chunks.push(e.data); };
    mr.onstop = () => {
      const b = new Blob(chunks, { type: mr.mimeType || 'audio/webm' });
      setBlob(b); setUrl(URL.createObjectURL(b)); setState('done');
    };
    mr.start(100); setState('recording'); setSecs(0); c.secs = 0;
    c.timer = setInterval(() => { c.secs += 1; setSecs(c.secs); if (c.secs >= maxSecs) stop(); }, 1000);
    drawWave();
    return true;
  }

  useEffect(() => { const t = setTimeout(drawIdle, 80); return () => clearTimeout(t); }, [drawIdle]);
  useEffect(() => () => { if (url) URL.revokeObjectURL(url); }, [url]);
  useEffect(() => release, []);

  return { state, url, blob, secs, canvasRef, start, stop };
}
