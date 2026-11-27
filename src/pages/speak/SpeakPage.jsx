import { useState, useMemo } from "react";
import { WEEKS, SAMPLES } from "../../lib/learning";
import PageHeader from "../../components/ui/PageHeader";
import Section from "../../components/ui/Section";
import ContentPicker from "./ContentPicker";
import Reader from "./Reader";
import Recorder from "./Recorder";
import SpeechCheck from "./SpeechCheck";
import RoleplayCard from "./RoleplayCard";
import { useReader, splitWords } from "./useReader";
import "./speak.css";

export default function SpeakPage({ data, week, today, sample }) {
  const W = WEEKS[week - 1];
  const init = SAMPLES.find((s) => s.id === sample);
  const [sel, setSel] = useState(init ? init.id : 'week');   // 'week' | sample id | 'custom'
  const [custom, setCustom] = useState('');
  const [text, setText] = useState(init ? init.text : '');
  const [sttLang, setSttLang] = useState('en-US');
  const reader = useReader();
  const words = useMemo(() => splitWords(text), [text]);
  const topic = sel === 'week' ? W.prompt : sel === 'custom' ? 'Free practice' : SAMPLES.find((s) => s.id === sel)?.title;

  function choose(id, t = '') { reader.stop(); setSel(id); setText(t); }

  return (<>
    <PageHeader kicker="Luyện nói mỗi ngày" title={<>Nghe, nhại <em>và ghi âm</em></>}>
      Đừng đợi giỏi mới bắt đầu nói. Mỗi ngày chọn một chủ đề và ghi âm 1–3 phút, hoặc shadowing theo một đoạn mẫu.
    </PageHeader>

    <Section icon="contents" tone="plum" title="Chọn nội dung">
      <ContentPicker sel={sel} week={week} W={W} custom={custom} setCustom={setCustom} choose={choose} />
    </Section>

    {sel === 'week' && (
      <Section icon="chat" title="Đề nói" meta="1–3 phút">
        <blockquote className="prompt">{W.prompt}</blockquote>
        <p className="footnote">Cần bài mẫu? Chọn <i>{SAMPLES[0].title}</i> ở trên, nghe vài lần rồi nói phiên bản của bạn.</p>
      </Section>
    )}

    {words.length > 0 && (
      <Section icon="volume" tone="blue" title="Nghe mẫu">
        <Reader text={text} words={words} reader={reader}
          onSave={sel !== 'custom' && sel !== SAMPLES[0].id ? () => data.addPhrases(text.split('\n').map((t) => ({ text: t }))) : null} />
      </Section>
    )}

    <Section icon="mic" title="Ghi âm">
      <Recorder week={week} today={today} hasModel={!!text} playModel={() => reader.play(text, words)} stopModel={reader.stop} />
    </Section>

    <Section icon="wave" tone="teal" title="Nhận dạng giọng nói">
      <SpeechCheck key={sel + '|' + text} text={text} topic={topic} lang={sttLang} setLang={setSttLang}
        onShadow={(t) => { setCustom(t); choose('custom', t); }} />
    </Section>

    <Section icon="chat" tone="plum" title="Luyện hội thoại với ChatGPT Voice">
      <RoleplayCard topic={topic} />
    </Section>

    <p className="footnote" style={{ textAlign: 'center', marginTop: 32 }}>Ghi âm và nhận dạng giọng nói cần Google Chrome và quyền micro.</p>
  </>);
}
