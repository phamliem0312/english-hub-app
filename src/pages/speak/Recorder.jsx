import { useState, useRef } from "react";
import { SELF_CHECK } from "../../lib/learning";
import { putRec } from "../../lib/storage";
import { mmss } from "../../lib/format";
import Icon from "../../components/ui/Icon";
import Tag from "../../components/ui/Tag";
import { useRecorder } from "./useRecorder";

// Ghi âm, nghe xen kẽ với giọng mẫu, lưu làm bản ghi tuần, tự kiểm tra.
export default function Recorder({ week, today, hasModel, playModel, stopModel }) {
  const { state, url, blob, secs, canvasRef, start, stop } = useRecorder();
  const audioRef = useRef(null);
  const [saved, setSaved] = useState('');
  const [selfCheck, setSelfCheck] = useState(SELF_CHECK.map(() => false));
  const recording = state === 'recording';

  async function toggle() {
    if (recording) return stop();
    stopModel(); setSaved(''); setSelfCheck(SELF_CHECK.map(() => false));
    await start();
  }
  async function saveWeek() {
    try { await putRec('w' + week, blob); setSaved(`Đã lưu làm bản ghi tuần ${week}.`); }
    catch { setSaved('Không lưu được (trình duyệt chặn IndexedDB). Hãy dùng nút Tải về.'); }
  }

  return (
    <div className="card">
      <div className="row between" style={{ marginBottom: 12 }}>
        <span className="small muted">Mục tiêu 1–3 phút</span>
        {recording && <span className={`tag ${secs >= 60 ? 'ok' : 'bad'}`}><span className="live-dot pulse" /> {mmss(secs)}</span>}
        {state === 'done' && <Tag tone="ok"><Icon name="check" size={12} /> {mmss(secs)}</Tag>}
      </div>
      <canvas ref={canvasRef} height="64" className="wave" />
      <button className={`btn btn-block btn-lg ${recording ? 'btn-accent' : 'btn-primary'}`} onClick={toggle}>
        {recording ? <><Icon name="stop" size={14} /> Dừng ghi âm</> : <><Icon name="mic" /> Bắt đầu ghi âm</>}
      </button>

      {state === 'done' && url && (
        <div className="rec-result">
          <audio ref={audioRef} src={url} controls />
          <div className="row">
            {hasModel && <button className="btn btn-sm" onClick={() => { audioRef.current?.pause(); playModel(); }}><Icon name="play" size={12} /> Giọng mẫu</button>}
            {hasModel && <button className="btn btn-sm" onClick={() => { stopModel(); if (audioRef.current) { audioRef.current.currentTime = 0; audioRef.current.play(); } }}><Icon name="play" size={12} /> Của tôi</button>}
            <button className="btn btn-sm" onClick={saveWeek}><Icon name="save" size={14} /> Lưu làm bản ghi tuần {week}</button>
            <a className="btn btn-sm btn-ghost" href={url} download={`english-${today}.${(blob?.type || '').includes('mp4') ? 'm4a' : 'webm'}`}><Icon name="download" size={14} /> Tải về</a>
          </div>
          {saved && <p className="small ok">{saved}</p>}
          <div>
            <div className="label" style={{ marginBottom: 6 }}>Nghe lại và tự kiểm tra</div>
            {SELF_CHECK.map((q, i) => (
              <label key={q} className="row nowrap small" style={{ padding: '5px 0', cursor: 'pointer' }}>
                <input type="checkbox" className="check-sm" checked={selfCheck[i]} onChange={() => setSelfCheck(selfCheck.map((v, k) => (k === i ? !v : v)))} />{q}
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
