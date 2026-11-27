// Logic học thuần (không React/DOM) — test bằng `npm test`.

// ─── Ngày tháng ─────────────────────────────────────────────────────────────
// Ngày theo giờ máy (không dùng toISOString vì đó là giờ UTC: 0h–7h sáng ở VN sẽ bị tính là hôm qua).
const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const addDays = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return ymd(d); };
export const todayStr = () => addDays(0);
const parse = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };

// Ngày học thứ mấy kể từ ngày bắt đầu (ngày bắt đầu = ngày 1). Math.round để không lệch khi đổi giờ mùa hè.
export const dayNumber = (start, today = todayStr()) => Math.max(1, Math.round((parse(today) - parse(start)) / 864e5) + 1);
export const dateOfDay = (start, n) => { const d = parse(start); d.setDate(d.getDate() + n - 1); return ymd(d); };
export const weekOf = (day) => Math.min(12, Math.ceil(day / 7));
export const TOTAL_DAYS = 84;
export const isSunday = (date = todayStr()) => parse(date).getDay() === 0;

// ─── Spaced repetition (ôn cụm từ) ──────────────────────────────────────────
export const GAPS = [1, 3, 7, 14, 30];
export const RECHECK_DAYS = 90; // cụm đã thành thạo vẫn được kiểm tra lại định kỳ
export const nextRev = (c) => addDays(GAPS[Math.min(c, GAPS.length - 1)]);
export const isDue = (w) => w.nextReview <= todayStr();

// Đã nhớ → lên một bậc; Chưa nhớ → về bậc đầu (ôn lại ngày mai).
export function grade(w, ok) {
  const c = ok ? w.reviewCount + 1 : 0;
  const mastered = c >= GAPS.length;
  return { ...w, reviewCount: c, mastered, nextReview: mastered ? addDays(RECHECK_DAYS) : nextRev(c) };
}

// ─── Chấm shadowing ─────────────────────────────────────────────────────────
const tokens = (s) => s.toLowerCase().replace(/['’]/g, '').split(/[^\p{L}\p{N}]+/u).filter(Boolean);

// So khớp theo thứ tự (LCS). Điểm = số từ của bài gốc đọc đúng / tổng số từ bài gốc.
export function scoreReading(original, spoken) {
  const a = tokens(original), b = tokens(spoken);
  const L = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
  for (let i = a.length - 1; i >= 0; i--)
    for (let j = b.length - 1; j >= 0; j--)
      L[i][j] = a[i] === b[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
  const okA = a.map(() => false), okB = b.map(() => false);
  for (let i = 0, j = 0; i < a.length && j < b.length;) {
    if (a[i] === b[j]) { okA[i] = okB[j] = true; i++; j++; }
    else if (L[i + 1][j] >= L[i][j + 1]) i++;
    else j++;
  }
  return {
    spoken: b.map((w, j) => ({ w, ok: okB[j] })),
    missed: [...new Set(a.filter((_, i) => !okA[i]))],
    correct: L[0][0],
    total: a.length,
    pct: a.length ? Math.round((L[0][0] / a.length) * 100) : 0,
  };
}

// ─── Tài liệu ───────────────────────────────────────────────────────────────
export const LINKS = {
  levelTest: 'https://learnenglish.britishcouncil.org/online-english-level-test',
  voa: 'https://learningenglish.voanews.com/p/5644.html',
  bcListening: 'https://learnenglish.britishcouncil.org/skills/listening',
  bcSpeaking: 'https://learnenglish.britishcouncil.org/skills/speaking',
  bbc: 'https://www.bbc.co.uk/learningenglish/',
  bbc6min: 'https://www.bbc.co.uk/learningenglish/english/features/6-minute-english',
  bbcWork: 'https://www.bbc.co.uk/learningenglish/english/features/english-at-work',
};

export const RESOURCES = [
  { group: 'Luyện nghe cơ bản', name: 'VOA Learning English', when: 'Ưu tiên tuần 1–4', url: LINKS.voa,
    points: ["Khoá Let's Learn English Level 1 (52 bài theo tuần, cho người mới bắt đầu)", 'Video hội thoại đời sống', 'Có bài học, từ vựng và bài luyện tập'] },
  { group: 'Luyện nghe cơ bản', name: 'British Council – Listening', when: 'Ưu tiên tuần 1–8', url: LINKS.bcListening,
    points: ['Listening A1, A2, B1', 'Hội thoại giao tiếp và tình huống công việc', 'Có bài tập kiểm tra nghe hiểu'] },
  { group: 'Luyện nói và phản xạ', name: 'British Council – Speaking', when: 'Tuần 5–12', url: LINKS.bcSpeaking,
    points: ['Luyện hội thoại theo từng cấp độ', 'Học cách đặt câu hỏi, trả lời và đưa ra ý kiến', 'Phù hợp để luyện phản xạ giao tiếp'] },
  { group: 'Luyện nói và phản xạ', name: 'BBC Learning English', when: 'Thêm khi nghe đã tốt hơn', url: LINKS.bbc,
    points: ['Real Easy English: làm quen hội thoại tự nhiên', '6 Minute English: luyện nghe, mở rộng từ vựng', 'English at Work: hội thoại công sở'] },
];

// ─── Lộ trình 12 tuần ───────────────────────────────────────────────────────
export const PHASES = [
  { n: 1, weeks: [1, 4], name: 'Nền tảng', level: 'A1–A2', goals: ['Nghe hiểu hội thoại ngắn, tốc độ chậm đến vừa', 'Làm quen với phát âm và ngữ điệu', 'Giới thiệu bản thân, công việc, sở thích', 'Nói được những câu giao tiếp đơn giản'] },
  { n: 2, weeks: [5, 8], name: 'Phản xạ', level: 'A2–B1', goals: ['Nghe hiểu các cuộc hội thoại thông thường', 'Nói về công việc, kinh nghiệm và quan điểm cá nhân', 'Biết đặt câu hỏi và phản hồi tự nhiên', 'Duy trì hội thoại khoảng 5 phút về chủ đề quen thuộc'] },
  { n: 3, weeks: [9, 12], name: 'Ứng dụng', level: 'Hướng đến B1', goals: ['Nghe hiểu nội dung chính trong cuộc họp quen thuộc', 'Trình bày tiến độ công việc', 'Trao đổi với khách hàng và đối tác', 'Giải thích vấn đề kỹ thuật bằng tiếng Anh đơn giản'] },
];
export const phaseOf = (week) => PHASES.find((p) => week >= p.weeks[0] && week <= p.weeks[1]);

// prompt: đề bài nói của tuần. lines: câu nghe – chép, qs: câu hỏi phản xạ (dùng cho kiểm tra cuối ngày).
export const WEEKS = [
  { week: 1,  topic: 'Greetings, Introduction', output: 'Giới thiệu bản thân',            prompt: 'Introduce yourself: your name, your job, where you work and why you are learning English.',
    lines: ['Nice to meet you.', "My name is Thanh and I'm a developer.", 'I work for a bank in Ho Chi Minh City.', "I'm learning English for my job."],
    qs: ["What's your name and what do you do?", 'Where are you from?', 'Where do you work?', 'Why are you learning English?'] },
  { week: 2,  topic: 'Daily Activities',        output: 'Kể về một ngày của bạn',          prompt: 'Describe a typical day: when you get up, how you go to work, what you do at work and in the evening.',
    lines: ['I usually get up at six thirty.', 'I go to work by motorbike.', 'I have lunch with my colleagues at noon.', 'In the evening, I often watch videos in English.'],
    qs: ['What time do you usually get up?', 'How do you get to work?', 'What do you do after work?', 'What did you do yesterday evening?'] },
  { week: 3,  topic: 'Family, Hobbies',         output: 'Nói về gia đình và sở thích',     prompt: 'Talk about your family and your hobbies. What do you like doing at the weekend?',
    lines: ['There are four people in my family.', 'My sister works as a nurse.', 'I like playing badminton at the weekend.', 'We often have dinner together on Sundays.'],
    qs: ['Tell me about your family.', 'What do you like doing in your free time?', 'What did you do last weekend?', 'Do you have any plans for this weekend?'] },
  { week: 4,  topic: 'Work, Job',               output: 'Giới thiệu công việc',            prompt: 'Describe your job: your company, your team, your main tasks and the technologies you use.',
    lines: ["I'm a backend developer in a team of eight people.", 'I mainly work with Java and Node.js.', 'I build APIs for our mobile banking app.', 'We have a short meeting every morning.'],
    qs: ['What does your company do?', 'What are your main responsibilities?', 'What technologies do you use?', 'What do you like about your job?'] },
  { week: 5,  topic: 'Communication',           output: 'Hỏi và trả lời tự nhiên',         prompt: 'Imagine you meet a new colleague. Ask them 5 questions, then answer the same questions about yourself.',
    lines: ['Sorry, could you say that again?', 'How long have you worked here?', 'That sounds interesting. Tell me more.', 'What do you usually do on your days off?'],
    qs: ['How long have you been working in IT?', 'What project are you working on now?', 'How do you usually communicate with your team?', "What do you do when you don't understand someone?"] },
  { week: 6,  topic: 'Opinions',                output: 'Trình bày ý kiến',                prompt: 'Do you prefer working from home or at the office? Give your opinion with two reasons and an example.',
    lines: ['In my opinion, working from home saves a lot of time.', 'I agree with you, but there is one problem.', "I don't think that's a good idea.", 'The main reason is that it improves productivity.'],
    qs: ['Do you prefer working from home or at the office? Why?', 'What do you think about AI tools for programmers?', 'Is it better to work in a big company or a startup?', 'Should developers learn English? Why?'] },
  { week: 7,  topic: 'Problem Solving',         output: 'Mô tả và giải quyết vấn đề',      prompt: 'Describe a problem you had at work. What happened, what did you do, and what was the result?',
    lines: ['The server went down this morning.', 'We found the cause after two hours.', 'I suggest we roll back the last release.', "Let's check the logs first."],
    qs: ['Tell me about a problem you had at work.', "What do you do when you're stuck on a bug?", 'How do you handle a tight deadline?', 'What would you do if a customer reported an urgent issue?'] },
  { week: 8,  topic: 'Meetings',                output: 'Luyện hội thoại trong cuộc họp',  prompt: 'You are in a team meeting. Share your update, ask one question, and politely disagree with one idea.',
    lines: ["Let's get started. Today we have three items.", 'Can I add something here?', 'I see your point, but I have a different view.', "Let's move on to the next topic."],
    qs: ['Can you give us a quick update on your task?', 'Do you have any questions about the plan?', 'What do you think about moving the release to next week?', 'Who will take care of the testing?'] },
  { week: 9,  topic: 'IT Vocabulary',           output: 'Từ vựng chuyên ngành IT',         prompt: 'Explain the system you work on: frontend, backend, database, APIs, and how a request flows through it.',
    lines: ['The frontend sends a request to the backend.', 'We store customer data in a PostgreSQL database.', 'The API returns the result in JSON format.', 'We deploy the application with Docker.'],
    qs: ['Can you describe the architecture of your system?', 'What database do you use and why?', 'How do you deploy your application?', 'What is an API? Explain it simply.'] },
  { week: 10, topic: 'Technical Discussion',    output: 'Giải thích vấn đề kỹ thuật',      prompt: 'Explain a technical issue in simple English: what the bug is, why it happens and how to fix it.',
    lines: ['The bug happens when two users update the same record.', 'The query is slow because there is no index.', 'We need to add more unit tests.', 'I think the root cause is a memory leak.'],
    qs: ['Can you explain the last bug you fixed?', 'Why might a web page load slowly?', 'How would you improve the performance of an API?', 'How do you make sure your code works correctly?'] },
  { week: 11, topic: 'Project Updates',         output: 'Báo cáo tiến độ dự án',           prompt: 'Give a project update: what you completed, what you are working on, what is next, and any blockers.',
    lines: ['We are on track to release next Friday.', 'The login feature is ninety percent done.', 'We are blocked by the payment team.', 'I will send the report by the end of the day.'],
    qs: ['What did you complete this week?', 'What are you working on now?', 'Are there any blockers?', 'When do you expect to finish your current task?'] },
  { week: 12, topic: 'Client Communication',    output: 'Trao đổi với khách hàng, đối tác', prompt: 'You are in a call with a client. Summarize the current status, explain an issue, and ask them to review a document.',
    lines: ['Thank you for joining the call today.', 'Could you review the attached document?', 'We will send you the updated version by Monday.', 'Please let us know if you have any questions.'],
    qs: ['Can you summarize the current status of the project?', 'When will the new feature be ready?', 'Why was the release delayed?', 'What do you need from us to continue?'] },
];

// ─── Kiểm tra ───────────────────────────────────────────────────────────────
export const PASS = 70; // % để coi là đạt
export const PART_NAMES = { dict: 'Nghe – chép', reflex: 'Phản xạ', listening: 'Nghe hiểu', shadowing: 'Shadowing', speaking: 'Nói 2 phút', recall: 'Nhớ cụm từ' };

// Chọn k phần tử xoay vòng theo seed: mỗi ngày một bộ khác, ổn định khi làm lại trong ngày.
export const pick = (arr, k, seed) => Array.from({ length: Math.min(k, arr.length) }, (_, i) => arr[(seed + i) % arr.length]);

// Kiểm tra cuối ngày: 3 câu nghe – chép + 2 câu hỏi phản xạ của tuần.
export function quizFor(day) {
  const w = WEEKS[weekOf(day) - 1];
  return { lines: pick(w.lines, 3, day), qs: pick(w.qs, 2, day) };
}

export const mcqScore = (questions, answers) =>
  questions.length ? Math.round((questions.filter((q, i) => answers[i] === q.answer).length / questions.length) * 100) : 0;

// Điểm tổng = trung bình các phần có điểm (phần bỏ qua / AI lỗi = null, không tính).
export function totalScore(parts) {
  const v = Object.values(parts).filter((x) => typeof x === 'number');
  return v.length ? Math.round(v.reduce((s, x) => s + x, 0) / v.length) : null;
}
export const weakParts = (parts) => Object.keys(parts).filter((k) => typeof parts[k] === 'number' && parts[k] < PASS);

export const PHASE_TESTS = [
  { n: 1, level: 'A1–A2', topics: 'introductions, daily routine, family and hobbies, describing your job',
    prompt: 'Introduce yourself and describe your job and a typical working day.',
    shadow: "Hello, my name is Thanh. I'm a software developer working in the banking industry.\nI mainly work with Java, PHP, and Node.js.\nMy responsibilities include developing backend systems and integrating APIs.\nMy goal is to speak English confidently in meetings and everyday conversations.",
    recall: [
      { vi: 'Rất vui được gặp bạn.', en: 'Nice to meet you.' },
      { vi: 'Tôi là lập trình viên phần mềm.', en: "I'm a software developer." },
      { vi: 'Tôi làm việc trong ngành ngân hàng.', en: 'I work in the banking industry.' },
      { vi: 'Bạn có thể nói lại được không?', en: 'Could you say that again?' },
      { vi: 'Vào cuối tuần tôi thích chơi thể thao.', en: 'I like playing sports at the weekend.' },
    ],
    fallback: {
      lines: [
        { speaker: 'A', text: 'Hi, are you the new developer?' },
        { speaker: 'B', text: 'Yes, I am. My name is Minh. Nice to meet you.' },
        { speaker: 'A', text: "Nice to meet you too, Minh. I'm Sarah, the project manager." },
        { speaker: 'B', text: 'Which team will I work with?' },
        { speaker: 'A', text: "You'll work with the backend team. There are five people in the team." },
        { speaker: 'B', text: 'Great. What time does the team usually start work?' },
        { speaker: 'A', text: 'Most people start at eight thirty. We have a short meeting at nine every morning.' },
        { speaker: 'B', text: 'OK. And where do people have lunch?' },
        { speaker: 'A', text: 'There is a canteen on the second floor. Many people go there at twelve.' },
        { speaker: 'B', text: "Thanks, Sarah. I'll see you at the meeting." },
      ],
      questions: [
        { q: 'Who is Sarah?', options: ['A new developer', 'The project manager', 'A backend developer', 'A customer'], answer: 1 },
        { q: 'Which team will Minh work with?', options: ['Frontend', 'Testing', 'Backend', 'Design'], answer: 2 },
        { q: 'How many people are in the team?', options: ['Three', 'Four', 'Five', 'Eight'], answer: 2 },
        { q: 'When is the daily meeting?', options: ['At 8:30', 'At 9:00', 'At 12:00', 'At 2:00'], answer: 1 },
        { q: 'Where is the canteen?', options: ['On the first floor', 'On the second floor', 'On the third floor', 'In the next building'], answer: 1 },
      ],
    } },
  { n: 2, level: 'A2–B1', topics: 'asking and answering questions, giving opinions, solving problems at work, team meetings',
    prompt: 'Describe a problem your team had recently: what happened, what you did, and your opinion on how to avoid it next time.',
    shadow: "Let's get started. Today we have three items on the agenda.\nFirst, I'd like to give a quick update on the mobile app.\nWe fixed most of the bugs, but there is still one problem with notifications.\nI see your point, but I think we need more time for testing.\nCan we move the release to next Wednesday?",
    recall: [
      { vi: 'Theo ý kiến của tôi, làm việc ở nhà tiết kiệm thời gian.', en: 'In my opinion, working from home saves time.' },
      { vi: 'Tôi hiểu ý bạn, nhưng tôi có quan điểm khác.', en: 'I see your point, but I have a different view.' },
      { vi: 'Chúng ta hãy chuyển sang chủ đề tiếp theo.', en: "Let's move on to the next topic." },
      { vi: 'Tôi đề nghị chúng ta kiểm tra log trước.', en: 'I suggest we check the logs first.' },
      { vi: 'Bạn làm việc ở đây bao lâu rồi?', en: 'How long have you worked here?' },
    ],
    fallback: {
      lines: [
        { speaker: 'A', text: "Let's get started. Tom, can you give us an update on the login bug?" },
        { speaker: 'B', text: "Sure. Some users can't log in on the mobile app since yesterday." },
        { speaker: 'A', text: 'Do we know the cause?' },
        { speaker: 'B', text: "We think it's the new password rule. Old passwords don't pass the check." },
        { speaker: 'A', text: 'How many users are affected?' },
        { speaker: 'B', text: 'About two hundred so far. Most of them have older accounts.' },
        { speaker: 'A', text: "That's a lot. What do you suggest?" },
        { speaker: 'B', text: 'I suggest we roll back the rule today and fix it properly next week.' },
        { speaker: 'A', text: 'I agree, but we need to tell the support team first.' },
        { speaker: 'B', text: "OK, I'll send them an email after this meeting." },
      ],
      questions: [
        { q: 'What is the problem?', options: ['The app is slow', "Some users can't log in", 'Payments fail', 'The server is down'], answer: 1 },
        { q: 'What is the probable cause?', options: ['A new password rule', 'A database error', 'A network problem', 'An old app version'], answer: 0 },
        { q: 'How many users are affected?', options: ['About twenty', 'About one hundred', 'About two hundred', 'Everyone'], answer: 2 },
        { q: 'What does Tom suggest?', options: ['Ignore the bug', 'Roll back the rule today', 'Buy a new server', 'Delete old accounts'], answer: 1 },
        { q: 'What will Tom do after the meeting?', options: ['Call the users', 'Write more tests', 'Email the support team', 'Go home'], answer: 2 },
      ],
    } },
  { n: 3, level: 'B1', topics: 'IT systems, technical issues, project updates, client communication',
    prompt: 'Give a project update to a client: what your team has completed, what you are working on, one technical issue explained simply, and what you need from the client.',
    shadow: "Thank you for joining the call today.\nWe have completed the testing process for the payment module.\nI'm currently working on the API integration with your system.\nThere is an issue with the authentication process, so some requests fail.\nCould you review the attached document and send us your feedback?",
    recall: [
      { vi: 'Tôi đã hoàn thành công việc được giao.', en: 'I have completed the assigned task.' },
      { vi: 'Tôi dự kiến hoàn thành vào ngày mai.', en: 'I expect to finish it by tomorrow.' },
      { vi: 'Để tôi chắc chắn là tôi hiểu đúng.', en: 'Let me make sure I understand correctly.' },
      { vi: 'Có một vài vấn đề cần được giải quyết.', en: 'There are a few issues that need to be resolved.' },
      { vi: 'Anh/chị có thể xem tài liệu đính kèm được không?', en: 'Could you review the attached document?' },
    ],
    fallback: {
      lines: [
        { speaker: 'A', text: 'Good morning, David. Thanks for joining the call.' },
        { speaker: 'B', text: 'Good morning. So, how is the project going?' },
        { speaker: 'A', text: 'We have completed the payment module, and testing is finished.' },
        { speaker: 'B', text: 'Great. What about the integration with our system?' },
        { speaker: 'A', text: "We're working on it now. There is one issue: your server rejects some of our tokens." },
        { speaker: 'B', text: 'I see. Do you know why?' },
        { speaker: 'A', text: 'We think the token format is different from your documentation. Could your team check the latest API document?' },
        { speaker: 'B', text: "Sure. I'll ask our engineers to review it today." },
        { speaker: 'A', text: 'Thank you. If we get the answer by Wednesday, we can still release on Friday.' },
        { speaker: 'B', text: 'Perfect. Please send me a short summary after this call.' },
      ],
      questions: [
        { q: 'What has the team completed?', options: ['The login page', 'The payment module', 'The mobile app', 'The database migration'], answer: 1 },
        { q: 'What is the current issue?', options: ['Testing is late', 'The client server rejects some tokens', 'The budget is too small', 'The client is unhappy'], answer: 1 },
        { q: 'What do they think causes the issue?', options: ['A slow network', 'A token format different from the documentation', 'A bug in the tests', 'Missing customer data'], answer: 1 },
        { q: 'When can they release if they get an answer by Wednesday?', options: ['Thursday', 'Friday', 'Next Monday', 'Next month'], answer: 1 },
        { q: 'What does David ask for at the end?', options: ['Another meeting', 'A short summary', 'A new contract', 'A demo'], answer: 1 },
      ],
    } },
];

// Kiểm tra JSON bài nghe do AI tạo; sai dạng thì dùng bài dự phòng.
export function validListening(x) {
  return !!x && Array.isArray(x.lines) && x.lines.length >= 4 && x.lines.every((l) => typeof l?.text === 'string')
    && Array.isArray(x.questions) && x.questions.length >= 3
    && x.questions.every((q) => typeof q?.q === 'string' && Array.isArray(q.options) && q.options.length >= 2
      && Number.isInteger(q.answer) && q.answer >= 0 && q.answer < q.options.length);
}

// ─── Lịch 1 giờ mỗi ngày ────────────────────────────────────────────────────
// Nguồn nghe theo giai đoạn: VOA → British Council → BBC (không học cả 4 nguồn cùng lúc).
function listeningFor(day, week) {
  if (week <= 4) return { title: `VOA Let's Learn English – Lesson ${day}`, url: LINKS.voa };
  if (week <= 8) return { title: `British Council Listening ${week <= 6 ? 'A2' : 'B1'}`, url: LINKS.bcListening };
  return week <= 10 ? { title: 'BBC 6 Minute English', url: LINKS.bbc6min } : { title: 'BBC English at Work', url: LINKS.bbcWork };
}

// 5 khối cố định mỗi ngày; ngày 1 có nội dung riêng (Getting Started).
export function tasksFor(day) {
  const week = weekOf(day);
  if (day === 1) return [
    { id: 'test',   min: 10, kind: 'Kiểm tra',   title: 'Làm bài kiểm tra trình độ tiếng Anh', desc: 'Xác định nên bắt đầu ở A1 hay A2.', url: LINKS.levelTest },
    { id: 'listen', min: 20, kind: 'Listening',  title: 'Học bài VOA – Lesson 1: Welcome!', desc: 'Nghe và tìm hiểu nội dung hội thoại theo 4 bước.', url: LINKS.voa },
    { id: 'shadow', min: 15, kind: 'Shadowing',  title: 'Luyện Shadowing', desc: 'Nghe và nhại lại 5–10 câu trong bài học.', url: LINKS.voa },
    { id: 'speak',  min: 10, kind: 'Speaking',   title: 'Tự giới thiệu bản thân', desc: 'Nói tiếng Anh và ghi âm trong 1 phút.', page: 'speak' },
    { id: 'vocab',  min: 5,  kind: 'Vocabulary', title: 'Ôn từ và cụm từ', desc: 'Ôn lại những cụm từ vừa học, lưu vào kho cụm từ.', page: 'phrases' },
  ];
  const l = listeningFor(day, week);
  return [
    { id: 'pron',   min: 10, kind: 'Phát âm',    title: 'Nghe và luyện phát âm theo audio', desc: 'Chọn một đoạn mẫu, nghe giọng đọc rồi đọc theo, chú ý ngữ điệu.', page: 'speak' },
    { id: 'listen', min: 20, kind: 'Listening',  title: l.title, desc: 'Một đoạn 2–3 phút, nghe theo 4 bước (bên dưới).', url: l.url },
    { id: 'shadow', min: 15, kind: 'Shadowing',  title: 'Nghe và nói nhại theo nhân vật', desc: 'Dùng lại đoạn vừa nghe: dừng sau từng câu và nhại theo.', url: l.url },
    { id: 'speak',  min: 10, kind: 'Speaking',   title: `Tự nói: ${WEEKS[week - 1].topic}`, desc: WEEKS[week - 1].prompt, page: 'speak' },
    { id: 'vocab',  min: 5,  kind: 'Vocabulary', title: 'Ôn lại 5–10 cụm từ', desc: 'Ôn các cụm từ đến hạn trong kho cụm từ.', page: 'phrases' },
  ];
}

export const LISTEN_STEPS = [
  'Nghe lần 1 không nhìn phụ đề: cố gắng hiểu nội dung chính.',
  'Nghe lần 2 có phụ đề: tìm những từ và câu chưa nghe được.',
  'Nghe lần 3: dừng sau từng câu và nói nhại theo.',
  'Tắt phụ đề, tự kể lại nội dung bằng tiếng Anh.',
];

// Một ngày coi là xong khi đánh dấu đủ 5 khối.
export const dayDone = (checks, date) => (checks[date] || []).filter(Boolean).length >= 5;

// ─── Đoạn mẫu để nghe / shadowing / luyện nói ───────────────────────────────
export const SAMPLES = [
  { id: 'intro', title: 'Bài mẫu: Introduce yourself', text: "Hello, my name is Thanh. I'm a software developer working in the banking industry.\nI mainly work with Java, PHP, and Node.js. My responsibilities include developing backend systems, integrating APIs, and maintaining business applications.\nI want to improve my English communication skills because I often work with international partners and technical documents.\nMy goal is to speak English confidently in meetings and everyday conversations." },
  { id: 'progress', title: 'Tình huống 1 – Báo cáo tiến độ', text: "I have completed the assigned task.\nI'm currently working on the API integration.\nI expect to finish it by tomorrow.\nThere is an issue with the authentication process." },
  { id: 'clarify', title: 'Tình huống 2 – Trao đổi khi chưa hiểu', text: "Could you explain that again?\nCould you speak a little more slowly?\nLet me make sure I understand correctly.\nDo you mean that we should update the existing API?" },
  { id: 'partner', title: 'Tình huống 3 – Họp với đối tác', text: "I'd like to discuss the current implementation.\nWe have completed the testing process.\nThere are a few issues that need to be resolved.\nCould you review the attached document?" },
];

// ─── Theo dõi tuần ──────────────────────────────────────────────────────────
export const CRITERIA = [
  { id: 'listening', name: 'Listening',     goal: 'Hiểu ý chính của audio phù hợp trình độ' },
  { id: 'pron',      name: 'Pronunciation', goal: 'Nói rõ các âm và từ quen thuộc' },
  { id: 'speaking',  name: 'Speaking',      goal: 'Nói liên tục 2–3 phút' },
  { id: 'vocab',     name: 'Vocabulary',    goal: 'Sử dụng được 30–50 cụm từ đã học' },
  { id: 'reflex',    name: 'Reflex',        goal: 'Trả lời câu hỏi quen thuộc mà không phải dịch từng từ' },
];

export const SELF_CHECK = ['Phát âm có rõ ràng không?', 'Có thường xuyên dừng lại để suy nghĩ không?', 'Có thể diễn đạt lại một ý khi quên từ không?'];

export const ROLEPLAY_PROMPT = (topic) => `Let's practise English speaking. You are my foreign colleague / business partner in an IT company. Topic: ${topic}. Speak at CEFR A2 level, use short sentences, and ask me one question at a time. After each of my answers, first correct my mistakes briefly (grammar, word choice, more natural phrasing), then continue the conversation.`;
