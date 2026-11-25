// Logic học thuần (không React/DOM) — test bằng `npm test`.

// ─── Spaced repetition ──────────────────────────────────────────────────────
export const GAPS = [1, 3, 7, 14, 30];
export const RECHECK_DAYS = 90; // từ đã thành thạo vẫn được kiểm tra lại định kỳ

// Ngày theo giờ máy (không dùng toISOString vì đó là giờ UTC: 0h–7h sáng ở VN sẽ bị tính là hôm qua).
const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const addDays = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return ymd(d); };
export const todayStr = () => addDays(0);
export const nextRev = (c) => addDays(GAPS[Math.min(c, GAPS.length - 1)]);
export const isDue = (w) => w.nextReview <= todayStr();

// Đã nhớ → lên một bậc; Chưa nhớ → về bậc đầu (ôn lại ngày mai).
export function grade(w, ok) {
  const c = ok ? w.reviewCount + 1 : 0;
  const mastered = c >= GAPS.length;
  return { ...w, reviewCount: c, mastered, nextReview: mastered ? addDays(RECHECK_DAYS) : nextRev(c) };
}

// ─── Chấm đọc ───────────────────────────────────────────────────────────────
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

// ─── Lộ trình 30 ngày (150 từ, không trùng) ─────────────────────────────────
export const ROADMAP = [
  { day:1,  theme:'Công nghệ & đổi mới',             icon:'💡', words:['innovative','obsolete','breakthrough','cutting-edge','widespread'] },
  { day:2,  theme:'Mặt trái của công nghệ',          icon:'📱', words:['reliance','privacy','surveillance','addictive','isolate'] },
  { day:3,  theme:'Việc làm & thu nhập',             icon:'💼', words:['workforce','unemployment','incentive','lucrative','redundancy'] },
  { day:4,  theme:'Làm việc nhóm',                   icon:'🤝', words:['collaborate','delegate','coordinate','consensus','accountable'] },
  { day:5,  theme:'Căng thẳng & cảm xúc',            icon:'🧠', words:['anxiety','overwhelmed','frustrated','burnout','cope'] },
  { day:6,  theme:'Phát triển bản thân',             icon:'🚀', words:['resilient','persevere','procrastinate','self-discipline','productive'] },
  { day:7,  theme:'Tư duy & ra quyết định',          icon:'⚖️', words:['prioritize','deliberate','cognitive','bias','rational'] },
  { day:8,  theme:'Giáo dục – Trường học',           icon:'🏫', words:['curriculum','compulsory','tuition','literacy','vocational'] },
  { day:9,  theme:'Giáo dục – Học suốt đời',         icon:'📚', words:['lifelong','acquire','proficiency','extracurricular','mentor'] },
  { day:10, theme:'Môi trường – Vấn đề',             icon:'🌍', words:['pollution','emission','deforestation','biodiversity','renewable'] },
  { day:11, theme:'Môi trường – Giải pháp',          icon:'♻️', words:['sustainable','conserve','depletion','contaminate','eco-friendly'] },
  { day:12, theme:'Sức khoẻ – Lối sống',             icon:'🥗', words:['sedentary','obesity','nutritious','chronic','well-being'] },
  { day:13, theme:'Sức khoẻ – Y tế',                 icon:'🏥', words:['diagnose','preventable','vaccinate','sanitation','longevity'] },
  { day:14, theme:'Đô thị hoá',                      icon:'🏙️', words:['urbanization','congestion','amenities','overcrowded','commute'] },
  { day:15, theme:'Tội phạm & pháp luật',            icon:'⚖️', words:['offender','deterrent','rehabilitate','juvenile','legislation'] },
  { day:16, theme:'Chính phủ & ngân sách',           icon:'🏛️', words:['subsidy','allocate','welfare','regulate','taxpayer'] },
  { day:17, theme:'Toàn cầu hoá & văn hoá',          icon:'🌐', words:['globalization','heritage','assimilate','diversity','stereotype'] },
  { day:18, theme:'Truyền thông & quảng cáo',        icon:'📺', words:['misleading','sensational','censorship','influential','consumerism'] },
  { day:19, theme:'Gia đình & thế hệ',               icon:'👨‍👩‍👧', words:['upbringing','sibling','elderly','nurture','intergenerational'] },
  { day:20, theme:'Phim ảnh & giải trí',             icon:'🎬', words:['compelling','gripping','predictable','thought-provoking','portray'] },
  { day:21, theme:'Task 1 – Mô tả xu hướng',         icon:'📈', words:['fluctuate','plummet','surge','plateau','steadily'] },
  { day:22, theme:'Task 1 – Mức độ & so sánh',       icon:'📊', words:['significant','marginal','considerable','proportion','respectively'] },
  { day:23, theme:'Task 2 – Nguyên nhân & hệ quả',   icon:'🔗', words:['trigger','attribute','consequence','inevitable','exacerbate'] },
  { day:24, theme:'Task 2 – Vấn đề & giải pháp',     icon:'🛠️', words:['address','tackle','mitigate','alleviate','curb'] },
  { day:25, theme:'Task 2 – Đối lập & nhượng bộ',    icon:'↔️', words:['whereas','nevertheless','conversely','albeit','admittedly'] },
  { day:26, theme:'Task 2 – Nêu quan điểm',          icon:'✍️', words:['arguably','presumably','undeniably','debatable','perspective'] },
  { day:27, theme:'Lập luận & phản biện',            icon:'🗣️', words:['justify','refute','acknowledge','counterargument','valid'] },
  { day:28, theme:'Học thuật – Nghiên cứu',          icon:'🔬', words:['hypothesis','methodology','evidence','implication','empirical'] },
  { day:29, theme:'Học thuật – Tính từ AWL',         icon:'🎓', words:['substantial','fundamental','inherent','comprehensive','prevalent'] },
  { day:30, theme:'Học thuật – Động từ AWL',         icon:'🏆', words:['facilitate','enhance','undermine','compensate','constrain'] },
];

// Một ngày coi là xong khi cả 5 từ đã có trong kho (dù học từ trang nào).
export function roadmapProgress(bank) {
  const learned = new Set(bank.map((w) => w.word.toLowerCase()));
  const done = new Set(ROADMAP.filter((d) => d.words.every((w) => learned.has(w))).map((d) => d.day));
  return { done, current: ROADMAP.find((d) => !done.has(d.day)) || null };
}
