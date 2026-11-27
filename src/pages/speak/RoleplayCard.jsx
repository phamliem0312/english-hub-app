import { useState } from "react";
import { ROLEPLAY_PROMPT } from "../../lib/learning";
import Icon from "../../components/ui/Icon";

// Lời nhắn sẵn để luyện hội thoại với ChatGPT Voice.
export default function RoleplayCard({ topic }) {
  const [copied, setCopied] = useState(false);
  const prompt = ROLEPLAY_PROMPT(topic);
  const copy = () => navigator.clipboard?.writeText(prompt).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1800); }, () => {});

  return (
    <div className="card">
      <p className="dim">Yêu cầu AI đóng vai đồng nghiệp hoặc đối tác nước ngoài, nói ở trình độ A2 và sửa lỗi sau mỗi lượt trả lời. Sao chép lời nhắn dưới đây rồi dán vào ChatGPT:</p>
      <pre className="well prompt-box">{prompt}</pre>
      <button className="btn btn-sm" onClick={copy}><Icon name={copied ? 'check' : 'copy'} size={14} /> {copied ? 'Đã sao chép' : 'Sao chép'}</button>
    </div>
  );
}
