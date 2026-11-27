import Icon from "./Icon";

// Nút bật/tắt micro dùng chung cho mọi phần nói.
export default function MicButton({ listening, onClick, disabled, children = 'Trả lời bằng giọng nói', className = '' }) {
  return (
    <button className={`btn btn-block ${listening ? 'btn-accent' : 'btn-primary'} ${className}`} onClick={onClick} disabled={disabled}>
      {listening ? <><span className="live-dot pulse" /> Dừng</> : <><Icon name="mic" /> {children}</>}
    </button>
  );
}

// Ô hiện lời đang nhận dạng + nút micro.
export function MicBox({ stt, onDone, label }) {
  return (<>
    <div className="transcript" style={{ margin: '12px 0' }}>
      {stt.text || <span className="placeholder">{stt.listening ? 'Đang nghe…' : 'Lời bạn nói hiện ở đây…'}</span>}
    </div>
    <MicButton listening={stt.listening} onClick={() => (stt.listening ? stt.stop() : stt.start(onDone))}>{label}</MicButton>
  </>);
}
